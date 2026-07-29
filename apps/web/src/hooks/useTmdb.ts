/**
 * useTmdb — hook tổng hợp để lấy dữ liệu TMDB cho một bộ phim
 * Tự động detect tmdbId từ film data, fetch images + credits + videos song song
 */
import { useQuery } from "@tanstack/react-query";
import {
  tmdbApi,
  extractTmdbInfo,
  type TmdbImages,
  type TmdbCredits,
  type TmdbVideo,
  getYoutubeTrailer,
} from "@/lib/tmdb";

interface UseTmdbOptions {
  film: any; // film data từ KKPhim/OPhim/NguonC
  enabled?: boolean;
  fetchImages?: boolean;
  fetchCredits?: boolean;
  fetchVideos?: boolean;
}

export function useTmdb({
  film,
  enabled = true,
  fetchImages = true,
  fetchCredits = true,
  fetchVideos = true,
}: UseTmdbOptions) {
  const { tmdbId, type, imdbId } = extractTmdbInfo(film);
  const searchTitle = film?.origin_name || film?.title || film?.name || "";
  const isEnabled = enabled && !!film;

  // 1. Resolve TMDB ID từ IMDB ID nếu chưa có tmdbId
  const { data: findData } = useQuery({
    queryKey: ["tmdb-find", imdbId],
    queryFn: () => tmdbApi.findByImdbId(imdbId!),
    enabled: isEnabled && !tmdbId && !!imdbId,
    staleTime: 1000 * 60 * 60 * 24, // 24h
  });

  // 2. Nếu chưa có tmdbId và imdbId, tìm kiếm theo tên phim (origin_name / title / name)
  const { data: searchData } = useQuery({
    queryKey: ["tmdb-search-title", searchTitle, type],
    queryFn: async () => {
      if (!searchTitle) return null;
      const cleanTitle = searchTitle.replace(/\s*\([^)]*\)/g, "").trim();
      if (type === "tv") {
        const tvRes = await tmdbApi.searchTv(cleanTitle);
        if (tvRes?.results?.length) return tvRes;
      }
      const movieRes = await tmdbApi.searchMovie(cleanTitle);
      if (movieRes?.results?.length) return movieRes;

      // Thử tìm theo film.name nếu origin_name không trả về kết quả
      if (film?.name && film.name !== searchTitle) {
        const multiRes = await tmdbApi.searchMulti(film.name);
        if (multiRes?.results?.length) return multiRes;
      }
      return null;
    },
    enabled: isEnabled && !tmdbId && !imdbId && !!searchTitle,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const searchResult = searchData?.results?.[0];

  const resolvedId =
    tmdbId ||
    findData?.movie_results?.[0]?.id ||
    findData?.tv_results?.[0]?.id ||
    searchResult?.id ||
    null;

  const resolvedType: "movie" | "tv" =
    type ||
    (findData?.tv_results?.length || searchResult?.media_type === "tv"
      ? "tv"
      : "movie");

  // Images
  const { data: images, isLoading: imagesLoading } = useQuery({
    queryKey: ["tmdb-images", resolvedId, resolvedType],
    queryFn: () =>
      resolvedType === "tv"
        ? tmdbApi.getTvImages(resolvedId!)
        : tmdbApi.getMovieImages(resolvedId!),
    enabled: isEnabled && fetchImages && !!resolvedId,
    staleTime: 1000 * 60 * 60 * 24,
  });

  // Credits
  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ["tmdb-credits", resolvedId, resolvedType],
    queryFn: () =>
      resolvedType === "tv"
        ? tmdbApi.getTvCredits(resolvedId!)
        : tmdbApi.getMovieCredits(resolvedId!),
    enabled: isEnabled && fetchCredits && !!resolvedId,
    staleTime: 1000 * 60 * 60 * 24,
  });

  // Videos / Trailers
  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ["tmdb-videos", resolvedId, resolvedType],
    queryFn: () =>
      resolvedType === "tv"
        ? tmdbApi.getTvVideos(resolvedId!)
        : tmdbApi.getMovieVideos(resolvedId!),
    enabled: isEnabled && fetchVideos && !!resolvedId,
    staleTime: 1000 * 60 * 60,
  });

  const videos: TmdbVideo[] = videosData?.results || [];
  const trailer = getYoutubeTrailer(videos);

  // Top cast (tối đa 15 người)
  const cast = (credits?.cast || []).slice(0, 15);

  // Director / Creator
  const directors = (credits?.crew || []).filter(
    (c) => c.job === "Director" || c.department === "Directing",
  );

  // Best backdrop (sort by vote_average)
  const backdrops = [...(images?.backdrops || [])].sort(
    (a, b) => b.vote_average - a.vote_average,
  );
  const posters = [...(images?.posters || [])].sort(
    (a, b) => b.vote_average - a.vote_average,
  );
  const logos = images?.logos || [];

  const bestBackdrop =
    backdrops[0] ||
    (searchResult?.backdrop_path
      ? {
          file_path: searchResult.backdrop_path,
          width: 1920,
          height: 1080,
          vote_average: 10,
          aspect_ratio: 1.77,
        }
      : null);

  const bestPoster =
    posters[0] ||
    (searchResult?.poster_path
      ? {
          file_path: searchResult.poster_path,
          width: 1000,
          height: 1500,
          vote_average: 10,
          aspect_ratio: 0.66,
        }
      : null);

  return {
    tmdbId: resolvedId,
    type: resolvedType,
    // Images
    images,
    backdrops,
    posters,
    logos,
    bestBackdrop,
    bestPoster,
    bestLogo: logos[0] || null,
    imagesLoading,
    // Credits
    credits,
    cast,
    directors,
    creditsLoading,
    // Videos
    videos,
    trailer,
    videosLoading,
    // Overall
    isLoading: imagesLoading || creditsLoading || videosLoading,
    hasData: !!resolvedId,
  };
}

// ── Hook riêng cho trang diễn viên ───────────────────────────────

export function useTmdbPerson(personId: number | null) {
  const enabled = !!personId;

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["tmdb-person", personId],
    queryFn: () => tmdbApi.getPersonDetail(personId!),
    enabled,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ["tmdb-person-credits", personId],
    queryFn: () => tmdbApi.getPersonCredits(personId!),
    enabled,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const { data: imagesData, isLoading: imagesLoading } = useQuery({
    queryKey: ["tmdb-person-images", personId],
    queryFn: () => tmdbApi.getPersonImages(personId!),
    enabled,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const knownFor = [...(credits?.cast || [])]
    .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
    .slice(0, 12);

  return {
    detail,
    credits,
    knownFor,
    images: imagesData?.profiles || [],
    isLoading: detailLoading || creditsLoading || imagesLoading,
  };
}
