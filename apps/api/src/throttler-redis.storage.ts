import { ThrottlerStorage } from "@nestjs/throttler";
import Redis from "ioredis";

export interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

export class RedisThrottlerStorage implements ThrottlerStorage {
  private redis: Redis | null = null;
  private isRedisDisabled = false;
  private readonly memoryFallback = new Map<
    string,
    { count: number; expiresAt: number }
  >();

  constructor(redisUrl: string) {
    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 500, // Fail fast if Redis server is down
      });
      this.redis.on("error", (_err) => {
        console.warn(
          "Redis connection failed on backend, disabling Redis throttler storage.",
        );
        this.isRedisDisabled = true;
        if (this.redis) {
          try {
            this.redis.disconnect();
          } catch (e) {
            void e;
          }
          this.redis = null;
        }
      });
    } catch (e) {
      this.isRedisDisabled = true;
      this.redis = null;
    }
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    // Check if Redis is online/ready and not disabled
    if (!this.isRedisDisabled && this.redis && this.redis.status === "ready") {
      try {
        const multi = this.redis.multi();
        multi.incr(key);
        multi.pttl(key);

        const results = await multi.exec();
        if (results) {
          const totalHits = results[0][1] as number;
          let timeToExpireMs = results[1][1] as number;

          if (timeToExpireMs < 0) {
            await this.redis.pexpire(key, ttl);
            timeToExpireMs = ttl;
          }

          const timeToExpire = Math.max(0, Math.ceil(timeToExpireMs / 1000));
          const isBlocked = totalHits > limit;
          const timeToBlockExpire = isBlocked
            ? Math.max(0, Math.ceil(blockDuration / 1000))
            : 0;

          return {
            totalHits,
            timeToExpire,
            isBlocked,
            timeToBlockExpire,
          };
        }
      } catch (err) {
        // Fall back to in-memory on error
      }
    }

    // In-memory fallback
    const now = Date.now();
    const record = this.memoryFallback.get(key);

    if (!record || record.expiresAt <= now) {
      const expiresAt = now + ttl;
      this.memoryFallback.set(key, { count: 1, expiresAt });
      return {
        totalHits: 1,
        timeToExpire: Math.max(0, Math.ceil(ttl / 1000)),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }

    record.count += 1;
    const totalHits = record.count;
    const timeToExpire = Math.max(
      0,
      Math.ceil((record.expiresAt - now) / 1000),
    );
    const isBlocked = totalHits > limit;
    const timeToBlockExpire = isBlocked
      ? Math.max(0, Math.ceil(blockDuration / 1000))
      : 0;

    return {
      totalHits,
      timeToExpire,
      isBlocked,
      timeToBlockExpire,
    };
  }
}
