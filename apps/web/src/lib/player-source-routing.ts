export type ServerType = "vietsub" | "thuyet-minh" | "song-ngu" | "engsub" | "raw";

export type EpisodeItem = {
  name?: string;
  slug?: string;
  link_embed?: string;
  link_m3u8?: string;
  link_m3u8_proxy?: string;
};

export type SourceServer = {
  server_name?: string;
  server_data?: EpisodeItem[];
  _source?: string;
  _type: ServerType;
  key: string;
  priority?: number;
};

// Keep this list aligned with the HTTPS hosts in proxy.ts `media-src`. Unknown
// third-party CDNs are intentionally played through the signed same-origin HLS
// relay instead of first paying for a request that the browser CSP will block.
const DIRECT_HLS_HOST_SUFFIXES = [
  "phimapi.com",
  "phim1280.tv",
  "phim1280.com",
  "kkphimplayer8.com",
  "kkphimplayer7.com",
  "kkphimplayer6.com",
  "kkphimplayer5.com",
  "kkphimplayer.com",
  "kvp726.com",
  "ophim.live",
  "ophim1.com",
  "ophim17.cc",
  "ophim.cc",
  "opstream.com",
  "opstream12.com",
  "opstream14.com",
  "opstream15.com",
  "nguonc.com",
  "streamc.xyz",
  "vsmov.com",
  "streamvsmov.com",
  "vsphim.com",
  "vicdn.cc",
  "vidsrc.sbs",
];

