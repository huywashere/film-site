import { normalizeForSearch } from "@/lib/text-utils";
import { parseSearchIntent } from "@/lib/search-query-parser";

// Keep this lightweight: search-engine is used by the interactive search UI,
// so importing aliases must not pull the curated hero catalogue into its
// client bundle. These groups mirror the gateway/Meilisearch synonyms.
const SEARCH_SYNONYM_GROUPS = [
  // ── Marvel & DC ──
  ["spider man", "spiderman", "nguoi nhen", "no way home"],
  ["avengers", "avenger", "biet doi sieu anh hung", "endgame", "infinity war"],
  ["batman", "nguoi doi", "ky si bong dem", "the dark knight"],
  ["superman", "man of steel", "nguoi dan ong thep"],
  ["iron man", "nguoi sat"],
  ["captain america", "chien binh mua dong", "civil war"],
  ["thor", "than sam"],
  ["doctor strange", "phu thuy toi thuong", "da vu tru hon loan"],
  ["guardians of the galaxy", "ve binh dai ngan ha"],
  ["deadpool", "deadpool wolverine"],
  ["wolverine", "nguoi soi", "logan", "x men"],
  ["aquaman", "de vuong atlantis"],
  ["joker"],
  ["black panther", "chien binh bao den", "wakanda"],

  // ── Hollywood Blockbusters & Cult Classics ──
  ["the godfather", "godfather", "bo gia"],
  ["interstellar", "ho den tu than"],
  ["inception", "ke cap giac mo"],
  ["dune", "hanh tinh cat"],
  ["oppenheimer", "openheimer"],
  ["john wick", "sat thu john wick"],
  ["avatar", "dong chay cua nuoc"],
  ["fast and furious", "qua nhanh qua nguy hiem", "fast x"],
  ["mission impossible", "nhiem vu bat kha thi"],
  ["transformers", "transformer", "robot dai chien"],
  ["lord of the rings", "the lord of the rings", "chua te nhung chiec nhan"],
  ["harry potter"],
  ["jurassic world", "jurassic park", "cong vien ky jura", "the gioi khung long"],
  ["gladiator", "vo si giac dau"],
  ["alien", "quai vat khong gian"],
  ["predator", "quai thu vo hinh"],
  ["terminator", "ke huy diet"],
  ["the matrix", "ma tran"],
  ["titanic"],
  ["pirates of the caribbean", "cuop bien vung caribbean"],
  ["the hunger games", "dau truong sinh tu"],
  ["twilight", "chang vang"],
  ["planet of the apes", "hanh tinh khi"],
  ["blade runner", "toi pham nhan ban"],
  ["the wolf of wall street", "soi gia pho wall"],
  ["shutter island", "dao kinh hoang"],
  ["the revenant", "nguoi ve tu coi chet"],
  ["top gun", "phi cong sieu dang"],

  // ── Hit Series & TV Shows ──
  ["game of thrones", "tro choi vuong quyen"],
  ["house of the dragon", "gia toc rong"],
  ["breaking bad", "bien chat"],
  ["better call saul"],
  ["money heist", "la casa de papel", "phi vu trieu do"],
  ["squid game", "tro choi con muc"],
  ["stranger things", "cau be mat tich"],
  ["the walking dead", "xac song"],
  ["the boys"],
  ["the last of us"],
  ["peaky blinders", "bong ma anh quoc"],
  ["silo"],
  ["fallout"],
  ["shogun"],
  ["severance"],
  ["wednesday"],
  ["arcane", "lien minh huyen thoai"],

  // ── Anime & Animation ──
  ["doraemon", "chu meo may doraemon"],
  ["detective conan", "conan", "tham tu lung danh conan"],
  ["one piece", "dao hai tac", "vua hai tac"],
  ["demon slayer", "kimetsu no yaiba", "thanh guom diet quy"],
  ["jujutsu kaisen", "chu thuat hoi chien"],
  ["attack on titan", "shingeki no kyojin", "dai chien titan"],
  ["dragon ball", "bay vien ngoc rong", "dragon ball super"],
  ["naruto", "naruto shippuden", "boruto"],
  ["bleach", "su gia than chet"],
  ["death note", "cuon so tu than"],
  ["my hero academia", "hoc vien sieu anh hung"],
  ["chainsaw man", "nguoi cua"],
  ["solo leveling", "toi thang cap mot minh"],
  ["spy x family"],
  ["spirited away", "vung dat linh hon"],
  ["your name", "kimi no na wa"],
  ["kung fu panda", "kungfu panda"],
  ["how to train your dragon", "bi kip luyen rong"],

  // ── Asian Dramas & Classics ──
  ["queen of tears", "nu hoang nuoc mat"],
  ["crash landing on you", "ha canh noi anh"],
  ["the glory", "vinh quang trong thu han"],
  ["vincenzo"],
  ["all of us are dead", "ngoi truong xac song"],
  ["sweet home", "the gioi ma quai"],
  ["alice in borderland", "the gioi khong loi thoat"],
  ["journey to the west", "tay du ky"],
  ["three kingdoms", "tam quoc dien nghia"],
] as const;

const aliasLookup = new Map<string, readonly string[]>();

for (const group of SEARCH_SYNONYM_GROUPS) {
  for (const alias of group) {
    aliasLookup.set(alias, group);
    aliasLookup.set(alias.replace(/\s+/g, ""), group);
  }
}

/** Return normalized multilingual/franchise variants for a user query. */
export function expandSearchAliases(query: string): string[] {
  const normalized = normalizeForSearch(query);
  if (!normalized) return [];

  const parsed = parseSearchIntent(query);
  const targets = new Set<string>([normalized, parsed.baseQuery].filter(Boolean));

  const variants = new Set<string>([
    normalized,
    normalized.replace(/\s+/g, ""),
  ]);

  for (const t of targets) {
    const compactTarget = t.replace(/\s+/g, "");
    variants.add(t);
    variants.add(compactTarget);

    const group = aliasLookup.get(t) ?? aliasLookup.get(compactTarget);
    if (group) {
      for (const alias of group) {
        variants.add(alias);
        variants.add(alias.replace(/\s+/g, ""));
      }
    }
  }

  // Include parsed expanded terms
  for (const term of parsed.expandedTerms) {
    variants.add(term);
  }

  return Array.from(variants).filter(Boolean);
}
