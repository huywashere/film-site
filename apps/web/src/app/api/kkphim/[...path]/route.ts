import {
  createMovieProxyHandler,
  resolveMovieApiOrigins,
} from "@/lib/movie-proxy";

const KKPHIM_ORIGINS = resolveMovieApiOrigins(
  process.env.KKPHIM_API_ORIGINS || process.env.KKPHIM_API_BASE,
  ["https://phimapi.com"],
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
  if (path.includes("tim-kiem")) return 600; // 10 minutes cache for fast search
  return 300;
}

export const GET = createMovieProxyHandler({
  sourceName: "KKPhim",
  cachePrefix: "kkphim",
  baseUrl: KKPHIM_ORIGINS[0],
  fallbackUrls: KKPHIM_ORIGINS.slice(1),
  getTtl,
  maxMemoryEntries: 200,
  upstreamErrorMessage: "Lỗi kết nối KKPhim API",
});
