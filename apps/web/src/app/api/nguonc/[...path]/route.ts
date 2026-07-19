import { NextRequest, NextResponse } from 'next/server';
import { Redis } from 'ioredis';
import { CircuitBreaker, CircuitOpenError } from '@/lib/circuit-breaker';

/**
 * NguonC API Proxy — Source C (https://phim.nguonc.com)
 *
 * NguonC API endpoints:
 *   GET /api/films/{type}?page={n}    — Film list by type (phim-moi-cap-nhat, phim-le, phim-bo, tv-shows)
 *   GET /api/film/{slug}              — Film detail + episodes
 *   GET /api/films/search?keyword={q}&page={n} — Search
 *   GET /api/categories               — Categories list
 *
 * Field mapping vs KKPhim/OPhim:
 *   name         → name           ✅ same
 *   slug         → slug           ✅ same
 *   thumb_url    → thumb_url      ✅ same
 *   poster_url   → poster_url     ✅ same
 *   original_name → origin_name  ⚠️ different key
 *   current_episode → episode_current ⚠️ different key
 *   language     → lang           ⚠️ different key
 *   casts        → actor (array vs comma-string) ⚠️ different format
 */

// ── Circuit Breaker ───────────────────────────────────────────────────────────
const nguoncCB = new CircuitBreaker({ name: 'NguonC', failureThreshold: 3, recoveryTimeoutMs: 30_000 });


const NGUONC_BASE = process.env.NGUONC_API_BASE || 'https://phim.nguonc.com/api';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// ── Redis client ─────────────────────────────────────────────────────────────
let redis: Redis | null = null;
let isRedisDisabled = false;

