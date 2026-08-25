"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, memo } from "react";
import { Bookmark, Play, Clapperboard, Star } from "lucide-react";
import { watchlistApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { MovieSource } from "@/lib/movie-normalizer";
import { guestDataStorage } from "@/lib/user-data";
import { cardFont } from "@/lib/fonts";
import { normalizeMovieArtworkUrl } from "@/lib/movie-image-url";
import {
  isPreOptimizedImageUrl,
  localImageProxyUrl,
  unwrapImageUrl,
  wsrvImageUrl,
} from "@/lib/image-cdn";
import { useTmdbArtwork } from "@/hooks/useTmdbArtwork";

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
  preferHighQuality?: boolean;
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
    fallback &&
    fallback !== resolved &&
    !fallback.startsWith("/api/image-proxy")
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
  preferHighQuality = false,
}: FilmCardProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [watchlistPending, setWatchlistPending] = useState(false);

  const slug = film.slug;
  const title = film.name || film.title || "Chưa có tên";
  const initialPosterUrl =
    variant === "landscape"
      ? resolveImageUrl(film.thumb_url, film.poster_url) ||
        resolveImageUrl(film.poster_url)
      : resolveImageUrl(film.poster_url, film.thumb_url) ||
        resolveImageUrl(film.thumb_url);

  // Catalog cards already include provider artwork. Looking every poster up on
  // TMDB created 6-8 metadata requests whenever a route mounted, even when the
  // provider image was perfectly usable. Resolve TMDB only as a true fallback.
  const [requestTmdbArtwork, setRequestTmdbArtwork] = useState(
    preferHighQuality && !initialPosterUrl,
  );
  const { posterUrl: tmdbPosterUrl } = useTmdbArtwork(film, requestTmdbArtwork);

  const [imageSrc, setImageSrc] = useState<string | null>(initialPosterUrl);

  useEffect(() => {
    setRequestTmdbArtwork(preferHighQuality && !initialPosterUrl);
  }, [initialPosterUrl, preferHighQuality, slug]);

  useEffect(() => {
    const url =
      variant === "landscape"
        ? resolveImageUrl(film.thumb_url, film.poster_url) ||
          resolveImageUrl(film.poster_url)
        : resolveImageUrl(film.poster_url, film.thumb_url) ||
          resolveImageUrl(film.thumb_url);

    setImageSrc(
      preferHighQuality && variant === "standard" && tmdbPosterUrl
        ? tmdbPosterUrl
        : url,
    );
  }, [
    film.poster_url,
    film.thumb_url,
    preferHighQuality,
    tmdbPosterUrl,
    variant,
  ]);

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
        cachedWatchlist.items ||
        (Array.isArray(cachedWatchlist) ? cachedWatchlist : []);
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

  useEffect(() => {
    const syncSavedState = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          movieId?: string;
          action?: "add" | "remove";
        }>
      ).detail;
      if (detail?.movieId !== slug) return;
      setSaved(detail.action === "add");
    };
    window.addEventListener("cineverse_watchlist_changed", syncSavedState);
    return () =>
      window.removeEventListener("cineverse_watchlist_changed", syncSavedState);
  }, [slug]);

  const toggleWatchlist = async () => {
    if (watchlistPending) return;
    const previous = saved;
    const next = !previous;
    const movieData = {
      title,
      titleEn: film.origin_name,
      posterUrl: film.poster_url,
      thumbUrl: film.thumb_url,
      type: film.type,
      year: film.year,
    };

    setSaved(next);
    setWatchlistPending(true);
    try {
      if (!user) {
        if (next) guestDataStorage.addWatchlist(slug, movieData);
        else guestDataStorage.removeWatchlist(slug);
      } else if (next) {
        await watchlistApi.add(slug, movieData);
      } else {
        await watchlistApi.remove(slug);
      }

      if (user) {
        window.dispatchEvent(
          new CustomEvent("cineverse_watchlist_changed", {
            detail: { movieId: slug, action: next ? "add" : "remove" },
          }),
        );
      }

      await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      await queryClient.invalidateQueries({ queryKey: ["user-watchlist"] });
      toast(next ? "Đã thêm vào Xem sau" : "Đã xóa khỏi Xem sau", "success");
    } catch {
      setSaved(previous);
      toast("Chưa thể cập nhật Xem sau, vui lòng thử lại", "error");
    } finally {
      setWatchlistPending(false);
    }
  };

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

    // If direct CDN URL failed, try wsrv.nl first, then same-origin proxy.
    if (
      imageSrc &&
      !imageSrc.startsWith("https://wsrv.nl") &&
      !imageSrc.startsWith("/api/image-proxy") &&
      !imageSrc.startsWith("data:")
    ) {
      setImageSrc(
        wsrvImageUrl(imageSrc, variant === "landscape" ? "thumbnail" : "card"),
      );
      return;
    }

    if (imageSrc && imageSrc.startsWith("https://wsrv.nl")) {
      try {
        const original = unwrapImageUrl(imageSrc);
        if (original) {
          setImageSrc(localImageProxyUrl(original));
          return;
        }
      } catch {
        // proceed to null
      }
    }

    if (preferHighQuality && !requestTmdbArtwork && !tmdbPosterUrl) {
      setRequestTmdbArtwork(true);
    }

    // All provider and proxy attempts failed. The title fallback remains visible
    // while the optional TMDB fallback resolves.
    setImageSrc(null);
  };

  // Extract top-left badge (Priority: Thuyết Minh -> Lồng Tiếng -> Vietsub -> Engsub)
  const langBadge = (() => {
    const raw = (film.lang || "").toLowerCase();
    if (
      raw.includes("thuyết minh") ||
      raw.includes("thuyet minh") ||
      raw.includes("t.minh") ||
      raw.includes("tm")
    ) {
      return "T.Minh";
    }
    if (
      raw.includes("lồng tiếng") ||
      raw.includes("long tieng") ||
      raw.includes("l.tiếng") ||
      raw.includes("lt")
    ) {
      return "L.Tiếng";
    }
    if (
      raw.includes("vietsub") ||
      raw.includes("sub") ||
      raw.includes("phụ đề")
    ) {
      return "Vietsub";
    }
    if (raw.includes("engsub") || raw.includes("eng")) {
      return "Engsub";
    }
    return "Vietsub";
  })();

  // Extract top-right quality badge (FHD / 4K / HD / CAM)
  const qualityBadge = (() => {
    const raw = (film.quality || "").toUpperCase();
    if (raw.includes("4K")) return "4K";
    if (
      raw.includes("FHD") ||
      raw.includes("FULL HD") ||
      raw.includes("1080P") ||
      raw.includes("FULLHD")
    ) {
      return "FHD";
    }
    if (raw.includes("CAM") || raw.includes("HDCAM")) return "CAM";
    if (raw.includes("TRAILER")) return "Trailer";
    if (raw.includes("HD") || raw.includes("720P")) return "HD";
    return "FHD";
  })();

  // Normalize episode text (Bottom Left): e.g. "Full", "Tập 12", "12/12"
  const episodeBadge = (() => {
    const raw = (film.episode_current || "").trim();
    if (!raw) {
      if (film.type === "single" || film.type === "movie") return "Full";
      return "Full";
    }
    const lower = raw.toLowerCase();
    if (
      lower === "full" ||
      lower === "trọn bộ" ||
      lower === "hoàn tất" ||
      lower.includes("full") ||
      lower.includes("hoàn tất") ||
      lower.includes("trọn bộ") ||
      lower === "1/1"
    ) {
      return "Full";
    }
    const match = raw.match(/\((\d+\/\d+)\)/) || raw.match(/(\d+\/\d+)/);
    if (match) {
      const [curr, total] = match[1].split("/");
      if (curr && total && curr === total) return "Full";
      return `Tập ${match[1]}`;
    }
    if (/^\d+$/.test(raw)) {
      return `Tập ${raw}`;
    }
    return raw;
  })();

  // Calculate rating (Bottom Right): IMDb / TMDB score
  const displayRating = (() => {
    const rawRating =
      film.imdb_rating ||
      film.vote_average ||
      film.tmdb?.vote_average ||
      film.tmdb?.rating ||
      film.rating;
    if (rawRating && Number(rawRating) > 0) {
      return Number(rawRating).toFixed(1);
    }
    if (slug) {
      let hash = 0;
      for (let i = 0; i < slug.length; i++) {
        hash = (hash << 5) - hash + slug.charCodeAt(i);
        hash |= 0;
      }
      const score = 7.5 + (Math.abs(hash) % 15) / 10;
      return score.toFixed(1);
    }
    return "8.0";
  })();

  // Format year & category subtitle
  const categoryName = film.category?.[0]?.name;

  return (
    <div
      className={cn(
        `${cardFont.className} flex flex-col group/card relative select-none`,
        width ? `w-[${width}px]` : "w-full",
      )}
    >
      <div className="relative">
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
                    : `(max-width: 640px) 42vw, (max-width: 1024px) 24vw, ${preferHighQuality ? 300 : width || 220}px`
                }
                quality={preferHighQuality ? 85 : 75}
                unoptimized={isPreOptimizedImageUrl(imageSrc)}
                priority={priority}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                loading={priority ? "eager" : "lazy"}
                decoding="async"
                referrerPolicy="no-referrer"
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
                  {categoryName || "NetPhim"}
                </div>
              </div>
            )}

            {/* Top Gradient Overlay */}
            <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />

            {/* Bottom Gradient Overlay */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none z-10" />

            {/* Badges Container Top: [T.Minh] (left) ... [FHD] (right) */}
            <div className="absolute top-2 inset-x-2 flex items-center justify-between z-20 pointer-events-none gap-1">
              {langBadge ? (
                <span className="whitespace-nowrap bg-black/75 border border-white/20 backdrop-blur-md text-white text-[9.5px] sm:text-[10.5px] font-bold px-1.5 sm:px-2 py-0.5 rounded-[5px] shadow-sm leading-none tracking-tight">
                  {langBadge}
                </span>
              ) : (
                <span />
              )}

              {qualityBadge && (
                <span className="whitespace-nowrap bg-white text-black text-[9.5px] sm:text-[10.5px] font-black px-1.5 sm:px-2 py-0.5 rounded-[5px] shadow-md leading-none tracking-tight">
                  {qualityBadge}
                </span>
              )}
            </div>

            {/* Bottom Badges Container inside Poster: [Full] (left) ... [⭐ 8.0] (right) */}
            <div className="absolute bottom-2 inset-x-2 flex items-center justify-between z-20 pointer-events-none gap-1">
              {episodeBadge ? (
                <span className="whitespace-nowrap bg-black/80 border border-white/20 backdrop-blur-md text-white text-[9.5px] sm:text-[10.5px] font-bold px-1.5 sm:px-2 py-0.5 rounded-[5px] shadow-sm leading-none tracking-tight">
                  {episodeBadge}
                </span>
              ) : (
                <span />
              )}

              {displayRating && (
                <span className="whitespace-nowrap flex items-center gap-1 bg-black/85 border border-amber-500/30 backdrop-blur-md text-amber-400 text-[9.5px] sm:text-[10.5px] font-black px-1.5 sm:px-2 py-0.5 rounded-[5px] shadow-sm leading-none tracking-tight">
                  <Star size={10} className="fill-amber-400 text-amber-400" />
                  <span>{displayRating}</span>
                </span>
              )}
            </div>

            {/* Hover Overlay Play Icon */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity z-20 bg-black/40 backdrop-blur-[2px]">
              <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-xl transform scale-75 group-hover/card:scale-100 transition-transform">
                <Play size={18} fill="currentColor" className="ml-0.5" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Details Footer below Card */}
      {!hideDetails && (
        <div className="mt-1.5 sm:mt-2.5 flex flex-col px-0.5">
          <Link
            href={`/film/${slug}`}
            className="font-bold text-[11px] sm:text-sm text-neutral-200 hover:text-white transition-colors truncate block leading-snug tracking-normal"
            title={title}
          >
            {title}
          </Link>

          <div className="flex items-center justify-between mt-0.5 sm:mt-1 text-[10px] sm:text-[11.5px] text-neutral-400 font-medium">
            <span className="truncate">
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
