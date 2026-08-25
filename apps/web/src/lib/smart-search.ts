import { FilmItem } from "@/components/film/FilmCard";
import { CURATED_HERO_FRANCHISE_POOL } from "@/lib/curated-hero-pool";
import { AliasTrie, normalizeForSearch } from "@/lib/text-utils";

/**
 * Backward-compat alias — prefer normalizeForSearch from text-utils in new code.
 * Uses the shared character-map based normalizer (faster than NFD.normalize).
 */
export function removeAccents(str: string): string {
  return normalizeForSearch(str);
}

/**
 * Common Movie Franchise & Multilingual Aliases Dictionary
 * Maps English / Abbreviated / Typo keywords to both English and Vietnamese titles
 */
const FRANCHISE_ALIASES: Record<string, string[]> = {
  // Marvel / DC
  "avenger": ["Avengers", "Biệt Đội Siêu Anh Hùng", "Avengers: Endgame", "Avengers: Infinity War"],
  "avengers": ["Avengers", "Biệt Đội Siêu Anh Hùng", "Endgame", "Infinity War"],
  "biet doi sieu anh hung": ["Avengers", "Biệt Đội Siêu Anh Hùng"],
  "spider man": ["Spider-Man", "Người Nhện", "No Way Home", "Far From Home", "Homecoming"],
  "spiderman": ["Spider-Man", "Người Nhện", "No Way Home"],
  "nguoi nhen": ["Spider-Man", "Người Nhện", "No Way Home"],
  "batman": ["The Batman", "The Dark Knight", "Người Dơi", "Kỵ Sĩ Bóng Đêm"],
  "nguoi doi": ["The Batman", "The Dark Knight", "Người Dơi"],
  "iron man": ["Iron Man", "Người Sắt"],
  "nguoi sat": ["Iron Man", "Người Sắt"],
  "deadpool": ["Deadpool", "Deadpool & Wolverine", "Deadpool 3"],
  "wolverine": ["Deadpool & Wolverine", "Logan", "X-Men"],
  "superman": ["Superman", "Man of Steel", "Người Đàn Ông Thép"],
  "man of steel": ["Man of Steel", "Superman", "Người Đàn Ông Thép"],
  "thor": ["Thor", "Thor: Love and Thunder", "Thor: Ragnarok"],
  "captain america": ["Captain America", "Chiến Binh Mùa Đông", "Civil War"],
  "doctor strange": ["Doctor Strange", "Phù Thủy Tối Thượng", "Multiverse of Madness"],
  "guardians of the galaxy": ["Guardians of the Galaxy", "Vệ Binh Dải Ngân Hà"],
  "ve binh dai ngan ha": ["Guardians of the Galaxy", "Vệ Binh Dải Ngân Hà"],

  // Hollywood Blockbusters
  "godfather": ["The Godfather", "Bố Già", "Bố Già Phần 2"],
  "bo gia": ["Bố Già", "The Godfather", "Dad, I'm Sorry"],
  "oppenheimer": ["Oppenheimer"],
  "openheimer": ["Oppenheimer"],
  "dune": ["Dune", "Dune: Part Two", "Hành Tinh Cát"],
  "hanh tinh cat": ["Dune", "Dune: Part Two", "Hành Tinh Cát"],
  "interstellar": ["Interstellar", "Hố Đen Tử Thần"],
  "ho den tu than": ["Interstellar", "Hố Đen Tử Thần"],
  "inception": ["Inception", "Kẻ Cắp Giấc Mơ"],
  "ke cap giac mo": ["Inception", "Kẻ Cắp Giấc Mơ"],
  "john wick": ["John Wick", "Sát Thủ John Wick", "John Wick: Chapter 4"],
  "sat thu john wick": ["John Wick", "John Wick: Chapter 4"],
  "avatar": ["Avatar", "Avatar: The Way of Water", "Dòng Chảy Của Nước"],
  "dong chay cua nuoc": ["Avatar", "Avatar: The Way of Water"],
  "fast and furious": ["Fast & Furious", "Quá Nhanh Quá Nguy Hiểm", "Fast X"],
  "qua nhanh qua nguy hiem": ["Fast & Furious", "Quá Nhanh Quá Nguy Hiểm"],
  "mission impossible": ["Mission: Impossible", "Nhiệm Vụ Bất Khả Thi", "Dead Reckoning"],
  "nhiem vu bat kha thi": ["Mission: Impossible", "Nhiệm Vụ Bất Khả Thi"],
  "transformer": ["Transformers", "Robot Đại Chiến", "Rise of the Beasts"],
  "transformers": ["Transformers", "Robot Đại Chiến"],
  "robot dai chien": ["Transformers", "Robot Đại Chiến"],
  "jurassic": ["Jurassic World", "Jurassic Park", "Công Viên Kỷ Jura", "Thế Giới Khủng Long"],
  "the gioi khung long": ["Jurassic World", "Thế Giới Khủng Long"],
  "cong vien ky jura": ["Jurassic Park", "Công Viên Kỷ Jura"],
  "harry potter": ["Harry Potter"],
  "lord of the rings": ["The Lord of the Rings", "Chúa Tể Những Chiếc Nhẫn"],
  "chua te nhung chiec nhan": ["The Lord of the Rings", "Chúa Tể Những Chiếc Nhẫn"],
  "shutter island": ["Shutter Island", "Đảo Kinh Hoàng"],
  "dao kinh hoang": ["Shutter Island", "Đảo Kinh Hoàng"],
  "blade runner": ["Blade Runner 2049", "Tội Phạm Nhân Bản"],
  "toi pham nhan ban": ["Blade Runner 2049", "Tội Phạm Nhân Bản"],
  "the revenant": ["The Revenant", "Người Về Từ Cõi Chết"],
  "nguoi ve tu coi chet": ["The Revenant", "Người Về Từ Cõi Chết"],
  "the wolf of wall street": ["The Wolf of Wall Street", "Sói Già Phố Wall"],
  "soi gia pho wall": ["The Wolf of Wall Street", "Sói Già Phố Wall"],
  "titanic": ["Titanic"],
  "gladiator": ["Gladiator", "Võ Sĩ Giác Đấu", "Gladiator II"],
  "vo si giac dau": ["Gladiator", "Võ Sĩ Giác Đấu"],
  "alien": ["Alien: Romulus", "Alien: Covenant", "Quái Vật Không Gian"],
  "predator": ["Predator", "Prey", "Quái Thú Vô Hình"],
  "terminator": ["Terminator", "Kẻ Hủy Diệt"],
  "ke huy diet": ["Terminator", "Kẻ Hủy Diệt"],

  // Series / TV Shows
  "game of thrones": ["Game of Thrones", "Trò Chơi Vương Quyền", "House of the Dragon"],
  "tro choi vuong quyen": ["Game of Thrones", "Trò Chơi Vương Quyền"],
  "house of the dragon": ["House of the Dragon", "Gia Tộc Rồng"],
  "gia toc rong": ["House of the Dragon", "Gia Tộc Rồng"],
  "breaking bad": ["Breaking Bad", "Biến Chất"],
  "bien chat": ["Breaking Bad", "Biến Chất"],
  "stranger things": ["Stranger Things", "Cậu Bé Mất Tích"],
  "cau be mat tich": ["Stranger Things", "Cậu Bé Mất Tích"],
  "squid game": ["Squid Game", "Trò Chơi Con Mực"],
  "tro choi con muc": ["Squid Game", "Trò Chơi Con Mực"],
  "money heist": ["Money Heist", "Phi Vụ Triệu Đô", "La Casa de Papel"],
  "phi vu trieu do": ["Money Heist", "Phi Vụ Triệu Đô"],
  "the walking dead": ["The Walking Dead", "Xác Sống"],
  "xac song": ["The Walking Dead", "Xác Sống"],
  "the boys": ["The Boys"],

  // Anime / Animation
  "one piece": ["One Piece", "Đảo Hải Tặc", "Vua Hải Tặc"],
  "dao hai tac": ["One Piece", "Đảo Hải Tặc"],
  "naruto": ["Naruto", "Naruto Shippuden"],
  "conan": ["Thám Tử Lừng Danh Conan", "Detective Conan"],
  "tham tu lung danh conan": ["Detective Conan", "Thám Tử Lừng Danh Conan"],
  "doraemon": ["Doraemon", "Chú Mèo Máy Doraemon"],
  "demon slayer": ["Demon Slayer", "Kimetsu no Yaiba", "Thanh Gươm Diệt Quỷ"],
  "thanh guom diet quy": ["Demon Slayer", "Kimetsu no Yaiba", "Thanh Gươm Diệt Quỷ"],
  "jujutsu kaisen": ["Jujutsu Kaisen", "Chú Thuật Hồi Chiến"],
  "chu thuat hoi chien": ["Jujutsu Kaisen", "Chú Thuật Hồi Chiến"],
  "attack on titan": ["Attack on Titan", "Shingeki no Kyojin", "Đại Chiến Titan"],
  "dai chien titan": ["Attack on Titan", "Shingeki no Kyojin"],
  "dragon ball": ["Dragon Ball", "Bảy Viên Ngọc Rồng", "Dragon Ball Super"],
  "bay vien ngoc rong": ["Dragon Ball", "Bảy Viên Ngọc Rồng"],
  "spirited away": ["Spirited Away", "Vùng Đất Linh Hồn"],
  "vung dat linh hon": ["Spirited Away", "Vùng Đất Linh Hồn"],
  "your name": ["Your Name", "Kimi no Na wa"],
  "kung fu panda": ["Kung Fu Panda", "Kungfu Panda"],
  "kungfu panda": ["Kung Fu Panda", "Kungfu Panda"],
  "how to train your dragon": ["How to Train Your Dragon", "Bí Kíp Luyện Rồng"],
  "bi kip luyen rong": ["How to Train Your Dragon", "Bí Kíp Luyện Rồng"],

  // Special Queries & Common Searches
  "american sniper": ["American Sniper", "Lính Bắn Tỉa Mỹ"],
  "linh ban tia my": ["American Sniper", "Lính Bắn Tỉa Mỹ"],
  "super girl": ["Supergirl", "Nữ Siêu Nhân"],
  "supergirl": ["Supergirl", "Nữ Siêu Nhân"],
  "nu sieu nhan": ["Supergirl", "Nữ Siêu Nhân"],
  "hoi chuong la": ["Hồi Chuông Lạ", "For Whom the Bell Tolls"],
  "top gun": ["Top Gun: Maverick", "Top Gun", "Phi Công Siêu Đẳng"],
  "top gun maverick": ["Top Gun: Maverick", "Phi Công Siêu Đẳng"],
  "peaky blinders": ["Peaky Blinders", "Bóng Ma Anh Quốc"],
  "bong ma anh quoc": ["Peaky Blinders", "Bóng Ma Anh Quốc"],
  "arcane": ["Arcane", "Liên Minh Huyền Thoại"],
  "godzilla": ["Godzilla x Kong", "Godzilla", "Quái Vật Godzilla"],
  "aquaman": ["Aquaman", "Đế Vương Atlantis"],
  "de vuong atlantis": ["Aquaman", "Đế Vương Atlantis"],
};

