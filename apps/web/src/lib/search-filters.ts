import type { NormalizedFilmItem } from "@/lib/movie-normalizer";
import { normalizeText } from "@/lib/movie-normalizer";

export interface MovieSearchFilters {
  type?: string;
  genre?: string;
  country?: string;
  year?: number;
  status?: string;
}

function valuesFromField(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.flatMap((entry) => {
    if (typeof entry === "string" || typeof entry === "number") {
      return [normalizeText(String(entry))];
    }
    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      return [record.slug, record.name, record.title]
        .filter((item): item is string => typeof item === "string")
        .map(normalizeText);
    }
    return [];
  });
}

function normalizedType(value: unknown): string {
  const type = normalizeText(String(value || ""));
  if (["single", "phim le", "movie", "movies"].includes(type)) return "single";
  if (["series", "phim bo", "tv", "tv series"].includes(type)) return "series";
  if (["anime", "hoat hinh", "animation"].includes(type)) return "anime";
  if (["tvshows", "tv shows", "shows"].includes(type)) return "tvshows";
  return type;
}

function matchesNamedField(value: unknown, expected: string): boolean {
  const normalizedExpected = normalizeText(expected);
  return valuesFromField(value).some(
    (candidate) =>
      candidate === normalizedExpected ||
      candidate.includes(normalizedExpected) ||
      normalizedExpected.includes(candidate),
  );
}

export function matchesMovieFilters(
  film: NormalizedFilmItem,
  filters: MovieSearchFilters,
): boolean {
  if (filters.year && Number(film.year) !== filters.year) return false;
  if (
    filters.type &&
    normalizedType(film.type) !== normalizedType(filters.type)
  ) {
    return false;
  }
  if (
    filters.genre &&
    !matchesNamedField(film.category ?? film.genre, filters.genre)
  ) {
    return false;
  }
  if (filters.country && !matchesNamedField(film.country, filters.country)) {
    return false;
  }
  if (filters.status) {
    const status = normalizeText(String(film.status || ""));
    if (status !== normalizeText(filters.status)) return false;
  }
  return true;
}

export function filterSearchResults<T extends NormalizedFilmItem>(
  films: T[],
  filters: MovieSearchFilters,
): T[] {
  const active = Object.values(filters).some(
    (value) => value !== undefined && value !== "",
  );
  return active
    ? films.filter((film) => matchesMovieFilters(film, filters))
    : films;
}

export function searchFilterParams(
  filters: MovieSearchFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.country) params.set("country", filters.country);
  if (filters.year) params.set("year", String(filters.year));
  if (filters.status) params.set("status", filters.status);
  return params;
}
