import { NextRequest, NextResponse } from "next/server";
import { Redis } from "ioredis";
import { checkImageProxyRateLimit } from "@/lib/rate-limiter";
import { clientIpFromRequest } from "@/lib/client-ip";

export const dynamic = "force-dynamic";

/** Wikipedia titles are short; cap the input so it can't be used as a cache-key bomb. */
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
      connectTimeout: 500, // Fail fast in 0.5s
    });

    redis.on("error", (err) => {
      console.warn(
        "Redis connection failed on frontend, disabling Redis cache to prevent request hangs.",
      );
      isRedisDisabled = true;
      if (redis) {
        try {
          redis.disconnect();
        } catch (e) {
          // ignore disconnect error
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
  const rateCheck = checkImageProxyRateLimit(clientIpFromRequest(request));
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

  const name = rawName.trim().slice(0, MAX_NAME_LENGTH);
  if (!name) {
    return NextResponse.json(
      { error: "Name parameter required" },
      { status: 400 },
    );
  }

  const cacheKey = `cast-image:${name.toLowerCase()}`;
  const client = getRedisClient();

  // 1. Check Redis Cache (only if online and ready)
  if (client && client.status === "ready") {
    try {
      const cached = await client.get(cacheKey);
      if (cached) {
        return NextResponse.json({
          url: cached === "placeholder" ? null : cached,
        });
      }
    } catch (e) {
      console.warn(
        "Redis cache read error, falling back to direct Wikipedia query.",
      );
    }
  }

  // 2. Fetch from TMDB API first, then Wikipedia fallback
  let imageUrl = "";
  const TMDB_API_KEY = process.env.TMDB_API_KEY || "f85dbd29011db19e75f5d29028fd096d";

  try {
    if (TMDB_API_KEY) {
      const tmdbRes = await fetch(
        `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(name)}&api_key=${TMDB_API_KEY}&language=vi-VN`,
        { next: { revalidate: 86400 } },
      );
      if (tmdbRes.ok) {
        const tmdbData = await tmdbRes.json();
        const person = tmdbData?.results?.[0];
        if (person?.profile_path) {
          imageUrl = `https://image.tmdb.org/t/p/w185${person.profile_path}`;
        }
      }
    }
  } catch (err) {
    console.warn("TMDB person search query failed:", err);
  }

  try {
    if (!imageUrl) {
      // Try Vietnamese Wikipedia first
      const viRes = await fetch(
        `https://vi.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=thumbnail&pithumbsize=200&titles=${encodeURIComponent(name)}`,
        { next: { revalidate: 86400 } }, // Cache fetch for 24 hours
      );
      const viData = await viRes.json();
      const viPages = viData?.query?.pages;
      if (viPages) {
        const pageId = Object.keys(viPages)[0];
        if (pageId && pageId !== "-1") {
          imageUrl = viPages[pageId]?.thumbnail?.source || "";
        }
      }
    }

    // Try English Wikipedia if Vietnamese has no image
    if (!imageUrl) {
      const enRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=thumbnail&pithumbsize=200&titles=${encodeURIComponent(name)}`,
        { next: { revalidate: 86400 } },
      );
      const enData = await enRes.json();
      const enPages = enData?.query?.pages;
      if (enPages) {
        const pageId = Object.keys(enPages)[0];
        if (pageId && pageId !== "-1") {
          imageUrl = enPages[pageId]?.thumbnail?.source || "";
        }
      }
    }
  } catch (err) {
    console.error("Wikipedia cast image query failed:", err);
  }

  // Never hand a non-https URL back to the client — it ends up in an <img src>.
  if (imageUrl && !/^https:\/\//i.test(imageUrl)) {
    imageUrl = "";
  }

  // 3. Save to Redis Cache (only if online and ready)
  if (client && client.status === "ready") {
    try {
      await client.set(
        cacheKey,
        imageUrl || "placeholder",
        "EX",
        7 * 24 * 60 * 60,
      ); // Cache for 7 days
    } catch (e) {
      // Ignore cache write error
    }
  }

  return NextResponse.json({ url: imageUrl || null });
}
