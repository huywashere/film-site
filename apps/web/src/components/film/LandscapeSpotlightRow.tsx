'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  cardLinkMode?: 'watch' | 'detail';
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
  cardLinkMode = 'detail',
}: LandscapeSpotlightRowProps) {
  const { t } = useTranslation();
  const router = useRouter();
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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const frame = window.requestAnimationFrame(checkScroll);
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [cleanList.length]);

  if (isLoading || cleanList.length === 0) {
    return (
      <section className={`${cardFont.className} mb-8 w-full sm:mb-12`} aria-hidden="true">
        <div className="mb-4 h-8 w-56 animate-pulse rounded-md bg-white/[0.06]" />
        <div className="scrollbar-none flex gap-2.5 overflow-hidden sm:gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="w-[48vw] min-w-[160px] shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-[#101116] sm:w-[48vw] lg:w-[calc((100%-3rem)/4)]"
            >
              <div className="aspect-[16/9] animate-pulse bg-white/[0.045]" />
              <div className="h-[68px] sm:h-[74px] animate-pulse bg-white/[0.025]" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      data-cinematic-section="true"
      className={`${cardFont.className} relative mb-8 sm:mb-12 w-full select-none cv-section-auto`}
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

      {/* Wide artwork leads the row; a compact poster anchors each title block. */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="scrollbar-none flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-3 pt-1 scroll-smooth [-webkit-overflow-scrolling:touch] sm:gap-4"
      >
        {cleanList.map((film, index) => {
          const rating = Number(
            film.imdb?.vote_average ||
              film.imdb?.rating ||
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
          const episodeLabel = episodeNumber
            ? `Vietsub ${episodeNumber}`
            : /full|hoàn tất|hoan tat/i.test(film.episode_current || '')
              ? 'Vietsub Full'
              : 'Vietsub';

          const targetHref = filmHref(film, cardLinkMode);
          const handlePrefetch = () => {
            try {
              router.prefetch(targetHref);
            } catch {}
          };

          return (
            <article
              key={film.slug || index}
              className="group relative w-[48vw] min-w-[160px] shrink-0 snap-start select-none sm:w-[48vw] lg:w-[calc((100%-3rem)/4)]"
            >
              <Link
                href={targetHref}
                onMouseEnter={handlePrefetch}
                onTouchStart={handlePrefetch}
                onPointerDown={handlePrefetch}
                className="relative block aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/[0.09] bg-[#101218] shadow-[0_12px_28px_rgba(0,0,0,0.24)] transition-[border-color,transform,box-shadow] duration-300 group-hover:-translate-y-0.5 group-hover:border-white/25 group-hover:shadow-[0_18px_38px_rgba(0,0,0,0.42)] motion-reduce:transform-none"
              >
                <TmdbArtwork
                  film={film}
                  kind="backdrop"
                  allowTitleLookup
                  preferTmdb
                  className="h-full w-full transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transform-none"
                  alt={film.name}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#08090d]/70 via-transparent to-black/10" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/15 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 scale-90 items-center justify-center rounded-full bg-white text-black shadow-2xl transition-transform group-hover:scale-100">
                    <Play size={13} className="sm:hidden ml-0.5" fill="currentColor" />
                    <Play size={16} className="hidden sm:block ml-0.5" fill="currentColor" />
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-x-1.5 top-1.5 sm:inset-x-2 sm:top-2 z-10 flex items-center justify-between gap-1">
                  {rating > 0 ? (
                    <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded bg-[#f5a000] px-1 sm:px-1.5 py-0.5 sm:py-1 text-[7.5px] sm:text-[9px] font-black leading-none text-black shadow-lg">
                      <span>IMDb</span>
                      <span>{rating.toFixed(1)}</span>
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="rounded border border-white/10 bg-black/85 px-1 sm:px-1.5 py-0.5 sm:py-1 text-[7.5px] sm:text-[9px] font-black uppercase leading-none text-white shadow-lg">
                    {quality}
                  </span>
                </div>
              </Link>

              <div className="relative -mt-7 sm:-mt-9 grid min-h-[80px] sm:min-h-[94px] grid-cols-[52px_minmax(0,1fr)] sm:grid-cols-[76px_minmax(0,1fr)] items-end gap-2 sm:gap-3 px-1.5 sm:px-2">
                <Link
                  href={targetHref}
                  aria-label={film.name}
                  onMouseEnter={handlePrefetch}
                  onTouchStart={handlePrefetch}
                  onPointerDown={handlePrefetch}
                  className="relative z-10 aspect-[2/3] w-[52px] sm:w-[76px] overflow-hidden rounded-md border border-white/25 bg-[#111318] shadow-[0_10px_24px_rgba(0,0,0,0.62)] transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transform-none"
                >
                  <TmdbArtwork film={film} kind="poster" allowTitleLookup className="h-full w-full" alt="" />
                </Link>

                <div className="min-w-0 pb-1">
                  <Link
                    href={targetHref}
                    onMouseEnter={handlePrefetch}
                    onTouchStart={handlePrefetch}
                    onPointerDown={handlePrefetch}
                    className="block line-clamp-2 text-[11px] sm:text-[13px] font-extrabold leading-[1.3] sm:leading-5 text-white transition-colors group-hover:text-violet-200"
                    title={film.name}
                  >
                    {film.name}
                  </Link>
                  <p className="mt-0.5 line-clamp-1 text-[9px] sm:text-[10px] leading-4 text-neutral-500">
                    {film.origin_name || `Năm ${film.year || 2026}`}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-0.5 sm:gap-1">
                    <span className="rounded bg-violet-500/90 px-1 sm:px-1.5 py-0.5 sm:py-1 text-[7px] sm:text-[8px] font-black uppercase leading-none text-white">
                      {episodeLabel}
                    </span>
                    {(hasVoiceOver || hasDub) && (
                      <span className="rounded bg-emerald-500/90 px-1 sm:px-1.5 py-0.5 sm:py-1 text-[7px] sm:text-[8px] font-black uppercase leading-none text-white">
                        {hasDub ? 'L.Tiếng' : 'T.Minh'}
                        {episodeNumber ? ` ${episodeNumber}` : ''}
                      </span>
                    )}
                    {film.year && (
                      <span className="hidden sm:inline-block rounded border border-white/10 bg-white/[0.06] px-1.5 py-1 text-[8px] font-bold leading-none text-neutral-300">
                        {film.year}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* ── Bottom Subtle Progress Bar Indicator ── */}
      <div className="mx-auto mt-2 h-1 w-48 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-white/40 rounded-full transition-all duration-150"
          style={{ width: `${Math.max(15, scrollProgress)}%` }}
        />
      </div>
    </section>
  );
}
