import axios from "axios";
import {
  dedupeFilmsBySource,
  extractFilmItems,
  isUsableMovieDetail,
  tagMovieDetailSource,
  type MovieSource,
} from "@/lib/movie-normalizer";
import { rankSearchResults, expandQuery } from "@/lib/search-engine";

// ── KKPhim API Configuration ──────────────────────────────────────
const KKPHIM_PROXY = "/api/kkphim";

// Helper function to handle API calls
const fetchKKPhim = async (endpoint: string) => {
  try {
    const response = await fetch(`${KKPHIM_PROXY}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("KKPhim API Error:", error);
    throw error;
  }
};

// ── KKPhim Direct API (qua Next.js proxy) ──────────────────────────
export const kkphimApi = {
  // Phim mới cập nhật
  getLatest: (page = 1) =>
    fetchKKPhim(`/danh-sach/phim-moi-cap-nhat?page=${page}`),

  // Danh sách theo loại (v1 API)
  getSeries: (page = 1, limit = 24) =>
    fetchKKPhim(`/v1/api/danh-sach/phim-bo?page=${page}&limit=${limit}`),

  getSingle: (page = 1, limit = 24) =>
    fetchKKPhim(`/v1/api/danh-sach/phim-le?page=${page}&limit=${limit}`),

  getAnime: (page = 1, limit = 24) =>
    fetchKKPhim(`/v1/api/danh-sach/hoat-hinh?page=${page}&limit=${limit}`),

  getTvShows: (page = 1, limit = 24) =>
    fetchKKPhim(`/v1/api/danh-sach/tv-shows?page=${page}&limit=${limit}`),

  // Lọc phim với nhiều tùy chọn
  getFiltered: (params: {
    type?: string; // phim-le, phim-bo, hoat-hinh, tv-shows
    status?: string; // trailer, ongoing, completed
    category?: string; // slug thể loại
    country?: string; // slug quốc gia
    year?: number;
    page?: number;
    limit?: number;
    sort_field?: string; // modified.time, year, _id
    sort_type?: string; // desc, asc
  }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
    return fetchKKPhim(`/v1/api/danh-sach?${query.toString()}`);
  },

  // Chi tiết phim
  getDetail: (slug: string) => fetchKKPhim(`/phim/${slug}`),

  getDetailV1: (slug: string) => fetchKKPhim(`/v1/api/phim/${slug}`),

  // Thông tin phim theo ID
  getById: (id: string) => fetchKKPhim(`/phim/id/${id}`),

  getByTmdb: (tmdbId: string, type: "tv" | "movie", season?: number) => {
    const seasonParam = season ? `&season=${season}` : "";
    return fetchKKPhim(
      `/phim/tmdb?tmdb_id=${tmdbId}&type=${type}${seasonParam}`,
    );
  },

  getByImdb: (imdbId: string) => fetchKKPhim(`/phim/imdb?imdb_id=${imdbId}`),

  // Hình ảnh, diễn viên, từ khóa
  getImages: (tmdbType: "tv" | "movie", tmdbId: string) =>
    fetchKKPhim(`/phim/images?tmdb_type=${tmdbType}&tmdb_id=${tmdbId}`),

  getCast: (tmdbType: "tv" | "movie", tmdbId: string) =>
    fetchKKPhim(`/phim/cast?tmdb_type=${tmdbType}&tmdb_id=${tmdbId}`),

  getKeywords: (tmdbType: "tv" | "movie", tmdbId: string) =>
    fetchKKPhim(`/phim/keywords?tmdb_type=${tmdbType}&tmdb_id=${tmdbId}`),

  // Tìm kiếm
  search: (keyword: string, page = 1, limit = 24) =>
    fetchKKPhim(
      `/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}&limit=${limit}`,
    ),

  // Thể loại
  getGenres: () => fetchKKPhim(`/the-loai`),

  getByGenre: (slug: string, page = 1, limit = 24) =>
    fetchKKPhim(`/v1/api/the-loai/${slug}?page=${page}&limit=${limit}`),

  // Quốc gia
  getCountries: () => fetchKKPhim(`/quoc-gia`),

  getByCountry: (slug: string, page = 1, limit = 24) =>
    fetchKKPhim(`/v1/api/quoc-gia/${slug}?page=${page}&limit=${limit}`),

  // Năm phát hành
  getYears: () => fetchKKPhim(`/nam-phat-hanh`),

  getByYear: (year: number, page = 1, limit = 24) =>
    fetchKKPhim(`/nam-phat-hanh/${year}?page=${page}&limit=${limit}`),
};

// ── OPhim, NguonC & VSMOV Proxies ──────────────────────────────
const fetchOphim = async (endpoint: string) => {
  const response = await fetch(`/api/ophim${endpoint}`);
  const json = await response.json();

  if (json?.data?.items) {
    const cdnDomain =
      json.data.APP_DOMAIN_CDN_IMAGE || "https://img.ophim.live";
    const cdnUrl = json.data.pathImage || `${cdnDomain}/uploads/movies/`;
    const finalCdn = cdnUrl.endsWith("/") ? cdnUrl : `${cdnUrl}/`;
    json.data.items = json.data.items.map((item: any) => ({
      ...item,
      thumb_url: item.thumb_url?.startsWith("http")
        ? item.thumb_url
        : `${finalCdn}${item.thumb_url}`,
      poster_url: item.poster_url?.startsWith("http")
        ? item.poster_url
        : `${finalCdn}${item.poster_url}`,
    }));
  }

  if (json?.movie) {
    const finalCdn = "https://img.ophim.live/uploads/movies/";
    json.movie = {
      ...json.movie,
      thumb_url:
        json.movie.thumb_url?.startsWith("http") || !json.movie.thumb_url
          ? json.movie.thumb_url
          : `${finalCdn}${json.movie.thumb_url}`,
      poster_url:
        json.movie.poster_url?.startsWith("http") || !json.movie.poster_url
          ? json.movie.poster_url
          : `${finalCdn}${json.movie.poster_url}`,
    };
  }

  return json;
};

const fetchNguonc = async (endpoint: string) => {
  const response = await fetch(`/api/nguonc${endpoint}`);
  if (!response.ok) throw new Error(`NguonC API Error: ${response.status}`);
  return response.json();
};

const fetchVsmov = async (endpoint: string) => {
  const response = await fetch(`/api/vsmov${endpoint}`);
  if (!response.ok) throw new Error(`VSMOV API Error: ${response.status}`);
  return response.json();
};

export const vsmovApi = {
  getLatest: (page = 1, limit = 24) =>
    fetchVsmov(`/danh-sach/phim-moi-cap-nhat?page=${page}&limit=${limit}`),
  search: (keyword: string, page = 1, limit = 24) =>
    fetchVsmov(
      `/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}&limit=${limit}`,
    ),
  getDetail: (slug: string) => fetchVsmov(`/phim/${slug}`),
  getByGenre: (slug: string, page = 1, limit = 24) =>
    fetchVsmov(`/the-loai/${slug}?page=${page}&limit=${limit}`),
  getByCountry: (slug: string, page = 1, limit = 24) =>
    fetchVsmov(`/quoc-gia/${slug}?page=${page}&limit=${limit}`),
};

function asRecord(value: unknown): Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function getTotalPages(data: unknown): number | undefined {
  const root = asRecord(data);
  const dataRecord = asRecord(root.data);
  const params = asRecord(dataRecord.params);
  const pagination = asRecord(params.pagination);
  const rootPagination = asRecord(root.pagination);
  const paginate = asRecord(root.paginate);

  return (
    readNumber(pagination.totalPages) ||
    readNumber(rootPagination.totalPages) ||
    readNumber(paginate.total_page)
  );
}

async function searchAllSources(keyword: string, page = 1, limit = 24) {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return {
      status: "success",
      data: {
        items: [],
        params: {
          pagination: {
            currentPage: 1,
            totalItems: 0,
            totalItemsPerPage: limit,
            totalPages: 1,
          },
        },
      },
      _sources: [],
    };
  }

  // Expand query thành nhiều biến thể để tăng recall
  const variants = expandQuery(trimmed);
  const primaryKeyword = variants[0];
  const encodedKeyword = encodeURIComponent(primaryKeyword);

  // Gọi song song tất cả nguồn với primary keyword
  const requests: Array<{
    source: MovieSource;
    request: () => Promise<unknown>;
  }> = [
    {
      source: "kkphim",
      request: () => kkphimApi.search(primaryKeyword, page, limit),
    },
    {
      source: "ophim",
      request: () =>
        fetchOphim(
          `/v1/api/tim-kiem?keyword=${encodedKeyword}&page=${page}&limit=${limit}`,
        ),
    },
    {
      source: "nguonc",
      request: () =>
        fetchNguonc(`/films/search?keyword=${encodedKeyword}&page=${page}`),
    },
    {
      source: "vsmov",
      request: () => vsmovApi.search(primaryKeyword, page, limit),
    },
  ];

  // Nếu query có biến thể khác (bỏ dấu), gọi thêm với variant thứ 2
  const extraRequests: Array<{
    source: MovieSource;
    request: () => Promise<unknown>;
  }> = [];
  if (variants.length > 1 && variants[1] !== primaryKeyword) {
    const encodedVariant = encodeURIComponent(variants[1]);
    extraRequests.push(
      {
        source: "kkphim",
        request: () => kkphimApi.search(variants[1], page, limit),
      },
      {
        source: "ophim",
        request: () =>
          fetchOphim(
            `/v1/api/tim-kiem?keyword=${encodedVariant}&page=${page}&limit=${limit}`,
          ),
      },
    );
  }

  const [primarySettled, extraSettled] = await Promise.all([
    Promise.allSettled(requests.map((e) => e.request())),
    extraRequests.length > 0
      ? Promise.allSettled(extraRequests.map((e) => e.request()))
      : Promise.resolve([] as PromiseSettledResult<unknown>[]),
  ]);

  // Gom kết quả từ primary requests
  const groups = primarySettled.map((result, i) => ({
    source: requests[i].source,
    items: result.status === "fulfilled" ? extractFilmItems(result.value) : [],
  }));

  // Gom kết quả từ extra requests (variant query)
  const extraGroups = extraSettled.map((result, i) => ({
    source: extraRequests[i].source,
    items: result.status === "fulfilled" ? extractFilmItems(result.value) : [],
  }));

  // Merge tất cả groups (primary + extra)
  const allGroups = [...groups, ...extraGroups];
  const merged = dedupeFilmsBySource(allGroups);

  // ── Smart re-ranking với search engine ──
  const ranked = rankSearchResults(merged, trimmed);

  // Paginate sau khi rank
  const startIndex = (page - 1) * limit;
  const items = ranked.slice(startIndex, startIndex + limit);

  const totalPages = Math.max(
    1,
    Math.ceil(ranked.length / limit),
    ...primarySettled.map((result) =>
      result.status === "fulfilled" ? getTotalPages(result.value) || 1 : 1,
    ),
  );

  return {
    status: "success",
    data: {
      items,
      params: {
        pagination: {
          currentPage: page,
          totalItems: ranked.length,
          totalItemsPerPage: limit,
          totalPages,
        },
      },
    },
    _sources: groups.map((g) => ({ source: g.source, count: g.items.length })),
    _totalMerged: merged.length,
    _query: { original: trimmed, variants },
  };
}

async function getDetailFromAnySource(slug: string): Promise<any> {
  const requests: Array<{
    source: MovieSource;
    request: () => Promise<unknown>;
  }> = [
    {
      source: "kkphim",
      request: () => kkphimApi.getDetail(slug),
    },
    {
      source: "ophim",
      request: () => fetchOphim(`/phim/${slug}`),
    },
    {
      source: "nguonc",
      request: () => fetchNguonc(`/film/${slug}`),
    },
    {
      source: "vsmov",
      request: () => vsmovApi.getDetail(slug),
    },
  ];

  for (const entry of requests) {
    try {
      const data = await entry.request();
      if (isUsableMovieDetail(data)) {
        return tagMovieDetailSource(data, entry.source) as any;
      }
    } catch {
      // Try the next movie source.
    }
  }

  return {
    status: false,
    error: true,
    message: `Không tìm thấy phim: ${slug}`,
  };
}

// ── movieApi (alias for component compatibility) ──────────────────
export const movieApi = {
  getLatest: (page = 1) => kkphimApi.getLatest(page).then((data) => ({ data })),
  getSeries: (page = 1) =>
    kkphimApi.getSeries(page, 24).then((data) => ({ data })),
  getSingle: (page = 1) =>
    kkphimApi.getSingle(page, 24).then((data) => ({ data })),
  getAnime: (page = 1) =>
    kkphimApi.getAnime(page, 24).then((data) => ({ data })),
  getTvShows: (page = 1) =>
    kkphimApi.getTvShows(page, 24).then((data) => ({ data })),
  getDetail: (slug: string) =>
    getDetailFromAnySource(slug).then((data) => ({ data })),
  getDetailV1: (slug: string) =>
    kkphimApi.getDetailV1(slug).then((data) => ({ data })),
  search: (keyword: string, page = 1, limit = 24) =>
    searchAllSources(keyword, page, limit).then((data) => ({ data })),
  getByGenre: (slug: string, page = 1) =>
    kkphimApi.getByGenre(slug, page).then((data) => ({ data })),
  getByCountry: (slug: string, page = 1) =>
    kkphimApi.getByCountry(slug, page).then((data) => ({ data })),
  getByYear: (year: number, page = 1) =>
    kkphimApi.getByYear(year, page).then((data) => ({ data })),
  getGenres: () => kkphimApi.getGenres().then((data) => ({ data })),
  getCountries: () => kkphimApi.getCountries().then((data) => ({ data })),
  getYears: () => kkphimApi.getYears().then((data) => ({ data })),
  getFiltered: (params: Parameters<typeof kkphimApi.getFiltered>[0]) =>
    kkphimApi.getFiltered(params).then((data) => ({ data })),
};

// ── NestJS Backend API (cần backend chạy) ───────────────────────────
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Request interceptor — attach auth token (removed local storage logic, handled by cookies)
api.interceptors.request.use((config) => {
  return config;
});

// Response interceptor — handle 401 with refresh
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        // Because withCredentials is true, this post will automatically send the refreshToken cookie
        await axios.post(
          `${API_BASE}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        // Retry original request (cookies are automatically sent)
        return api(original);
      } catch {
        // Redirect if refresh fails (token revoked or expired)
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  },
);

