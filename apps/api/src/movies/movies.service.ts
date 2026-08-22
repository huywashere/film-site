import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisCacheService } from "../redis/redis.service";
import { PrismaService } from "../prisma/prisma.service";
import axios, { AxiosInstance } from "axios";
import { RecordMovieViewDto } from "./movies.dto";

@Injectable()
export class MoviesService {
  private readonly logger = new Logger(MoviesService.name);
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly cache: RedisCacheService,
    private readonly prisma: PrismaService,
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
    return this.cache.getOrSet<T>(
      `movies:${key}`,
      async () => {
        try {
          const { data } = await this.http.get<T>(url);
          return data;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`KKPhim API error for ${url}: ${msg}`);
          throw err;
        }
      },
      ttlSeconds,
    );
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

  /**
   * Real popularity signal, calculated from completed playback events over
   * the last seven days.  This intentionally stays separate from upstream
   * "latest" feeds so the ranked row is not just another new-release row.
   *
   * Cached for 5 minutes — expensive groupBy + JOIN query.
   */
  async getTrending(limit = 20) {
    const safeLimit = Math.min(Math.max(limit || 20, 1), 40);
    const cacheKey = `movies:trending:${safeLimit}`;

    // Check cache first — this query is expensive
    const cached = await this.cache.getJson<object[]>(cacheKey);
    if (cached !== null) return cached;

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const ranked = await this.prisma.viewLog.groupBy({
      by: ["movieId"],
      where: { viewedAt: { gte: since } },
      _count: { movieId: true },
      orderBy: { _count: { movieId: "desc" } },
      take: safeLimit,
    });

    if (!ranked.length) {
      await this.cache.setJson(cacheKey, [], 300);
      return [];
    }

    const movieIds = ranked.map((item) => item.movieId);
    const movies = await this.prisma.movie.findMany({
      where: { id: { in: movieIds }, isHidden: false },
    });
    const movieById = new Map(movies.map((movie) => [movie.id, movie]));

    const result = ranked.flatMap((item) => {
      const movie = movieById.get(item.movieId);
      if (!movie) return [];
      return [
        {
          _id: movie.id,
          slug: movie.id,
          name: movie.title,
          origin_name: movie.originName || movie.titleEn || undefined,
          poster_url: movie.posterUrl || undefined,
          thumb_url: movie.thumbUrl || undefined,
          year: movie.year || undefined,
          type: movie.type,
          episode_current: movie.totalEpisodes
            ? `Tập ${movie.totalEpisodes}`
            : "Full",
          quality: movie.quality || undefined,
          lang: movie.language || undefined,
          content: movie.description || undefined,
          views: item._count.movieId,
        },
      ];
    });

    // Cache for 5 minutes — trending doesn't need to be real-time
    await this.cache.setJson(cacheKey, result, 300);
    return result;
  }

  async recordView(movieId: string, data: RecordMovieViewDto) {
    await this.prisma.movie.upsert({
      where: { id: movieId },
      create: {
        id: movieId,
        title: data.title,
        originName: data.originName,
        posterUrl: data.posterUrl,
        year: data.year,
        type: data.type || "unknown",
      },
      update: {
        title: data.title,
        originName: data.originName,
        posterUrl: data.posterUrl,
        year: data.year,
        type: data.type,
      },
    });
    await this.prisma.viewLog.create({
      data: {
        movieId,
        episode: data.episode,
        serverName: data.serverName,
      },
    });
    if (data.provider && data.serverName) {
      await this.prisma.moviePlaybackSource.upsert({
        where: {
          movieId_provider_providerSlug_episodeKey_serverName: {
            movieId,
            provider: data.provider,
            providerSlug: movieId,
            episodeKey: data.episode || "full",
            serverName: data.serverName,
          },
        },
        create: {
          movieId,
          provider: data.provider,
          providerSlug: movieId,
          episodeKey: data.episode || "full",
          serverName: data.serverName,
          healthStatus: "operational",
          lastCheckedAt: new Date(),
        },
        update: {
          healthStatus: "operational",
          lastCheckedAt: new Date(),
          lastError: null,
        },
      });
    }
    await this.cache.del("movies:trending:20");
    return { recorded: true };
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
    const normalized = (keyword || "").trim().toLowerCase();
    if (!normalized) {
      return {
        status: "success",
        msg: "OK",
        data: {
          items: [],
          params: {
            pagination: {
              totalItems: 0,
              totalItemsPerPage: limit,
              currentPage: page,
              pageRanges: 5,
            },
          },
        },
      };
    }
    return this.cachedGet(
      `search:${normalized}:${page}:${limit}`,
      `/v1/api/tim-kiem?keyword=${encodeURIComponent(normalized)}&page=${page}&limit=${limit}`,
      300, // Cache 5 minutes in Redis (sub-millisecond instant responses under DDoS)
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
