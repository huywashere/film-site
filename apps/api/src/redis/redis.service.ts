import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: Redis | null = null;
  private isDisabled = false;
  private readonly stats = { hits: 0, misses: 0, sets: 0, errors: 0 };

  /** In-memory fallback when Redis is offline */
  private readonly mem = new Map<
    string,
    { value: string; expiresAt: number }
  >();
  /** Coalesces concurrent cache misses inside this API process. */
  private readonly inFlight = new Map<string, Promise<unknown>>();

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
        const value = await this.client!.get(key);
        if (value !== null) {
          this.stats.hits += 1;
          return value;
        }
      } catch {
        this.stats.errors += 1;
        // fall through to memory
      }
    }

    // In-memory fallback
    const rec = this.mem.get(key);
    if (rec && rec.expiresAt > Date.now()) {
      this.stats.hits += 1;
      return rec.value;
    }
    if (rec) this.mem.delete(key);
    this.stats.misses += 1;
    return null;
  }

  /** Set a value with TTL in seconds. */
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.stats.sets += 1;
    if (this.isReady) {
      try {
        await this.client!.set(key, value, "EX", ttlSeconds);
        return;
      } catch {
        this.stats.errors += 1;
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
      while (this.mem.size > 500) {
        const oldest = this.mem.keys().next().value;
        if (!oldest) break;
        this.mem.delete(oldest);
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

  /** Get or compute cached value with SWR dual-tier fallback */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = 300,
  ): Promise<T> {
    const cached = await this.getJson<T>(key);
    if (cached !== null) return cached;

    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) return existing;
    if (this.inFlight.size >= 500) {
      return factory();
    }

    const pending = (async () => {
      const fresh = await factory();
      if (fresh !== null && fresh !== undefined) {
        await this.setJson(key, fresh, ttlSeconds);
      }
      return fresh;
    })().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, pending);
    return pending;
  }

  getStats() {
    const lookups = this.stats.hits + this.stats.misses;
    return {
      backend: this.isReady ? "redis" : "memory",
      ...this.stats,
      hitRate: lookups > 0 ? this.stats.hits / lookups : 0,
      memoryEntries: this.mem.size,
    };
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => this.client?.disconnect());
    }
  }
}
