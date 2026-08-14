const IMAGE_PROXY_PATH = "/api/image-proxy";

export const HERO_LOCAL_FALLBACK =
  "/images/cinema-hall-with-red-seat-wide-white-screen.jpg";

function isTmdbImage(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase() === "image.tmdb.org";
  } catch {
    return false;
  }
}

function preferTmdbBackdropSize(url: string): string {
  return url.replace(
    /\/t\/p\/(?:original|w300|w500|w780|w1280)\//i,
    "/t/p/w1280/",
  );
}

function rawProxyUrl(value: string): string | null {
  if (!value.startsWith(IMAGE_PROXY_PATH)) return null;

  try {
    const parsed = new URL(value, "https://cineverse.local");
    return parsed.searchParams.get("url");
  } catch {
    return null;
  }
}

function strictProxyUrl(value: string): string {
  try {
    const parsed = new URL(value, "https://cineverse.local");
    parsed.searchParams.set("strict", "1");
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return value;
  }
}

function normalizeMovieImage(value?: string): string | null {
  if (!value) return null;
  let resolved = value.trim();
  if (!resolved) return null;

  if (resolved.startsWith("//")) resolved = `https:${resolved}`;
  if (resolved.startsWith("/")) {
    if (resolved.startsWith("/api/")) return resolved;
    resolved = `https://img.phimapi.com/${resolved.replace(/^\/+/, "")}`;
  } else if (!/^https?:\/\//i.test(resolved)) {
    resolved = `https://img.phimapi.com/${resolved}`;
  }

  return resolved.replace(/^http:\/\//i, "https://");
}

/**
 * Build a deterministic fallback chain for a full-width hero image.
 *
 * Direct CDN hosts (image.tmdb.org, phimimg.com, img.phimapi.com, etc.) are fetched
 * directly first because their edge CDN is fastest, highly available, and avoids
 * serverless proxy latency or rate limits.
 */
export function buildHeroImageCandidates(input: {
  heroBackdrop?: string;
  thumbUrl?: string;
  posterUrl?: string;
}): string[] {
  const candidates: string[] = [];
  const add = (candidate: string | null | undefined) => {
    if (candidate && !candidates.includes(candidate)) candidates.push(candidate);
  };

  for (const value of [input.heroBackdrop, input.thumbUrl, input.posterUrl]) {
    const normalized = normalizeMovieImage(value);
    if (!normalized) continue;

    const proxiedRaw = rawProxyUrl(normalized);
    if (proxiedRaw && isTmdbImage(proxiedRaw)) {
      add(preferTmdbBackdropSize(proxiedRaw));
      add(proxiedRaw);
      continue;
    }

    if (isTmdbImage(normalized)) {
      add(preferTmdbBackdropSize(normalized));
      add(normalized);
      continue;
    }

    if (!normalized.startsWith(IMAGE_PROXY_PATH)) {
      // Direct CDN first
      add(normalized);

      // Alternate KKPhim paths (uploads/movies <-> upload/vod)
      if (normalized.includes("/uploads/movies/")) {
        add(normalized.replace("/uploads/movies/", "/upload/vod/"));
      } else if (normalized.includes("/upload/vod/")) {
        add(normalized.replace("/upload/vod/", "/uploads/movies/"));
      }

      // Proxy as backup fallback
      add(`${IMAGE_PROXY_PATH}?url=${encodeURIComponent(normalized)}&strict=1`);
    } else {
      add(strictProxyUrl(normalized));
    }
  }

  add(HERO_LOCAL_FALLBACK);
  return candidates;
}
