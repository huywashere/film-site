export type HlsUriKind = "manifest" | "segment" | "resource";

export type HlsUriRewriter = (absoluteUrl: string, kind: HlsUriKind) => string;

export interface HlsAdFilterStats {
  detectedBreaks: number;
  removedSegments: number;
  removedTags: number;
  removedUris: number;
  reasons: string[];
  adMarkers: Array<{ start: number; duration: number }>;
}

export interface HlsAdFilterResult {
  manifest: string;
  stats: HlsAdFilterStats;
}

export interface HlsFragmentLike {
  cc?: number;
  start: number;
  duration: number;
  url?: string;
}

export interface HlsDetectedAdRange {
  start: number;
  end: number;
  duration: number;
  skippable: true;
}

const AD_HOST_TOKENS = [
  "ads",
  "adserver",
  "advertising",
  "adsystem",
  "adtech",
  "pagead",
  "doubleclick",
  "googlesyndication",
  "googleadservices",
  "adservice",
  "adnxs",
  "adform",
  "adroll",
  "criteo",
  "taboola",
  "outbrain",
  "revcontent",
  "mgid",
  "propellerads",
  "popcash",
  "popads",
  "exoclick",
  "trafficjunky",
  "juicyads",
  "hilltopads",
  "adsterra",
  "clickadu",
  "richpush",
  "pushground",
  "evadav",
  "zeropark",
  "admaven",
  "adcash",
  "bidvertiser",
  "yllix",
  "cdn-ads",
  "ad-cdn",
  "ads-cdn",
  "789bet",
  "shbet",
  "jun88",
  "hi88",
  "f8bet",
  "okvip",
  "new88",
  "bk8",
  "w88",
  "fun88",
  "12bet",
  "v9bet",
  "fb88",
  "m88",
  "kubet",
  "thabet",
  "rikvip",
  "go88",
  "sunwin",
  "9922",
  "8877",
  "78win",
  "ku11",
  "kucasino",
  "88online",
  "choi88",
  "win79",
  "b52",
  "macao",
  "taixiu",
  "nohu",
  "quayhu",
  "gamebai",
  "baccarat",
  "mb66",
  "789club",
  "hitclub",
  "iwin",
  "twin",
  "winbet",
  "bet69",
  "keonhacai",
  "typhu88",
  "lode88",
  "debet",
  "zbet",
  "oxbet",
  "five88",
  "sin88",
  "may88",
  "red88",
  "sky88",
  "sv88",
  "uk88",
  "lucky88",
  "ta88",
  "mu9",
  "fcb8",
  "bong88",
  "sodo",
  "sodocasino",
  "ae888",
  "ee88",
  "qh88",
  "vn88",
  "viva88",
  "k8cc",
  "st666",
  "tf88",
  "vz99",
  "sm66",
  "mig8",
  "k8",
  "cmd368",
  "dafabet",
  "188bet",
];

const AD_HOST_SUFFIXES = ["ads.google.com", "adf.ly", "shorte.st", "ouo.io"];

const AD_PATH_PATTERN =
  /(?:^|[/_.,?=&-])(ads?|advert(?:isement|ising)?|commercial|preroll|midroll|postroll|sponsor(?:ed)?|betting|casino|nha-?cai|quang-?cao)(?:$|[/_.,?=&-])/i;

const AD_MARKER_PATTERN =
  /(?:^|[\s._:-])(ad|ads|advert|commercial|preroll|midroll|postroll|interstitial|scte|splice)(?:$|[\s._:-])/i;

const SEGMENT_SCOPED_TAGS = [
  "#EXT-X-STREAM-INF:",
  "#EXTINF:",
  "#EXT-X-BYTERANGE:",
  "#EXT-X-PROGRAM-DATE-TIME:",
  "#EXT-X-GAP",
  "#EXT-X-BITRATE:",
];

