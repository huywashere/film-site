import { createMovieProxyHandler } from "@/lib/movie-proxy";

const VSMOV_BASE = process.env.VSMOV_API_BASE || "https://vsmov.com/api";

function getTtl(path: string): number {
  if (path.includes("phim-moi-cap-nhat")) return 120;
  if (path.startsWith("phim/")) return 600;
  if (path.includes("the-loai") || path.includes("quoc-gia")) return 1800;
  if (path.includes("tim-kiem")) return 60;
  return 300;
}

export const GET = createMovieProxyHandler({
  sourceName: "VSMOV",
  cachePrefix: "vsmov",
  baseUrl: VSMOV_BASE,
  getTtl,
  headers: {
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  },
  upstreamErrorMessage: "Lỗi kết nối VSMOV API",
});
