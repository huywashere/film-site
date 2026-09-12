import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OMDB_BASE = "https://www.omdbapi.com";
const OMDB_DAILY_LIMIT = 1000;

// In-memory cache: key → { data, expiresAt }
const cache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Daily request and cache tracking
let currentUtcDay = new Date().toISOString().slice(0, 10);
let dailyApiCalls = 0;
let dailyCacheHits = 0;

function syncDailyQuota() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== currentUtcDay) {
    currentUtcDay = today;
    dailyApiCalls = 0;
    dailyCacheHits = 0;
  }
}

export function getOmdbQuotaStats() {
  syncDailyQuota();
  const now = new Date();
  const nextReset = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
  const diffMs = Math.max(0, nextReset.getTime() - now.getTime());
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const used = dailyApiCalls;
  const remaining = Math.max(0, OMDB_DAILY_LIMIT - used);
  const percentUsed = Math.min(100, Math.round((used / OMDB_DAILY_LIMIT) * 100));

  return {
    provider: "omdb",
    dailyLimit: OMDB_DAILY_LIMIT,
    usedToday: used,
    remaining,
    percentUsed,
    cacheHits: dailyCacheHits,
    currentUtcDay,
    nextResetIso: nextReset.toISOString(),
    resetCountdown: {
      hours,
      minutes,
      seconds,
      formatted: `${hours}h ${minutes}m nữa (07:00 sáng mai)`,
    },
    status:
      remaining <= 0
        ? "exhausted"
        : remaining < 100
          ? "low_quota"
          : "operational",
  };
}

