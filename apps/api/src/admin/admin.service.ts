import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import {
  IssuePriority,
  IssueStatus,
  Prisma,
  Role,
  SyncJobStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { WatchPartyService } from "../watch-party/watch-party.service";
import { RedisCacheService } from "../redis/redis.service";
import { SiteConfigService } from "../site-config/site-config.service";

type AdminActor = {
  uid: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
};

type PlaybackSourceInput = {
  provider: string;
  providerSlug: string;
  episodeKey: string;
  episodeName?: string;
  serverName: string;
  streamUrl?: string;
  subtitleUrls?: Record<string, string>;
  introStart?: number;
  introEnd?: number;
  outroStart?: number;
  adCuePoints?: number[];
  priority?: number;
};

const RANGE_DAYS: Record<string, number> = {
  "14d": 14,
  "30d": 30,
  "6m": 180,
  "1y": 365,
};

const DEFAULT_HOME_SECTION_ORDER = [
  "top10",
  "continue",
  "latest",
  "vfx",
  "usuk-series",
  "action",
  "scifi",
];

import { RabbitMQService } from "../rabbitmq/rabbitmq.service";
import { Optional, Inject, forwardRef } from "@nestjs/common";

function adminKey(actor: AdminActor) {
  return (actor.email || actor.uid).toLowerCase();
}

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly runningSyncJobs = new Set<string>();
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly watchParties: WatchPartyService,
    private readonly cache: RedisCacheService,
    private readonly siteConfig: SiteConfigService,
    @Inject(forwardRef(() => RabbitMQService))
    @Optional()
    private readonly rabbitMQService?: RabbitMQService,
  ) {}

  async onModuleInit() {
    const unfinished = await this.prisma.syncJob.findMany({
      where: { status: { in: [SyncJobStatus.QUEUED, SyncJobStatus.RUNNING] } },
      take: 10,
      orderBy: { createdAt: "asc" },
    });
    for (const job of unfinished) {
      if (this.rabbitMQService) {
        void this.rabbitMQService.publishCrawlJob({
          jobId: job.id,
          source: job.source,
          pages: job.requestedPages,
          requestedBy: job.requestedBy,
        });
      } else {
        void this.executeSyncJob(job.id);
      }
    }
  }

  // ── 1. Dashboard Overview Stats & Charts ──────────────────────────
  async getOverviewStats(range = "14d") {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const selectedDays = RANGE_DAYS[range] || 14;
    const selectedStart = new Date(
      now.getTime() - selectedDays * 24 * 60 * 60 * 1000,
    );

    const [
      totalUsers,
      totalMovies,
      activeUsers,
      viewsToday,
      viewsWeek,
      viewsMonth,
      openReports,
      recentActivity,
      rangeViews,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.movie.count(),
      this.prisma.user.count({
        where: {
          refreshTokens: {
            some: { isRevoked: false, lastUsedAt: { gte: startOfToday } },
          },
        },
      }),
      this.prisma.viewLog.count({ where: { viewedAt: { gte: startOfToday } } }),
      this.prisma.viewLog.count({ where: { viewedAt: { gte: startOfWeek } } }),
      this.prisma.viewLog.count({ where: { viewedAt: { gte: startOfMonth } } }),
      this.prisma.issueReport.count({
        where: { status: { in: [IssueStatus.NEW, IssueStatus.IN_PROGRESS] } },
      }),
      this.auditService.getRecentLogs(8),
      this.prisma.viewLog.count({
        where: { viewedAt: { gte: selectedStart } },
      }),
    ]);
    const activeWatchParties = this.watchParties.listRooms().length;

    const rawChart =
      selectedDays <= 30
        ? await this.prisma.$queryRaw<Array<{ bucket: Date; views: bigint }>>`
          SELECT date_trunc('day', "viewedAt") AS bucket, COUNT(*)::bigint AS views
          FROM "view_logs" WHERE "viewedAt" >= ${selectedStart}
          GROUP BY bucket ORDER BY bucket ASC`
        : await this.prisma.$queryRaw<Array<{ bucket: Date; views: bigint }>>`
          SELECT date_trunc('month', "viewedAt") AS bucket, COUNT(*)::bigint AS views
          FROM "view_logs" WHERE "viewedAt" >= ${selectedStart}
          GROUP BY bucket ORDER BY bucket ASC`;
    const dailyChartData = rawChart.map((item) => ({
      date:
        selectedDays <= 30
          ? `${item.bucket.getDate()}/${item.bucket.getMonth() + 1}`
          : `${item.bucket.getMonth() + 1}/${item.bucket.getFullYear()}`,
      views: Number(item.views),
    }));

    // Top 10 Most Viewed Movies this week
    const topViewLogs = await this.prisma.viewLog.groupBy({
      by: ["movieId"],
      where: { viewedAt: { gte: selectedStart } },
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
        status: movie?.isHidden ? "hidden" : movie?.status || "active",
        sourceCount: movie?.sources.length || 0,
      };
    });

    return {
      totalUsers,
      totalMovies,
      activeUsers,
      viewsToday,
      viewsWeek,
      viewsMonth,
      range,
      rangeViews,
      activeWatchParties,
      openReports,
      recentActivity,
      dailyChartData,
      topMovies,
    };
  }

  async getCurrentAdmin(
    actor: AdminActor & {
      name?: string;
      picture?: string;
      role?: string;
      internalDashboard?: boolean;
    },
  ) {
    const localUser = actor.email
      ? await this.prisma.user.findUnique({
          where: { email: actor.email.toLowerCase() },
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            role: true,
            twoFactorEnabled: true,
            adminAccessEnabled: true,
            adminPermissions: true,
          },
        })
      : null;
    return {
      id: localUser?.id || actor.uid,
      email: localUser?.email || actor.email || "",
      username: localUser?.username || "admin",
      displayName:
        localUser?.displayName ||
        (actor.internalDashboard ? "Quản trị NetPhim" : actor.name) ||
        "Quản trị NetPhim",
      avatarUrl: localUser?.avatarUrl || actor.picture || null,
      role: localUser?.role || actor.role || "ADMIN",
      twoFactorEnabled: localUser?.twoFactorEnabled || false,
      adminAccessEnabled: localUser?.adminAccessEnabled ?? true,
      permissions: (actor as any).permissions || localUser?.adminPermissions || [],
      internalDashboard: Boolean(actor.internalDashboard),
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
        include: { _count: { select: { playbackSources: true } } },
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

  async toggleMovieHide(id: string, adminUser: AdminActor) {
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
    data: {
      title?: string;
      posterUrl?: string;
      description?: string;
      originName?: string;
      year?: number;
      type?: string;
      quality?: string;
      language?: string;
      trailerUrl?: string;
      genres?: string[];
      countries?: string[];
      actors?: string[];
      directors?: string[];
      releaseSchedule?: Record<string, unknown>;
    },
    adminUser: AdminActor,
  ) {
    const movie = await this.prisma.movie.findUnique({ where: { id } });
    if (!movie) throw new NotFoundException(`Không tìm thấy phim ID: ${id}`);

    const updated = await this.prisma.movie.update({
      where: { id },
      data: {
        ...data,
        releaseSchedule: data.releaseSchedule as
          Prisma.InputJsonValue | undefined,
      },
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
    adminUser: AdminActor,
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

  async getMoviePlaybackSources(id: string) {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!movie) throw new NotFoundException(`Không tìm thấy phim ID: ${id}`);
    return this.prisma.moviePlaybackSource.findMany({
      where: { movieId: id },
      orderBy: [
        { episodeKey: "asc" },
        { priority: "asc" },
        { provider: "asc" },
      ],
    });
  }

  async replaceMoviePlaybackSources(
    id: string,
    items: PlaybackSourceInput[],
    adminUser: AdminActor,
  ) {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      select: { title: true },
    });
    if (!movie) throw new NotFoundException(`Không tìm thấy phim ID: ${id}`);
    const providers = Array.from(new Set(items.map((item) => item.provider)));
    await this.prisma.$transaction([
      this.prisma.moviePlaybackSource.deleteMany({ where: { movieId: id } }),
      ...(items.length
        ? [
            this.prisma.moviePlaybackSource.createMany({
              data: items.map((item) => ({
                movieId: id,
                provider: item.provider,
                providerSlug: item.providerSlug,
                episodeKey: item.episodeKey,
                episodeName: item.episodeName,
                serverName: item.serverName,
                streamUrl: item.streamUrl,
                subtitleUrls: item.subtitleUrls as
                  Prisma.InputJsonValue | undefined,
                introStart: item.introStart,
                introEnd: item.introEnd,
                outroStart: item.outroStart,
                adCuePoints: item.adCuePoints || [],
                priority: item.priority || 0,
              })),
            }),
          ]
        : []),
      this.prisma.movie.update({ where: { id }, data: { sources: providers } }),
    ]);
    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: "REPLACE_PLAYBACK_SOURCES",
      targetId: id,
      details: `Cập nhật ${items.length} nguồn phát có cấu trúc cho phim "${movie.title}"`,
    });
    return this.getMoviePlaybackSources(id);
  }

  async triggerManualSync(source: string, adminUser: AdminActor, pages = 5) {
    const job = await this.prisma.syncJob.create({
      data: {
        source,
        requestedBy: adminUser.email || adminUser.uid,
        requestedPages: Math.min(50, Math.max(1, pages)),
      },
    });

    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: "TRIGGER_MANUAL_SYNC",
      details: `Yêu cầu đồng bộ thủ công cho nguồn "${source}"`,
    });

    if (this.rabbitMQService) {
      await this.rabbitMQService.publishCrawlJob({
        jobId: job.id,
        source: job.source,
        pages: job.requestedPages,
        requestedBy: job.requestedBy,
      });
    } else {
      void this.executeSyncJob(job.id);
    }
    return job;
  }

  async retrySyncJob(id: string, adminUser: AdminActor) {
    const job = await this.prisma.syncJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Không tìm thấy job đồng bộ");
    const updated = await this.prisma.syncJob.update({
      where: { id },
      data: {
        status: SyncJobStatus.QUEUED,
        errorMessage: null,
        finishedAt: null,
        currentPage: 0,
        processedCount: 0,
        createdCount: 0,
        updatedCount: 0,
        failedCount: 0,
        retryCount: { increment: 1 },
      },
    });
    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: "RETRY_SYNC_JOB",
      targetId: id,
      details: `Chạy lại job đồng bộ ${job.source}`,
    });

    if (this.rabbitMQService) {
      await this.rabbitMQService.publishCrawlJob({
        jobId: updated.id,
        source: updated.source,
        pages: updated.requestedPages,
        requestedBy: adminUser.email || adminUser.uid,
      });
    } else {
      void this.executeSyncJob(updated.id);
    }
    return updated;
  }

  async updateMovieVisibilityBulk(
    ids: string[],
    hidden: boolean,
    adminUser: AdminActor,
  ) {
    const uniqueIds = [...new Set(ids)].slice(0, 200);
    const result = await this.prisma.movie.updateMany({
      where: { id: { in: uniqueIds } },
      data: { isHidden: hidden },
    });
    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: hidden ? "BULK_HIDE_MOVIES" : "BULK_UNHIDE_MOVIES",
      details: `${hidden ? "Ẩn" : "Hiện"} hàng loạt ${result.count} phim`,
    });
    return { updated: result.count };
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
          isLocked: true,
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

  async toggleUserBan(userId: string, adminUser: AdminActor) {
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

  async updateUserRole(userId: string, role: Role, adminUser: AdminActor) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
      throw new NotFoundException(`Không tìm thấy người dùng ID: ${userId}`);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role, adminAccessEnabled: role !== Role.USER },
      select: { id: true, email: true, username: true, role: true },
    });
    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: "CHANGE_USER_ROLE",
      targetId: userId,
      details: `Đổi vai trò ${user.email} từ ${user.role} sang ${role}`,
    });
    return updated;
  }

  async updateUserLock(userId: string, locked: boolean, adminUser: AdminActor) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
      throw new NotFoundException(`Không tìm thấy người dùng ID: ${userId}`);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isLocked: locked },
    });
    if (locked) {
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    }
    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: locked ? "LOCK_USER_SECURITY" : "UNLOCK_USER_SECURITY",
      targetId: userId,
      details: `${locked ? "Khóa" : "Mở khóa"} bảo mật tài khoản ${user.email}`,
    });
    return updated;
  }

  async revokeUserSession(
    userId: string,
    sessionId: string,
    adminUser: AdminActor,
  ) {
    const result = await this.prisma.refreshToken.updateMany({
      where: { id: sessionId, userId },
      data: { isRevoked: true },
    });
    if (!result.count)
      throw new NotFoundException("Không tìm thấy phiên đăng nhập");
    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: "REVOKE_USER_SESSION",
      targetId: sessionId,
      details: `Thu hồi phiên của user ${userId}`,
    });
    return { revoked: true };
  }

  async updateUserVerification(
    userId: string,
    verified: boolean,
    adminUser: AdminActor,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Không tìm thấy người dùng");
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: verified },
    });
    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: verified ? "VERIFY_USER_EMAIL" : "REVOKE_USER_EMAIL_VERIFICATION",
      targetId: userId,
      details: `${verified ? "Xác minh" : "Hủy xác minh"} email ${user.email}`,
    });
    return updated;
  }

  async resetUserTwoFactor(userId: string, adminUser: AdminActor) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Không tìm thấy người dùng");
    await this.prisma.$transaction([
      this.prisma.twoFactorAuth.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: false },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);
    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: "RESET_USER_TWO_FACTOR",
      targetId: userId,
      details: `Đặt lại 2FA và thu hồi phiên của ${user.email}`,
    });
    return { reset: true };
  }

  async getReports(params: {
    page: number;
    limit: number;
    status?: string;
    search?: string;
  }) {
    const where: any = {};
    if (Object.values(IssueStatus).includes(params.status as IssueStatus)) {
      where.status = params.status as IssueStatus;
    }
    if (params.search?.trim()) {
      where.OR = [
        { filmTitle: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }
    const skip = (params.page - 1) * params.limit;
    const [items, total] = await Promise.all([
      this.prisma.issueReport.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      }),
      this.prisma.issueReport.count({ where }),
    ]);
    return {
      items,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  async updateReport(
    id: string,
    data: {
      status?: IssueStatus;
      priority?: IssuePriority;
      adminNote?: string;
      assignedTo?: string;
      resolutionMessage?: string;
    },
    adminUser: AdminActor,
  ) {
    const existing = await this.prisma.issueReport.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("Không tìm thấy báo cáo");
    const updated = await this.prisma.$transaction(async (transaction) => {
      const report = await transaction.issueReport.update({
        where: { id },
        data: {
          ...data,
          resolvedBy:
            data.status === IssueStatus.RESOLVED
              ? adminUser.email || adminUser.uid
              : undefined,
          resolvedAt: data.status
            ? data.status === IssueStatus.RESOLVED
              ? new Date()
              : null
            : undefined,
        },
      });
      await transaction.issueReportEvent.create({
        data: {
          reportId: id,
          actorId: adminUser.uid,
          actorEmail: adminUser.email || adminUser.uid,
          action:
            existing.status === report.status
              ? "UPDATE_DETAILS"
              : "CHANGE_STATUS",
          fromStatus: existing.status,
          toStatus: report.status,
          note: data.adminNote || data.resolutionMessage,
        },
      });
      return report;
    });
    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: "UPDATE_ISSUE_REPORT",
      targetId: id,
      details: `Cập nhật báo cáo từ ${existing.status} sang ${updated.status}`,
    });
    return updated;
  }

  async getReportDetail(id: string) {
    const report = await this.prisma.issueReport.findUnique({
      where: { id },
      include: { events: { orderBy: { createdAt: "desc" } } },
    });
    if (!report) throw new NotFoundException("Không tìm thấy báo cáo");
    return report;
  }

  async getReviews(params: { page: number; limit: number; search?: string }) {
    const where: any = params.search?.trim()
      ? {
          OR: [
            { content: { contains: params.search, mode: "insensitive" } },
            {
              user: {
                username: { contains: params.search, mode: "insensitive" },
              },
            },
            {
              movie: {
                title: { contains: params.search, mode: "insensitive" },
              },
            },
          ],
        }
      : {};
    const skip = (params.page - 1) * params.limit;
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              isBanned: true,
            },
          },
          movie: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: params.limit,
      }),
      this.prisma.review.count({ where }),
    ]);
    return {
      items,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  async deleteReview(id: string, adminUser: AdminActor) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        user: { select: { username: true } },
        movie: { select: { title: true } },
      },
    });
    if (!review) throw new NotFoundException("Không tìm thấy bình luận");
    await this.prisma.review.delete({ where: { id } });
    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: "DELETE_REVIEW",
      targetId: id,
      details: `Xóa bình luận của ${review.user.username} tại ${review.movie.title}`,
    });
    return { deleted: true };
  }

  async moderateReview(
    id: string,
    hidden: boolean,
    note: string | undefined,
    adminUser: AdminActor,
  ) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException("Không tìm thấy bình luận");
    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        isHidden: hidden,
        moderationNote: note || null,
        moderatedBy: adminUser.email || adminUser.uid,
        moderatedAt: new Date(),
      },
    });
    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: hidden ? "HIDE_REVIEW" : "RESTORE_REVIEW",
      targetId: id,
      details:
        note ||
        (hidden ? "Ẩn bình luận khỏi trang công khai" : "Khôi phục bình luận"),
    });
    return updated;
  }

  async getAuditLogs(params: { page: number; limit: number; search?: string }) {
    const where: any = params.search?.trim()
      ? {
          OR: [
            { action: { contains: params.search, mode: "insensitive" } },
            { adminEmail: { contains: params.search, mode: "insensitive" } },
            { details: { contains: params.search, mode: "insensitive" } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      items,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  getSyncJobs(limit: number) {
    return this.prisma.syncJob.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  getWatchParties() {
    return { items: this.watchParties.listRooms() };
  }

  async getWatchPartyArchives(limit: number) {
    return {
      items: await this.prisma.watchPartyArchive.findMany({
        take: limit,
        orderBy: { endedAt: "desc" },
      }),
    };
  }

  async closeWatchParty(id: string, adminUser: AdminActor) {
    const room = this.watchParties.forceCloseRoom(id);
    if (!room) throw new NotFoundException("Phòng không còn hoạt động");
    const host = room.participants.find(
      (participant) => participant.id === room.hostId,
    );
    await this.prisma.watchPartyArchive.upsert({
      where: { id: room.id },
      create: {
        id: room.id,
        name: room.name,
        movieSlug: room.movie.slug,
        movieName: room.movie.name,
        episode: room.movie.episode,
        hostName: host?.name,
        peakParticipants: room.participants.length,
        messageCount: room.messages.length,
        closeReason: `Đóng bởi ${adminUser.email || adminUser.uid}`,
        createdAt: new Date(room.createdAt),
      },
      update: {
        peakParticipants: room.participants.length,
        messageCount: room.messages.length,
        closeReason: `Đóng bởi ${adminUser.email || adminUser.uid}`,
        endedAt: new Date(),
      },
    });
    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: "FORCE_CLOSE_PARTY",
      targetId: id,
      details: `Giải tán phòng ${id}: ${room.name}`,
    });
    return { closed: true };
  }

  async getSystemHealth() {
    const startedAt = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      checkedAt: new Date().toISOString(),
      api: {
        status: "operational",
        uptimeSeconds: Math.round(process.uptime()),
      },
      database: { status: "operational", latencyMs: Date.now() - startedAt },
      cache: this.cache.getStats(),
      security: {
        helmet: true,
        globalRateLimit: true,
        reviewRateLimitPath: "/api/v1/reviews",
      },
    };
  }

  async getPlaybackAnalytics(range = "30d") {
    const days = RANGE_DAYS[range] || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const where = { occurredAt: { gte: since } };
    const [
      totalEvents,
      successes,
      fallbacks,
      failures,
      timings,
      byProvider,
      byEvent,
      recentFailures,
      sources,
    ] = await Promise.all([
      this.prisma.playbackEvent.count({ where }),
      this.prisma.playbackEvent.count({
        where: {
          ...where,
          eventType: { in: ["watch_now.success", "player.iframe_loaded"] },
        },
      }),
      this.prisma.playbackEvent.count({
        where: {
          ...where,
          eventType: { in: ["player.fallback", "player.transport_fallback"] },
        },
      }),
      this.prisma.playbackEvent.count({
        where: {
          ...where,
          eventType: { in: ["player.source_failed", "player.error"] },
        },
      }),
      this.prisma.playbackEvent.aggregate({
        where: { ...where, eventType: "watch_now.success" },
        _avg: { durationMs: true },
        _max: { durationMs: true },
      }),
      this.prisma.playbackEvent.groupBy({
        by: ["provider"],
        where,
        _count: { _all: true },
        orderBy: { _count: { provider: "desc" } },
        take: 12,
      }),
      this.prisma.playbackEvent.groupBy({
        by: ["eventType"],
        where,
        _count: { _all: true },
        orderBy: { _count: { eventType: "desc" } },
        take: 20,
      }),
      this.prisma.playbackEvent.findMany({
        where: {
          ...where,
          eventType: {
            in: [
              "player.source_failed",
              "player.error",
              "player.fallback",
              "player.transport_fallback",
            ],
          },
        },
        orderBy: { occurredAt: "desc" },
        take: 30,
      }),
      this.prisma.moviePlaybackSource.findMany({
        select: {
          provider: true,
          healthStatus: true,
          lastCheckedAt: true,
          lastError: true,
        },
      }),
    ]);
    const sourceHealth = Array.from(
      new Set(sources.map((item) => item.provider)),
    ).map((provider) => {
      const providerSources = sources.filter(
        (item) => item.provider === provider,
      );
      return {
        provider,
        total: providerSources.length,
        operational: providerSources.filter(
          (item) => item.healthStatus === "operational",
        ).length,
        degraded: providerSources.filter(
          (item) => item.healthStatus === "degraded",
        ).length,
        down: providerSources.filter((item) => item.healthStatus === "down")
          .length,
        lastCheckedAt:
          providerSources
            .map((item) => item.lastCheckedAt)
            .filter(Boolean)
            .sort()
            .at(-1) || null,
        lastError:
          providerSources.find((item) => item.lastError)?.lastError || null,
      };
    });
    return {
      range,
      since,
      summary: {
        totalEvents,
        successes,
        fallbacks,
        failures,
        fallbackRate:
          successes + fallbacks > 0 ? fallbacks / (successes + fallbacks) : 0,
        failureRate:
          successes + failures > 0 ? failures / (successes + failures) : 0,
        averageStartMs: timings._avg.durationMs,
        slowestStartMs: timings._max.durationMs,
      },
      byProvider: byProvider.map((item) => ({
        provider: item.provider || "unknown",
        count: item._count._all,
      })),
      byEvent: byEvent.map((item) => ({
        eventType: item.eventType,
        count: item._count._all,
      })),
      recentFailures,
      sourceHealth,
    };
  }

  async getNotifications(actor: AdminActor, limit: number) {
    const key = adminKey(actor);
    const now = new Date();
    const [items, unread] = await Promise.all([
      this.prisma.adminNotification.findMany({
        where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        include: {
          reads: { where: { adminKey: key }, select: { readAt: true } },
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.adminNotification.count({
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          reads: { none: { adminKey: key } },
        },
      }),
    ]);
    return {
      items: items.map(({ reads, ...item }) => ({
        ...item,
        readAt: reads[0]?.readAt || null,
      })),
      unread,
    };
  }

  async markNotificationRead(id: string, actor: AdminActor) {
    const notification = await this.prisma.adminNotification.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!notification) throw new NotFoundException("Không tìm thấy thông báo");
    return this.prisma.adminNotificationRead.upsert({
      where: {
        notificationId_adminKey: {
          notificationId: id,
          adminKey: adminKey(actor),
        },
      },
      create: { notificationId: id, adminKey: adminKey(actor) },
      update: { readAt: new Date() },
    });
  }

  async markAllNotificationsRead(actor: AdminActor) {
    const key = adminKey(actor);
    const unread = await this.prisma.adminNotification.findMany({
      where: { reads: { none: { adminKey: key } } },
      select: { id: true },
      take: 500,
    });
    if (unread.length) {
      await this.prisma.adminNotificationRead.createMany({
        data: unread.map((item) => ({
          notificationId: item.id,
          adminKey: key,
        })),
        skipDuplicates: true,
      });
    }
    return { updated: unread.length };
  }

  async getConfiguration() {
    return this.siteConfig.getConfiguration();
  }

  async updateConfiguration(
    data: {
      maintenanceMode?: boolean;
      maintenanceNotice?: string;
      announcementText?: string;
      announcementLink?: string;
      homePopupEnabled?: boolean;
      homePopupTitle?: string;
      homePopupBody?: string;
      homePopupLink?: string;
      homePopupLinkLabel?: string;
      homePopupDismissLabel?: string;
      heroMovieSlugs?: string[];
      providerPriority?: string[];
      autoSkipIntro?: boolean;
      watchPartyEnabled?: boolean;
      homeTop10Slugs?: string[];
      homeSectionOrder?: string[];
      homeHiddenSections?: string[];
      homeFeaturedRows?: Record<string, unknown>;
      seoTitle?: string;
      seoDescription?: string;
    },
    adminUser: AdminActor,
  ) {
    const previous = await this.siteConfig.getConfiguration();
    const updated = await this.siteConfig.updateConfiguration(
      data as any,
      adminUser.email || adminUser.uid,
    );
    await this.prisma.siteConfigurationRevision.create({
      data: {
        snapshot: previous as unknown as Prisma.InputJsonValue,
        changedBy: adminUser.email || adminUser.uid,
      },
    });
    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      ipAddress: adminUser.ipAddress,
      userAgent: adminUser.userAgent,
      action: "UPDATE_SITE_CONFIGURATION",
      targetId: "primary",
      details: `Cập nhật cấu hình vận hành: ${Object.keys(data).join(", ")}`,
    });
    return updated;
  }

  getConfigurationRevisions(limit: number) {
    return this.prisma.siteConfigurationRevision.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  async restoreConfigurationRevision(id: string, adminUser: AdminActor) {
    const revision = await this.prisma.siteConfigurationRevision.findUnique({
      where: { id },
    });
    if (!revision)
      throw new NotFoundException("Không tìm thấy phiên bản cấu hình");
    const snapshot = revision.snapshot as Record<string, unknown>;
    const restored = await this.siteConfig.updateConfiguration(
      {
        maintenanceMode: Boolean(snapshot.maintenanceMode),
        maintenanceNotice: String(snapshot.maintenanceNotice || ""),
        announcementText: String(snapshot.announcementText || ""),
        announcementLink: String(snapshot.announcementLink || ""),
        homePopupEnabled: Boolean(snapshot.homePopupEnabled),
        homePopupTitle: String(snapshot.homePopupTitle || "Thông báo từ NetPhim"),
        homePopupBody: String(snapshot.homePopupBody || ""),
        homePopupLink: String(snapshot.homePopupLink || ""),
        homePopupLinkLabel: String(snapshot.homePopupLinkLabel || "Xem chi tiết"),
        homePopupDismissLabel: String(snapshot.homePopupDismissLabel || "Đã hiểu"),
        heroMovieSlugs: Array.isArray(snapshot.heroMovieSlugs)
          ? snapshot.heroMovieSlugs.map(String)
          : [],
        providerPriority: Array.isArray(snapshot.providerPriority)
          ? snapshot.providerPriority.map(String)
          : [],
        autoSkipIntro: Boolean(snapshot.autoSkipIntro),
        watchPartyEnabled: snapshot.watchPartyEnabled !== false,
        homeTop10Slugs: Array.isArray(snapshot.homeTop10Slugs) ? snapshot.homeTop10Slugs.map(String) : [],
        homeSectionOrder: Array.isArray(snapshot.homeSectionOrder) ? snapshot.homeSectionOrder.map(String) : DEFAULT_HOME_SECTION_ORDER,
        homeHiddenSections: Array.isArray(snapshot.homeHiddenSections) ? snapshot.homeHiddenSections.map(String) : [],
        homeFeaturedRows: snapshot.homeFeaturedRows && typeof snapshot.homeFeaturedRows === "object" ? snapshot.homeFeaturedRows as Prisma.InputJsonValue : undefined,
        seoTitle: String(snapshot.seoTitle || "NetPhim - Xem phim trực tuyến"),
        seoDescription: String(snapshot.seoDescription || ""),
      },
      adminUser.email || adminUser.uid,
    );
    await this.auditService.logAction({
      adminId: adminUser.uid,
      adminEmail: adminUser.email,
      action: "RESTORE_SITE_CONFIGURATION",
      targetId: id,
      details: `Khôi phục cấu hình từ bản lưu ${revision.createdAt.toISOString()}`,
    });
    return restored;
  }

  async executeSyncJob(jobId: string) {
    if (this.runningSyncJobs.has(jobId)) return;
    this.runningSyncJobs.add(jobId);
    try {
      const job = await this.prisma.syncJob.findUnique({
        where: { id: jobId },
      });
      if (!job) return;
      await this.prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: SyncJobStatus.RUNNING,
          startedAt: job.startedAt || new Date(),
          heartbeatAt: new Date(),
        },
      });

      const webBase = (
        process.env.NETPHIM_WEB_URL || "http://127.0.0.1:3000"
      ).replace(/\/$/, "");
      const pathFor = (source: string, page: number) => {
        const paths: Record<string, string> = {
          kkphim: `/api/kkphim/v1/api/danh-sach/phim-moi-cap-nhat?page=${page}&limit=24`,
          ophim: `/api/ophim/danh-sach/phim-moi-cap-nhat?page=${page}`,
          nguonc: `/api/nguonc/films/phim-moi-cap-nhat?page=${page}`,
          vsmov: `/api/vsmov/danh-sach/phim-moi-cap-nhat?page=${page}`,
        };
        return paths[source];
      };
      const names = (value: unknown) =>
        Array.isArray(value)
          ? value
              .map((item: any) => String(item?.name || item).trim())
              .filter(Boolean)
              .slice(0, 100)
          : [];
      const imageUrl = (value: unknown, source: string) => {
        const url = String(value || "").trim();
        if (!url) return null;
        return source === "kkphim" && !/^https?:\/\//i.test(url)
          ? `https://phimimg.com/${url.replace(/^\/+/, "")}`
          : url;
      };
      let processedCount = job.processedCount;
      let createdCount = job.createdCount;
      let updatedCount = job.updatedCount;
      let failedCount = job.failedCount;

      for (
        let page = Math.max(1, job.currentPage + 1);
        page <= job.requestedPages;
        page += 1
      ) {
        const path = pathFor(job.source, page);
        if (!path) throw new Error(`Nguồn ${job.source} không được hỗ trợ`);
        const response = await fetch(`${webBase}${path}`, {
          headers: {
            Accept: "application/json",
            "User-Agent": "NetPhim-Sync/2.0",
          },
          signal: AbortSignal.timeout(25_000),
        });
        if (!response.ok)
          throw new Error(
            `Nguồn trả về HTTP ${response.status} tại trang ${page}`,
          );
        const payload: any = await response.json();
        const items: any[] =
          payload?.data?.items || payload?.items || payload?.data || [];
        if (!Array.isArray(items))
          throw new Error("Nguồn không trả về danh sách phim hợp lệ");
        if (!items.length) break;

        for (const item of items.slice(0, 100)) {
          const id = String(item.slug || item._id || item.id || "").trim();
          if (!id) {
            failedCount += 1;
            continue;
          }
          try {
            const exists = await this.prisma.movie.findUnique({
              where: { id },
              select: {
                id: true,
                sources: true,
                genres: true,
                countries: true,
                actors: true,
                directors: true,
              },
            });
            const title = String(
              item.name || item.title || item.original_name || id,
            ).slice(0, 300);
            const type = String(item.type || "unknown").slice(0, 40);
            const genres = names(item.category || item.categories);
            const countries = names(item.country || item.countries);
            const actors = names(item.actor || item.actors);
            const directors = names(item.director || item.directors);
            await this.prisma.movie.upsert({
              where: { id },
              create: {
                id,
                title,
                originName:
                  String(item.origin_name || item.original_name || "").slice(
                    0,
                    300,
                  ) || null,
                posterUrl: imageUrl(item.poster_url, job.source)?.slice(0, 2048),
                thumbUrl: imageUrl(item.thumb_url, job.source)?.slice(0, 2048),
                year: Number(item.year) || null,
                type,
                genres,
                countries,
                actors,
                directors,
                trailerUrl:
                  String(item.trailer_url || item.trailer || "").slice(
                    0,
                    2048,
                  ) || null,
                sources: [job.source],
              },
              update: {
                title,
                originName:
                  String(item.origin_name || item.original_name || "").slice(
                    0,
                    300,
                  ) || undefined,
                posterUrl:
                  imageUrl(item.poster_url, job.source)?.slice(0, 2048),
                thumbUrl:
                  imageUrl(item.thumb_url, job.source)?.slice(0, 2048),
                year: Number(item.year) || undefined,
                type,
                ...(genres.length ? { genres } : {}),
                ...(countries.length ? { countries } : {}),
                ...(actors.length ? { actors } : {}),
                ...(directors.length ? { directors } : {}),
                sources: Array.from(
                  new Set([...(exists?.sources || []), job.source]),
                ),
              },
            });
            await this.prisma.moviePlaybackSource.upsert({
              where: {
                movieId_provider_providerSlug_episodeKey_serverName: {
                  movieId: id,
                  provider: job.source,
                  providerSlug: id,
                  episodeKey: "catalog",
                  serverName: job.source.toUpperCase(),
                },
              },
              create: {
                movieId: id,
                provider: job.source,
                providerSlug: id,
                episodeKey: "catalog",
                episodeName: "Chờ đồng bộ chi tiết",
                serverName: job.source.toUpperCase(),
              },
              update: { healthStatus: "unknown", lastError: null },
            });
            if (exists) updatedCount += 1;
            else createdCount += 1;
          } catch {
            failedCount += 1;
          }
        }
        processedCount += items.slice(0, 100).length;
        await this.prisma.syncJob.update({
          where: { id: jobId },
          data: {
            currentPage: page,
            processedCount,
            createdCount,
            updatedCount,
            failedCount,
            heartbeatAt: new Date(),
          },
        });
      }

      await this.prisma.$transaction([
        this.prisma.syncJob.update({
          where: { id: jobId },
          data: {
            status: SyncJobStatus.COMPLETED,
            processedCount,
            createdCount,
            updatedCount,
            failedCount,
            finishedAt: new Date(),
            heartbeatAt: new Date(),
          },
        }),
        this.prisma.adminNotification.create({
          data: {
            type: "sync_completed",
            title: `Đồng bộ ${job.source} hoàn tất`,
            message: `${processedCount} phim đã xử lý, ${failedCount} lỗi`,
            severity: failedCount ? "warning" : "success",
            link: "/movies",
          },
        }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.$transaction([
        this.prisma.syncJob.update({
          where: { id: jobId },
          data: {
            status: SyncJobStatus.FAILED,
            errorMessage: message,
            finishedAt: new Date(),
            heartbeatAt: new Date(),
          },
        }),
        this.prisma.adminNotification.create({
          data: {
            type: "sync_failed",
            title: "Đồng bộ nguồn thất bại",
            message,
            severity: "critical",
            link: "/movies",
          },
        }),
      ]);
    } finally {
      this.runningSyncJobs.delete(jobId);
    }
  }
}