function getRedisClient(): Redis | null {
  if (isRedisDisabled) return null;
  if (redis && redis.status === 'ready') return redis;
  if (redis) return redis;

  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 500,
    });
    redis.on('error', () => {
      if (!isRedisDisabled) {
        console.warn('[nguonc-proxy] Redis offline – falling back to in-memory cache');
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

// ── In-memory fallback cache ─────────────────────────────────────────────────
const memCache = new Map<string, { data: unknown; expiry: number }>();
const MEM_TTL_MS = 10 * 60 * 1000;

/** Path-aware TTL in seconds */
function getTtl(path: string): number {
  if (path === 'films/phim-moi-cap-nhat') return 120; // Latest: 2 min
  if (path.startsWith('film/')) return 600; // Detail: 10 min
  if (path === 'categories') return 3600; // Taxonomy: 1 hr
  if (path.includes('search')) return 60; // Search: 1 min
  return 300; // Default: 5 min
}

// ── Origin validation ─────────────────────────────────────────────────────────
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

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  if (!isRequestAllowed(request)) {
    return NextResponse.json(
      { error: 'Truy cập bị chặn (403) – Yêu cầu không hợp lệ' },
      { status: 403 },
    );
  }

  const path = params.path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const upstreamUrl = `${NGUONC_BASE}/${path}${searchParams ? `?${searchParams}` : ''}`;
  const cacheKey = `nguonc:${upstreamUrl}`;
  const ttlSeconds = getTtl(path);
  const client = getRedisClient();

  // ── 1. Redis cache ────────────────────────────────────────────────────────
  if (client && client.status === 'ready') {
    try {
      const raw = await client.get(cacheKey);
      if (raw) {
        return NextResponse.json(JSON.parse(raw), {
          headers: { 'X-Cache': 'HIT-REDIS', 'X-Source': 'NguonC' },
        });
      }
    } catch {
      // fall through to in-memory
    }
  }

  // ── 2. In-memory cache ────────────────────────────────────────────────────
  const memEntry = memCache.get(cacheKey);
  if (memEntry && memEntry.expiry > Date.now()) {
    return NextResponse.json(memEntry.data, {
      headers: { 'X-Cache': 'HIT-MEMORY', 'X-Source': 'NguonC' },
    });
  }

  // ── 3. Fetch from NguonC upstream (via circuit breaker) ────────────────────
  try {
    const rawData = await nguoncCB.execute(async () => {
      const res = await fetch(upstreamUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(8000), // 8s hard timeout
      });

      if (!res.ok) {
        throw new Error(`Upstream returned ${res.status}`);
      }

      return res.json();
    });

    // ── Normalize fields to match KKPhim/OPhim schema ─────────────────
    const data = normalizeNguonC(rawData, path);

    // ── 4. Save to Redis (non-blocking) ───────────────────────────
    if (client && client.status === 'ready') {
      client.set(cacheKey, JSON.stringify(data), 'EX', ttlSeconds).catch(() => {});
    }

    // ── 5. Save to in-memory ────────────────────────────────────
    memCache.set(cacheKey, { data, expiry: Date.now() + MEM_TTL_MS });

    // Evict stale entries
    if (memCache.size > 150) {
      const now = Date.now();
      memCache.forEach((v, k) => {
        if (v.expiry <= now) memCache.delete(k);
      });
    }

    return NextResponse.json(data, {
      headers: { 'X-Cache': 'MISS', 'X-Source': 'NguonC' },
    });
  } catch (err: unknown) {
    if (err instanceof CircuitOpenError) {
      if (memEntry) {
        return NextResponse.json(memEntry.data, { headers: { 'X-Cache': 'STALE-CB-OPEN', 'X-Source': 'NguonC' } });
      }
      return NextResponse.json(
        { error: 'Nguồn NguonC tạm thời gián đoạn, vui lòng thử lại sau.', circuitOpen: true },
        { status: 503 },
      );
    }

    const msg = err instanceof Error ? err.message : String(err);
    console.error('[nguonc-proxy] fetch error:', msg);

    if (memEntry) {
      return NextResponse.json(memEntry.data, {
        headers: { 'X-Cache': 'STALE-MEMORY', 'X-Source': 'NguonC' },
      });
    }

    return NextResponse.json({ error: 'Lỗi kết nối NguonC API' }, { status: 500 });
  }
}

/**
 * Normalize NguonC response to match KKPhim/OPhim schema.
 *
 * Real NguonC structure (discovered by inspection):
 *   GET /api/film/{slug}  → { status, movie: { ...fields, episodes: [...] } }
 *   movie.episodes[i]     → { server_name, items: [{ name, slug, embed }] }
 *
 * vs KKPhim/OPhim schema:
 *   { status, movie, episodes: [{ server_name, server_data: [{ name, slug, link_embed, link_m3u8 }] }] }
 *
 * Also:
 *   original_name → origin_name
 *   current_episode → episode_current
 *   language → lang
 *   casts (comma string) → actor (array)
 *   category → category (normalize slug → {id, name, slug})
 */
function normalizeNguonC(raw: any, path: string): any {
  if (!raw) return raw;

  // ── Film list response: { status, paginate, items }
  if (raw.items && Array.isArray(raw.items)) {
    return {
      ...raw,
      items: raw.items.map(normalizeFilmItem),
    };
  }

  // ── Film detail response: { status, movie: { ...info, episodes: [...] } }
  if (raw.movie) {
    const rawEpisodes = raw.movie.episodes ?? [];
    // Remove episodes from movie object to avoid duplication
    const { episodes: _ep, ...movieFields } = raw.movie;
    return {
      status: raw.status,
      movie: normalizeFilmItem(movieFields),
      // Lift episodes to top level and normalize
      episodes: normalizeEpisodes(rawEpisodes),
    };
  }

  return raw;
}

function normalizeFilmItem(film: any): any {
  if (!film) return film;

  // Normalize category array: NguonC may return [{id, name, slug}] or strings
  const rawCategories: any[] = Array.isArray(film.category) ? film.category : [];
  const category = rawCategories.map((c: any, idx: number) =>
    typeof c === 'string'
      ? { id: String(idx), name: c, slug: c.toLowerCase().replace(/\s+/g, '-') }
      : { id: String(c.id ?? idx), name: c.name ?? c, slug: c.slug ?? '' },
  );

  return {
    ...film,
    // Field name normalization
    origin_name: film.original_name ?? film.origin_name ?? '',
    episode_current: film.current_episode ?? film.episode_current ?? '',
    lang: film.language ?? film.lang ?? '',
    // Convert comma-string casts to array
    actor:
      typeof film.casts === 'string'
        ? film.casts
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : Array.isArray(film.actor)
          ? film.actor
          : [],
    // Director as array
    director: film.director
      ? typeof film.director === 'string'
        ? film.director
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : film.director
      : [],
    // Normalized category
    category,
    // Mark source
    _source: 'NguonC',
  };
}

function normalizeEpisodes(episodes: any[]): any[] {
  if (!Array.isArray(episodes)) return [];

  return episodes.map((server: any) => ({
    server_name: server.server_name ?? 'NguonC',
    // NguonC uses 'items', KKPhim/OPhim use 'server_data'
    server_data: Array.isArray(server.items)
      ? server.items.map((ep: any) => ({
          name: ep.name,
          slug: ep.slug,
          // NguonC uses 'embed', map to link_embed
          link_embed: ep.embed ?? ep.link_embed ?? '',
          // NguonC doesn't provide m3u8 streams directly
          link_m3u8: ep.link_m3u8 ?? '',
        }))
      : [],
  }));
}
