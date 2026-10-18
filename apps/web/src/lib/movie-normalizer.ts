import type { MovieSource } from "@/types/movie";

export type { MovieSource } from "@/types/movie";

export interface NormalizedFilmItem extends Record<string, unknown> {
  slug: string;
  name: string;
  origin_name?: string;
  year?: number;
  _source: MovieSource;
  _sources: MovieSource[];
  _sourceSlugs: Partial<Record<MovieSource, string>>;
  _canonicalKey: string;
  _duplicateCount: number;
  _rank: number;
}

const SOURCE_PRIORITY: MovieSource[] = [
  "kkphim",
  "xink",
  "nguonc",
  "vsmov",
  "ophim",
  "vicdn",
  "vidfast",
  "vidup",
  "vaplayer",
  "vidlink",
  "vidcore",
  "vidsrc",
  "2embed",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function readString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readNestedString(
  record: Record<string, unknown>,
  key: string,
  nestedKey: string,
) {
  return readString(asRecord(record[key])[nestedKey]);
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function slugify(value: string): string {
  return normalizeText(value).replace(/\s+/g, "-");
}

function getFilmName(record: Record<string, unknown>): string {
  return (
    readString(record.name) ||
    readString(record.title) ||
    readString(record.original_name) ||
    readString(record.origin_name) ||
    readString(record.slug) ||
    "unknown"
  );
}

function getOriginName(record: Record<string, unknown>): string | undefined {
  return readString(record.origin_name) || readString(record.original_name);
}

function getYear(record: Record<string, unknown>): number | undefined {
  return readNumber(record.year);
}

function getCanonicalMediaType(record: Record<string, unknown>): string {
  const tmdbType = readNestedString(record, "tmdb", "type");
  const value = normalizeText(
    tmdbType ||
      readString(record.mediaType) ||
      readString(record.type) ||
      "single",
  );
  if (["tv", "series", "phim bo", "tv series"].includes(value)) {
    return "series";
  }
  if (["movie", "single", "phim le"].includes(value)) return "single";
  if (["anime", "hoat hinh", "animation"].includes(value)) return "anime";
  if (["tvshows", "tv shows", "shows"].includes(value)) return "tvshows";
  return value || "single";
}

function cleanTitleForDedupe(text: string): string {
  if (!text) return "";
  return normalizeText(text)
    .replace(/\b(?:phan|season|mua)\s*(\d+)\b/gi, "season $1")
    .replace(
      /\b(phim|movie|tap\s*\d+|full|hd|fhd|4k|cam|hdcam|vietsub|thuyet minh|long tieng|chieu rap)\b/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function getCanonicalKey(record: Record<string, unknown>): string {
  const tmdbId =
    readNestedString(record, "tmdb", "id") || readString(record.tmdbId);
  const tmdbType = getCanonicalMediaType(record);
  if (tmdbId && tmdbId !== "0") return `tmdb:${tmdbType}:${tmdbId}`;

  const imdbId =
    readNestedString(record, "imdb", "id") || readString(record.imdbId);
  if (imdbId && imdbId !== "0") return `imdb:${imdbId.toLowerCase()}`;

  const year = getYear(record);
  const name = cleanTitleForDedupe(getFilmName(record) || "");
  const originName = cleanTitleForDedupe(getOriginName(record) || "");
  const slug = cleanTitleForDedupe(readString(record.slug) || "");
  const mediaType = getCanonicalMediaType(record);

  // Use origin_name if available (standardized international title), otherwise name or slug
  const primaryTitle = originName || name || slug;
  if (primaryTitle) {
    return year
      ? `film:${mediaType}:${primaryTitle}:${year}`
      : `film:${mediaType}:${primaryTitle}`;
  }

  return `title:${name || slug || "unknown"}`;
}

function getFilmAliases(record: Record<string, unknown>): string[] {
  const year = getYear(record);
  const mediaType = getCanonicalMediaType(record);
  const titles = [
    getFilmName(record),
    getOriginName(record),
    readString(record.original_name),
    readString(record.title),
    readString(record.slug),
  ]
    .map((value) => cleanTitleForDedupe(value || ""))
    .filter(Boolean);

  const aliases = new Set<string>();
  const canonical = getCanonicalKey(record);
  aliases.add(canonical);
  const slug = cleanTitleForDedupe(readString(record.slug) || "");
  if (slug) aliases.add(`slug:${mediaType}:${slug}`);
  for (const title of titles) {
    // A year is required for title aliases whenever it is known. This merges
    // provider translations without collapsing remakes with the same title.
    aliases.add(
      year
        ? `title:${mediaType}:${title}:${year}`
        : `title:${mediaType}:${title}`,
    );
  }
  return Array.from(aliases);
}

function sourcePriority(source: MovieSource): number {
  const index = SOURCE_PRIORITY.indexOf(source);
  return index === -1 ? SOURCE_PRIORITY.length : index;
}

function hasUsefulValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

export function extractFilmItems(data: unknown): unknown[] {
  const root = asRecord(data);
  if (Array.isArray(root.items)) return root.items;

  const dataRecord = asRecord(root.data);
  if (Array.isArray(dataRecord.items)) return dataRecord.items;

  const nestedDataRecord = asRecord(dataRecord.data);
  if (Array.isArray(nestedDataRecord.items)) return nestedDataRecord.items;

  return [];
}

export function normalizeFilmItem(
  item: unknown,
  source: MovieSource,
  rank: number,
): NormalizedFilmItem {
  const record = asRecord(item);
  const name = getFilmName(record);
  const originName = getOriginName(record);
  const year = getYear(record);
  const slug = readString(record.slug) || slugify(originName || name);
  const canonicalKey = getCanonicalKey({
    ...record,
    slug,
    name,
    origin_name: originName,
    year,
  });
  const existingSources = Array.isArray(record._sources)
    ? record._sources.filter(
        (item): item is MovieSource =>
          typeof item === "string" &&
          SOURCE_PRIORITY.includes(item as MovieSource),
      )
    : [];
  const sources = Array.from(new Set([source, ...existingSources])).sort(
    (left, right) => sourcePriority(left) - sourcePriority(right),
  );
  const rawQuality = readString(record.quality);
  let quality = rawQuality;
  if (quality && quality.toUpperCase().includes("4K")) {
    quality = quality.replace(/4k\s*ultra\s*hd|4k/gi, "FHD").trim();
    if (!quality || quality.toUpperCase() === "FHD") quality = "FHD";
  }

  const existingSlugs = isRecord(record._sourceSlugs)
    ? (record._sourceSlugs as Partial<Record<MovieSource, string>>)
    : {};

  return {
    ...record,
    slug,
    name,
    origin_name: originName,
    year,
    ...(quality !== undefined ? { quality } : {}),
    _source: source,
    _sources: sources,
    _sourceSlugs: { ...existingSlugs, [source]: slug },
    _canonicalKey: canonicalKey,
    _duplicateCount: Math.max(
      sources.length,
      readNumber(record._duplicateCount) || 1,
    ),
    _rank: readNumber(record._rank) ?? rank,
  };
}

function mergeFilm(
  existing: NormalizedFilmItem,
  incoming: NormalizedFilmItem,
): NormalizedFilmItem {
  const existingPriority = sourcePriority(existing._source);
  const incomingPriority = sourcePriority(incoming._source);
  const primary = incomingPriority < existingPriority ? incoming : existing;
  const secondary = primary === existing ? incoming : existing;
  const merged: Record<string, unknown> = { ...secondary };

  Object.entries(primary).forEach(([key, value]) => {
    if (hasUsefulValue(value)) merged[key] = value;
  });

  const sources = Array.from(
    new Set([...existing._sources, ...incoming._sources]),
  ).sort((a, b) => sourcePriority(a) - sourcePriority(b));

  return {
    ...merged,
    _source: primary._source,
    _sources: sources,
    _sourceSlugs: {
      ...existing._sourceSlugs,
      ...incoming._sourceSlugs,
    },
    _canonicalKey: existing._canonicalKey,
    _duplicateCount: sources.length,
    _rank: Math.min(existing._rank, incoming._rank),
  } as NormalizedFilmItem;
}

export function dedupeFilmsBySource(
  groups: Array<{ source: MovieSource; items: unknown[] }>,
): NormalizedFilmItem[] {
  const byKey = new Map<string, NormalizedFilmItem>();
  const aliasToKey = new Map<string, string>();
  let rank = 0;

  groups.forEach(({ source, items }) => {
    items.forEach((item) => {
      const normalized = normalizeFilmItem(item, source, rank++);
      const aliases = getFilmAliases(normalized);
      const matchedKey = aliases
        .map((alias) => aliasToKey.get(alias))
        .find((key): key is string => Boolean(key));
      const targetKey = matchedKey || normalized._canonicalKey;
      const existing = byKey.get(targetKey);
      byKey.set(
        targetKey,
        existing ? mergeFilm(existing, normalized) : normalized,
      );
      aliases.forEach((alias) => aliasToKey.set(alias, targetKey));
    });
  });

  return Array.from(byKey.values()).sort((a, b) => {
    const sourceDelta = sourcePriority(a._source) - sourcePriority(b._source);
    return sourceDelta || a._rank - b._rank;
  });
}

export function dedupeFilmItems(items: unknown[]): NormalizedFilmItem[] {
  const groups = new Map<MovieSource, unknown[]>();
  for (const item of items) {
    const record = asRecord(item);
    const source = (readString(record._source) || "kkphim") as MovieSource;
    const sourceItems = groups.get(source) || [];
    sourceItems.push(item);
    groups.set(source, sourceItems);
  }
  return dedupeFilmsBySource(
    Array.from(groups, ([source, sourceItems]) => ({
      source,
      items: sourceItems,
    })),
  );
}

export function isUsableMovieDetail(data: unknown): boolean {
  const root = asRecord(data);
  if (root.error) return false;

  const movie = asRecord(root.movie);
  if (
    readString(movie.slug) ||
    readString(movie.name) ||
    readString(movie.title)
  )
    return true;
  if (readString(root.slug) || readString(root.name) || readString(root.title))
    return true;

  return false;
}

export function tagMovieDetailSource(
  data: unknown,
  source: MovieSource,
): unknown {
  const root = asRecord(data);
  const movie = asRecord(root.movie);

  if (Object.keys(movie).length > 0) {
    return {
      ...root,
      _source: source,
      movie: {
        ...movie,
        _source: source,
      },
    };
  }

  return {
    ...root,
    _source: source,
  };
}
