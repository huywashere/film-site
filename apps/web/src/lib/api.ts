import axios from 'axios';

// ── KKPhim API Configuration ──────────────────────────────────────
const KKPHIM_PROXY = '/api/kkphim';

// Helper function to handle API calls
const fetchKKPhim = async (endpoint: string) => {
  try {
    const response = await fetch(`${KKPHIM_PROXY}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('KKPhim API Error:', error);
    throw error;
  }
};

// ── KKPhim Direct API (qua Next.js proxy) ──────────────────────────
export const kkphimApi = {
  // Phim mới cập nhật
  getLatest: (page = 1) => fetchKKPhim(`/danh-sach/phim-moi-cap-nhat?page=${page}`),

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

  getByTmdb: (tmdbId: string, type: 'tv' | 'movie', season?: number) => {
    const seasonParam = season ? `&season=${season}` : '';
    return fetchKKPhim(`/phim/tmdb?tmdb_id=${tmdbId}&type=${type}${seasonParam}`);
  },

  getByImdb: (imdbId: string) => fetchKKPhim(`/phim/imdb?imdb_id=${imdbId}`),

  // Hình ảnh, diễn viên, từ khóa
  getImages: (tmdbType: 'tv' | 'movie', tmdbId: string) =>
    fetchKKPhim(`/phim/images?tmdb_type=${tmdbType}&tmdb_id=${tmdbId}`),

  getCast: (tmdbType: 'tv' | 'movie', tmdbId: string) =>
    fetchKKPhim(`/phim/cast?tmdb_type=${tmdbType}&tmdb_id=${tmdbId}`),

  getKeywords: (tmdbType: 'tv' | 'movie', tmdbId: string) =>
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

// ── Ophim & NguonC Proxies ──────────────────────────────────────
const fetchOphim = async (endpoint: string) => {
  const response = await fetch(`/api/ophim${endpoint}`);
  const json = await response.json();
  
  if (json?.data?.items) {
    const cdnDomain = json.data.APP_DOMAIN_CDN_IMAGE || 'https://img.ophim.live';
    const cdnUrl = json.data.pathImage || `${cdnDomain}/uploads/movies/`;
    const finalCdn = cdnUrl.endsWith('/') ? cdnUrl : `${cdnUrl}/`;
    json.data.items = json.data.items.map((item: any) => ({
      ...item,
      thumb_url: item.thumb_url?.startsWith('http') ? item.thumb_url : `${finalCdn}${item.thumb_url}`,
      poster_url: item.poster_url?.startsWith('http') ? item.poster_url : `${finalCdn}${item.poster_url}`,
    }));
  }
  
  return json;
};

const fetchNguonc = async (endpoint: string) => {
  const response = await fetch(`/api/nguonc${endpoint}`);
  const json = await response.json();
  console.log('NguonC Response:', endpoint, json);
  return json;
};

// ── movieApi (alias for component compatibility) ──────────────────
export const movieApi = {
  getLatest: (page = 1) => kkphimApi.getLatest(page).then((data) => ({ data })),
  getSeries: (page = 1) => fetchOphim(`/v1/api/danh-sach/phim-bo?page=${page}&limit=24`).then((data) => ({ data })),
  getSingle: (page = 1) => fetchNguonc(`/films/danh-sach/phim-le?page=${page}`).then((data) => ({ data })),
  getAnime: (page = 1) => fetchOphim(`/v1/api/danh-sach/hoat-hinh?page=${page}&limit=24`).then((data) => ({ data })),
  getTvShows: (page = 1) => fetchNguonc(`/films/danh-sach/tv-shows?page=${page}`).then((data) => ({ data })),
  getDetail: (slug: string) => kkphimApi.getDetail(slug).then((data) => ({ data })),
  getDetailV1: (slug: string) => kkphimApi.getDetailV1(slug).then((data) => ({ data })),
  search: (keyword: string, page = 1) => kkphimApi.search(keyword, page).then((data) => ({ data })),
  getByGenre: (slug: string, page = 1) =>
    kkphimApi.getByGenre(slug, page).then((data) => ({ data })),
  getByCountry: (slug: string, page = 1) =>
    kkphimApi.getByCountry(slug, page).then((data) => ({ data })),
  getByYear: (year: number, page = 1) => kkphimApi.getByYear(year, page).then((data) => ({ data })),
  getGenres: () => kkphimApi.getGenres().then((data) => ({ data })),
  getCountries: () => kkphimApi.getCountries().then((data) => ({ data })),
  getYears: () => kkphimApi.getYears().then((data) => ({ data })),
  getFiltered: (params: Parameters<typeof kkphimApi.getFiltered>[0]) =>
    kkphimApi.getFiltered(params).then((data) => ({ data })),
};

// ── NestJS Backend API (cần backend chạy) ───────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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
        await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
        
        // Retry original request (cookies are automatically sent)
        return api(original);
      } catch {
        // Redirect if refresh fails (token revoked or expired)
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  },
);

// ── Auth API ───────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  verifyEmail: (data: { token: string }) => api.post('/auth/verify-email', data),
  forgotPassword: (data: { email: string }) => api.post('/auth/forgot-password', data),
  resetPassword: (data: { token: string; newPassword: string }) => api.post('/auth/reset-password', data),
  
  // 2FA Endpoints
  setup2FA: () => api.post('/auth/2fa/setup'),
  verify2FA: (data: { code: string }) => api.post('/auth/2fa/verify', data),
  disable2FA: (data: { code: string }) => api.post('/auth/2fa/disable', data),
  loginVerify2FA: (data: { tempToken: string; code: string }) => api.post('/auth/2fa/login-verify', data),

  // Session Management Endpoints
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (id: string) => api.post(`/auth/sessions/${id}/revoke`),
  revokeAllSessions: () => api.post('/auth/sessions/revoke-all'),
  logout: () => api.post('/auth/logout'),
};

// ── Watchlist API ──────────────────────────────────────────
export const watchlistApi = {
  get: (page = 1) => api.get(`/watchlist?page=${page}`),
  add: (movieId: string, movieData?: any) => api.post('/watchlist', { movieId, movieData }),
  remove: (movieId: string) => api.delete(`/watchlist/${movieId}`),
  check: (movieId: string) => api.get(`/watchlist/check/${movieId}`),
};

// ── Reviews API ────────────────────────────────────────────
export const reviewsApi = {
  getByMovie: (movieId: string, page = 1) => api.get(`/reviews/movie/${movieId}?page=${page}`),
  getRecent: (page = 1) => api.get(`/reviews?page=${page}`),
  create: (data: { movieId: string; content: string; rating?: number }) =>
    api.post('/reviews', data),
  delete: (id: string) => api.delete(`/reviews/${id}`),
  like: (id: string) => api.post(`/reviews/${id}/like`),
};

// ── Ratings API ────────────────────────────────────────────
export const ratingsApi = {
  rate: (movieId: string, score: number) => api.post('/ratings', { movieId, score }),
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
  }) => api.post('/watch-history', data),

  /** Get paginated history list */
  getHistory: (page = 1, limit = 20) =>
    api.get(`/watch-history?page=${page}&limit=${limit}`),

  /** Get resume data for a specific movie (returns all episodes) */
  getResume: (movieId: string) => api.get(`/watch-history/resume/${movieId}`),

  /** Delete a single history entry */
  deleteEntry: (id: string) => api.delete(`/watch-history/${id}`),

  /** Clear all history */
  clearAll: () => api.delete('/watch-history'),
};

