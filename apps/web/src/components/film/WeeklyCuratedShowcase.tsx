'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Tv,
  Clapperboard,
  Play,
  ArrowRight,
  Sparkles,
  Star,
  Info,
  X,
} from 'lucide-react';
import { FilmItem } from '@/components/film/FilmCard';
import { TmdbArtwork } from '@/components/film/TmdbArtwork';
import { cardFont } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import { deduplicateSectionRow } from '@/lib/recommendation-engine';
import { useReliableNavigation } from '@/hooks/useReliableNavigation';

interface WeeklyCuratedShowcaseProps {
  seriesFilms?: FilmItem[];
  singleFilms?: FilmItem[];
  isLoading?: boolean;
}

export function WeeklyCuratedShowcase({
  seriesFilms = [],
  singleFilms = [],
  isLoading = false,
}: WeeklyCuratedShowcaseProps) {
  const router = useReliableNavigation();
  const [activeTab, setActiveTab] = useState<'all' | 'series' | 'single'>('all');
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Clean and deduplicate series and single films
  const cleanSeries = useMemo(
    () => deduplicateSectionRow(seriesFilms).slice(0, 24),
    [seriesFilms],
  );
  const cleanSingles = useMemo(
    () => deduplicateSectionRow(singleFilms).slice(0, 24),
    [singleFilms],
  );

  // Determine 4 active spotlight cards based on tab
  const spotlightFilms = useMemo(() => {
    if (activeTab === 'series') {
      return cleanSeries.slice(0, 4);
    }
    if (activeTab === 'single') {
      return cleanSingles.slice(0, 4);
    }
    // Default 'all': 2 top series + 2 top single movies interleaved
    const items: FilmItem[] = [];
    if (cleanSeries[0]) items.push(cleanSeries[0]);
    if (cleanSingles[0]) items.push(cleanSingles[0]);
    if (cleanSeries[1]) items.push(cleanSeries[1]);
    if (cleanSingles[1]) items.push(cleanSingles[1]);

    // Fallback if series or singles has less than 2
    if (items.length < 4) {
      const remainder = [...cleanSeries.slice(2), ...cleanSingles.slice(2)];
      for (const film of remainder) {
        if (items.length >= 4) break;
        if (!items.some((f) => f.slug === film.slug)) {
          items.push(film);
        }
      }
    }
    return items;
  }, [activeTab, cleanSeries, cleanSingles]);

  // Distribute remaining films across 5 optimized vertical columns for the background marquee
  const columnsData = useMemo(() => {
    const spotlightSlugs = new Set(spotlightFilms.map((f) => f.slug));
    let pool: FilmItem[] = [];

    if (activeTab === 'series') {
      pool = cleanSeries.filter((f) => !spotlightSlugs.has(f.slug));
    } else if (activeTab === 'single') {
      pool = cleanSingles.filter((f) => !spotlightSlugs.has(f.slug));
    } else {
      const restSeries = cleanSeries.filter((f) => !spotlightSlugs.has(f.slug));
      const restSingles = cleanSingles.filter((f) => !spotlightSlugs.has(f.slug));
      const maxLen = Math.max(restSeries.length, restSingles.length);
      for (let i = 0; i < maxLen; i++) {
        if (restSeries[i]) pool.push(restSeries[i]);
        if (restSingles[i]) pool.push(restSingles[i]);
      }
    }

    const numCols = 5;
    const cols: FilmItem[][] = Array.from({ length: numCols }, () => []);

    pool.forEach((film, index) => {
      cols[index % numCols].push(film);
    });

    // Ensure each column has at least 3 items for smooth looping
    return cols.map((col) => {
      let filled = [...col];
      if (filled.length < 3) {
        filled = [...filled, ...pool.slice(0, 3 - filled.length)];
      }
      return filled.length > 0 ? filled : pool.slice(0, 3);
    });
  }, [activeTab, cleanSeries, cleanSingles, spotlightFilms]);

  const handlePrefetch = useCallback(
    (slug?: string) => {
      if (!slug) return;
      try {
        router.prefetch(`/film/${slug}`);
      } catch {}
    },
    [router],
  );

  if (isLoading) {
    return (
      <section
        className={`${cardFont.className} my-8 md:my-14 w-full select-none`}
        aria-hidden="true"
      >
        <div className="relative overflow-hidden rounded-3xl sm:rounded-[36px] border border-white/[0.08] bg-[#141414] p-6 sm:p-10 min-h-[480px] md:min-h-[520px] animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
            <div className="lg:col-span-5 space-y-4">
              <div className="h-10 w-72 sm:w-80 rounded-xl bg-white/10" />
              <div className="h-4 w-60 sm:w-72 rounded bg-white/5" />
              <div className="flex gap-2 pt-2">
                <div className="h-9 w-24 rounded-full bg-white/10" />
                <div className="h-9 w-24 rounded-full bg-white/5" />
                <div className="h-9 w-24 rounded-full bg-white/5" />
              </div>
              <div className="h-10 w-36 rounded-full bg-white/10 mt-2" />
            </div>
            <div className="lg:col-span-7 flex justify-end">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-[700px]">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] w-full rounded-2xl bg-white/[0.06] border border-white/10"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (spotlightFilms.length === 0 && columnsData.every((c) => c.length === 0)) {
    return null;
  }

  return (
    <section
      data-cinematic-section="true"
      className={`${cardFont.className} relative my-8 sm:my-12 md:my-16 w-full select-none`}
    >
      {/* ── Scoped GPU-Accelerated Infinite Vertical Marquee ── */}
      <style>{`
        @keyframes marqueeVerticalUp {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(0, -50%, 0); }
        }
        @keyframes marqueeVerticalDown {
          0% { transform: translate3d(0, -50%, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        .animate-col-up-0 { animation: marqueeVerticalUp 38s linear infinite; }
        .animate-col-down-1 { animation: marqueeVerticalDown 44s linear infinite; }
        .animate-col-up-2 { animation: marqueeVerticalUp 34s linear infinite; }
        .animate-col-down-3 { animation: marqueeVerticalDown 42s linear infinite; }
        .animate-col-up-4 { animation: marqueeVerticalUp 36s linear infinite; }

        .group-hover-pause:hover .animate-col-up-0,
        .group-hover-pause:hover .animate-col-down-1,
        .group-hover-pause:hover .animate-col-up-2,
        .group-hover-pause:hover .animate-col-down-3,
        .group-hover-pause:hover .animate-col-up-4 {
          animation-play-state: paused;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-col-up-0,
          .animate-col-down-1,
          .animate-col-up-2,
          .animate-col-down-3,
          .animate-col-up-4 {
            animation: none !important;
          }
        }
      `}</style>

      {/* ── Main Billboard Container ── */}
      <div className="group/billboard group-hover-pause relative overflow-hidden rounded-3xl sm:rounded-[36px] border border-white/[0.08] bg-[#141414] min-h-[480px] md:min-h-[520px] lg:min-h-[540px]">
        {/* ── Background Vertical Alternating Columns Layer ── */}
        <div className="absolute inset-y-0 right-0 left-0 lg:left-[24%] overflow-hidden pointer-events-auto">
          {/* Columns Container */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 sm:gap-3.5 px-3 h-full items-start justify-end opacity-50 hover:opacity-85 transition-opacity duration-500">
            {columnsData.map((colFilms, colIdx) => {
              const isUp = colIdx % 2 === 0;
              const animClass = isUp
                ? `animate-col-up-${colIdx % 5}`
                : `animate-col-down-${colIdx % 5}`;

              // Duplicate items to form a seamless 50% loop
              const loopedFilms = [...colFilms, ...colFilms];

              return (
                <div
                  key={`col-${colIdx}`}
                  className="flex flex-col gap-2.5 sm:gap-3.5 will-change-transform"
                >
                  <div className={cn('flex flex-col gap-2.5 sm:gap-3.5', animClass)}>
                    {loopedFilms.map((film, idx) => {
                      const rating = Number(
                        film.imdb?.vote_average ||
                          film.imdb?.rating ||
                          film.imdb_rating ||
                          film.vote_average ||
                          film.tmdb?.vote_average ||
                          0,
                      );

                      return (
                        <Link
                          key={`card-${film.slug || idx}-${colIdx}-${idx}`}
                          href={`/film/${film.slug}`}
                          prefetch={false}
                          onMouseEnter={() => handlePrefetch(film.slug)}
                          onTouchStart={() => handlePrefetch(film.slug)}
                          onPointerDown={() => handlePrefetch(film.slug)}
                          onClick={() => router.push(`/film/${film.slug}`)}
                          className="group/gridcard relative aspect-[2/3] w-full rounded-xl overflow-hidden border border-white/[0.08] bg-[#1a1a1f] shadow-md transition-all duration-300 hover:scale-110 hover:z-30 hover:border-white/40"
                          title={film.name}
                          aria-label={film.name}
                        >
                          <TmdbArtwork
                            film={film}
                            kind="poster"
                            allowTitleLookup
                            className="h-full w-full object-cover"
                            alt={film.name}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-transparent opacity-0 group-hover/gridcard:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2 pointer-events-none">
                            <p className="text-[10px] sm:text-[11px] font-black text-white line-clamp-1 leading-tight">
                              {film.name}
                            </p>
                            <div className="flex items-center justify-between mt-1 text-[8.5px] sm:text-[9.5px]">
                              <span className="text-neutral-300 font-semibold">
                                {film.year || 2026}
                              </span>
                              {rating > 0 && (
                                <span className="inline-flex items-center gap-0.5 font-extrabold text-amber-400">
                                  <Star size={9} fill="currentColor" />
                                  {rating.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Deep Cinematic Masks */}
          <div className="absolute inset-y-0 left-0 w-36 sm:w-64 md:w-[380px] lg:w-[440px] bg-gradient-to-r from-[#141414] via-[#141414]/95 via-60% to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 sm:w-24 bg-gradient-to-l from-[#141414] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#141414] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#141414] to-transparent z-10 pointer-events-none" />
        </div>

        {/* ── Foreground Stage Layer ── */}
        <div className="relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-8 md:p-10 lg:p-12 items-center min-h-[480px] md:min-h-[520px] lg:min-h-[540px]">
          {/* Left Column: Headline, Filter Tabs & Call To Action */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-4 sm:space-y-5 max-w-xl">
            {/* Headline */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-[1.15]">
                Phim Bộ & Phim Lẻ Tuần Này
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed text-neutral-300/90 max-w-md">
                Tuyển chọn những series đặc sắc và phim điện ảnh bom tấn ăn khách
                nhất được cập nhật trong tuần trên FlexPhim.
              </p>
            </div>

            {/* Tab Filter Switcher (Clean, dark minimalist aesthetic) */}
            <div className="inline-flex items-center p-1 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md self-start gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer',
                  activeTab === 'all'
                    ? 'bg-white text-black shadow font-extrabold'
                    : 'text-neutral-400 hover:text-white',
                )}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('series')}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                  activeTab === 'series'
                    ? 'bg-white text-black shadow font-extrabold'
                    : 'text-neutral-400 hover:text-white',
                )}
              >
                <Tv size={12} className="stroke-[2.2]" />
                Phim Bộ
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('single')}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                  activeTab === 'single'
                    ? 'bg-white text-black shadow font-extrabold'
                    : 'text-neutral-400 hover:text-white',
                )}
              >
                <Clapperboard size={12} className="stroke-[2.2]" />
                Phim Lẻ
              </button>
            </div>

            {/* Actions Bar: Pill Button + Info Trigger */}
            <div className="flex items-center gap-3 pt-1">
              <Link
                href="/films"
                prefetch={false}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-extrabold text-black transition-all hover:bg-neutral-200 active:scale-95 shadow-md"
              >
                <span>Khám phá ngay</span>
                <ArrowRight size={14} className="stroke-[2.5]" />
              </Link>

              <button
                type="button"
                onClick={() => setShowInfoModal((prev) => !prev)}
                aria-label="Thông tin tuyển tập tuần"
                title="Thông tin tuyển tập"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-neutral-300 backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/15 hover:text-white active:scale-95 cursor-pointer"
              >
                <Info size={16} />
              </button>
            </div>
          </div>

          {/* Right Column: 4 Curated Compact Spotlight Cards */}
          <div className="lg:col-span-7 w-full flex items-center justify-center lg:justify-end py-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 w-full max-w-[720px]">
              {spotlightFilms.map((film, idx) => {
                const isSeries =
                  cleanSeries.some((s) => s.slug === film.slug) ||
                  film.type === 'series' ||
                  Boolean(
                    film.episode_current &&
                      !/full|1\/1|hoàn tất\s*\(1\/1\)/i.test(film.episode_current),
                  );

                const quality = (film.quality || 'FHD').toUpperCase();
                const qualityBadge = quality.includes('4K')
                  ? '4K'
                  : quality.includes('HD') && !quality.includes('FHD')
                    ? 'HD'
                    : 'FHD';

                const imdbRaw =
                  film.imdb?.vote_average ??
                  film.imdb?.rating ??
                  film.imdb_rating ??
                  film.tmdb?.vote_average ??
                  film.vote_average ??
                  film.rating;
                const imdbNum =
                  typeof imdbRaw === 'number'
                    ? imdbRaw
                    : parseFloat(String(imdbRaw || ''));
                const imdbScore =
                  !isNaN(imdbNum) && imdbNum > 0 ? imdbNum.toFixed(1) : null;

                return (
                  <Link
                    key={`spotlight-${film.slug || idx}-${idx}`}
                    href={`/film/${film.slug}`}
                    prefetch={false}
                    onMouseEnter={() => handlePrefetch(film.slug)}
                    onTouchStart={() => handlePrefetch(film.slug)}
                    onPointerDown={() => handlePrefetch(film.slug)}
                    onClick={() => router.push(`/film/${film.slug}`)}
                    className="group/spotlight relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#16171d] border border-white/10 hover:border-white/35 shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.7)] transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 hover:z-30 cursor-pointer flex flex-col justify-end"
                    aria-label={film.name}
                  >
                    {/* Poster Artwork */}
                    <TmdbArtwork
                      film={film}
                      kind="poster"
                      allowTitleLookup
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/spotlight:scale-105"
                      alt={film.name}
                    />

                    {/* Ambient Gradient Overlay for Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 via-50% to-black/20 pointer-events-none" />

                    {/* Top Badges Bar: Clean, Minimalist Frosted Glass (No garish neon borders) */}
                    <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 z-10 pointer-events-none">
                      <span className="inline-flex items-center gap-1 rounded-md bg-black/75 backdrop-blur-md border border-white/15 px-1.5 py-0.5 text-[9px] sm:text-[9.5px] font-bold text-neutral-200 shadow-sm">
                        {isSeries ? (
                          <>
                            <Tv size={10} className="stroke-[2.2] text-sky-400" />
                            <span>Phim Bộ</span>
                          </>
                        ) : (
                          <>
                            <Clapperboard size={10} className="stroke-[2.2] text-amber-400" />
                            <span>Phim Lẻ</span>
                          </>
                        )}
                      </span>

                      <span className="inline-flex items-center rounded-md bg-black/75 backdrop-blur-md border border-white/15 px-1.5 py-0.5 text-[8.5px] sm:text-[9px] font-black text-white/90 shadow-sm">
                        {qualityBadge}
                      </span>
                    </div>

                    {/* Hover Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 group-hover/spotlight:opacity-100 transition-opacity duration-250 pointer-events-none">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-xl transition-transform group-hover/spotlight:scale-110">
                        <Play size={18} fill="currentColor" className="ml-0.5" />
                      </div>
                    </div>

                    {/* Bottom Metadata & Title Panel */}
                    <div className="relative z-10 p-2.5 sm:p-3 flex flex-col justify-end bg-gradient-to-t from-black via-black/95 via-70% to-transparent pt-8">
                      {/* Row 1: IMDb Rating & Episode / Duration */}
                      <div className="flex items-center justify-between gap-1 mb-1 text-[9.5px] sm:text-[10px]">
                        {imdbScore ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded text-[9px]">
                            <Star size={9} fill="currentColor" />
                            <span className="font-black text-[8px] tracking-tight">IMDb</span>
                            <span>{imdbScore}</span>
                          </span>
                        ) : (
                          <span className="text-neutral-400 font-semibold text-[9px]">
                            {film.year || 2026}
                          </span>
                        )}

                        <span className="text-neutral-300 font-medium truncate max-w-[85px] bg-white/[0.08] px-1.5 py-0.5 rounded text-[8.5px] sm:text-[9px]">
                          {isSeries
                            ? film.episode_current || 'Đang cập nhật'
                            : film.time || (film.year ? `${film.year}` : 'Bản Đẹp')}
                        </span>
                      </div>

                      {/* Row 2: Film Title */}
                      <h3
                        className="text-xs sm:text-[13px] font-bold text-white line-clamp-1 leading-snug group-hover/spotlight:text-cyan-300 transition-colors"
                        title={film.name}
                      >
                        {film.name}
                      </h3>

                      {/* Row 3: Sub-title / Origin Name / Year */}
                      <div className="flex items-center justify-between gap-1 mt-0.5 text-[9.5px] sm:text-[10px] text-neutral-400">
                        <span className="line-clamp-1 font-medium truncate">
                          {film.origin_name || film.name}
                        </span>
                        {film.year && (
                          <span className="shrink-0 text-neutral-500 font-semibold">
                            {film.year}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Expandable Info Card Popup ── */}
        {showInfoModal && (
          <div className="relative z-30 border-t border-white/10 bg-black/90 p-4 sm:p-5 backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start justify-between gap-4 max-w-4xl mx-auto">
              <div className="space-y-1 text-xs">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-400" />
                  <span>Về Tuyển Tập Phim Bộ & Phim Lẻ Tuần Này</span>
                </p>
                <p className="text-neutral-400 leading-relaxed">
                  Bảng tuyển chọn tổng hợp tự động các tác phẩm đạt lượt xem cao,
                  điểm đánh giá IMDb xuất sắc và chất lượng hình ảnh sắc nét nhất
                  trong 7 ngày qua. Bạn có thể nhấn vào bất kỳ poster phim nào
                  trên các dòng ảnh đang chạy để xem chi tiết và tập phim.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg cursor-pointer"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
