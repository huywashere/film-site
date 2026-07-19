import { NextRequest, NextResponse } from 'next/server';
import { Redis } from 'ioredis';
import { CircuitBreaker, CircuitOpenError } from '@/lib/circuit-breaker';

// ── Circuit Breaker ───────────────────────────────────────────────────────────
const kkphimCB = new CircuitBreaker({ name: 'KKPhim', failureThreshold: 3, recoveryTimeoutMs: 30_000 });

const KKPHIM_BASE = process.env.KKPHIM_API_BASE || 'https://phimapi.com';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// ── Redis client (shared across requests in the same worker) ─────────────────
let redis: Redis | null = null;
let isRedisDisabled = false;

function getRedisClient(): Redis | null {
  if (isRedisDisabled) return null;
  if (redis && redis.status === 'ready') return redis;
  if (redis) return redis; // still connecting

  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 500,
    });
    redis.on('error', () => {
      if (!isRedisDisabled) {
        console.warn('[kkphim-proxy] Redis offline – falling back to in-memory cache');
        isRedisDisabled = true;
        redis?.disconnect();
        redis = null;
      }
    });
  } catch {
    isRedisDisabled = true;
    redis = null;
  }
  return redis;
}

// ── In-memory fallback cache (used when Redis is offline) ────────────────────
const memCache = new Map<string, { data: unknown; expiry: number }>();
const MEM_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** TTL in seconds per path prefix */
function getTtl(path: string): number {
  if (path.includes('phim-moi-cap-nhat')) return 120; // Latest: 2 min
  if (path.includes('phim/') || path.includes('phim-')) return 600; // Detail: 10 min
  if (path.includes('the-loai') || path.includes('quoc-gia') || path.includes('nam-phat-hanh'))
    return 3600; // Taxonomies: 1 hr
  if (path.includes('tim-kiem')) return 60; // Search: 1 min
  return 300; // Default: 5 min
}

// ── Origin validation ────────────────────────────────────────────────────────
function isRequestAllowed(request: NextRequest): boolean {
  const referer = request.headers.get('referer');
  const origin = request.headers.get('origin');
  const host = request.headers.get('host') || 'localhost:3000';

  if (!referer && !origin) return false;

  try {
    if (referer && new URL(referer).host === host) return true;
    if (origin && new URL(origin).host === host) return true;
  } catch {
    // URL parsing failed
  }

  return false;
}

// ── Route handler ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  if (!isRequestAllowed(request)) {
    return NextResponse.json(
      { error: 'Truy cập bị chặn (403 Forbidden) - Yêu cầu không hợp lệ' },
      { status: 403 },
    );
  }

  const path = params.path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const upstreamUrl = `${KKPHIM_BASE}/${path}${searchParams ? `?${searchParams}` : ''}`;
  const cacheKey = `kkphim:${upstreamUrl}`;
  const ttlSeconds = getTtl(path);
  const client = getRedisClient();

  // ── 1. Redis cache check ─────────────────────────────────────────
  if (client && client.status === 'ready') {
    try {
      const raw = await client.get(cacheKey);
      if (raw) {
        return NextResponse.json(JSON.parse(raw), {
          headers: { 'X-Cache': 'HIT-REDIS' },
        });
      }
    } catch {
      // fall through to in-memory
    }
  }

  // ── 2. In-memory cache check ─────────────────────────────────────
  const memEntry = memCache.get(cacheKey);
  if (memEntry && memEntry.expiry > Date.now()) {
    return NextResponse.json(memEntry.data, {
      headers: { 'X-Cache': 'HIT-MEMORY' },
    });
  }

  // ── 3. Fetch from KKPhim upstream (via circuit breaker) ──────────────────
  try {
    const data = await kkphimCB.execute(async () => {
      const res = await fetch(upstreamUrl, {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(8000), // 8s hard timeout
      });

      if (!res.ok) {
        throw new Error(`Upstream returned ${res.status}`);
      }

      return res.json();
    });

    // ── 4. Save to Redis ─────────────────────────────────────────
    if (client && client.status === 'ready') {
      client.set(cacheKey, JSON.stringify(data), 'EX', ttlSeconds).catch(() => {
        // non-blocking – ignore write errors
      });
    }

    // ── 5. Save to in-memory fallback ────────────────────────────
    memCache.set(cacheKey, { data, expiry: Date.now() + MEM_TTL_MS });

    // Evict stale in-memory entries if > 200 keys
    if (memCache.size > 200) {
      const now = Date.now();
      memCache.forEach((v, k) => {
        if (v.expiry <= now) memCache.delete(k);
      });
    }

    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } });
  } catch (err: unknown) {
    if (err instanceof CircuitOpenError) {
      if (memEntry) {
        return NextResponse.json(memEntry.data, { headers: { 'X-Cache': 'STALE-CB-OPEN' } });
      }
      return NextResponse.json(
        { error: 'Nguồn KKPhim tạm thời gián đoạn, vui lòng thử lại sau.', circuitOpen: true },
        { status: 503 },
      );
    }

    const msg = err instanceof Error ? err.message : String(err);
    console.error('[kkphim-proxy] fetch error:', msg);

    // Serve stale memory data on upstream failure
    if (memEntry) {
      return NextResponse.json(memEntry.data, {
        headers: { 'X-Cache': 'STALE-MEMORY' },
      });
    }

    return NextResponse.json({ error: 'Lỗi kết nối KKPhim API' }, { status: 500 });
  }
}
