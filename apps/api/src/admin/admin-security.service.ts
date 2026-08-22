import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisCacheService } from "../redis/redis.service";

@Injectable()
export class AdminSecurityService {
  private readonly logger = new Logger(AdminSecurityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  async getBlockedIps(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search?.trim()) {
      where.OR = [
        { ipAddress: { contains: search.trim(), mode: "insensitive" } },
        { reason: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      (this.prisma as any).ipBlockRule.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      (this.prisma as any).ipBlockRule.count({ where }),
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

  async blockIp(dto: {
    ipAddress: string;
    reason?: string;
    durationHours?: number; // 0 = permanent
    blockedBy: string;
  }) {
    const ip = dto.ipAddress.trim();
    if (!ip) throw new BadRequestException("Địa chỉ IP không được để trống");

    const expiresAt =
      dto.durationHours && dto.durationHours > 0
        ? new Date(Date.now() + dto.durationHours * 3600 * 1000)
        : null;

    const rule = await (this.prisma as any).ipBlockRule.upsert({
      where: { ipAddress: ip },
      create: {
        ipAddress: ip,
        reason: dto.reason || "Bị khóa bởi quản trị viên",
        blockedBy: dto.blockedBy || "Admin",
        expiresAt,
      },
      update: {
        reason: dto.reason || "Bị khóa bởi quản trị viên",
        blockedBy: dto.blockedBy || "Admin",
        expiresAt,
        updatedAt: new Date(),
      },
    });

    // Sync into Redis immediately
    const ttlSeconds = expiresAt
      ? Math.max(Math.floor((expiresAt.getTime() - Date.now()) / 1000), 1)
      : 30 * 24 * 3600; // 30 days default for permanent in Redis

    await this.cache.set(`blacklist:ip:${ip}`, "blocked", ttlSeconds);
    this.logger.warn(`🚫 IP blocked: ${ip} by ${dto.blockedBy} for ${dto.durationHours || "permanent"} hours`);

    return { success: true, rule };
  }

  async unblockIp(idOrIp: string) {
    const rule = await (this.prisma as any).ipBlockRule.findFirst({
      where: {
        OR: [{ id: idOrIp }, { ipAddress: idOrIp }],
      },
    });

    if (!rule) {
      // Clear from redis anyway just in case
      await this.cache.del(`blacklist:ip:${idOrIp}`);
      return { success: true, unblocked: idOrIp };
    }

    await (this.prisma as any).ipBlockRule.delete({
      where: { id: rule.id },
    });

    await this.cache.del(`blacklist:ip:${rule.ipAddress}`);
    this.logger.log(`✅ IP unblocked: ${rule.ipAddress}`);
    return { success: true, unblocked: rule.ipAddress };
  }

  async getSuspiciousIps() {
    // In production, aggregate from recent telemetry or Redis rate-limit events
    // Here we query recent playback/view logs with heavy occurrences
    const recentLogs = await this.prisma.auditLog.findMany({
      where: {
        ipAddress: { not: null },
      },
      select: { ipAddress: true, action: true, createdAt: true, userAgent: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const ipCounts = new Map<string, { count: number; lastAction: string; lastSeen: Date; userAgent?: string | null }>();
    for (const log of recentLogs) {
      if (!log.ipAddress) continue;
      const existing = ipCounts.get(log.ipAddress);
      if (!existing) {
        ipCounts.set(log.ipAddress, {
          count: 1,
          lastAction: log.action,
          lastSeen: log.createdAt,
          userAgent: log.userAgent,
        });
      } else {
        existing.count += 1;
      }
    }

    // Also check which ones are already blocked
    const ips = [...ipCounts.keys()];
    const blocked = await (this.prisma as any).ipBlockRule.findMany({
      where: { ipAddress: { in: ips } },
      select: { ipAddress: true },
    });
    const blockedSet = new Set(blocked.map((b: any) => b.ipAddress));

    return [...ipCounts.entries()].map(([ip, data]) => ({
      ipAddress: ip,
      requestCount: data.count,
      lastAction: data.lastAction,
      lastSeen: data.lastSeen,
      userAgent: data.userAgent,
      isBlocked: blockedSet.has(ip),
    }));
  }
}