// ── Auth API ───────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
  verifyEmail: (data: { token: string }) =>
    api.post("/auth/verify-email", data),
  forgotPassword: (data: { email: string }) =>
    api.post("/auth/forgot-password", data),
  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post("/auth/reset-password", data),

  // 2FA Endpoints
  setup2FA: () => api.post("/auth/2fa/setup"),
  verify2FA: (data: { code: string }) => api.post("/auth/2fa/verify", data),
  disable2FA: (data: { code: string }) => api.post("/auth/2fa/disable", data),
  loginVerify2FA: (data: { tempToken: string; code: string }) =>
    api.post("/auth/2fa/login-verify", data),

  // Session Management Endpoints
  getSessions: () => api.get("/auth/sessions"),
  revokeSession: (id: string) => api.post(`/auth/sessions/${id}/revoke`),
  revokeAllSessions: () => api.post("/auth/sessions/revoke-all"),
  logout: () => api.post("/auth/logout"),
};

// ── Watchlist API ──────────────────────────────────────────
export const watchlistApi = {
  get: (page = 1) => api.get(`/watchlist?page=${page}`),
  add: (movieId: string, movieData?: any) =>
    api.post("/watchlist", { movieId, movieData }),
  remove: (movieId: string) => api.delete(`/watchlist/${movieId}`),
  check: (movieId: string) => api.get(`/watchlist/check/${movieId}`),
};

