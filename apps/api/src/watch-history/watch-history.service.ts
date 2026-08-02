import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface UpsertHistoryDto {
  movieId: string;
  episode?: string;
  progress: number;
  duration: number;
  movieTitle: string;
  movieThumb?: string;
  serverName?: string;
}

@Injectable()
export class WatchHistoryService {
  constructor(private prisma: PrismaService) {}

  /** Upsert progress for a (userId, movieId, episode) triple */
  async upsert(userId: string, dto: UpsertHistoryDto) {
    // Ensure movie row exists (upsert-safe)
    await this.prisma.movie.upsert({
      where: { id: dto.movieId },
      create: {
        id: dto.movieId,
        title: dto.movieTitle,
        thumbUrl: dto.movieThumb,
        type: "unknown",
      },
      update: {
        title: dto.movieTitle,
        thumbUrl: dto.movieThumb,
      },
    });

    return this.prisma.watchHistory.upsert({
      where: {
        userId_movieId_episode: {
          userId,
          movieId: dto.movieId,
          episode: dto.episode ?? null,
        },
      },
      create: {
        userId,
        movieId: dto.movieId,
        movieTitle: dto.movieTitle,
        movieThumb: dto.movieThumb,
        episode: dto.episode,
        progress: dto.progress,
        duration: dto.duration,
        serverName: dto.serverName,
        watchedAt: new Date(),
      },
      update: {
        progress: dto.progress,
        duration: dto.duration,
        serverName: dto.serverName,
        watchedAt: new Date(),
      },
    });
  }

  /** Paginated history list, newest first */
  async getHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.watchHistory.findMany({
        where: { userId },
        orderBy: { watchedAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.watchHistory.count({ where: { userId } }),
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
      items: items.map(({ watchedAt, ...item }) => ({
        ...item,
        updatedAt: watchedAt,
      })),
      total,
      page,
      pages: totalPages,
      totalPages,
      limit,
    };
  }

  /** Get all history entries for a specific movie (to resume from correct episode) */
  async getResumeData(userId: string, movieId: string) {
    return this.prisma.watchHistory.findMany({
      where: { userId, movieId },
      orderBy: { watchedAt: "desc" },
    });
  }

  /** Delete a single history entry */
  async deleteEntry(userId: string, id: string) {
    return this.prisma.watchHistory.deleteMany({
      where: { id, userId },
    });
  }

  /** Clear all history for the user */
  async clearAll(userId: string) {
    return this.prisma.watchHistory.deleteMany({ where: { userId } });
  }
}
