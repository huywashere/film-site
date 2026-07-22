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
  const subtitle = film.origin_name || (film.year ? `${film.year}` : '');
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

  // Extract top-left badge (Thuyết Minh / Vietsub / Lồng Tiếng)
  const langBadge = film.lang
    ? film.lang.includes('Thuyết Minh')
      ? 'Thuyết Minh'
      : film.lang.includes('Lồng Tiếng')
      ? 'Lồng Tiếng'
      : film.lang.includes('Vietsub')
      ? 'Vietsub'
      : film.lang
    : 'Vietsub';

  // Extract top-right quality badge (HD / FHD / 4K)
  const qualityBadge = (film.quality || 'HD').toUpperCase().replace('FULL HD', 'FHD');

  // Extract bottom-left episode status badge
  const episodeBadge = film.episode_current
    ? film.episode_current.toLowerCase().includes('hoàn tất') || film.episode_current.toLowerCase().includes('full')
      ? film.episode_current
      : film.episode_current.includes('Tập')
      ? film.episode_current
      : `Tập ${film.episode_current}`
    : film.type === 'single'
    ? 'Phim Lẻ'
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
      className="group relative flex flex-col cursor-pointer transition-transform duration-300 hover:scale-[1.03]"
      style={{ width }}
      onMouseEnter={prefetchFilmDetail}
    >
      {/* Poster Container */}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-2xl bg-neutral-900 border border-white/10 shadow-xl aspect-[2/3]",
          variant === 'landscape' ? "aspect-video" : ""
        )}
      >
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
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
                saved ? "bg-white text-black border-white" : ""
              )}
              title={saved ? 'Xóa khỏi Watchlist' : 'Thêm vào Watchlist'}
            >
              <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} />
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
          <h4 className="font-bold text-sm md:text-[15px] text-white line-clamp-1 leading-snug group-hover:text-neutral-300 transition-colors">
            {title}
          </h4>
          <p className="font-normal text-xs text-neutral-400 line-clamp-1 mt-0.5">
            {film.origin_name || (film.year ? `${film.year}` : title)}
          </p>
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
