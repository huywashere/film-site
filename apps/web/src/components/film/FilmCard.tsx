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
  rating?: number; // ← Generic rating
  vote_average?: number; // ← TMDB vote average
  imdb_rating?: number; // ← IMDb rating
  tmdb?: {
    type?: string;
    id?: string;
    season?: number | null;
    vote_average?: number; // ← TMDB rating
    vote_count?: number;
    rating?: number; // ← Alternative rating field
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
  <rect width="300" height="450" fill="#16181d"/>
  <rect x="15" y="15" width="270" height="420" rx="16" stroke="#2b2f38" stroke-width="2" stroke-dasharray="6 6"/>
  <path d="M150 190C161.046 190 170 181.046 170 170C170 158.954 161.046 150 150 150C138.954 150 130 158.954 130 170C130 181.046 138.954 190 150 190Z" fill="#3a4454"/>
  <path d="M95 275L135 220L160 250L185 210L205 275H95Z" fill="#3a4454"/>
  <text x="150" y="320" fill="#6b7280" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">CineVerse Poster</text>
</svg>`;

// Helper: resolve KKPhim/OPhim/NguonC image URL
export function resolveImageUrl(url?: string): string | null {
  if (!url) return null;
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
  width = 200,
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
  const subtitle = film.origin_name || (film.year ? `${film.year}` : "");
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
    // Only prefetch on desktop (better performance on mobile)
    if (typeof window !== "undefined" && window.innerWidth > 768) {
      queryClient.prefetchQuery({
        queryKey: ["film", slug],
        queryFn: () => movieApi.getDetail(slug).then((r) => r.data),
        staleTime: 5 * 60 * 1000,
      });
    }
  };

  // Extract top-left badge (Thuyết Minh / Vietsub / Lồng Tiếng)
  const langBadge = film.lang
    ? film.lang.includes("Thuyết Minh")
      ? "Thuyết Minh"
      : film.lang.includes("Lồng Tiếng")
        ? "Lồng Tiếng"
        : film.lang.includes("Vietsub")
          ? "Vietsub"
          : film.lang
    : "Vietsub";

  // Extract top-right quality badge (HD / FHD / 4K)
  const qualityBadge = (film.quality || "HD")
    .toUpperCase()
    .replace("FULL HD", "FHD");

  // Extract bottom-left episode status badge
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

  return (
    <Link
      href={`/film/${slug}`}
      className="group relative flex flex-col cursor-pointer transition-transform duration-300 hover:scale-[1.03] animate-in fade-in duration-300"
      style={width ? { width, flexShrink: 0 } : undefined}
      onMouseEnter={prefetchFilmDetail}
    >
      {/* Poster Container */}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-2xl bg-neutral-900 border border-white/10 shadow-xl aspect-[2/3]",
          variant === "landscape" ? "aspect-video" : "",
        )}
      >
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-800 text-neutral-500">
            <Clapperboard size={36} className="opacity-40" />
          </div>
        )}

        {/* ── TOP-LEFT AUDIO BADGE (Thuyết Minh / Vietsub) ── */}
        {langBadge && (
          <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md border border-white/20 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-xl shadow-lg z-10">
            {langBadge}
          </div>
        )}

        {/* ── TOP-RIGHT QUALITY BADGE (HD / FHD / 4K) ── */}
        <div className="absolute top-2.5 right-2.5 bg-[#ff8800] text-black font-black text-[11px] px-2 py-0.5 rounded-lg uppercase tracking-wide shadow-lg shadow-orange-500/20 z-10">
          {qualityBadge}
        </div>

        {/* ── BOTTOM-LEFT EPISODE STATUS BADGE ── */}
        {episodeBadge && (
          <div className="absolute bottom-2.5 left-2.5 bg-black/80 backdrop-blur-md border border-white/20 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-xl shadow-lg z-10">
            {episodeBadge}
          </div>
        )}

        {/* Hover Overlay with Play Button & Watchlist */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
          {showActions && (
            <button
              onClick={handleWatchlist}
              className={cn(
                "absolute top-2.5 right-14 w-8 h-8 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black hover:scale-110 transition-all",
                saved ? "bg-white text-black border-white" : "",
              )}
              title={saved ? "Xóa khỏi Watchlist" : "Thêm vào Watchlist"}
            >
              <Bookmark size={14} fill={saved ? "currentColor" : "none"} />
            </button>
          )}

          <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-xl shadow-white/20 transform scale-90 group-hover:scale-105 transition-all duration-300">
            <Play size={20} fill="currentColor" className="ml-0.5" />
          </div>
        </div>
      </div>

      {/* Title & Subtitle Below Poster */}
      {!hideDetails && (
        <div className="flex flex-col text-left mt-2.5 px-0.5">
          {/* Film Title - Bebas Neue Font */}
          <h4
            className="text-base md:text-lg font-bold text-white line-clamp-1 leading-tight group-hover:text-neutral-200 transition-colors tracking-wider uppercase"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: "0.03em",
            }}
          >
            {title}
          </h4>

          {/* Subtitle Row with Year/Origin & Rating */}
          <div className="flex items-center justify-between mt-1.5 gap-2">
            <p className="font-normal text-xs text-neutral-400 line-clamp-1 flex-1">
              {film.origin_name || (film.year ? `${film.year}` : "")}
            </p>

            {/* IMDb/TMDB Rating Badge */}
            {(() => {
              // Try multiple rating sources
              const rating =
                film.tmdb?.vote_average ||
                film.vote_average ||
                film.rating ||
                film.imdb_rating ||
                (film.tmdb &&
                typeof film.tmdb === "object" &&
                "rating" in film.tmdb
                  ? film.tmdb.rating
                  : null);

              if (rating && rating > 0) {
                return (
                  <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400/25 to-yellow-400/25 border-2 border-amber-400/50 rounded-lg px-2.5 py-1 flex-shrink-0 backdrop-blur-sm shadow-lg shadow-amber-500/30">
                    <Star
                      size={14}
                      fill="#f59e0b"
                      className="text-amber-400 drop-shadow-md filter brightness-110"
                      strokeWidth={0}
                    />
                    <span className="text-[13px] font-black text-amber-50 tracking-wide drop-shadow-md filter brightness-110">
                      {Number(rating).toFixed(1)}
                    </span>
                  </div>
                );
              }
              return null;
            })()}
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
      className="w-full flex flex-col space-y-2.5 animate-pulse"
    >
      <div className="w-full aspect-[2/3] bg-white/5 rounded-2xl border border-white/10 relative overflow-hidden" />
      {!hideDetails && (
        <div className="flex flex-col space-y-1.5 px-0.5">
          <div className="h-4 bg-white/10 rounded-lg w-4/5" />
          <div className="h-3 bg-white/5 rounded-md w-2/5" />
        </div>
      )}
    </div>
  );
}
