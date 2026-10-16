/**
 * FlexPhim Smart Search Engine
 *
 * Pipeline:
 *   raw query
 *     → normalize (bỏ dấu, lowercase, trim) [via shared text-utils]
 *     → parse intent (năm, phần, âm thanh, loại phim, typo tolerance) [via search-query-parser]
 *     → tokenize
 *     → score mỗi film (exact > prefix > token > typo-fuzzy)
 *     → boost theo ý định cấu trúc (năm đúng, phần đúng, âm thanh đúng)
 *     → boost theo độ phổ biến (nhiều nguồn = phổ biến hơn)
 *     → sort & trả về
 */

import { normalizeText } from "@/lib/movie-normalizer";
import { normalizeForSearch, tokenizeQuery } from "@/lib/text-utils";
import { expandSearchAliases } from "@/lib/search-query-aliases";
import {
  parseSearchIntent,
  damerauLevenshtein,
  isFuzzyTokenMatch,
} from "@/lib/search-query-parser";
import type { NormalizedFilmItem } from "@/lib/movie-normalizer";

// ── Text helpers ──────────────────────────────────────────────────

/**
 * Bỏ dấu tiếng Việt, lowercase, chỉ giữ a-z0-9 và space.
 * Dùng shared normalizeForSearch (character-map based) làm primary,
 * fallback sang normalizeText (NFD-based) để backward-compat.
 */
export function normalize(text: string): string {
  return normalizeForSearch(text) || normalizeText(text);
}

function expandSeasonVariants(value: string): string[] {
  const normalized = normalize(value);
  const match = normalized.match(/\b(?:phan|season|mua|s|ss|p)\s*(\d+)\b/);
  if (!match) return [normalized];
  const base = normalized
    .replace(/\b(?:phan|season|mua|s|ss|p)\s*\d+\b/, " ")
    .replace(/\s+/g, " ")
    .trim();
  return [
    normalized,
    `${base} phan ${match[1]}`.trim(),
    `${base} season ${match[1]}`.trim(),
    `${base} s${match[1]}`.trim(),
    `${base} ss${match[1]}`.trim(),
  ];
}

/** Tách thành mảng token, bỏ token rỗng và stopwords */
function tokenize(text: string): string[] {
  return tokenizeQuery(text);
}

// ── Fuzzy: Levenshtein distance (capped) ─────────────────────────

function levenshtein(a: string, b: string): number {
  return damerauLevenshtein(a, b);
}

/** Fuzzy similarity 0–1 (1 = identical) */
function fuzzyScore(a: string, b: string): number {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : Math.max(0, 1 - dist / maxLen);
}

function searchableValues(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      return [record.name, record.title].filter(
        (item): item is string => typeof item === "string",
      );
    }
    return [];
  });
}

// ── Scoring ───────────────────────────────────────────────────────

export interface ScoredFilm extends NormalizedFilmItem {
  _searchScore: number;
  _matchType: "exact" | "prefix" | "token" | "fuzzy" | "none";
}

const WEIGHTS = {
  exact: 1200, // "avengers endgame" === "avengers endgame"
  slugExact: 1000,
  prefix: 600, // starts with query
  tokenAllMatch: 450, // tất cả token đều match
  tokenPartial: 200, // một số token match
  fuzzy: 180, // gần giống (chấp nhận typo)
  multiSource: 120, // xuất hiện ở nhiều nguồn = uy tín/phổ biến hơn
  yearBoost: 30, // phim mới hơn được ưu tiên nhẹ
  qualityHD: 200, // HD / FHD
  hasPoster: 100, // có ảnh poster hợp lệ
  trailerPenalty: -700, // Trừ điểm nặng phim Trailer / Cam / Preview
};

