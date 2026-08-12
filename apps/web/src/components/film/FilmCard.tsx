"use client";

import Link from "next/link";
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
  /** Source metadata is retained when search results from several providers merge. */
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

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450" fill="none">
  <rect width="300" height="450" fill="#11161d"/>
  <rect x="15" y="15" width="270" height="420" rx="12" stroke="#222933" stroke-width="2" stroke-dasharray="6 6"/>
  <path d="M150 190C161.046 190 170 181.046 170 170C170 158.954 161.046 150 150 150C138.954 150 130 158.954 130 170C130 181.046 138.954 190 150 190Z" fill="#2d3748"/>
  <path d="M95 275L135 220L160 250L185 210L205 275H95Z" fill="#2d3748"/>
  <text x="150" y="320" fill="#718096" font-family="sans-serif" font-size="13" font-weight="600" text-anchor="middle">CineVerse Poster</text>
</svg>`;

// Verified 100% working fallback movie posters
export const VERIFIED_FALLBACK_POSTERS = [
  "https://phimimg.com/upload/vod/20250821-1/45b6b9aad03ae0aa2aceb5d73419831a.jpg",
  "https://phimimg.com/upload/vod/20250828-1/08fd0a68865ce452e959ae2bf58b7a8c.jpg",
  "https://phimimg.com/upload/vod/20240104-1/2cae46be24f514793c9e873f6de0fc32.jpg",
  "https://phimimg.com/upload/vod/20250513-1/59fc5ffe0025ca40c99d48b070b59320.jpg",
  "https://phimimg.com/upload/vod/20240128-1/4278b5bc228cbc7963f50547e6c76cff.jpg",
  "https://phimimg.com/upload/vod/20250302-1/4cee31c3afd0fbfd11ed4f14b1bfd816.jpg",
];

export const VERIFIED_FALLBACK_THUMBS = [
  "https://phimimg.com/upload/vod/20250821-1/1ec414f82adc729512410edd1b083996.jpg",
  "https://phimimg.com/upload/vod/20250828-1/db868e69da1af78d124ed464063b27a6.jpg",
  "https://phimimg.com/upload/vod/20240104-1/b2748e456090a1c43b246c014b60fa1a.jpg",
  "https://phimimg.com/upload/vod/20250513-1/7b4e51db1a258ef9602558352066bfec.jpg",
  "https://phimimg.com/upload/vod/20240128-1/72824a2b39de2fbb3e9617058b2f9eb3.jpg",
  "https://phimimg.com/upload/vod/20250302-1/6012710a981edf1b6209bdb7fa82d1a6.jpg",
];

// Helper: resolve image URL securely
function normalizeUpstreamImageUrl(url?: unknown): string | null {
  if (!url || typeof url !== "string") return null;
  let resolved = url.trim();
  if (!resolved) return null;

  if (resolved.startsWith("/api/image-proxy")) {
    return resolved;
  }

  if (resolved.startsWith("//")) {
    resolved = `https:${resolved}`;
  } else if (resolved.startsWith("http://")) {
    resolved = resolved.replace(/^http:\/\//i, "https://");
  } else if (!resolved.startsWith("https://")) {
    const cleanPath = resolved.startsWith("/") ? resolved.slice(1) : resolved;
    resolved = `https://img.phimapi.com/${cleanPath}`;
  }

  // Fix invalid legacy path "uploads/movies/" to valid CDN path "upload/vod/"
  if (resolved.includes("uploads/movies/")) {
    resolved = resolved.replace("uploads/movies/", "upload/vod/");
  }

  return resolved;
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

    // Check React Query cache first to avoid unnecessary network calls per card
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

    const hash = Math.abs(
      (slug || title).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0),
    );
    const primaryFallback =
      variant === "landscape"
        ? VERIFIED_FALLBACK_THUMBS[hash % VERIFIED_FALLBACK_THUMBS.length]
        : VERIFIED_FALLBACK_POSTERS[hash % VERIFIED_FALLBACK_POSTERS.length];

    // If poster failed and thumb exists, try thumb
    if (
      thumbResolved &&
      thumbResolved !== posterResolved &&
      imageSrc !== thumbResolved &&
      !imageSrc?.includes(encodeURIComponent(thumbResolved))
    ) {
      setImageSrc(thumbResolved);
      return;
    }

    // Cycle through fallback poster artwork array if primary fallback fails
    if (imageSrc === primaryFallback) {
      const secondaryIndex = (hash + 1) % VERIFIED_FALLBACK_POSTERS.length;
      const secondaryFallback =
        variant === "landscape"
          ? VERIFIED_FALLBACK_THUMBS[secondaryIndex]
          : VERIFIED_FALLBACK_POSTERS[secondaryIndex];
      setImageSrc(secondaryFallback);
      return;
    }

    // Set primary verified fallback artwork directly
    setImageSrc(primaryFallback);
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
        : film.lang.includes("Vietsub")
          ? "Vietsub"
          : film.lang
    : "Vietsub";

  // Extract quality badge
  const qualityBadge = (film.quality || "HD")
    .toUpperCase()
    .replace("FULL HD", "FHD");

  // Extract episode status
  const episodeBadge = film.episode_current
    ? film.episode_current.toLowerCase().includes("hoàn tất") ||
      film.episode_current.toLowerCase().includes("full")
      ? film.episode_current
      : film.episode_current.includes("Tập")
        ? film.episode_current
        : `Tập ${film.episode_current}`
    : film.type === "single"
      ? "Phim Lẻ"
      : null;

  const handleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const movieData = {
      title,
      titleEn: film.origin_name,
      posterUrl: film.poster_url || imageSrc || initialPosterUrl || undefined,
      thumbUrl: film.thumb_url || undefined,
      type: film.type,
      year: film.year,
    };
    const nextSaved = !saved;
    setSaved(nextSaved);

    if (!nextSaved) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("cineverse_watchlist_changed", {
            detail: { movieId: slug, action: "remove" },
          }),
        );
      }
    }

    if (!user) {
      if (nextSaved) guestDataStorage.addWatchlist(slug, movieData);
      else guestDataStorage.removeWatchlist(slug);
      toast(
        nextSaved ? "Đã lưu vào Xem sau trên thiết bị" : "Đã xóa khỏi Xem sau",
      );
      return;
    }

    try {
      if (!nextSaved) {
        await watchlistApi.remove(slug);
        toast("Đã xóa khỏi xem sau");
      } else {
        await watchlistApi.add(slug, movieData);
        toast("Đã thêm vào xem sau", "success");
      }
      await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    } catch {
      if (nextSaved) guestDataStorage.addWatchlist(slug, movieData);
      else guestDataStorage.removeWatchlist(slug);
      toast("Đã lưu cục bộ và sẽ đồng bộ lại khi kết nối ổn định", "info");
    }
  };

  // Rating value
  const ratingVal =
    film.tmdb?.vote_average ||
    film.vote_average ||
    film.rating ||
    film.imdb_rating ||
    (film.tmdb && typeof film.tmdb === "object" && "rating" in film.tmdb
      ? (film.tmdb as any).rating
      : null);

  return (
    <div
      data-film-card="true"
      className={`${cardFont.className} group relative flex flex-col select-none gpu-accelerated transform-gpu`}
      style={width ? { width, flexShrink: 0 } : undefined}
      onMouseEnter={prefetchFilmDetail}
    >
      <Link
        href={`/film/${slug}`}
        className="flex flex-col cursor-pointer transition-transform duration-200"
      >
        {/* ── Modern Premium Poster Frame ── */}
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-xl bg-neutral-950 border border-white/10 shadow-md group-hover:border-white/30 transition-colors duration-200 aspect-[2/3]",
            variant === "landscape" ? "aspect-video" : "",
          )}
        >
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={title}
              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
              loading={priority ? "eager" : "lazy"}
              {...(priority ? { fetchPriority: "high" as const } : {})}
              decoding={priority ? "sync" : "async"}
              onError={handleImageError}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
              <Clapperboard size={36} className="opacity-40" />
            </div>
          )}

          {/* A small contrast gradient protects episode text without blur. */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

          {/* ── TOP-LEFT AUDIO BADGE ── */}
          {langBadge && (
            <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-black/80 border border-white/15 text-white font-semibold text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded z-10">
              {langBadge}
            </div>
          )}

          {/* ── TOP-RIGHT QUALITY BADGE ── */}
          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-white text-[#11151b] font-black text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded uppercase tracking-wide z-10">
            {qualityBadge}
          </div>

          {/* ── BOTTOM-LEFT EPISODE STATUS BADGE ── */}
          {episodeBadge && (
            <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 bg-black/85 border border-white/15 text-neutral-200 font-medium text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded z-10 line-clamp-1 max-w-[85%]">
              {episodeBadge}
            </div>
          )}

          {/* Hover only reveals playback. Saving remains available to touch users. */}
          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-20">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white text-[#11151b] flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all duration-200">
              <Play size={16} fill="currentColor" className="ml-0.5" />
            </div>
          </div>
        </div>

        {/* ── Clean Metadata Below Poster ── */}
        {!hideDetails && (
          <div className="flex flex-col text-left mt-1.5 sm:mt-2 px-0.5">
            <h4
              className={`${cardFont.className} truncate text-[13px] font-bold leading-[1.25] tracking-[-0.01em] text-neutral-100 transition-colors group-hover:text-white sm:text-[15px]`}
              title={title}
            >
              {title}
            </h4>

            {/* Subtitle Row with Origin/Year & Sleek Rating */}
            <div
              data-film-meta="true"
              className={`${cardFont.className} mt-0.5 flex min-h-[18px] items-center justify-between text-[11px] sm:text-xs leading-[1.3] text-neutral-400 gap-1 sm:gap-2`}
            >
              <span className="line-clamp-1 flex-1 font-normal text-neutral-400">
                {film.origin_name || (film.year ? `${film.year}` : "")}
              </span>

              {ratingVal && Number(ratingVal) > 0 && (
                <div className="flex items-center gap-0.5 sm:gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1 sm:px-1.5 py-0.5 rounded font-bold text-[9px] sm:text-[10px] shrink-0">
                  <Star size={10} fill="currentColor" />
                  <span>{Number(ratingVal).toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Link>

      {showActions && (
        <button
          type="button"
          onClick={handleWatchlist}
          aria-pressed={saved}
          className={cn(
            "absolute right-2 top-2 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-[#11151b]/95 text-white transition-all duration-200 active:scale-[0.96]",
            "opacity-0 group-hover:opacity-100 focus:opacity-100",
            saved
              ? "border-white bg-white text-[#11151b] opacity-100"
              : "hover:border-white/50 hover:bg-[#1c232d]",
          )}
          title={saved ? "Bỏ khỏi xem sau" : "Thêm vào xem sau"}
        >
          <Bookmark size={14} fill={saved ? "currentColor" : "none"} />
        </button>
      )}
    </div>
  );
}

export const FilmCard = memo(FilmCardComponent);

// Skeleton
export function FilmCardSkeleton({
  width,
  hideDetails = false,
  showActions = true,
  variant = "standard",
}: {
  width?: number | string;
  hideDetails?: boolean;
  showActions?: boolean;
  variant?: "standard" | "landscape";
}) {
  return (
    <div
      aria-hidden="true"
      style={width ? { width, flexShrink: 0 } : undefined}
      className="relative flex w-full flex-col select-none motion-safe:animate-pulse"
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl border border-white/10 bg-neutral-900 aspect-[2/3]",
          variant === "landscape" && "aspect-video",
        )}
      >
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
      {showActions && (
        <div className="absolute right-2 top-2 h-8 w-8 rounded-full border border-white/10 bg-neutral-800" />
      )}
      {!hideDetails && (
        <div className="mt-1.5 flex flex-col space-y-0.5 px-0.5 sm:mt-2 sm:space-y-1">
          <div className="flex min-h-[28px] flex-col gap-1 sm:min-h-[35px]">
            <div className="h-3 w-4/5 rounded bg-neutral-800 sm:h-3.5" />
            <div className="h-3 w-3/5 rounded bg-neutral-800/70 sm:h-3.5" />
          </div>
          <div className="flex min-h-[18px] items-center justify-between gap-2">
            <div className="h-2.5 w-2/5 rounded bg-neutral-900 sm:h-3" />
            <div className="h-4 w-10 rounded bg-neutral-800/80" />
          </div>
        </div>
      )}
    </div>
  );
}
