import { buildArtworkCandidates, wsrvImageUrl } from "@/lib/image-cdn";

const IMAGE_PROXY_PATH = "/api/image-proxy";

export const HERO_LOCAL_FALLBACK =
  "/images/wp3533664-avengers-infinity-war-4k-wallpapers.jpg";

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

function preferTmdbCardSize(url: string, size: "w300" | "w342"): string {
  return url.replace(
    /\/t\/p\/(?:original|w92|w154|w185|w300|w342|w500|w780|w1280)\//i,
    `/t/p/${size}/`,
  );
}

function rawProxyUrl(value: string): string | null {
  if (!value.startsWith(IMAGE_PROXY_PATH)) return null;

  try {
    const parsed = new URL(value, "https://netphim.local");
    return parsed.searchParams.get("url");
  } catch {
    return null;
  }
}

function strictProxyUrl(value: string): string {
  try {
    const parsed = new URL(value, "https://netphim.local");
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

export function buildHeroResponsiveSrcSet(
  value: string | undefined,
  kind: "poster" | "backdrop",
): string | undefined {
  const normalized = normalizeMovieImage(value);
  if (!normalized) return undefined;
  const useSameOriginRelay = normalized.startsWith(IMAGE_PROXY_PATH);
  const unwrapped = rawProxyUrl(normalized) || normalized;
  if (!isTmdbImage(unwrapped)) return undefined;

  const sizes = kind === "poster"
    ? [["w342", 342], ["w500", 500], ["w780", 780]] as const
    : [["w780", 780], ["w1280", 1280]] as const;
  return sizes
    .map(([size, width]) => {
      const url = unwrapped.replace(
        /\/t\/p\/(?:original|w92|w154|w185|w300|w342|w500|w780|w1280)\//i,
        `/t/p/${size}/`,
      );
      const source = useSameOriginRelay
        ? `${IMAGE_PROXY_PATH}?url=${encodeURIComponent(url)}&strict=1`
        : url;
      return `${source} ${width}w`;
    })
    .join(", ");
}

/**
 * Build a deterministic fallback chain for a full-width hero image.
 *
 * Hero backdrops use the same-origin cached relay first. Some browsers and
 * regional networks allow small TMDB posters but intermittently drop large
 * backdrop requests; relaying only the two visible hero images avoids that
 * client-side dependency without using Vercel Image Optimization. Direct TMDB
 * and wsrv remain independent fallbacks.
 */
export function buildHeroImageCandidates(input: {
  heroBackdrop?: string;
  thumbUrl?: string;
  posterUrl?: string;
}): string[] {
  const candidates: string[] = [];
  const add = (candidate: string | null | undefined) => {
    if (candidate && !candidates.includes(candidate))
      candidates.push(candidate);
  };

  for (const value of [input.heroBackdrop, input.thumbUrl, input.posterUrl]) {
    const normalized = normalizeMovieImage(value);
    if (!normalized) continue;

    const proxiedRaw = rawProxyUrl(normalized);
    if (proxiedRaw && isTmdbImage(proxiedRaw)) {
      const sized = preferTmdbBackdropSize(proxiedRaw);
      const wsrv = wsrvImageUrl(sized, "backdrop");
      add(`${IMAGE_PROXY_PATH}?url=${encodeURIComponent(sized)}&strict=1`);
      add(sized);
      add(proxiedRaw);
      if (wsrv) add(wsrv);
      add(strictProxyUrl(normalized));
      continue;
    }

    if (isTmdbImage(normalized)) {
      const sized = preferTmdbBackdropSize(normalized);
      const wsrv = wsrvImageUrl(sized, "backdrop");
      add(`${IMAGE_PROXY_PATH}?url=${encodeURIComponent(sized)}&strict=1`);
      add(sized);
      add(normalized);
      if (wsrv) add(wsrv);
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

  return candidates;
}

/**
 * Build lightweight image candidates for the small cards inside the hero.
 * Direct sources are exhausted before slower relay services, preventing one
 * broken poster from delaying a valid thumb/backdrop by several round trips.
 */
export function buildHeroCardImageCandidates(
  input: {
    heroBackdrop?: string;
    thumbUrl?: string;
    posterUrl?: string;
  },
  variant: "poster" | "thumbnail",
): string[] {
  const direct: string[] = [];
  const addDirect = (value?: string) => {
    const normalized = normalizeMovieImage(value);
    if (!normalized || normalized.startsWith(IMAGE_PROXY_PATH)) return;
    const sized = isTmdbImage(normalized)
      ? preferTmdbCardSize(normalized, variant === "poster" ? "w342" : "w300")
      : normalized;
    if (!direct.includes(sized)) direct.push(sized);
  };

  const ordered =
    variant === "poster"
      ? [input.posterUrl, input.thumbUrl, input.heroBackdrop]
      : [input.thumbUrl, input.posterUrl, input.heroBackdrop];

  for (const value of ordered) {
    addDirect(value);
    if (value?.includes("/uploads/movies/")) {
      addDirect(value.replace("/uploads/movies/", "/upload/vod/"));
    } else if (value?.includes("/upload/vod/")) {
      addDirect(value.replace("/upload/vod/", "/uploads/movies/"));
    }
  }

  return buildArtworkCandidates(
    direct,
    variant === "poster" ? "poster" : "thumbnail",
    { strictProxy: true },
  );
}