export function isDirectHlsAllowedByCsp(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    if (/^([a-z0-9-]+\.)?kkphimplayer\d*\.com$/.test(hostname)) return true;
    if (/^([a-z0-9-]+\.)?opstream\d*\.com$/.test(hostname)) return true;
    if (/^([a-z0-9-]+\.)?kvp\d*\.com$/.test(hostname)) return true;
    return DIRECT_HLS_HOST_SUFFIXES.some(
      (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

export function selectInitialHlsTransport(
  directUrl: string,
  proxyUrl: string | undefined,
  preferSameOrigin: boolean,
) {
  const safeProxy = proxyUrl?.startsWith("/api/hls-proxy?") ? proxyUrl : "";
  const directAllowed = Boolean(directUrl) && isDirectHlsAllowedByCsp(directUrl);
  const primary =
    safeProxy && (preferSameOrigin || !directAllowed) ? safeProxy : directUrl || safeProxy;
  const fallback = primary === safeProxy ? (directAllowed ? directUrl : "") : safeProxy;

  return {
    primary,
    fallback: fallback && fallback !== primary ? fallback : undefined,
  };
}

/** A missing manifest cannot be repaired by relaying the same URL. */
export function isTerminalHlsHttpStatus(value: unknown) {
  const status = Number(value);
  return status === 404 || status === 410;
}

/**
 * VSMov provides movie playback via embed links (`https://v{node}.streamvsmov.com/video/{hash}`)
 * with empty `link_m3u8` fields in its API responses.
 * The underlying HLS stream is deterministically available at:
 * `https://v{node}.streamvsmov.com/stream/{hash}/master.m3u8`.
 */
export function deriveVsmovM3u8(embedUrl: string): string {
  if (!embedUrl || typeof embedUrl !== "string") return "";
  const trimmed = embedUrl.trim();
  try {
    const parsed = new URL(trimmed);
    const match = parsed.pathname.match(/^\/video\/([a-zA-Z0-9_-]+)/i);
    if (match) {
      const videoId = match[1];
      parsed.pathname = `/stream/${videoId}/master.m3u8`;
      return parsed.toString();
    }
  } catch {
    const match = trimmed.match(/^(https?:\/\/[^\/]+)\/video\/([a-zA-Z0-9_-]+)/i);
    if (match) {
      return `${match[1]}/stream/${match[2]}/master.m3u8`;
    }
  }
  return "";
}

export function getSourceAbbr(source?: string): string {
  if (!source) return "KP";
  const s = source.toLowerCase();
  if (s.includes("kkphim") || s === "kp") return "KP";
  if (s.includes("nguonc") || s === "nc") return "NC";
  if (s.includes("vsmov") || s === "vs") return "VS";
  if (s.includes("ophim") || s === "op") return "OP";
  if (s.includes("vicdn") || s === "vicdn") return "ViCDN";
  if (s.includes("vidsrc")) return "VidSrc";
  if (s.includes("vidlink")) return "VidLink";
  if (s.includes("2embed") || s === "2e") return "2Embed";
  if (s.includes("vidcore") || s === "vc") return "VidCore";
  return source.toUpperCase();
}

export function getSourceLabel(source?: string): string {
  const value = normalizePlayerLabel(source || "");
  if (value.includes("kkphim") || value === "kp") return "KKPhim";
  if (value.includes("nguonc") || value === "nc") return "NguonC";
  if (value.includes("vsmov") || value === "vs") return "VSMov";
  if (value.includes("ophim") || value === "op") return "OPhim";
  if (value.includes("vicdn")) return "ViCDN";
  if (value.includes("vidsrc")) return "VidSrc";
  if (value.includes("vidlink")) return "VidLink";
  if (value.includes("2embed")) return "2Embed";
  if (value.includes("vidcore")) return "VidCore";
  return source?.trim() || "Nguồn phát";
}

const PROVIDER_PRIORITY: Record<string, number> = {
  kkphim: 40,
  nguonc: 35,
  vsmov: 30,
  ophim: 25,
  vicdn: 20,
  vidsrc: 5,
  vidlink: 4,
  "2embed": 3,
  vidcore: 2,
};

const UNSANDBOXED_EMBED_HOST_SUFFIXES: Record<string, string[]> = {
  vidsrc: ["vidsrc.sbs"],
  vidlink: ["vidlink.pro"],
  "2embed": ["2embed.cc", "2embed.skin"],
  vidcore: ["vidcore.org"],
  vicdn: ["vicdn.cc"],
  nguonc: ["streamc.xyz"],
  vsmov: ["streamvsmov.com", "vsmov.com", "vsphim.com"],
  kkphim: [
    "phimapi.com",
    "phim1280.tv",
    "phim1280.com",
    "kkphimplayer.com",
    "kkphimplayer5.com",
    "kkphimplayer6.com",
    "kkphimplayer7.com",
    "kkphimplayer8.com",
    "kvp726.com",
  ],
  ophim: [
    "ophim.live",
    "ophim1.com",
    "ophim17.cc",
    "opstream.com",
    "opstream12.com",
    "opstream14.com",
    "opstream15.com",
  ],
};

const VIDSRC_EMBED_ORIGIN = "https://vidsrc.sbs";

function positiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export type VidsrcEmbedOptions = {
  tmdbId: unknown;
  mediaType: "movie" | "tv";
  season?: unknown;
  episode?: unknown;
  autoplay?: boolean;
  subtitle?: string;
  color?: string;
  startAt?: unknown;
  controls?: boolean;
};

/** Build only the documented vidsrc.sbs TMDB embed URLs. */
export function buildVidsrcEmbedUrl({
  tmdbId,
  mediaType,
  season,
  episode,
  autoplay,
  subtitle = "en",
  color,
  startAt,
  controls,
}: VidsrcEmbedOptions): string | null {
  const safeTmdbId = positiveInteger(tmdbId);
  if (!safeTmdbId) return null;

  let path = `/embed/movie/${safeTmdbId}`;
  if (mediaType === "tv") {
    const safeSeason = positiveInteger(season);
    const safeEpisode = positiveInteger(episode);
    if (!safeSeason || !safeEpisode) return null;
    path = `/embed/tv/${safeTmdbId}/${safeSeason}/${safeEpisode}`;
  }

  const url = new URL(path, VIDSRC_EMBED_ORIGIN);
  if (autoplay !== undefined) {
    url.searchParams.set("autoplay", autoplay ? "1" : "0");
  }
  if (/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(subtitle)) {
    url.searchParams.set("sub", subtitle);
  }
  if (color && /^[0-9a-f]{6}$/i.test(color)) {
    url.searchParams.set("color", color.toLowerCase());
  }
  const safeStartAt = positiveInteger(startAt);
  if (safeStartAt) url.searchParams.set("t", String(safeStartAt));
  if (controls !== undefined) {
    url.searchParams.set("controls", controls ? "1" : "0");
  }
  return url.toString();
}

export type VicdnEmbedOptions = {
  tmdbId: unknown;
  mediaType: "movie" | "tv";
  season?: unknown;
  episode?: unknown;
};

/** Build ViCDN embed URLs: https://vicdn.cc/mv-{tmdbId}-1-1 or https://vicdn.cc/tv-{tmdbId}-{season}-{episode} */
export function buildVicdnEmbedUrl({
  tmdbId,
  mediaType,
  season,
  episode,
}: VicdnEmbedOptions): string | null {
  const safeTmdbId = positiveInteger(tmdbId);
  if (!safeTmdbId) return null;

  if (mediaType === "movie") {
    return `https://vicdn.cc/mv-${safeTmdbId}-1-1`;
  }
  const safeSeason = positiveInteger(season) || 1;
  const safeEpisode = positiveInteger(episode) || 1;
  return `https://vicdn.cc/tv-${safeTmdbId}-${safeSeason}-${safeEpisode}`;
}

const VIDLINK_EMBED_ORIGIN = "https://vidlink.pro";

export type VidlinkEmbedOptions = {
  tmdbId: unknown;
  mediaType: "movie" | "tv";
  season?: unknown;
  episode?: unknown;
  autoplay?: boolean;
  primaryColor?: string;
};

/** Build documented vidlink.pro TMDB embed URLs: https://vidlink.pro/movie/{tmdbId} or https://vidlink.pro/tv/{tmdbId}/{season}/{episode} */
export function buildVidlinkEmbedUrl({
  tmdbId,
  mediaType,
  season,
  episode,
  autoplay,
  primaryColor = "23ade5",
}: VidlinkEmbedOptions): string | null {
  const safeTmdbId = positiveInteger(tmdbId);
  if (!safeTmdbId) return null;

  let path = `/movie/${safeTmdbId}`;
  if (mediaType === "tv") {
    const safeSeason = positiveInteger(season) || 1;
    const safeEpisode = positiveInteger(episode) || 1;
    path = `/tv/${safeTmdbId}/${safeSeason}/${safeEpisode}`;
  }

  const url = new URL(path, VIDLINK_EMBED_ORIGIN);
  if (autoplay !== undefined) {
    url.searchParams.set("autoplay", autoplay ? "true" : "false");
  }
  if (primaryColor && /^[0-9a-f]{6}$/i.test(primaryColor.replace(/^#/, ""))) {
    url.searchParams.set("primaryColor", primaryColor.replace(/^#/, "").toLowerCase());
  }
  return url.toString();
}

const TWOEMBED_EMBED_ORIGIN = "https://www.2embed.cc";

export type TwoEmbedOptions = {
  tmdbId: unknown;
  mediaType: "movie" | "tv";
  season?: unknown;
  episode?: unknown;
};

/** Build documented 2embed.cc TMDB embed URLs:
 * Movie: https://www.2embed.cc/embed/{tmdbId}
 * TV: https://www.2embed.cc/embedtv/{tmdbId}&s={season}&e={episode}
 */
export function buildTwoEmbedUrl({
  tmdbId,
  mediaType,
  season,
  episode,
}: TwoEmbedOptions): string | null {
  const safeTmdbId = positiveInteger(tmdbId);
  if (!safeTmdbId) return null;

  if (mediaType === "movie") {
    return `${TWOEMBED_EMBED_ORIGIN}/embed/${safeTmdbId}`;
  }

  const safeSeason = positiveInteger(season) || 1;
  const safeEpisode = positiveInteger(episode) || 1;
  return `${TWOEMBED_EMBED_ORIGIN}/embedtv/${safeTmdbId}&s=${safeSeason}&e=${safeEpisode}`;
}

const VIDCORE_EMBED_ORIGIN = "https://vidcore.org";

export type VidcoreEmbedOptions = {
  tmdbId: unknown;
  mediaType: "movie" | "tv";
  season?: unknown;
  episode?: unknown;
  autoplay?: boolean;
  theme?: string;
};

/** Build documented vidcore.org TMDB embed URLs:
 * Movie: https://vidcore.org/embed/movie/{tmdbId}
 * TV: https://vidcore.org/embed/tv/{tmdbId}/{season}/{episode}
 */
export function buildVidcoreEmbedUrl({
  tmdbId,
  mediaType,
  season,
  episode,
  autoplay,
  theme = "23ade5",
}: VidcoreEmbedOptions): string | null {
  const safeTmdbId = positiveInteger(tmdbId);
  if (!safeTmdbId) return null;

  let path = `/embed/movie/${safeTmdbId}`;
  if (mediaType === "tv") {
    const safeSeason = positiveInteger(season) || 1;
    const safeEpisode = positiveInteger(episode) || 1;
    path = `/embed/tv/${safeTmdbId}/${safeSeason}/${safeEpisode}`;
  }

  const url = new URL(path, VIDCORE_EMBED_ORIGIN);
  if (autoplay !== undefined) {
    url.searchParams.set("autoplay", autoplay ? "true" : "false");
  }
  if (theme && /^[0-9a-f]{6}$/i.test(theme.replace(/^#/, ""))) {
    url.searchParams.set("theme", theme.replace(/^#/, "").toLowerCase());
  }
  return url.toString();
}

export function episodeNumberFromLabel(value?: string): number | null {
  const key = canonicalEpisodeKey(value);
  return positiveInteger(key);
}

export function formatEpisodeLabel(value?: string | null, fallback = "Tập 1"): string {
  const key = canonicalEpisodeKey(value || "");
  if (!key) return fallback;
  if (key === "full") return "Tập Full";
  if (/^\d+(?:\.\d+)?$/.test(key)) return `Tập ${key}`;

  const readable = String(value || "")
    .replace(/^(?:tập|tap|episode|ep)[\s:_-]*/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return readable ? `Tập ${readable}` : fallback;
}

export function resolveSeasonNumber(...values: Array<string | number | null | undefined>): number {
  for (const value of values) {
    if (typeof value === "number") {
      const parsed = positiveInteger(value);
      if (parsed) return parsed;
      continue;
    }
    const text = String(value || "").trim();
    if (!text) continue;
    const direct = /^0*(\d+)$/.exec(text);
    if (direct) {
      const parsed = positiveInteger(direct[1]);
      if (parsed) return parsed;
    }
    const labelled = /(?:season|mua|phan|ss)\s*[-_:]?\s*0*(\d+)/i.exec(normalizePlayerLabel(text));
    if (labelled) {
      const parsed = positiveInteger(labelled[1]);
      if (parsed) return parsed;
    }
  }
  return 1;
}

export function isAutomaticPlaybackSource(source: string | undefined) {
  return Boolean(
    source &&
      source !== "vidsrc" &&
      source !== "vidlink" &&
      source !== "2embed" &&
      source !== "vidcore",
  );
}

export function canUseUnsandboxedEmbed(source: string | undefined, url: string) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    const normalizedSource = source?.toLowerCase().trim() || "";

    if ((!normalizedSource || normalizedSource === "kkphim") && /^([a-z0-9-]+\.)?kkphimplayer\d*\.com$/.test(hostname)) {
      return true;
    }
    if ((!normalizedSource || normalizedSource === "ophim") && /^([a-z0-9-]+\.)?opstream\d*\.com$/.test(hostname)) {
      return true;
    }

    if (!normalizedSource) return false;
    const allowedSuffixes = UNSANDBOXED_EMBED_HOST_SUFFIXES[normalizedSource];
    if (!allowedSuffixes) return false;
    return allowedSuffixes.some(
      (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

export function normalizePlayerLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function detectServerType(serverName: string, serverLanguage?: string): ServerType {
  const value = normalizePlayerLabel(`${serverName || ""} ${serverLanguage || ""}`);

  if (/\b(song ngu|songngu|bilingual|multi sub|multisub|vietsub\s*song\s*ngu|song\s*ngu\s*ai|ai\s*song\s*ngu)\b/.test(value)) {
    return "song-ngu";
  }
  if (/\b(thuyet minh|thuyetminh|voice over|voiceover|tm|ai dub|ai dubbing|ai voice|thuyet\s*minh\s*ai|ai\s*thuyet\s*minh)\b/.test(value)) {
    return "thuyet-minh";
  }
  if (/\b(long tieng|longtieng|dub|dubbed|lt|long\s*tieng\s*ai)\b/.test(value)) {
    return "thuyet-minh";
  }
  if (/\b(eng sub|engsub|english sub|english subtitle)\b/.test(value)) {
    return "engsub";
  }
  if (/\b(viet sub|vietsub|phu de|subtitle|sub viet)\b/.test(value)) {
    return "vietsub";
  }
  if (/\b(raw|original|ban goc|no sub)\b/.test(value)) {
    return "raw";
  }

  // Unknown audio/subtitle metadata must not silently pollute the Vietsub tab.
  return "raw";
}

/** Keep external embed providers in their dedicated language groups. */
export function resolveServerType(
  source: string,
  serverName: string,
  serverLanguage?: string,
): ServerType {
  const normalizedSource = normalizePlayerLabel(source);
  if (normalizedSource === "vicdn") return "song-ngu";
  if (
    normalizedSource === "vidsrc" ||
    normalizedSource === "vidlink" ||
    normalizedSource === "2embed" ||
    normalizedSource === "vidcore"
  ) {
    return "engsub";
  }
  const detected = detectServerType(serverName, serverLanguage);
  if (detected === "raw") {
    // Default unspecified servers from Vietnamese providers to vietsub
    const val = normalizePlayerLabel(`${serverName || ""} ${serverLanguage || ""}`);
    if (!/\b(raw|original|ban goc|no sub)\b/.test(val)) {
      return "vietsub";
    }
  }
  return detected;
}

export function canonicalEpisodeKey(value?: string) {
  const normalized = normalizePlayerLabel(value || "");
  if (!normalized) return "";
  if (/\b(full|full movie|trailer|movie)\b/.test(normalized)) return "full";

  const numbered = normalized.match(
    /(?:tap|episode|ep|e|chuong|chapter)?\s*0*(\d+)(?:\s*[-.]\s*0*(\d+))?/,
  );
  if (numbered) {
    return numbered[2]
      ? `${Number(numbered[1])}.${Number(numbered[2])}`
      : String(Number(numbered[1]));
  }

  return normalized;
}

export function episodeIdentity(item?: EpisodeItem | null) {
  return canonicalEpisodeKey(item?.slug) || canonicalEpisodeKey(item?.name);
}

export function findMatchingEpisode(serverData: EpisodeItem[] | undefined, target?: string) {
  if (!serverData?.length) return undefined;
  const targetKey = canonicalEpisodeKey(target);
  if (!targetKey) return serverData[0];
  const exact = serverData.find((item) => episodeIdentity(item) === targetKey);
  if (exact) return exact;
  if (serverData.length === 1 && (targetKey === "full" || targetKey === "1")) {
    return serverData[0];
  }
  return undefined;
}

export function isPlayableEpisode(item?: EpisodeItem) {
  return Boolean(item?.link_m3u8 || item?.link_embed);
}

export function sourcePriority(
  source: string,
  serverData: EpisodeItem[] | undefined,
  target?: string,
) {
  const item = findMatchingEpisode(serverData, target);
  // Observable HLS playback is preferred over opaque cross-origin iframes:
  // manifest/segment failures can be detected and routed immediately.
  const transportBonus = item?.link_m3u8 ? 30 : item?.link_embed ? 5 : -20;
  return (PROVIDER_PRIORITY[source] ?? 0) + transportBonus;
}
