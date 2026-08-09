import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ── 1. Dashboard Overview Stats & Charts ──────────────────────────
  async getOverviewStats() {
    const totalUsers = await this.prisma.user.count();
    const totalMovies = await this.prisma.movie.count();

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const viewsToday = await this.prisma.viewLog.count({
      where: { viewedAt: { gte: startOfToday } },
    });
    const viewsWeek = await this.prisma.viewLog.count({
      where: { viewedAt: { gte: startOfWeek } },
    });
    const viewsMonth = await this.prisma.viewLog.count({
      where: { viewedAt: { gte: startOfMonth } },
    });

    // Mock active watch parties count
    const activeWatchParties = 3;

    // Daily Views Chart Data (Last 14 days)
    const dailyChartData: { date: string; views: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const dayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i,
      );
      const dayEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i + 1,
      );
      const count = await this.prisma.viewLog.count({
        where: { viewedAt: { gte: dayStart, lt: dayEnd } },
      });
      const dateStr = `${dayStart.getDate()}/${dayStart.getMonth() + 1}`;
      dailyChartData.push({ date: dateStr, views: count });
    }

    // Top 10 Most Viewed Movies this week
    const topViewLogs = await this.prisma.viewLog.groupBy({
      by: ["movieId"],
      where: { viewedAt: { gte: startOfWeek } },
      _count: { movieId: true },
      orderBy: { _count: { movieId: "desc" } },
      take: 10,
    });

    const topMovieIds = topViewLogs.map((item) => item.movieId);
    const topMoviesMap = await this.prisma.movie.findMany({
      where: { id: { in: topMovieIds } },
    });

    const topMovies = topViewLogs.map((item) => {
      const movie = topMoviesMap.find((m) => m.id === item.movieId);
      return {
        id: item.movieId,
        title: movie?.title || item.movieId,
        posterUrl: movie?.posterUrl || movie?.thumbUrl,
        year: movie?.year,
        views: item._count.movieId,
      };
    });

    return {
      totalUsers,
      totalMovies,
      viewsToday,
      viewsWeek,
      viewsMonth,
      activeWatchParties,
      dailyChartData,
      topMovies,
    };
  }

  // ── 2. Movie Management ──────────────────────────────────────────
  async getMoviesPaginated(params: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    isHidden?: boolean;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 12));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search?.trim()) {
      where.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        { originName: { contains: params.search, mode: "insensitive" } },
      ];
    }
    if (params.type) where.type = params.type;
    if (params.isHidden !== undefined) where.isHidden = params.isHidden;

    const [items, total] = await Promise.all([
      this.prisma.movie.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.movie.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async toggleMovieHide(
    id: string,
    adminUser: { uid: string; email?: string },
  ) {
    const movie = await this.prisma.movie.findUnique({ where: { id } });
    if (!movie) throw new NotFoundException(`Không tìm thấy phim ID: ${id}`);

    const updated = await this.prisma.movie.update({
      where: { id },
      data: { isHidden: !movie.isHidden },
    });

    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: updated.isHidden ? "HIDE_MOVIE" : "UNHIDE_MOVIE",
      targetId: id,
      details: `Đã ${updated.isHidden ? "ẩn" : "mở ẩn"} phim "${movie.title}"`,
    });

    return updated;
  }

  async updateMovieMetadata(
    id: string,
    data: { title?: string; posterUrl?: string; description?: string },
    adminUser: { uid: string; email?: string },
  ) {
    const movie = await this.prisma.movie.findUnique({ where: { id } });
    if (!movie) throw new NotFoundException(`Không tìm thấy phim ID: ${id}`);

    const updated = await this.prisma.movie.update({
      where: { id },
      data,
    });

    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: "EDIT_MOVIE_METADATA",
      targetId: id,
      details: `Đã cập nhật metadata cho phim "${movie.title}"`,
    });

    return updated;
  }

  async updateMovieSources(
    id: string,
    sources: string[],
    adminUser: { uid: string; email?: string },
  ) {
    const movie = await this.prisma.movie.findUnique({ where: { id } });
    if (!movie) throw new NotFoundException(`Không tìm thấy phim ID: ${id}`);

    const updated = await this.prisma.movie.update({
      where: { id },
      data: { sources },
    });

    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: "MANUAL_MERGE_SPLIT_SOURCES",
      targetId: id,
      details: `Cập nhật nguồn hợp nhất cho "${movie.title}": [${sources.join(", ")}]`,
    });

    return updated;
  }

  async triggerManualSync(
    source: string,
    adminUser: { uid: string; email?: string },
  ) {
    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: "TRIGGER_MANUAL_SYNC",
      details: `Yêu cầu đồng bộ thủ công cho nguồn "${source}"`,
    });

    return {
      status: "success",
      message: `Đã phát lệnh kích hoạt đồng bộ dữ liệu cho nguồn ${source}`,
      timestamp: new Date().toISOString(),
    };
  }

  // ── 3. User Management ────────────────────────────────────────────
  async getUsersPaginated(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: "active" | "banned" | "unverified";
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 12));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search?.trim()) {
      where.OR = [
        { username: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }

    if (params.status === "banned") where.isBanned = true;
    if (params.status === "active") where.isBanned = false;
    if (params.status === "unverified") where.isEmailVerified = false;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          isBanned: true,
          isEmailVerified: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        watchHistories: { take: 10, orderBy: { updatedAt: "desc" } },
        watchlist: {
          take: 10,
          orderBy: { addedAt: "desc" },
          include: { movie: true },
        },
        refreshTokens: {
          where: { isRevoked: false },
          orderBy: { lastUsedAt: "desc" },
          select: {
            id: true,
            expiresAt: true,
            createdAt: true,
            userAgent: true,
            ipAddress: true,
            lastUsedAt: true,
          },
        },
      },
    });

    if (!user)
      throw new NotFoundException(`Không tìm thấy người dùng ID: ${userId}`);
    return user;
  }

  async toggleUserBan(
    userId: string,
    adminUser: { uid: string; email?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
      throw new NotFoundException(`Không tìm thấy người dùng ID: ${userId}`);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isBanned: !user.isBanned },
    });

    // Revoke sessions if banned
    if (updated.isBanned) {
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    }

    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: updated.isBanned ? "LOCK_USER" : "UNLOCK_USER",
      targetId: userId,
      details: `Đã ${updated.isBanned ? "khóa" : "mở khóa"} tài khoản user "${user.username}" (${user.email})`,
    });

    return updated;
  }
}
