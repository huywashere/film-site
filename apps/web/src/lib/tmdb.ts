/**
 * TMDB API Client
 * Tất cả request đi qua /api/tmdb proxy để bảo vệ API key
 */

const TMDB_PROXY = "/api/tmdb";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

function tmdbImageUrl(path: string, size: string): string {
  // Use TMDB's public image CDN as the primary path. Sending every image
  // through a serverless function added a cold-start + DNS lookup to each
  // poster and caused production grids to time out before the image arrived.
  // Components that need it can still fall back to /api/image-proxy on error.
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function tmdbImageProxyUrl(url: string): string {
  if (!url || url.startsWith("/api/image-proxy")) return url;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

// ── Image URL helpers ─────────────────────────────────────────────

export type PosterSize =
  "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original";
export type BackdropSize = "w300" | "w780" | "w1280" | "original";
export type LogoSize = "w300" | "w500" | "original";
export type ProfileSize = "w45" | "w185" | "h632" | "original";
export type StillSize = "w92" | "w185" | "w300" | "original";

export function tmdbPoster(
  path: string | null | undefined,
  size: PosterSize = "w342",
): string | null {
  if (!path) return null;
  return tmdbImageUrl(path, size);
}

export function tmdbBackdrop(
  path: string | null | undefined,
  size: BackdropSize = "w1280",
): string | null {
  if (!path) return null;
  return tmdbImageUrl(path, size);
}

export function tmdbLogo(
  path: string | null | undefined,
  size: LogoSize = "w500",
): string | null {
  if (!path) return null;
  return tmdbImageUrl(path, size);
}

export function tmdbProfile(
  path: string | null | undefined,
  size: ProfileSize = "w185",
): string | null {
  if (!path) return null;
  return tmdbImageUrl(path, size);
}

// ── Fetch helper ──────────────────────────────────────────────────

async function fetchTmdb<T>(
  endpoint: string,
  params?: Record<string, string>,
): Promise<T | null> {
  try {
    const url = new URL(
      `${TMDB_PROXY}/${endpoint}`,
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000",
    );
    const isMedia = endpoint.includes("videos") || endpoint.includes("images");
    if (!isMedia) {
      url.searchParams.set("language", "vi-VN");
    }
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`TMDB fetch failed for ${endpoint}:`, err);
    return null;
  }
}

// ── Types ─────────────────────────────────────────────────────────

export interface TmdbMovie {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  genres?: { id: number; name: string }[];
  runtime?: number;
  status?: string;
  tagline?: string;
  homepage?: string;
  imdb_id?: string;
  media_type?: "movie" | "tv";
}

export interface TmdbPagedResults {
  page: number;
  results: TmdbMovie[];
  total_pages: number;
  total_results?: number;
}

export interface TmdbDiscoverOptions {
  page?: number;
  region?: string;
  with_original_language?: string;
  with_origin_country?: string;
  with_genres?: string;
  with_keywords?: string;
  "vote_average.gte"?: number;
  sort_by?:
    "popularity.desc" | "vote_average.desc" | "primary_release_date.desc";
  "vote_count.gte"?: number;
}

function toDiscoverParams(
  options: TmdbDiscoverOptions,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(options).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, String(value)]],
    ),
  );
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
  order?: number;
  known_for_department?: string;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path?: string | null;
}

