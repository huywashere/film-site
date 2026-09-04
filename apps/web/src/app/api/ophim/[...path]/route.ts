import {
  createMovieProxyHandler,
  resolveMovieApiOrigins,
} from "@/lib/movie-proxy";

/**
 * OPhim API Proxy — Backup Movie Source (Server 4)
 *
 * Endpoints:
 *   GET /danh-sach/phim-moi-cap-nhat?page=X  — Phim mới cập nhật
 *   GET /phim/{slug}                         — Chi tiết phim + tập
 *   GET /the-loai/{slug}?page=X             — Thể loại
 *   GET /quoc-gia/{slug}?page=X             — Quốc gia
 *   GET /tim-kiem?keyword=X&page=Y          — Tìm kiếm
 */

const OPHIM_ORIGINS = resolveMovieApiOrigins(
  process.env.OPHIM_API_ORIGINS || process.env.OPHIM_API_BASE,
  [
    "https://ophim1.com",
    "https://ophim.live",
    "https://ophim17.cc",
    "https://ophim.cc",
  ],
);

function getTtl(path: string): number {
  if (path.includes("phim-moi-cap-nhat")) return 180;
  if (path.includes("phim/") || path.includes("phim-")) return 600;
  if (
    path.includes("the-loai") ||
    path.includes("quoc-gia") ||
    path.includes("nam-phat-hanh")
  )
    return 3600;
  if (path.includes("tim-kiem")) return 600;
  return 300;
}

export const GET = createMovieProxyHandler({
  sourceName: "OPhim",
  cachePrefix: "ophim",
  baseUrl: OPHIM_ORIGINS[0],
  fallbackUrls: OPHIM_ORIGINS.slice(1),
  getTtl,
  maxMemoryEntries: 200,
  headers: {
    Accept: "application/json, text/plain, */*",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Referer: "https://ophim1.com/",
  },
  upstreamErrorMessage: "Lỗi kết nối OPhim API",
});
