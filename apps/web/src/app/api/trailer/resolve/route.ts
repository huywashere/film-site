import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
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

// Search TMDB videos by searching for the movie/show first with Official Studio Ranking
async function searchTmdbTrailer(
  title: string,
  originName?: string,
  year?: string,
): Promise<string | null> {
  const tmdbApiKey = process.env.TMDB_API_KEY?.trim() || "";
  const tmdbToken = process.env.TMDB_ACCESS_TOKEN?.trim() || "";
  if (!tmdbApiKey && !tmdbToken) return null;
  const queries = [originName, title].filter(Boolean) as string[];

  for (const q of queries) {
    try {
      const clean = q.replace(/\s*\([^)]*\)/g, "").trim();
      if (!clean) continue;

      const headers: Record<string, string> = {};
      if (tmdbToken && tmdbToken.startsWith("eyJ")) {
        headers["Authorization"] = `Bearer ${tmdbToken}`;
      }

      const searchParams = new URLSearchParams({
        query: clean,
        include_adult: "false",
      });
      if (!headers.Authorization && tmdbApiKey) searchParams.set("api_key", tmdbApiKey);
      const searchUrl = `${TMDB_BASE}/search/multi?${searchParams.toString()}`;
      const searchRes = await fetch(searchUrl, {
        headers,
        next: { revalidate: 86400 },
      });

      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      const results = searchData?.results || [];

      if (results.length === 0) continue;

      // Check top 5 results for official studio videos
      for (const item of results.slice(0, 5)) {
        if (!item.id || (item.media_type !== "movie" && item.media_type !== "tv")) continue;

        const mediaType = item.media_type;
        const videoParams = new URLSearchParams({
          include_video_language: "vi,en,zh,ko,ja,null",
        });
        if (!headers.Authorization && tmdbApiKey) videoParams.set("api_key", tmdbApiKey);
        const videosUrl = `${TMDB_BASE}/${mediaType}/${item.id}/videos?${videoParams.toString()}`;
        const vRes = await fetch(videosUrl, {
          headers,
          next: { revalidate: 86400 },
        });

        if (vRes.ok) {
          const vData = await vRes.json();
          const videos = vData?.results || [];
          const validVideos = videos.filter(
            (v: any) => (v.site === "YouTube" || v.site === "Vimeo") && v.key,
          );

          if (validVideos.length > 0) {
            const sorted = [...validVideos].sort((a: any, b: any) => {
              let scoreA = 0;
              let scoreB = 0;

              if (a.official) scoreA += 100;
              if (b.official) scoreB += 100;

              if (a.type === "Trailer") scoreA += 80;
              else if (a.type === "Teaser") scoreA += 40;

              if (b.type === "Trailer") scoreB += 80;
              else if (b.type === "Teaser") scoreB += 40;

              if (/official\s+trailer/i.test(a.name)) scoreA += 50;
              if (/official\s+trailer/i.test(b.name)) scoreB += 50;

              scoreA += Math.min(Number(a.size || 720) / 20, 110);
              scoreB += Math.min(Number(b.size || 720) / 20, 110);

              if (a.iso_639_1 === "vi") scoreA += 25;
              if (b.iso_639_1 === "vi") scoreB += 25;
              if (a.iso_639_1 === "en") scoreA += 15;
              if (b.iso_639_1 === "en") scoreB += 15;

              return scoreB - scoreA;
            });

            if (sorted[0]?.key) return sorted[0].key;
          }
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

  const cacheKey = `${title}_${originName}_${year}`.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json({
      success: true,
      key: cached.key,
      source: "cache",
    });
  }

  // 1. Try TMDB Search first for official verified studio trailer
  const tmdbKey = await searchTmdbTrailer(title, originName, year);
  if (tmdbKey) {
    cache.set(cacheKey, { key: tmdbKey, expiry: Date.now() + 86400 * 1000 });
    return NextResponse.json({
      success: true,
      key: tmdbKey,
      source: "tmdb",
    });
  }

  // 2. Direct provider URL check fallback
  const directKey = extractYouTubeKeyFromUrl(rawTrailerUrl);
  if (directKey) {
    return NextResponse.json({
      success: true,
      key: directKey,
      source: "direct",
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
