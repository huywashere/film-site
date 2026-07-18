import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WatchlistService {
  constructor(private prisma: PrismaService) {}

  async getWatchlist(userId: string, page = 1, limit = 24) {
    const [items, total] = await Promise.all([
      this.prisma.watchlist.findMany({
        where: { userId },
        include: { movie: true },
        orderBy: { addedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.watchlist.count({ where: { userId } }),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  async add(userId: string, movieId: string, movieData?: any) {
    // Upsert movie first
    if (movieData) {
      await this.prisma.movie.upsert({
        where: { id: movieId },
        create: {
          id: movieId,
          title: movieData.title || movieId,
          titleEn: movieData.titleEn,
          posterUrl: movieData.posterUrl,
          thumbUrl: movieData.thumbUrl,
          year: movieData.year,
          type: movieData.type || 'unknown',
        },
        update: {
          title: movieData.title,
          posterUrl: movieData.posterUrl,
          thumbUrl: movieData.thumbUrl,
        },
      });
    } else {
      await this.prisma.movie.upsert({
        where: { id: movieId },
        create: { id: movieId, title: movieId, type: 'unknown' },
        update: {},
      });
    }

    return this.prisma.watchlist.upsert({
      where: { userId_movieId: { userId, movieId } },
      create: { userId, movieId },
      update: {},
    });
  }

  async remove(userId: string, movieId: string) {
    return this.prisma.watchlist.deleteMany({
      where: { userId, movieId },
    });
  }

  async isInWatchlist(userId: string, movieId: string) {
    const item = await this.prisma.watchlist.findUnique({
      where: { userId_movieId: { userId, movieId } },
    });
    return { inWatchlist: !!item };
  }
}
