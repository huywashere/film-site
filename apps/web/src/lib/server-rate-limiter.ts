import 'server-only';

import { Redis } from 'ioredis';
import {
  checkHlsProxyRateLimit,
  checkImageProxyRateLimit,
  type RateLimitResult,
} from '@/lib/rate-limiter';

let redis: Redis | null = null;
let redisUnavailableUntil = 0;

function redisClient(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url || Date.now() < redisUnavailableUntil) return null;
  if (redis) return redis;

  try {
    const client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 500,
      enableOfflineQueue: false,
    });
    client.on('error', () => {
      redisUnavailableUntil = Date.now() + 30_000;
      if (redis === client) redis = null;
      try {
        client.disconnect();
      } catch {
        // The bounded in-memory limiter handles the short Redis cooldown.
      }
    });
    redis = client;
    return client;
  } catch {
    redisUnavailableUntil = Date.now() + 30_000;
    redis = null;
    return null;
  }
}

const FIXED_WINDOW_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
`;

async function distributedRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  fallback: () => RateLimitResult,
): Promise<RateLimitResult> {
  if (process.env.NODE_ENV === 'development') return fallback();

  const client = redisClient();
  if (!client) return fallback();

  try {
    if (client.status === 'wait') await client.connect();
    const bucket = Math.floor(Date.now() / windowMs);
    const result = (await client.eval(
      FIXED_WINDOW_SCRIPT,
      1,
      `netphim:ratelimit:${key}:${bucket}`,
      String(windowMs),
    )) as [number, number];
    const count = Number(result[0]);
    const ttl = Number(result[1]);
    return {
      allowed: count <= limit,
      retryAfterSeconds: count <= limit ? 0 : Math.max(1, Math.ceil(ttl / 1000)),
    };
  } catch {
    redisUnavailableUntil = Date.now() + 30_000;
    redis?.disconnect();
    redis = null;
    return fallback();
  }
}

export function checkImageProxyRateLimitDistributed(identifier: string) {
  return distributedRateLimit(`image:${identifier}`, 2_000, 60_000, () =>
    checkImageProxyRateLimit(identifier),
  );
}

export function checkHlsProxyRateLimitDistributed(identifier: string) {
  return distributedRateLimit(`hls:${identifier}`, 3_000, 60_000, () =>
    checkHlsProxyRateLimit(identifier),
  );
}