// ── Reviews API ────────────────────────────────────────────
export const reviewsApi = {
  getByMovie: (movieId: string, page = 1) =>
    api.get(`/reviews/movie/${movieId}?page=${page}`),
  getRecent: (page = 1) => api.get(`/reviews?page=${page}`),
  create: (data: { movieId: string; content: string; rating?: number }) =>
    api.post("/reviews", data),
  delete: (id: string) => api.delete(`/reviews/${id}`),
  like: (id: string) => api.post(`/reviews/${id}/like`),
};

// ── Ratings API ────────────────────────────────────────────
export const ratingsApi = {
  rate: (movieId: string, score: number) =>
    api.post("/ratings", { movieId, score }),
  getAverage: (movieId: string) => api.get(`/ratings/movie/${movieId}/average`),
  getMine: (movieId: string) => api.get(`/ratings/movie/${movieId}/mine`),
};

// ── Watch History API ──────────────────────────────────────
export const watchHistoryApi = {
  /** Upsert progress — call every 30s while watching */
  upsert: (data: {
    movieId: string;
    episode?: string;
    progress: number;
    duration: number;
    movieTitle: string;
    movieThumb?: string;
    serverName?: string;
  }) => api.post("/watch-history", data),

  /** Get paginated history list */
  getHistory: (page = 1, limit = 20) =>
    api.get(`/watch-history?page=${page}&limit=${limit}`),

  /** Get resume data for a specific movie (returns all episodes) */
  getResume: (movieId: string) => api.get(`/watch-history/resume/${movieId}`),

  /** Delete a single history entry */
  deleteEntry: (id: string) => api.delete(`/watch-history/${id}`),

  /** Clear all history */
  clearAll: () => api.delete("/watch-history"),
};