/** Nhận diện phim chất lượng kém, trailer, review, clip phụ */
function isLowQualityOrTrailer(film: NormalizedFilmItem): boolean {
  const text =
    `${film.name || ""} ${film.origin_name || ""} ${film.slug || ""}`.toLowerCase();
  const quality = String(film.quality || "").toLowerCase();
  const episode = String(film.episode_current || "").toLowerCase();

  if (
    quality.includes("trailer") ||
    episode.includes("trailer") ||
    text.includes("trailer") ||
    text.includes("hau truong") ||
    text.includes("hậu trường") ||
    text.includes("review") ||
    text.includes("preview") ||
    text.includes("ban cam") ||
    text.includes("bản cam") ||
    text.includes("hdcam") ||
    text.includes("hd-cam") ||
    text.includes("tap 0") ||
    text.includes("tập 0")
  ) {
    return true;
  }
  return false;
}

function scoreFilm(
  film: NormalizedFilmItem,
  normQuery: string,
  queryTokens: string[],
): ScoredFilm {
  const normName = normalize(film.name || "");
  const normOrigin = normalize(film.origin_name || "");
  const normSlug = normalize(film.slug || "");
  const compactQuery = normQuery.replace(/\s+/g, "");
  const compactName = normName.replace(/\s+/g, "");
  const compactOrigin = normOrigin.replace(/\s+/g, "");
  const compactSlug = normSlug.replace(/\s+/g, "");
  const normMetadata = normalize(
    [
      ...searchableValues(film.actor),
      ...searchableValues(film.director),
      ...searchableValues(film.category),
    ].join(" "),
  );

  let score = 0;
  let matchType: ScoredFilm["_matchType"] = "none";

  // ── 1. Exact match trên Name, Origin Name, hoặc Slug ──
  if (
    normName === normQuery ||
    normOrigin === normQuery ||
    compactName === compactQuery ||
    compactOrigin === compactQuery
  ) {
    score += WEIGHTS.exact;
    matchType = "exact";
  } else if (
    normSlug === normQuery ||
    normSlug.replace(/-/g, " ") === normQuery ||
    compactSlug === compactQuery
  ) {
    score += WEIGHTS.slugExact;
    matchType = "exact";
  }

  // ── 2. Prefix match ──
  if (matchType === "none") {
    if (
      normName.startsWith(normQuery) ||
      normOrigin.startsWith(normQuery) ||
      normSlug.startsWith(normQuery) ||
      compactName.startsWith(compactQuery) ||
      compactOrigin.startsWith(compactQuery)
    ) {
      score += WEIGHTS.prefix;
      matchType = "prefix";
    }
  }

  // ── 3. Contains full query ──
  if (normName.includes(normQuery) || normOrigin.includes(normQuery)) {
    score += WEIGHTS.prefix * 0.8;
    if (matchType === "none") matchType = "prefix";
  }

  // ── 4. Token matching (Typo-Tolerant) ──
  if (queryTokens.length > 0) {
    const nameTokens = tokenize(film.name || "");
    const originTokens = tokenize(film.origin_name || "");
    const metadataTokens = tokenize(normMetadata);
    const allTargetTokens = [...nameTokens, ...originTokens, ...metadataTokens];

    let matchedCount = 0;
    for (const qt of queryTokens) {
      const matched = allTargetTokens.some(
        (tt) =>
          tt === qt ||
          (qt.length >= 4 && tt.startsWith(qt)) ||
          (tt.length >= 4 && qt.startsWith(tt)) ||
          isFuzzyTokenMatch(qt, tt),
      );
      if (matched) matchedCount++;
    }

    const ratio = matchedCount / queryTokens.length;
    if (ratio === 1) {
      score += WEIGHTS.tokenAllMatch;
      if (matchType === "none") matchType = "token";
    } else if (ratio > 0) {
      score += WEIGHTS.tokenPartial * ratio;
      if (matchType === "none") matchType = "token";
    }
  }

  // ── 5. Fuzzy fallback với Typo Tolerance toàn diện ──
  if (matchType === "none" || score < WEIGHTS.tokenPartial) {
    const distName = damerauLevenshtein(normQuery, normName);
    const distOrigin = damerauLevenshtein(normQuery, normOrigin);
    const minFullDist = Math.min(distName, distOrigin);

    if (normQuery.length >= 5 && minFullDist <= 1) {
      score += WEIGHTS.exact * 0.85;
      if (matchType === "none") matchType = "fuzzy";
    } else if (normQuery.length >= 7 && minFullDist <= 2) {
      score += WEIGHTS.exact * 0.7;
      if (matchType === "none") matchType = "fuzzy";
    } else {
      const fuzzName = fuzzyScore(
        normQuery,
        normName.slice(0, normQuery.length + 4),
      );
      const fuzzOrigin = fuzzyScore(
        normQuery,
        normOrigin.slice(0, normQuery.length + 4),
      );
      const bestFuzz = Math.max(fuzzName, fuzzOrigin);
      if (bestFuzz > 0.65) {
        score += WEIGHTS.fuzzy * bestFuzz;
        if (matchType === "none") matchType = "fuzzy";
      }
    }
  }

  // ── 6. Quality & Completeness Boosts ──
  const qStr = String(film.quality || "").toLowerCase();
  if (
    qStr.includes("fhd") ||
    qStr.includes("hd") ||
    qStr.includes("bluray")
  ) {
    score += WEIGHTS.qualityHD;
  }

  if (film.poster_url || film.thumb_url) {
    score += WEIGHTS.hasPoster;
  }

  // ── 7. Trailer / CAM / Review Penalty (hạ sâu phim rác, chỉ xem trailer) ──
  if (isLowQualityOrTrailer(film)) {
    score += WEIGHTS.trailerPenalty;
  }

  // ── 8. Multi-source boost (phim phổ biến hơn) ──
  score += ((film._duplicateCount || 1) - 1) * WEIGHTS.multiSource;

  // ── 9. Year boost (phim mới hơn) ──
  if (film.year && film.year > 2010) {
    score += Math.min((film.year - 2010) * 0.5, WEIGHTS.yearBoost);
  }

  return {
    ...film,
    _searchScore: isNaN(score) ? 0 : score,
    _matchType: matchType,
  };
}

