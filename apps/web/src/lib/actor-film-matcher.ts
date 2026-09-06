import { normalizeForSearch } from "@/lib/text-utils";

export interface SystemFilmCandidate {
  id?: number | string;
  tmdb?: { id?: unknown };
  name?: string;
  origin_name?: string;
  year?: number | string;
}

export interface TmdbCreditCandidate {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
}

/**
 * Xác minh xem một bộ phim từ TMDB credit của diễn viên có thực sự khớp
 * với một bộ phim đang có trong cơ sở dữ liệu hệ thống NetPhim hay không.
 */
export function isFilmMatch(
  candidate: SystemFilmCandidate,
  credit: TmdbCreditCandidate,
): boolean {
  // 1. Khớp hoàn hảo theo TMDB ID nếu có
  const candTmdbId = Number(candidate.tmdb?.id);
  if (candTmdbId && candTmdbId === credit.id) {
    return true;
  }

  // 2. Khớp theo Tiêu đề tiếng Việt hoặc Tiêu đề gốc
  const candNormName = normalizeForSearch(candidate.name || "");
  const candNormOrigin = normalizeForSearch(candidate.origin_name || "");
  const credTitleNorm = normalizeForSearch(credit.title || credit.name || "");
  const credOriginNorm = normalizeForSearch(
    credit.original_title || credit.original_name || "",
  );

  const titleMatched =
    (credTitleNorm &&
      (candNormName === credTitleNorm || candNormOrigin === credTitleNorm)) ||
    (credOriginNorm &&
      (candNormName === credOriginNorm || candNormOrigin === credOriginNorm));

  if (!titleMatched) {
    return false;
  }

  // 3. Kiểm tra năm phát hành (chênh lệch tối đa 1 năm do lệch lịch công chiếu các nước)
  const candYear = Number(candidate.year);
  const credYear = Number(
    (credit.release_date || credit.first_air_date || "").slice(0, 4),
  );

  if (candYear && credYear && Math.abs(candYear - credYear) > 1) {
    return false;
  }

  return true;
}
