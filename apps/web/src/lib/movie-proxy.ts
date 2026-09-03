import { NextRequest, NextResponse } from "next/server";
import { Redis } from "ioredis";
import { CircuitBreaker, CircuitOpenError } from "@/lib/circuit-breaker";
import { addSignedHlsFallbacksInPayload } from "@/lib/hls-proxy-signature";

type CacheEntry = { data: unknown; expiry: number };

export interface MovieProxyConfig {
  sourceName: string;
  cachePrefix: string;
  baseUrl: string;
  /** Danh sách domain dự phòng khi baseUrl không phản hồi */
  fallbackUrls?: string[];
  redisUrl?: string;
  getTtl: (path: string) => number;
  transform?: (data: unknown, path: string) => unknown;
  headers?: HeadersInit;
  memoryTtlMs?: number;
  maxMemoryEntries?: number;
  timeoutMs?: number;
  forbiddenMessage?: string;
  upstreamErrorMessage?: string;
}

/**
 * Resolve a deployment-controlled origin pool while rejecting unsafe URLs.
 *
 * The plural env value is comma-separated. Legacy single-origin variables can
 * still be passed by the route so existing deployments keep working.
 */
export function resolveMovieApiOrigins(
  configured: string | undefined,
  defaults: string[],
): string[] {
  const candidates = [...(configured || "").split(","), ...defaults];
  const origins: string[] = [];

  for (const candidate of candidates) {
    const value = candidate.trim();
    if (!value) continue;

    try {
      const parsed = new URL(value);
      if (
        parsed.protocol !== "https:" ||
        parsed.username ||
        parsed.password ||
        parsed.search ||
        parsed.hash
      ) {
        continue;
      }

      const normalized = parsed.toString().replace(/\/$/, "");
      if (!origins.includes(normalized)) origins.push(normalized);
    } catch {
      // Ignore malformed deployment configuration and keep known-safe defaults.
    }
  }

  if (origins.length === 0) {
    throw new Error("Movie API origin pool is empty");
  }

  return origins;
}

