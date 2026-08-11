import {
  createMovieProxyHandler,
  resolveMovieApiOrigins,
} from "@/lib/movie-proxy";

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
  ["https://phim.nguonc.com/api"],
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
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
  transform: normalizeNguonC,
  forbiddenMessage: "Truy cập bị chặn (403) - Yêu cầu không hợp lệ",
  upstreamErrorMessage: "Lỗi kết nối NguonC API",
});

/**
 * Normalize NguonC response to match KKPhim/OPhim schema.
 *
 * Real NguonC structure (discovered by inspection):
 *   GET /api/film/{slug}  → { status, movie: { ...fields, episodes: [...] } }
 *   movie.episodes[i]     → { server_name, items: [{ name, slug, embed }] }
 *
 * vs KKPhim/OPhim schema:
 *   { status, movie, episodes: [{ server_name, server_data: [{ name, slug, link_embed, link_m3u8 }] }] }
 *
 * Also:
 *   original_name → origin_name
 *   current_episode → episode_current
 *   language → lang
 *   casts (comma string) → actor (array)
 *   category → category (normalize slug → {id, name, slug})
 */
function normalizeNguonC(raw: any, _path: string): any {
  if (!raw) return raw;

  // ── Film list response: { status, paginate, items }
  if (raw.items && Array.isArray(raw.items)) {
    return {
      ...raw,
      items: raw.items.map(normalizeFilmItem),
    };
  }

  // ── Film detail response: { status, movie: { ...info, episodes: [...] } }
  if (raw.movie) {
    const rawEpisodes = raw.movie.episodes ?? [];
    // Remove episodes from movie object to avoid duplication
    const { episodes: _ep, ...movieFields } = raw.movie;
    return {
      status: raw.status,
      movie: normalizeFilmItem(movieFields),
      // Lift episodes to top level and normalize
      episodes: normalizeEpisodes(rawEpisodes),
    };
  }

  return raw;
}

function normalizeFilmItem(film: any): any {
  if (!film) return film;

  // Normalize category array: NguonC may return [{id, name, slug}] or strings
  const rawCategories: any[] = Array.isArray(film.category)
    ? film.category
    : [];
  const category = rawCategories.map((c: any, idx: number) =>
    typeof c === "string"
      ? { id: String(idx), name: c, slug: c.toLowerCase().replace(/\s+/g, "-") }
      : { id: String(c.id ?? idx), name: c.name ?? c, slug: c.slug ?? "" },
  );

  return {
    ...film,
    // Field name normalization
    origin_name: film.original_name ?? film.origin_name ?? "",
    episode_current: film.current_episode ?? film.episode_current ?? "",
    lang: film.language ?? film.lang ?? "",
    // Convert comma-string casts to array
    actor:
      typeof film.casts === "string"
        ? film.casts
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : Array.isArray(film.actor)
          ? film.actor
          : [],
    // Director as array
    director: film.director
      ? typeof film.director === "string"
        ? film.director
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : film.director
      : [],
    // Normalized category
    category,
    // Mark source
    _source: "NguonC",
  };
}

function normalizeEpisodes(episodes: any[]): any[] {
  if (!Array.isArray(episodes)) return [];

  return episodes.map((server: any) => ({
    server_name: server.server_name ?? "NguonC",
    // NguonC uses 'items', KKPhim/OPhim use 'server_data'
    server_data: Array.isArray(server.items)
      ? server.items.map((ep: any) => ({
          name: ep.name,
          slug: ep.slug,
          // NguonC uses 'embed', map to link_embed
          link_embed: ep.embed ?? ep.link_embed ?? "",
          // NguonC doesn't provide m3u8 streams directly
          link_m3u8: ep.link_m3u8 ?? "",
        }))
      : [],
  }));
}