function rememberReason(stats: HlsAdFilterStats, reason: string) {
  if (!stats.reasons.includes(reason)) stats.reasons.push(reason);
}

function resolveUrl(baseUrl: string, value: string): string {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function classifyUri(url: string, hasExtInf: boolean): HlsUriKind {
  const pathname = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return url.toLowerCase().split("?")[0];
    }
  })();

  if (pathname.endsWith(".m3u8") || pathname.endsWith(".m3u")) {
    return "manifest";
  }
  if (hasExtInf || /\.(?:ts|m4s|mp4|aac|ac3|ec3|vtt|webvtt)$/.test(pathname)) {
    return "segment";
  }
  return "resource";
}

function parseDurationFromExtInf(lines: string[]): number {
  const extInf = lines.find((line) => line.startsWith("#EXTINF:"));
  if (!extInf) return 0;
  const value = Number.parseFloat(
    extInf.slice("#EXTINF:".length).split(",")[0],
  );
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function parseAttributeList(line: string): Record<string, string> {
  const separator = line.indexOf(":");
  if (separator < 0) return {};

  const input = line.slice(separator + 1);
  const attributes: Record<string, string> = {};
  const matcher = /([A-Z0-9-]+)=("(?:[^"\\]|\\.)*"|[^,]*)/gi;
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(input))) {
    const raw = match[2].trim();
    attributes[match[1].toUpperCase()] =
      raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
  }
  return attributes;
}

function replaceUriAttribute(
  line: string,
  originalUrl: string,
  rewriteUri: HlsUriRewriter,
): { line?: string; blocked: boolean } {
  const match = line.match(/URI=(?:"([^"]+)"|([^,]+))/i);
  const rawUri = match?.[1] || match?.[2]?.trim();
  if (!match || !rawUri) return { line, blocked: false };

  const absoluteUrl = resolveUrl(originalUrl, rawUri);
  if (isLikelyAdUrl(absoluteUrl)) return { blocked: true };

  const kind = classifyUri(absoluteUrl, line.startsWith("#EXT-X-PART:"));
  const rewritten = rewriteUri(absoluteUrl, kind);
  return {
    line: line.replace(match[0], `URI="${rewritten}"`),
    blocked: false,
  };
}

export function isLikelyAdUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const hostLabels = hostname.split(".");
    const hasAdHost =
      AD_HOST_SUFFIXES.some(
        (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
      ) ||
      AD_HOST_TOKENS.some((token) =>
        hostLabels.some(
          (label) =>
            label === token ||
            label.startsWith(`${token}-`) ||
            label.endsWith(`-${token}`),
        ),
      );
    if (hasAdHost) return true;
    return AD_PATH_PATTERN.test(`${url.pathname}${url.search}`);
  } catch {
    return AD_PATH_PATTERN.test(value);
  }
}

/**
 * Only treats a discontinuity block as skippable when at least one fragment
 * has an explicit ad URL. A short discontinuity is common for codec/source
 * changes and must never be used as ad evidence on its own.
 */
export function detectExplicitHlsAdRanges(
  fragments: HlsFragmentLike[],
): HlsDetectedAdRange[] {
  if (!fragments.length) return [];

  type Block = {
    cc: number;
    start: number;
    end: number;
    hasAdUrl: boolean;
  };
  const blocks: Block[] = [];
  let current: Block | null = null;

  for (const fragment of fragments) {
    if (
      !Number.isFinite(fragment.start) ||
      !Number.isFinite(fragment.duration) ||
      fragment.duration <= 0
    ) {
      continue;
    }
    const cc = fragment.cc ?? 0;
    const end = fragment.start + fragment.duration;
    const hasAdUrl = isLikelyAdUrl(fragment.url || "");
    if (!current || current.cc !== cc) {
      if (current) blocks.push(current);
      current = { cc, start: fragment.start, end, hasAdUrl };
      continue;
    }
    current.end = Math.max(current.end, end);
    current.hasAdUrl ||= hasAdUrl;
  }
  if (current) blocks.push(current);

  return blocks.flatMap((block) => {
    const duration = block.end - block.start;
    // Guard against a bad manifest turning a marker into a movie-length seek.
    if (!block.hasAdUrl || duration <= 0 || duration > 180) return [];
    return [{
      start: block.start,
      end: block.end,
      duration,
      skippable: true as const,
    }];
  });
}

