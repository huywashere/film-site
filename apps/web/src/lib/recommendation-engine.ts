import { movieApi } from "@/lib/api";
import { FilmItem } from "@/components/film/FilmCard";

// Clean title helper to deduplicate franchise titles (e.g. "Jack Ryan (Phần 1)" -> "jack ryan")
export const getFranchiseBaseName = (name: string): string => {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s*season\s*\d+/gi, "")
    .replace(/\s*phần\s*\d+/gi, "")
    .replace(/\s*tập\s*\d+/gi, "")
    .replace(/\s*part\s*\d+/gi, "")
    .trim();
};

// Deduplicate films in a single row by slug and limit 1 season per franchise
export const deduplicateSectionRow = (films: FilmItem[]): FilmItem[] => {
  const seenSlugs = new Set<string>();
  const seenFranchises = new Set<string>();

  return (films || []).filter((film) => {
    if (!film || !film.slug || !film.name) return false;
    const cleanSlug = film.slug.toLowerCase();
    if (seenSlugs.has(cleanSlug)) return false;

    const baseName = getFranchiseBaseName(film.name);
    if (baseName.length > 3 && seenFranchises.has(baseName)) {
      return false; // Exclude multiple seasons of the same show in the same section
    }

    seenSlugs.add(cleanSlug);
    if (baseName.length > 3) seenFranchises.add(baseName);
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

    const baseName = getFranchiseBaseName(f.name);
    if (baseName.length > 3 && usedSlugs.has(`franchise:${baseName}`)) {
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
