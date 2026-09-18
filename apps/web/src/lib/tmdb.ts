/**
 * TMDB API Client
 * Tất cả request đi qua /api/tmdb proxy để bảo vệ API key
 */

const TMDB_PROXY = "/api/tmdb";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

function tmdbImageUrl(path: string, size: string): string {
  if (!path) return "";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("/api/")
  ) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE}/${size}${cleanPath}`;
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

export function sortTmdbLogos(logos: TmdbImage[] = []): TmdbImage[] {
  const languagePriority = (language?: string | null) => {
    const l = (language || "").toLowerCase().trim();
    if (l === "vi") return 4;
    if (l === "en") return 3;
    if (l === "ko" || l === "ja") return 2;
    if (!l) return 1;
    return 0;
  };

  return [...logos]
    .filter(
      (logo) =>
        Boolean(logo.file_path) &&
        (logo.width || 0) > 0 &&
        (logo.height || 0) > 0 &&
        isNonChineseTmdbImage(logo),
    )
    .sort((a, b) => {
      const languageScore =
        languagePriority(b.iso_639_1) - languagePriority(a.iso_639_1);
      if (languageScore !== 0) return languageScore;
      if ((b.vote_average || 0) !== (a.vote_average || 0)) {
        return (b.vote_average || 0) - (a.vote_average || 0);
      }
      return (b.width || 0) - (a.width || 0);
    });
}

export function getBestTitleLogo(logos: TmdbImage[] = []): TmdbImage | null {
  const sorted = sortTmdbLogos(logos);
  return sorted[0] || null;
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

// ── Helper: Bộ lọc Trailer chính xác cao và lấy trailer chính thức từ TMDB ──

// Danh sách từ khóa rác / không phải trailer chính thức (Fan-made, Review, Reaction, v.v.)
const TRAILER_NEGATIVE_REGEX =
  /\b(review|reaction|fan\s*made|fan-made|concept|parody|spoof|unboxing|interview|behind\s+the\s+scenes|bloopers|gag\s*reel|ending\s+explained|breakdown|recap|t\u00f3m\s*t\u1eaft|ph\u00e2n\s*t\u00edch|ost|soundtrack|music\s*video|mv|edit|tiktok|leak|gameplay|walkthrough|audiobook|scene\s*pack|shorts?)\b/i;

const VALID_TRAILER_TYPES = new Set(["Trailer", "Teaser"]);

/**
 * Lọc danh sách trailer chính xác nhất từ TMDB:
 * - Loại bỏ toàn bộ video fan-made, concept, review, reaction, clip hậu trường, bloopers.
 * - Ưu tiên Trailer chính thức của hãng sản xuất (Official Studio Release).
 * - Chấm điểm chất lượng (4K 2160p / 1080p Full HD), ngôn ngữ (Việt hóa / Quốc tế).
 * - Loại bỏ các key trùng lặp.
 */
export function filterAccurateTrailers(videos: TmdbVideo[] = []): TmdbVideo[] {
  if (!videos?.length) return [];

  // Lọc tính hợp lệ cơ bản
  const valid = videos.filter(
    (v) =>
      (v.site === "YouTube" || v.site === "Vimeo") &&
      Boolean(v.key) &&
      VALID_TRAILER_TYPES.has(v.type) &&
      !TRAILER_NEGATIVE_REGEX.test(v.name),
  );

  // Nếu bộ lọc nghiêm ngặt không có kết quả, thử chấp nhận các video không phải rác
  const candidatePool =
    valid.length > 0
      ? valid
      : videos.filter(
          (v) =>
            (v.site === "YouTube" || v.site === "Vimeo") &&
            Boolean(v.key) &&
            v.type !== "Behind the Scenes" &&
            v.type !== "Bloopers" &&
            !TRAILER_NEGATIVE_REGEX.test(v.name),
        );

  if (!candidatePool.length) return [];

  const scored = candidatePool.map((v) => {
    let score = 0;

    // 1. Trailer chính thức từ hãng (Official Studio Release)
    if (v.official) score += 150;

    // 2. Định dạng nội dung: Trailer > Teaser
    if (v.type === "Trailer") score += 100;
    else if (v.type === "Teaser") score += 45;

    const lowerName = (v.name || "").toLowerCase();

    // 3. Tiêu đề trailer chuẩn
    if (/official\s+trailer|trailer\s+ch\u00ednh\s+th\u1ee9c/i.test(lowerName)) {
      score += 65;
    } else if (/main\s+trailer|final\s+trailer/i.test(lowerName)) {
      score += 55;
    } else if (/teaser\s+trailer/i.test(lowerName)) {
      score += 40;
    } else if (lowerName.includes("trailer")) {
      score += 30;
    }

    // 4. Ưu tiên ngôn ngữ (Vietsub / Thuyết minh tiếng Việt -> Tiếng Anh)
    if (v.iso_639_1 === "vi" || /vietsub|thuy\u1ebft\s*minh|l\u1ed3ng\s*ti\u1ebfng/i.test(lowerName)) {
      score += 50;
    } else if (v.iso_639_1 === "en") {
      score += 20;
    }

    // 5. Độ phân giải cao (4K 2160p / 1080p Full HD)
    const size = Number(v.size || 720);
    if (size >= 2160) score += 45;
    else if (size >= 1080) score += 35;
    else if (size >= 720) score += 15;

    // 6. Tính thời sự / ngày xuất bản (ưu tiên trailer bản cập nhật mới nhất)
    if (v.published_at) {
      const pubTime = new Date(v.published_at).getTime();
      if (!Number.isNaN(pubTime)) {
        score += Math.min(20, Math.max(0, (pubTime - 1262304000000) / (1000 * 60 * 60 * 24 * 365)));
      }
    }

    return { video: v, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Khử trùng lặp theo key
  const seenKeys = new Set<string>();
  const results: TmdbVideo[] = [];
  for (const item of scored) {
    if (!seenKeys.has(item.video.key)) {
      seenKeys.add(item.video.key);
      results.push(item.video);
    }
  }

  return results;
}

export function getYoutubeTrailer(videos: TmdbVideo[]): TmdbVideo | null {
  const accurateList = filterAccurateTrailers(videos);
  return accurateList[0] || null;
}

