import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

function databaseUrlWithPoolSettings() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set(
        "connection_limit",
        process.env.DATABASE_CONNECTION_LIMIT || "20",
      );
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set(
        "pool_timeout",
        process.env.DATABASE_POOL_TIMEOUT_SECONDS || "10",
      );
    }
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "10");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, "query">
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: { db: { url: databaseUrlWithPoolSettings() } },
      log: [
        { emit: "event", level: "query" },
        { emit: "stdout", level: "warn" },
        { emit: "stdout", level: "error" },
      ],
    });
    const threshold = Math.max(
      25,
      Number(process.env.DATABASE_SLOW_QUERY_MS) ||
        (process.env.NODE_ENV === "production" ? 250 : 100),
    );
    this.$on("query", (event: Prisma.QueryEvent) => {
      if (event.duration < threshold) return;
      const query = event.query.replace(/\s+/g, " ").trim().slice(0, 1200);
      this.logger.warn(
        `Slow query ${event.duration}ms target=${event.target}: ${query}`,
      );
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
