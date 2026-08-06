import { createMovieProxyHandler } from "@/lib/movie-proxy";

const VIDSRC_BASE = process.env.VIDSRC_API_BASE || "https://vidsrc.to/api";

function getTtl(path: string): number {
  if (path.startsWith("movie/")) return 600;
  if (path.includes("search")) return 60;
  return 300;
}

export const GET = createMovieProxyHandler({
  sourceName: "VidSrc",
  cachePrefix: "vidsrc",
  baseUrl: VIDSRC_BASE,
  getTtl,
  headers: {
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
  forbiddenMessage: "Truy cập bị chặn (403) - Yêu cầu không hợp lệ",
  upstreamErrorMessage: "Lỗi kết nối VidSrc API",
});
