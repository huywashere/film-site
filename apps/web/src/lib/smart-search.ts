import { FilmItem } from "@/components/film/FilmCard";
import { CURATED_HERO_FRANCHISE_POOL } from "@/lib/curated-hero-pool";
import { AliasTrie, normalizeForSearch } from "@/lib/text-utils";
import {
  parseSearchIntent,
  damerauLevenshtein,
  isFuzzyTokenMatch,
} from "@/lib/search-query-parser";

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
  "ky si bong dem": ["The Dark Knight", "Batman", "Người Dơi"],
  "iron man": ["Iron Man", "Người Sắt"],
  "nguoi sat": ["Iron Man", "Người Sắt"],
  "deadpool": ["Deadpool", "Deadpool & Wolverine", "Deadpool 3"],
  "wolverine": ["Deadpool & Wolverine", "Logan", "X-Men", "Người Sói"],
  "nguoi soi": ["Wolverine", "Logan", "X-Men"],
  "superman": ["Superman", "Man of Steel", "Người Đàn Ông Thép"],
  "man of steel": ["Man of Steel", "Superman", "Người Đàn Ông Thép"],
  "nguoi dan ong thep": ["Superman", "Man of Steel"],
  "thor": ["Thor", "Thor: Love and Thunder", "Thor: Ragnarok", "Thần Sấm"],
  "than sam": ["Thor", "Thor: Love and Thunder"],
  "captain america": ["Captain America", "Chiến Binh Mùa Đông", "Civil War"],
  "chien binh mua dong": ["Captain America", "The Winter Soldier"],
  "doctor strange": ["Doctor Strange", "Phù Thủy Tối Thượng", "Multiverse of Madness"],
  "phu thuy toi thuong": ["Doctor Strange", "Multiverse of Madness"],
  "guardians of the galaxy": ["Guardians of the Galaxy", "Vệ Binh Dải Ngân Hà"],
  "ve binh dai ngan ha": ["Guardians of the Galaxy", "Vệ Binh Dải Ngân Hà"],
  "black panther": ["Black Panther", "Chiến Binh Báo Đen", "Wakanda"],
  "chien binh bao den": ["Black Panther", "Wakanda"],
  "aquaman": ["Aquaman", "Đế Vương Atlantis"],
  "de vuong atlantis": ["Aquaman", "Đế Vương Atlantis"],
  "joker": ["Joker", "Joker: Folie à Deux"],
  "venom": ["Venom", "Venom: The Last Dance", "Kèo Cuối"],

  // Hollywood Blockbusters
  "godfather": ["The Godfather", "Bố Già", "Bố Già 1972", "Bố Già 2"],
  "bo gia": ["Bố Già", "The Godfather", "Bố Già 1972", "Bố Già 2", "Dad, I'm Sorry"],
  "the godfather": ["The Godfather", "Bố Già", "Bố Già 1972"],
  "goodfellas": ["GoodFellas", "Chiến Hữu", "Hảo Hán"],
  "hao han": ["GoodFellas", "Chiến Hữu", "Hảo Hán"],
  "chien huu": ["Chiến Hữu", "GoodFellas"],
  "the departed": ["The Departed", "Điệp Vụ Boston", "Kẻ Đi Săn"],
  "diep vu boston": ["The Departed", "Điệp Vụ Boston"],
  "the irishman": ["The Irishman", "Người Đàn Ông Ireland"],
  "nguoi dan ong ireland": ["The Irishman", "Người Đàn Ông Ireland"],
  "american gangster": ["American Gangster", "Giang Hồ Mỹ"],
  "giang ho my": ["American Gangster", "Giang Hồ Mỹ"],
  "se7en": ["Se7en", "7 Tội Lỗi Chết Người", "Bảy Tội Lỗi Chết Người"],
  "7 toi loi chet nguoi": ["Se7en", "7 Tội Lỗi Chết Người"],
  "lone survivor": ["Lone Survivor", "Sống Sót"],
  "civil war": ["Civil War", "Ngày Tàn Của Đế Quốc", "Nội Chiến Mỹ"],
  "ngay tan cua de quoc": ["Civil War", "Ngày Tàn Của Đế Quốc"],
  "greenland": ["Greenland", "Greenland: Thảm Họa Thiên Thạch", "Thảm Họa Thiên Thạch"],
  "the day after tomorrow": ["The Day After Tomorrow", "Ngày Không Xa", "Ngày Kinh Hoàng"],
  "ngay khong xa": ["The Day After Tomorrow", "Ngày Không Xa"],
  "armageddon": ["Armageddon", "Ngày Tận Thế"],
  "ngay tan the": ["Armageddon", "Ngày Tận Thế"],
  "prometheus": ["Prometheus", "Hành Trình Đến Hành Tinh Chết", "Hành Tinh Chết"],
  "hanh trinh den hanh tinh chet": ["Prometheus", "Hành Trình Đến Hành Tinh Chết"],
  "oppenheimer": ["Oppenheimer"],
  "openheimer": ["Oppenheimer"],
  "dune": ["Dune", "Dune: Part Two", "Hành Tinh Cát"],
  "hanh tinh cat": ["Dune", "Dune: Part Two", "Hành Tinh Cát"],
  "interstellar": ["Interstellar", "Hố Đen Tử Thần"],
  "ho den tu than": ["Interstellar", "Hố Đen Tử Thần"],
  "inception": ["Inception", "Kẻ Cắp Giấc Mơ"],
  "ke cap giac mo": ["Inception", "Kẻ Cắp Giấc Mơ"],
  "tenet": ["Tenet"],
  "the matrix": ["The Matrix", "Ma Trận"],
  "ma tran": ["The Matrix", "Ma Trận"],
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
  "the lord of the rings": ["The Lord of the Rings", "Chúa Tể Những Chiếc Nhẫn"],
  "chua te nhung chiec nhan": ["The Lord of the Rings", "Chúa Tể Những Chiếc Nhẫn"],
  "the hobbit": ["The Hobbit", "Người Hobbit"],
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
  "quai vat khong gian": ["Alien", "Alien: Romulus"],
  "predator": ["Predator", "Prey", "Quái Thú Vô Hình"],
  "quai thu vo hinh": ["Predator", "Prey"],
  "terminator": ["Terminator", "Kẻ Hủy Diệt"],
  "ke huy diet": ["Terminator", "Kẻ Hủy Diệt"],
  "pirates of the caribbean": ["Pirates of the Caribbean", "Cướp Biển Vùng Caribbean"],
  "cuop bien vung caribbean": ["Pirates of the Caribbean"],
  "the hunger games": ["The Hunger Games", "Đấu Trường Sinh Tử"],
  "dau truong sinh tu": ["The Hunger Games"],
  "twilight": ["Twilight", "Chạng Vạng"],
  "chang vang": ["Twilight"],
  "planet of the apes": ["Kingdom of the Planet of the Apes", "Hành Tinh Khỉ"],
  "hanh tinh khi": ["Planet of the Apes", "Hành Tinh Khỉ"],

  // Series / TV Shows
  "game of thrones": ["Game of Thrones", "Trò Chơi Vương Quyền", "House of the Dragon"],
  "tro choi vuong quyen": ["Game of Thrones", "Trò Chơi Vương Quyền"],
  "house of the dragon": ["House of the Dragon", "Gia Tộc Rồng"],
  "gia toc rong": ["House of the Dragon", "Gia Tộc Rồng"],
  "breaking bad": ["Breaking Bad", "Biến Chất"],
  "bien chat": ["Breaking Bad", "Biến Chất"],
  "better call saul": ["Better Call Saul"],
  "stranger things": ["Stranger Things", "Cậu Bé Mất Tích"],
  "cau be mat tich": ["Stranger Things", "Cậu Bé Mất Tích"],
  "squid game": ["Squid Game", "Trò Chơi Con Mực"],
  "tro choi con muc": ["Squid Game", "Trò Chơi Con Mực"],
  "money heist": ["Money Heist", "Phi Vụ Triệu Đô", "La Casa de Papel"],
  "phi vu trieu do": ["Money Heist", "Phi Vụ Triệu Đô"],
  "the walking dead": ["The Walking Dead", "Xác Sống"],
  "xac song": ["The Walking Dead", "Xác Sống"],
  "the boys": ["The Boys"],
  "the last of us": ["The Last of Us"],
  "peaky blinders": ["Peaky Blinders", "Bóng Ma Anh Quốc"],
  "bong ma anh quoc": ["Peaky Blinders", "Bóng Ma Anh Quốc"],
  "silo": ["Silo", "Hầm Trú Ẩn"],
  "fallout": ["Fallout"],
  "shogun": ["Shogun"],
  "severance": ["Severance"],
  "wednesday": ["Wednesday"],
  "arcane": ["Arcane", "Liên Minh Huyền Thoại"],

  // Anime / Animation
  "one piece": ["One Piece", "Đảo Hải Tặc", "Vua Hải Tặc"],
  "dao hai tac": ["One Piece", "Đảo Hải Tặc"],
  "vua hai tac": ["One Piece", "Vua Hải Tặc"],
  "naruto": ["Naruto", "Naruto Shippuden", "Boruto"],
  "conan": ["Thám Tử Lừng Danh Conan", "Detective Conan"],
  "detective conan": ["Detective Conan", "Thám Tử Lừng Danh Conan"],
  "tham tu lung danh conan": ["Detective Conan", "Thám Tử Lừng Danh Conan"],
  "doraemon": ["Doraemon", "Chú Mèo Máy Doraemon"],
  "chu meo may doraemon": ["Doraemon", "Chú Mèo Máy Doraemon"],
  "demon slayer": ["Demon Slayer", "Kimetsu no Yaiba", "Thanh Gươm Diệt Quỷ"],
  "kimetsu no yaiba": ["Kimetsu no Yaiba", "Demon Slayer", "Thanh Gươm Diệt Quỷ"],
  "thanh guom diet quy": ["Demon Slayer", "Kimetsu no Yaiba", "Thanh Gươm Diệt Quỷ"],
  "jujutsu kaisen": ["Jujutsu Kaisen", "Chú Thuật Hồi Chiến"],
  "chu thuat hoi chien": ["Jujutsu Kaisen", "Chú Thuật Hồi Chiến"],
  "attack on titan": ["Attack on Titan", "Shingeki no Kyojin", "Đại Chiến Titan"],
  "shingeki no kyojin": ["Attack on Titan", "Shingeki no Kyojin"],
  "dai chien titan": ["Attack on Titan", "Shingeki no Kyojin"],
  "dragon ball": ["Dragon Ball", "Bảy Viên Ngọc Rồng", "Dragon Ball Super"],
  "bay vien ngoc rong": ["Dragon Ball", "Bảy Viên Ngọc Rồng"],
  "death note": ["Death Note", "Cuốn Sổ Tử Thần"],
  "cuon so tu than": ["Death Note"],
  "my hero academia": ["My Hero Academia", "Học Viện Siêu Anh Hùng"],
  "hoc vien sieu anh hung": ["My Hero Academia"],
  "chainsaw man": ["Chainsaw Man", "Người Cưa"],
  "solo leveling": ["Solo Leveling", "Tôi Thăng Cấp Một Mình"],
  "toi thang cap mot minh": ["Solo Leveling"],
  "spy x family": ["Spy x Family"],
  "spirited away": ["Spirited Away", "Vùng Đất Linh Hồn"],
  "vung dat linh hon": ["Spirited Away", "Vùng Đất Linh Hồn"],
  "your name": ["Your Name", "Kimi no Na wa"],
  "kung fu panda": ["Kung Fu Panda", "Kungfu Panda"],
  "kungfu panda": ["Kung Fu Panda", "Kungfu Panda"],
  "how to train your dragon": ["How to Train Your Dragon", "Bí Kíp Luyện Rồng"],
  "bi kip luyen rong": ["How to Train Your Dragon", "Bí Kíp Luyện Rồng"],

  // Asian Dramas
  "queen of tears": ["Queen of Tears", "Nữ Hoàng Nước Mắt"],
  "nu hoang nuoc mat": ["Queen of Tears", "Nữ Hoàng Nước Mắt"],
  "crash landing on you": ["Crash Landing on You", "Hạ Cánh Nơi Anh"],
  "ha canh noi anh": ["Crash Landing on You"],
  "the glory": ["The Glory", "Vinh Quang Trong Thù Hận"],
  "vinh quang trong thu han": ["The Glory"],
  "vincenzo": ["Vincenzo"],
  "all of us are dead": ["All of Us Are Dead", "Ngôi Trường Xác Sống"],
  "ngoi truong xac song": ["All of Us Are Dead"],
  "sweet home": ["Sweet Home", "Thế Giới Ma Quái"],
  "the gioi ma quai": ["Sweet Home"],
  "alice in borderland": ["Alice in Borderland", "Thế Giới Không Lối Thoát"],
  "the gioi khong loi thoat": ["Alice in Borderland"],
  "journey to the west": ["Tây Du Ký", "Journey to the West"],
  "tay du ky": ["Tây Du Ký", "Journey to the West"],
  "three kingdoms": ["Tam Quốc Diễn Nghĩa", "Three Kingdoms"],
  "tam quoc dien nghia": ["Tam Quốc Diễn Nghĩa"],

  // Special Queries & Common Searches
  "american sniper": ["American Sniper", "Lính Bắn Tỉa Mỹ"],
  "linh ban tia my": ["American Sniper", "Lính Bắn Tỉa Mỹ"],
  "super girl": ["Supergirl", "Nữ Siêu Nhân"],
  "supergirl": ["Supergirl", "Nữ Siêu Nhân"],
  "nu sieu nhan": ["Supergirl", "Nữ Siêu Nhân"],
  "hoi chuong la": ["Hồi Chuông Lạ", "For Whom the Bell Tolls"],
  "top gun": ["Top Gun: Maverick", "Top Gun", "Phi Công Siêu Đẳng"],
  "top gun maverick": ["Top Gun: Maverick", "Phi Công Siêu Đẳng"],
  "phi cong sieu dang": ["Top Gun: Maverick"],
  "godzilla": ["Godzilla x Kong", "Godzilla", "Quái Vật Godzilla"],
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
  const parsed = parseSearchIntent(query);
  const clean = parsed.cleanQuery;
  if (!clean) return [];

  const unacc = normalizeForSearch(clean);
  const terms = new Set<string>();

  terms.add(clean);
  if (parsed.baseQuery && parsed.baseQuery !== clean) {
    terms.add(parsed.baseQuery);
  }
  if (unacc && unacc !== clean) {
    terms.add(unacc);
  }

  // Also add compact term (e.g. "super girl" -> "supergirl")
  const compact = clean.replace(/\s+/g, "");
  if (compact !== clean) {
    terms.add(compact);
  }

  // Trie-based alias lookup — O(query.length)
  const lookupKeys = [unacc, parsed.baseQuery].filter(Boolean);
  for (const key of lookupKeys) {
    const trieMatches = ALIAS_TRIE.search(key);
    for (const match of trieMatches) {
      terms.add(match);
      const normMatch = normalizeForSearch(match);
      if (normMatch) terms.add(normMatch);
    }
  }

  // Add parsed expanded terms (year, season, acronym variants)
  for (const term of parsed.expandedTerms) {
    terms.add(term);
    const norm = normalizeForSearch(term);
    if (norm) terms.add(norm);
  }

  return Array.from(terms);
}

