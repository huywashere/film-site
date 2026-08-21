/**
 * NetPhim Smart Search Engine
 *
 * Pipeline:
 *   raw query
 *     → normalize (bỏ dấu, lowercase, trim)
 *     → tokenize
 *     → score mỗi film (exact > prefix > token > fuzzy)
 *     → boost theo độ phổ biến (nhiều nguồn = phổ biến hơn)
 *     → sort & trả về
 */

import { normalizeText } from "@/lib/movie-normalizer";
import type { NormalizedFilmItem } from "@/lib/movie-normalizer";

// ── Text helpers ──────────────────────────────────────────────────

/** Bỏ dấu tiếng Việt, lowercase, chỉ giữ a-z0-9 và space */
export function normalize(text: string): string {
  return normalizeText(text);
}

/** Tách thành mảng token, bỏ token rỗng */
function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean);
}

// ── Fuzzy: Levenshtein distance (capped) ─────────────────────────

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Only compute for short strings to keep it fast
  if (a.length > 20 || b.length > 20) return Math.abs(a.length - b.length) + 1;

  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) =>
      i === 0 ? j : j === 0 ? i : 0,
    ),
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/** Fuzzy similarity 0–1 (1 = identical) */
function fuzzyScore(a: string, b: string): number {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

// ── Scoring ───────────────────────────────────────────────────────

export interface ScoredFilm extends NormalizedFilmItem {
  _searchScore: number;
  _matchType: "exact" | "prefix" | "token" | "fuzzy" | "none";
}

const WEIGHTS = {
  exact: 1000, // "avengers endgame" === "avengers endgame"
  prefix: 600, // starts with query
  tokenAllMatch: 400, // tất cả token đều match
  tokenPartial: 200, // một số token match
  fuzzy: 100, // gần giống
  multiSource: 80, // xuất hiện ở nhiều nguồn
  yearBoost: 20, // phim mới hơn được ưu tiên nhẹ
};

function scoreFilm(
  film: NormalizedFilmItem,
  normQuery: string,
  queryTokens: string[],
): ScoredFilm {
  const normName = normalize(film.name || "");
  const normOrigin = normalize(film.origin_name || "");
  const normSlug = normalize(film.slug || "");

  let score = 0;
  let matchType: ScoredFilm["_matchType"] = "none";

  // ── 1. Exact match ──
  if (normName === normQuery || normOrigin === normQuery) {
    score += WEIGHTS.exact;
    matchType = "exact";
  }

  // ── 2. Prefix match ──
  if (matchType === "none") {
    if (
      normName.startsWith(normQuery) ||
      normOrigin.startsWith(normQuery) ||
      normSlug.startsWith(normQuery)
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

  // ── 4. Token matching ──
  if (queryTokens.length > 0) {
    const nameTokens = tokenize(film.name || "");
    const originTokens = tokenize(film.origin_name || "");
    const allTargetTokens = [...nameTokens, ...originTokens];

    let matchedCount = 0;
    for (const qt of queryTokens) {
      const matched = allTargetTokens.some(
        (tt) =>
          tt === qt ||
          tt.startsWith(qt) ||
          qt.startsWith(tt) ||
          fuzzyScore(qt, tt) > 0.8,
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

  // ── 5. Fuzzy fallback ──
  if (matchType === "none" || score < WEIGHTS.tokenPartial) {
    const fuzzName = fuzzyScore(
      normQuery,
      normName.slice(0, normQuery.length + 4),
    );
    const fuzzOrigin = fuzzyScore(
      normQuery,
      normOrigin.slice(0, normQuery.length + 4),
    );
    const bestFuzz = Math.max(fuzzName, fuzzOrigin);
    if (bestFuzz > 0.6) {
      score += WEIGHTS.fuzzy * bestFuzz;
      if (matchType === "none") matchType = "fuzzy";
    }
  }

  // ── 6. Multi-source boost (phim phổ biến hơn) ──
  score += ((film._duplicateCount || 1) - 1) * WEIGHTS.multiSource;

  // ── 7. Year boost (phim mới hơn) ──
  if (film.year && film.year > 2010) {
    score += Math.min((film.year - 2010) * 0.5, WEIGHTS.yearBoost);
  }

  return { ...film, _searchScore: isNaN(score) ? 0 : score, _matchType: matchType };
}

// ── Main ranking function ─────────────────────────────────────────

/**
 * Nhận danh sách film đã merge từ nhiều nguồn,
 * score và sort theo độ liên quan với query.
 */
export function rankSearchResults(
  films: NormalizedFilmItem[],
  query: string,
): ScoredFilm[] {
  if (!query.trim())
    return films.map((f) => ({
      ...f,
      _searchScore: 0,
      _matchType: "none" as const,
    }));

  const normQuery = normalize(query);
  const queryTokens = tokenize(query);

  return films
    .map((film) => scoreFilm(film, normQuery, queryTokens))
    .filter((f) => f._searchScore > 0 || films.length <= 10)
    .sort((a, b) => b._searchScore - a._searchScore);
}

// ── Query expansion ───────────────────────────────────────────────

/**
 * Sinh thêm các biến thể query để tăng recall:
 * - Bỏ dấu tiếng Việt
 * - Bỏ các từ phổ biến (phim, the, a, an...)
 * - Tách số ra (season 2 → season, 2)
 */
export function expandQuery(query: string): string[] {
  const variants = new Set<string>();
  const trimmed = query.trim();

  variants.add(trimmed);
  variants.add(normalize(trimmed));

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
