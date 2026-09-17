import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import axios, { AxiosInstance } from 'axios';
import { RecordMovieViewDto } from './movies.dto';
import { SearchIndexerService } from './search-indexer.service';

@Injectable()
export class MoviesService {
  private readonly logger = new Logger(MoviesService.name);
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly cache: RedisCacheService,
    private readonly prisma: PrismaService,
    private readonly searchIndexer: SearchIndexerService,
  ) {
    this.baseUrl = config.get('KKPHIM_BASE_URL') || 'https://phimapi.com';
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Generic cached GET helper.
   * Checks Redis (or in-memory fallback) before hitting KKPhim upstream.
   */
  private async cachedGet<T>(key: string, url: string, ttlSeconds = 300): Promise<T> {
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
    return this.cachedGet(`latest:${page}`, `/danh-sach/phim-moi-cap-nhat?page=${page}`, 120);
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
      by: ['movieId'],
      where: { viewedAt: { gte: since } },
      _count: { movieId: true },
      orderBy: { _count: { movieId: 'desc' } },
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
          episode_current: movie.totalEpisodes ? `Tập ${movie.totalEpisodes}` : 'Full',
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

  async recordView(movieId: string, data: RecordMovieViewDto, userId: string) {
    const lockKey = `movie_view:${userId}:${movieId}`;
    const shouldCountView = await this.cache.acquireLock(lockKey, 6 * 60 * 60 * 1000);
    if (!shouldCountView) return { recorded: false };

    try {
      await this.prisma.movie.upsert({
        where: { id: movieId },
        create: {
          id: movieId,
          title: data.title,
          originName: data.originName,
          posterUrl: data.posterUrl,
          year: data.year,
          type: data.type || 'unknown',
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
              episodeKey: data.episode || 'full',
              serverName: data.serverName,
            },
          },
          create: {
            movieId,
            provider: data.provider,
            providerSlug: movieId,
            episodeKey: data.episode || 'full',
            serverName: data.serverName,
            healthStatus: 'operational',
            lastCheckedAt: new Date(),
          },
          update: {
            healthStatus: 'operational',
            lastCheckedAt: new Date(),
            lastError: null,
          },
        });
      }
      await this.cache.del('movies:trending:20');
      return { recorded: true };
    } catch (error) {
      await this.cache.releaseLock(lockKey).catch(() => false);
      throw error;
    }
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
    return this.cachedGet(`filtered:${queryString}`, `/v1/api/danh-sach?${queryString}`, 300);
  }

  // ── Chi tiết phim ───────────────────────────────────────────────

  private formatCustomServers(playbackSources: any[]): any[] {
    if (!playbackSources || !playbackSources.length) return [];

    const serverMap = new Map<string, any[]>();
    for (const source of playbackSources) {
      const serverKey = source.serverName || 'FlexPhim VIP';
      if (!serverMap.has(serverKey)) {
        serverMap.set(serverKey, []);
      }
      serverMap.get(serverKey)!.push({
        name: source.episodeName || (source.episodeKey === 'full' ? 'Full' : `Tập ${source.episodeKey}`),
        slug: source.episodeKey,
        filename: source.episodeName || source.episodeKey,
        link_embed: '',
        link_m3u8: source.streamUrl || '',
        subtitles: (() => {
          if (!source.subtitleUrls) return [];
          let raw = source.subtitleUrls;
          if (typeof raw === 'string') {
            try {
              raw = JSON.parse(raw);
            } catch {
              return [];
            }
          }
          if (Array.isArray(raw)) {
            return raw
              .map((item: any) => ({
                label: item.label || item.name || item.lang || 'Phụ đề',
                url: item.url || item.link || '',
                language: item.language || item.lang || 'vi',
                default: Boolean(item.default),
              }))
              .filter((item: any) => Boolean(item.url));
          }
          if (typeof raw === 'object' && raw !== null) {
            return Object.entries(raw)
              .map(([lang, url], idx) => ({
                label: lang.toUpperCase(),
                url: String(url),
                language: lang.toLowerCase(),
                default: idx === 0,
              }))
              .filter((item: any) => Boolean(item.url));
          }
          return [];
        })(),
        intro:
          source.introStart != null || source.introEnd != null
            ? { start: source.introStart || 0, end: source.introEnd || 0 }
            : undefined,
        outro: source.outroStart != null ? { start: source.outroStart } : undefined,
      });
    }

    return Array.from(serverMap.entries()).map(([serverName, serverData]) => ({
      server_name: serverName,
      server_data: serverData.sort((a, b) => {
        const numA = parseInt(a.slug, 10);
        const numB = parseInt(b.slug, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.slug.localeCompare(b.slug);
      }),
    }));
  }

  // GET /phim/:slug
  async getDetail(slug: string) {
    const dbMovie = await this.prisma.movie
      .findUnique({
        where: { id: slug },
        include: {
          playbackSources: {
            orderBy: [{ priority: 'asc' }, { episodeKey: 'asc' }],
          },
        },
      })
      .catch(() => null);

    const customServers = dbMovie?.playbackSources?.length
      ? this.formatCustomServers(dbMovie.playbackSources)
      : [];

    if (dbMovie && (dbMovie.sources?.includes('manual') || !dbMovie.sources?.length)) {
      return {
        status: true,
        msg: '',
        movie: {
          _id: dbMovie.id,
          id: dbMovie.id,
          name: dbMovie.title,
          slug: dbMovie.id,
          origin_name: dbMovie.originName || dbMovie.titleEn || '',
          content: dbMovie.description || '',
          type: dbMovie.type || 'single',
          status: dbMovie.status || 'completed',
          thumb_url: dbMovie.thumbUrl || dbMovie.posterUrl || '',
          poster_url: dbMovie.posterUrl || dbMovie.thumbUrl || '',
          year: dbMovie.year || new Date().getFullYear(),
          quality: dbMovie.quality || 'FHD',
          lang: dbMovie.language || 'Vietsub',
          time: dbMovie.runtime ? `${dbMovie.runtime} phút` : '',
          trailer_url: dbMovie.trailerUrl || '',
          category: (dbMovie.genres || []).map((g) => ({ id: g, name: g, slug: g })),
          country: (dbMovie.countries || []).map((c) => ({ id: c, name: c, slug: c })),
          actor: dbMovie.actors || [],
          director: dbMovie.directors || [],
          _source: 'manual',
        },
        episodes: customServers,
      };
    }

    try {
      const upstream = await this.cachedGet<any>(`detail:${slug}`, `/phim/${slug}`, 600);
      if (customServers.length && upstream && upstream.episodes) {
        return {
          ...upstream,
          episodes: [...customServers, ...upstream.episodes],
        };
      }
      return upstream;
    } catch (err) {
      if (dbMovie) {
        return {
          status: true,
          msg: '',
          movie: {
            _id: dbMovie.id,
            id: dbMovie.id,
            name: dbMovie.title,
            slug: dbMovie.id,
            origin_name: dbMovie.originName || dbMovie.titleEn || '',
            content: dbMovie.description || '',
            type: dbMovie.type || 'single',
            status: dbMovie.status || 'completed',
            thumb_url: dbMovie.thumbUrl || dbMovie.posterUrl || '',
            poster_url: dbMovie.posterUrl || dbMovie.thumbUrl || '',
            year: dbMovie.year || new Date().getFullYear(),
            quality: dbMovie.quality || 'FHD',
            lang: dbMovie.language || 'Vietsub',
            time: dbMovie.runtime ? `${dbMovie.runtime} phút` : '',
            trailer_url: dbMovie.trailerUrl || '',
            category: (dbMovie.genres || []).map((g) => ({ id: g, name: g, slug: g })),
            country: (dbMovie.countries || []).map((c) => ({ id: c, name: c, slug: c })),
            actor: dbMovie.actors || [],
            director: dbMovie.directors || [],
            _source: 'manual',
          },
          episodes: customServers,
        };
      }
      throw err;
    }
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
  async getByTmdb(tmdbId: string, type: 'tv' | 'movie', season?: number) {
    const seasonParam = season ? `&season=${season}` : '';
    return this.cachedGet(
      `tmdb:${tmdbId}:${type}:${season || 'none'}`,
      `/phim/tmdb?tmdb_id=${tmdbId}&type=${type}${seasonParam}`,
      600,
    );
  }

  // GET /phim/imdb?imdb_id=xxx
  async getByImdb(imdbId: string) {
    return this.cachedGet(`imdb:${imdbId}`, `/phim/imdb?imdb_id=${imdbId}`, 600);
  }

  // ── Thông tin bổ sung ───────────────────────────────────────────

  // GET /phim/images?tmdb_type=tv&tmdb_id=xxx
  async getImages(tmdbType: 'tv' | 'movie', tmdbId: string) {
    return this.cachedGet(
      `images:${tmdbType}:${tmdbId}`,
      `/phim/images?tmdb_type=${tmdbType}&tmdb_id=${tmdbId}`,
      3600,
    );
  }

  // GET /phim/cast?tmdb_type=tv&tmdb_id=xxx
  async getCast(tmdbType: 'tv' | 'movie', tmdbId: string) {
    return this.cachedGet(
      `cast:${tmdbType}:${tmdbId}`,
      `/phim/cast?tmdb_type=${tmdbType}&tmdb_id=${tmdbId}`,
      3600,
    );
  }

  // GET /phim/keywords?tmdb_type=tv&tmdb_id=xxx
  async getKeywords(tmdbType: 'tv' | 'movie', tmdbId: string) {
    return this.cachedGet(
      `keywords:${tmdbType}:${tmdbId}`,
      `/phim/keywords?tmdb_type=${tmdbType}&tmdb_id=${tmdbId}`,
      3600,
    );
  }

  // ── Tìm kiếm & Lọc ──────────────────────────────────────────────

  // GET /v1/api/tim-kiem?keyword=&page=1
  async search(keyword: string, page = 1, limit = 24) {
    const normalized = (keyword || '')
      .replace(/[\\/()[\]{}*+?^$|#@~`"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    if (!normalized) {
      return {
        status: 'success',
        msg: 'OK',
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

    // ── 1. Fetch từ KKPhim (kèm Redis Cache 5 phút siêu tốc, đầy đủ metadata) ────────
    const result = (await this.cachedGet(
      `search:${normalized}:${page}:${limit}`,
      `/v1/api/tim-kiem?keyword=${encodeURIComponent(normalized)}&page=${page}&limit=${limit}`,
      300, // Cache 5 phút trong Redis
    )) as any;

    // ── 2. Background index kết quả KKPhim vào RediSearch để làm giàu full-text index ───
    const items: any[] = result?.data?.items || result?.items || [];
    if (items.length > 0) {
      setImmediate(async () => {
        for (const film of items.slice(0, 24)) {
          if (film?.slug) {
            await this.searchIndexer.indexFilm(film).catch(() => null);
          }
        }
      });
    }

    return result;
  }

  // ── Thể loại ────────────────────────────────────────────────────

  // GET /the-loai (genres list)
  async getGenres() {
    return this.cachedGet('genres', '/the-loai', 3600);
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
    return this.cachedGet('countries', '/quoc-gia', 3600);
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
    return this.cachedGet('years', '/nam-phat-hanh', 3600);
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
