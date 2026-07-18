'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Bookmark, Play, Clapperboard } from 'lucide-react';
import { watchlistApi, movieApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/providers/ToastProvider';
import { useQueryClient } from '@tanstack/react-query';

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
}

// Helper: resolve KKPhim image URL
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
      className="film-card"
      style={{ width }}
      onMouseEnter={prefetchFilmDetail}
    >
      {/* Poster Wrapper */}
      <div
        className={`film-card__poster-wrapper ${variant === 'landscape' ? 'film-card__poster-wrapper--landscape' : ''}`}
      >
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterUrl} alt={title} className="film-card__poster" loading="lazy" />
        ) : (
          <div className="film-card__no-poster">
            <Clapperboard size={32} style={{ opacity: 0.4 }} />
          </div>
        )}

        {/* Hover Overlay */}
        <div className="film-card__overlay">
          {/* Watchlist Bookmark */}
          {showActions && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleWatchlist(e);
              }}
              className={`film-card__watchlist-btn ${saved ? 'film-card__watchlist-btn--saved' : ''}`}
              title={saved ? 'Xóa khỏi Watchlist' : 'Thêm vào Watchlist'}
            >
              <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} />
            </button>
          )}

          {/* Centered Play Button */}
          <div className="film-card__play-btn">
            <Play size={20} fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Info details under the poster wrapper */}
      <div className="film-card__info">
        <h4 className="film-card__title" title={title}>
          {title}
        </h4>
        <div className="film-card__meta">
          {film.year && <span className="film-card__year">{film.year}</span>}
          {film.year && (typeLabel || film.lang || film.episode_current) && (
            <span className="film-card__meta-separator">•</span>
          )}
          {typeLabel && <span className="film-card__type">{typeLabel}</span>}
          {(film.episode_current || film.lang) && (
            <>
              <span className="film-card__meta-separator">•</span>
              <span className="film-card__episode">{film.episode_current || film.lang}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// Skeleton
export function FilmCardSkeleton({ width = 200 }: { width?: number }) {
  return (
    <div style={{ width, flexShrink: 0 }}>
      <div
        className="skeleton"
        style={{ width: '100%', paddingTop: '150%', borderRadius: 'var(--radius-md)' }}
      />
      <div className="skeleton" style={{ height: 12, marginTop: 8, borderRadius: 4 }} />
    </div>
  );
}
