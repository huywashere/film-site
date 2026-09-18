import { NextRequest, NextResponse } from "next/server";
import { filterAccurateTrailers } from "@/lib/tmdb";

const TMDB_BASE = "https://api.tmdb.org/3";
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

const OFFICIAL_STUDIO_CHANNELS = [
  "warner bros",
  "sony pictures",
  "marvel entertainment",
  "marvel",
  "universal pictures",
  "paramount pictures",
  "walt disney studios",
  "disney",
  "netflix",
  "20th century studios",
  "lionsgate",
  "a24",
  "cgv cinemas",
  "galaxy cinema",
  "bhd star",
  "lotte cinema",
  "toho movie",
  "cj enm",
  "showbox",
  "new",
];

const YOUTUBE_NEGATIVE_TITLE_REGEX =
  /\b(review|reaction|fan\s*made|fan-made|concept|parody|spoof|unboxing|interview|behind\s+the\s+scenes|bloopers|ending\s+explained|breakdown|recap|t\u00f3m\s*t\u1eaft|ph\u00e2n\s*t\u00edch|ost|soundtrack|music\s*video|mv|gameplay|walkthrough|audiobook|shorts?)\b/i;

function parseDurationText(text?: string): number {
  if (!text) return 0;
  const parts = text.trim().split(":").map(Number);
  if (parts.some((p) => Number.isNaN(p))) return 0;
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0);
  if (parts.length === 3)
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  return 0;
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

  const isValidToken =
    Boolean(tmdbToken) &&
    tmdbToken !== "your-read-access-token-here" &&
    tmdbToken.startsWith("eyJ");

  for (const q of queries) {
    try {
      const clean = q.replace(/\s*\([^)]*\)/g, "").trim();
      if (!clean) continue;

      const headers: Record<string, string> = { Accept: "application/json" };
      if (isValidToken) {
        headers["Authorization"] = `Bearer ${tmdbToken}`;
      }

      const searchParams = new URLSearchParams({
        query: clean,
        include_adult: "false",
      });
      if (year && /^\d{4}$/.test(year.trim())) {
        searchParams.set("year", year.trim());
      }
      if (!headers.Authorization && tmdbApiKey) searchParams.set("api_key", tmdbApiKey);
      const searchUrl = `${TMDB_BASE}/search/multi?${searchParams.toString()}`;
      const searchRes = await fetch(searchUrl, {
        headers,
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 86400 },
      });

      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      const results = searchData?.results || [];

      if (results.length === 0) continue;

      // Sắp xếp kết quả: ưu tiên khớp chính xác năm nếu có
      const sortedResults = [...results].sort((a: any, b: any) => {
        if (year) {
          const yearA = String(a.release_date || a.first_air_date || "").slice(0, 4);
          const yearB = String(b.release_date || b.first_air_date || "").slice(0, 4);
          const matchA = yearA === year.trim() ? 1 : 0;
          const matchB = yearB === year.trim() ? 1 : 0;
          if (matchA !== matchB) return matchB - matchA;
        }
        return (b.popularity || 0) - (a.popularity || 0);
      });

      // Check top 3 results for official studio videos
      for (const item of sortedResults.slice(0, 3)) {
        if (!item.id || (item.media_type !== "movie" && item.media_type !== "tv")) continue;

        const mediaType = item.media_type;
        const videoParams = new URLSearchParams({
          include_video_language: "vi,en,zh,ko,ja,null",
        });
        if (!headers.Authorization && tmdbApiKey) videoParams.set("api_key", tmdbApiKey);
        const videosUrl = `${TMDB_BASE}/${mediaType}/${item.id}/videos?${videoParams.toString()}`;
        const vRes = await fetch(videosUrl, {
          headers,
          signal: AbortSignal.timeout(5000),
          next: { revalidate: 86400 },
        });

        if (vRes.ok) {
          const vData = await vRes.json();
          const videos = vData?.results || [];
          const accurateTrailers = filterAccurateTrailers(videos);

          if (accurateTrailers.length > 0 && accurateTrailers[0]?.key) {
            return accurateTrailers[0].key;
          }
        }
      }
    } catch {
      // ignore and continue
    }
  }

  return null;
}

