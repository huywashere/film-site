import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisCacheService } from "../redis/redis.service";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  async getProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        nameColor: true,
        avatarFrameColor: true,
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
      nameColor?: string;
      avatarFrameColor?: string;
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
        nameColor: true,
        avatarFrameColor: true,
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
        movieTitle: dto.movieTitle,
        movieThumb: dto.movieThumb,
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

  async getWatchlistPage(userId: string, limit = 20, cursor?: string) {
    const items = await this.prisma.watchlist.findMany({
      where: { userId },
      include: { movie: true },
      orderBy: [{ addedAt: "desc" }, { id: "desc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
    });
    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;
    return {
      items: pageItems,
      hasMore,
      nextCursor: hasMore ? pageItems.at(-1)?.id ?? null : null,
    };
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

  // ── USER REAL WATCH STATS & LEADERBOARD ─────────────────────────────
  async getUserStats(usernameOrId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ id: usernameOrId }, { username: usernameOrId }],
      },
      select: { id: true, username: true, displayName: true },
    });

    if (!user) throw new NotFoundException("Người dùng không tồn tại");

    const [histories, watchlistCount, ratingAggregate] = await Promise.all([
      this.prisma.watchHistory.findMany({
        where: { userId: user.id },
        include: {
          movie: {
            select: { genres: true, countries: true, type: true },
          },
        },
      }),
      this.prisma.watchlist.count({ where: { userId: user.id } }),
      this.prisma.rating.aggregate({
        where: { userId: user.id },
        _avg: { score: true },
        _count: true,
      }),
    ]);

    // Calculate total watch seconds
    let totalWatchSeconds = 0;
    const genreCounts = new Map<string, number>();
    const countryCounts = new Map<string, number>();

    for (const h of histories) {
      // Progress in seconds or fallback to 45 min per episode
      const dur = h.progress && h.progress > 60 ? h.progress : (h.duration && h.duration > 60 ? h.duration * 0.8 : 45 * 60);
      totalWatchSeconds += dur;

      if (h.movie?.genres) {
        for (const g of h.movie.genres) {
          genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
        }
      }
      if (h.movie?.countries) {
        for (const c of h.movie.countries) {
          countryCounts.set(c, (countryCounts.get(c) || 0) + 1);
        }
      }
    }

    const totalHours = Math.round((totalWatchSeconds / 3600) * 10) / 10;
    const hoursInt = Math.floor(totalWatchSeconds / 3600);
    const minutesInt = Math.floor((totalWatchSeconds % 3600) / 60);

    // Rank / Title
    let rankTitle = "Mọt Phim Tập Sự";
    let rankBadge = "🌱";
    if (totalHours >= 100) {
      rankTitle = "Đại Sư Điện Ảnh";
      rankBadge = "👑";
    } else if (totalHours >= 50) {
      rankTitle = "Mọt Phim Thượng Thừa";
      rankBadge = "🏆";
    } else if (totalHours >= 20) {
      rankTitle = "Cinephile Chính Hiệu";
      rankBadge = "⭐";
    } else if (totalHours >= 5) {
      rankTitle = "Khán Giả Chuyên Cần";
      rankBadge = "🎬";
    }

    // Top genres calculation
    const totalGenreHits = [...genreCounts.values()].reduce((a, b) => a + b, 0) || 1;
    const topGenres = [...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => {
        const pct = Math.round((count / totalGenreHits) * 100);
        const genreHours = Math.max(Math.round((pct / 100) * totalHours), 1);
        return {
          name,
          count,
          percentage: pct,
          hoursText: `${pct}% • ${genreHours} giờ`,
        };
      });

    // Default fallback genres if user has not watched enough categorized movies
    const displayGenres = topGenres.length > 0 ? topGenres : [
      { name: "Phim Hàn Quốc", percentage: 40, hoursText: `40% • ${Math.max(hoursInt, 1)} giờ` },
      { name: "Phim Trung Quốc", percentage: 30, hoursText: `30% • ${Math.max(Math.round(hoursInt * 0.7), 1)} giờ` },
      { name: "Hành Động & Viễn Tưởng", percentage: 20, hoursText: `20% • ${Math.max(Math.round(hoursInt * 0.5), 1)} giờ` },
      { name: "Khác", percentage: 10, hoursText: `10% • 1 giờ` },
    ];

    return {
      userId: user.id,
      username: user.username,
      totalWatchSeconds,
      totalHours,
      watchTimeString: `${hoursInt}h ${minutesInt}m`,
      totalEpisodes: histories.length,
      watchlistCount,
      averageRating: ratingAggregate._avg.score ? Number(ratingAggregate._avg.score.toFixed(1)) : 9.8,
      ratingsCount: ratingAggregate._count,
      rankTitle,
      rankBadge,
      topGenres: displayGenres,
    };
  }

  async getLeaderboard() {
    const LEADERBOARD_CACHE_KEY = "leaderboard:top_watchers";
    const cached = await this.cache.getJson<any[]>(LEADERBOARD_CACHE_KEY);
    if (cached) return cached;

    // Fetch real users and aggregate
    const users = await this.prisma.user.findMany({
      where: { isBanned: false },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
        watchHistories: {
          select: { progress: true, duration: true },
        },
        _count: {
          select: { reviews: true, ratings: true, watchlist: true },
        },
      },
      take: 50,
    });

    const ranked = users
      .map((u) => {
        let totalSeconds = 0;
        for (const h of u.watchHistories) {
          const dur = h.progress && h.progress > 60 ? h.progress : (h.duration && h.duration > 60 ? h.duration * 0.8 : 45 * 60);
          totalSeconds += dur;
        }

        const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
        const episodesCount = u.watchHistories.length;
        const reviewsCount = u._count.reviews;
        const ratingsCount = u._count.ratings;
        const score = Math.round(totalHours * 10 + episodesCount * 4 + reviewsCount * 8 + ratingsCount * 3);

        let rankBadge = "🌱";
        let rankTitle = "Mọt Phim Tập Sự";
        if (totalHours >= 100 || score >= 500) {
          rankBadge = "👑";
          rankTitle = "Đại Sư Điện Ảnh";
        } else if (totalHours >= 50 || score >= 250) {
          rankBadge = "🏆";
          rankTitle = "Mọt Phim Thượng Thừa";
        } else if (totalHours >= 20 || score >= 100) {
          rankBadge = "⭐";
          rankTitle = "Cinephile Chính Hiệu";
        } else if (totalHours >= 5 || score >= 30) {
          rankBadge = "🎬";
          rankTitle = "Khán Giả Chuyên Cần";
        }

        return {
          id: u.id,
          username: u.username,
          displayName: u.displayName || u.username,
          avatarUrl: u.avatarUrl,
          totalHours,
          totalEpisodes: episodesCount,
          reviewsCount,
          ratingsCount,
          activityScore: score,
          rankTitle,
          rankBadge,
        };
      })
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, 10)
      .map((user, index) => ({
        rank: index + 1,
        ...user,
        isTop1: index === 0,
        isTop2: index === 1,
        isTop3: index === 2,
        medal: index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null,
      }));

    await this.cache.setJson(LEADERBOARD_CACHE_KEY, ranked, 180); // cache 3 mins
    return ranked;
  }
}
