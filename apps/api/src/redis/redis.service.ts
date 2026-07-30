import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: Redis | null = null;
  private isDisabled = false;

  /** In-memory fallback when Redis is offline */
  private readonly mem = new Map<
    string,
    { value: string; expiresAt: number }
  >();

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.get<string>(
      "REDIS_URL",
      "redis://localhost:6379",
    );
    this.connect(redisUrl);
  }

  private connect(redisUrl: string) {
    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 500,
        lazyConnect: false,
      });

      this.client.on("connect", () => {
        this.logger.log("✅ Redis connected – caching active");
        this.isDisabled = false;
      });

      this.client.on("error", () => {
        if (!this.isDisabled) {
          this.logger.warn("⚡ Cache status: In-Memory active (Redis offline)");
          this.isDisabled = true;
          this.client?.disconnect();
          this.client = null;
        }
      });
    } catch {
      this.logger.warn("⚡ Cache status: In-Memory active (Redis offline)");
      this.isDisabled = true;
      this.client = null;
    }
  }

  private get isReady(): boolean {
    return (
      !this.isDisabled && this.client !== null && this.client.status === "ready"
    );
  }

  /** Get a cached value. Returns null on miss or Redis offline. */
  async get(key: string): Promise<string | null> {
    if (this.isReady) {
      try {
        return await this.client!.get(key);
      } catch {
        // fall through to memory
      }
    }

    // In-memory fallback
    const rec = this.mem.get(key);
    if (rec && rec.expiresAt > Date.now()) return rec.value;
    if (rec) this.mem.delete(key);
    return null;
  }

  /** Set a value with TTL in seconds. */
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (this.isReady) {
      try {
        await this.client!.set(key, value, "EX", ttlSeconds);
        return;
      } catch {
        // fall through to memory
      }
    }

    // In-memory fallback
    this.mem.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });

    // Evict old entries periodically (keep mem under 500 keys)
    if (this.mem.size > 500) {
      const now = Date.now();
      for (const [k, v] of this.mem) {
        if (v.expiresAt <= now) this.mem.delete(k);
        if (this.mem.size <= 400) break;
      }
    }
  }

  /** Delete a key from cache. */
  async del(key: string): Promise<void> {
    this.mem.delete(key);
    if (this.isReady) {
      try {
        await this.client!.del(key);
      } catch {
        // ignore
      }
    }
  }

  /** Helper: get parsed JSON from cache */
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /** Helper: set serialized JSON in cache */
  async setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => this.client?.disconnect());
    }
  }
}
