export type ServerType = "vietsub" | "thuyet-minh" | "engsub" | "raw";

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

export function selectInitialHlsTransport(
  directUrl: string,
  proxyUrl: string | undefined,
  preferSameOrigin: boolean,
) {
  const safeProxy = proxyUrl?.startsWith("/api/hls-proxy?") ? proxyUrl : "";
  const primary =
    preferSameOrigin && safeProxy ? safeProxy : directUrl || safeProxy;
  const fallback = primary === safeProxy ? directUrl : safeProxy;

  return {
    primary,
    fallback: fallback && fallback !== primary ? fallback : undefined,
  };
}

export function getSourceAbbr(source?: string): string {
  if (!source) return "KP";
  const s = source.toLowerCase();
  if (s.includes("kkphim") || s === "kp") return "KP";
  if (s.includes("nguonc") || s === "nc") return "NC";
  if (s.includes("vsmov") || s === "vs") return "VS";
  if (s.includes("ophim") || s === "op") return "OP";
  if (s.includes("vidsrc")) return "VidSrc";
  return source.toUpperCase();
}

const PROVIDER_PRIORITY: Record<string, number> = {
  kkphim: 40,
  nguonc: 35,
  vsmov: 30,
  ophim: 25,
  vidsrc: 5,
};

const UNSANDBOXED_VIDSRC_HOSTS = new Set(["vidsrc.sbs", "www.vidsrc.sbs"]);

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

export function episodeNumberFromLabel(value?: string): number | null {
  const key = canonicalEpisodeKey(value);
  return positiveInteger(key);
}

export function resolveSeasonNumber(
  ...values: Array<string | number | null | undefined>
): number {
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
    const labelled = /(?:season|mua|phan|ss)\s*[-_:]?\s*0*(\d+)/i.exec(
      normalizePlayerLabel(text),
    );
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

export function canUseUnsandboxedEmbed(
  source: string | undefined,
  url: string,
) {
  if (source !== "vidsrc") return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      UNSANDBOXED_VIDSRC_HOSTS.has(parsed.hostname)
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

export function detectServerType(
  serverName: string,
  serverLanguage?: string,
): ServerType {
  const value = normalizePlayerLabel(
    `${serverName || ""} ${serverLanguage || ""}`,
  );

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

export function findMatchingEpisode(
  serverData: EpisodeItem[] | undefined,
  target?: string,
) {
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
