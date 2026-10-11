import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
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
  const tmdbToken = process.env.TMDB_ACCESS_TOKEN?.trim() || "";
  const tmdbApiKey = process.env.TMDB_API_KEY?.trim() || "";
  if (!tmdbToken && !tmdbApiKey) {
    return NextResponse.json(
      { error: "TMDB_ACCESS_TOKEN hoac TMDB_API_KEY chua duoc cau hinh" },
      { status: 503 },
    );
  }

  const { path: pathSegments } = await params;
  const path = pathSegments.join("/");
  const searchParams = request.nextUrl.searchParams;

  const isValidToken =
    Boolean(tmdbToken) &&
    tmdbToken !== "your-read-access-token-here" &&
    tmdbToken.startsWith("eyJ");

  // Them language mac dinh neu chua co (tru cac endpoint anh/video de khong bi chan logo quoc te)
  const isMediaAssetEndpoint =
    path.endsWith("/images") ||
    path.endsWith("/videos") ||
    path.includes("/images/") ||
    path.includes("/videos/");

  if (!searchParams.has("language") && !isMediaAssetEndpoint) {
    searchParams.set("language", "vi-VN");
  }
  if (isMediaAssetEndpoint) {
    if (!searchParams.has("include_image_language")) {
      searchParams.set("include_image_language", "vi,en,null,ja,ko");
    } else {
      const langs = searchParams
        .get("include_image_language")!
        .split(",")
        .map((l) => l.trim().toLowerCase())
        .filter((l) => !l.startsWith("zh") && l !== "cn");
      searchParams.set(
        "include_image_language",
        langs.join(",") || "vi,en,null,ja,ko",
      );
    }
  }

  // Neu khong dung Bearer token hop le, them api_key vao query
  if (!isValidToken && tmdbApiKey) {
    searchParams.set("api_key", tmdbApiKey);
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
  const cacheKey = "v3:" + hosts[0] + "/" + path + (qs ? "?" + qs : "");

function buildCacheHeaders(cacheStatus: "HIT" | "MISS", ttlSeconds: number): HeadersInit {
  const browserTtl = Math.min(ttlSeconds, 3600);
  const swrTtl = Math.min(Math.max(ttlSeconds * 2, 3600), 86400);
  return {
    "X-Cache": cacheStatus,
    "X-Source": "TMDB",
    "Cache-Control": `public, max-age=${browserTtl}, s-maxage=${ttlSeconds}, stale-while-revalidate=${swrTtl}`,
    "CDN-Cache-Control": `public, max-age=${ttlSeconds}, stale-while-revalidate=${swrTtl}`,
  };
}

  const ttl = getTtl(path);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    const remainingTtl = Math.max(1, Math.round((cached.expiry - Date.now()) / 1000));
    return NextResponse.json(cached.data, {
      headers: buildCacheHeaders("HIT", remainingTtl),
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (isValidToken) {
    headers["Authorization"] = "Bearer " + tmdbToken;
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

        // Strip any Chinese posters, backdrops, or logos
        if (data && typeof data === "object") {
          const isNonChinese = (img: any) => {
            const lang = String(img?.iso_639_1 || "").toLowerCase().trim();
            return !lang.startsWith("zh") && lang !== "cn";
          };
          if (Array.isArray(data.posters)) {
            data.posters = data.posters.filter(isNonChinese);
          }
          if (Array.isArray(data.backdrops)) {
            data.backdrops = data.backdrops.filter(isNonChinese);
          }
          if (Array.isArray(data.logos)) {
            data.logos = data.logos.filter(isNonChinese);
          }
        }

        const ttl = getTtl(path);
        cache.set(cacheKey, { data, expiry: Date.now() + ttl * 1000 });

        if (cache.size > 500) {
          const now = Date.now();
          cache.forEach((v, k) => {
            if (v.expiry <= now) cache.delete(k);
          });
        }

        return NextResponse.json(data, {
          headers: buildCacheHeaders("MISS", ttl),
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
