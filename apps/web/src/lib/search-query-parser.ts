import { normalizeForSearch, tokenizeQuery } from "@/lib/text-utils";

export interface ParsedSearchIntent {
  /** Query nguyên bản từ người dùng */
  rawQuery: string;
  /** Query đã chuẩn hóa (bỏ ký tự lạ, lowercase, normalize) */
  cleanQuery: string;
  /** Tên phim chính đã bóc tách các token filter (năm, phần, thuyết minh, tiền tố "phim"...) */
  baseQuery: string;
  /** Năm phát hành nếu tìm thấy trong query (ví dụ: 2024 trong "Dune 2024") */
  extractedYear?: number;
  /** Phần / Season nếu tìm thấy (ví dụ: 2 trong "Loki ss2", "Silo phần 2") */
  extractedSeason?: number;
  /** Định dạng âm thanh nếu tìm thấy */
  extractedAudio?: "thuyet-minh" | "long-tieng" | "vietsub";
  /** Loại phim nếu tìm thấy */
  extractedType?: "series" | "single" | "hoat-hinh";
  /** Có bóc tách được ý định cụ thể nào không */
  hasStructuredIntent: boolean;
  /** Danh sách các từ khóa mở rộng thông minh để query upstreams & local cache */
  expandedTerms: string[];
}

// ── Bảng chuyển đổi từ viết tắt / Acronyms điện ảnh phổ biến ───────
const ACRONYM_MAP: Record<string, string[]> = {
  got: ["Game of Thrones", "Trò Chơi Vương Quyền"],
  lotr: ["The Lord of the Rings", "Chúa Tể Những Chiếc Nhẫn"],
  aot: ["Attack on Titan", "Đại Chiến Titan", "Shingeki no Kyojin"],
  jjk: ["Jujutsu Kaisen", "Chú Thuật Hồi Chiến"],
  kny: ["Kimetsu no Yaiba", "Demon Slayer", "Thanh Gươm Diệt Quỷ"],
  ds: ["Demon Slayer", "Kimetsu no Yaiba"],
  op: ["One Piece", "Đảo Hải Tặc", "Vua Hải Tặc"],
  db: ["Dragon Ball", "Bảy Viên Ngọc Rồng"],
  dbz: ["Dragon Ball Z", "Dragon Ball Super"],
  bb: ["Breaking Bad", "Biến Chất"],
  twd: ["The Walking Dead", "Xác Sống"],
  hotd: ["House of the Dragon", "Gia Tộc Rồng"],
  st: ["Stranger Things", "Cậu Bé Mất Tích"],
  "f&f": ["Fast & Furious", "Quá Nhanh Quá Nguy Hiểm"],
  fnf: ["Fast & Furious", "Quá Nhanh Quá Nguy Hiểm"],
  hp: ["Harry Potter"],
  mcu: ["Marvel", "Avengers", "Biệt Đội Siêu Anh Hùng"],
  sw: ["Star Wars", "Chiến Tranh Giữa Các Vì Sao"],
};

// ── Damerau-Levenshtein Distance (chống gõ sai, gõ nhầm vị trí 2 chữ cái) ──
export function damerauLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  const maxLen = Math.max(lenA, lenB);
  if (maxLen > 25) return maxLen;

  const d: number[][] = Array.from({ length: lenA + 1 }, () =>
    new Array(lenB + 1).fill(0),
  );

  for (let i = 0; i <= lenA; i++) d[i][0] = i;
  for (let j = 0; j <= lenB; j++) d[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // Xóa
        d[i][j - 1] + 1, // Thêm
        d[i - 1][j - 1] + cost, // Thay thế
      );

      // Transposition (đảo 2 ký tự liền nhau: vd "teh" -> "the", "narotu" -> "naruto")
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[lenA][lenB];
}

/**
 * Kiểm tra xem 2 token có match mờ chấp nhận sai chính tả (Typo Tolerance) không.
 * Ngưỡng:
 * - Dưới 4 ký tự: phải exact match hoặc prefix match
 * - 4-6 ký tự: cho phép tối đa 1 ký tự sai (khoảng cách <= 1)
 * - 7 ký tự trở lên: cho phép tối đa 2 ký tự sai (khoảng cách <= 2)
 */
export function isFuzzyTokenMatch(queryTok: string, targetTok: string): boolean {
  if (queryTok === targetTok) return true;

  const qLen = queryTok.length;
  const tLen = targetTok.length;

  // Prefix / Suffix match
  if (qLen >= 4 && (targetTok.startsWith(queryTok) || queryTok.startsWith(targetTok))) {
    return true;
  }

  // Chênh lệch độ dài quá 2 thì chắc chắn không match
  if (Math.abs(qLen - tLen) > 2) return false;

  // Typo tolerance
  if (qLen >= 4 && qLen <= 6) {
    return damerauLevenshtein(queryTok, targetTok) <= 1;
  }

  if (qLen >= 7) {
    const dist = damerauLevenshtein(queryTok, targetTok);
    return dist <= 2;
  }

  return false;
}

/**
 * Phân tích cấu trúc câu truy vấn thông minh (Smart Intent Parser)
 */
