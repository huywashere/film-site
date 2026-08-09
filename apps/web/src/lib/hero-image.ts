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
 * TMDB is fetched directly first because its public image CDN is faster and
 * avoids consuming a serverless image-proxy invocation. Other providers stay
 * behind the allowlisted proxy. `strict=1` is important: it makes the proxy
 * emit an error instead of a portrait placeholder so the browser can advance
 * to the next real image.
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

  // Landscape thumbnails are normally optimized to w1280 and should beat an
  // original-size backdrop on slow or cold serverless connections.
  for (const value of [input.thumbUrl, input.heroBackdrop, input.posterUrl]) {
    const normalized = normalizeMovieImage(value);
    if (!normalized) continue;

    const proxiedRaw = rawProxyUrl(normalized);
    if (proxiedRaw && isTmdbImage(proxiedRaw)) {
      add(preferTmdbBackdropSize(proxiedRaw));
      add(proxiedRaw);
      add(strictProxyUrl(normalized));
      continue;
    }

    if (isTmdbImage(normalized)) {
      add(preferTmdbBackdropSize(normalized));
      add(normalized);
      add(
        `${IMAGE_PROXY_PATH}?url=${encodeURIComponent(normalized)}&strict=1`,
      );
      continue;
    }

    if (normalized.startsWith(IMAGE_PROXY_PATH)) {
      add(strictProxyUrl(normalized));
    } else {
      add(
        `${IMAGE_PROXY_PATH}?url=${encodeURIComponent(normalized)}&strict=1`,
      );
    }
  }

  add(HERO_LOCAL_FALLBACK);
  return candidates;
}
