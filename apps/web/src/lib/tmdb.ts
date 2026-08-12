/**
 * TMDB API Client
 * Tất cả request đi qua /api/tmdb proxy để bảo vệ API key
 */

const TMDB_PROXY = "/api/tmdb";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

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
  const raw = `${TMDB_IMAGE_BASE}/${size}${path}`;
  return `/api/image-proxy?url=${encodeURIComponent(raw)}`;
}

export function tmdbBackdrop(
  path: string | null | undefined,
  size: BackdropSize = "w1280",
): string | null {
  if (!path) return null;
  const raw = `${TMDB_IMAGE_BASE}/${size}${path}`;
  return `/api/image-proxy?url=${encodeURIComponent(raw)}`;
}

export function tmdbLogo(
  path: string | null | undefined,
  size: LogoSize = "w500",
): string | null {
  if (!path) return null;
  const raw = `${TMDB_IMAGE_BASE}/${size}${path}`;
  return `/api/image-proxy?url=${encodeURIComponent(raw)}`;
}

export function tmdbProfile(
  path: string | null | undefined,
  size: ProfileSize = "w185",
): string | null {
  if (!path) return null;
  const raw = `${TMDB_IMAGE_BASE}/${size}${path}`;
  return `/api/image-proxy?url=${encodeURIComponent(raw)}`;
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
    url.searchParams.set("language", "vi-VN");
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

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
}

export interface TmdbFindResult {
  movie_results: TmdbMovie[];
  tv_results: TmdbMovie[];
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
      include_image_language: "vi,en,null",
    }),

  getTvImages: (tmdbId: number) =>
    fetchTmdb<TmdbImages>(`tv/${tmdbId}/images`, {
      include_image_language: "vi,en,null",
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
      include_video_language: "vi,en",
    }),

  getTvVideos: (tmdbId: number) =>
    fetchTmdb<{ results: TmdbVideo[] }>(`tv/${tmdbId}/videos`, {
      include_video_language: "vi,en",
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
  const tmdbId =
    film?.tmdb?.id && film.tmdb.id !== "0"
      ? Number(film.tmdb.id)
      : film?.tmdb_id
        ? Number(film.tmdb_id)
        : null;

  const type: "movie" | "tv" =
    film?.tmdb?.type === "tv" ||
    [
      "series",
      "tv",
      "tvshows",
      "tv-shows",
      "phim-bo",
      "hoat-hinh",
      "hoathinh",
      "anime",
    ].includes(String(film?.type || "").toLowerCase())
      ? "tv"
      : "movie";

  const imdbId =
    film?.imdb?.id && film.imdb.id !== "0"
      ? film.imdb.id
      : film?.imdb_id || null;

  return { tmdbId, type, imdbId };
}

// ── Helper: lấy trailer YouTube đầu tiên ─────────────────────────

export function getYoutubeTrailer(videos: TmdbVideo[]): TmdbVideo | null {
  if (!videos?.length) return null;
  const youtubeVideos = videos.filter((v) => v.site === "YouTube");
  if (!youtubeVideos.length) return null;

  // 1. Official Trailer (type === 'Trailer' and name has official)
  const officialTrailer = youtubeVideos.find(
    (v) => v.type === "Trailer" && /official trailer/i.test(v.name),
  );
  if (officialTrailer) return officialTrailer;

  // 2. Any Trailer (type === 'Trailer')
  const anyTypeTrailer = youtubeVideos.find((v) => v.type === "Trailer");
  if (anyTypeTrailer) return anyTypeTrailer;

  // 3. Name contains trailer
  const nameTrailer = youtubeVideos.find((v) => /trailer/i.test(v.name));
  if (nameTrailer) return nameTrailer;

  // 4. Teaser
  const teaser = youtubeVideos.find(
    (v) => v.type === "Teaser" || /teaser/i.test(v.name),
  );
  if (teaser) return teaser;

  return youtubeVideos[0];
}
