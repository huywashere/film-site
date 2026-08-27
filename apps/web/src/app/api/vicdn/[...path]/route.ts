import {
  createMovieProxyHandler,
  resolveMovieApiOrigins,
} from "@/lib/movie-proxy";
import { normalizeVicdnPayload } from "@/lib/vicdn-normalizer";

/**
 * ViCDN API Proxy — Bilingual / Song Ngữ Source (https://vicdn.cc)
 *
 * ViCDN API endpoints:
 *   GET /api/update/{page}            — Latest updated films with pagination
 *   GET /api/info/{slug}              — Film detail + list of episode embeds
 *   GET /api/type/{key}/{page}        — Films by genre/type
 */

const VICDN_ORIGINS = resolveMovieApiOrigins(
  process.env.VICDN_API_ORIGINS || process.env.VICDN_API_BASE,
  [
    "https://vicdn.cc/api",
    "https://api.vicdn.cc/api",
  ],
);

/** Path-aware TTL in seconds */
function getTtl(path: string): number {
  if (path.startsWith("update")) return 120;
  if (path.startsWith("info/")) return 600;
  if (path.startsWith("type/")) return 300;
  return 300;
}

export const GET = createMovieProxyHandler({
  sourceName: "ViCDN",
  cachePrefix: "vicdn",
  baseUrl: VICDN_ORIGINS[0],
  fallbackUrls: VICDN_ORIGINS.slice(1),
  getTtl,
  headers: {
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: "https://vicdn.cc/",
    Origin: "https://vicdn.cc",
  },
  transform: normalizeVicdnPayload,
  forbiddenMessage: "Truy cập bị chặn (403) - Yêu cầu không hợp lệ",
  upstreamErrorMessage: "Lỗi kết nối ViCDN API",
});
