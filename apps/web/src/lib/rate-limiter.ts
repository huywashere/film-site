/**
 * High-performance Client & Server Rate Limiter (Sliding Window Algorithm)
 * Protects APIs, Forms, Auth, Comments & Watch Party from Spam and Abuse.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const storage = new Map<string, RateLimitRecord>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  // Always allow unrestricted requests in development / local testing mode
  if (
    process.env.NODE_ENV === "development" ||
    key.includes("localhost") ||
    key.includes("127.0.0.1")
  ) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const now = Date.now();
  const record = storage.get(key) || { timestamps: [] };

  // Filter out timestamps outside the sliding window
  const validTimestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (validTimestamps.length >= limit) {
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
 * 5. Image Proxy & Cast Image Rate Limit: Max 10,000 requests per 60 seconds (unrestricted gallery loading)
 */
export function checkImageProxyRateLimit(
  identifier: string = "global",
): RateLimitResult {
  return checkRateLimit(`img_proxy:${identifier}`, 10000, 60_000);
}
