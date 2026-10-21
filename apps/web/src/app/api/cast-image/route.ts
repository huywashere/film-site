import { NextRequest, NextResponse } from "next/server";
import { Redis } from "ioredis";
import { checkImageProxyRateLimitDistributed } from "@/lib/server-rate-limiter";
import { clientIpFromRequest } from "@/lib/client-ip";

export const dynamic = "force-dynamic";

const MAX_NAME_LENGTH = 120;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis: Redis | null = null;
let isRedisDisabled = false;

function getRedisClient(): Redis | null {
  if (isRedisDisabled) return null;
  if (redis) return redis;

  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 500,
    });

    redis.on("error", () => {
      isRedisDisabled = true;
      if (redis) {
        try {
          redis.disconnect();
        } catch {
          // Redis is optional for this image lookup.
        }
        redis = null;
      }
    });
  } catch (e) {
    isRedisDisabled = true;
    redis = null;
  }

  return redis;
}

export async function GET(request: NextRequest) {
  const rateCheck = await checkImageProxyRateLimitDistributed(
    clientIpFromRequest(request),
  );
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(request.url);
  const rawName = searchParams.get("name");

  if (!rawName) {
    return NextResponse.json(
      { error: "Name parameter required" },
      { status: 400 },
    );
  }

  // Clean actor name: remove role suffixes like (voice), (lồng tiếng), etc.
  const name = rawName
    .replace(/\(.*?\)/g, "")
    .replace(/[:\-–—].*/g, "")
    .trim()
    .slice(0, MAX_NAME_LENGTH);

  if (!name) {
    return NextResponse.json({ url: null });
  }

  const cacheKey = `cast-image-v2:${name.toLowerCase()}`;
  const client = getRedisClient();

  // 1. Check Redis Cache
  if (client && client.status === "ready") {
    try {
      const cached = await client.get(cacheKey);
      if (cached) {
        return NextResponse.json({
          url: cached === "placeholder" ? null : cached,
        });
      }
    } catch {
      // Cache misses must not make the image endpoint fail.
    }
  }

  let imageUrl = "";
  const TMDB_API_KEY = process.env.TMDB_API_KEY?.trim();

  // 2. Query TMDB API (Global Search - No language restriction)
  try {
    if (TMDB_API_KEY) {
      const tmdbRes = await fetch(
        `https://api.tmdb.org/3/search/person?query=${encodeURIComponent(name)}&api_key=${TMDB_API_KEY}&include_adult=false`,
        { next: { revalidate: 86400 } },
      );
      if (tmdbRes.ok) {
        const tmdbData = await tmdbRes.json();
        const person =
          tmdbData?.results?.find((p: any) => p && p.profile_path) ||
          tmdbData?.results?.[0];

        if (person?.profile_path) {
          imageUrl = `https://image.tmdb.org/t/p/w185${person.profile_path}`;
        }
      }
    }
  } catch (err) {
    console.warn("TMDB person search query failed:", err);
  }

  // 3. Fallback to Wikipedia search (generator=search for approximate matching)
  if (!imageUrl) {
    try {
      const wikiRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(name)}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=300&format=json`,
        { next: { revalidate: 86400 } },
      );
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        const pages = wikiData?.query?.pages;
        if (pages) {
          const pageId = Object.keys(pages)[0];
          if (pageId && pages[pageId]?.thumbnail?.source) {
            imageUrl = pages[pageId].thumbnail.source;
          }
        }
      }
    } catch (err) {
      console.warn("Wikipedia search query failed:", err);
    }
  }

  if (imageUrl && !/^https:\/\//i.test(imageUrl)) {
    imageUrl = "";
  }

  // 4. Save to Redis Cache
  if (client && client.status === "ready") {
    try {
      await client.set(
        cacheKey,
        imageUrl || "placeholder",
        "EX",
        14 * 24 * 60 * 60,
      );
    } catch {
      // Cache writes are best effort.
    }
  }

  return NextResponse.json({ url: imageUrl || null });
}
