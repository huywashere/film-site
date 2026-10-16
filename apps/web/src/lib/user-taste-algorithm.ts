import { FilmItem } from "@/components/film/FilmCard";
import { watchProgressStorage } from "@/lib/watch-progress";

// ── User Taste Vector Interface ─────────────────────────────
export interface UserTasteVector {
  genreScores: Record<string, number>;
  typeScores: Record<string, number>;
  countryScores: Record<string, number>;
  favoriteActors: Record<string, number>;
  watchedSlugs: Set<string>;
  totalInteractions: number;
}

const LOCAL_PREFERENCE_KEY = "netphim_user_preferences";

// Default fallback genre weights if user is completely new (Guest)
const DEFAULT_POPULAR_GENRES: Record<string, number> = {
  "hanh-dong": 10,
  "vien-tuong": 8,
  "phieu-luu": 7,
  "hai-huoc": 6,
  "tinh-cam": 5,
};

// ── 1. Build Dynamic User Taste Vector from Local History & Ratings ──
export function buildUserTasteVector(): UserTasteVector {
  const genreScores: Record<string, number> = { ...DEFAULT_POPULAR_GENRES };
  const typeScores: Record<string, number> = { series: 5, single: 5, anime: 5 };
  const countryScores: Record<string, number> = {
    "au-my": 5,
    "han-quoc": 5,
    "trung-quoc": 5,
  };
  const favoriteActors: Record<string, number> = {};
  const watchedSlugs = new Set<string>();

  let totalInteractions = 0;

  if (typeof window === "undefined") {
    return {
      genreScores,
      typeScores,
      countryScores,
      favoriteActors,
      watchedSlugs,
      totalInteractions: 0,
    };
  }

  try {
    // 1. Read explicit user selected preferences from localStorage if any
    const saved = localStorage.getItem(LOCAL_PREFERENCE_KEY);
    if (saved) {
      const explicitGenres: string[] = JSON.parse(saved);
      explicitGenres.forEach((slug) => {
        genreScores[slug] = (genreScores[slug] || 0) + 15; // High weight for user chosen tags
      });
    }

    // 2. Read Watch History Progress
    const history = watchProgressStorage.getEntries();
    history.forEach((item) => {
      if (item.slug) watchedSlugs.add(item.slug.toLowerCase());
      totalInteractions++;

      // Higher progress percentage = stronger positive preference
      const progressPercent =
        item.duration > 0 ? (item.currentTime / item.duration) * 100 : 0;
      const weight = progressPercent > 80 ? 10 : progressPercent > 30 ? 5 : 2;

      // Extract title keywords to infer genres (e.g. "Phần", "Hoạt Hình")
      const titleLower = (item.title || "").toLowerCase();
      if (
        titleLower.includes("phần") ||
        titleLower.includes("tập") ||
        titleLower.includes("season")
      ) {
        typeScores["series"] = (typeScores["series"] || 0) + weight;
      } else {
        typeScores["single"] = (typeScores["single"] || 0) + weight;
      }

      if (
        titleLower.includes("hoạt hình") ||
        titleLower.includes("anime") ||
        titleLower.includes("manga")
      ) {
        typeScores["anime"] = (typeScores["anime"] || 0) + weight + 5;
        genreScores["hoat-hinh"] = (genreScores["hoat-hinh"] || 0) + weight + 5;
      }
    });

    // 3. Read Bookmarked Watchlist
    const savedWatchlist = localStorage.getItem("netphim_watchlist");
    if (savedWatchlist) {
      try {
        const watchlist = JSON.parse(savedWatchlist);
        if (Array.isArray(watchlist)) {
          watchlist.forEach((f: any) => {
            if (f.slug) watchedSlugs.add(f.slug.toLowerCase());
            if (f.type) typeScores[f.type] = (typeScores[f.type] || 0) + 8;
          });
        }
      } catch (_err) {
        // Ignore invalid stored watchlist JSON
      }
    }
  } catch (err) {
    console.error("Error building user taste vector:", err);
  }

  return {
    genreScores,
    typeScores,
    countryScores,
    favoriteActors,
    watchedSlugs,
    totalInteractions,
  };
}

// ── 2. Calculate Recommendation Match Score (0% - 99%) for a Film ──
export function calculateFilmMatchScore(
  film: FilmItem,
  vector: UserTasteVector,
): number {
  if (!film || !film.slug) return 75;

  let score = 50; // Base score

  // A. Category Type Match (Series vs Single vs Anime)
  if (film.type && vector.typeScores[film.type]) {
    score += Math.min(20, vector.typeScores[film.type] * 1.5);
  }

  // B. Genre Match
  const genres = Array.isArray(film.category) ? film.category : [];
  genres.forEach((g: any) => {
    const slug = g.slug || g.name;
    if (slug && vector.genreScores[slug]) {
      score += Math.min(25, vector.genreScores[slug] * 2);
    }
  });

  // C. Country Match
  const countries = Array.isArray(film.country) ? film.country : [];
  countries.forEach((c: any) => {
    const slug = c.slug || c.name;
    if (slug && vector.countryScores[slug]) {
      score += Math.min(15, vector.countryScores[slug] * 1.2);
    }
  });

  // D. Rating & Quality Boost
  if (
    film.quality?.toLowerCase().includes("hd") || film.quality?.toLowerCase().includes("fhd")
  ) {
    score += 5;
  }

  // E. Deterministic pseudo-random variation (keeps score stable for same film)
  const hash = film.slug
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variation = (hash % 7) - 3;
  score += variation;

  // Clamp between 82% and 99% for display aesthetic
  return Math.min(99, Math.max(82, Math.round(score)));
}

// ── 3. Rank & Sort Candidate Films by User Taste ──
export function rankFilmsByUserTaste(
  candidates: FilmItem[],
  vector?: UserTasteVector,
  excludeWatched: boolean = true,
): { film: FilmItem; matchPercent: number }[] {
  const userVector = vector || buildUserTasteVector();
  const seenSlugs = new Set<string>();

  const scored = (candidates || [])
    .filter((f) => {
      if (!f || !f.slug) return false;
      const cleanSlug = f.slug.toLowerCase();
      if (seenSlugs.has(cleanSlug)) return false;
      seenSlugs.add(cleanSlug);

      if (excludeWatched && userVector.watchedSlugs.has(cleanSlug)) {
        return false; // Don't recommend films user already watched
      }
      return true;
    })
    .map((film) => {
      const matchPercent = calculateFilmMatchScore(film, userVector);
      return { film, matchPercent };
    });

  // Sort descending by match percentage score
  return scored.sort((a, b) => b.matchPercent - a.matchPercent);
}

// ── 4. Save User Explicit Favorite Genre Preferences ──
export function setUserFavoriteGenres(genres: string[]) {
  try {
    localStorage.setItem(LOCAL_PREFERENCE_KEY, JSON.stringify(genres));
  } catch (err) {
    console.error("Failed to save user preferences:", err);
  }
}

export function getUserFavoriteGenres(): string[] {
  try {
    const saved = localStorage.getItem(LOCAL_PREFERENCE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}
