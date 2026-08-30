import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === "development"
          ? [
              { emit: "event", level: "query" },
              { emit: "stdout", level: "warn" },
              { emit: "stdout", level: "error" },
            ]
          : [{ emit: "stdout", level: "error" }],
    });
  }

  async onModuleInit() {
    let retries = 3;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log("✅ PostgreSQL connection established via Prisma");
        break;
      } catch (err) {
        retries -= 1;
        this.logger.warn(
          `⚠️ PostgreSQL connection attempt failed (${3 - retries}/3): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        if (retries === 0) throw err;
        await new Promise((res) => setTimeout(res, 2000));
      }
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log("🔌 PostgreSQL connection closed cleanly");
    } catch {
      // ignore
    }
  }
}
