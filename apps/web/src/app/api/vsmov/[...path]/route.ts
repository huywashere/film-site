import { createMovieProxyHandler } from "@/lib/movie-proxy";

/**
 * VSMov API Proxy — https://vsmov.com
 *
 * VSMov dùng cùng CMS với OPhim — endpoints và schema giống nhau:
 *   GET /danh-sach/phim-moi-cap-nhat?page=X  — Phim mới cập nhật
 *   GET /danh-sach/{slug}?page=X             — Phim theo danh mục
 *   GET /phim/{slug}                         — Chi tiết phim + tập
 *   GET /the-loai/{slug}?page=X             — Theo thể loại
 *   GET /quoc-gia/{slug}?page=X             — Theo quốc gia
 *   GET /nam-phat-hanh/{year}?page=X        — Theo năm
 *   GET /tim-kiem?keyword=X&page=Y          — Tìm kiếm
 *
 * QUAN TRỌNG: Base URL là https://vsmov.com (KHÔNG phải /api)
 * Image URLs là relative paths, cần prepend với pathImage từ response.
 *
 * Field mapping: giống KKPhim/OPhim (origin_name, episode_current, etc.)
 */

// ── Base URL: vsmov.com (không có /api prefix) ───────────────────
const VSMOV_BASE = process.env.VSMOV_API_BASE || "https://vsmov.com";
const VSMOV_DEFAULT_CDN = "https://vsmov.com/uploads/movies/";

// ── Image URL normalizer ─────────────────────────────────────────
function normalizeVsmovImages(raw: any, _path: string): any {
  if (!raw) return raw;

  const cdnBase =
    raw?.pathImage || raw?.data?.pathImage || VSMOV_DEFAULT_CDN;
  const cdn = cdnBase.endsWith("/") ? cdnBase : cdnBase + "/";

  const fixUrl = (url?: string): string => {
    if (!url) return "";
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

  // List response
  if (Array.isArray(raw.items)) {
    return { ...raw, items: raw.items.map(fixItem) };
  }

  // Detail response
  if (raw.movie) {
    return { ...raw, movie: fixItem(raw.movie) };
  }

  // Nested data wrapper
  if (raw.data?.items && Array.isArray(raw.data.items)) {
    return {
      ...raw,
      data: { ...raw.data, items: raw.data.items.map(fixItem) },
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
    return 120;
  if (path.startsWith("phim/")) return 600;
  if (
    path.includes("the-loai") ||
    path.includes("quoc-gia") ||
    path.includes("nam-phat-hanh")
  )
    return 3600;
  if (path.includes("tim-kiem")) return 60;
  return 300;
}

export const GET = createMovieProxyHandler({
  sourceName: "VSMov",
  cachePrefix: "vsmov",
  baseUrl: VSMOV_BASE,
  getTtl,
  transform: normalizeVsmovImages,
  headers: {
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Referer: "https://vsmov.com/",
  },
  upstreamErrorMessage: "Lỗi kết nối VSMov API",
});