export interface TmdbCredits {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

export interface TmdbImage {
  file_path: string;
  width: number;
  height: number;
  vote_average: number;
  aspect_ratio: number;
  iso_639_1?: string | null;
}

export interface TmdbImages {
  backdrops: TmdbImage[];
  posters: TmdbImage[];
  logos: TmdbImage[];
}

export function isNonChineseTmdbImage(
  img: TmdbImage | null | undefined,
): boolean {
  if (!img) return false;
  const lang = (img.iso_639_1 || "").toLowerCase().trim();
  return !lang.startsWith("zh") && lang !== "cn";
}

export function sortTmdbImages(images: TmdbImage[] = []): TmdbImage[] {
  return [...images]
    .filter(isNonChineseTmdbImage)
    .sort((a, b) => {
      const getLangScore = (lang?: string | null) => {
        const l = (lang || "").toLowerCase().trim();
        if (l === "vi") return 100; // Vietnamese highest
        if (l === "en") return 80;  // English
        if (!l) return 70;          // Clean textless poster
        if (l === "ja") return 40;  // Japanese
        if (l === "ko") return 40;  // Korean
        return 10;
      };

      const langDiff = getLangScore(b.iso_639_1) - getLangScore(a.iso_639_1);
      if (langDiff !== 0) return langDiff;
      return (b.vote_average || 0) - (a.vote_average || 0);
    });
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
  size?: number;
  iso_639_1?: string;
  iso_3166_1?: string;
}

export interface TmdbFindResult {
  movie_results: TmdbMovie[];
  tv_results: TmdbMovie[];
}

export interface TmdbHeroAssets extends TmdbMovie {
  images?: TmdbImages;
  videos?: { results: TmdbVideo[] };
}

export interface TmdbPersonDetail {
  id: number;
  name: string;
  biography?: string;
  birthday?: string;
  deathday?: string | null;
  place_of_birth?: string;
  profile_path?: string | null;
  known_for_department?: string;
  popularity?: number;
  also_known_as?: string[];
  imdb_id?: string | null;
  homepage?: string | null;
}

export interface TmdbPersonCredits {
  cast: (TmdbMovie & { character?: string; media_type: "movie" | "tv" })[];
  crew: (TmdbMovie & { job?: string; media_type: "movie" | "tv" })[];
}

// ── API Methods ───────────────────────────────────────────────────

export const tmdbApi = {
  // ── Tìm theo IMDB/TMDB ID ──
  findByImdbId: (imdbId: string) =>
    fetchTmdb<TmdbFindResult>(`find/${imdbId}`, { external_source: "imdb_id" }),

  findByTmdbId: (tmdbId: number, type: "movie" | "tv") =>
    fetchTmdb<TmdbMovie>(`${type}/${tmdbId}`),

  // ── Chi tiết phim ──
  getMovieDetail: (tmdbId: number) => fetchTmdb<TmdbMovie>(`movie/${tmdbId}`),

  getTvDetail: (tmdbId: number) => fetchTmdb<TmdbMovie>(`tv/${tmdbId}`),

  // ── Hình ảnh ──
  getMovieImages: (tmdbId: number) =>
    fetchTmdb<TmdbImages>(`movie/${tmdbId}/images`, {
      include_image_language: "vi,en,null,ja,ko",
    }),

  getTvImages: (tmdbId: number) =>
    fetchTmdb<TmdbImages>(`tv/${tmdbId}/images`, {
      include_image_language: "vi,en,null,ja,ko",
    }),

  // ── TV Season & Episode Details & Stills ──
  getTvSeasonDetail: (tvId: number, seasonNumber = 1) =>
    fetchTmdb<{
      _id?: string;
      air_date?: string;
      episodes?: Array<{
        id: number;
        name?: string;
        episode_number: number;
        season_number?: number;
        still_path?: string | null;
        overview?: string;
        vote_average?: number;
      }>;
      name?: string;
      overview?: string;
      poster_path?: string | null;
      season_number?: number;
    }>(`tv/${tvId}/season/${seasonNumber}`),

  getTvSeasonImages: (tvId: number, seasonNumber = 1) =>
    fetchTmdb<TmdbImages>(`tv/${tvId}/season/${seasonNumber}/images`, {
      include_image_language: "vi,en,null,ja,ko",
    }),

  getImages: (type: "movie" | "tv", tmdbId: number | string) =>
    type === "tv"
      ? tmdbApi.getTvImages(Number(tmdbId))
      : tmdbApi.getMovieImages(Number(tmdbId)),

  // ── Diễn viên & Đoàn phim ──
  getMovieCredits: (tmdbId: number) =>
    fetchTmdb<TmdbCredits>(`movie/${tmdbId}/credits`),

  getTvCredits: (tmdbId: number) =>
    fetchTmdb<TmdbCredits>(`tv/${tmdbId}/aggregate_credits`),

  // ── Trailer / Video ──
  getMovieVideos: (tmdbId: number) =>
    fetchTmdb<{ results: TmdbVideo[] }>(`movie/${tmdbId}/videos`, {
      include_video_language: "vi,en,null,ko,ja",
    }),

  getTvVideos: (tmdbId: number) =>
    fetchTmdb<{ results: TmdbVideo[] }>(`tv/${tmdbId}/videos`, {
      include_video_language: "vi,en,null,ko,ja",
    }),

  // One round trip for interaction-critical country heroes.
  getHeroAssets: (tmdbId: number, type: "movie" | "tv") =>
    fetchTmdb<TmdbHeroAssets>(`${type}/${tmdbId}`, {
      append_to_response: "images,videos",
      include_image_language: "vi,en,null,ko,ja",
      include_video_language: "vi,en,null,ko,ja",
    }),

  // ── Diễn viên chi tiết ──
  getPersonDetail: (personId: number) =>
    fetchTmdb<TmdbPersonDetail>(`person/${personId}`),

  getPersonCredits: (personId: number) =>
    fetchTmdb<TmdbPersonCredits>(`person/${personId}/combined_credits`),

  getPersonImages: (personId: number) =>
    fetchTmdb<{ profiles: TmdbImage[] }>(`person/${personId}/images`),

  // ── Tìm kiếm ──
  searchMovie: (query: string, page = 1) =>
    fetchTmdb<{ results: TmdbMovie[]; total_pages: number }>("search/movie", {
      query,
      page: String(page),
    }),

  searchTv: (query: string, page = 1) =>
    fetchTmdb<{ results: TmdbMovie[]; total_pages: number }>("search/tv", {
      query,
      page: String(page),
    }),

  searchMulti: (query: string, page = 1) =>
    fetchTmdb<{
      results: (TmdbMovie & { media_type: string })[];
      total_pages: number;
    }>("search/multi", { query, page: String(page) }),

  // ── Khám phá theo thị trường / ngôn ngữ ──
  discoverMovies: (options: TmdbDiscoverOptions = {}) =>
    fetchTmdb<TmdbPagedResults>(
      "discover/movie",
      toDiscoverParams({
        sort_by: "popularity.desc",
        "vote_count.gte": 20,
        ...options,
      }),
    ),

  // ── Trending & Popular ──
  getTrending: (
    type: "movie" | "tv" | "person" | "all" = "all",
    window: "day" | "week" = "week",
  ) => fetchTmdb<{ results: any[] }>(`trending/${type}/${window}`),

  getPopularPeople: (page = 1) =>
    fetchTmdb<{ results: TmdbCastMember[]; total_pages: number }>(
      "person/popular",
      {
        page: String(page),
      },
    ),
};

// ── Helper: lấy TMDB ID từ film data của KKPhim/OPhim ────────────

export function extractTmdbInfo(film: any): {
  tmdbId: number | null;
  type: "movie" | "tv";
  imdbId: string | null;
} {
  const rawId = film?.tmdb?.id ?? film?.tmdb_id ?? film?.tmdbId;
  const tmdbId =
    rawId && rawId !== "0" && Number.isFinite(Number(rawId))
      ? Number(rawId)
      : null;

  const explicitTmdbType = String(film?.tmdb?.type || "").toLowerCase();
  const type: "movie" | "tv" =
    explicitTmdbType === "tv"
      ? "tv"
      : explicitTmdbType === "movie"
        ? "movie"
        : [
            "series",
            "tv",
            "tvshows",
            "tv-shows",
            "phim-bo",
          ].includes(String(film?.type || "").toLowerCase())
          ? "tv"
          : "movie";

  const imdbId =
    film?.imdb?.id && film.imdb.id !== "0"
      ? film.imdb.id
      : film?.imdb_id || null;

  return { tmdbId, type, imdbId };
}

export async function resolveTmdbHeroAssets(
  film: any,
): Promise<TmdbHeroAssets | null> {
  const extracted = extractTmdbInfo(film);
  let tmdbId = extracted.tmdbId;
  let type = extracted.type;

  if (!tmdbId && extracted.imdbId) {
    const found = await tmdbApi.findByImdbId(extracted.imdbId);
    const matched = found?.tv_results?.[0] || found?.movie_results?.[0];
    if (matched) {
      tmdbId = matched.id;
      type = found?.tv_results?.[0] ? "tv" : "movie";
    }
  }

  if (!tmdbId) {
    const title = String(film?.origin_name || film?.title || film?.name || "")
      .replace(/\s*\([^)]*\)/g, " ")
      .trim();
    if (!title) return null;
    const search =
      type === "tv"
        ? await tmdbApi.searchTv(title)
        : await tmdbApi.searchMovie(title);
    const matched = search?.results?.[0];
    if (!matched) return null;
    tmdbId = matched.id;
  }

