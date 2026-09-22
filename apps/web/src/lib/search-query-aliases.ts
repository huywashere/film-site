import { normalizeForSearch } from "@/lib/text-utils";

// Keep this lightweight: search-engine is used by the interactive search UI,
// so importing aliases must not pull the curated hero catalogue into its
// client bundle. These groups mirror the gateway/Meilisearch synonyms.
const SEARCH_SYNONYM_GROUPS = [
  ["spider man", "spiderman", "nguoi nhen"],
  ["avengers", "avenger", "biet doi sieu anh hung"],
  ["batman", "nguoi doi", "ky si bong dem"],
  ["superman", "man of steel", "nguoi dan ong thep"],
  ["doraemon", "chu meo may doraemon"],
  ["detective conan", "conan", "tham tu lung danh conan"],
  ["one piece", "dao hai tac", "vua hai tac"],
  ["demon slayer", "kimetsu no yaiba", "thanh guom diet quy"],
  ["jujutsu kaisen", "chu thuat hoi chien"],
  ["attack on titan", "shingeki no kyojin", "dai chien titan"],
  ["dragon ball", "bay vien ngoc rong"],
  ["the godfather", "godfather", "bo gia"],
  ["interstellar", "ho den tu than"],
  ["inception", "ke cap giac mo"],
  ["dune", "hanh tinh cat"],
  ["fast and furious", "qua nhanh qua nguy hiem"],
  ["mission impossible", "nhiem vu bat kha thi"],
  ["transformers", "transformer", "robot dai chien"],
  ["lord of the rings", "chua te nhung chiec nhan"],
  ["game of thrones", "tro choi vuong quyen"],
  ["money heist", "la casa de papel", "phi vu trieu do"],
  ["squid game", "tro choi con muc"],
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

  const variants = new Set<string>([
    normalized,
    normalized.replace(/\s+/g, ""),
  ]);
  const group =
    aliasLookup.get(normalized) ??
    aliasLookup.get(normalized.replace(/\s+/g, ""));

  for (const alias of group ?? []) {
    variants.add(alias);
    variants.add(alias.replace(/\s+/g, ""));
  }

  return Array.from(variants).filter(Boolean);
}
