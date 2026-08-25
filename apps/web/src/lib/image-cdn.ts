const WSRV_ORIGIN = "https://wsrv.nl";
const LOCAL_IMAGE_PROXY_PATH = "/api/image-proxy";

export type ImagePreset =
  "poster" | "card" | "backdrop" | "thumbnail" | "avatar" | "titleLogo";

interface ImagePresetConfig {
  width: number;
  height: number;
  quality: number;
  fit: "cover" | "contain";
}

const IMAGE_PRESETS: Record<ImagePreset, ImagePresetConfig> = {
  poster: { width: 400, height: 600, quality: 82, fit: "cover" },
  card: { width: 300, height: 450, quality: 80, fit: "cover" },
  backdrop: { width: 1280, height: 720, quality: 84, fit: "cover" },
  thumbnail: { width: 480, height: 270, quality: 80, fit: "cover" },
  avatar: { width: 160, height: 160, quality: 82, fit: "cover" },
  titleLogo: { width: 640, height: 260, quality: 84, fit: "contain" },
};

function parseUrl(value: string, base = "https://netphim.local"): URL | null {
  try {
    return new URL(value, base);
  } catch {
    return null;
  }
}

export function isWsrvImageUrl(value?: string | null): boolean {
  if (!value) return false;
  const parsed = parseUrl(value);
  return parsed?.hostname.toLowerCase() === "wsrv.nl";
}

export function isTmdbImageUrl(value?: string | null): boolean {
  if (!value) return false;
  const parsed = parseUrl(value);
  return parsed?.hostname.toLowerCase() === "image.tmdb.org";
}

/**
 * Return the real upstream image from our supported relay URLs. This is kept
 * deliberately shallow and bounded so a malformed URL cannot create a loop.
 */
export function unwrapImageUrl(value?: string | null): string | null {
  if (!value) return null;
  let current = value.trim();
  if (!current) return null;

  for (let depth = 0; depth < 3; depth += 1) {
    const parsed = parseUrl(current);
    if (!parsed) return current;
    const isWsrv = parsed.hostname.toLowerCase() === "wsrv.nl";
    const isLocalProxy = parsed.pathname === LOCAL_IMAGE_PROXY_PATH;
    if (!isWsrv && !isLocalProxy) return current;

    const upstream = parsed.searchParams.get("url")?.trim();
    if (!upstream || upstream === current) return current;
    current = upstream;
  }

  return current;
}

export function wsrvImageUrl(
  source: string,
  preset: ImagePreset,
): string | null {
  const upstream = unwrapImageUrl(source);
  if (!upstream || !/^https?:\/\//i.test(upstream)) return null;

  const config = IMAGE_PRESETS[preset];
  const params = new URLSearchParams({
    url: upstream.replace(/^http:\/\//i, "https://"),
    w: String(config.width),
    h: String(config.height),
    fit: config.fit,
    output: "webp",
    q: String(config.quality),
    we: "1",
  });
  return `${WSRV_ORIGIN}/?${params.toString()}`;
}

export function localImageProxyUrl(
  source: string,
  options: { strict?: boolean } = {},
): string | null {
  const upstream = unwrapImageUrl(source);
  if (!upstream || !/^https?:\/\//i.test(upstream)) return null;
  const params = new URLSearchParams({ url: upstream });
  if (options.strict) params.set("strict", "1");
  return `${LOCAL_IMAGE_PROXY_PATH}?${params.toString()}`;
}

/**
 * Direct CDN -> wsrv provider fallback -> same-origin fallback. TMDB already
 * serves correctly-sized edge images, so it skips wsrv and avoids a double CDN
 * hop. Duplicate and already-proxied sources are normalized automatically.
 */
export function buildArtworkCandidates(
  sources: Array<string | null | undefined>,
  preset: ImagePreset,
  options: { strictProxy?: boolean; includeLocalProxy?: boolean } = {},
): string[] {
  const direct: string[] = [];
  for (const source of sources) {
    const upstream = unwrapImageUrl(source);
    if (upstream && !direct.includes(upstream)) direct.push(upstream);
  }

  const candidates = [...direct];
  for (const source of direct) {
    if (!isTmdbImageUrl(source)) {
      const wsrv = wsrvImageUrl(source, preset);
      if (wsrv && !candidates.includes(wsrv)) candidates.push(wsrv);
    }
    if (options.includeLocalProxy !== false) {
      const proxy = localImageProxyUrl(source, {
        strict: options.strictProxy,
      });
      if (proxy && !candidates.includes(proxy)) candidates.push(proxy);
    }
  }
  return candidates;
}

export function isPreOptimizedImageUrl(value?: string | null): boolean {
  return isWsrvImageUrl(value) || isTmdbImageUrl(value);
}
