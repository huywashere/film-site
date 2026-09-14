'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Info, Play, Star, Calendar } from 'lucide-react';
import { FilmItem } from '@/components/film/FilmCard';
import { TmdbArtwork } from '@/components/film/TmdbArtwork';
import { ShowcaseTitleLogo } from '@/components/film/ShowcaseTitleLogo';
import { cardFont } from '@/lib/fonts';
import { useTranslation } from '@/store/langStore';
import { deduplicateSectionRow } from '@/lib/recommendation-engine';

interface HeroShowcaseSectionProps {
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

export function HeroShowcaseSection({ title, films, isLoading, href }: HeroShowcaseSectionProps) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const scrollEndTimerRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const shortlist = useMemo(() => deduplicateSectionRow(films).slice(0, 24), [films]);
  const activeFilm = shortlist[activeIndex % Math.max(shortlist.length, 1)];
  const nextFilm = shortlist.length > 1
    ? shortlist[(activeIndex + 1) % shortlist.length]
    : undefined;

  useEffect(() => {
    setActiveIndex((index) => (shortlist.length > 0 ? index % shortlist.length : 0));
  }, [shortlist.length]);

  useEffect(() => {
    const rail = railRef.current;
    const thumbnail = thumbnailRefs.current[activeIndex];
    if (!rail || !thumbnail || window.innerWidth >= 1024) return;

    rail.scrollTo({
      left: thumbnail.offsetLeft - Math.max(0, (rail.clientWidth - thumbnail.offsetWidth) / 2),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [activeIndex, reduceMotion]);

  useEffect(
    () => () => {
      if (scrollEndTimerRef.current !== null) {
        window.clearTimeout(scrollEndTimerRef.current);
      }
    },
    [],
  );

  const syncActiveThumbnail = () => {
    const rail = railRef.current;
    if (!rail || window.innerWidth >= 1024) return;
    if (scrollEndTimerRef.current !== null) {
      window.clearTimeout(scrollEndTimerRef.current);
    }
    scrollEndTimerRef.current = window.setTimeout(() => {
      const center = rail.scrollLeft + rail.clientWidth / 2;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;
      thumbnailRefs.current.forEach((thumbnail, index) => {
        if (!thumbnail) return;
        const distance = Math.abs(thumbnail.offsetLeft + thumbnail.offsetWidth / 2 - center);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      setActiveIndex((current) => (current === closestIndex ? current : closestIndex));
      scrollEndTimerRef.current = null;
    }, 90);
  };

  if (isLoading) {
    return (
      <div className="mb-14 h-[520px] w-full animate-pulse rounded-[28px] border border-white/10 bg-white/[0.03]" />
    );
  }

  if (!activeFilm) return null;

  const categories = (activeFilm.category || [])
    .map((c) => c.name)
    .filter(Boolean)
    .slice(0, 3);
  const rating = Number(activeFilm.vote_average || activeFilm.rating || 0);

  return (
    <section
      data-cinematic-section="true"
      className={`${cardFont.className} relative mb-14 w-full select-none`}
    >
      {/* Section Header */}
      <div className="mb-4 flex items-start justify-between gap-2 px-1 sm:items-end">
        <div className="min-w-0 flex-1">
          <h2
            className={`${cardFont.className} text-xl font-extrabold tracking-[-0.025em] text-white sm:text-2xl`}
          >
            {title}
          </h2>
        </div>
        {href && (
          <Link
            href={href}
            className="group/link inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs sm:text-sm font-semibold text-white/80 hover:text-white transition-colors select-none ml-1.5"
          >
            <span>{t('home.viewAll', 'Xem tất cả')}</span>
            <ChevronRight
              size={14}
              className="stroke-[2.2] text-white/60 group-hover/link:text-white transition-transform group-hover/link:translate-x-0.5"
            />
          </Link>
        )}
      </div>

      {/* Main Card */}
      <div className="relative">
        {/* Hero Backdrop */}
        <div className="relative min-h-[380px] h-[380px] overflow-hidden rounded-2xl border border-white/[0.08] sm:min-h-[460px] sm:h-[460px] sm:rounded-[24px] lg:min-h-[520px] lg:h-[520px] xl:min-h-[560px] xl:h-[560px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFilm.slug}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              <TmdbArtwork
                film={activeFilm}
                kind="backdrop"
                alt={activeFilm.name}
                allowTitleLookup
                preferOriginal
                sizes="100vw"
                imageClassName="object-[center_20%] sm:object-[center_25%]"
                className="h-full w-full"
              />
              {/* Gradients */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0b10]/92 via-[#0a0b10]/35 via-50% to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b10]/90 via-[#0a0b10]/20 via-35% to-transparent" />
            </motion.div>
          </AnimatePresence>

          {/* Content Overlay */}
          <div className="relative z-10 flex h-full flex-col justify-between px-4 pb-20 pt-4 sm:px-8 sm:pb-28 sm:pt-8 lg:px-10 lg:pb-32 lg:pt-10">
            {/* Top row: counter + nav */}
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[9px] font-semibold text-neutral-300 backdrop-blur-sm">
                {String(activeIndex + 1).padStart(2, '0')}&nbsp;/&nbsp;
                {String(shortlist.length).padStart(2, '0')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveIndex((i) => (i === 0 ? shortlist.length - 1 : i - 1))}
                  aria-label="Trước"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-90 cursor-pointer"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIndex((i) => (i + 1) % shortlist.length)}
                  aria-label="Tiếp theo"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-90 cursor-pointer"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Bottom: Film Info */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeFilm.slug}-info`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="max-w-xl"
              >
                {/* Tags */}
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  {categories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-neutral-200 backdrop-blur-sm"
                    >
                      {cat}
                    </span>
                  ))}
                  {rating > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-[4px] bg-[#f5c518] px-2 py-0.5 text-[10px] font-black text-black leading-none">
                      <span className="font-extrabold tracking-tight">IMDb</span>
                      <span>{rating.toFixed(1)}</span>
                    </span>
                  )}
                  {activeFilm.year && (
                    <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-neutral-400">
                      <Calendar size={9} />
                      {activeFilm.year}
                    </span>
                  )}
                </div>

                {/* Title Logo / Banner */}
                <ShowcaseTitleLogo
                  key={activeFilm.slug}
                  film={activeFilm}
                  prefetchFilm={nextFilm}
                  fallbackTextClassName={`${cardFont.className} text-base font-extrabold tracking-tight text-white line-clamp-2 sm:text-2xl lg:text-3xl`}
                  imageClassName="max-h-12 sm:max-h-16 md:max-h-20 lg:max-h-22"
                  showSubtitle
                  subtitleClassName="mt-1 text-xs text-neutral-400 sm:text-sm"
                />

                {/* Description */}
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-300 sm:text-sm">
                  {activeFilm.content ||
                    'Những series Âu Mỹ đáng xem, giàu kịch tính và nhân vật đặc sắc.'}
                </p>

                {/* CTA Buttons */}
                <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-5">
                  <Link
                    href={filmHref(activeFilm, 'watch')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black transition-all hover:bg-violet-100 active:scale-[0.97] sm:px-5 sm:py-2.5 sm:text-sm"
                  >
                    <Play size={14} fill="currentColor" /> Xem ngay
                  </Link>
                  <Link
                    href={filmHref(activeFilm, 'detail')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-[0.97] sm:px-5 sm:py-2.5 sm:text-sm"
                  >
                    <Info size={14} /> Chi tiết
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Thumbnail Strip: floats over the lower edge of the banner */}
        <div className="relative z-20 -mt-8 px-3 sm:-mt-10 sm:px-6 lg:-mt-12">
          {/* Fade masks for scroll hint */}
          <div className="pointer-events-none absolute inset-y-0 left-3 z-10 w-8 bg-gradient-to-r from-[#141414]/80 to-transparent sm:left-6 sm:w-12" />
          <div className="pointer-events-none absolute inset-y-0 right-3 z-10 w-8 bg-gradient-to-l from-[#141414]/80 to-transparent sm:right-6 sm:w-12" />
          <div
            ref={railRef}
            onScroll={syncActiveThumbnail}
            className="snap-x snap-mandatory overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="mx-auto flex w-max min-w-full justify-center gap-2 px-1">
              {shortlist.map((film, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={`${film.slug}-${index}`}
                    ref={(element) => {
                      thumbnailRefs.current[index] = element;
                    }}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`group relative w-[58px] shrink-0 snap-center overflow-hidden rounded-xl transition-all cursor-pointer sm:w-[70px] ${
                      isActive
                        ? 'ring-2 ring-violet-400 opacity-100 scale-105 shadow-[0_12px_30px_rgba(0,0,0,0.5)]'
                        : 'opacity-65 shadow-[0_10px_24px_rgba(0,0,0,0.45)] hover:opacity-100 hover:scale-[1.02]'
                    }`}
                    title={film.name}
                  >
                    <TmdbArtwork
                      film={film}
                      kind="poster"
                      alt={film.name}
                      allowTitleLookup
                      className="aspect-[2/3] w-full transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-violet-400" />
                    )}
                    {/* Film name tooltip overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1.5 pt-4">
                      <p className="text-[8px] font-semibold text-white line-clamp-1 leading-tight sm:text-[9px]">
                        {film.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
