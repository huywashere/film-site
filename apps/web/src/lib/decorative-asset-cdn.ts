const ALLOWED_JSDELIVR_HOSTS = new Set([
  "cdn.jsdelivr.net",
  "fastly.jsdelivr.net",
]);

function normalizeLocalAssetPath(value: string): string | null {
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.includes("\\") || path.split("/").includes("..")) return null;
  return path;
}

/**
 * Only accept HTTPS jsDelivr bases. This prevents a deployment typo from
 * turning decorative images into an arbitrary third-party tracking endpoint.
 */
export function normalizeDecorativeAssetCdnBase(value?: string | null): string {
  const candidate = value?.trim();
  if (!candidate) return "";

  try {
    const url = new URL(candidate);
    if (
      url.protocol !== "https:" ||
      !ALLOWED_JSDELIVR_HOSTS.has(url.hostname.toLowerCase())
    ) {
      return "";
    }
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export const DECORATIVE_ASSET_CDN_BASE_URL = normalizeDecorativeAssetCdnBase(
  process.env.NEXT_PUBLIC_DECORATIVE_ASSET_CDN_BASE_URL,
);

/** Returns the CDN URL when enabled, otherwise the original first-party URL. */
export function decorativeAssetUrl(
  localPath: string,
  cdnBase = DECORATIVE_ASSET_CDN_BASE_URL,
): string {
  const safePath = normalizeLocalAssetPath(localPath);
  const safeBase = normalizeDecorativeAssetCdnBase(cdnBase);
  if (!safePath || !safeBase) return localPath;
  return `${safeBase}${safePath}`;
}

/**
 * Switch an image to its local public/ copy once. Returns false when the local
 * fallback also failed so callers may hide purely decorative artwork.
 */
export function applyLocalDecorativeAssetFallback(
  image: HTMLImageElement,
  localPath: string,
): boolean {
  const safePath = normalizeLocalAssetPath(localPath);
  if (!safePath || image.dataset.localAssetFallback === "true") return false;

  image.dataset.localAssetFallback = "true";
  image.removeAttribute("srcset");
  image.src = safePath;
  return true;
}
