/**
 * High-performance Client & Server Rate Limiter (Sliding Window Algorithm)
 * Protects APIs, Forms, Auth, Comments & Watch Party from Spam and Abuse.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const storage = new Map<string, RateLimitRecord>();

/** Hard cap on tracked keys so a spray of unique keys can't exhaust memory. */
const MAX_TRACKED_KEYS = 20_000;
/** Sweep expired keys at most this often. */
const SWEEP_INTERVAL_MS = 60_000;
/** Longest window any limiter below uses — keys older than this are dead. */
const MAX_WINDOW_MS = 15 * 60_000;

let lastSweepAt = 0;

/**
 * Drop keys whose newest timestamp fell out of the longest window.
 *
 * Without this the Map grows forever: every distinct client IP that ever hit
 * the app stays resident, which is a slow memory-exhaustion vector on a
 * long-lived server process.
 */
function sweepExpiredKeys(now: number) {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS && storage.size < MAX_TRACKED_KEYS) {
    return;
  }
  lastSweepAt = now;

  storage.forEach((record, key) => {
    const newest = record.timestamps[record.timestamps.length - 1] ?? 0;
    if (now - newest > MAX_WINDOW_MS) storage.delete(key);
  });

  // Still oversized after sweeping (sustained distributed abuse): evict the
  // oldest insertions. Map preserves insertion order, so this is FIFO.
  if (storage.size > MAX_TRACKED_KEYS) {
    const excess = storage.size - MAX_TRACKED_KEYS;
    let removed = 0;
    for (const key of storage.keys()) {
      storage.delete(key);
      if (++removed >= excess) break;
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  // Skip limiting only for genuine local development. This must never key off
  // the caller-supplied identifier — a request carrying
  // `X-Forwarded-For: localhost` would otherwise bypass every limit.
  if (process.env.NODE_ENV === "development") {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const now = Date.now();
  sweepExpiredKeys(now);

  const record = storage.get(key) || { timestamps: [] };

  // Filter out timestamps outside the sliding window
  const validTimestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (validTimestamps.length >= limit) {
    // Persist the pruned list so a blocked key doesn't retain stale entries.
    storage.set(key, { timestamps: validTimestamps });
    const oldest = validTimestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(retryAfterSeconds, 1),
    };
  }

  // Record current request
  validTimestamps.push(now);
  storage.set(key, { timestamps: validTimestamps });

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

// ── Specific Feature Rate Limiters (Generous & Smooth Limits) ───────

/**
 * 1. Search Rate Limit: Max 200 requests per 10 seconds (smooth live search typing)
 */
export function checkSearchRateLimit(
  identifier: string = "global",
): RateLimitResult {
  return checkRateLimit(`search:${identifier}`, 200, 10_000);
}

/**
 * 2. Comment & Review Rate Limit: Max 20 submissions per 60 seconds
 */
export function checkCommentRateLimit(
  identifier: string = "global",
): RateLimitResult {
  return checkRateLimit(`comment:${identifier}`, 20, 60_000);
}

/**
 * 3. Password Reset & Verification Email Rate Limit: Max 10 requests per 15 minutes
 */
export function checkPasswordResetRateLimit(
  identifier: string = "global",
): RateLimitResult {
  return checkRateLimit(`pw_reset:${identifier}`, 10, 15 * 60_000);
}

/**
 * 4. Watch Party Reaction & Chat Spam Rate Limit: Max 30 reactions per 3 seconds
 */
export function checkWatchPartyReactionRateLimit(
  identifier: string = "global",
): RateLimitResult {
  return checkRateLimit(`wp_reaction:${identifier}`, 30, 3_000);
}

/**
 * 5. Image Proxy & Cast Image Rate Limit: Max 2,000 requests per 60 seconds.
 *
 * Generous enough for a full poster grid plus scrolling, but no longer an
 * effectively-unlimited bandwidth relay.
 */
export function checkImageProxyRateLimit(
  identifier: string = "global",
): RateLimitResult {
  return checkRateLimit(`img_proxy:${identifier}`, 2000, 60_000);
}
