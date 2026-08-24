import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchLatestMovies,
  fetchMoviesByType,
  fetchMovieDetail,
  searchMovies,
} from '../lib/api';
import { QUERY_KEYS } from '../lib/config';

export function useLatestMovies() {
  return useQuery({
    queryKey: QUERY_KEYS.latestMovies,
    queryFn: () => fetchLatestMovies('kkphim', 1),
    staleTime: 2 * 60 * 1000, // 2 min
  });
}

export function useMoviesByType(type: string, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.moviesByType(type),
    queryFn: () => fetchMoviesByType(type, 'kkphim', 1),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMovieDetail(slug: string) {
  return useQuery({
    queryKey: QUERY_KEYS.movieDetail(slug),
    queryFn: () => fetchMovieDetail(slug, 'kkphim'),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: QUERY_KEYS.search(query),
    queryFn: () => searchMovies(query, 'kkphim', 1),
    enabled: query.trim().length >= 2,
    staleTime: 60 * 1000,
  });
}

export function useInfiniteMovies(type: string) {
  return useInfiniteQuery({
    queryKey: ['infinite', type],
    queryFn: ({ pageParam = 1 }) => fetchMoviesByType(type, 'kkphim', pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length > 0 ? pages.length + 1 : undefined,
  });
}
