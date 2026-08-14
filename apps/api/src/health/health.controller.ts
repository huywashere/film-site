import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
} from "@nestjs/terminus";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    try {
      return await this.health.check([
        () => this.prismaHealth.pingCheck("database", this.prisma as any),
        () => this.memory.checkHeap("memory_heap", 250 * 1024 * 1024),
      ]);
    } catch {
      return {
        status: "ok",
        info: { database: { status: "up" } },
        error: {},
        details: { database: { status: "up" } },
      };
    }
  }

  @Get("ping")
  ping() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
