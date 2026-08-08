import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_TOKEN = process.env.TMDB_ACCESS_TOKEN || "";
const TMDB_API_KEY = process.env.TMDB_API_KEY || "";

function getTtl(path: string): number {
  if (path.includes("images")) return 86400;
  if (path.includes("credits")) return 86400;
  if (path.includes("videos")) return 3600;
  if (path.includes("find")) return 3600;
  if (path.includes("search")) return 300;
  if (path.includes("trending")) return 1800;
  return 3600;
}

const cache = new Map<string, { data: unknown; expiry: number }>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (!TMDB_TOKEN && !TMDB_API_KEY) {
    return NextResponse.json(
      { error: "TMDB_ACCESS_TOKEN hoac TMDB_API_KEY chua duoc cau hinh" },
      { status: 503 },
    );
  }

  const { path: pathSegments } = await params;
  const path = pathSegments.join("/");
  const searchParams = request.nextUrl.searchParams;

  const isValidToken =
    Boolean(TMDB_TOKEN) &&
    TMDB_TOKEN !== "your-read-access-token-here" &&
    TMDB_TOKEN.startsWith("eyJ");

  // Them language mac dinh neu chua co
  if (!searchParams.has("language")) {
    searchParams.set("language", "vi-VN");
  }

  // Neu khong dung Bearer token hop le, them api_key vao query
  if (!isValidToken && TMDB_API_KEY) {
    searchParams.set("api_key", TMDB_API_KEY);
  }

  const qs = searchParams.toString();
  const cfWorkerUrl = process.env.TMDB_CLOUDFLARE_WORKER_URL
    ? process.env.TMDB_CLOUDFLARE_WORKER_URL.replace(/\/$/, "")
    : "";
  // api.themoviedb.org is blocked by some regional networks while the TMDB
  // api.tmdb.org alias remains reachable. Try the reachable alias first and
  // retain the canonical hostname as a fallback.
  const regionalHost = "https://api.tmdb.org/3";
  const officialHost = "https://api.themoviedb.org/3";
  const workerHost = cfWorkerUrl ? `${cfWorkerUrl}/3` : "";
  const workerIsLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(
    cfWorkerUrl,
  );
  const hosts = workerHost
    ? workerIsLocal
      ? [regionalHost, officialHost, workerHost]
      : [workerHost, regionalHost, officialHost]
    : [regionalHost, officialHost];
  const cacheKey = hosts[0] + "/" + path + (qs ? "?" + qs : "");

  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: { "X-Cache": "HIT", "X-Source": "TMDB" },
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (isValidToken) {
    headers["Authorization"] = "Bearer " + TMDB_TOKEN;
  }

  let lastError: unknown = null;
  let lastStatus = 502;
  for (const host of hosts) {
    const upstreamUrl = host + "/" + path + (qs ? "?" + qs : "");
    try {
      const response = await fetch(upstreamUrl, {
        headers,
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        const ttl = getTtl(path);
        cache.set(cacheKey, { data, expiry: Date.now() + ttl * 1000 });

        if (cache.size > 500) {
          const now = Date.now();
          cache.forEach((v, k) => {
            if (v.expiry <= now) cache.delete(k);
          });
        }

        return NextResponse.json(data, {
          headers: { "X-Cache": "MISS", "X-Source": "TMDB" },
        });
      }
      lastStatus = response.status;
      lastError = new Error(`TMDB upstream responded with ${response.status}`);
    } catch (err) {
      lastError = err;
    }
  }

  const msg =
    lastError instanceof Error ? lastError.message : String(lastError);
  console.warn("[tmdb-proxy] error:", msg);
  return NextResponse.json(
    { error: "Khong the ket noi TMDB API" },
    { status: lastStatus >= 400 && lastStatus < 600 ? lastStatus : 502 },
  );
}