// Fast YouTube Search Scraping với kiểm duyệt chất lượng & chống video rác
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
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 43200 }, // 12 hours
    });

    if (!response.ok) return null;

    const html = await response.text();

    // 1. Phân tích qua ytInitialData an toàn không dùng regex backtracking
    try {
      const marker = "ytInitialData = ";
      const startIdx = html.indexOf(marker);
      if (startIdx !== -1) {
        const jsonStart = startIdx + marker.length;
        const scriptEnd = html.indexOf("</script>", jsonStart);
        let rawJson = scriptEnd !== -1 ? html.slice(jsonStart, scriptEnd).trim() : "";
        if (rawJson.endsWith(";")) rawJson = rawJson.slice(0, -1).trim();
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          const sections =
            parsed?.contents?.twoColumnSearchResultsRenderer?.primaryContents
              ?.sectionListRenderer?.contents || [];

          const candidateVideos: Array<{
            id: string;
            title: string;
            channel: string;
            duration: number;
            score: number;
          }> = [];

        for (const section of sections) {
          const items = section?.itemSectionRenderer?.contents || [];
          for (const item of items) {
            const v = item?.videoRenderer;
            if (!v?.videoId || v.videoId.length !== 11) continue;

            const vTitle = String(v?.title?.runs?.[0]?.text || "");
            const vChannel = String(v?.ownerText?.runs?.[0]?.text || "").toLowerCase();
            const durationSec = parseDurationText(v?.lengthText?.simpleText);

            // Bỏ qua nếu thời lượng quá dài (> 5 phút, chắc chắn là review/tóm tắt) hoặc quá ngắn (< 15s)
            if (durationSec > 320 || (durationSec > 0 && durationSec < 15)) {
              continue;
            }

            // Bỏ qua nếu tiêu đề chứa từ khóa review, reaction, fan-made, v.v.
            if (YOUTUBE_NEGATIVE_TITLE_REGEX.test(vTitle)) {
              continue;
            }

            let score = 0;
            const lowerTitle = vTitle.toLowerCase();

            // Điểm kênh phân phối chính thức của hãng
            if (OFFICIAL_STUDIO_CHANNELS.some((s) => vChannel.includes(s))) {
              score += 150;
            }

            // Điểm cụm từ trailer chính thức
            if (/official\s+trailer|trailer\s+ch\u00ednh\s+th\u1ee9c/i.test(lowerTitle)) {
              score += 90;
            } else if (/main\s+trailer|final\s+trailer/i.test(lowerTitle)) {
              score += 70;
            } else if (/teaser\s+trailer/i.test(lowerTitle)) {
              score += 50;
            } else if (lowerTitle.includes("trailer")) {
              score += 35;
            }

            // Điểm khớp tiêu đề phim
            const baseTitle = (title || originName || "").toLowerCase();
            if (baseTitle && lowerTitle.includes(baseTitle)) {
              score += 40;
            }

            // Độ dài lý tưởng cho trailer (1 - 3 phút)
            if (durationSec >= 60 && durationSec <= 200) {
              score += 30;
            }

            candidateVideos.push({
              id: v.videoId,
              title: vTitle,
              channel: vChannel,
              duration: durationSec,
              score,
            });
          }
        }

        if (candidateVideos.length > 0) {
          candidateVideos.sort((a, b) => b.score - a.score);
          if (candidateVideos[0]?.id) {
            return candidateVideos[0].id;
          }
        }
      }
    }
  } catch {
    // fallback to regex extraction
  }

    // 2. Regex fallback an toàn
    const videoIdMatches = [
      ...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g),
    ].map((m) => m[1]);

    if (videoIdMatches.length > 0) {
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
