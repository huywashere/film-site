'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { FilmItem } from '@/components/film/FilmCard';
import { TmdbArtwork } from '@/components/film/TmdbArtwork';
import { cardFont } from '@/lib/fonts';
import { useTranslation } from '@/store/langStore';
import { deduplicateSectionRow } from '@/lib/recommendation-engine';

interface LandscapeSpotlightRowProps {
  title: string;
  films: FilmItem[];
  isLoading?: boolean;
  href?: string;
}

function filmHref(film: FilmItem, mode: 'watch' | 'detail') {
  const source = film._source;
  const sourceSlug = source ? film._sourceSlugs?.[source] : undefined;
  const query = new URLSearchParams();
  if (source) query.set('source', source);
  if (sourceSlug && sourceSlug !== film.slug) query.set('sourceSlug', sourceSlug);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return `/${mode === 'watch' ? 'watch' : 'film'}/${film.slug}${suffix}`;
}

export function LandscapeSpotlightRow({
  title,
  films,
  isLoading,
  href,
}: LandscapeSpotlightRowProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  const cleanList = useMemo(() => deduplicateSectionRow(films).slice(0, 16), [films]);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < maxScroll - 10);
    if (maxScroll > 0) {
      setScrollProgress((el.scrollLeft / maxScroll) * 100);
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.firstElementChild as HTMLElement | null;
    const gap = Number.parseFloat(window.getComputedStyle(el).columnGap || '12');
    const scrollAmount = firstCard ? firstCard.offsetWidth + gap : el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (isLoading) {
    return (
      <div className="mb-8 sm:mb-12 h-[280px] w-full animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />
    );
  }

  if (cleanList.length === 0) return null;

  return (
    <section
      data-cinematic-section="true"
      className={`${cardFont.className} relative mb-8 sm:mb-12 w-full select-none`}
    >
      {/* ── Section Header ── */}
      <div className="mb-4 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-3">
          <h2
            className={`${cardFont.className} text-white text-xl font-extrabold tracking-[-0.025em] sm:text-2xl`}
          >
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Scroll Navigation Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!canScrollLeft}
              onClick={() => handleScroll('left')}
              aria-label="Previous"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-all hover:border-white/30 hover:bg-white/15 hover:text-white disabled:opacity-20 disabled:pointer-events-none active:scale-90"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              disabled={!canScrollRight}
              onClick={() => handleScroll('right')}
              aria-label="Next"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-all hover:border-white/30 hover:bg-white/15 hover:text-white disabled:opacity-20 disabled:pointer-events-none active:scale-90"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {href && (
            <Link
              href={href}
              className="group/link ml-2 hidden sm:inline-flex shrink-0 items-center gap-0.5 text-xs sm:text-sm font-semibold text-white/80 transition-colors hover:text-white"
            >
              <span>{t('home.viewAll', 'Xem tất cả')}</span>
              <ChevronRight
                size={14}
                className="stroke-[2.2] text-white/60 transition-transform group-hover/link:translate-x-0.5 group-hover/link:text-white"
              />
            </Link>
          )}
        </div>
      </div>

      {/* Poster rail: portrait art keeps titles legible and matches the desktop catalogue. */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-4 pt-1 scroll-smooth [-webkit-overflow-scrolling:touch] sm:gap-4"
      >
        {cleanList.map((film, index) => {
          const rating = Number(
            film.imdb_rating ||
              film.vote_average ||
              film.tmdb?.vote_average ||
              film.tmdb?.rating ||
              film.rating ||
              0,
          );
          const rawLang = (film.lang || '').toLowerCase();
          const hasVoiceOver = /thuyết minh|thuyet minh|t\.minh|\btm\b/.test(rawLang);
          const hasDub = /lồng tiếng|long tieng|l\.tiếng|\blt\b/.test(rawLang);
          const episodeNumber =
            film.episode_current?.match(/(?:tập|tap|episode|ep)\s*[-.:]?\s*(\d+)/i)?.[1] ||
            film.episode_current?.match(/(?:\(|\b)(\d+)\s*\/\s*\d+/)?.[1] ||
            '';
          const quality = film.quality?.trim() || 'FHD';

          return (
            <div
              key={film.slug || index}
              className="group relative flex w-[44vw] min-w-[148px] max-w-[184px] shrink-0 snap-start cursor-pointer select-none flex-col sm:w-[200px] sm:max-w-[200px] lg:w-[220px] lg:max-w-[220px] xl:w-[15.4%] xl:max-w-none"
            >
              {/* Portrait TMDB poster */}
              <Link
                href={filmHref(film, 'watch')}
                className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-md transition-[border-color,box-shadow,transform] duration-300 group-hover:-translate-y-1 group-hover:border-white/30 group-hover:shadow-[0_16px_34px_rgba(0,0,0,0.72)] sm:rounded-2xl"
              >
                <TmdbArtwork
                  film={film}
                  kind="poster"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  alt={film.name}
                />

                {/* Hover Play Button Overlay */}
                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-black shadow-2xl transform scale-90 group-hover:scale-100 transition-transform">
                    <Play size={16} fill="currentColor" className="ml-0.5" />
                  </div>
                </div>

                {/* Top Corner Badges */}
                <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-center justify-between gap-1">
                  {rating > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#f5a000] px-1.5 py-1 text-[9px] font-black leading-none text-black shadow-lg">
                      <span>IMDb</span>
                      <span>{rating.toFixed(1)}</span>
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="rounded-md border border-white/10 bg-black/85 px-1.5 py-1 text-[9px] font-black uppercase leading-none text-white shadow-lg backdrop-blur-sm">
                    {quality}
                  </span>
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-1 bg-gradient-to-t from-black/90 via-black/25 to-transparent px-2 pb-2 pt-10">
                  <div className="flex min-w-0 flex-wrap gap-1">
                    <span className="rounded bg-violet-500 px-1.5 py-1 text-[8.5px] font-black uppercase leading-none text-white">
                      P.Đ{episodeNumber ? ` ${episodeNumber}` : ''}
                    </span>
                    {(hasVoiceOver || hasDub) && (
                      <span className="rounded bg-emerald-500 px-1.5 py-1 text-[8.5px] font-black uppercase leading-none text-white">
                        {hasDub ? 'L.T' : 'T.M'}
                        {episodeNumber ? ` ${episodeNumber}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </Link>

              {/* 2. Clean Film Info below Backdrop */}
              <div className="mt-2 flex flex-col space-y-0.5 px-0.5">
                <Link
                  href={filmHref(film, 'watch')}
                  className="block line-clamp-1 text-xs font-extrabold leading-snug text-white transition-colors group-hover:text-violet-200 sm:text-sm"
                  title={film.name}
                >
                  {film.name}
                </Link>

                <div className="flex items-center justify-between text-[10px] font-medium text-neutral-500 sm:text-[11px]">
                  <span className="truncate max-w-[75%]">
                    {film.origin_name || `Năm ${film.year || 2026}`}
                  </span>
                  {film.year && (
                    <span className="shrink-0 text-neutral-500 text-[10px]">{film.year}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom Subtle Progress Bar Indicator ── */}
      <div className="mt-2 w-48 h-1 bg-white/10 rounded-full overflow-hidden mx-auto">
        <div
          className="h-full bg-white/40 rounded-full transition-all duration-150"
          style={{ width: `${Math.max(15, scrollProgress)}%` }}
        />
      </div>
    </section>
  );
}
