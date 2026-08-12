import {
  createMovieProxyHandler,
  resolveMovieApiOrigins,
} from "@/lib/movie-proxy";

// ── OPhim domain fallback list ────────────────────────────────────
// OPhim thường xuyên đổi domain. Thứ tự ưu tiên:
const OPHIM_DOMAINS = resolveMovieApiOrigins(
  process.env.OPHIM_API_ORIGINS || process.env.OPHIM_API_BASE,
  ["https://ophim1.com", "https://ophim17.cc", "https://ophim3.cc"],
);

// CDN mặc định khi response không có pathImage
const OPHIM_DEFAULT_CDN = "https://img.ophim.live/uploads/movies/";

// ── Image URL normalizer ─────────────────────────────────────────
// OPhim trả về relative paths kiểu "movie-name-thumb.jpg"
// Cần prepend CDN prefix thành full URL
function normalizeOphimImages(raw: any, _path: string): any {
  if (!raw) return raw;

  // Lấy CDN prefix từ response (pathImage hoặc APP_DOMAIN_CDN_IMAGE)
  const cdnBase =
    raw?.pathImage ||
    raw?.data?.pathImage ||
    raw?.APP_DOMAIN_CDN_IMAGE ||
    OPHIM_DEFAULT_CDN;
  const cdn = cdnBase.endsWith("/") ? cdnBase : cdnBase + "/";

  const fixUrl = (url: unknown): string => {
    if (typeof url !== "string" || !url.trim()) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("//")) return "https:" + url;
    return cdn + url;
  };

  const fixItem = (item: any) =>
    item
      ? {
          ...item,
          thumb_url: fixUrl(item.thumb_url),
          poster_url: fixUrl(item.poster_url),
        }
      : item;

  // ── List response: { status, items, pathImage, pagination } ──────
  if (Array.isArray(raw.items)) {
    return {
      ...raw,
      items: raw.items.map(fixItem),
    };
  }

  // ── Detail response: { status, movie, episodes } ─────────────────
  if (raw.movie) {
    return {
      ...raw,
      movie: fixItem(raw.movie),
    };
  }

  // ── Nested data wrapper: { data: { items, ... } } ────────────────
  if (raw.data?.items && Array.isArray(raw.data.items)) {
    return {
      ...raw,
      data: {
        ...raw.data,
        items: raw.data.items.map(fixItem),
      },
    };
  }

  return raw;
}

// ── TTL strategy ─────────────────────────────────────────────────
function getTtl(path: string): number {
  if (
    path.includes("phim-moi-cap-nhat") ||
    path.includes("dang-chieu") ||
    path.includes("phim-moi")
  )
    return 120; // 2 phút cho phim mới
  if (path.startsWith("phim/")) return 600; // 10 phút cho chi tiết
  if (
    path.includes("the-loai") ||
    path.includes("quoc-gia") ||
    path.includes("nam-phat-hanh")
  )
    return 3600; // 1 giờ cho filter
  if (path.includes("tim-kiem")) return 60; // 1 phút cho tìm kiếm
  return 300;
}

export const GET = createMovieProxyHandler({
  sourceName: "OPhim",
  cachePrefix: "ophim",
  baseUrl: OPHIM_DOMAINS[0],
  fallbackUrls: OPHIM_DOMAINS.slice(1),
  getTtl,
  transform: normalizeOphimImages,
  headers: {
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  },
  upstreamErrorMessage: "Lỗi kết nối OPhim API",
});
