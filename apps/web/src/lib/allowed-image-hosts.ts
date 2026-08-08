/**
 * Allowlist for every host the image proxy is permitted to fetch from.
 *
 * The image proxy relays the upstream response body back to the caller, so an
 * unrestricted `url` parameter turns it into an SSRF primitive: an attacker can
 * read cloud metadata (169.254.169.254), reach services bound to localhost, or
 * pivot into the private network. Only these hosts are reachable.
 *
 * Entries starting with "*." match that suffix and any subdomain of it.
 */
const ALLOWED_IMAGE_HOSTS = [
  // KKPhim
  "phimapi.com",
  "*.phimapi.com",
  "phimimg.com",
  "*.phimimg.com",
  "*.kkphim.vip",
  // OPhim
  "img.ophim.live",
  "*.ophim.live",
  "ophim1.com",
  "ophim17.cc",
  "*.ophim.cc",
  // NguonC
  "images.nguonc.com",
  "phim.nguonc.com",
  // VSMOV
  "vsmov.com",
  "*.vsmov.com",
  "storage.vsmov.com",
  "nguon.vsphim.com",
  "*.vsphim.com",
  // TMDB
  "image.tmdb.org",
  "*.tmdb.org",
  "tmdb.org",
  // Misc & Avatars & Flags
  "motphim.net",
  "*.motphim.net",
  "ui-avatars.com",
  "flagcdn.com",
  "*.flagcdn.com",
  // Wikipedia thumbnails returned by /api/cast-image
  "upload.wikimedia.org",
] as const;

function hostMatches(hostname: string, pattern: string): boolean {
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(1); // ".example.com"
    return hostname.endsWith(suffix) || hostname === pattern.slice(2);
  }
  return hostname === pattern;
}

export function isAllowedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_IMAGE_HOSTS.some((pattern) => hostMatches(host, pattern));
}

/**
 * Parse and validate a candidate image URL.
 *
 * Returns the normalized URL string, or null when the URL must not be fetched.
 * Rejects non-https schemes, embedded credentials, non-default ports and any
 * host outside the allowlist.
 */
export function validateImageUrl(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  // Only https — blocks http:, file:, data:, gopher:, ftp: and friends.
  if (parsed.protocol !== "https:") return null;

  // `https://allowed.example@169.254.169.254/` would otherwise pass a naive
  // hostname check in some parsers and confuse upstream servers.
  if (parsed.username || parsed.password) return null;

  // Non-standard ports are a strong signal of an internal-service probe.
  if (parsed.port && parsed.port !== "443") return null;

  if (!isAllowedImageHost(parsed.hostname)) return null;

  return parsed.toString();
}
