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

type ImagePresetOverrides = Partial<Omit<ImagePresetConfig, "height">> & {
  height?: number | null;
};

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
 * Reuse the same TMDB asset at a larger CDN size without another metadata
 * request. Provider payloads often contain w500/w780 URLs even when the image
 * is rendered as a full-width showcase.
 */
export function tmdbImageVariant(
  value: string,
  size: "w500" | "w780" | "w1280" | "original",
): string | null {
  const upstream = unwrapImageUrl(value);
  if (!upstream || !isTmdbImageUrl(upstream)) return null;
  const parsed = parseUrl(upstream);
  if (!parsed || !/^\/t\/p\/[^/]+\//.test(parsed.pathname)) return upstream;
  parsed.pathname = parsed.pathname.replace(/^\/t\/p\/[^/]+\//, `/t/p/${size}/`);
  return parsed.toString();
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
  overrides: ImagePresetOverrides = {},
): string | null {
  const upstream = unwrapImageUrl(source);
  if (!upstream || !/^https?:\/\//i.test(upstream)) return null;

  const presetConfig = IMAGE_PRESETS[preset];
  const config = { ...presetConfig, ...overrides };
  const params = new URLSearchParams({
    url: upstream.replace(/^http:\/\//i, "https://"),
    w: String(config.width),
    fit: config.fit,
    output: "webp",
    q: String(config.quality),
    we: "1",
  });
  if (config.height) params.set("h", String(config.height));
  return `${WSRV_ORIGIN}/?${params.toString()}`;
}

export function wsrvPublicImageUrl(
  source: string,
  preset: ImagePreset,
  overrides: ImagePresetOverrides = {},
): string | null {
  if (/^https?:\/\//i.test(source)) {
    return wsrvImageUrl(source, preset, overrides);
  }
  if (!source.startsWith("/")) return null;

  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const publicOrigin =
    configuredOrigin && /^https:\/\//i.test(configuredOrigin)
      ? configuredOrigin
      : "https://film-site-web.vercel.app";
  return wsrvImageUrl(new URL(source, publicOrigin).toString(), preset, overrides);
}

export function localImageProxyUrl(
  source: string,
  options: { strict?: boolean; fallback?: string | null } = {},
): string | null {
  const upstream = unwrapImageUrl(source);
  if (!upstream || !/^https?:\/\//i.test(upstream)) return null;
  const params = new URLSearchParams({ url: upstream });
  if (options.strict) params.set("strict", "1");
  const fallback = unwrapImageUrl(options.fallback);
  if (fallback && /^https?:\/\//i.test(fallback) && fallback !== upstream) {
    params.set("fallback", fallback);
  }
  return `${LOCAL_IMAGE_PROXY_PATH}?${params.toString()}`;
}

/**
 * Direct CDN -> wsrv provider fallback -> same-origin fallback. TMDB already
 * serves correctly-sized edge images, so it skips wsrv and avoids a double CDN
 * hop unless includeWsrvForTmdb or preferEdge is set.
 * Duplicate and already-proxied sources are normalized automatically.
 */
export function buildArtworkCandidates(
  sources: Array<string | null | undefined>,
  preset: ImagePreset,
  options: {
    strictProxy?: boolean;
    includeLocalProxy?: boolean;
    includeWsrvForTmdb?: boolean;
    preferEdge?: boolean;
    includeAlternatePhimimgPath?: boolean;
  } = {},
): string[] {
  const direct: string[] = [];
  for (const source of sources) {
    const upstream = unwrapImageUrl(source);
    if (upstream && !direct.includes(upstream)) direct.push(upstream);
  }

  const edgeCandidates: string[] = [];
  const directCandidates: string[] = [];
  const localCandidates: string[] = [];

  for (const source of direct) {
    directCandidates.push(source);

    // If source is a phimimg URL and option enabled, add alternate path (upload/vod <-> uploads/movies)
    if (options.includeAlternatePhimimgPath && (source.includes("/uploads/movies/") || source.includes("/upload/vod/"))) {
      const altUrl = source.includes("/uploads/movies/")
        ? source.replace("/uploads/movies/", "/upload/vod/")
        : source.replace("/upload/vod/", "/uploads/movies/");
      if (!directCandidates.includes(altUrl)) {
        directCandidates.push(altUrl);
      }
    }

    // wsrv rejects several Vietnamese movie CDNs with "Domain or TLD blocked
    // by policy". Use it only for TMDB, where it is a useful regional
    // fallback. Provider originals are resized by Next's image optimizer in
    // the rendering component and retain the same-origin proxy as fallback.
    if (
      isTmdbImageUrl(source) &&
      (options.includeWsrvForTmdb || options.preferEdge)
    ) {
      const wsrv = wsrvImageUrl(source, preset);
      if (wsrv && !edgeCandidates.includes(wsrv) && !directCandidates.includes(wsrv)) {
        edgeCandidates.push(wsrv);
      }
    }

    if (options.includeLocalProxy !== false) {
      const proxy = localImageProxyUrl(source, {
        strict: options.strictProxy,
      });
      if (proxy && !localCandidates.includes(proxy) && !directCandidates.includes(proxy)) {
        localCandidates.push(proxy);
      }
    }
  }

  const result: string[] = [];
  const add = (url: string) => {
    if (url && !result.includes(url)) result.push(url);
  };

  if (options.preferEdge) {
    directCandidates.forEach(add);
    edgeCandidates.forEach(add);
    localCandidates.forEach(add);
  } else {
    directCandidates.forEach(add);
    localCandidates.forEach(add);
    edgeCandidates.forEach(add);
  }

  return result;
}

export function isPreOptimizedImageUrl(value?: string | null): boolean {
  if (!value) return false;
  return (
    value.startsWith(`${LOCAL_IMAGE_PROXY_PATH}?`) ||
    isWsrvImageUrl(value) ||
    isTmdbImageUrl(value) ||
    /^(https?:)?\/\/(img\.phimapi\.com|phimimg\.com|img\.ophim\.live|ophim1\.com|images\.nguonc\.com|phim\.nguonc\.com|img\.nguonc\.com|image\.tmdb\.org|tmdb\.org|.*\.onflixcdn\.com|onflixcdn\.com|.*\.xink\.pro|xink\.pro|.*\.vicdn\.cc|vicdn\.cc|.*\.vodphim\.com|vodphim\.com)\//i.test(
      value,
    )
  );
}
