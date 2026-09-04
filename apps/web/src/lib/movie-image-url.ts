/**
 * Normalize provider artwork without guessing that one KKPhim path generation
 * is universally valid. Both `/uploads/movies/` and `/upload/vod/` are live.
 */
export function normalizeMovieArtworkUrl(value?: unknown): string | null {
  if (typeof value !== "string") return null;
  let resolved = value.trim();
  if (!resolved || resolved === "undefined" || resolved === "null" || resolved === "none") return null;

  if (resolved.startsWith("/api/image-proxy")) return resolved;
  if (resolved.startsWith("//")) resolved = `https:${resolved}`;
  else if (resolved.startsWith("http://")) {
    resolved = resolved.replace(/^http:\/\//i, "https://");
  } else if (!resolved.startsWith("https://")) {
    resolved = `https://phimimg.com/${resolved.replace(/^\/+/, "")}`;
  }

  return resolved.replace("img.phimapi.com/", "phimimg.com/");
}

export function alternateMovieArtworkUrl(value?: unknown): string | null {
  const resolved = normalizeMovieArtworkUrl(value);
  if (!resolved || resolved.startsWith("/api/image-proxy")) return null;

  if (resolved.includes("/uploads/movies/")) {
    return resolved.replace("/uploads/movies/", "/upload/vod/");
  }
  if (resolved.includes("/upload/vod/")) {
    return resolved.replace("/upload/vod/", "/uploads/movies/");
  }
  return null;
}

export function resolveImageUrl(url?: unknown, fallbackUrl?: unknown): string | null {
  const resolved = normalizeMovieArtworkUrl(url) || normalizeMovieArtworkUrl(fallbackUrl);
  if (!resolved) return null;
  if (resolved.startsWith("/api/image-proxy")) return resolved;

  // DIRECT CDN FAST-PATH OPTIMIZATION:
  const isDirectCdnHost =
    /^(https?:)?\/\/(img\.phimapi\.com|phimimg\.com|img\.ophim\.live|ophim1\.com|images\.nguonc\.com|image\.tmdb\.org|tmdb\.org)\//i.test(
      resolved,
    );
  if (isDirectCdnHost) {
    return resolved;
  }

  const fallback = normalizeMovieArtworkUrl(fallbackUrl);
  const fallbackQuery =
    fallback && fallback !== resolved && !fallback.startsWith("/api/image-proxy")
      ? `&fallback=${encodeURIComponent(fallback)}`
      : "";
  return `/api/image-proxy?url=${encodeURIComponent(resolved)}${fallbackQuery}`;
}
