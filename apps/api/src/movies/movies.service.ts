import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisCacheService } from "../redis/redis.service";
import axios, { AxiosInstance } from "axios";

@Injectable()
export class MoviesService {
  private readonly logger = new Logger(MoviesService.name);
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly cache: RedisCacheService,
  ) {
    this.baseUrl = config.get("KKPHIM_BASE_URL") || "https://phimapi.com";
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: { "Content-Type": "application/json" },
    });
  }

  /**
   * Generic cached GET helper.
   * Checks Redis (or in-memory fallback) before hitting KKPhim upstream.
   */
  private async cachedGet<T>(
    key: string,
    url: string,
    ttlSeconds = 300,
  ): Promise<T> {
    // 1. Check cache
    const cached = await this.cache.getJson<T>(`movies:${key}`);
    if (cached !== null) {
      return cached;
    }

    // 2. Fetch from upstream
    try {
      const { data } = await this.http.get<T>(url);
      // 3. Persist to cache
      await this.cache.setJson(`movies:${key}`, data, ttlSeconds);
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`KKPhim API error for ${url}: ${msg}`);
      throw err;
    }
  }

  // ── Danh sách phim ──────────────────────────────────────────────

  // GET /danh-sach/phim-moi-cap-nhat?page=1
  async getLatest(page = 1) {
    return this.cachedGet(
      `latest:${page}`,
      `/danh-sach/phim-moi-cap-nhat?page=${page}`,
      120,
    );
  }

  // GET /v1/api/danh-sach/phim-bo?page=1
  async getSeries(page = 1, limit = 24) {
    return this.cachedGet(
      `series:${page}:${limit}`,
      `/v1/api/danh-sach/phim-bo?page=${page}&limit=${limit}`,
      300,
    );
  }

  // GET /v1/api/danh-sach/phim-le?page=1
  async getSingle(page = 1, limit = 24) {
    return this.cachedGet(
      `single:${page}:${limit}`,
      `/v1/api/danh-sach/phim-le?page=${page}&limit=${limit}`,
      300,
    );
  }

  // GET /v1/api/danh-sach/hoat-hinh?page=1
  async getAnime(page = 1, limit = 24) {
    return this.cachedGet(
      `anime:${page}:${limit}`,
      `/v1/api/danh-sach/hoat-hinh?page=${page}&limit=${limit}`,
      300,
    );
  }

  // GET /v1/api/danh-sach/tv-shows?page=1
  async getTvShows(page = 1, limit = 24) {
    return this.cachedGet(
      `tvshows:${page}:${limit}`,
      `/v1/api/danh-sach/tv-shows?page=${page}&limit=${limit}`,
      300,
    );
  }

  // GET /v1/api/danh-sach (with filters)
  async getFiltered(params: {
    type?: string;
    status?: string;
    category?: string;
    country?: string;
    year?: number;
    page?: number;
    limit?: number;
    sort_field?: string;
    sort_type?: string;
  }) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
    const queryString = query.toString();
    return this.cachedGet(
      `filtered:${queryString}`,
      `/v1/api/danh-sach?${queryString}`,
      300,
    );
  }

  // ── Chi tiết phim ───────────────────────────────────────────────

  // GET /phim/:slug
  async getDetail(slug: string) {
    return this.cachedGet(`detail:${slug}`, `/phim/${slug}`, 600);
  }

  // GET /v1/api/phim/:slug
  async getDetailV1(slug: string) {
    return this.cachedGet(`detailv1:${slug}`, `/v1/api/phim/${slug}`, 600);
  }

  // GET /phim/id/:id
  async getById(id: string) {
    return this.cachedGet(`byid:${id}`, `/phim/id/${id}`, 600);
  }

  // GET /phim/tmdb?tmdb_id=xxx&type=tv&season=1
  async getByTmdb(tmdbId: string, type: "tv" | "movie", season?: number) {
    const seasonParam = season ? `&season=${season}` : "";
    return this.cachedGet(
      `tmdb:${tmdbId}:${type}:${season || "none"}`,
      `/phim/tmdb?tmdb_id=${tmdbId}&type=${type}${seasonParam}`,
      600,
    );
  }

  // GET /phim/imdb?imdb_id=xxx
  async getByImdb(imdbId: string) {
    return this.cachedGet(
      `imdb:${imdbId}`,
      `/phim/imdb?imdb_id=${imdbId}`,
      600,
    );
  }

  // ── Thông tin bổ sung ───────────────────────────────────────────

  // GET /phim/images?tmdb_type=tv&tmdb_id=xxx
  async getImages(tmdbType: "tv" | "movie", tmdbId: string) {
    return this.cachedGet(
      `images:${tmdbType}:${tmdbId}`,
      `/phim/images?tmdb_type=${tmdbType}&tmdb_id=${tmdbId}`,
      3600,
    );
  }

  // GET /phim/cast?tmdb_type=tv&tmdb_id=xxx
  async getCast(tmdbType: "tv" | "movie", tmdbId: string) {
    return this.cachedGet(
      `cast:${tmdbType}:${tmdbId}`,
      `/phim/cast?tmdb_type=${tmdbType}&tmdb_id=${tmdbId}`,
      3600,
    );
  }

  // GET /phim/keywords?tmdb_type=tv&tmdb_id=xxx
  async getKeywords(tmdbType: "tv" | "movie", tmdbId: string) {
    return this.cachedGet(
      `keywords:${tmdbType}:${tmdbId}`,
      `/phim/keywords?tmdb_type=${tmdbType}&tmdb_id=${tmdbId}`,
      3600,
    );
  }

  // ── Tìm kiếm & Lọc ──────────────────────────────────────────────

  // GET /v1/api/tim-kiem?keyword=&page=1
  async search(keyword: string, page = 1, limit = 24) {
    return this.cachedGet(
      `search:${keyword}:${page}:${limit}`,
      `/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}&limit=${limit}`,
      60,
    );
  }

  // ── Thể loại ────────────────────────────────────────────────────

  // GET /the-loai (genres list)
  async getGenres() {
    return this.cachedGet("genres", "/the-loai", 3600);
  }

  // GET /v1/api/the-loai/:slug?page=1
  async getByGenre(slug: string, page = 1, limit = 24) {
    return this.cachedGet(
      `genre:${slug}:${page}:${limit}`,
      `/v1/api/the-loai/${slug}?page=${page}&limit=${limit}`,
      300,
    );
  }

  // ── Quốc gia ────────────────────────────────────────────────────

  // GET /quoc-gia (countries list)
  async getCountries() {
    return this.cachedGet("countries", "/quoc-gia", 3600);
  }

  // GET /v1/api/quoc-gia/:slug?page=1
  async getByCountry(slug: string, page = 1, limit = 24) {
    return this.cachedGet(
      `country:${slug}:${page}:${limit}`,
      `/v1/api/quoc-gia/${slug}?page=${page}&limit=${limit}`,
      300,
    );
  }

  // ── Năm phát hành ───────────────────────────────────────────────

  // GET /nam-phat-hanh (years list)
  async getYears() {
    return this.cachedGet("years", "/nam-phat-hanh", 3600);
  }

  // GET /nam-phat-hanh/:year?page=1
  async getByYear(year: number, page = 1, limit = 24) {
    return this.cachedGet(
      `year:${year}:${page}:${limit}`,
      `/nam-phat-hanh/${year}?page=${page}&limit=${limit}`,
      300,
    );
  }
}
