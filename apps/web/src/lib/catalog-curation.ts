export type CuratedCatalogKind = "series" | "single" | "anime";

type CatalogFilm = Record<string, unknown>;

const CURRENT_YEAR = new Date().getFullYear();
const LOW_QUALITY_TITLE = /\b(trailer|teaser|preview|review|cam|hdcam|clip)\b/i;

function asRecord(value: unknown): CatalogFilm {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as CatalogFilm)
    : {};
}

function numberValue(...values: unknown[]): number {
  for (const value of values) {
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function slugs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      const record = asRecord(item);
      return textValue(record.slug) || textValue(record.name);
    })
    .filter(Boolean)
    .map((item) =>
      item
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    );
}

function filmGenres(film: CatalogFilm): string[] {
  return slugs(film.category || film.categories || film.genre);
}

function filmCountries(film: CatalogFilm): string[] {
  return slugs(film.country || film.countries);
}

function franchiseKey(film: CatalogFilm): string {
  return (textValue(film.origin_name) || textValue(film.name))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/\b(phan|season|part|tap)\s*\d+\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function ratingSignals(film: CatalogFilm) {
  const tmdb = asRecord(film.tmdb);
  const imdb = asRecord(film.imdb);
  const rating = Math.min(
    10,
    numberValue(
      imdb.vote_average,
      imdb.rating,
      film.imdb_rating,
      tmdb.vote_average,
      tmdb.rating,
      film.vote_average,
      film.rating,
    ),
  );
  const votes = numberValue(
    tmdb.vote_count,
    film.vote_count,
    film.votes,
    film.rating_count,
  );
  const views = numberValue(
    film.view,
    film.views,
    film.view_count,
    film.total_views,
    film.popularity,
  );
  return { rating, votes, views };
}

export function catalogQualityScore(
  film: CatalogFilm,
  kind: CuratedCatalogKind,
): number {
  const { rating, votes, views } = ratingSignals(film);
  const genres = filmGenres(film);
  const title = `${textValue(film.name)} ${textValue(film.origin_name)} ${textValue(film.episode_current)}`;
  const year = numberValue(film.year);
  let score = 0;

  // Vote count matters more than a suspicious 9-10 score from one voter.
  if (rating > 0) score += rating * 8;
  score += Math.log10(votes + 1) * 20;
  score += Math.log10(views + 1) * 8;
  if (!rating && !votes && !views) score -= 22;
  if (votes >= 100) score += 10;
  if (votes >= 1000) score += 14;

  if (year >= CURRENT_YEAR - 8 && year <= CURRENT_YEAR + 1) score += 8;
  if (year > CURRENT_YEAR + 1) score -= 18;

  if (textValue(film.poster_url) || textValue(film.thumb_url)) score += 4;
  if (LOW_QUALITY_TITLE.test(title)) score -= 90;
  if (/trailer|cam|hdcam/i.test(textValue(film.quality))) score -= 60;

  const isAnimation = genres.some((genre) =>
    /hoat-hinh|anime|anime-chuyen-the/.test(genre),
  );
  const isHorror = genres.some((genre) => /kinh-di/.test(genre));

  // Animation has its own navigation entry. Keep a few animated features in
  // Phim Lẻ/Phim Bộ, but do not let them dominate those catalogues.
  if (kind === "single" && isAnimation) score -= 30;
  if (kind === "series" && isAnimation) score -= 18;
  if (kind === "single" && isHorror) score -= 6;

  return score;
}

function diversityBucket(film: CatalogFilm, kind: CuratedCatalogKind): string {
  const genres = filmGenres(film);
  if (genres.some((genre) => /hoat-hinh|anime/.test(genre))) return "animation";
  if (genres.some((genre) => /kinh-di/.test(genre))) return "horror";
  if (genres.some((genre) => /hanh-dong|phieu-luu/.test(genre)))
    return "action";
  if (genres.some((genre) => /hai-huoc/.test(genre))) return "comedy";
  if (genres.some((genre) => /tinh-cam|lang-man/.test(genre))) return "romance";
  if (genres.some((genre) => /vien-tuong|khoa-hoc/.test(genre))) return "scifi";
  return kind === "anime" ? "animation" : "other";
}

/**
 * Rank provider catalogue items by trustworthy audience signals and spread the
 * first viewport across genres/countries. No movie is removed: capped items
 * are appended later so pagination and source fallbacks remain intact.
 */
export function curateCatalogFilms<T extends CatalogFilm>(
  films: T[],
  kind: CuratedCatalogKind,
): T[] {
  const ranked = films
    .map((film, index) => ({
      film,
      index,
      score: catalogQualityScore(film, kind),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const genreRatios: Record<string, number> = {
    animation: kind === "anime" ? 1 : kind === "single" ? 0.14 : 0.18,
    horror: kind === "single" ? 0.25 : 1,
  };
  const countryRatio = 0.45;
  const genreCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  const franchises = new Set<string>();
  const selected: typeof ranked = [];
  let remaining = [...ranked];

  // Apply caps to every growing prefix, not just the whole page. This prevents
  // eight horror titles from appearing first even if the final 36-card page is
  // technically diverse.
  while (remaining.length) {
    const nextRound: typeof ranked = [];
    let madeProgress = false;

    for (const entry of remaining) {
      const bucket = diversityBucket(entry.film, kind);
      const country = filmCountries(entry.film)[0] || "unknown";
      const franchise = franchiseKey(entry.film);
      const nextPosition = selected.length + 1;
      const genreRatio = genreRatios[bucket] ?? 1;
      const genreLimit = Math.max(1, Math.ceil(nextPosition * genreRatio));
      const countryLimit = Math.max(2, Math.ceil(nextPosition * countryRatio));
      const genreBlocked = (genreCounts.get(bucket) || 0) + 1 > genreLimit;
      const countryBlocked =
        country !== "unknown" &&
        (countryCounts.get(country) || 0) + 1 > countryLimit;
      const franchiseBlocked = franchise !== "" && franchises.has(franchise);

      if (genreBlocked || countryBlocked || franchiseBlocked) {
        nextRound.push(entry);
        continue;
      }

      selected.push(entry);
      genreCounts.set(bucket, (genreCounts.get(bucket) || 0) + 1);
      countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
      if (franchise) franchises.add(franchise);
      madeProgress = true;
    }

    if (!madeProgress) {
      selected.push(...nextRound);
      break;
    }
    remaining = nextRound;
  }

  return selected.map((entry) => entry.film);
}
