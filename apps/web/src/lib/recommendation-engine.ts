import { movieApi } from "@/lib/api";
import { FilmItem } from "@/components/film/FilmCard";

// Clean title helper to deduplicate franchise titles (e.g. "Jack Ryan (Phần 1)" -> "jack ryan", "Cuộc Chiến Sinh Tử II" -> "cuoc chien sinh tu")
export const getFranchiseKeys = (film: {
  name?: string;
  title?: string;
  origin_name?: string;
  slug?: string;
}): string[] => {
  const keys: string[] = [];

  const cleanText = (text?: string) => {
    if (!text) return "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d")
      .replace(/\s*\([^)]*\)/g, " ") // remove (Phần 1), (Season 2), (2024), etc.
      .replace(/[-:]\s*(phan|season|part|tap|ss|mua)\s*\d+/gi, " ")
      .replace(/\s+(phan|season|part|tap|ss|mua)\s*\d+/gi, " ")
      .replace(/\s+(i{1,3}|iv|v|vi{1,3}|ix|x)$/gi, " ") // Roman numerals at end
      .replace(/\s+\d+$/g, " ") // Trailing numbers like "Deadpool 2" -> "deadpool"
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const cleanSlug = (s?: string) => {
    if (!s) return "";
    return s
      .toLowerCase()
      .replace(/-phan-\d+/gi, "")
      .replace(/-season-\d+/gi, "")
      .replace(/-part-\d+/gi, "")
      .replace(/-ss\d+/gi, "")
      .replace(/-tap-\d+/gi, "")
      .replace(/-mua-\d+/gi, "")
      .replace(/-(i{1,3}|iv|v|vi{1,3}|ix|x)$/gi, "")
      .replace(/-\d+$/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .trim();
  };

  const nameKey = cleanText(film.name || film.title);
  const originKey = cleanText(film.origin_name);
  const slugKey = cleanSlug(film.slug);

  if (nameKey && nameKey.length >= 3) keys.push(`name:${nameKey}`);
  if (originKey && originKey.length >= 3) keys.push(`origin:${originKey}`);
  if (slugKey && slugKey.length >= 3) keys.push(`slug:${slugKey}`);

  return keys;
};

// Deduplicate films in a single row by slug and limit 1 season per franchise
export const deduplicateSectionRow = (films: FilmItem[]): FilmItem[] => {
  const seenSlugs = new Set<string>();
  const seenFranchiseKeys = new Set<string>();

  return (films || []).filter((film) => {
    if (!film || !film.slug || (!film.name && !film.title)) return false;
    const cleanSlug = film.slug.toLowerCase();
    if (seenSlugs.has(cleanSlug)) return false;

    const keys = getFranchiseKeys(film);
    const hasDuplicateFranchise = keys.some((k) => seenFranchiseKeys.has(k));
    if (hasDuplicateFranchise) {
      return false; // Exclude multiple seasons/parts of the same show in the same section
    }

    seenSlugs.add(cleanSlug);
    keys.forEach((k) => seenFranchiseKeys.add(k));
    return true;
  });
};

// Exclude films that have already been displayed in previous homepage sections
export const excludePreviousSectionSlugs = (
  films: FilmItem[],
  usedSlugs: Set<string>,
): FilmItem[] => {
  return (films || []).filter((f) => {
    if (!f || !f.slug) return false;
    const cleanSlug = f.slug.toLowerCase();
    if (usedSlugs.has(cleanSlug)) return false;

    const keys = getFranchiseKeys(f);
    if (keys.some((k) => usedSlugs.has(`franchise:${k}`))) {
      return false;
    }
    return true;
  });
};

// Dedicated category recommendation algorithm helpers
export const fetchCategoryRecommendationPool = async (
  categoryType:
    | "top10"
    | "latest"
    | "series"
    | "single"
    | "anime"
    | "action"
    | "horror"
    | "romance"
    | "comedy",
): Promise<FilmItem[]> => {
  try {
    switch (categoryType) {
      case "top10": {
        // Merge Top Hollywood AU-MY + Top Latest releases for Top 10 Ranked Row
        const [latestRes, usUkRes] = await Promise.all([
          movieApi.getLatest(1).catch(() => ({ data: { items: [] } })),
          movieApi
            .getByCountry("au-my", 1)
            .catch(() => ({ data: { items: [] } })),
        ]);
        const latestItems =
          latestRes.data?.items || latestRes.data?.data?.items || [];
        const usUkItems =
          usUkRes.data?.items || usUkRes.data?.data?.items || [];
        return deduplicateSectionRow([...usUkItems, ...latestItems]);
      }

      case "series": {
        // Merge Series Page 1 & 2 for rich selection of Asian & Western TV Series
        const [seriesP1, seriesP2] = await Promise.all([
          movieApi.getSeries(1).catch(() => ({ data: { items: [] } })),
          movieApi.getSeries(2).catch(() => ({ data: { items: [] } })),
        ]);
        const p1 = seriesP1.data?.items || seriesP1.data?.data?.items || [];
        const p2 = seriesP2.data?.items || seriesP2.data?.data?.items || [];
        return deduplicateSectionRow([...p1, ...p2]);
      }

      case "single": {
        // Merge Cinema movies & AU-MY blockbusters
        const [singleP1, usUkRes] = await Promise.all([
          movieApi.getSingle(1).catch(() => ({ data: { items: [] } })),
          movieApi
            .getByCountry("au-my", 1)
            .catch(() => ({ data: { items: [] } })),
        ]);
        const s1 = singleP1.data?.items || singleP1.data?.data?.items || [];
        const usUk = usUkRes.data?.items || usUkRes.data?.data?.items || [];
        return deduplicateSectionRow([...s1, ...usUk]);
      }

      case "anime": {
        const res = await movieApi
          .getAnime(1)
          .catch(() => ({ data: { items: [] } }));
        return deduplicateSectionRow(
          res.data?.items || res.data?.data?.items || [],
        );
      }

      case "action": {
        const res = await movieApi
          .getByGenre("hanh-dong", 1)
          .catch(() => ({ data: { items: [] } }));
        return deduplicateSectionRow(
          res.data?.items || res.data?.data?.items || [],
        );
      }

      case "horror": {
        const res = await movieApi
          .getByGenre("kinh-di", 1)
          .catch(() => ({ data: { items: [] } }));
        return deduplicateSectionRow(
          res.data?.items || res.data?.data?.items || [],
        );
      }

      case "romance": {
        const res = await movieApi
          .getByGenre("tinh-cam", 1)
          .catch(() => ({ data: { items: [] } }));
        return deduplicateSectionRow(
          res.data?.items || res.data?.data?.items || [],
        );
      }

      case "comedy": {
        const res = await movieApi
          .getByGenre("hai-huoc", 1)
          .catch(() => ({ data: { items: [] } }));
        return deduplicateSectionRow(
          res.data?.items || res.data?.data?.items || [],
        );
      }

      default: {
        const res = await movieApi
          .getLatest(1)
          .catch(() => ({ data: { items: [] } }));
        return deduplicateSectionRow(
          res.data?.items || res.data?.data?.items || [],
        );
      }
    }
  } catch (err) {
    console.error(
      `Failed fetching recommendation pool for ${categoryType}:`,
      err,
    );
    return [];
  }
};