function isClientSideInterstitial(attributes: Record<string, string>): boolean {
  return Boolean(
    attributes["X-ASSET-URI"] ||
    attributes["X-ASSET-LIST"] ||
    attributes.CLASS?.toLowerCase().includes("com.apple.hls.interstitial"),
  );
}

function isAdDateRange(attributes: Record<string, string>): boolean {
  const markerText = `${attributes.ID || ""} ${attributes.CLASS || ""}`;
  return Boolean(
    attributes["SCTE35-OUT"] ||
    attributes["SCTE35-IN"] ||
    attributes["X-ASSET-URI"] ||
    attributes["X-ASSET-LIST"] ||
    AD_MARKER_PATTERN.test(markerText),
  );
}

export function filterHlsManifest(
  content: string,
  originalUrl: string,
  rewriteUri: HlsUriRewriter = (url) => url,
): HlsAdFilterResult {
  const stats: HlsAdFilterStats = {
    detectedBreaks: 0,
    removedSegments: 0,
    removedTags: 0,
    removedUris: 0,
    reasons: [],
    adMarkers: [],
  };
  const output: string[] = [];
  const pendingSegmentTags: string[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let cueAdBreak = false;
  let cueAdSecondsRemoved = 0;
  let timedAdSecondsRemaining = 0;
  let removedSinceLastMedia = false;
  let keptMediaSegments = 0;
  let playableTimelineSeconds = 0;

  const recordAdMarker = (duration: number) => {
    if (!Number.isFinite(duration) || duration <= 0) return;
    const previous = stats.adMarkers.at(-1);
    if (previous && Math.abs(previous.start - playableTimelineSeconds) < 0.1) {
      previous.duration += duration;
      return;
    }
    stats.adMarkers.push({ start: playableTimelineSeconds, duration });
  };

  const addBoundaryIfNeeded = () => {
    if (!removedSinceLastMedia) return;
    if (keptMediaSegments === 0) {
      removedSinceLastMedia = false;
      return;
    }
    if (output[output.length - 1] !== "#EXT-X-DISCONTINUITY") {
      output.push("#EXT-X-DISCONTINUITY");
    }
    removedSinceLastMedia = false;
  };

  const flushPendingTags = () => {
    output.push(...pendingSegmentTags);
    pendingSegmentTags.length = 0;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      if (pendingSegmentTags.length === 0) output.push("");
      continue;
    }

    if (line.startsWith("#EXT-X-CUE-OUT-CONT")) {
      cueAdBreak = true;
      stats.removedTags++;
      rememberReason(stats, "cue-out");
      continue;
    }

    if (line.startsWith("#EXT-X-CUE-OUT")) {
      cueAdBreak = true;
      cueAdSecondsRemoved = 0;
      stats.detectedBreaks++;
      stats.removedTags++;
      rememberReason(stats, "cue-out");
      continue;
    }

    if (line.startsWith("#EXT-X-CUE-IN")) {
      cueAdBreak = false;
      cueAdSecondsRemoved = 0;
      timedAdSecondsRemaining = 0;
      stats.removedTags++;
      rememberReason(stats, "cue-in");
      continue;
    }

    if (line.startsWith("#EXT-X-DATERANGE:")) {
      const attributes = parseAttributeList(line);
      if (isAdDateRange(attributes)) {
        stats.detectedBreaks++;
        stats.removedTags++;
        rememberReason(stats, "daterange");
        if (!isClientSideInterstitial(attributes)) {
          const duration = Number.parseFloat(
            attributes.DURATION || attributes["PLANNED-DURATION"] || "0",
          );
          if (Number.isFinite(duration) && duration > 0 && duration <= 180) {
            timedAdSecondsRemaining = Math.max(
              timedAdSecondsRemaining,
              duration,
            );
          } else if (attributes["SCTE35-OUT"]) {
            cueAdBreak = true;
          }
        }
        if (attributes["SCTE35-IN"]) cueAdBreak = false;
        continue;
      }
    }

    if (
      line.startsWith("#EXT-OATCLS-SCTE35") ||
      line.startsWith("#EXT-X-SCTE35") ||
      line.startsWith("#EXT-X-SPLICEPOINT-SCTE35")
    ) {
      stats.removedTags++;
      rememberReason(stats, "scte35");
      continue;
    }

    if (line === "#EXT-X-DISCONTINUITY") {
      if (cueAdBreak || timedAdSecondsRemaining > 0 || removedSinceLastMedia) {
        stats.removedTags++;
        removedSinceLastMedia = true;
      } else if (output[output.length - 1] !== line) {
        flushPendingTags();
        output.push(line);
      }
      continue;
    }

    if (SEGMENT_SCOPED_TAGS.some((prefix) => line.startsWith(prefix))) {
      pendingSegmentTags.push(line);
      continue;
    }

    if (line.startsWith("#") && /URI=/i.test(line)) {
      const rewritten = replaceUriAttribute(line, originalUrl, rewriteUri);
      if (rewritten.blocked || cueAdBreak || timedAdSecondsRemaining > 0) {
        stats.removedTags++;
        stats.removedUris += rewritten.blocked ? 1 : 0;
        if (rewritten.blocked) rememberReason(stats, "uri");
        continue;
      }
      flushPendingTags();
      output.push(rewritten.line || line);
      continue;
    }

    if (line.startsWith("#")) {
      flushPendingTags();
      output.push(line);
      continue;
    }

    const absoluteUrl = resolveUrl(originalUrl, line);
    const hasExtInf = pendingSegmentTags.some((tag) =>
      tag.startsWith("#EXTINF:"),
    );
    const uriKind = classifyUri(absoluteUrl, hasExtInf);
    const duration = parseDurationFromExtInf(pendingSegmentTags);
    const blockedByUrl = isLikelyAdUrl(absoluteUrl);
    let blockedByMarker =
      uriKind === "segment" &&
      duration > 0 &&
      (cueAdBreak || timedAdSecondsRemaining > 0);
    // A malformed CUE-OUT without CUE-IN must never remove the remaining
    // movie and make the player jump to its end.
    if (cueAdBreak && cueAdSecondsRemoved + duration > 180) {
      cueAdBreak = false;
      cueAdSecondsRemoved = 0;
      blockedByMarker = timedAdSecondsRemaining > 0 && duration > 0;
    }

    if (blockedByUrl || blockedByMarker) {
      if (uriKind === "segment") recordAdMarker(duration);
      pendingSegmentTags.length = 0;
      stats.removedSegments += uriKind === "segment" ? 1 : 0;
      stats.removedUris++;
      removedSinceLastMedia = uriKind === "segment" || removedSinceLastMedia;
      if (blockedByUrl) rememberReason(stats, "uri");
      if (blockedByMarker) rememberReason(stats, "marker");
      if (blockedByMarker && cueAdBreak) cueAdSecondsRemoved += duration;
      if (timedAdSecondsRemaining > 0) {
        timedAdSecondsRemaining = Math.max(
          0,
          timedAdSecondsRemaining - duration,
        );
      }
      continue;
    }

    if (uriKind === "segment") {
      addBoundaryIfNeeded();
      keptMediaSegments++;
      playableTimelineSeconds += duration;
    }
    flushPendingTags();
    output.push(rewriteUri(absoluteUrl, uriKind));
  }

  flushPendingTags();
  return { manifest: output.join("\n"), stats };
}
