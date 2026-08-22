import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_API_KEY =
  process.env.TMDB_API_KEY?.trim() || "f85dbd29011db19e75f5d29028fd096d";
const TMDB_TOKEN = process.env.TMDB_ACCESS_TOKEN?.trim() || "";

const cache = new Map<string, { key: string; expiry: number }>();

function extractYouTubeKeyFromUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
  );
  if (match) return match[1];
  if (/^[\w-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

// Search TMDB videos by searching for the movie/show first
async function searchTmdbTrailer(
  title: string,
  originName?: string,
  year?: string,
): Promise<string | null> {
  const queries = [originName, title].filter(Boolean) as string[];

  for (const q of queries) {
    try {
      const clean = q.replace(/\s*\([^)]*\)/g, "").trim();
      if (!clean) continue;

      const headers: Record<string, string> = {};
      if (TMDB_TOKEN && TMDB_TOKEN.startsWith("eyJ")) {
        headers["Authorization"] = `Bearer ${TMDB_TOKEN}`;
      }

      const searchUrl = `${TMDB_BASE}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(clean)}&include_adult=false&language=vi-VN`;
      const searchRes = await fetch(searchUrl, {
        headers,
        next: { revalidate: 86400 },
      });

      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      const results = searchData?.results || [];

      if (results.length === 0) continue;

      // Check top 2 results for videos
      for (const item of results.slice(0, 2)) {
        if (!item.id || (item.media_type !== "movie" && item.media_type !== "tv")) continue;

        const mediaType = item.media_type;
        const videosUrl = `${TMDB_BASE}/${mediaType}/${item.id}/videos?api_key=${TMDB_API_KEY}&include_video_language=vi,en,zh,ko,null`;
        const vRes = await fetch(videosUrl, {
          headers,
          next: { revalidate: 86400 },
        });

        if (vRes.ok) {
          const vData = await vRes.json();
          const videos = vData?.results || [];
          const ytVideos = videos.filter(
            (v: any) => v.site === "YouTube" && v.key,
          );

          const officialTrailer = ytVideos.find(
            (v: any) => v.type === "Trailer" && /official/i.test(v.name),
          );
          if (officialTrailer) return officialTrailer.key;

          const anyTrailer = ytVideos.find((v: any) => v.type === "Trailer");
          if (anyTrailer) return anyTrailer.key;

          if (ytVideos[0]?.key) return ytVideos[0].key;
        }
      }
    } catch {
      // ignore and continue
    }
  }

  return null;
}

// Fast YouTube HTML Search Scraping
async function searchYouTubeTrailer(
  title: string,
  originName?: string,
  year?: string,
): Promise<string | null> {
  const searchQuery = `${originName || title} ${title !== originName ? title : ""} ${year || ""} official trailer`
    .replace(/\s+/g, " ")
    .trim();

  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "vi,en;q=0.9",
      },
      next: { revalidate: 43200 }, // 12 hours
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Extract videoId from initialData or href regex
    const videoIdMatches = [
      ...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g),
    ].map((m) => m[1]);

    if (videoIdMatches.length > 0) {
      // Avoid common system/channel IDs if any
      const valid = videoIdMatches.find((id) => !id.startsWith("UC") && id.length === 11);
      if (valid) return valid;
    }

    const watchMatches = [
      ...html.matchAll(/\/watch\?v=([a-zA-Z0-9_-]{11})/g),
    ].map((m) => m[1]);

    if (watchMatches.length > 0) {
      return watchMatches[0];
    }
  } catch {
    // ignore
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "";
  const originName = searchParams.get("originName") || "";
  const year = searchParams.get("year") || "";
  const rawTrailerUrl = searchParams.get("trailerUrl") || "";

  // 1. Direct URL check
  const directKey = extractYouTubeKeyFromUrl(rawTrailerUrl);
  if (directKey) {
    return NextResponse.json({
      success: true,
      key: directKey,
      source: "direct",
    });
  }

  if (!title && !originName) {
    return NextResponse.json(
      { success: false, error: "Missing title or originName" },
      { status: 400 },
    );
  }

  const cacheKey = `${title}_${originName}_${year}`.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json({
      success: true,
      key: cached.key,
      source: "cache",
    });
  }

  // 2. Try TMDB Search first
  const tmdbKey = await searchTmdbTrailer(title, originName, year);
  if (tmdbKey) {
    cache.set(cacheKey, { key: tmdbKey, expiry: Date.now() + 86400 * 1000 });
    return NextResponse.json({
      success: true,
      key: tmdbKey,
      source: "tmdb",
    });
  }

  // 3. Fallback to YouTube Search Scraping
  const youtubeKey = await searchYouTubeTrailer(title, originName, year);
  if (youtubeKey) {
    cache.set(cacheKey, { key: youtubeKey, expiry: Date.now() + 43200 * 1000 });
    return NextResponse.json({
      success: true,
      key: youtubeKey,
      source: "youtube",
    });
  }

  return NextResponse.json(
    { success: false, error: "Trailer not found" },
    { status: 404 },
  );
}