/**
 * Calculate fuzzy similarity score between a query and a target string
 * Returns score from 0 (no match) to 100 (exact match)
 * Hỗ trợ Typo Tolerance (chấp nhận gõ sai 1-2 ký tự).
 */
export function calculateFuzzyScore(query: string, target: string): number {
  if (!query || !target) return 0;

  const q = normalizeForSearch(query);
  const t = normalizeForSearch(target);

  if (t === q) return 100;
  if (t.startsWith(q)) return 95;
  if (t.includes(q)) return 85;

  // Typo tolerance trên toàn bộ xâu (vd: "oppenhimer" vs "oppenheimer")
  if (q.length >= 5 && Math.abs(q.length - t.length) <= 2) {
    const dist = damerauLevenshtein(q, t);
    if (dist <= 1) return 88;
    if (dist <= 2 && q.length >= 7) return 80;
  }

  // Token-based matching với Typo Tolerance
  const qTokens = q.split(" ").filter((tok) => tok.length > 0);
  const tTokens = t.split(" ").filter((tok) => tok.length > 0);

  if (qTokens.length === 0 || tTokens.length === 0) return 0;

  let matchedTokens = 0;
  for (const qTok of qTokens) {
    const matched = tTokens.some((tTok) => isFuzzyTokenMatch(qTok, tTok));
    if (matched) {
      matchedTokens++;
      if (matchedTokens === qTokens.length) break;
    }
  }

  if (matchedTokens === qTokens.length) {
    return 75 + (matchedTokens / tTokens.length) * 15;
  }

  if (matchedTokens > 0) {
    return (matchedTokens / qTokens.length) * 65;
  }

  return 0;
}

