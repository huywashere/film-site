'use client';

import Link from 'next/link';
import { memo } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MovieSource } from '@/lib/movie-normalizer';
import { cardFont } from '@/lib/fonts';
import { normalizeMovieArtworkUrl } from '@/lib/movie-image-url';
import { TmdbArtwork } from '@/components/film/TmdbArtwork';
import { useSettingsStore } from '@/store/settingsStore';

export interface FilmItem {
  _id?: string;
  slug: string;
  name: string;
  title?: string;
  origin_name?: string;
  thumb_url?: string;
  poster_url?: string;
  heroBackdrop?: string;
  titleLogo?: string;
  _thumbCandidates?: string[];
  _posterCandidates?: string[];
  year?: number;
  type?: string;
  episode_current?: string;
  quality?: string;
  lang?: string;
  rating?: number;
  vote_average?: number;
  imdb_rating?: number;
  imdb?: {
    id?: string | null;
    vote_average?: number;
    vote_count?: number;
    rating?: number;
  };
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
  variant,
  hideDetails = false,
  priority = false,
  preferHighQuality = false,
}: FilmCardProps) {
  const globalCardLayout = useSettingsStore((s) => s.cardLayout);
  const effectiveVariant = variant || (globalCardLayout === 'horizontal' ? 'landscape' : 'standard');
  const slug = film.slug;
  const title = film.name || film.title || 'Chưa có tên';
  const rawLang = (film.lang || '').toLowerCase();
  const hasVoiceOver = /thuyết minh|thuyet minh|t\.minh|\btm\b/.test(rawLang);
  const hasDub = /lồng tiếng|long tieng|l\.tiếng|\blt\b/.test(rawLang);
  const hasExplicitVietsub = /vietsub|phụ đề|phu de|\bpd\b/.test(rawLang);
  // Default to Vietsub if neither voiceover nor dub is exclusive, or if explicitly noted
  const hasVietsub = hasExplicitVietsub || (!hasVoiceOver && !hasDub);

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
    // 1. Prioritize direct IMDb rating
    const rawImdb =
      film.imdb?.vote_average ??
      film.imdb?.rating ??
      film.imdb_rating;
    const imdbNum =
      typeof rawImdb === 'number'
        ? rawImdb
        : parseFloat(String(rawImdb || ''));
    if (!isNaN(imdbNum) && imdbNum > 0) {
      return {
        label: 'IMDb',
        value: imdbNum.toFixed(1),
      };
    }

    // 2. Secondary TMDB / general vote_average
    const rawGeneral =
      film.tmdb?.vote_average ??
      film.tmdb?.rating ??
      film.vote_average ??
      film.rating;
    const generalNum =
      typeof rawGeneral === 'number'
        ? rawGeneral
        : parseFloat(String(rawGeneral || ''));
    if (!isNaN(generalNum) && generalNum > 0) {
      return {
        label: 'IMDb',
        value: generalNum.toFixed(1),
      };
    }

    return null;
  })();

  const episodeNumber = (() => {
    const raw = film.episode_current || '';
    // Completed series or movies don't need ongoing episode counter
    if (/hoàn tất|hoan tat|full/i.test(raw)) {
      return '';
    }
    const fraction = raw.match(/(?:\(|\b)(\d+)\s*\/\s*\d+/);
    if (fraction?.[1]) return fraction[1];
    const explicit = raw.match(/(?:tập|tap|episode|ep)\s*[-.:]?\s*(\d+)/i);
    if (explicit?.[1]) return explicit[1];
    return /^\d+$/.test(raw.trim()) ? raw.trim() : '';
  })();

  // Subtitle badge text (e.g. "VS 12" or "Vietsub")
  const subtitleBadge = episodeNumber ? `VS ${episodeNumber}` : 'Vietsub';

  // Voice/Dub badge info (always abbreviated to ensure enough space)
  const voiceBadge = hasVoiceOver
    ? { label: 'T.Minh', type: 'voice' as const }
    : hasDub
      ? { label: 'L.Tiếng', type: 'dub' as const }
      : null;

  // ── Dynamic & Flexible Badge Placement ──
  // If no IMDb rating is available, shift the subtitle or voice badge UP to top-left
  // so the card never has an awkward blank top-left space!
  const hasRating = Boolean(ratingMeta);

  const topLeftBadge = hasRating
    ? { type: 'imdb' as const, label: ratingMeta!.label, value: ratingMeta!.value }
    : hasVietsub
      ? { type: 'sub' as const, text: subtitleBadge }
      : voiceBadge
        ? {
            type: 'voice' as const,
            text: `${voiceBadge.label}${episodeNumber ? ` ${episodeNumber}` : ''}`,
            voiceType: voiceBadge.type,
          }
        : null;

  const bottomLeftBadge = (() => {
    if (hasRating) {
      if (hasVietsub) {
        return { type: 'sub' as const, text: subtitleBadge };
      }
      if (voiceBadge) {
        return {
          type: 'voice' as const,
          text: `${voiceBadge.label}${episodeNumber ? ` ${episodeNumber}` : ''}`,
          voiceType: voiceBadge.type,
        };
      }
      return null;
    }
    // If subtitle shifted UP to top-left, then voiceBadge (if present) takes bottom-left
    if (hasVietsub && voiceBadge) {
      return {
        type: 'voice' as const,
        text: voiceBadge.label,
        voiceType: voiceBadge.type,
      };
    }
    return null;
  })();

  const bottomRightBadge = (() => {
    // Only used when rating is at top-left AND both subtitle and voiceBadge exist
    if (hasRating && hasVietsub && voiceBadge) {
      return {
        type: 'voice' as const,
        text: voiceBadge.label,
        voiceType: voiceBadge.type,
      };
    }
    return null;
  })();

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
          prefetch={false}
          className="relative block overflow-hidden rounded-[8px] border border-white/[0.08] bg-[#111216] shadow-[0_8px_22px_rgba(0,0,0,0.24)] transition-[border-color,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111214] group-hover/card:border-white/25 group-hover/card:shadow-[0_16px_36px_rgba(0,0,0,0.44)]"
        >
          {/* Poster Container Aspect Ratio */}
          <div
            className={cn(
              'relative w-full overflow-hidden bg-neutral-900',
              effectiveVariant === 'landscape' ? 'aspect-video' : 'aspect-[2/3]',
            )}
          >
            <TmdbArtwork
              film={film}
              kind={effectiveVariant === 'landscape' ? 'backdrop' : 'poster'}
              alt={title}
              priority={priority}
              allowTitleLookup={preferHighQuality}
              className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out motion-safe:group-hover/card:scale-[1.035]"
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-14 bg-gradient-to-b from-black/65 via-black/20 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
            <div className="pointer-events-none absolute inset-0 z-[11] bg-black/0 transition-colors duration-300 group-hover/card:bg-black/15" />

            {/* ── Top-left: IMDb score OR flexibly shifted Subtitle/Voice badge (sát mép trên) ── */}
            {topLeftBadge && (
              <div className="pointer-events-none absolute left-0 top-0 z-20">
                {topLeftBadge.type === 'imdb' ? (
                  <span className="inline-flex items-center gap-1 rounded-br-[4px] bg-[#f5c518] px-1.5 py-[2.5px] text-[8px] font-black leading-none text-black shadow-md sm:px-2 sm:py-[3px] sm:text-[9.5px]">
                    <span>IMDb</span>
                    <span>{topLeftBadge.value}</span>
                  </span>
                ) : topLeftBadge.type === 'sub' ? (
                  <span className="inline-flex items-center rounded-br-[4px] bg-[#2563eb] px-1.5 py-[2.5px] text-[8px] font-black leading-none text-white shadow-md sm:px-2 sm:py-[3px] sm:text-[9px]">
                    {topLeftBadge.text}
                  </span>
                ) : (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-br-[4px] px-1.5 py-[2.5px] text-[8px] font-black leading-none text-white shadow-md sm:px-2 sm:py-[3px] sm:text-[9px]',
                      topLeftBadge.voiceType === 'dub' ? 'bg-[#9333ea]' : 'bg-[#16a34a]',
                    )}
                  >
                    {topLeftBadge.text}
                  </span>
                )}
              </div>
            )}

            {/* ── Top-right: Quality (FHD / HD / 4K - sát mép trên) ── */}
            {qualityBadge && (
              <div className="pointer-events-none absolute right-0 top-0 z-20">
                <span className="inline-flex items-center rounded-bl-[4px] border-b border-l border-white/15 bg-black/80 px-1.5 py-[2.5px] text-[8px] font-extrabold uppercase leading-none tracking-wider text-white shadow-md backdrop-blur-md sm:px-2 sm:py-[3px] sm:text-[9px]">
                  {qualityBadge}
                </span>
              </div>
            )}

            {/* ── Bottom-left: Subtitle or Audio badge if not already at top ── */}
            {bottomLeftBadge && (
              <div className="pointer-events-none absolute bottom-1.5 left-1.5 z-20 sm:bottom-2 sm:left-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-[4px] border px-1.5 py-[2px] text-[8px] font-black leading-none text-white shadow-[0_2px_8px_rgba(0,0,0,0.4)] backdrop-blur-md sm:px-2 sm:py-[2.5px] sm:text-[9px]',
                    bottomLeftBadge.type === 'sub'
                      ? 'border-blue-400/30 bg-[#2563eb]/90'
                      : bottomLeftBadge.voiceType === 'dub'
                        ? 'border-purple-400/30 bg-[#9333ea]/90'
                        : 'border-emerald-400/30 bg-[#16a34a]/90',
                  )}
                >
                  {bottomLeftBadge.text}
                </span>
              </div>
            )}

            {/* ── Bottom-right: Dub / Voiceover badge if has both Subtitle and Voiceover with IMDb at top ── */}
            {bottomRightBadge && (
              <div className="pointer-events-none absolute bottom-1.5 right-1.5 z-20 sm:bottom-2 sm:right-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-[4px] border px-1.5 py-[2px] text-[8px] font-black leading-none text-white shadow-[0_2px_8px_rgba(0,0,0,0.4)] backdrop-blur-md sm:px-2 sm:py-[2.5px] sm:text-[9px]',
                    bottomRightBadge.voiceType === 'dub'
                      ? 'border-purple-400/30 bg-[#9333ea]/90'
                      : 'border-emerald-400/30 bg-[#16a34a]/90',
                  )}
                >
                  {bottomRightBadge.text}
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
            prefetch={false}
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
  variant,
  width,
  hideDetails,
}: {
  variant?: 'standard' | 'landscape';
  width?: number;
  hideDetails?: boolean;
}) {
  const globalCardLayout = useSettingsStore((s) => s.cardLayout);
  const effectiveVariant = variant || (globalCardLayout === 'horizontal' ? 'landscape' : 'standard');

  return (
    <div
      style={width ? { width } : undefined}
      className={cn('flex flex-col animate-pulse', !width && 'w-full')}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-[8px] border border-white/5 bg-neutral-900',
          effectiveVariant === 'landscape' ? 'aspect-video w-full' : 'aspect-[2/3] w-full',
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
