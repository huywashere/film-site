"use client";

import { useQuery } from "@tanstack/react-query";
import type { FilmItem } from "@/components/film/FilmCard";
import {
  extractTmdbInfo,
  tmdbApi,
  tmdbBackdrop,
  tmdbPoster,
  type TmdbMovie,
} from "@/lib/tmdb";

function normalizeTitle(value?: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function releaseYear(movie: TmdbMovie): number | null {
  const date = movie.release_date || movie.first_air_date;
  const year = date ? Number(date.slice(0, 4)) : NaN;
  return Number.isFinite(year) ? year : null;
}

function selectBestMatch(results: TmdbMovie[], film: FilmItem): TmdbMovie | null {
  if (!results.length) return null;

  const expectedTitles = [film.origin_name, film.name, film.title]
    .map(normalizeTitle)
    .filter(Boolean);

  return [...results].sort((a, b) => {
    const score = (movie: TmdbMovie) => {
      const candidateTitles = [
        movie.original_title,
        movie.title,
        movie.name,
      ]
        .map(normalizeTitle)
        .filter(Boolean);
      const exactTitle = candidateTitles.some((title) =>
        expectedTitles.includes(title),
      );
      const partialTitle = candidateTitles.some((candidate) =>
        expectedTitles.some(
          (expected) =>
            candidate.includes(expected) || expected.includes(candidate),
        ),
      );
      const sameYear = Boolean(
        film.year && releaseYear(movie) && film.year === releaseYear(movie),
      );

      return (
        (exactTitle ? 100 : partialTitle ? 35 : 0) +
        (sameYear ? 24 : 0) +
        Math.min(movie.vote_average || 0, 10)
      );
    };

    return score(b) - score(a);
  })[0];
}

async function resolveArtwork(film: FilmItem): Promise<TmdbMovie | null> {
  const extracted = extractTmdbInfo(film);
  const tmdbId =
    extracted.tmdbId && Number.isFinite(extracted.tmdbId)
      ? extracted.tmdbId
      : null;

  if (tmdbId) {
    const detail = await tmdbApi.findByTmdbId(tmdbId, extracted.type);
    if (detail) return { ...detail, media_type: extracted.type };
  }

  if (extracted.imdbId) {
    const found = await tmdbApi.findByImdbId(extracted.imdbId);
    const exact =
      extracted.type === "tv"
        ? found?.tv_results?.[0]
        : found?.movie_results?.[0];
    if (exact) return { ...exact, media_type: extracted.type };
  }

  const title = (film.origin_name || film.name || film.title || "")
    .replace(/\s*\([^)]*\)/g, " ")
    .trim();
  if (!title) return null;

  const primaryResults =
    extracted.type === "tv"
      ? (await tmdbApi.searchTv(title))?.results || []
      : (await tmdbApi.searchMovie(title))?.results || [];
  const primaryMatch = selectBestMatch(primaryResults, film);
  if (primaryMatch) {
    return { ...primaryMatch, media_type: extracted.type };
  }

  const multiResults = (await tmdbApi.searchMulti(title))?.results || [];
  return selectBestMatch(
    multiResults.filter(
      (item) => item.media_type === "movie" || item.media_type === "tv",
    ),
    film,
  );
}

export function useTmdbArtwork(film: FilmItem, enabled = true) {
  const extracted = extractTmdbInfo(film);
  const title = film.origin_name || film.name || film.title || "";

  const query = useQuery({
    queryKey: [
      "tmdb-artwork",
      extracted.type,
      extracted.tmdbId || extracted.imdbId || normalizeTitle(title),
      film.year || null,
    ],
    queryFn: () => resolveArtwork(film),
    enabled: enabled && Boolean(extracted.tmdbId || extracted.imdbId || title),
    staleTime: 1000 * 60 * 60 * 24 * 7,
    gcTime: 1000 * 60 * 60 * 24 * 30,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    movie: query.data || null,
    backdropUrl: tmdbBackdrop(query.data?.backdrop_path, "w1280"),
    posterUrl: tmdbPoster(query.data?.poster_path, "w500"),
  };
}
