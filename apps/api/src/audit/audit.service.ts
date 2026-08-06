import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(params: {
    adminId: string;
    adminEmail?: string;
    action: string;
    targetId?: string;
    details?: string;
    // FIX #11: Thêm IP và User-Agent để truy vết forensics
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        adminId: params.adminId,
        adminEmail: params.adminEmail || "admin@cineverse.com",
        action: params.action,
        targetId: params.targetId,
        details: params.details,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  async getRecentLogs(limit = 20) {
    return this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }
}
