import { NextRequest, NextResponse } from "next/server";
import { Redis } from "ioredis";
import { checkImageProxyRateLimit } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

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
  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  const rateCheck = checkImageProxyRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json(
      { error: "Name parameter required" },
      { status: 400 },
    );
  }

  const cacheKey = `cast-image:${name.toLowerCase().trim()}`;
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

  // 2. Fetch from Wikipedia API
  let imageUrl = "";
  try {
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
