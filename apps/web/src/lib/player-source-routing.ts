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
  "kkphimplayer7.com",
  "ophim.live",
  "ophim1.com",
  "opstream12.com",
  "nguonc.com",
  "streamc.xyz",
  "vsmov.com",
  "streamvsmov.com",
  "vicdn.cc",
];

export function isDirectHlsAllowedByCsp(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
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

export function getSourceAbbr(source?: string): string {
  if (!source) return "KP";
  const s = source.toLowerCase();
  if (s.includes("kkphim") || s === "kp") return "KP";
  if (s.includes("nguonc") || s === "nc") return "NC";
  if (s.includes("vsmov") || s === "vs") return "VS";
  if (s.includes("ophim") || s === "op") return "OP";
  if (s.includes("vicdn") || s === "vicdn") return "ViCDN";
  if (s.includes("vidsrc")) return "VidSrc";
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
  return source?.trim() || "Nguồn phát";
}

const PROVIDER_PRIORITY: Record<string, number> = {
  kkphim: 40,
  nguonc: 35,
  vsmov: 30,
  ophim: 25,
  vicdn: 20,
  vidsrc: 5,
};

const UNSANDBOXED_EMBED_HOSTS = new Set([
  "vidsrc.sbs",
  "www.vidsrc.sbs",
  "vicdn.cc",
  "www.vicdn.cc",
]);

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

/** Build ViCDN embed URLs: https://vicdn.cc/movie-{tmdbId} or https://vicdn.cc/tv-{tmdbId}-{season}-{episode} */
export function buildVicdnEmbedUrl({
  tmdbId,
  mediaType,
  season,
  episode,
}: VicdnEmbedOptions): string | null {
  const safeTmdbId = positiveInteger(tmdbId);
  if (!safeTmdbId) return null;

  if (mediaType === "movie") {
    return `https://vicdn.cc/movie-${safeTmdbId}`;
  }
  const safeSeason = positiveInteger(season) || 1;
  const safeEpisode = positiveInteger(episode) || 1;
  return `https://vicdn.cc/tv-${safeTmdbId}-${safeSeason}-${safeEpisode}`;
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
  return Boolean(source && source !== "vidsrc");
}

export function canUseUnsandboxedEmbed(source: string | undefined, url: string) {
  if (source !== "vidsrc" && source !== "vicdn") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && UNSANDBOXED_EMBED_HOSTS.has(parsed.hostname);
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

  if (/\b(song ngu|songngu|bilingual|multi sub|multisub|vietsub\s*song\s*ngu)\b/.test(value)) {
    return "song-ngu";
  }
  if (/\b(thuyet minh|thuyetminh|voice over|voiceover|tm)\b/.test(value)) {
    return "thuyet-minh";
  }
  if (/\b(long tieng|longtieng|dub|dubbed|lt)\b/.test(value)) {
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
  if (normalizedSource === "vidsrc") return "engsub";
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
  return serverData.find((item) => episodeIdentity(item) === targetKey);
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
