import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            watchlist: true,
            reviews: true,
            followers: true,
            following: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException("User không tồn tại");
    return user;
  }

  async updateMe(
    userId: string,
    dto: {
      username?: string;
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
    },
  ) {
    if (dto.username) {
      const normalizedUsername = dto.username.trim().toLowerCase();
      // Check if another user has this username
      const existing = await this.prisma.user.findFirst({
        where: {
          username: { equals: normalizedUsername, mode: "insensitive" },
          NOT: { id: userId },
        },
      });
      if (existing) {
        throw new Error("Tên người dùng (username) này đã có người sử dụng");
      }
      dto.username = normalizedUsername;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
      },
    });
  }

  async getRecentActivity(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException("User không tồn tại");

    return this.prisma.review.findMany({
      where: { userId: user.id },
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { movie: true },
    });
  }

  // ── WATCH HISTORY SYNC ──────────────────────────────────────────
  async getWatchHistory(userId: string) {
    return this.prisma.watchHistory.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
  }

  async saveWatchHistory(
    userId: string,
    dto: {
      movieId: string;
      movieTitle: string;
      movieThumb?: string;
      episode?: string;
      progress: number;
      duration: number;
      serverName?: string;
    },
  ) {
    const episodeKey = dto.episode || "1";
    // Ensure Movie record exists in DB for foreign key relation
    await this.prisma.movie.upsert({
      where: { id: dto.movieId },
      update: { title: dto.movieTitle, thumbUrl: dto.movieThumb },
      create: {
        id: dto.movieId,
        title: dto.movieTitle,
        thumbUrl: dto.movieThumb,
        type: "single",
      },
    });

    return this.prisma.watchHistory.upsert({
      where: {
        userId_movieId_episode: {
          userId,
          movieId: dto.movieId,
          episode: episodeKey,
        },
      },
      update: {
        progress: dto.progress,
        duration: dto.duration,
        serverName: dto.serverName,
        watchedAt: new Date(),
      },
      create: {
        userId,
        movieId: dto.movieId,
        movieTitle: dto.movieTitle,
        movieThumb: dto.movieThumb,
        episode: episodeKey,
        progress: dto.progress,
        duration: dto.duration,
        serverName: dto.serverName,
      },
    });
  }

  // ── WATCHLIST PERSISTENCE ─────────────────────────────────────────
  async getWatchlist(userId: string) {
    return this.prisma.watchlist.findMany({
      where: { userId },
      include: { movie: true },
      orderBy: { addedAt: "desc" },
    });
  }

  async addToWatchlist(
    userId: string,
    dto: { movieId: string; title?: string; thumbUrl?: string },
  ) {
    // Upsert movie placeholder
    await this.prisma.movie.upsert({
      where: { id: dto.movieId },
      update: {},
      create: {
        id: dto.movieId,
        title: dto.title || dto.movieId,
        thumbUrl: dto.thumbUrl,
        type: "single",
      },
    });

    return this.prisma.watchlist.upsert({
      where: {
        userId_movieId: {
          userId,
          movieId: dto.movieId,
        },
      },
      update: {},
      create: {
        userId,
        movieId: dto.movieId,
      },
    });
  }

  async removeFromWatchlist(userId: string, movieId: string) {
    return this.prisma.watchlist.deleteMany({
      where: { userId, movieId },
    });
  }
}