/**
 * Instant in-memory search across a list of films (0ms latency)
 * Tự động hợp nhất custom films với kho 100 bom tấn kinh điển, áp dụng bóc tách ý định thông minh.
 */
export function searchLocalFilms(
  query: string,
  customFilms?: FilmItem[],
): FilmItem[] {
  const clean = (query || "").replace(/[\\/()[\]{}*+?^$|#@~`"']/g, " ").trim();
  if (!clean || clean.length < 1) return [];

  // Luôn gộp customFilms với kho 100 phim để luôn có kết quả phản hồi 0ms
  const poolMap = new Map<string, FilmItem>();
  if (customFilms && customFilms.length > 0) {
    for (const f of customFilms) {
      const key = f.slug || f._id || f.name;
      if (key) poolMap.set(key, f);
    }
  }
  for (const f of CURATED_HERO_FRANCHISE_POOL) {
    const key = f.slug || f._id || f.name;
    if (key && !poolMap.has(key)) poolMap.set(key, f);
  }

  const pool = Array.from(poolMap.values());
  const parsedIntent = parseSearchIntent(clean);
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

      // ── Bonus ý định cấu trúc (Intent Boosts) ──
      if (maxScore > 30) {
        // Khớp năm
        if (
          parsedIntent.extractedYear &&
          film.year &&
          Number(film.year) === parsedIntent.extractedYear
        ) {
          maxScore += 15;
        }

        // Khớp phần / season
        if (parsedIntent.extractedSeason !== undefined) {
          const text = `${film.name || ""} ${film.origin_name || ""} ${film.slug || ""}`.toLowerCase();
          const s = parsedIntent.extractedSeason;
          if (
            text.includes(`phan ${s}`) ||
            text.includes(`phần ${s}`) ||
            text.includes(`season ${s}`) ||
            text.includes(`ss${s}`) ||
            text.includes(`s${s}`)
          ) {
            maxScore += 20;
          }
        }

        // Khớp âm thanh (Thuyết minh / Lồng tiếng)
        if (parsedIntent.extractedAudio && film.lang) {
          const l = String(film.lang || "").toLowerCase();
          if (
            (parsedIntent.extractedAudio === "thuyet-minh" && (l.includes("thuyết minh") || l.includes("thuyet minh"))) ||
            (parsedIntent.extractedAudio === "long-tieng" && (l.includes("lồng tiếng") || l.includes("long tieng"))) ||
            (parsedIntent.extractedAudio === "vietsub" && (l.includes("vietsub") || l.includes("sub")))
          ) {
            maxScore += 10;
          }
        }
      }

      return { film, score: maxScore };
    })
    .filter((item) => item.score > 25)
    .sort((a, b) => b.score - a.score);

  return scored.map((item) => item.film);
}
