// Engine phát hiện và đồng bộ các phần phim (Seasons / Multi-part series) cho NetPhim
import { kkphimApi, movieApi } from "@/lib/api";
import { extractFilmItems } from "@/lib/movie-normalizer";

export interface MoviePartItem {
  partNumber: number;
  partLabel: string; // e.g. "Phần 1", "Phần 2"
  title: string;
  slug: string;
  year?: number;
  quality?: string;
  poster_url?: string;
  thumb_url?: string;
  isCurrent?: boolean;
}

export interface ParsedPartInfo {
  baseTitle: string;
  baseSlug: string;
  partNumber: number;
  partLabel: string;
}

const ROMAN_MAP: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
  X: 10,
  XI: 11,
  XII: 12,
};

export function parseRomanOrArabic(val: string): number | null {
  if (!val) return null;
  const trimmed = val.trim();
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num > 0) return num;
  const upper = trimmed.toUpperCase();
  return ROMAN_MAP[upper] || null;
}

// Regex phát hiện các định dạng phần phim tiếng Việt & tiếng Anh
// Ví dụ: (Phần 1), Phần 2, Phần II, Season 1, SS 2, Part 1, Chapter 2, Vol 1
const TITLE_PART_REGEX =
  /(?:[([–—:\-/]|\s+|^)(?:Phần|Phan|Season|SS|Part|Vol\.?|Chapter)\s*([0-9]+|[IVXLCDM]+)(?:[)\]–—:\-/]|\s+|$)/i;

const SLUG_PART_REGEX = /-(?:phan|season|ss|part)-([0-9]+|[ivx]+)(?:-|$)/i;

const TITLE_END_NUM_REGEX = /^(.*?)\s+([0-9]+|[IVX]+)$/i;

export function cleanBaseTitle(title: string): string {
  return title
    .replace(TITLE_PART_REGEX, " ")
    .replace(/\s+/g, " ")
    .replace(/[\s()\[\]:;–—\-/]+$/, "")
    .trim();
}

export function parsePartInfo(
  title?: string,
  originTitle?: string,
  slug?: string,
): ParsedPartInfo | null {
  const cleanTitle = (title || "").trim();
  const cleanOrigin = (originTitle || "").trim();
  const cleanSlug = (slug || "").trim();

  // 1. Thử phân tích title tiếng Việt
  let match = cleanTitle.match(TITLE_PART_REGEX);
  let partNum: number | null = null;
  let baseTitle = "";

  if (match) {
    partNum = parseRomanOrArabic(match[1]);
    if (partNum) {
      baseTitle = cleanBaseTitle(cleanTitle);
    }
  }

  // 2. Thử phân tích slug nếu chưa tìm thấy
  if (!partNum && cleanSlug) {
    const slugMatch = cleanSlug.match(SLUG_PART_REGEX);
    if (slugMatch) {
      partNum = parseRomanOrArabic(slugMatch[1]);
      if (partNum && !baseTitle) {
        baseTitle = cleanTitle;
      }
    }
  }

  // 3. Thử phân tích originTitle (Season 1, Part 2...)
  if (!partNum && cleanOrigin) {
    const originMatch = cleanOrigin.match(TITLE_PART_REGEX);
    if (originMatch) {
      partNum = parseRomanOrArabic(originMatch[1]);
      if (partNum && !baseTitle) {
        baseTitle = cleanTitle;
      }
    }
  }

  // 4. Thử đuôi số (ví dụ: Spider-Man 2, Deadpool 2)
  if (!partNum && cleanTitle) {
    const endNumMatch = cleanTitle.match(TITLE_END_NUM_REGEX);
    if (endNumMatch) {
      partNum = parseRomanOrArabic(endNumMatch[2]);
      if (partNum && !baseTitle) {
        baseTitle = endNumMatch[1].trim();
      }
    }
  }

  if (!partNum) return null;

  const baseSlug = cleanSlug ? cleanSlug.replace(SLUG_PART_REGEX, "").replace(/-[0-9]+$/, "") : "";

  return {
    baseTitle: baseTitle || cleanTitle,
    baseSlug: baseSlug || cleanSlug,
    partNumber: partNum,
    partLabel: `Phần ${partNum}`,
  };
}

