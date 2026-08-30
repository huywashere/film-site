import { Inject, Injectable, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";

@Injectable({ scope: Scope.REQUEST })
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

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
        adminEmail: params.adminEmail || "admin@netphim.com",
        action: params.action,
        targetId: params.targetId,
        details: params.details,
        ipAddress:
          params.ipAddress ||
          String(this.request.headers["x-forwarded-for"] || "")
            .split(",")[0]
            .trim() ||
          this.request.ip,
        userAgent:
          params.userAgent ||
          String(this.request.headers["user-agent"] || "").slice(0, 1000),
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
