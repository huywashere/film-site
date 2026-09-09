import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisCacheService } from "../redis/redis.service";
import { AdminService } from "./admin.service";

@Injectable()
export class AdminSyncSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminSyncSchedulerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisCacheService,
    private readonly admin: AdminService,
  ) {}

  async onModuleInit() {
    // Check initial seed schedules
    await this.seedDefaultSchedules();

    // Start background ticker (every 60 seconds)
    this.timer = setInterval(() => {
      void this.tickSchedules();
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async seedDefaultSchedules() {
    const count = await this.prisma.syncSchedule.count();
    if (count === 0) {
      const now = new Date();
      await this.prisma.syncSchedule.createMany({
        data: [
          {
            name: "Cập nhật KKPhim tự động (Mỗi 15 phút)",
            source: "kkphim",
            cron: "*/15 * * * *",
            pages: 3,
            enabled: true,
            nextRunAt: new Date(now.getTime() + 15 * 60 * 1000),
            createdBy: "System",
          },
          {
            name: "Đồng bộ NguồnC phim mới (Mỗi 1 giờ)",
            source: "nguonc",
            cron: "0 * * * *",
            pages: 5,
            enabled: true,
            nextRunAt: new Date(now.getTime() + 60 * 60 * 1000),
            createdBy: "System",
          },
        ],
      });
      this.logger.log("🌱 Default sync schedules seeded");
    }
  }

  async getSchedules() {
    return this.prisma.syncSchedule.findMany({
      orderBy: { createdAt: "asc" },
    });
  }

  async createSchedule(dto: {
    name: string;
    source: string;
    cron: string;
    pages: number;
    enabled?: boolean;
    createdBy?: string;
  }) {
    const nextRunAt = this.calculateNextRun(dto.cron);
    return this.prisma.syncSchedule.create({
      data: {
        name: dto.name,
        source: dto.source.toLowerCase(),
        cron: dto.cron,
        pages: dto.pages || 5,
        enabled: dto.enabled ?? true,
        nextRunAt,
        createdBy: dto.createdBy || "Admin",
      },
    });
  }

  async updateSchedule(
    id: string,
    dto: Partial<{
      name: string;
      source: string;
      cron: string;
      pages: number;
      enabled: boolean;
    }>,
  ) {
    const nextRunAt = dto.cron ? this.calculateNextRun(dto.cron) : undefined;
    return this.prisma.syncSchedule.update({
      where: { id },
      data: {
        ...dto,
        ...(nextRunAt ? { nextRunAt } : {}),
      },
    });
  }

  async toggleSchedule(id: string) {
    const schedule = await this.prisma.syncSchedule.findUnique({ where: { id } });
    if (!schedule) throw new Error("Không tìm thấy lịch trình");

    const updated = await this.prisma.syncSchedule.update({
      where: { id },
      data: {
        enabled: !schedule.enabled,
        nextRunAt: !schedule.enabled ? this.calculateNextRun(schedule.cron) : schedule.nextRunAt,
      },
    });
    return updated;
  }

  async deleteSchedule(id: string) {
    return this.prisma.syncSchedule.delete({ where: { id } });
  }

  async runScheduleNow(id: string, requestedBy = "Admin") {
    const schedule = await this.prisma.syncSchedule.findUnique({ where: { id } });
    if (!schedule) throw new Error("Không tìm thấy lịch trình");

    return this.executeSync(schedule, requestedBy);
  }

  async getStats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [todayJobs, latestJobs, activeSchedulesCount] = await Promise.all([
      this.prisma.syncJob.findMany({
        where: { createdAt: { gte: startOfDay } },
      }),
      this.prisma.syncJob.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.syncSchedule.count({ where: { enabled: true } }),
    ]);

    const totalProcessedToday = todayJobs.reduce((sum, j) => sum + j.processedCount, 0);
    const totalCreatedToday = todayJobs.reduce((sum, j) => sum + j.createdCount, 0);
    const totalUpdatedToday = todayJobs.reduce((sum, j) => sum + j.updatedCount, 0);

    return {
      todayStats: {
        jobsCount: todayJobs.length,
        processedItems: totalProcessedToday,
        createdItems: totalCreatedToday,
        updatedItems: totalUpdatedToday,
      },
      activeSchedulesCount,
      recentJobs: latestJobs,
    };
  }

  private async tickSchedules() {
    if (this.isProcessing) return;

    // Acquire global distributed lock across pods for the scheduler ticker (duration 50s)
    const acquired = await this.redis.acquireLock("sync_scheduler_tick", 50_000);
    if (!acquired) {
      this.logger.debug("Another pod is currently processing sync schedules, skipping tick.");
      return;
    }

    try {
      const now = new Date();
      const dueSchedules = await this.prisma.syncSchedule.findMany({
        where: {
          enabled: true,
          nextRunAt: { lte: now },
        },
      });

      for (const schedule of dueSchedules) {
        await this.executeSync(schedule, "Cron-Scheduler");
      }
    } catch (err) {
      this.logger.error("Error running sync schedules ticker:", err);
    } finally {
      await this.redis.releaseLock("sync_scheduler_tick");
    }
  }

  private async executeSync(schedule: any, requestedBy: string) {
    const lockKey = `sync_source:${schedule.source}`;
    const sourceLocked = await this.redis.acquireLock(lockKey, 10 * 60 * 1000);
    if (!sourceLocked) {
      this.logger.warn(
        `Source ${schedule.source} is already being synced by another process, skipping.`,
      );
      return {
        success: false,
        message: `Sync already in progress for ${schedule.source}`,
      };
    }

    this.isProcessing = true;
    try {
      const job = await this.admin.triggerManualSync(
        schedule.source,
        { uid: "sync-scheduler", email: requestedBy },
        schedule.pages,
      );
      const nextRunAt = this.calculateNextRun(schedule.cron);
      await this.prisma.syncSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: new Date(),
          lastJobId: job.id,
          nextRunAt,
        },
      });
      this.logger.log(
        `Queued scheduled sync ${job.id} for ${schedule.source}`,
      );
      return { success: true, jobId: job.id };
    } finally {
      this.isProcessing = false;
      await this.redis.releaseLock(lockKey);
    }
  }
  private calculateNextRun(cron: string): Date {
    const now = Date.now();
    // Simple interval heuristic for common crons
    if (cron.includes("15")) return new Date(now + 15 * 60 * 1000);
    if (cron.includes("30")) return new Date(now + 30 * 60 * 1000);
    if (cron.includes("12") || cron.includes("*/12")) return new Date(now + 12 * 3600 * 1000);
    if (cron.includes("6") || cron.includes("*/6")) return new Date(now + 6 * 3600 * 1000);
    if (cron.startsWith("0 0") || cron.includes("24")) return new Date(now + 24 * 3600 * 1000);
    // default 1 hour
    return new Date(now + 60 * 60 * 1000);
  }
}