export function normalizeBaseTitle(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type SeriesIdentity = {
  name?: string;
  origin_name?: string;
  slug?: string;
};

function seriesBaseAliases(film: SeriesIdentity): Set<string> {
  return new Set(
    [film.name, film.origin_name]
      .map((title) => {
        const cleanTitle = String(title || "").trim();
        if (!cleanTitle) return "";
        const parsed = parsePartInfo(cleanTitle);
        return normalizeBaseTitle(parsed?.baseTitle || cleanBaseTitle(cleanTitle));
      })
      .filter(Boolean),
  );
}

/** Match only seasons of the same show, never similarly prefixed spin-offs. */
export function isSameMovieSeries(
  current: SeriesIdentity,
  candidate: SeriesIdentity,
): boolean {
  const currentAliases = seriesBaseAliases(current);
  const candidateAliases = seriesBaseAliases(candidate);
  if (
    Array.from(currentAliases).some((alias) => candidateAliases.has(alias))
  ) {
    return true;
  }

  const currentBaseSlug = parsePartInfo(
    current.name,
    current.origin_name,
    current.slug,
  )?.baseSlug;
  const candidateBaseSlug = parsePartInfo(
    candidate.name,
    candidate.origin_name,
    candidate.slug,
  )?.baseSlug;
  return Boolean(
    currentBaseSlug &&
      candidateBaseSlug &&
      currentBaseSlug === candidateBaseSlug,
  );
}

/**
 * Tìm kiếm các phần phim có sẵn trong catalog vũ trụ điện ảnh (Marvel & DC)
 * Dùng dynamic import để không làm phình bundle kích thước các trang khác.
 */
export async function findUniverseParts(film: {
  name: string;
  slug: string;
  origin_name?: string;
}): Promise<MoviePartItem[]> {
  try {
    const { MARVEL_UNIVERSE_FILMS, DC_UNIVERSE_FILMS } = await import(
      "@/lib/universe-catalog"
    );
    const allUniverseFilms = [
      ...MARVEL_UNIVERSE_FILMS,
      ...DC_UNIVERSE_FILMS,
    ];

    const currentParsed = parsePartInfo(film.name, film.origin_name, film.slug);

    const matchedPartsMap = new Map<number, MoviePartItem>();

    for (const item of allUniverseFilms) {
      const itemParsed = parsePartInfo(item.name, item.origin_name, item.slug);
      if (!itemParsed) continue;

      if (isSameMovieSeries(film, item)) {
        matchedPartsMap.set(itemParsed.partNumber, {
          partNumber: itemParsed.partNumber,
          partLabel: `Phần ${itemParsed.partNumber}`,
          title: item.name,
          slug: item.slug,
          year: item.year,
          quality: item.quality,
          poster_url: item.poster_url,
          thumb_url: item.thumb_url,
          isCurrent: item.slug === film.slug,
        });
      }
    }

    // Đảm bảo phần hiện tại có mặt
    if (currentParsed && !matchedPartsMap.has(currentParsed.partNumber)) {
      matchedPartsMap.set(currentParsed.partNumber, {
        partNumber: currentParsed.partNumber,
        partLabel: `Phần ${currentParsed.partNumber}`,
        title: film.name,
        slug: film.slug,
        isCurrent: true,
      });
    }

    const result = Array.from(matchedPartsMap.values()).sort(
      (a, b) => a.partNumber - b.partNumber,
    );

    return result.length > 1 ? result : [];
  } catch {
    return [];
  }
}

/**
 * Tìm tất cả các phần phim liên quan từ:
 * 1. Catalog nội bộ vũ trụ điện ảnh (Marvel/DC)
 * 2. Tìm kiếm API từ kho phim chung (KKPhim/OPhim/NguonC)
 */
export async function resolveAllMovieParts(film: {
  name: string;
  slug: string;
  origin_name?: string;
  year?: number;
  quality?: string;
  poster_url?: string;
  thumb_url?: string;
}): Promise<MoviePartItem[]> {
  // 1. Kiểm tra catalog vũ trụ trước
  const universeParts = await findUniverseParts(film);

  // 2. Phân tích phần phim hiện tại
  const parsed = parsePartInfo(film.name, film.origin_name, film.slug);
  if (!parsed) {
    return universeParts;
  }

  const { baseTitle, partNumber } = parsed;

  const partsMap = new Map<number, MoviePartItem>();

  for (const part of universeParts) {
    partsMap.set(part.partNumber, part);
  }

  // Thêm phần hiện tại vào map
  partsMap.set(partNumber, {
    partNumber,
    partLabel: `Phần ${partNumber}`,
    title: film.name,
    slug: film.slug,
    year: film.year,
    quality: film.quality,
    poster_url: film.poster_url,
    thumb_url: film.thumb_url,
    isCurrent: true,
  });

  try {
    // 3. Gateway ưu tiên tốc độ nên có thể chỉ trả một nhóm nhỏ. Truy vấn
    // KKPhim với limit lớn bổ sung đủ season, sau đó hợp nhất theo slug.
    const originParsed = parsePartInfo(film.origin_name);
    const directQuery = originParsed?.baseTitle || baseTitle;
    const searchResults = await Promise.allSettled([
      movieApi.search(baseTitle, 1, 100),
      kkphimApi.search(directQuery, 1, 100),
    ]);
    const searchItems = searchResults.flatMap((result) =>
      result.status === "fulfilled"
        ? (extractFilmItems(result.value) as any[])
        : [],
    );
    const seenSlugs = new Set<string>();

    for (const item of searchItems) {
      if (!item?.slug || !item?.name || seenSlugs.has(item.slug)) continue;
      seenSlugs.add(item.slug);
      const itemParsed = parsePartInfo(item.name, item.origin_name, item.slug);
      if (!itemParsed) continue;

      if (isSameMovieSeries(film, item)) {
        const existing = partsMap.get(itemParsed.partNumber);
        if (!existing || (!existing.isCurrent && item.slug === film.slug)) {
          partsMap.set(itemParsed.partNumber, {
            partNumber: itemParsed.partNumber,
            partLabel: `Phần ${itemParsed.partNumber}`,
            title: item.name,
            slug: item.slug,
            year: item.year,
            quality: item.quality,
            poster_url: item.poster_url,
            thumb_url: item.thumb_url,
            isCurrent: item.slug === film.slug,
          });
        }
      }
    }
  } catch {
    // Không chặn hiển thị nếu API tìm kiếm gặp sự cố
  }

  const parts = Array.from(partsMap.values()).sort(
    (a, b) => a.partNumber - b.partNumber,
  );

  return parts.length > 1 ? parts : [];
}