  return tmdbApi.getHeroAssets(tmdbId, type);
}

// ── Helper: lấy trailer HD chính thức chất lượng cao từ TMDB ──────────────

export function getYoutubeTrailer(videos: TmdbVideo[]): TmdbVideo | null {
  if (!videos?.length) return null;
  const validVideos = videos.filter(
    (v) => (v.site === "YouTube" || v.site === "Vimeo") && Boolean(v.key),
  );
  if (!validVideos.length) return null;

  // Thuật toán ưu tiên Trailer Chính Thức (Official Studio 4K / 1080p HD)
  const sorted = [...validVideos].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // 1. Phim từ Hãng sản xuất chính thức (Official Studio Release)
    if (a.official) scoreA += 100;
    if (b.official) scoreB += 100;

    // 2. Phân loại nội dung: Trailer > Teaser > Clip
    if (a.type === "Trailer") scoreA += 80;
    else if (a.type === "Teaser") scoreA += 40;
    else if (a.type === "Clip") scoreA += 10;

    if (b.type === "Trailer") scoreB += 80;
    else if (b.type === "Teaser") scoreB += 40;
    else if (b.type === "Clip") scoreB += 10;

    // 3. Tên trailer chứa Official / Main Trailer
    if (/official\s+trailer/i.test(a.name)) scoreA += 50;
    else if (/main\s+trailer/i.test(a.name)) scoreA += 45;
    else if (/trailer/i.test(a.name)) scoreA += 30;

    if (/official\s+trailer/i.test(b.name)) scoreB += 50;
    else if (/main\s+trailer/i.test(b.name)) scoreB += 45;
    else if (/trailer/i.test(b.name)) scoreB += 30;

    // 4. Độ phân giải cao (2160p 4K / 1080p Full HD)
    scoreA += Math.min(Number(a.size || 720) / 20, 110);
    scoreB += Math.min(Number(b.size || 720) / 20, 110);

    // 5. Ưu tiên ngôn ngữ: Vietsub (vi) -> Quốc tế / Tiếng Anh (en)
    if (a.iso_639_1 === "vi") scoreA += 25;
    else if (a.iso_639_1 === "en") scoreA += 15;

    if (b.iso_639_1 === "vi") scoreB += 25;
    else if (b.iso_639_1 === "en") scoreB += 15;

    return scoreB - scoreA;
  });

  return sorted[0] || null;
}
