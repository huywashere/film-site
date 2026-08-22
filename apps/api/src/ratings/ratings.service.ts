import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisCacheService } from "../redis/redis.service";

@Injectable()
export class RatingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  async rate(userId: string, movieId: string, score: number) {
    await this.prisma.movie.upsert({
      where: { id: movieId },
      create: { id: movieId, title: movieId, type: "unknown" },
      update: {},
    });

    const result = await this.prisma.rating.upsert({
      where: { userId_movieId: { userId, movieId } },
      create: { userId, movieId, score },
      update: { score },
    });

    await this.cache.del(`ratings:avg:${movieId}`);
    return result;
  }

  async getAverage(movieId: string) {
    const cacheKey = `ratings:avg:${movieId}`;
    const cached = await this.cache.getJson<{ average: number; count: number }>(cacheKey);
    if (cached !== null) return cached;

    const result = await this.prisma.rating.aggregate({
      where: { movieId },
      _avg: { score: true },
      _count: true,
    });
    const payload = { average: result._avg.score || 0, count: result._count };
    await this.cache.setJson(cacheKey, payload, 300);
    return payload;
  }

  async getUserRating(userId: string, movieId: string) {
    return this.prisma.rating.findUnique({
      where: { userId_movieId: { userId, movieId } },
    });
  }
}
