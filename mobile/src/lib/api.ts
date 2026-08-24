import axios from 'axios';
import { API_BASE_URL } from './config';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.warn('[API Error]', error?.response?.status, error?.config?.url);
    return Promise.reject(error);
  }
);

// ============================================================
// Types (matching web app structure)
// ============================================================

export interface Movie {
  _id?: string;
  name: string;
  slug: string;
  origin_name?: string;
  original_name?: string;
  thumb_url?: string;
  poster_url?: string;
  year?: number;
  episode_current?: string;
  current_episode?: string;
  episode_total?: string;
  status?: string;
  type?: string;
  lang?: string;
  language?: string;
  quality?: string;
  time?: string;
  category?: Array<{ id?: string; name: string; slug: string }>;
  country?: Array<{ id?: string; name: string; slug: string }>;
  casts?: string;
  actor?: string[];
  director?: string | string[];
  description?: string;
  content?: string;
  view?: number;
  rating?: number;
  tmdb?: { vote_average?: number; vote_count?: number };
  _source?: string;
}

export interface Episode {
  name: string;
  slug?: string;
  filename?: string;
  link_embed?: string;
  link_m3u8?: string;
  embed?: string;
}

export interface EpisodeServer {
  server_name: string;
  server_data: Episode[];
}

export interface MovieDetail extends Movie {
  episodes?: EpisodeServer[];
}

export interface ApiListResponse {
  status?: string | boolean;
  data?: {
    items?: Movie[];
    movies?: Movie[];
    data?: Movie[];
    pagination?: { totalItems?: number; totalPages?: number; currentPage?: number };
  };
  items?: Movie[];
  movies?: Movie[];
}

export interface ApiDetailResponse {
  status?: string | boolean;
  data?: {
    item?: MovieDetail;
    movie?: MovieDetail;
  };
  movie?: MovieDetail;
}

// ============================================================
// API Functions
// ============================================================

function normalizeMovies(data: ApiListResponse): Movie[] {
  const raw =
    data?.data?.items ||
    data?.data?.movies ||
    data?.data?.data ||
    data?.items ||
    data?.movies ||
    [];
  return raw as Movie[];
}

export async function fetchLatestMovies(source: 'kkphim' | 'ophim' | 'nguonc' = 'kkphim', page = 1): Promise<Movie[]> {
  const res = await apiClient.get(`/api/${source}/films/phim-moi-cap-nhat?page=${page}`);
  return normalizeMovies(res.data);
}

export async function fetchMoviesByType(
  type: string,
  source: 'kkphim' | 'ophim' = 'kkphim',
  page = 1
): Promise<Movie[]> {
  const res = await apiClient.get(`/api/${source}/films/${type}?page=${page}`);
  return normalizeMovies(res.data);
}

export async function fetchMovieDetail(slug: string, source: 'kkphim' | 'ophim' | 'nguonc' = 'kkphim'): Promise<MovieDetail | null> {
  const res = await apiClient.get(`/api/${source}/film/${slug}`);
  const data: ApiDetailResponse = res.data;
  return (
    data?.data?.item ||
    data?.data?.movie ||
    data?.movie ||
    null
  );
}

export async function searchMovies(
  query: string,
  source: 'kkphim' | 'ophim' = 'kkphim',
  page = 1
): Promise<Movie[]> {
  const res = await apiClient.get(
    `/api/${source}/films/search?keyword=${encodeURIComponent(query)}&page=${page}`
  );
  return normalizeMovies(res.data);
}

// Helper to get best poster URL
export function getPosterUrl(movie: Movie): string | undefined {
  return movie.poster_url || movie.thumb_url || undefined;
}

export function getThumbUrl(movie: Movie): string | undefined {
  return movie.thumb_url || movie.poster_url || undefined;
}

export function getEpisodeCurrent(movie: Movie): string {
  return movie.episode_current || movie.current_episode || 'Full';
}
