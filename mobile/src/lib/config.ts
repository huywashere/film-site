/**
 * API Configuration
 * The base URLs for the NetPhim API endpoints.
 * Mobile app calls the same proxy APIs as the web app.
 */

// Replace with your production domain
export const API_BASE_URL = 'https://netphim.vercel.app'; // TODO: update to production URL

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/';
export const TMDB_POSTER_W342 = `${TMDB_IMAGE_BASE}w342`;
export const TMDB_POSTER_W500 = `${TMDB_IMAGE_BASE}w500`;
export const TMDB_BACKDROP_W780 = `${TMDB_IMAGE_BASE}w780`;
export const TMDB_BACKDROP_W1280 = `${TMDB_IMAGE_BASE}w1280`;

// API endpoints (proxied through web app)
export const ENDPOINTS = {
  // KKPhim
  kkphim: {
    latest: `${API_BASE_URL}/api/kkphim/films/phim-moi-cap-nhat`,
    detail: (slug: string) => `${API_BASE_URL}/api/kkphim/film/${slug}`,
    search: (q: string, page = 1) =>
      `${API_BASE_URL}/api/kkphim/films/search?keyword=${encodeURIComponent(q)}&page=${page}`,
    byType: (type: string, page = 1) =>
      `${API_BASE_URL}/api/kkphim/films/${type}?page=${page}`,
  },
  // OPhim
  ophim: {
    latest: `${API_BASE_URL}/api/ophim/films/phim-moi-cap-nhat`,
    detail: (slug: string) => `${API_BASE_URL}/api/ophim/film/${slug}`,
    search: (q: string, page = 1) =>
      `${API_BASE_URL}/api/ophim/films/search?keyword=${encodeURIComponent(q)}&page=${page}`,
    byType: (type: string, page = 1) =>
      `${API_BASE_URL}/api/ophim/films/${type}?page=${page}`,
  },
  // NguonC
  nguonc: {
    latest: `${API_BASE_URL}/api/nguonc/films/phim-moi-cap-nhat`,
    detail: (slug: string) => `${API_BASE_URL}/api/nguonc/film/${slug}`,
    search: (q: string, page = 1) =>
      `${API_BASE_URL}/api/nguonc/films/search?keyword=${encodeURIComponent(q)}&page=${page}`,
  },
  // TMDB
  tmdb: {
    trending: `${API_BASE_URL}/api/tmdb/trending/movie/week`,
    popular: `${API_BASE_URL}/api/tmdb/movie/popular`,
  },
} as const;

export const QUERY_KEYS = {
  latestMovies: ['latest-movies'] as const,
  movieDetail: (slug: string) => ['movie-detail', slug] as const,
  search: (q: string) => ['search', q] as const,
  moviesByType: (type: string) => ['movies-by-type', type] as const,
} as const;
