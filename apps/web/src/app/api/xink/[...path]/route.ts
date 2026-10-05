import {
  createMovieProxyHandler,
  resolveMovieApiOrigins,
} from "@/lib/movie-proxy";
import { normalizeXinkPayload } from "@/lib/xink-normalizer";

/**
 * Xink API Proxy — https://xink.pro
 *
 * Xink API endpoints under https://api.xink.pro/api/content:
 *   GET /phim-moi-cap-nhat/page/{count}?limit={limit}
 *   GET /phim-dang-chieu/page/{count}?limit={limit}
 *   GET /phim-bo/page/{count}?limit={limit}
 *   GET /phim-le/page/{count}?limit={limit}
 *   GET /phim-chieu-rap/page/{count}?limit={limit}
 *   GET /phim/{slug}
 *   GET /tim-kiem?keyword={keyword}&page={page}&limit={limit}
 *   GET /the-loai/{slug}/page/{count}
 *   GET /quoc-gia/{slug}/page/{count}
 *   GET /nam/{year}/page/{count}
 */

const XINK_ORIGINS = resolveMovieApiOrigins(
  process.env.XINK_API_ORIGINS || process.env.XINK_API_BASE,
  ["https://api.xink.pro/api/content"],
);

function getTtl(path: string): number {
  if (
    path.includes("phim-moi-cap-nhat") ||
    path.includes("phim-dang-chieu")
  ) {
    return 120;
  }
  if (path.startsWith("phim/")) return 600;
  if (
    path.includes("the-loai") ||
    path.includes("quoc-gia") ||
    path.includes("nam") ||
    path.includes("taxonomies")
  ) {
    return 3600;
  }
  if (path.includes("tim-kiem")) return 60;
  return 300;
}

export const GET = createMovieProxyHandler({
  sourceName: "Xink",
  cachePrefix: "xink",
  baseUrl: XINK_ORIGINS[0],
  fallbackUrls: XINK_ORIGINS.slice(1),
  getTtl,
  transform: normalizeXinkPayload,
  headers: {
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Referer: "https://xink.pro/",
  },
  upstreamErrorMessage: "Lỗi kết nối Xink.pro API",
});
