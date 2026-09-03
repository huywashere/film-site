import {
  createMovieProxyHandler,
  resolveMovieApiOrigins,
} from "@/lib/movie-proxy";
import { normalizeNguonCPayload } from "@/lib/nguonc-normalizer";

/**
 * NguonC API Proxy — Source C (https://phim.nguonc.com)
 *
 * NguonC API endpoints:
 *   GET /api/films/{type}?page={n}    — Film list by type (phim-moi-cap-nhat, phim-le, phim-bo, tv-shows)
 *   GET /api/film/{slug}              — Film detail + episodes
 *   GET /api/films/search?keyword={q}&page={n} — Search
 *   GET /api/categories               — Categories list
 *
 * Field mapping vs KKPhim/OPhim:
 *   name         → name           ✅ same
 *   slug         → slug           ✅ same
 *   thumb_url    → thumb_url      ✅ same
 *   poster_url   → poster_url     ✅ same
 *   original_name → origin_name  ⚠️ different key
 *   current_episode → episode_current ⚠️ different key
 *   language     → lang           ⚠️ different key
 *   casts        → actor (array vs comma-string) ⚠️ different format
 */

const NGUONC_ORIGINS = resolveMovieApiOrigins(
  process.env.NGUONC_API_ORIGINS || process.env.NGUONC_API_BASE,
  [
    "https://phim.nguonc.com/api",
    "https://nguonc.com/api",
  ],
);

/** Path-aware TTL in seconds */
function getTtl(path: string): number {
  if (path === "films/phim-moi-cap-nhat") return 120;
  if (path.startsWith("film/")) return 600;
  if (path === "categories") return 3600;
  if (path.includes("search")) return 60;
  return 300;
}

export const GET = createMovieProxyHandler({
  sourceName: "NguonC",
  cachePrefix: "nguonc",
  baseUrl: NGUONC_ORIGINS[0],
  fallbackUrls: NGUONC_ORIGINS.slice(1),
  getTtl,
  headers: {
    Accept: "application/json, text/plain, */*",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Referer: "https://phim.nguonc.com/",
    Origin: "https://phim.nguonc.com",
  },
  transform: normalizeNguonCPayload,
  forbiddenMessage: "Truy cập bị chặn (403) - Yêu cầu không hợp lệ",
  upstreamErrorMessage: "Lỗi kết nối NguonC API",
});
