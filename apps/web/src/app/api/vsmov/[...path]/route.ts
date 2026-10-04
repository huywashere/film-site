import {
  createMovieProxyHandler,
  resolveMovieApiOrigins,
} from "@/lib/movie-proxy";

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
 * VSMov JSON endpoints live under https://vsmov.com/api.
 * Image URLs là relative paths, cần prepend với pathImage từ response.
 *
 * Field mapping: giống KKPhim/OPhim (origin_name, episode_current, etc.)
 */

// ── Base URL: vsmov.com/api ───────────────────────────────────────
const VSMOV_ORIGINS = resolveMovieApiOrigins(
  process.env.VSMOV_API_ORIGINS || process.env.VSMOV_API_BASE,
  ["https://vsmov.com/api"],
);
const VSMOV_DEFAULT_CDN = "https://vsmov.com/storage/images/";

// ── Image & Episode Stream normalizer ─────────────────────────────
export function normalizeVsmovImages(raw: any, _path: string): any {
  if (!raw) return raw;

  const cdnBase = raw?.pathImage || raw?.data?.pathImage || VSMOV_DEFAULT_CDN;
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
          _source: "vsmov",
        }
      : item;

  const fixEpisodes = (episodes: any): any => {
    if (!Array.isArray(episodes)) return episodes;
    return episodes.map((server: any) => {
      const serverName = String(server?.server_name || "")
        .replace(/[\r\n]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const rawData = Array.isArray(server?.server_data)
        ? server.server_data
        : Array.isArray(server?.items)
          ? server.items
          : [];
      const fixedData = rawData.map((ep: any) => {
        const link_embed = String(ep?.link_embed || ep?.embed || "").trim();
        const link_m3u8 = String(ep?.link_m3u8 || ep?.m3u8 || "").trim();
        return {
          ...ep,
          link_embed,
          link_m3u8,
        };
      });
      return {
        ...server,
        server_name: serverName,
        server_data: fixedData,
      };
    });
  };

  let result = raw;

  // List response
  if (Array.isArray(result.items)) {
    result = { ...result, items: result.items.map(fixItem) };
  }

  // Detail response
  if (result.movie) {
    result = { ...result, movie: fixItem(result.movie) };
  }

  // Nested data wrapper
  if (result.data?.items && Array.isArray(result.data.items)) {
    result = {
      ...result,
      data: { ...result.data, items: result.data.items.map(fixItem) },
    };
  }

  if (result.data?.item) {
    result = {
      ...result,
      data: { ...result.data, item: fixItem(result.data.item) },
    };
  }

  if (result.data?.movie) {
    result = {
      ...result,
      data: { ...result.data, movie: fixItem(result.data.movie) },
    };
  }

  // Normalize episodes (both top-level and nested variants)
  if (Array.isArray(result.episodes)) {
    result = { ...result, episodes: fixEpisodes(result.episodes) };
  } else if (Array.isArray(result.data?.episodes)) {
    result = {
      ...result,
      data: { ...result.data, episodes: fixEpisodes(result.data.episodes) },
    };
  } else if (Array.isArray(result.movie?.episodes)) {
    result = {
      ...result,
      movie: { ...result.movie, episodes: fixEpisodes(result.movie.episodes) },
    };
  }

  return result;
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
  baseUrl: VSMOV_ORIGINS[0],
  fallbackUrls: VSMOV_ORIGINS.slice(1),
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