// ── Build Trie một lần khi module load (O(1) amortized per query) ──────────
const ALIAS_TRIE = new AliasTrie();

for (const [key, aliases] of Object.entries(FRANCHISE_ALIASES)) {
  const normKey = normalizeForSearch(key);
  if (normKey) {
    ALIAS_TRIE.insert(normKey, [
      ...aliases,
      ...aliases.map((a) => normalizeForSearch(a)).filter(Boolean),
    ]);
  }
}

/**
 * Get potential expanded search terms based on aliases and translations.
 * Dùng Trie O(query.length) thay vì O(dict.size) linear scan.
 */
export function getExpandedSearchTerms(query: string): string[] {
  // Sanitize query: bỏ ký tự đặc biệt / slashes
  const clean = (query || "").replace(/[\\/()[\]{}*+?^$|#@~`"']/g, " ").trim().toLowerCase();
  if (!clean) return [];

  const unacc = normalizeForSearch(clean);
  const terms = new Set<string>();

  terms.add(clean);
  if (unacc && unacc !== clean) {
    terms.add(unacc);
  }

  // Also add compact term (e.g. "super girl" -> "supergirl")
  const compact = clean.replace(/\s+/g, "");
  if (compact !== clean) {
    terms.add(compact);
  }

  // Trie-based alias lookup — O(query.length)
  const trieMatches = ALIAS_TRIE.search(unacc);
  for (const match of trieMatches) {
    terms.add(match);
    const normMatch = normalizeForSearch(match);
    if (normMatch) terms.add(normMatch);
  }

  return Array.from(terms);
}

/**
 * Calculate fuzzy similarity score between a query and a target string
 * Returns score from 0 (no match) to 100 (exact match)
 */
export function calculateFuzzyScore(query: string, target: string): number {
  if (!query || !target) return 0;

  const q = normalizeForSearch(query);
  const t = normalizeForSearch(target);

  if (t === q) return 100;
  if (t.startsWith(q)) return 95;
  if (t.includes(q)) return 85;

  // Token-based matching — early exit khi score đủ cao
  const qTokens = q.split(" ").filter((tok) => tok.length > 0);
  const tTokens = t.split(" ").filter((tok) => tok.length > 0);

  let matchedTokens = 0;
  for (const qTok of qTokens) {
    if (tTokens.some((tTok) => tTok.startsWith(qTok) || tTok.includes(qTok))) {
      matchedTokens++;
      // Early exit: tất cả tokens đã match
      if (matchedTokens === qTokens.length) break;
    }
  }

  if (qTokens.length > 0 && matchedTokens === qTokens.length) {
    return 75 + (matchedTokens / tTokens.length) * 10;
  }

  if (matchedTokens > 0) {
    return (matchedTokens / qTokens.length) * 60;
  }

  return 0;
}

/**
 * Instant in-memory search across a list of films (0ms latency)
 */
export function searchLocalFilms(
  query: string,
  customFilms?: FilmItem[],
): FilmItem[] {
  const clean = (query || "").replace(/[\\/()[\]{}*+?^$|#@~`"']/g, " ").trim();
  if (!clean || clean.length < 1) return [];

  const pool = customFilms && customFilms.length > 0 ? customFilms : CURATED_HERO_FRANCHISE_POOL;
  const expandedTerms = getExpandedSearchTerms(clean);

  const scored = pool
    .map((film) => {
      let maxScore = 0;

      const titlesToTest = [
        film.name || "",
        film.origin_name || "",
        film.slug || "",
        (film as any).title || "",
      ];

      for (const term of expandedTerms) {
        for (const title of titlesToTest) {
          const score = calculateFuzzyScore(term, title);
          if (score > maxScore) maxScore = score;
        }
      }

      return { film, score: maxScore };
    })
    .filter((item) => item.score > 25)
    .sort((a, b) => b.score - a.score);

  return scored.map((item) => item.film);
}
