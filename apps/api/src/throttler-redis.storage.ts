import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

export interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly maxMemoryKeys = 20_000;
  private readonly redisUrl: string;
  private redis: Redis | null = null;
  private redisUnavailableUntil = 0;
  private readonly memoryFallback = new Map<string, { count: number; expiresAt: number }>();

  constructor(redisUrl: string) {
    this.redisUrl = redisUrl;
    this.redis = this.createRedisClient();
  }

  private createRedisClient(): Redis | null {
    if (!this.redisUrl || Date.now() < this.redisUnavailableUntil) return null;
    try {
      const client = new Redis(this.redisUrl, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 500,
      });
      client.on('error', () => {
        this.markRedisUnavailable(client);
      });
      return client;
    } catch (e) {
      void e;
      this.redisUnavailableUntil = Date.now() + 30_000;
      return null;
    }
  }

  private markRedisUnavailable(client: Redis) {
    this.redisUnavailableUntil = Date.now() + 30_000;
    if (this.redis === client) this.redis = null;
    try {
      client.disconnect();
    } catch {
      // The in-memory limiter remains active during the short Redis cooldown.
    }
  }

  private getRedisClient(): Redis | null {
    if (Date.now() < this.redisUnavailableUntil) return null;
    if (!this.redis) this.redis = this.createRedisClient();
    return this.redis;
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redis = this.getRedisClient();
    if (redis) {
      try {
        if (redis.status === 'wait') await redis.connect();
        const result = (await redis.eval(
          `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
`,
          1,
          `netphim:throttle:${throttlerName}:${key}`,
          String(ttl),
        )) as [number, number];

        const totalHits = Number(result[0]);
        const timeToExpireMs = Number(result[1]);

        const timeToExpire = Math.max(0, Math.ceil(timeToExpireMs / 1000));
        const isBlocked = totalHits > limit;
        const timeToBlockExpire = isBlocked ? Math.max(0, Math.ceil(blockDuration / 1000)) : 0;

        return {
          totalHits,
          timeToExpire,
          isBlocked,
          timeToBlockExpire,
        };
      } catch {
        this.markRedisUnavailable(redis);
      }
    }

    // In-memory fallback
    const now = Date.now();
    if (this.memoryFallback.size >= this.maxMemoryKeys) {
      for (const [storedKey, stored] of this.memoryFallback) {
        if (stored.expiresAt <= now) this.memoryFallback.delete(storedKey);
      }
      while (this.memoryFallback.size >= this.maxMemoryKeys) {
        const oldest = this.memoryFallback.keys().next().value;
        if (!oldest) break;
        this.memoryFallback.delete(oldest);
      }
    }
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
    const timeToExpire = Math.max(0, Math.ceil((record.expiresAt - now) / 1000));
    const isBlocked = totalHits > limit;
    const timeToBlockExpire = isBlocked ? Math.max(0, Math.ceil(blockDuration / 1000)) : 0;

    return {
      totalHits,
      timeToExpire,
      isBlocked,
      timeToBlockExpire,
    };
  }
}
