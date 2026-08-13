/**
 * Normalize provider artwork without guessing that one KKPhim path generation
 * is universally valid. Both `/uploads/movies/` and `/upload/vod/` are live.
 */
export function normalizeMovieArtworkUrl(value?: unknown): string | null {
  if (typeof value !== "string") return null;
  let resolved = value.trim();
  if (!resolved) return null;

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
