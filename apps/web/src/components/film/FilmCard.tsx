'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Bookmark, Play, Clapperboard, Star } from 'lucide-react';
import { watchlistApi, movieApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/providers/ToastProvider';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

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
}

interface FilmCardProps {
  film: FilmItem;
  width?: number;
  showActions?: boolean;
  variant?: 'standard' | 'landscape';
  hideDetails?: boolean;
}

// Helper: resolve KKPhim/OPhim/NguonC image URL
export function resolveImageUrl(url?: string): string | null {
  if (!url) return null;
  const resolved = url.startsWith('http') ? url : `https://img.phimapi.com/${url}`;
  return `/api/image-proxy?url=${encodeURIComponent(resolved)}`;
}

export function FilmCard({
  film,
  width = 200,
  showActions = true,
  variant = 'standard',
  hideDetails = false,
}: FilmCardProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const slug = film.slug;
  const title = film.name || film.title || 'Chưa có tên';
  const posterUrl =
    variant === 'landscape'
      ? resolveImageUrl(film.thumb_url) || resolveImageUrl(film.poster_url)
      : resolveImageUrl(film.poster_url) || resolveImageUrl(film.thumb_url);

  const prefetchFilmDetail = () => {
    queryClient.prefetchQuery({
      queryKey: ['film', slug],
      queryFn: () => movieApi.getDetail(slug).then((r) => r.data),
      staleTime: 5 * 60 * 1000,
    });
  };

  const typeLabel =
    film.type === 'series'
      ? 'Bộ'
      : film.type === 'single'
        ? 'Lẻ'
        : film.type === 'hoathinh'
          ? 'Anime'
          : film.type === 'tvshows'
            ? 'TV'
            : null;

  const handleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast('Bạn cần đăng nhập để thêm vào watchlist', 'error');
      return;
    }
    try {
      if (saved) {
        await watchlistApi.remove(slug);
        setSaved(false);
        toast('Đã xóa khỏi watchlist');
      } else {
        await watchlistApi.add(slug, {
          title,
          thumbUrl: posterUrl,
          type: film.type,
          year: film.year,
        });
        setSaved(true);
        toast('Đã thêm vào watchlist!', 'success');
      }
    } catch {
      toast('Có lỗi xảy ra', 'error');
    }
  };

  return (
    <Link
      href={`/film/${slug}`}
      className="group relative flex flex-col space-y-2 cursor-pointer transition-transform duration-300 hover:scale-105"
      style={{ width }}
      onMouseEnter={prefetchFilmDetail}
    >
      {/* Poster Wrapper with subtle rounding & border shadow */}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded bg-neutral-900 border border-white/5 shadow-lg aspect-[2/3]",
          variant === 'landscape' ? "aspect-video" : ""
        )}
      >
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-800 text-neutral-500">
            <Clapperboard size={36} className="opacity-40" />
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3 z-10 text-center">
          {/* Top Row: Watchlist Add/Remove */}
          <div className="flex justify-end w-full">
            {showActions && (
              <button
                onClick={handleWatchlist}
                className={cn(
                  "w-7 h-7 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white hover:bg-netflixRed hover:border-netflixRed hover:scale-110 transition-all",
                  saved ? "bg-netflixRed border-netflixRed" : ""
                )}
                title={saved ? 'Xóa khỏi Watchlist' : 'Thêm vào Watchlist'}
              >
                <Bookmark size={12} fill={saved ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>

          {/* Play Button Overlay */}
          <div className="mx-auto w-10 h-10 rounded-full bg-netflixRed text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 hover:scale-110 transition-all duration-300">
            <Play size={16} fill="currentColor" className="ml-0.5" />
          </div>

          {/* Title & Metadata at the bottom */}
          <div className="w-full pt-1">
            <p className="text-white font-extrabold text-[11px] leading-tight line-clamp-2">
              {title}
            </p>
          </div>
        </div>

        {/* Top-left type tag */}
        {typeLabel && (
          <div className="absolute top-2.5 left-2.5 bg-white text-black font-black text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shadow z-10">
            {typeLabel === 'Bộ' ? 'New Episodes' : typeLabel === 'Lẻ' ? 'New Movie' : typeLabel}
          </div>
        )}

        {/* Bottom-right quality tag */}
        {film.quality && (
          <div className="absolute bottom-2.5 right-2.5 bg-netflixRed text-white font-extrabold text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded z-10">
            {film.quality}
          </div>
        )}
      </div>

      {/* Title Detail info */}
      {!hideDetails && (
        <div className="flex flex-col text-left">
          <h4 className="font-semibold text-sm text-neutral-100 truncate group-hover:text-netflixRed transition-colors pt-1">
            {title}
          </h4>
          <div className="flex items-center space-x-1.5 text-xs text-neutral-400 mt-0.5">
            {film.year && <span>{film.year}</span>}
            {film.year && (film.episode_current || film.lang) && <span className="opacity-40">•</span>}
            {(film.episode_current || film.lang) && (
              <span className="text-netflixRed truncate max-w-[120px] font-medium">
                {film.episode_current || film.lang}
              </span>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}

// Skeleton
export function FilmCardSkeleton({ width = 200, hideDetails = false }: { width?: number; hideDetails?: boolean }) {
  return (
    <div style={{ width, flexShrink: 0 }} className="flex flex-col space-y-2">
      <div className="w-full aspect-[2/3] bg-black/[0.04] dark:bg-white/[0.03] shimmer rounded-xl border border-black/5 dark:border-white/5" />
      {!hideDetails && (
        <>
          <div className="h-4 bg-black/[0.04] dark:bg-white/[0.03] shimmer rounded w-4/5" />
          <div className="h-3 bg-black/[0.04] dark:bg-white/[0.03] shimmer rounded w-2/5" />
        </>
      )}
    </div>
  );
}
