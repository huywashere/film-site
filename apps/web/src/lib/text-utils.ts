/**
 * text-utils.ts — Shared text normalization utilities
 *
 * Single source of truth cho tất cả search-related text processing.
 * Thay thế các hàm normalize bị duplicate ở smart-search.ts và search-engine.ts.
 */

// ── Vietnamese character map ──────────────────────────────────────

const VI_CHAR_MAP: Record<string, string> = {
  à: "a", á: "a", ả: "a", ã: "a", ạ: "a",
  ă: "a", ắ: "a", ặ: "a", ằ: "a", ẳ: "a", ẵ: "a",
  â: "a", ấ: "a", ầ: "a", ẩ: "a", ẫ: "a", ậ: "a",
  è: "e", é: "e", ẻ: "e", ẽ: "e", ẹ: "e",
  ê: "e", ế: "e", ề: "e", ệ: "e", ể: "e", ễ: "e",
  ì: "i", í: "i", ỉ: "i", ĩ: "i", ị: "i",
  ò: "o", ó: "o", ỏ: "o", õ: "o", ọ: "o",
  ô: "o", ố: "o", ồ: "o", ổ: "o", ỗ: "o", ộ: "o",
  ơ: "o", ớ: "o", ờ: "o", ở: "o", ỡ: "o", ợ: "o",
  ù: "u", ú: "u", ủ: "u", ũ: "u", ụ: "u",
  ư: "u", ứ: "u", ừ: "u", ử: "u", ữ: "u", ự: "u",
  ỳ: "y", ý: "y", ỷ: "y", ỹ: "y", ỵ: "y",
  đ: "d",
  // Uppercase
  À: "a", Á: "a", Ả: "a", Ã: "a", Ạ: "a",
  Ă: "a", Ắ: "a", Ặ: "a", Ằ: "a", Ẳ: "a", Ẵ: "a",
  Â: "a", Ấ: "a", Ầ: "a", Ẩ: "a", Ẫ: "a", Ậ: "a",
  È: "e", É: "e", Ẻ: "e", Ẽ: "e", Ẹ: "e",
  Ê: "e", Ế: "e", Ề: "e", Ệ: "e", Ể: "e", Ễ: "e",
  Ì: "i", Í: "i", Ỉ: "i", Ĩ: "i", Ị: "i",
  Ò: "o", Ó: "o", Ỏ: "o", Õ: "o", Ọ: "o",
  Ô: "o", Ố: "o", Ồ: "o", Ổ: "o", Ỗ: "o", Ộ: "o",
  Ơ: "o", Ớ: "o", Ờ: "o", Ở: "o", Ỡ: "o", Ợ: "o",
  Ù: "u", Ú: "u", Ủ: "u", Ũ: "u", Ụ: "u",
  Ư: "u", Ứ: "u", Ừ: "u", Ử: "u", Ữ: "u", Ự: "u",
  Ỳ: "y", Ý: "y", Ỷ: "y", Ỹ: "y", Ỵ: "y",
  Đ: "d",
};

// Pre-built regex for all Vietnamese chars (faster than normalizeNFD for runtime)
const VI_CHAR_REGEX = new RegExp(
  `[${Object.keys(VI_CHAR_MAP).join("")}]`,
  "g",
);

/**
 * Bỏ dấu tiếng Việt + lowercase + chỉ giữ a-z0-9 và space.
 * Đây là hàm DÙNG CHUNG duy nhất — không import removeAccents từ smart-search hay normalize từ search-engine.
 *
 * Dùng character map thay vì NFD.normalize() để:
 * - Nhanh hơn khi gọi nhiều lần (không cố định string allocation)
 * - Chính xác hơn với ký tự đặc biệt tiếng Việt
 */
export function normalizeForSearch(text: string): string {
  if (!text) return "";
  return text
    .replace(VI_CHAR_REGEX, (ch) => VI_CHAR_MAP[ch] || ch)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tách query thành mảng token, bỏ token rỗng và stopwords.
 */
const STOPWORDS = new Set([
  "phim", "the", "a", "an", "of", "and", "va", "cua", "bo", "le",
]);

export function tokenizeQuery(text: string): string[] {
  return normalizeForSearch(text)
    .split(" ")
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

/**
 * Nhận diện ngôn ngữ query để ưu tiên alias direction:
 * - "vi"    → tìm VN alias trước → expand sang EN
 * - "en"    → tìm EN alias trước → expand sang VN
 * - "mixed" → thử cả hai
 */
export function detectQueryLang(query: string): "vi" | "en" | "mixed" {
  // Check for Vietnamese diacritics
  const hasVietnamese = VI_CHAR_REGEX.test(query);
  // Reset lastIndex since we used global regex
  VI_CHAR_REGEX.lastIndex = 0;
  const hasLatin = /[a-zA-Z]/.test(query);

  if (hasVietnamese) return "vi";
  if (hasLatin) return "en";
  return "mixed";
}

/**
 * Kiểm tra query có dấu tiếng Việt/CJK không — dùng để điều chỉnh debounce delay.
 * IME input (tiếng Việt, tiếng Trung, tiếng Nhật) cần delay dài hơn để tránh query nửa chừng.
 */
export function isIMEQuery(text: string): boolean {
  // Vietnamese diacritics range + CJK Unified Ideographs
  return /[\u00C0-\u024F\u1E00-\u1EFF\u4E00-\u9FFF]/.test(text);
}

// ── Trie cho FRANCHISE_ALIASES lookup ────────────────────────────

interface TrieNode {
  children: Map<string, TrieNode>;
  aliases: string[];
}

function createNode(): TrieNode {
  return { children: new Map(), aliases: [] };
}

export class AliasTrie {
  private readonly root: TrieNode = createNode();

  /** Insert một alias key → list of expanded terms */
  insert(key: string, terms: string[]): void {
    let node = this.root;
    for (const ch of key) {
      if (!node.children.has(ch)) {
        node.children.set(ch, createNode());
      }
      node = node.children.get(ch)!;
    }
    for (const t of terms) {
      if (!node.aliases.includes(t)) node.aliases.push(t);
    }
  }

  /**
   * Tìm tất cả alias terms match với query (exact + prefix + substring của key).
   * O(query.length) — nhanh hơn nhiều so với linear scan.
   */
  search(query: string): string[] {
    if (!query) return [];
    const results = new Set<string>();

    // 1. Exact prefix walk — O(len)
    let node: TrieNode | undefined = this.root;
    for (const ch of query) {
      node = node.children.get(ch);
      if (!node) break;
    }
    if (node && node.aliases.length > 0) {
      for (const a of node.aliases) results.add(a);
    }

    // 2. Substring match — walk từ mỗi vị trí trong query
    //    (chỉ thực hiện nếu prefix walk không tìm thấy)
    if (results.size === 0) {
      for (let start = 1; start < query.length - 1; start++) {
        let cur: TrieNode | undefined = this.root;
        for (let i = start; i < query.length; i++) {
          cur = cur.children.get(query[i]);
          if (!cur) break;
          if (cur.aliases.length > 0) {
            for (const a of cur.aliases) results.add(a);
          }
        }
      }
    }

    return Array.from(results);
  }
}
