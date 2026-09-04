/**
 * Movie Normalization & Fuzzy Matching Engine
 * Standardizes title, removes Vietnamese accents, trims noise, and merges multi-source movie records.
 */

export interface MovieSourceReference {
  provider: "kkphim" | "ophim" | "nguonc" | string;
  sourceId: string;
  url?: string;
  episodes?: Array<{
    name: string;
    slug: string;
    embedUrl?: string;
    m3u8Url?: string;
  }>;
}

export interface UnifiedMovieRecord {
  id: string;
  slug: string;
  title: string;
  originTitle?: string;
  normalizedTitle: string;
  year?: number;
  type: string;
  status?: string;
  posterUrl?: string;
  thumbUrl?: string;
  description?: string;
  genres?: string[];
  countries?: string[];
  sources: MovieSourceReference[];
  updatedAt: number;
}

/**
 * Strips Vietnamese accents, lowercase, removes noise tokens and extra spaces.
 */
export function normalizeTitle(title: string): string {
  if (!title) return "";

  let str = title.toLowerCase().trim();

  // Remove Vietnamese accents
  str = str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");

  // Strip quality & season tags like (phần 1), season 1, - full hd, vietsub
  str = str
    .replace(
      /\b(phan\s*\d+|season\s*\d+|ss\d+|full\s*hd|vietsub|thuyet\s*minh|long\s*tieng)\b/gi,
      "",
    )
    .replace(/[^\w\s]/gi, " ") // Replace punctuation with space
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();

  return str;
}

/**
 * Checks if two movie records match based on normalized title, release year, or origin title.
 */
export function matchMovies(
  movieA: { title: string; year?: number; originTitle?: string; tmdbId?: string | number },
  movieB: { title: string; year?: number; originTitle?: string; tmdbId?: string | number },
): boolean {
  // 1. Infallible match if both have valid matching TMDB IDs
  if (movieA.tmdbId && movieB.tmdbId && String(movieA.tmdbId) === String(movieB.tmdbId)) {
    return true;
  }

  // If both have release years and they differ by > 1 year, treat as different movies (e.g. remake/reboot)
  if (movieA.year && movieB.year && Math.abs(movieA.year - movieB.year) > 1) {
    return false;
  }

  const normA = normalizeTitle(movieA.title);
  const normB = normalizeTitle(movieB.title);
  const normOriginA = movieA.originTitle ? normalizeTitle(movieA.originTitle) : "";
  const normOriginB = movieB.originTitle ? normalizeTitle(movieB.originTitle) : "";

  // 2. Exact normalized title match
  if (normA && normB && normA === normB) {
    return true;
  }

  // 3. Exact origin title match
  if (normOriginA && normOriginB && normOriginA === normOriginB) {
    return true;
  }

  // 4. Cross match: title A matches origin B, or origin A matches title B
  if (normA && normOriginB && normA === normOriginB) {
    return true;
  }
  if (normOriginA && normB && normOriginA === normB) {
    return true;
  }

  // 5. Containment match for compound titles (e.g. "Đảo Hải Tặc - One Piece" vs "Đảo Hải Tặc")
  const checkContainment = (t1: string, t2: string) => {
    if (!t1 || !t2 || t1.length < 3 || t2.length < 3) return false;
    const longer = t1.length >= t2.length ? t1 : t2;
    const shorter = t1.length < t2.length ? t1 : t2;
    return longer.includes(shorter) && shorter.length / longer.length >= 0.45;
  };

  if (checkContainment(normA, normB)) return true;
  if (checkContainment(normOriginA, normOriginB)) return true;
  if (checkContainment(normA, normOriginB)) return true;
  if (checkContainment(normOriginA, normB)) return true;

  return false;
}

/**
 * Merges two matching movie records into a single unified record while preserving source references.
 */
export function mergeMovieRecords(
  existing: UnifiedMovieRecord,
  incoming: UnifiedMovieRecord,
): UnifiedMovieRecord {
  const mergedSources = [...existing.sources];

  for (const src of incoming.sources) {
    const existingSrcIndex = mergedSources.findIndex(
      (s) => s.provider === src.provider,
    );
    if (existingSrcIndex >= 0) {
      mergedSources[existingSrcIndex] = {
        ...mergedSources[existingSrcIndex],
        ...src,
      };
    } else {
      mergedSources.push(src);
    }
  }

  return {
    ...existing,
    title: existing.title || incoming.title,
    originTitle: existing.originTitle || incoming.originTitle,
    posterUrl: existing.posterUrl || incoming.posterUrl,
    thumbUrl: existing.thumbUrl || incoming.thumbUrl,
    description: existing.description || incoming.description,
    year: existing.year || incoming.year,
    genres: Array.from(
      new Set([...(existing.genres || []), ...(incoming.genres || [])]),
    ),
    countries: Array.from(
      new Set([...(existing.countries || []), ...(incoming.countries || [])]),
    ),
    sources: mergedSources,
    updatedAt: Date.now(),
  };
}