async function fetchOmdb(params: Record<string, string>): Promise<any | null> {
  const apiKey = process.env.OMDB_API_KEY?.trim();
  if (!apiKey) return null;
  syncDailyQuota();
  const qs = new URLSearchParams({ ...params, apikey: apiKey });
  const cacheKey = qs.toString();

  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    dailyCacheHits++;
    return cached.data;
  }

  try {
    dailyApiCalls++;
    const res = await fetch(`${OMDB_BASE}/?${qs.toString()}`, {
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

    const json = await res.json();
    if (json.Response === "False") {
      // Check if limit reached error returned by OMDb
      if (json.Error && json.Error.toLowerCase().includes("limit")) {
        dailyApiCalls = OMDB_DAILY_LIMIT;
      }
      return null;
    }

    cache.set(cacheKey, { data: json, expiresAt: Date.now() + CACHE_TTL_MS });
    return json;
  } catch {
    return null;
  }
}

async function fetchTmdbFallback(
  tmdbId?: string | null,
  imdbId?: string | null,
  type?: string | null,
): Promise<any | null> {
  const tmdbToken = process.env.TMDB_ACCESS_TOKEN?.trim() || "";
  const tmdbApiKey = process.env.TMDB_API_KEY?.trim() || "";
  if (!tmdbToken && !tmdbApiKey) return null;

  const isValidToken =
    Boolean(tmdbToken) &&
    tmdbToken !== "your-read-access-token-here" &&
    tmdbToken.startsWith("eyJ");

  const headers: Record<string, string> = { Accept: "application/json" };
  if (isValidToken) {
    headers.Authorization = `Bearer ${tmdbToken}`;
  }

  const appendAuth = (url: string) => {
    if (!isValidToken && tmdbApiKey) {
      const sep = url.includes("?") ? "&" : "?";
      return `${url}${sep}api_key=${encodeURIComponent(tmdbApiKey)}`;
    }
    return url;
  };

  const isTv = type === "tv" || type === "series";

  try {
    if (tmdbId && /^\d+$/.test(tmdbId)) {
      const endpoint = isTv ? `tv/${tmdbId}` : `movie/${tmdbId}`;
      const url = appendAuth(
        `https://api.tmdb.org/3/${endpoint}?append_to_response=external_ids`,
      );
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(4000) });
      if (res.ok) return await res.json();
    }

    if (imdbId && /^tt\d+$/.test(imdbId)) {
      const url = appendAuth(
        `https://api.tmdb.org/3/find/${imdbId}?external_source=imdb_id`,
      );
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const findData = await res.json();
        const found = findData.movie_results?.[0] || findData.tv_results?.[0];
        if (found) {
          const detailEndpoint = found.title ? `movie/${found.id}` : `tv/${found.id}`;
          const detailUrl = appendAuth(`https://api.tmdb.org/3/${detailEndpoint}`);
          const detailRes = await fetch(detailUrl, {
            headers,
            signal: AbortSignal.timeout(4000),
          });
          if (detailRes.ok) return await detailRes.json();
          return found;
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * GET /api/omdb?imdbId=tt1234567
 * GET /api/omdb?title=Inception&year=2010&type=movie
 * GET /api/omdb?stats=1 (Returns quota info)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Return quota & stats directly
  if (searchParams.get("stats") === "1") {
    return NextResponse.json(getOmdbQuotaStats(), {
      headers: { "Cache-Control": "private, no-cache" },
    });
  }

  const imdbId = searchParams.get("imdbId");
  const title = searchParams.get("title");
  const year = searchParams.get("year");
  const type = searchParams.get("type"); // "movie" | "series"
  const tmdbId = searchParams.get("tmdbId");

  let data: any = null;

  // Strategy 1: Fetch by IMDb ID (most accurate)
  if (imdbId && /^tt\d+$/.test(imdbId)) {
    data = await fetchOmdb({ i: imdbId, plot: "short" });
  }

  // Strategy 2: Search by title + year
  if (!data && title) {
    const cleanTitle = title
      .replace(/\s*\([^)]*(?:thuyết minh|lồng tiếng|vietsub|bản đẹp|full hd|raw|phần\s*\d+|season\s*\d+|ss\s*\d+)[^)]*\)/gi, "")
      .replace(/\s*-\s*(?:thuyết minh|lồng tiếng|vietsub|bản đẹp|full hd|raw|phần\s*\d+|season\s*\d+|ss\s*\d+)/gi, "")
      .replace(/\s*\((?:Phần|Season|SS|Part)\s*\d+\)/gi, "")
      .replace(/\s+(?:Phần|Season|SS|Part)\s*\d+/gi, "")
      .replace(/\s*:\s*(?:Phần|Season|SS|Part)\s*\d+/gi, "")
      .trim();

    const params: Record<string, string> = { t: title, plot: "short" };
    if (year) params.y = year;
    if (type === "tv" || type === "series") params.type = "series";
    else if (type === "movie") params.type = "movie";

    data = await fetchOmdb(params);

    // Fallback 2a: Try cleanTitle with year
    if (!data && cleanTitle && cleanTitle !== title) {
      data = await fetchOmdb({ ...params, t: cleanTitle });
    }

    // Fallback 2b: Try cleanTitle without year constraint (e.g. series started in different year)
    if (!data && cleanTitle && year) {
      const noYearParams: Record<string, string> = { t: cleanTitle, plot: "short" };
      if (type === "tv" || type === "series") noYearParams.type = "series";
      data = await fetchOmdb(noYearParams);
    }
  }

  // Strategy 2c: If OMDB had no direct match but tmdbId was provided, resolve imdbId from TMDB and try OMDB
  let tmdbFallbackData: any = null;
  if (!data && (tmdbId || imdbId)) {
    tmdbFallbackData = await fetchTmdbFallback(tmdbId, imdbId, type);
    const tmdbImdbId =
      tmdbFallbackData?.imdb_id || tmdbFallbackData?.external_ids?.imdb_id;
    if (tmdbImdbId && /^tt\d+$/.test(tmdbImdbId)) {
      data = await fetchOmdb({ i: tmdbImdbId, plot: "short" });
    }
  }

  // If OMDB found data, parse and return it
  if (data) {
    const ratings: { source: string; value: string }[] = (data.Ratings || []).map(
      (r: { Source: string; Value: string }) => ({
        source: r.Source,
        value: r.Value,
      }),
    );

    const imdbRating =
      data.imdbRating && data.imdbRating !== "N/A" ? data.imdbRating : null;
    const imdbVotes =
      data.imdbVotes && data.imdbVotes !== "N/A" ? data.imdbVotes : null;
    const rottenTomatoes =
      ratings.find((r) => r.source === "Rotten Tomatoes")?.value ?? null;
    const metacritic =
      data.Metascore && data.Metascore !== "N/A" ? data.Metascore : null;
    const awards = data.Awards && data.Awards !== "N/A" ? data.Awards : null;
    let boxOffice =
      data.BoxOffice && data.BoxOffice !== "N/A" ? data.BoxOffice : null;
    const rated = data.Rated && data.Rated !== "N/A" ? data.Rated : null;
    const runtime = data.Runtime && data.Runtime !== "N/A" ? data.Runtime : null;

    // Supplement BoxOffice from TMDB revenue if OMDB returned N/A
    if (!boxOffice && tmdbFallbackData?.revenue && tmdbFallbackData.revenue > 0) {
      boxOffice = `$${Number(tmdbFallbackData.revenue).toLocaleString("en-US")}`;
    }

    const result = {
      imdbId: data.imdbID ?? imdbId ?? null,
      title: data.Title ?? title ?? null,
      year: data.Year ?? year ?? null,
      rated,
      runtime,
      imdbRating,
      imdbVotes,
      rottenTomatoes,
      metacritic,
      awards,
      boxOffice,
      plot: data.Plot && data.Plot !== "N/A" ? data.Plot : null,
      language: data.Language && data.Language !== "N/A" ? data.Language : null,
      country: data.Country && data.Country !== "N/A" ? data.Country : null,
      type: data.Type ?? type ?? null,
      _quota: getOmdbQuotaStats(),
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
    });
  }

  // Strategy 3: OMDB unavailable/failed - Fallback to TMDB metadata
  if (tmdbFallbackData) {
    const resolvedImdbId =
      tmdbFallbackData.imdb_id ||
      tmdbFallbackData.external_ids?.imdb_id ||
      imdbId ||
      null;
    const tmdbRating =
      tmdbFallbackData.vote_average > 0
        ? Number(tmdbFallbackData.vote_average).toFixed(1)
        : null;
    const tmdbVotes =
      tmdbFallbackData.vote_count > 0
        ? Number(tmdbFallbackData.vote_count).toLocaleString("en-US")
        : null;
    const boxOffice =
      tmdbFallbackData.revenue > 0
        ? `$${Number(tmdbFallbackData.revenue).toLocaleString("en-US")}`
        : null;
    const runtime =
      tmdbFallbackData.runtime > 0 ? `${tmdbFallbackData.runtime} min` : null;
    const language =
      (tmdbFallbackData.spoken_languages || [])
        .map((l: any) => l.english_name || l.name)
        .filter(Boolean)
        .join(", ") || null;
    const country =
      (tmdbFallbackData.production_countries || [])
        .map((c: any) => c.name)
        .filter(Boolean)
        .join(", ") || null;

    const result = {
      imdbId: resolvedImdbId,
      title: tmdbFallbackData.title || tmdbFallbackData.name || title || null,
      year:
        (tmdbFallbackData.release_date || tmdbFallbackData.first_air_date)?.slice(0, 4) ||
        year ||
        null,
      rated: null,
      runtime,
      imdbRating: tmdbRating,
      imdbVotes: tmdbVotes,
      rottenTomatoes: null,
      metacritic: null,
      awards: null,
      boxOffice,
      plot: tmdbFallbackData.overview || null,
      language,
      country,
      type: tmdbFallbackData.name ? "series" : "movie",
      _quota: getOmdbQuotaStats(),
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
    });
  }

  return NextResponse.json(null, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
