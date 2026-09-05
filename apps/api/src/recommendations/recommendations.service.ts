import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../redis/redis.service';

const PYTHON_ENGINE_URL = process.env.RECOMMENDATION_ENGINE_URL || 'http://127.0.0.1:8000';
const TOP10_CACHE_PREFIX = 'recommendations:top10:';
const SIMILAR_CACHE_PREFIX = 'recommendations:similar:';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  /**
   * Get AI-curated Top 10 trending & recommended movies.
   * Calls Python engine -> caches in Redis -> falls back to Prisma DB if engine is unavailable.
   */
  async getTop10(userId?: string) {
    const cacheKey = `${TOP10_CACHE_PREFIX}${userId || 'anonymous'}`;
    const cached = await this.cache.getJson<any[]>(cacheKey).catch(() => null);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return { items: cached, source: 'cache' };
    }

    // Attempt to query Python Recommendation Engine
    try {
      const url = `${PYTHON_ENGINE_URL}/recommendations/top10?limit=10${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data?.items) && data.items.length > 0) {
          await this.cache.setJson(cacheKey, data.items, 300).catch(() => undefined);
          return { items: data.items, source: 'python-ai-engine' };
        }
      }
    } catch (err: any) {
      this.logger.debug(`Python recommendation engine unreachable (${err?.message}), using DB fallback`);
    }

    // Graceful DB Fallback
    const fallbackMovies = await this.prisma.movie.findMany({
      where: { isHidden: false },
      orderBy: [{ updatedAt: 'desc' }],
      take: 10,
      select: {
        id: true,
        title: true,
        originName: true,
        thumbUrl: true,
        posterUrl: true,
        year: true,
        type: true,
      },
    });

    const items = fallbackMovies.map((m, idx) => ({
      _id: m.id,
      slug: m.id,
      name: m.title,
      origin_name: m.originName || m.title,
      thumb_url: m.thumbUrl || m.posterUrl || '',
      poster_url: m.posterUrl || m.thumbUrl || '',
      year: m.year || 2024,
      type: m.type || 'single',
      quality: 'HD',
      lang: 'Vietsub',
      view: 0,
      rating: 8.5,
      rank: idx + 1,
    }));

    return { items, source: 'db-fallback' };
  }

  /**
   * Get similar / recommended movies for a given movie slug.
   * Calls Python engine -> caches in Redis -> falls back to genre overlap query in Prisma DB.
   */
  async getSimilar(slug: string, limit = 12) {
    const cacheKey = `${SIMILAR_CACHE_PREFIX}${slug}:${limit}`;
    const cached = await this.cache.getJson<any[]>(cacheKey).catch(() => null);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return { items: cached, source: 'cache' };
    }

    // Attempt to query Python Recommendation Engine
    try {
      const url = `${PYTHON_ENGINE_URL}/recommendations/similar/${encodeURIComponent(slug)}?limit=${limit}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data?.items) && data.items.length > 0) {
          await this.cache.setJson(cacheKey, data.items, 600).catch(() => undefined);
          return { items: data.items, source: 'python-ai-engine' };
        }
      }
    } catch (err: any) {
      this.logger.debug(`Python recommendation engine unreachable (${err?.message}), using DB fallback`);
    }

    // Graceful DB Fallback: find target movie's genres, then find movies with same genre
    const target = await this.prisma.movie.findUnique({
      where: { id: slug },
      select: { genres: true, countries: true, type: true },
    });

    const fallbackMovies = await this.prisma.movie.findMany({
      where: {
        id: { not: slug },
        isHidden: false,
        ...(target?.genres?.length
          ? { genres: { hasSome: target.genres } }
          : target?.type
            ? { type: target.type }
            : {}),
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        title: true,
        originName: true,
        thumbUrl: true,
        posterUrl: true,
        year: true,
        type: true,
      },
    });

    const items = fallbackMovies.map((m) => ({
      _id: m.id,
      slug: m.id,
      name: m.title,
      origin_name: m.originName || m.title,
      thumb_url: m.thumbUrl || m.posterUrl || '',
      poster_url: m.posterUrl || m.thumbUrl || '',
      year: m.year || 2024,
      type: m.type || 'single',
      quality: 'HD',
      lang: 'Vietsub',
      view: 0,
      rating: 8.5,
    }));

    return { items, source: 'db-fallback' };
  }
}
