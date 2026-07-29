"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Bookmark, Play, Clapperboard, Star } from "lucide-react";
import { watchlistApi, movieApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

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
}

interface FilmCardProps {
  film: FilmItem;
  width?: number;
  showActions?: boolean;
  variant?: "standard" | "landscape";
  hideDetails?: boolean;
}

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450" fill="none">
  <rect width="300" height="450" fill="#11161d"/>
  <rect x="15" y="15" width="270" height="420" rx="12" stroke="#222933" stroke-width="2" stroke-dasharray="6 6"/>
  <path d="M150 190C161.046 190 170 181.046 170 170C170 158.954 161.046 150 150 150C138.954 150 130 158.954 130 170C130 181.046 138.954 190 150 190Z" fill="#2d3748"/>
  <path d="M95 275L135 220L160 250L185 210L205 275H95Z" fill="#2d3748"/>
  <text x="150" y="320" fill="#718096" font-family="sans-serif" font-size="13" font-weight="600" text-anchor="middle">CineVerse Poster</text>
</svg>`;

// Helper: resolve image URL securely
export function resolveImageUrl(url?: unknown): string | null {
  if (!url || typeof url !== "string") return null;
  let resolved = url.trim();
  if (!resolved) return null;

  if (resolved.startsWith("//")) {
    resolved = `https:${resolved}`;
  } else if (
    !resolved.startsWith("http://") &&
    !resolved.startsWith("https://")
  ) {
    const cleanPath = resolved.startsWith("/") ? resolved.slice(1) : resolved;
    resolved = `https://img.phimapi.com/${cleanPath}`;
  }
  return `/api/image-proxy?url=${encodeURIComponent(resolved)}`;
}

export function FilmCard({
  film,
  width,
  showActions = true,
  variant = "standard",
  hideDetails = false,
}: FilmCardProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const slug = film.slug;
  const title = film.name || film.title || "Chưa có tên";
  const initialPosterUrl =
    variant === "landscape"
      ? resolveImageUrl(film.thumb_url) || resolveImageUrl(film.poster_url)
      : resolveImageUrl(film.poster_url) || resolveImageUrl(film.thumb_url);

  const [imageSrc, setImageSrc] = useState<string | null>(initialPosterUrl);

  useEffect(() => {
    const url =
      variant === "landscape"
        ? resolveImageUrl(film.thumb_url) || resolveImageUrl(film.poster_url)
        : resolveImageUrl(film.poster_url) || resolveImageUrl(film.thumb_url);
    setImageSrc(url);
  }, [film.poster_url, film.thumb_url, variant]);

  const handleImageError = () => {
    setImageSrc(
      `data:image/svg+xml;utf8,${encodeURIComponent(PLACEHOLDER_SVG)}`,
    );
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
    if (!user) {
      toast("Bạn cần đăng nhập để thêm vào watchlist", "error");
      return;
    }
    try {
      if (saved) {
        await watchlistApi.remove(slug);
        setSaved(false);
        toast("Đã xóa khỏi watchlist");
      } else {
        await watchlistApi.add(slug, {
          title,
          thumbUrl: imageSrc || initialPosterUrl,
          type: film.type,
          year: film.year,
        });
        setSaved(true);
        toast("Đã thêm vào watchlist!", "success");
      }
    } catch {
      toast("Có lỗi xảy ra", "error");
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
    <Link
      href={`/film/${slug}`}
      className="group relative flex flex-col cursor-pointer transition-transform duration-300 animate-in fade-in duration-300 select-none"
      style={width ? { width, flexShrink: 0 } : undefined}
      onMouseEnter={prefetchFilmDetail}
    >
      {/* ── Modern Premium Poster Frame ── */}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl bg-neutral-950 border border-white/10 shadow-md group-hover:shadow-2xl group-hover:border-blue-500/40 transition-all duration-300 aspect-[2/3]",
          variant === "landscape" ? "aspect-video" : "",
        )}
      >
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={title}
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
            <Clapperboard size={36} className="opacity-40" />
          </div>
        )}

        {/* Bottom subtle gradient for image protection */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

        {/* ── TOP-LEFT AUDIO BADGE ── */}
        {langBadge && (
          <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-black/75 backdrop-blur-md border border-white/15 text-white font-semibold text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded shadow z-10">
            {langBadge}
          </div>
        )}

        {/* ── TOP-RIGHT QUALITY BADGE ── */}
        <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-blue-600 text-white font-black text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded uppercase tracking-wide shadow z-10">
          {qualityBadge}
        </div>

        {/* ── BOTTOM-LEFT EPISODE STATUS BADGE ── */}
        {episodeBadge && (
          <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 bg-black/85 backdrop-blur-md border border-white/15 text-neutral-200 font-medium text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded shadow z-10 line-clamp-1 max-w-[85%]">
            {episodeBadge}
          </div>
        )}

        {/* Hover Overlay with Play Button & Watchlist */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20 backdrop-blur-[2px]">
          {showActions && (
            <button
              onClick={handleWatchlist}
              className={cn(
                "absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white hover:bg-blue-600 hover:border-blue-500 transition-all",
                saved ? "bg-blue-600 text-white border-blue-500" : "",
              )}
              title={saved ? "Xóa khỏi Watchlist" : "Thêm vào Watchlist"}
            >
              <Bookmark size={13} fill={saved ? "currentColor" : "none"} />
            </button>
          )}

          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 transform scale-90 group-hover:scale-100 transition-all duration-300">
            <Play size={16} fill="currentColor" className="ml-0.5" />
          </div>
        </div>
      </div>

      {/* ── Clean Metadata Below Poster ── */}
      {!hideDetails && (
        <div className="flex flex-col text-left mt-1.5 sm:mt-2 px-0.5 space-y-0.5 sm:space-y-1">
          {/* Title - Clean, non-forced case, max 2 lines */}
          <h4 className="text-[11px] sm:text-sm font-semibold text-neutral-100 line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors">
            {title}
          </h4>

          {/* Subtitle Row with Origin/Year & Sleek Rating */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-neutral-400 gap-1 sm:gap-2">
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
  );
}

// Skeleton
export function FilmCardSkeleton({
  width,
  hideDetails = false,
}: {
  width?: number | string;
  hideDetails?: boolean;
}) {
  return (
    <div
      style={width ? { width, flexShrink: 0 } : undefined}
      className="w-full flex flex-col space-y-2 animate-pulse"
    >
      <div className="w-full aspect-[2/3] bg-neutral-900 rounded-xl border border-white/5 relative overflow-hidden" />
      {!hideDetails && (
        <div className="flex flex-col space-y-1.5 px-0.5">
          <div className="h-3.5 bg-neutral-800 rounded w-4/5" />
          <div className="h-3 bg-neutral-900 rounded w-2/5" />
        </div>
      )}
    </div>
  );
}
