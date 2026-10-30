import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { BackupStatus, IncidentStatus } from "@prisma/client";
import { createHash } from "crypto";
import { createReadStream, existsSync, promises as fs } from "fs";
import { spawn } from "child_process";
import { resolve, sep } from "path";
import { PrismaService } from "../prisma/prisma.service";
import { RedisCacheService } from "../redis/redis.service";
import { StorageService } from "../common/storage/storage.service";

type Actor = { uid: string; email?: string; ipAddress?: string; userAgent?: string };

function normalizedTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(phan|part|season|mua)\s*\d+\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
@Injectable()
export class AdminOperationsService
  implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(AdminOperationsService.name);
  private timer?: ReturnType<typeof setInterval>;
  private monitorBusy = false;
  private backupScheduleBusy = false;
  private readonly backupDir = resolve(process.env.BACKUP_DIR || "./backups");

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
    private readonly storage: StorageService,
  ) {}

  onModuleInit() {
    this.startBackgroundTasks();
  }

  startBackgroundTasks() {
    if (this.timer) return;
    this.logger.log("Admin operations scheduler initialized");
    this.timer = setInterval(() => {
      void this.monitorSystem();
      void this.runLogPruning();
      void this.runScheduledBackup();
    }, 60_000);
    (this.timer as unknown as { unref?: () => void }).unref?.();
    void this.runLogPruning();
    void this.runScheduledBackup();
  }

  onApplicationBootstrap() {
    this.startBackgroundTasks();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Prunes telemetry records older than retention threshold to prevent database bloat.
   */
  async pruneExpiredLogs(retentionDays?: number) {
    const days = Math.max(
      7,
      Number(retentionDays || process.env.LOG_RETENTION_DAYS || 60),
    );
    const cutoffDate = new Date(Date.now() - days * 86_400_000);

    const [viewLogsPruned, playbackEventsPruned, searchEventsPruned] =
      await Promise.all([
        this.prisma.viewLog.deleteMany({ where: { viewedAt: { lt: cutoffDate } } }),
        this.prisma.playbackEvent.deleteMany({
          where: { occurredAt: { lt: cutoffDate } },
        }),
        this.prisma.searchEvent.deleteMany({
          where: { occurredAt: { lt: cutoffDate } },
        }),
      ]);

    this.logger.log(
      `🧹 Pruned telemetry logs older than ${days} days: ${viewLogsPruned.count} view logs, ${playbackEventsPruned.count} playback events, ${searchEventsPruned.count} search events`,
    );

    return {
      retentionDays: days,
      cutoffDate,
      deleted: {
        viewLogs: viewLogsPruned.count,
        playbackEvents: playbackEventsPruned.count,
        searchEvents: searchEventsPruned.count,
      },
    };
  }

  private async runLogPruning() {
    const acquired = await this.cache.acquireLock(
      "log_retention_prune",
      24 * 3600 * 1000,
    );
    if (!acquired) return; // Only 1 pod runs pruning per 24 hours
    try {
      await this.pruneExpiredLogs();
    } catch (err) {
      this.logger.warn(
        `Failed to prune expired logs: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async runScheduledBackup() {
    if (process.env.AUTO_BACKUP_ENABLED === "false" || this.backupScheduleBusy) {
      return;
    }

    this.backupScheduleBusy = true;
    try {
      const configuredHours = Number(process.env.BACKUP_INTERVAL_HOURS || 24);
      const intervalHours = Number.isFinite(configuredHours)
        ? Math.min(168, Math.max(1, configuredHours))
        : 24;
      const cutoff = new Date(Date.now() - intervalHours * 3_600_000);
      const recent = await this.prisma.databaseBackup.findFirst({
        where: {
          requestedBy: "system:auto-backup",
          createdAt: { gte: cutoff },
          status: {
            in: [
              BackupStatus.QUEUED,
              BackupStatus.RUNNING,
              BackupStatus.COMPLETED,
            ],
          },
        },
        orderBy: { createdAt: "desc" },
      });
      if (recent) return;

      const acquired = await this.cache.acquireLock(
        "database_auto_backup",
        15 * 60_000,
      );
      if (!acquired) return;

      const backup = await this.prisma.databaseBackup.create({
        data: { requestedBy: "system:auto-backup" },
      });
      this.logger.log(`Starting scheduled PostgreSQL backup ${backup.id}`);
      await this.runBackup(backup.id);
    } catch (error) {
      this.logger.error(
        `Scheduled backup failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      this.backupScheduleBusy = false;
    }
  }

  async createMovie(data: Record<string, unknown>, actor: Actor) {
    const rawTitle = String(data.title || "").trim();
    if (!rawTitle) {
      throw new BadRequestException("Tên phim không được để trống");
    }

    let id = String(data.id || "").trim().toLowerCase();
    if (!id) {
      id = rawTitle
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
    }
    if (!id) {
      id = `movie-${Date.now()}`;
    }

    const movie = await this.prisma.movie.create({
      data: {
        id,
        title: rawTitle,
        type: String(data.type || "single"),
        posterUrl: data.posterUrl ? String(data.posterUrl) : undefined,
        thumbUrl: data.thumbUrl ? String(data.thumbUrl) : (data.posterUrl ? String(data.posterUrl) : undefined),
        description: data.description ? String(data.description) : undefined,
        originName: data.originName ? String(data.originName) : undefined,
        year: typeof data.year === "number" ? data.year : (Number(data.year) || undefined),
        quality: data.quality ? String(data.quality) : "FHD",
        language: data.language ? String(data.language) : "Vietsub",
        trailerUrl: data.trailerUrl ? String(data.trailerUrl) : undefined,
        genres: Array.isArray(data.genres) ? data.genres.map(String) : [],
        countries: Array.isArray(data.countries) ? data.countries.map(String) : [],
        actors: Array.isArray(data.actors) ? data.actors.map(String) : [],
        directors: Array.isArray(data.directors) ? data.directors.map(String) : [],
        sources: ["manual"],
        isHidden: true,
      },
    });

    await this.cache.del(`movies:detail:${id}`).catch(() => false);
    await this.log(actor, "CREATE_MOVIE", id, `Tạo phim thủ công: ${movie.title}`);
    return movie;
  }

  async hardDeleteMovie(id: string, confirmation: string, actor: Actor) {
    const movie = await this.prisma.movie.findUnique({ where: { id } });
    if (!movie) throw new NotFoundException("Không tìm thấy phim");
    if (confirmation !== `DELETE ${id}`) {
      throw new BadRequestException(`Nhập chính xác DELETE ${id} để xác nhận`);
    }
    await this.prisma.movie.delete({ where: { id } });
    await this.log(actor, "DELETE_MOVIE", id, `Xóa vĩnh viễn phim: ${movie.title}`);
    return { deleted: id };
  }

  async findDuplicateMovies() {
    const movies = await this.prisma.movie.findMany({
      take: 10_000,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        originName: true,
        year: true,
        posterUrl: true,
        sources: true,
        _count: { select: { viewLogs: true, playbackSources: true } },
      },
    });
    const groups = new Map<string, typeof movies>();
    for (const movie of movies) {
      const name = normalizedTitle(movie.originName || movie.title);
      if (name.length < 3) continue;
      const key = `${name}:${movie.year || "unknown"}`;
      groups.set(key, [...(groups.get(key) || []), movie]);
    }
    return [...groups.entries()]
      .filter(([, items]) => items.length > 1)
      .map(([key, items]) => ({ key, confidence: items.every((item) => item.year === items[0].year) ? "high" : "medium", items }))
      .sort((a, b) => b.items.length - a.items.length);
  }

  async mergeMovies(canonicalId: string, sourceIds: string[], actor: Actor) {
    const duplicates = [...new Set(sourceIds)].filter((id) => id !== canonicalId);
    if (!duplicates.length) throw new BadRequestException("Chưa chọn bản phim cần gộp");
    const movies = await this.prisma.movie.findMany({ where: { id: { in: [canonicalId, ...duplicates] } } });
    const canonical = movies.find((item) => item.id === canonicalId);
    if (!canonical || movies.length !== duplicates.length + 1) throw new NotFoundException("Thiếu dữ liệu phim để gộp");
    const sources = movies.filter((item) => item.id !== canonicalId);
    await this.prisma.$transaction(async (tx) => {
      const watchlists = await tx.watchlist.findMany({ where: { movieId: { in: duplicates } }, select: { userId: true } });
      await tx.watchlist.createMany({ data: watchlists.map((item) => ({ userId: item.userId, movieId: canonicalId })), skipDuplicates: true });
      await tx.watchlist.deleteMany({ where: { movieId: { in: duplicates } } });
      const ratings = await tx.rating.findMany({ where: { movieId: { in: duplicates } }, select: { userId: true, score: true } });
      await tx.rating.createMany({ data: ratings.map((item) => ({ ...item, movieId: canonicalId })), skipDuplicates: true });
      await tx.rating.deleteMany({ where: { movieId: { in: duplicates } } });
      const histories = await tx.watchHistory.findMany({ where: { movieId: { in: duplicates } } });
      await tx.watchHistory.createMany({ data: histories.map(({ id: _id, updatedAt: _updatedAt, ...item }) => ({ ...item, movieId: canonicalId })), skipDuplicates: true });
      await tx.watchHistory.deleteMany({ where: { movieId: { in: duplicates } } });
      const playback = await tx.moviePlaybackSource.findMany({ where: { movieId: { in: duplicates } } });
      await tx.moviePlaybackSource.createMany({ data: playback.map(({ id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...item }) => ({ ...item, movieId: canonicalId })), skipDuplicates: true });
      await tx.moviePlaybackSource.deleteMany({ where: { movieId: { in: duplicates } } });
      await tx.review.updateMany({ where: { movieId: { in: duplicates } }, data: { movieId: canonicalId } });
      await tx.viewLog.updateMany({ where: { movieId: { in: duplicates } }, data: { movieId: canonicalId } });
      await tx.playbackEvent.updateMany({ where: { movieId: { in: duplicates } }, data: { movieId: canonicalId } });
      await tx.movie.update({
        where: { id: canonicalId },
        data: {
          title: canonical.title || sources[0]?.title,
          posterUrl: canonical.posterUrl || sources.find((item) => item.posterUrl)?.posterUrl,
          thumbUrl: canonical.thumbUrl || sources.find((item) => item.thumbUrl)?.thumbUrl,
          description: canonical.description || sources.find((item) => item.description)?.description,
          sources: [...new Set(movies.flatMap((item) => item.sources))],
          genres: [...new Set(movies.flatMap((item) => item.genres))],
          countries: [...new Set(movies.flatMap((item) => item.countries))],
          actors: [...new Set(movies.flatMap((item) => item.actors))],
          directors: [...new Set(movies.flatMap((item) => item.directors))],
        },
      });
      await tx.movie.deleteMany({ where: { id: { in: duplicates } } });
    });
    await this.log(actor, "MERGE_DUPLICATE_MOVIES", canonicalId, `Gộp ${duplicates.join(", ")} vào ${canonicalId}`);
    return { canonicalId, merged: duplicates };
  }

  listSyncSchedules() {
    return this.prisma.syncSchedule.findMany({ orderBy: { nextRunAt: "asc" } });
  }

  async saveSyncSchedule(id: string | undefined, data: { name: string; source: string; intervalMinutes: number; pages: number; enabled: boolean }, actor: Actor) {
    const nextRunAt = new Date(Date.now() + data.intervalMinutes * 60_000);
    const values = { name: data.name, source: data.source, cron: `every:${data.intervalMinutes}`, pages: data.pages, enabled: data.enabled, nextRunAt };
    const schedule = id
      ? await this.prisma.syncSchedule.update({ where: { id }, data: values })
      : await this.prisma.syncSchedule.create({ data: { ...values, createdBy: actor.email || actor.uid } });
    await this.log(actor, id ? "UPDATE_SYNC_SCHEDULE" : "CREATE_SYNC_SCHEDULE", schedule.id, `${schedule.name}: ${schedule.cron}`);
    return schedule;
  }

  async deleteSyncSchedule(id: string, actor: Actor) {
    await this.prisma.syncSchedule.delete({ where: { id } });
    await this.log(actor, "DELETE_SYNC_SCHEDULE", id);
    return { deleted: id };
  }

  async listBackups() {
    const items = await this.prisma.databaseBackup.findMany({ take: 100, orderBy: { createdAt: "desc" } });
    return items.map((item) => ({ ...item, fileSizeBytes: item.fileSizeBytes?.toString() || null }));
  }

  async requestBackup(actor: Actor) {
    const backup = await this.prisma.databaseBackup.create({ data: { requestedBy: actor.email || actor.uid } });
    void this.runBackup(backup.id);
    await this.log(actor, "CREATE_DATABASE_BACKUP", backup.id);
    return backup;
  }

  async restoreBackup(id: string, confirmation: string, actor: Actor) {
    if (confirmation !== `RESTORE ${id}`) throw new BadRequestException(`Nhập chính xác RESTORE ${id} để xác nhận`);
    const backup = await this.prisma.databaseBackup.findUnique({ where: { id } });
    if (!backup?.filename || backup.status !== BackupStatus.COMPLETED) throw new BadRequestException("Bản backup chưa sẵn sàng");
    const file = this.safeBackupPath(backup.filename);
    try {
      await fs.access(file);
    } catch {
      await this.storage.downloadFile(`backups/${backup.filename}`, file);
    }
    await this.runPgCommand("pg_restore", ["--clean", "--if-exists", "--no-owner", "--no-privileges", "--exit-on-error", ...this.pgConnectionArgs(), file]);
    await this.prisma.databaseBackup.update({ where: { id }, data: { status: BackupStatus.RESTORED, restoredBy: actor.email || actor.uid, restoredAt: new Date() } });
    await this.log(actor, "RESTORE_DATABASE_BACKUP", id);
    return { restored: id };
  }

  listIncidents(status?: string) {
    return this.prisma.systemIncident.findMany({
      where: status && status !== "ALL" ? { status: status as IncidentStatus } : undefined,
      take: 100,
      orderBy: { lastSeenAt: "desc" },
    });
  }

  async updateIncident(id: string, status: "ACKNOWLEDGED" | "RESOLVED", actor: Actor) {
    const now = new Date();
    const incident = await this.prisma.systemIncident.update({
      where: { id },
      data: status === "ACKNOWLEDGED"
        ? { status, acknowledgedBy: actor.email || actor.uid, acknowledgedAt: now }
        : { status, resolvedBy: actor.email || actor.uid, resolvedAt: now },
    });
    await this.log(actor, `${status}_INCIDENT`, id, incident.title);
    return incident;
  }

  getCacheOverview() {
    return this.cache.inspectNamespaces();
  }

  async purgeCache(namespace: string, actor: Actor) {
    const result = await this.cache.purgeNamespace(namespace);
    await this.log(actor, "PURGE_CACHE_NAMESPACE", namespace, `${result.deleted} keys`);
    return result;
  }

  async revalidateWeb(paths: string[], actor: Actor) {
    const base = (process.env.NETPHIM_WEB_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
    const token = (process.env.REVALIDATE_SECRET || process.env.HLS_PROXY_SECRET || "").replace(/^["']|["']$/g, "").trim();
    if (token.length < 32) throw new BadRequestException("REVALIDATE_SECRET chưa được cấu hình an toàn");
    const response = await fetch(`${base}/api/admin/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-revalidate-token": token },
      body: JSON.stringify({ paths }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new BadRequestException(`Web revalidation trả về HTTP ${response.status}`);
    await this.log(actor, "REVALIDATE_WEB", "web", paths.join(", "));
    return response.json();
  }

  async getAdvancedAnalytics(range = '30d') {
    const days = Math.min(365, Math.max(1, Number.parseInt(range, 10) || 30));
    const since = new Date(Date.now() - days * 86_400_000);
    const [views, searches, playbackErrors, buffers, providers, users, database] =
      await Promise.all([
        this.prisma.viewLog.groupBy({
          by: ['movieId'],
          where: { viewedAt: { gte: since } },
          _count: { movieId: true },
          orderBy: { _count: { movieId: 'desc' } },
          take: 20,
        }),
        this.prisma.searchEvent.groupBy({
          by: ['normalized'],
          where: { occurredAt: { gte: since } },
          _count: { normalized: true },
          _avg: { resultCount: true },
          orderBy: { _count: { normalized: 'desc' } },
          take: 20,
        }),
        this.prisma.playbackEvent.groupBy({
          by: ['errorCode'],
          where: { occurredAt: { gte: since }, errorCode: { not: null } },
          _count: { errorCode: true },
          orderBy: { _count: { errorCode: 'desc' } },
          take: 12,
        }),
        this.prisma.playbackEvent.aggregate({
          where: { occurredAt: { gte: since }, bufferMs: { not: null } },
          _avg: { bufferMs: true },
          _max: { bufferMs: true },
          _count: { bufferMs: true },
        }),
        this.prisma.playbackEvent.groupBy({
          by: ['provider'],
          where: { occurredAt: { gte: since }, provider: { not: null } },
          _count: { provider: true },
          _avg: { bufferMs: true },
          orderBy: { _count: { provider: 'desc' } },
        }),
        this.prisma.refreshToken.groupBy({
          by: ['userId'],
          where: { lastUsedAt: { gte: since } },
          _count: { userId: true },
        }),
        this.getDatabaseQueryStats(),
      ]);
    const movieIds = views.map((item) => item.movieId);
    const movies = await this.prisma.movie.findMany({
      where: { id: { in: movieIds } },
      select: { id: true, title: true, posterUrl: true },
    });
    return {
      rangeDays: days,
      activeUsers: users.length,
      totalViews: views.reduce((sum, item) => sum + item._count.movieId, 0),
      topMovies: views.map((item) => ({
        ...movies.find((movie) => movie.id === item.movieId),
        id: item.movieId,
        views: item._count.movieId,
      })),
      searches: searches.map((item) => ({
        query: item.normalized,
        count: item._count.normalized,
        averageResults: item._avg.resultCount || 0,
      })),
      playbackErrors: playbackErrors.map((item) => ({
        code: item.errorCode || 'unknown',
        count: item._count.errorCode,
      })),
      buffering: {
        samples: buffers._count.bufferMs,
        averageMs: buffers._avg.bufferMs || 0,
        maxMs: buffers._max.bufferMs || 0,
      },
      providers: providers.map((item) => ({
        provider: item.provider || 'unknown',
        events: item._count.provider,
        averageBufferMs: item._avg.bufferMs || 0,
      })),
      cache: await this.cache.inspectNamespaces(),
      database,
    };
  }

  private async getDatabaseQueryStats() {
    try {
      const extension = await this.prisma.$queryRaw<
        Array<{ installed: boolean; preloaded: boolean }>
      >`
        SELECT
          EXISTS (
            SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
          ) AS installed,
          position(
            'pg_stat_statements' IN current_setting('shared_preload_libraries')
          ) > 0 AS preloaded
      `;
      if (!extension[0]?.installed) {
        return {
          enabled: false,
          reason: 'pg_stat_statements chưa được bật',
          topQueries: [],
        };
      }
      if (!extension[0].preloaded) {
        return {
          enabled: false,
          reason: 'PostgreSQL cần được restart để nạp pg_stat_statements',
          topQueries: [],
        };
      }

      const topQueries = await this.prisma.$queryRaw<
        Array<{
          calls: number;
          totalExecMs: number;
          meanExecMs: number;
          returnedRows: number;
          sharedBlocksHit: number;
          sharedBlocksRead: number;
          tempBlocksWritten: number;
          query: string;
        }>
      >`
        SELECT
          calls::double precision AS "calls",
          total_exec_time::double precision AS "totalExecMs",
          mean_exec_time::double precision AS "meanExecMs",
          rows::double precision AS "returnedRows",
          shared_blks_hit::double precision AS "sharedBlocksHit",
          shared_blks_read::double precision AS "sharedBlocksRead",
          temp_blks_written::double precision AS "tempBlocksWritten",
          left(regexp_replace(query, '\\s+', ' ', 'g'), 240) AS "query"
        FROM pg_stat_statements
        WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
          AND query NOT ILIKE '%pg_stat_statements%'
        ORDER BY total_exec_time DESC
        LIMIT 10
      `;

      const sharedHits = topQueries.reduce((sum, query) => sum + query.sharedBlocksHit, 0);
      const sharedReads = topQueries.reduce((sum, query) => sum + query.sharedBlocksRead, 0);
      return {
        enabled: true,
        reason: null,
        cacheHitRate: sharedHits + sharedReads > 0 ? sharedHits / (sharedHits + sharedReads) : 1,
        topQueries,
      };
    } catch (error) {
      return {
        enabled: false,
        reason:
          error instanceof Error
            ? error.message.slice(0, 240)
            : 'Không thể đọc thống kê PostgreSQL',
        topQueries: [],
      };
    }
  }

  private async monitorSystem() {
    if (this.monitorBusy) return;
    this.monitorBusy = true;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      await this.resolveIncident("database-offline");
      const cache = this.cache.getStats();
      if (cache.backend !== "redis") {
        await this.recordIncident("redis-offline", "Redis đang dùng bộ nhớ dự phòng", new Error("Redis backend unavailable"), "critical");
      } else {
        await this.resolveIncident("redis-offline");
      }
    } catch (error) {
      try {
        await this.recordIncident("database-offline", "PostgreSQL không phản hồi", error, "critical");
      } catch (persistError) {
        this.logger.error(`PostgreSQL incident could not be persisted: ${persistError instanceof Error ? persistError.message : String(persistError)}`);
        await this.sendAlert({
          severity: "critical",
          title: "PostgreSQL không phản hồi",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      this.monitorBusy = false;
    }
  }

  private async recordIncident(fingerprint: string, title: string, reason: unknown, severity = "warning") {
    const message = reason instanceof Error ? reason.message : String(reason);
    const current = await this.prisma.systemIncident.findFirst({ where: { fingerprint, status: { in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED] } } });
    const incident = current
      ? await this.prisma.systemIncident.update({ where: { id: current.id }, data: { occurrenceCount: { increment: 1 }, lastSeenAt: new Date(), message, severity } })
      : await this.prisma.systemIncident.create({ data: { fingerprint, source: "system-monitor", title, message, severity } });
    if (!current) {
      await this.prisma.adminNotification.create({ data: { type: "incident", title, message, severity, link: "/operations" } });
      await this.sendAlert(incident);
    }
  }

  private async resolveIncident(fingerprint: string) {
    await this.prisma.systemIncident.updateMany({
      where: { fingerprint, status: { in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED] } },
      data: { status: IncidentStatus.RESOLVED, resolvedBy: "system-monitor", resolvedAt: new Date() },
    });
  }

  private async sendAlert(incident: { title: string; message: string; severity: string }) {
    const webhook = process.env.ADMIN_ALERT_WEBHOOK_URL;
    if (webhook) {
      await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: `[${incident.severity.toUpperCase()}] ${incident.title}\n${incident.message}` }), signal: AbortSignal.timeout(5000) }).catch(() => undefined);
    }
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChat = process.env.TELEGRAM_ALERT_CHAT_ID;
    if (telegramToken && telegramChat) {
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: telegramChat, text: `[${incident.severity.toUpperCase()}] ${incident.title}\n${incident.message}` }), signal: AbortSignal.timeout(5000) }).catch(() => undefined);
    }
  }

  private async runBackup(id: string) {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      const filename = `${new Date().toISOString().replace(/[:.]/g, "-")}-${id}.dump`;
      const file = this.safeBackupPath(filename);
      await this.prisma.databaseBackup.update({ where: { id }, data: { status: BackupStatus.RUNNING, startedAt: new Date(), filename } });
      await this.runPgCommand("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", ...this.pgConnectionArgs(), "--file", file]);
      // Reject truncated or malformed custom archives before they are advertised
      // as restorable in the admin UI.
      await this.runPgCommand("pg_restore", ["--list", file]);
      const stat = await fs.stat(file);
      const checksum = await this.fileChecksum(file);

      // Upload to Cloudflare R2 / S3 storage
      await this.storage
        .uploadFile(file, `backups/${filename}`, "application/octet-stream")
        .catch((err) => {
          this.logger.warn(`Storage upload for backup ${id} failed: ${err}`);
        });

      await this.prisma.databaseBackup.update({ where: { id }, data: { status: BackupStatus.COMPLETED, fileSizeBytes: stat.size, checksum, finishedAt: new Date() } });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.databaseBackup.update({ where: { id }, data: { status: BackupStatus.FAILED, errorMessage: message, finishedAt: new Date() } }).catch(() => undefined);
      await this.recordIncident(`backup:${id}`, "Sao lưu PostgreSQL thất bại", error, "critical");
    }
  }

  private pgConnectionArgs() {
    const url = this.postgresDirectUrl();
    return [
      '--host',
      url.hostname,
      '--port',
      url.port || '5432',
      '--username',
      decodeURIComponent(url.username),
      '--dbname',
      url.pathname.replace(/^\//, ''),
    ];
  }

  private runPgCommand(command: string, args: string[]) {
    const url = this.postgresDirectUrl();
    return new Promise<void>((resolvePromise, reject) => {
      const child = spawn(this.pgExecutable(command), args, {
        shell: false,
        env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) },
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      let error = '';
      child.stderr.on('data', (chunk) => {
        error = `${error}${chunk}`.slice(-8000);
      });
      child.once('error', reject);
      child.once('exit', (code) =>
        code === 0 ? resolvePromise() : reject(new Error(`${command} exited ${code}: ${error}`)),
      );
    });
  }

  private postgresDirectUrl() {
    return new URL(process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '');
  }

  private pgExecutable(command: string) {
    const executable = process.platform === "win32" ? `${command}.exe` : command;
    const configuredBin = process.env.POSTGRES_BIN;
    if (configuredBin) {
      const configuredPath = resolve(configuredBin, executable);
      if (existsSync(configuredPath)) return configuredPath;
    }
    if (process.platform === "win32") {
      const standardPath = resolve(
        "C:\\Program Files\\PostgreSQL\\17\\bin",
        executable,
      );
      if (existsSync(standardPath)) return standardPath;
    }
    return command;
  }

  private safeBackupPath(filename: string) {
    if (!/^[a-zA-Z0-9._-]+\.dump$/.test(filename)) throw new BadRequestException("Tên backup không hợp lệ");
    const path = resolve(this.backupDir, filename);
    if (!path.startsWith(`${this.backupDir}${sep}`) && path !== this.backupDir) throw new BadRequestException("Đường dẫn backup không hợp lệ");
    return path;
  }

  private fileChecksum(path: string) {
    return new Promise<string>((resolvePromise, reject) => {
      const hash = createHash("sha256");
      const input = createReadStream(path);
      input.on("error", reject);
      input.on("data", (chunk) => hash.update(chunk));
      input.on("end", () => resolvePromise(hash.digest("hex")));
    });
  }

  private log(actor: Actor, action: string, targetId?: string, details?: string) {
    return this.prisma.auditLog.create({
      data: {
        adminId: actor.uid,
        adminEmail: actor.email || "admin@netphim.com",
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        action,
        targetId,
        details,
      },
    });
  }
}
