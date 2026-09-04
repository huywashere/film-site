'use client';

import Link from 'next/link';
import { memo } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MovieSource } from '@/lib/movie-normalizer';
import { cardFont } from '@/lib/fonts';
import { normalizeMovieArtworkUrl } from '@/lib/movie-image-url';
import { TmdbArtwork } from '@/components/film/TmdbArtwork';

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
  variant?: 'standard' | 'landscape';
  hideDetails?: boolean;
  priority?: boolean;
  preferHighQuality?: boolean;
}

export { resolveImageUrl } from '@/lib/movie-image-url';
import { resolveImageUrl } from '@/lib/movie-image-url';

function FilmCardComponent({
  film,
  width,
  variant = 'standard',
  hideDetails = false,
  priority = false,
}: FilmCardProps) {
  const slug = film.slug;
  const title = film.name || film.title || 'Chưa có tên';
  const rawLang = (film.lang || '').toLowerCase();
  const hasVoiceOver = /thuyết minh|thuyet minh|t\.minh|\btm\b/.test(rawLang);
  const hasDub = /lồng tiếng|long tieng|l\.tiếng|\blt\b/.test(rawLang);

  // Extract top-right quality badge (FHD / 4K / HD / CAM)
  const qualityBadge = (() => {
    const raw = (film.quality || '').toUpperCase();
    if (raw.includes('4K')) return '4K';
    if (
      raw.includes('FHD') ||
      raw.includes('FULL HD') ||
      raw.includes('1080P') ||
      raw.includes('FULLHD')
    ) {
      return 'FHD';
    }
    if (raw.includes('CAM') || raw.includes('HDCAM')) return 'CAM';
    if (raw.includes('TRAILER')) return 'Trailer';
    if (raw.includes('HD') || raw.includes('720P')) return 'HD';
    return 'FHD';
  })();

  const ratingMeta = (() => {
    const rawRating =
      film.imdb_rating ||
      film.vote_average ||
      film.tmdb?.vote_average ||
      film.tmdb?.rating ||
      film.rating;
    if (rawRating && Number(rawRating) > 0) {
      return {
        label: 'IMDb',
        value: Number(rawRating).toFixed(1),
      };
    }
    return null;
  })();

  const episodeNumber = (() => {
    const raw = film.episode_current || '';
    const fraction = raw.match(/(?:\(|\b)(\d+)\s*\/\s*\d+/);
    if (fraction?.[1]) return fraction[1];
    const explicit = raw.match(/(?:tập|tap|episode|ep)\s*[-.:]?\s*(\d+)/i);
    if (explicit?.[1]) return explicit[1];
    return /^\d+$/.test(raw.trim()) ? raw.trim() : '';
  })();

  const subtitleBadge = `P.Đ${episodeNumber ? ` ${episodeNumber}` : ''}`;
  const voiceBadge = hasVoiceOver
    ? `T.M${episodeNumber ? ` ${episodeNumber}` : ''}`
    : hasDub
      ? `L.T${episodeNumber ? ` ${episodeNumber}` : ''}`
      : null;

  return (
    <div
      style={width ? { width } : undefined}
      className={cn(
        `${cardFont.className} group/card relative flex flex-col select-none [contain:paint_layout]`,
        !width && 'w-full',
      )}
    >
      <div className="relative transition-transform duration-300 ease-out motion-safe:group-hover/card:-translate-y-1.5">
        <Link
          href={`/film/${slug}`}
          className="relative block overflow-hidden rounded-[8px] border border-white/[0.08] bg-[#111216] shadow-[0_8px_22px_rgba(0,0,0,0.24)] transition-[border-color,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111214] group-hover/card:border-white/25 group-hover/card:shadow-[0_16px_36px_rgba(0,0,0,0.44)]"
        >
          {/* Poster Container Aspect Ratio */}
          <div
            className={cn(
              'relative w-full overflow-hidden bg-neutral-900',
              variant === 'landscape' ? 'aspect-video' : 'aspect-[2/3]',
            )}
          >
            <TmdbArtwork
              film={film}
              kind={variant === 'landscape' ? 'backdrop' : 'poster'}
              alt={title}
              priority={priority}
              className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out motion-safe:group-hover/card:scale-[1.035]"
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-black/55 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
            <div className="pointer-events-none absolute inset-0 z-[11] bg-black/0 transition-colors duration-300 group-hover/card:bg-black/15" />

            {/* ── Top-left: IMDb score ── */}
            {ratingMeta && (
              <div className="pointer-events-none absolute left-0 top-0 z-20">
                <span className="inline-flex items-center gap-[3px] rounded-[3px] bg-[#f5c518] px-1.5 py-[3px] text-[8px] font-black leading-none text-black sm:text-[9px]">
                  <span>IMDb</span>
                  <span>{ratingMeta.value}</span>
                </span>
              </div>
            )}

            {/* ── Top-right: Quality (FHD / HD / 4K) ── */}
            {qualityBadge && (
              <div className="pointer-events-none absolute right-0 top-0 z-20">
                <span className="rounded-[3px] bg-black/75 px-1.5 py-[3px] text-[8px] font-extrabold leading-none tracking-wider text-white sm:text-[9px]">
                  {qualityBadge}
                </span>
              </div>
            )}

            {/* ── Bottom-left: Subtitle badge (P.Đ) ── */}
            <div className="pointer-events-none absolute bottom-0 left-0 z-20">
              <span className="rounded-[3px] bg-[#2563eb] px-1.5 py-[3px] text-[8px] font-black leading-none text-white sm:text-[9px]">
                {subtitleBadge}
              </span>
            </div>

            {/* ── Bottom-right: Dub / Voiceover badge (L.T / T.M) ── */}
            {voiceBadge && (
              <div className="pointer-events-none absolute bottom-0 right-0 z-20">
                <span className={cn(
                  'rounded-[3px] px-1.5 py-[3px] text-[8px] font-black leading-none text-white sm:text-[9px]',
                  hasDub ? 'bg-[#9333ea]' : 'bg-[#16a34a]',
                )}>
                  {voiceBadge}
                </span>
              </div>
            )}

            {/* Hover Overlay Play Icon */}
            <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover/card:opacity-100">
              <div className="flex h-10 w-10 scale-90 items-center justify-center rounded-full border border-white/50 bg-black/70 text-white shadow-[0_10px_28px_rgba(0,0,0,0.5)] backdrop-blur-md transition-transform duration-300 motion-safe:group-hover/card:scale-100">
                <Play size={16} fill="currentColor" className="ml-0.5" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Details Footer below Card */}
      {!hideDetails && (
        <div className="mt-2 flex flex-col px-0.5">
          <Link
            href={`/film/${slug}`}
            className="block truncate whitespace-nowrap text-[11px] font-extrabold leading-[1.3] tracking-[-0.015em] text-[#f2f2f3] transition-colors hover:text-white sm:text-[13px]"
            title={title}
          >
            {title}
          </Link>

          <div className="mt-[2px] flex items-center justify-between text-[9.5px] font-medium leading-tight text-[#777981] sm:text-[11px]">
            <span className="truncate transition-colors group-hover/card:text-neutral-400">
              {film.origin_name || `Năm ${film.year || 2026}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export const FilmCard = memo(FilmCardComponent);

export function FilmCardSkeleton({
  variant = 'standard',
  width,
  hideDetails,
}: {
  variant?: 'standard' | 'landscape';
  width?: number;
  hideDetails?: boolean;
}) {
  return (
    <div
      style={width ? { width } : undefined}
      className={cn('flex flex-col animate-pulse', !width && 'w-full')}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-[8px] border border-white/5 bg-neutral-900',
          variant === 'landscape' ? 'aspect-video w-full' : 'aspect-[2/3] w-full',
        )}
      >
        <div className="absolute inset-0 bg-neutral-800/40" />
      </div>
      {!hideDetails && (
        <div className="mt-2 px-0.5">
          <div className="h-3 w-[78%] rounded-sm bg-neutral-800/70" />
          <div className="mt-1 h-2.5 w-[52%] rounded-sm bg-neutral-800/45" />
        </div>
      )}
    </div>
  );
}
