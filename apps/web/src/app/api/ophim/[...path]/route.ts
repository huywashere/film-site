import { createMovieProxyHandler } from "@/lib/movie-proxy";

const OPHIM_BASE = process.env.OPHIM_API_BASE || "https://ophim1.com";

function getTtl(path: string): number {
  if (path.includes("phim-moi-cap-nhat")) return 120;
  if (path.startsWith("phim/")) return 600;
  if (path.includes("the-loai") || path.includes("quoc-gia")) return 3600;
  if (path.includes("tim-kiem")) return 60;
  return 300;
}

export const GET = createMovieProxyHandler({
  sourceName: "OPhim",
  cachePrefix: "ophim",
  baseUrl: OPHIM_BASE,
  getTtl,
  headers: {
    "Content-Type": "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
  upstreamErrorMessage: "Lỗi kết nối Ophim API",
});
