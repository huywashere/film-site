"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, memo } from "react";
import { Bookmark, Play, Clapperboard, Star } from "lucide-react";
import { watchlistApi, movieApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { MovieSource } from "@/lib/movie-normalizer";
import { guestDataStorage } from "@/lib/user-data";
import { cardFont } from "@/lib/fonts";
import { normalizeMovieArtworkUrl } from "@/lib/movie-image-url";

export interface FilmItem {
  _id?: string;
  slug: string;
  name: string;
  title?: string;
  origin_name?: string;
  thumb_url?: string;
  poster_url?: string;
  year?: number;
  type?: string;
  episode_current?: string;
  quality?: string;
  lang?: string;
  rating?: number;
  vote_average?: number;
  imdb_rating?: number;
  tmdb?: {
    type?: string;
    id?: string;
    season?: number | null;
    vote_average?: number;
    vote_count?: number;
    rating?: number;
  };
  _source?: MovieSource;
  _sources?: MovieSource[];
  _sourceSlugs?: Partial<Record<MovieSource, string>>;
  _canonicalKey?: string;
  _duplicateCount?: number;
  content?: string;
  actor?: string[];
  director?: string[];
  category?: Array<{ name?: string; slug?: string }>;
  country?: Array<{ name?: string; slug?: string }>;
  time?: string;
}

interface FilmCardProps {
  film: FilmItem;
  width?: number;
  showActions?: boolean;
  variant?: "standard" | "landscape";
  hideDetails?: boolean;
  priority?: boolean;
}

// Helper: resolve image URL securely and normalize KKPhim/PhimImg CDN hosts
function normalizeUpstreamImageUrl(url?: unknown): string | null {
  return normalizeMovieArtworkUrl(url);
}

export function resolveImageUrl(
  url?: unknown,
  fallbackUrl?: unknown,
): string | null {
  const resolved = normalizeUpstreamImageUrl(url);
  if (!resolved) return null;
  if (resolved.startsWith("/api/image-proxy")) return resolved;

  // DIRECT CDN FAST-PATH OPTIMIZATION:
  const isDirectCdnHost =
    /^(https?:)?\/\/(img\.phimapi\.com|phimimg\.com|img\.ophim\.live|ophim1\.com|images\.nguonc\.com|image\.tmdb\.org|tmdb\.org)\//i.test(
      resolved,
    );
  if (isDirectCdnHost) {
    return resolved;
  }

  const fallback = normalizeUpstreamImageUrl(fallbackUrl);
  const fallbackQuery =
    fallback && fallback !== resolved && !fallback.startsWith("/api/image-proxy")
      ? `&fallback=${encodeURIComponent(fallback)}`
      : "";
  return `/api/image-proxy?url=${encodeURIComponent(resolved)}${fallbackQuery}`;
}

