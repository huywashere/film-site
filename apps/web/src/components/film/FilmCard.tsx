'use client';

import Link from 'next/link';
import { memo, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MovieSource } from '@/lib/movie-normalizer';
import { cardFont } from '@/lib/fonts';
import { normalizeMovieArtworkUrl } from '@/lib/movie-image-url';
import { TmdbArtwork } from '@/components/film/TmdbArtwork';
import { useSettingsStore } from '@/store/settingsStore';
import { movieApi } from '@/lib/api';

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
  tmdbId?: string | number;
  poster_path?: string;
  backdrop_path?: string;
  logo_path?: string;
  artwork?: {
    tmdbId?: string | number;
    type?: 'movie' | 'tv' | string;
    poster_path?: string;
    backdrop_path?: string;
    logo_path?: string;
    poster?: { w185?: string; w342?: string; w500?: string };
    backdrop?: { w780?: string; w1280?: string; original?: string };
    logo?: { w300?: string; w500?: string };
  };
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
    id?: string | number;
    season?: number | null;
    vote_average?: number;
    vote_count?: number;
    rating?: number;
    poster_path?: string;
    backdrop_path?: string;
    logo_path?: string;
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
  variant?: 'standard' | 'landscape' | 'poster-pill';
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
  const isPosterPill = effectiveVariant === 'poster-pill';
  const slug = film.slug;
  const title = film.name || film.title || 'Chưa có tên';
  const rawLang = (film.lang || '').toLowerCase();
  const hasVoiceOver = /thuyết minh|thuyet minh|t\.minh|\btm\b/.test(rawLang);
  const hasDub = /lồng tiếng|long tieng|l\.tiếng|\blt\b/.test(rawLang);
  const hasExplicitVietsub = /vietsub|phụ đề|phu de|\bpd\b/.test(rawLang);
  const hasBilingual =
    /song ngữ|song ngu|bilingual|\bsn\b/i.test(rawLang) ||
    film._source === 'vicdn' ||
    film._source === 'xink' ||
    Boolean(film._sources?.some((s) => s === 'vicdn' || s === 'xink')) ||
    Boolean(
      Array.isArray(film.category) &&
        film.category.some((c) => /song-ngu|song ngu|bilingual/i.test(c?.slug || c?.name || '')),
    );
  // Default to Vietsub if neither voiceover nor dub is exclusive, or if explicitly noted
  const hasVietsub = hasExplicitVietsub || (!hasVoiceOver && !hasDub);

  // Extract top-right quality badge (FHD / 4K / HD / CAM)
  const qualityBadge = (() => {
    const raw = (film.quality || '').toUpperCase();
    if (raw.includes('4K')) return 'FHD';
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

  const bilingualBadge = hasBilingual ? { label: 'Song Ngữ' } : null;

  // ── Pill Badges for 'poster-pill' variant (e.g. historical / period dramas) ──
  const pillEpisodeText = (() => {
    const raw = (film.episode_current || '').trim();
    if (/hoàn tất|hoan tat|full/i.test(raw) || film.type === 'single') {
      return 'Full';
    }
    const fraction = raw.match(/(?:\(|\b)(\d+)\s*\/\s*\d+/);
    if (fraction?.[1]) return fraction[1];
    const explicit = raw.match(/(?:tập|tap|episode|ep)\s*[-.:]?\s*(\d+)/i);
    if (explicit?.[1]) return explicit[1];
    const digits = raw.match(/^\d+$/);
    if (digits) return digits[0];
    if (raw) return raw.replace(/tập\s*/i, '').trim();
    return 'Full';
  })();

  const isSeriesWithEpisodes = film.type === 'series' && pillEpisodeText !== 'Full';

  // ── Badges for 'poster-pill' variant (clean monochrome white styling) ──
  const posterPillBadges = useMemo(() => {
    if (!isPosterPill) return [];
    const list: Array<{ text: string }> = [];

    // 1. Subtitle info
    if (hasVietsub) {
      list.push({ text: 'Vietsub' });
    }

    // 2. Audio (Song ngữ / Lồng tiếng / Thuyết minh)
    if (hasBilingual) {
      list.push({ text: 'Song Ngữ' });
    } else if (hasDub) {
      list.push({ text: 'Lồng Tiếng' });
    } else if (hasVoiceOver) {
      list.push({ text: 'Thuyết Minh' });
    }

    // 3. Episode / Format info
    if (film.type === 'series') {
      if (pillEpisodeText && pillEpisodeText !== 'Full') {
        list.push({ text: `Tập ${pillEpisodeText}` });
      } else {
        list.push({ text: 'Trọn Bộ' });
      }
    } else if (qualityBadge) {
      list.push({ text: qualityBadge });
    }

    return list;
  }, [hasBilingual, hasDub, hasVietsub, hasVoiceOver, isPosterPill, pillEpisodeText, film.type, qualityBadge]);

  const router = useRouter();
  const handlePrefetch = useCallback(() => {
    if (!slug) return;
    try {
      router.prefetch(`/film/${slug}`);
      void movieApi.getDetail(slug);
    } catch {}
  }, [router, slug]);

  return (
    <div
      data-film-card="true"
      style={width ? { width } : undefined}
      className={cn(
        `${cardFont.className} group/card relative flex flex-col select-none [contain:layout] hover:z-20`,
        !width && 'w-full',
      )}
    >
      <div className="relative transition-transform duration-300 ease-out motion-safe:group-hover/card:-translate-y-1.5">
        <Link
          href={`/film/${slug}`}
          prefetch={false}
          title={title}
          aria-label={title}
          onMouseEnter={handlePrefetch}
          onTouchStart={handlePrefetch}
          onPointerDown={handlePrefetch}
          className={cn(
            'relative block overflow-hidden bg-[#111216] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111214]',
            isPosterPill
              ? 'rounded-[20px] sm:rounded-[24px] border border-white/[0.18] group-hover/card:border-white/50 shadow-[0_10px_28px_-6px_rgba(0,0,0,0.5),0_2px_8px_rgba(0,0,0,0.25)] group-hover/card:shadow-[0_16px_36px_rgba(0,0,0,0.7),0_0_20px_rgba(255,255,255,0.15)] ring-1 ring-white/10 group-hover/card:ring-white/30'
              : 'rounded-[8px] border border-white/[0.08] group-hover/card:border-white/25 shadow-[0_8px_22px_rgba(0,0,0,0.24)] group-hover/card:shadow-[0_16px_36px_rgba(0,0,0,0.44)]',
          )}
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

            {!isPosterPill && (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-14 bg-gradient-to-b from-black/65 via-black/20 to-transparent" />
            )}
            {!isPosterPill && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
            )}
            <div className="pointer-events-none absolute inset-0 z-[11] bg-black/0 transition-colors duration-300 group-hover/card:bg-black/15" />
            {isPosterPill && (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-white/[0.12] via-transparent to-transparent rounded-t-[20px] sm:rounded-t-[24px]" />
            )}

            {/* ── Top-left: IMDb score OR flexibly shifted Subtitle/Voice badge (sát mép trên) ── */}
            {!isPosterPill && topLeftBadge && (
              <div className="pointer-events-none absolute left-0 top-0 z-20">
                {topLeftBadge.type === 'imdb' ? (
                  <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-br-[3px] sm:rounded-br-[4px] bg-[#f5c518] px-1 py-[1.5px] sm:px-2 sm:py-[3px] text-[7px] sm:text-[9.5px] font-black leading-none text-black shadow-md">
                    <span>IMDb</span>
                    <span>{topLeftBadge.value}</span>
                  </span>
                ) : topLeftBadge.type === 'sub' ? (
                  <span className="inline-flex items-center rounded-br-[3px] sm:rounded-br-[4px] bg-[#2563eb] px-1 py-[1.5px] sm:px-2 sm:py-[3px] text-[7px] sm:text-[9px] font-black leading-none text-white shadow-md">
                    {topLeftBadge.text}
                  </span>
                ) : (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-br-[3px] sm:rounded-br-[4px] px-1 py-[1.5px] sm:px-2 sm:py-[3px] text-[7px] sm:text-[9px] font-black leading-none text-white shadow-md',
                      topLeftBadge.voiceType === 'dub' ? 'bg-[#9333ea]' : 'bg-[#16a34a]',
                    )}
                  >
                    {topLeftBadge.text}
                  </span>
                )}
              </div>
            )}

            {/* ── Top-right: Quality (FHD / HD - sát mép trên) ── */}
            {!isPosterPill && qualityBadge && (
              <div className="pointer-events-none absolute right-0 top-0 z-20">
                <span className="inline-flex items-center rounded-bl-[3px] sm:rounded-bl-[4px] border-b border-l border-white/15 bg-black/85 px-1 py-[1.5px] sm:px-2 sm:py-[3px] text-[7px] sm:text-[9px] font-extrabold uppercase leading-none tracking-wider text-white shadow-md">
                  {qualityBadge}
                </span>
              </div>
            )}

            {/* ── Inside Card Content: Poster Pill Bottom Title & White Monochrome Badges ── */}
            {isPosterPill ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center justify-end px-1.5 pb-1.5 pt-8 sm:px-3 sm:pb-3 sm:pt-14 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                {/* Title inside card */}
                <h3
                  className="line-clamp-2 w-full text-center text-[9.5px] sm:text-[12.5px] font-extrabold leading-[1.25] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] max-w-[96%]"
                  title={title}
                >
                  {title}
                </h3>

                {/* White Monochrome Badges (Vietsub, Lồng tiếng / Thuyết minh, Tập / Chất lượng) */}
                {posterPillBadges.length > 0 && (
                  <div className="mt-0.5 sm:mt-1 flex flex-wrap items-center justify-center gap-0.5 sm:gap-1.5 max-w-[96%]">
                    {posterPillBadges.slice(0, 3).map((badge, bIdx) => (
                      <span
                        key={`${badge.text}-${bIdx}`}
                        className="inline-flex items-center rounded-full border border-white/20 bg-black/80 px-1 py-[1px] sm:px-1.5 sm:py-[2px] text-[6.5px] sm:text-[8.5px] font-bold leading-none tracking-wide text-white/95 shadow-sm"
                      >
                        {badge.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* ── Bottom-left: Subtitle or Audio badge if not already at top ── */}
                {bottomLeftBadge && (
                  <div className="pointer-events-none absolute bottom-1 left-1 z-20 sm:bottom-2 sm:left-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-[3px] sm:rounded-[4px] border px-1 py-[1.5px] sm:px-2 sm:py-[2.5px] text-[6.5px] sm:text-[9px] font-black leading-none text-white shadow-[0_2px_8px_rgba(0,0,0,0.4)]',
                        bottomLeftBadge.type === 'sub'
                          ? 'border-blue-400/30 bg-[#2563eb]'
                          : bottomLeftBadge.voiceType === 'dub'
                            ? 'border-purple-400/30 bg-[#9333ea]'
                            : 'border-emerald-400/30 bg-[#16a34a]',
                      )}
                    >
                      {bottomLeftBadge.text}
                    </span>
                  </div>
                )}

                {/* ── Bottom-right: Song Ngữ badge OR Dub / Voiceover badge ── */}
                {bilingualBadge ? (
                  <div className="pointer-events-none absolute bottom-1 right-1 z-20 sm:bottom-2 sm:right-2">
                    <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-[3px] sm:rounded-[4px] border border-purple-300/40 bg-gradient-to-r from-[#e9d5ff] via-[#d8b4fe] to-[#c084fc] px-1 py-[1.5px] sm:px-2 sm:py-[2.5px] text-[6.5px] sm:text-[9px] font-black leading-none text-[#2e1065] shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
                      <Languages size={8} className="h-2 w-2 sm:h-[11px] sm:w-[11px] stroke-[2.5] shrink-0 text-[#2e1065]" />
                      <span>{bilingualBadge.label}</span>
                    </span>
                  </div>
                ) : bottomRightBadge ? (
                  <div className="pointer-events-none absolute bottom-1 right-1 z-20 sm:bottom-2 sm:right-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-[3px] sm:rounded-[4px] border px-1 py-[1.5px] sm:px-2 sm:py-[2.5px] text-[6.5px] sm:text-[9px] font-black leading-none text-white shadow-[0_2px_8px_rgba(0,0,0,0.4)]',
                        bottomRightBadge.voiceType === 'dub'
                          ? 'border-purple-400/30 bg-[#9333ea]'
                          : 'border-emerald-400/30 bg-[#16a34a]',
                      )}
                    >
                      {bottomRightBadge.text}
                    </span>
                  </div>
                ) : null}
              </>
            )}

            {/* Hover Overlay Play Icon */}
            <div className={cn(
              "pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 bg-black/50 p-2.5 text-center",
              isPosterPill ? "rounded-[22px] sm:rounded-[26px]" : "rounded-[8px]"
            )}>
              <div className={cn(
                "flex scale-90 items-center justify-center rounded-full shadow-[0_10px_28px_rgba(0,0,0,0.6)] transition-transform duration-300 motion-safe:group-hover/card:scale-100",
                isPosterPill
                  ? "h-9 w-9 sm:h-12 sm:w-12 border border-white/70 bg-black/80 text-white"
                  : "h-7 w-7 sm:h-10 sm:w-10 border border-white/50 bg-black/75 text-white"
              )}>
                <Play size={isPosterPill ? 14 : 12} fill="currentColor" className="ml-0.5 sm:hidden" />
                <Play size={isPosterPill ? 18 : 16} fill="currentColor" className="ml-0.5 hidden sm:block" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Details Footer below Card */}
      {!hideDetails && !isPosterPill && (
        <div className="mt-1.5 sm:mt-2 flex flex-col px-0.5">
          <Link
            href={`/film/${slug}`}
            prefetch={false}
            title={title}
            aria-label={title}
            onMouseEnter={handlePrefetch}
            onTouchStart={handlePrefetch}
            onPointerDown={handlePrefetch}
            data-film-title="true"
            className="block truncate whitespace-nowrap text-[10px] sm:text-[13px] font-extrabold leading-[1.3] tracking-[-0.015em] text-[#f2f2f3] transition-colors hover:text-white"
          >
            {title}
          </Link>

          <div data-film-meta="true"
            className="mt-[1px] sm:mt-[2px] flex items-center justify-between text-[8px] sm:text-[11px] font-medium leading-tight text-[#777981]">
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
  variant?: 'standard' | 'landscape' | 'poster-pill';
  width?: number;
  hideDetails?: boolean;
}) {
  const globalCardLayout = useSettingsStore((s) => s.cardLayout);
  const effectiveVariant = variant || (globalCardLayout === 'horizontal' ? 'landscape' : 'standard');
  const isPosterPill = effectiveVariant === 'poster-pill';

  return (
    <div
      style={width ? { width } : undefined}
      className={cn('flex flex-col animate-pulse', !width && 'w-full')}
    >
      <div
        className={cn(
          'relative overflow-hidden border border-white/[0.08] bg-[#12141c] shadow-md',
          isPosterPill ? 'rounded-[22px] sm:rounded-[26px]' : 'rounded-[8px]',
          effectiveVariant === 'landscape' ? 'aspect-video w-full' : 'aspect-[2/3] w-full',
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] via-white/[0.05] to-transparent" />
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 h-3 sm:h-4 w-5 sm:w-7 rounded bg-white/[0.08]" />
        {isPosterPill && (
          <div className="absolute inset-x-0 bottom-2.5 flex flex-col items-center gap-1.5 px-3 sm:bottom-3">
            <div className="h-3 w-4/5 rounded bg-white/[0.12]" />
            <div className="flex items-center justify-center gap-1.5">
              <div className="h-3 w-10 rounded-full bg-white/[0.08]" />
              <div className="h-3 w-10 rounded-full bg-white/[0.08]" />
            </div>
          </div>
        )}
      </div>
      {!hideDetails && !isPosterPill && (
        <div className="mt-1.5 sm:mt-2 px-0.5 space-y-1 sm:space-y-1.5">
          <div className="h-2.5 sm:h-3.5 w-[78%] rounded bg-white/[0.09]" />
          <div className="h-2 sm:h-2.5 w-[48%] rounded bg-white/[0.05]" />
        </div>
      )}
    </div>
  );
}