// ── Main ranking function ─────────────────────────────────────────

/**
 * Nhận danh sách film đã merge từ nhiều nguồn,
 * score và sort theo độ liên quan với query, kết hợp nhận diện ý định thông minh.
 */
export function rankSearchResults(
  films: NormalizedFilmItem[],
  query: string,
): ScoredFilm[] {
  // Sanitize query: bỏ dấu gạch chéo nhầm, ký tự lạ
  const sanitizedQuery = (query || "")
    .replace(/[\\/()[\]{}*+?^$|#@~`"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitizedQuery)
    return films.map((f) => ({
      ...f,
      _searchScore: 0,
      _matchType: "none" as const,
    }));

  const parsedIntent = parseSearchIntent(sanitizedQuery);

  const queryVariants = Array.from(
    new Set(
      [
        ...expandSearchAliases(sanitizedQuery),
        ...parsedIntent.expandedTerms,
        sanitizedQuery,
        normalize(sanitizedQuery),
        parsedIntent.baseQuery,
      ]
        .flatMap(expandSeasonVariants)
        .filter(Boolean),
    ),
  ).slice(0, 32);

  if (queryVariants.length === 0) queryVariants.push(normalize(sanitizedQuery));

  const scored = films.map((film) => {
    const candidates = queryVariants.map((variant) =>
      scoreFilm(film, variant, tokenize(variant)),
    );
    const best = candidates.reduce((highest, candidate) =>
      candidate._searchScore > highest._searchScore ? candidate : highest,
    );

    let intentBonus = 0;

    // ── Intent Boost 1: Khớp chính xác năm khi người dùng gõ năm trong query ──
    if (parsedIntent.extractedYear && film.year) {
      if (Number(film.year) === parsedIntent.extractedYear) {
        intentBonus += 600; // Khớp chuẩn năm phát hành (vd: Dune 2024)
      } else {
        intentBonus -= 150; // Khác năm đã tìm kiếm
      }
    }

    // ── Intent Boost 2: Khớp chính xác Season / Phần ──
    if (parsedIntent.extractedSeason !== undefined) {
      const text = `${film.name || ""} ${film.origin_name || ""} ${film.slug || ""}`.toLowerCase();
      const s = parsedIntent.extractedSeason;
      const hasTargetSeason =
        text.includes(`phan ${s}`) ||
        text.includes(`phần ${s}`) ||
        text.includes(`season ${s}`) ||
        text.includes(`ss${s}`) ||
        text.includes(`s${s}`) ||
        text.includes(`p${s}`);

      if (hasTargetSeason) {
        intentBonus += 750;
      } else {
        // Nếu phim có chứa season khác (vd: người dùng tìm season 2 nhưng phim là season 1)
        const hasOtherSeason = /\b(?:phan|season|ss|s)\s*(\d+)\b/i.test(text);
        if (hasOtherSeason) {
          intentBonus -= 400;
        }
      }
    }

    // ── Intent Boost 3: Khớp âm thanh (Thuyết minh / Lồng tiếng / Vietsub) ──
    if (parsedIntent.extractedAudio && film.lang) {
      const l = String(film.lang || "").toLowerCase();
      if (
        (parsedIntent.extractedAudio === "thuyet-minh" && (l.includes("thuyết minh") || l.includes("thuyet minh"))) ||
        (parsedIntent.extractedAudio === "long-tieng" && (l.includes("lồng tiếng") || l.includes("long tieng"))) ||
        (parsedIntent.extractedAudio === "vietsub" && (l.includes("vietsub") || l.includes("sub")))
      ) {
        intentBonus += 350;
      }
    }

    // ── Intent Boost 4: Khớp loại phim ──
    if (parsedIntent.extractedType && film.type) {
      if (film.type === parsedIntent.extractedType) {
        intentBonus += 250;
      }
    }

    return {
      ...best,
      _searchScore: best._searchScore + intentBonus,
    };
  });

  // Provider search endpoints sometimes append broadly related catalogue
  // items. Once at least one real text/actor match exists, hide entries that
  // only received quality/poster boosts.
  const relevant = scored.filter((film) => film._matchType !== "none");
  const candidates = relevant.length > 0 ? relevant : scored;

  // Sắp xếp: điểm cao nhất lên đầu. Nếu cùng điểm, ưu tiên phim có ảnh và chất lượng HD
  return candidates
    .filter((f) => f._searchScore > -200 || films.length <= 6)
    .sort((a, b) => b._searchScore - a._searchScore);
}

// ── Query expansion ───────────────────────────────────────────────

/**
 * Sinh thêm các biến thể query để tăng recall:
 * - Bỏ dấu tiếng Việt
 * - Bóc tách ý định (năm, phần, âm thanh)
 * - Mở rộng từ điển Franchise & Multilingual
 * - Bỏ các stopwords (phim, the, a, an...)
 */
export function expandQuery(query: string): string[] {
  const variants = new Set<string>();
  const trimmed = query.trim();

  variants.add(trimmed);
  variants.add(normalize(trimmed));

  const parsed = parseSearchIntent(trimmed);
  if (parsed.baseQuery && parsed.baseQuery !== trimmed) {
    variants.add(parsed.baseQuery);
    variants.add(normalize(parsed.baseQuery));
  }

  for (const alias of expandSearchAliases(trimmed)) variants.add(alias);
  for (const term of parsed.expandedTerms) variants.add(term);

  for (const alias of Array.from(variants)) {
    for (const seasonVariant of expandSeasonVariants(alias)) {
      variants.add(seasonVariant);
    }
  }

  // Bỏ stopwords tiếng Việt và tiếng Anh
  const stopwords = [
    "phim",
    "the",
    "a",
    "an",
    "of",
    "and",
    "va",
    "cua",
    "bo",
    "le",
  ];
  const tokens = tokenize(trimmed).filter((t) => !stopwords.includes(t));
  if (tokens.length > 0 && tokens.join(" ") !== normalize(trimmed)) {
    variants.add(tokens.join(" "));
  }

  // Nếu query có số ở cuối, thêm variant không có số
  const withoutTrailingNumber = normalize(trimmed)
    .replace(/\s+\d+$/, "")
    .trim();
  if (withoutTrailingNumber && withoutTrailingNumber !== normalize(trimmed)) {
    variants.add(withoutTrailingNumber);
  }

  return Array.from(variants).filter(Boolean);
}
