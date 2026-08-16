import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OMDB_API_KEY = "df7557ba";
const OMDB_BASE = "https://www.omdbapi.com";

// In-memory cache: key → { data, expiresAt }
const cache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function fetchOmdb(params: Record<string, string>): Promise<any | null> {
  const qs = new URLSearchParams({ ...params, apikey: OMDB_API_KEY });
  const cacheKey = qs.toString();

  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    const res = await fetch(`${OMDB_BASE}/?${qs.toString()}`, {
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

    const json = await res.json();
    if (json.Response === "False") return null;

    cache.set(cacheKey, { data: json, expiresAt: Date.now() + CACHE_TTL_MS });
    return json;
  } catch {
    return null;
  }
}

/**
 * GET /api/omdb?imdbId=tt1234567
 * GET /api/omdb?title=Inception&year=2010&type=movie
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imdbId = searchParams.get("imdbId");
  const title = searchParams.get("title");
  const year = searchParams.get("year");
  const type = searchParams.get("type"); // "movie" | "series"

  let data: any = null;

  // Strategy 1: Fetch by IMDb ID (most accurate)
  if (imdbId && /^tt\d+$/.test(imdbId)) {
    data = await fetchOmdb({ i: imdbId, plot: "short" });
  }

  // Strategy 2: Search by title + year
  if (!data && title) {
    const params: Record<string, string> = { t: title, plot: "short" };
    if (year) params.y = year;
    if (type === "tv" || type === "series") params.type = "series";
    else if (type === "movie") params.type = "movie";
    data = await fetchOmdb(params);
  }

  if (!data) {
    return NextResponse.json(null, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }

  // Parse and normalize ratings
  const ratings: { source: string; value: string }[] = (data.Ratings || []).map(
    (r: { Source: string; Value: string }) => ({ source: r.Source, value: r.Value }),
  );

  const imdbRating = data.imdbRating && data.imdbRating !== "N/A" ? data.imdbRating : null;
  const imdbVotes = data.imdbVotes && data.imdbVotes !== "N/A" ? data.imdbVotes : null;
  const rottenTomatoes = ratings.find((r) => r.source === "Rotten Tomatoes")?.value ?? null;
  const metacritic = data.Metascore && data.Metascore !== "N/A" ? data.Metascore : null;
  const awards = data.Awards && data.Awards !== "N/A" ? data.Awards : null;
  const boxOffice = data.BoxOffice && data.BoxOffice !== "N/A" ? data.BoxOffice : null;
  const rated = data.Rated && data.Rated !== "N/A" ? data.Rated : null;
  const runtime = data.Runtime && data.Runtime !== "N/A" ? data.Runtime : null;

  const result = {
    imdbId: data.imdbID ?? null,
    title: data.Title ?? null,
    year: data.Year ?? null,
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
    type: data.Type ?? null,
  };

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}