export function parseSearchIntent(rawQuery: string): ParsedSearchIntent {
  const sanitized = (rawQuery || "")
    .replace(/[\\/()[\]{}*+?^$|#@~`"':;!<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const cleanQuery = normalizeForSearch(sanitized);

  if (!cleanQuery) {
    return {
      rawQuery,
      cleanQuery: "",
      baseQuery: "",
      hasStructuredIntent: false,
      expandedTerms: [],
    };
  }

  let base = cleanQuery;
  let extractedYear: number | undefined;
  let extractedSeason: number | undefined;
  let extractedAudio: ParsedSearchIntent["extractedAudio"];
  let extractedType: ParsedSearchIntent["extractedType"];

  // 1. Nhận diện Năm phát hành (vd: "dune 2024", "batman 2022", "oppenheimer 2023", "bo gia 1972")
  const yearMatch = base.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    const y = parseInt(yearMatch[1], 10);
    if (y >= 1920 && y <= 2035) {
      extractedYear = y;
      base = base.replace(new RegExp(`\\b${y}\\b`, "g"), " ").trim();
    }
  }

  // 2. Nhận diện Phần / Mùa / Season (vd: "loki ss2", "silo phan 2", "stranger things season 4", "cobra kai s6")
  const seasonMatch = base.match(
    /\b(?:season|phan|phan\s*so|mua|tap|ss|s|p)\s*(\d+)\b/i,
  );
  if (seasonMatch) {
    extractedSeason = parseInt(seasonMatch[1], 10);
    base = base
      .replace(/\b(?:season|phan|phan\s*so|mua|tap|ss|s|p)\s*\d+\b/gi, " ")
      .trim();
  } else {
    // Kiểu ngược lại: "2 phan", "phan 2"
    const revSeasonMatch = base.match(/\b(\d+)\s*(?:phan|mua)\b/i);
    if (revSeasonMatch) {
      extractedSeason = parseInt(revSeasonMatch[1], 10);
      base = base.replace(/\b\d+\s*(?:phan|mua)\b/gi, " ").trim();
    }
  }

  // 3. Nhận diện Ý định Âm thanh (Audio / Dubbing / Subtitles)
  const audioMatch = base.match(
    /\b(thuyet minh|long tieng|vietsub|subteam|long-tieng|thuyet-minh|thuyết minh|lồng tiếng)\b/i,
  );
  if (audioMatch) {
    const kw = normalizeForSearch(audioMatch[1]);
    if (kw.includes("thuyet minh")) extractedAudio = "thuyet-minh";
    else if (kw.includes("long tieng")) extractedAudio = "long-tieng";
    else if (kw.includes("vietsub") || kw.includes("subteam"))
      extractedAudio = "vietsub";

    base = base
      .replace(
        /\b(?:thuyet minh|long tieng|vietsub|subteam|long-tieng|thuyet-minh)\b/gi,
        " ",
      )
      .trim();
  }

  // 4. Nhận diện Loại phim (Movie / TV Series / Anime)
  const typeMatch = base.match(
    /\b(phim bo|series|tv series|phim le|movie|movies|phim hoat hinh|hoat hinh|anime|hoat hoa)\b/i,
  );
  if (typeMatch) {
    const kw = normalizeForSearch(typeMatch[1]);
    if (kw.includes("phim bo") || kw.includes("series") || kw.includes("tv")) {
      extractedType = "series";
    } else if (kw.includes("phim le") || kw.includes("movie")) {
      extractedType = "single";
    } else if (kw.includes("hoat hinh") || kw.includes("anime")) {
      extractedType = "hoat-hinh";
    }

    base = base
      .replace(
        /\b(?:phim bo|series|tv series|phim le|movie|movies|phim hoat hinh|hoat hinh|anime|hoat hoa)\b/gi,
        " ",
      )
      .trim();
  }

  // 5. Loại bỏ các tiền tố tìm kiếm thừa (vd: "phim", "xem phim", "tim phim", "coi phim")
  base = base
    .replace(/^(?:xem phim|tim phim|coi phim|phim hay|phim moi|phim)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Nếu bóc tách xong mà base rỗng thì fallback lại cleanQuery ban đầu
  const finalBaseQuery = base || cleanQuery;

  const hasStructuredIntent = Boolean(
    extractedYear || extractedSeason || extractedAudio || extractedType || (finalBaseQuery !== cleanQuery),
  );

  // 6. Xây dựng danh sách các từ khóa mở rộng (expanded terms)
  const expanded = new Set<string>();

  // Term gốc & Clean
  expanded.add(cleanQuery);
  if (finalBaseQuery && finalBaseQuery !== cleanQuery) {
    expanded.add(finalBaseQuery);
  }

  // Kiểm tra Acronyms
  const acronymHits = ACRONYM_MAP[cleanQuery] || ACRONYM_MAP[finalBaseQuery];
  if (acronymHits) {
    for (const hit of acronymHits) {
      expanded.add(normalizeForSearch(hit));
    }
  }

  // Biến thể Season / Phần
  if (extractedSeason !== undefined && finalBaseQuery) {
    expanded.add(`${finalBaseQuery} phan ${extractedSeason}`);
    expanded.add(`${finalBaseQuery} season ${extractedSeason}`);
    expanded.add(`${finalBaseQuery} s${extractedSeason}`);
    expanded.add(`${finalBaseQuery} ss${extractedSeason}`);
    expanded.add(`${finalBaseQuery} p${extractedSeason}`);
    expanded.add(`${finalBaseQuery} ${extractedSeason}`);
  }

  // Biến thể Năm
  if (extractedYear !== undefined && finalBaseQuery) {
    expanded.add(`${finalBaseQuery} ${extractedYear}`);
  }

  // Biến thể compact (bỏ khoảng trắng: "spider man" -> "spiderman")
  const compact = cleanQuery.replace(/\s+/g, "");
  if (compact !== cleanQuery) expanded.add(compact);
  const compactBase = finalBaseQuery.replace(/\s+/g, "");
  if (compactBase !== finalBaseQuery) expanded.add(compactBase);

  return {
    rawQuery,
    cleanQuery,
    baseQuery: finalBaseQuery,
    extractedYear,
    extractedSeason,
    extractedAudio,
    extractedType,
    hasStructuredIntent,
    expandedTerms: Array.from(expanded).filter(Boolean),
  };
}