function FilmCardComponent({
  film,
  width,
  showActions = true,
  variant = "standard",
  hideDetails = false,
  priority = false,
}: FilmCardProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const slug = film.slug;
  const title = film.name || film.title || "Chưa có tên";
  const initialPosterUrl =
    variant === "landscape"
      ? resolveImageUrl(film.thumb_url, film.poster_url) ||
        resolveImageUrl(film.poster_url)
      : resolveImageUrl(film.poster_url, film.thumb_url) ||
        resolveImageUrl(film.thumb_url);

  const [imageSrc, setImageSrc] = useState<string | null>(initialPosterUrl);

  useEffect(() => {
    const url =
      variant === "landscape"
        ? resolveImageUrl(film.thumb_url, film.poster_url) ||
          resolveImageUrl(film.poster_url)
        : resolveImageUrl(film.poster_url, film.thumb_url) ||
          resolveImageUrl(film.thumb_url);

    setImageSrc(url);
  }, [film.poster_url, film.thumb_url, variant]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setSaved(guestDataStorage.isWatchlisted(slug));
      return () => {
        active = false;
      };
    }

    const cachedWatchlist = queryClient.getQueryData<any>(["watchlist"]);
    if (cachedWatchlist) {
      const items =
        cachedWatchlist.items || (Array.isArray(cachedWatchlist) ? cachedWatchlist : []);
      const isSavedInCache = items.some(
        (item: any) => item.movieId === slug || item.slug === slug,
      );
      setSaved(isSavedInCache);
      return () => {
        active = false;
      };
    }

    void watchlistApi
      .check(slug)
      .then((response) => {
        if (active) setSaved(Boolean(response.data?.inWatchlist));
      })
      .catch(() => {
        if (active) setSaved(guestDataStorage.isWatchlisted(slug));
      });

    return () => {
      active = false;
    };
  }, [slug, user, queryClient]);

  const handleImageError = () => {
    const posterResolved = normalizeUpstreamImageUrl(film.poster_url);
    const thumbResolved = normalizeUpstreamImageUrl(film.thumb_url);

    // Try the provider's alternate artwork once. Do not bounce through TMDB
    // here: a failed direct TMDB URL and its proxy previously reset each other
    // forever, flooding Chrome with hundreds of image requests.
    if (
      thumbResolved &&
      thumbResolved !== posterResolved &&
      imageSrc !== thumbResolved &&
      !imageSrc?.includes(encodeURIComponent(thumbResolved))
    ) {
      setImageSrc(thumbResolved);
      return;
    }

    // If direct CDN URL failed, try its same-origin proxy once.
    if (
      imageSrc &&
      !imageSrc.startsWith("/api/image-proxy") &&
      !imageSrc.startsWith("data:")
    ) {
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageSrc)}`;
      setImageSrc(proxyUrl);
      return;
    }

    // Both provider attempts failed; render the stable title fallback.
    setImageSrc(null);
  };

  const prefetchFilmDetail = () => {
    if (typeof window !== "undefined" && window.innerWidth > 768) {
      queryClient.prefetchQuery({
        queryKey: ["film", slug],
        queryFn: () => movieApi.getDetail(slug).then((r) => r.data),
        staleTime: 5 * 60 * 1000,
      });
    }
  };

  // Extract top-left badge (Thuyết Minh / Vietsub)
  const langBadge = film.lang
    ? film.lang.includes("Thuyết Minh")
      ? "Thuyết Minh"
      : film.lang.includes("Lồng Tiếng")
        ? "Lồng Tiếng"
        : "Vietsub"
    : null;

  // Extract top-right quality badge (4K, HD, FHD)
  const qualityBadge = film.quality
    ? film.quality.includes("4K")
      ? "4K"
      : film.quality.includes("FHD")
        ? "FHD"
        : film.quality.includes("HD")
          ? "HD"
          : film.quality
    : "HD";

  // Calculate rating
  const rawRating =
    film.rating ||
    film.vote_average ||
    film.imdb_rating ||
    film.tmdb?.vote_average ||
    film.tmdb?.rating;
  const displayRating = rawRating ? Number(rawRating).toFixed(1) : null;

  // Format year & category subtitle
  const categoryName = film.category?.[0]?.name;

  return (
    <div
      className={cn(
        `${cardFont.className} flex flex-col group/card relative select-none`,
        width ? `w-[${width}px]` : "w-full",
      )}
      onMouseEnter={prefetchFilmDetail}
    >
      <Link
        href={`/film/${slug}`}
        className="block relative overflow-hidden rounded-xl border border-white/10 group-hover/card:border-white/30 transition-all duration-300 shadow-lg bg-neutral-900"
      >
        {/* Poster Container Aspect Ratio */}
        <div
          className={cn(
            "relative w-full overflow-hidden bg-neutral-900",
            variant === "landscape" ? "aspect-video" : "aspect-[2/3]",
          )}
        >
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={title}
              fill
              sizes={
                variant === "landscape"
                  ? "(max-width: 640px) 78vw, (max-width: 1024px) 38vw, 320px"
                  : `(max-width: 640px) 42vw, (max-width: 1024px) 24vw, ${width || 220}px`
              }
              quality={75}
              priority={priority}
              className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              onError={handleImageError}
            />
          ) : (
            /* Clean, Movie-Specific Title Card (when image is completely missing from all upstreams & TMDB) */
            <div className="w-full h-full flex flex-col items-center justify-between p-4 bg-gradient-to-b from-neutral-800 via-neutral-900 to-black text-center relative">
              <div className="w-full flex justify-between items-center text-[10px] text-neutral-400 font-bold">
                <span>{film.year || 2026}</span>
                <span>{qualityBadge}</span>
              </div>
              <div className="flex flex-col items-center gap-2 my-auto px-1">
                <Clapperboard className="w-8 h-8 text-neutral-600 mb-1" />
                <h3 className="text-sm font-extrabold text-white line-clamp-3 leading-snug">
                  {title}
                </h3>
                {film.origin_name && (
                  <p className="text-[11px] text-neutral-400 font-medium line-clamp-1 italic">
                    {film.origin_name}
                  </p>
                )}
              </div>
              <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                {categoryName || "CinePhim"}
              </div>
            </div>
          )}

          {/* Top Gradient Overlay */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/70 to-transparent pointer-events-none z-10" />

          {/* Bottom Gradient Overlay */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />

          {/* Badges Container Top */}
          <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-20 pointer-events-none">
            {langBadge ? (
              <span className="bg-black/65 border border-white/10 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                {langBadge}
              </span>
            ) : <span />}

            {qualityBadge && (
              <span className="bg-white/95 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow">
                {qualityBadge}
              </span>
            )}
          </div>

          {/* Episode Badge Bottom Left inside Poster */}
          {film.episode_current && (
            <div className="absolute bottom-2.5 left-2.5 z-20 pointer-events-none">
              <span className="bg-black/80 border border-white/15 backdrop-blur-md text-white/90 text-[10px] font-bold px-2 py-0.5 rounded shadow">
                {film.episode_current}
              </span>
            </div>
          )}

          {/* Hover Overlay Play Icon */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity z-20 bg-black/40 backdrop-blur-[2px]">
            <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-xl transform scale-75 group-hover/card:scale-100 transition-transform">
              <Play size={20} fill="currentColor" className="ml-0.5" />
            </div>
          </div>
        </div>
      </Link>

      {/* Details Footer below Card */}
      {!hideDetails && (
        <div className="mt-2.5 flex flex-col px-0.5">
          <div className="flex items-center justify-between gap-1.5">
            <Link
              href={`/film/${slug}`}
              className="font-extrabold text-sm text-white hover:text-blue-400 transition-colors truncate line-clamp-1 flex-1"
            >
              {title}
            </Link>

            {displayRating && (
              <div className="flex items-center gap-1 shrink-0 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-[11px] font-extrabold text-amber-400">
                <Star size={11} fill="currentColor" />
                <span>{displayRating}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-1 text-[12px] text-neutral-400 font-medium">
            <span className="truncate max-w-[140px]">
              {film.origin_name || categoryName || `Năm ${film.year || 2026}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export const FilmCard = memo(FilmCardComponent);

export function FilmCardSkeleton({
  variant = "standard",
  width,
  hideDetails,
}: {
  variant?: "standard" | "landscape";
  width?: number;
  hideDetails?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-neutral-900 border border-white/5 animate-pulse",
        variant === "landscape" ? "aspect-video w-full" : "aspect-[2/3] w-full",
        width ? `w-[${width}px]` : "w-full",
      )}
    >
      <div className="absolute inset-0 bg-neutral-800/40" />
    </div>
  );
}