export function createMovieProxyHandler(config: MovieProxyConfig) {
  const breaker = new CircuitBreaker({
    name: config.sourceName,
    failureThreshold: 3,
    recoveryTimeoutMs: 30_000,
  });
  const memoryCache = new Map<string, CacheEntry>();
  const redisUrl =
    config.redisUrl || process.env.REDIS_URL || "redis://localhost:6379";
  const memoryTtlMs = config.memoryTtlMs ?? 10 * 60 * 1000;
  const maxMemoryEntries = config.maxMemoryEntries ?? 150;
  const timeoutMs = config.timeoutMs ?? 8000;

  let redis: Redis | null = null;
  let isRedisDisabled = false;

  function getRedisClient(): Redis | null {
    if (isRedisDisabled) return null;
    if (redis && redis.status === "ready") return redis;
    if (redis) return redis;

    try {
      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 500,
      });
      redis.on("error", () => {
        if (!isRedisDisabled) {
          console.warn(
            `[${config.cachePrefix}-proxy] Redis offline - falling back to in-memory cache`,
          );
          isRedisDisabled = true;
          redis?.disconnect();
          redis = null;
        }
      });
    } catch {
      isRedisDisabled = true;
      redis = null;
    }

    return redis;
  }

  function isRequestAllowed(request: NextRequest): boolean {
    const referer = request.headers.get("referer");
    const origin = request.headers.get("origin");
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      request.nextUrl.host ||
      "";

    // Always allow server-side fetches or same-app requests
    if (!referer && !origin) return true;

    const configuredHosts = [
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
    ]
      .filter(Boolean)
      .flatMap((value) => {
        try {
          return [new URL(value!).host];
        } catch {
          return [];
        }
      });
    const allowedHosts = new Set([
      host,
      request.nextUrl.host,
      ...configuredHosts,
      ...(process.env.NODE_ENV === "development"
        ? ["localhost:3000", "127.0.0.1:3000"]
        : []),
    ]);

    try {
      if (referer) {
        const refHost = new URL(referer).host;
        if (allowedHosts.has(refHost)) return true;
      }
      if (origin) {
        const origHost = new URL(origin).host;
        if (allowedHosts.has(origHost)) return true;
      }
    } catch {
      // URL parsing failed.
    }

    return false;
  }

  function headers(cacheStatus: string, ttlSeconds: number = 300): HeadersInit {
    // Signed HLS fallbacks are added only while sending the response. The
    // cached provider payload therefore never contains an expiring token.
    const swrTtl = Math.min(Math.max(ttlSeconds * 2, 300), 1800);
    const browserTtl = Math.min(ttlSeconds, 300);
    return {
      "X-Cache": cacheStatus,
      "X-Source": config.sourceName,
      "Cache-Control": `public, max-age=${browserTtl}, s-maxage=${ttlSeconds}, stale-while-revalidate=${swrTtl}`,
      "CDN-Cache-Control": `public, max-age=${ttlSeconds}, stale-while-revalidate=${swrTtl}`,
    };
  }

  function evictStaleMemoryEntries() {
    const now = Date.now();
    memoryCache.forEach((value, key) => {
      if (value.expiry <= now) memoryCache.delete(key);
    });
    while (memoryCache.size > maxMemoryEntries) {
      const oldestKey = memoryCache.keys().next().value;
      if (!oldestKey) break;
      memoryCache.delete(oldestKey);
    }
  }

  function responsePayload(data: unknown): unknown {
    return addSignedHlsFallbacksInPayload(data);
  }

  return async function GET(
    request: NextRequest,
    {
      params,
    }: {
      params: Promise<{ path: string[] }>;
    },
  ) {
    if (!isRequestAllowed(request)) {
      return NextResponse.json(
        {
          error:
            config.forbiddenMessage ||
            "Truy cập bị chặn (403 Forbidden) - Yêu cầu không hợp lệ",
        },
        { status: 403 },
      );
    }

    // Next 15+ makes dynamic route params asynchronous, while Next 14 passes
    // the object directly. Await handles both forms.
    const { path: pathSegments } = await params;
    if (
      pathSegments.length === 0 ||
      pathSegments.length > 12 ||
      pathSegments.some(
        (segment) =>
          segment.length === 0 ||
          segment.length > 180 ||
          !/^[\p{L}\p{N}._~-]+$/u.test(segment),
      ) ||
      request.nextUrl.search.length > 2048
    ) {
      return NextResponse.json(
        { error: "Đường dẫn không hợp lệ" },
        { status: 400 },
      );
    }
    const path = pathSegments.join("/");
    const searchParams = request.nextUrl.searchParams.toString();
    const upstreamUrl = `${config.baseUrl}/${path}${searchParams ? `?${searchParams}` : ""}`;
    // v4 stores provider data without expiring HLS relay signatures. A fresh
    // signature is attached for every origin response, including cache hits.
    const cacheKey = `playback-v4:${config.cachePrefix}:${upstreamUrl}`;
    const ttlSeconds = config.getTtl(path);
    const client = getRedisClient();

    if (client && client.status === "ready") {
      try {
        const raw = await client.get(cacheKey);
        if (raw) {
          return NextResponse.json(responsePayload(JSON.parse(raw)), {
            headers: headers("HIT-REDIS", ttlSeconds),
          });
        }
      } catch {
        // Fall through to memory cache.
      }
    }

    const memoryEntry = memoryCache.get(cacheKey);
    if (memoryEntry && memoryEntry.expiry > Date.now()) {
      memoryCache.delete(cacheKey);
      memoryCache.set(cacheKey, memoryEntry);
      return NextResponse.json(responsePayload(memoryEntry.data), {
        headers: headers("HIT-MEMORY", ttlSeconds),
      });
    }

    try {
      const data = await breaker.execute(async () => {
        // Thử baseUrl trước, nếu lỗi thì thử fallbackUrls
        const allUrls = [
          `${config.baseUrl}/${path}${searchParams ? `?${searchParams}` : ""}`,
          ...(config.fallbackUrls || []).map(
            (fb) => `${fb}/${path}${searchParams ? `?${searchParams}` : ""}`,
          ),
        ];

        let lastError: Error | null = null;
        for (const url of allUrls) {
          try {
            const response = await fetch(url, {
              headers: config.headers || { "Content-Type": "application/json" },
              signal: AbortSignal.timeout(timeoutMs),
            });

            if (!response.ok) {
              lastError = new Error(
                `Upstream ${url} returned ${response.status}`,
              );
              continue; // thử URL tiếp theo
            }

            const rawData = await response.json();
            const transformed = config.transform
              ? config.transform(rawData, path)
              : rawData;
            return transformed;
          } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            // Tiếp tục thử URL tiếp theo
          }
        }

        throw lastError || new Error("All upstream URLs failed");
      });

      if (client && client.status === "ready") {
        client
          .set(cacheKey, JSON.stringify(data), "EX", ttlSeconds)
          .catch(() => {});
      }

      memoryCache.set(cacheKey, { data, expiry: Date.now() + memoryTtlMs });
      evictStaleMemoryEntries();

      return NextResponse.json(responsePayload(data), {
        headers: headers("MISS", ttlSeconds),
      });
    } catch (error: unknown) {
      if (error instanceof CircuitOpenError) {
        if (memoryEntry) {
          return NextResponse.json(responsePayload(memoryEntry.data), {
            headers: headers("STALE-CB-OPEN"),
          });
        }

        return NextResponse.json(
          {
            status: false,
            error: true,
            message: `Nguồn ${config.sourceName} tạm thời gián đoạn, vui lòng thử lại sau.`,
            circuitOpen: true,
          },
          { status: 200 },
        );
      }

      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[${config.cachePrefix}-proxy] upstream note:`, message);

      if (memoryEntry) {
        return NextResponse.json(responsePayload(memoryEntry.data), {
          headers: headers("STALE-MEMORY"),
        });
      }

      return NextResponse.json(
        {
          status: false,
          error: true,
          message:
            config.upstreamErrorMessage ||
            `Lỗi kết nối ${config.sourceName} API`,
        },
        { status: 200 },
      );
    }
  };
}
