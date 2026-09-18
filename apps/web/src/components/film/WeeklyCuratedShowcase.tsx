'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Tv,
  Clapperboard,
  Play,
  ArrowRight,
  Sparkles,
  Star,
  Info,
} from 'lucide-react';
import { FilmItem } from '@/components/film/FilmCard';
import { TmdbArtwork } from '@/components/film/TmdbArtwork';
import { cardFont } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/store/langStore';
import { deduplicateSectionRow } from '@/lib/recommendation-engine';

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
  const { t } = useTranslation();
  const router = useRouter();
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

  // Determine active spotlight cards based on tab
  const { spotlightSeries, spotlightSingle } = useMemo(() => {
    if (activeTab === 'series') {
      return {
        spotlightSeries: cleanSeries[0] || null,
        spotlightSingle: cleanSeries[1] || cleanSeries[0] || null,
      };
    }
    if (activeTab === 'single') {
      return {
        spotlightSeries: cleanSingles[0] || null,
        spotlightSingle: cleanSingles[1] || cleanSingles[0] || null,
      };
    }
    // Default 'all': Left is top series, Right is top single movie
    return {
      spotlightSeries: cleanSeries[0] || null,
      spotlightSingle: cleanSingles[0] || null,
    };
  }, [activeTab, cleanSeries, cleanSingles]);

  // Distribute films across 6 vertical alternating columns
  const columnsData = useMemo(() => {
    let pool: FilmItem[] = [];
    if (activeTab === 'series') {
      pool = cleanSeries.slice(2);
    } else if (activeTab === 'single') {
      pool = cleanSingles.slice(2);
    } else {
      const restSeries = cleanSeries.slice(1);
      const restSingles = cleanSingles.slice(1);
      const maxLen = Math.max(restSeries.length, restSingles.length);
      for (let i = 0; i < maxLen; i++) {
        if (restSeries[i]) pool.push(restSeries[i]);
        if (restSingles[i]) pool.push(restSingles[i]);
      }
    }

    const numCols = 6;
    const cols: FilmItem[][] = Array.from({ length: numCols }, () => []);

    pool.forEach((film, index) => {
      cols[index % numCols].push(film);
    });

    // Ensure each column has at least 4 items for seamless looping
    return cols.map((col, cIdx) => {
      let filled = [...col];
      if (filled.length < 4) {
        filled = [...filled, ...pool.slice(0, 4 - filled.length)];
      }
      return filled.length > 0 ? filled : pool.slice(0, 4);
    });
  }, [activeTab, cleanSeries, cleanSingles]);

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
        <div className="relative overflow-hidden rounded-3xl sm:rounded-[36px] border border-white/[0.08] bg-[#141414] p-6 sm:p-10 min-h-[500px] animate-pulse">
          <div className="h-6 w-36 rounded-full bg-white/10 mb-4" />
          <div className="h-10 w-72 sm:w-96 rounded-lg bg-white/10 mb-3" />
          <div className="h-4 w-60 sm:w-80 rounded bg-white/5 mb-8" />
          <div className="flex gap-4">
            <div className="h-10 w-36 rounded-full bg-white/10" />
            <div className="h-10 w-24 rounded-full bg-white/5" />
          </div>
        </div>
      </section>
    );
  }

  if (!spotlightSeries && !spotlightSingle && columnsData.every((c) => c.length === 0)) {
    return null;
  }

  return (
    <section
      data-cinematic-section="true"
      className={`${cardFont.className} relative my-8 sm:my-12 md:my-16 w-full select-none`}
    >
      {/* ── Scoped CSS for Vertical Alternating Infinite Motion ── */}
      <style>{`
        @keyframes marqueeVerticalUp {
          0% { transform: translateY(0%); }
          100% { transform: translateY(-50%); }
        }
        @keyframes marqueeVerticalDown {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0%); }
        }
        .animate-col-up-0 { animation: marqueeVerticalUp 38s linear infinite; }
        .animate-col-down-1 { animation: marqueeVerticalDown 44s linear infinite; }
        .animate-col-up-2 { animation: marqueeVerticalUp 34s linear infinite; }
        .animate-col-down-3 { animation: marqueeVerticalDown 42s linear infinite; }
        .animate-col-up-4 { animation: marqueeVerticalUp 36s linear infinite; }
        .animate-col-down-5 { animation: marqueeVerticalDown 40s linear infinite; }

        .group-hover-pause:hover .animate-col-up-0,
        .group-hover-pause:hover .animate-col-down-1,
        .group-hover-pause:hover .animate-col-up-2,
        .group-hover-pause:hover .animate-col-down-3,
        .group-hover-pause:hover .animate-col-up-4,
        .group-hover-pause:hover .animate-col-down-5 {
          animation-play-state: paused;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-col-up-0,
          .animate-col-down-1,
          .animate-col-up-2,
          .animate-col-down-3,
          .animate-col-up-4,
          .animate-col-down-5 {
            animation: none !important;
          }
        }
      `}</style>

      {/* ── Main Billboard Container ── */}
      <div className="group/billboard group-hover-pause relative overflow-hidden rounded-3xl sm:rounded-[36px] border border-white/[0.08] bg-[#141414] min-h-[500px] md:min-h-[540px] lg:min-h-[560px]">
        {/* ── Background Vertical Alternating Columns Layer ── */}
        <div className="absolute inset-y-0 right-0 left-0 lg:left-[22%] overflow-hidden pointer-events-auto">
          {/* Columns Container */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3.5 px-3 h-full items-start justify-end opacity-40 hover:opacity-75 transition-opacity duration-500">
            {columnsData.map((colFilms, colIdx) => {
              const isUp = colIdx % 2 === 0;
              const animClass = isUp
                ? `animate-col-up-${colIdx % 6}`
                : `animate-col-down-${colIdx % 6}`;

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
                          className="group/gridcard relative aspect-[2/3] w-full rounded-xl overflow-hidden border border-white/[0.08] bg-[#1a1a1f] transition-all duration-300 hover:scale-110 hover:z-30 hover:border-white/40"
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

          {/* Deep Cinematic Masks (Matching Site Background #141414) */}
          <div className="absolute inset-y-0 left-0 w-40 sm:w-72 md:w-[420px] lg:w-[480px] bg-gradient-to-r from-[#141414] via-[#141414]/95 via-60% to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-[#141414] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#141414] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#141414] to-transparent z-10 pointer-events-none" />
        </div>

        {/* ── Foreground Stage Layer ── */}
        <div className="relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-8 md:p-10 lg:p-12 items-center min-h-[500px] md:min-h-[540px] lg:min-h-[560px]">
          {/* Left Column: Branding, Headline, Filter Tabs & Call To Action */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-4 sm:space-y-5 max-w-xl">
            {/* Dual Brand / Category Pill */}
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-white/[0.08] border border-white/15 px-3 py-1.5 backdrop-blur-xl text-[11px] font-extrabold tracking-wide uppercase">
              <span className="flex items-center gap-1.5 text-[#23ade5]">
                <Tv size={13} className="stroke-[2.5]" />
                <span>Phim Bộ</span>
              </span>
              <span className="h-1 w-1 rounded-full bg-white/40" />
              <span className="flex items-center gap-1.5 text-amber-400">
                <Clapperboard size={13} className="stroke-[2.5]" />
                <span>Phim Lẻ</span>
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-[1.15]">
                Phim Bộ và Phim Lẻ Tuần Này
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed text-neutral-300/90 max-w-md">
                Tuyển chọn những series đặc sắc và phim điện ảnh bom tấn ăn khách
                nhất được cập nhật trong tuần trên FlexPhim.
              </p>
            </div>

            {/* Tab Filter Switcher */}
            <div className="inline-flex items-center p-1 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md self-start gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={cn(
                  'px-3.5 py-1 rounded-full text-xs font-bold transition-all',
                  activeTab === 'all'
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white',
                )}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('series')}
                className={cn(
                  'px-3.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5',
                  activeTab === 'series'
                    ? 'bg-[#23ade5] text-black'
                    : 'text-neutral-400 hover:text-[#23ade5]',
                )}
              >
                <Tv size={12} className="stroke-[2.5]" />
                Phim Bộ
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('single')}
                className={cn(
                  'px-3.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5',
                  activeTab === 'single'
                    ? 'bg-amber-400 text-black'
                    : 'text-neutral-400 hover:text-amber-400',
                )}
              >
                <Clapperboard size={12} className="stroke-[2.5]" />
                Phim Lẻ
              </button>
            </div>

            {/* Actions Bar: Pill Button + Info Trigger */}
            <div className="flex items-center gap-3 pt-1">
              <Link
                href="/films"
                prefetch={false}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-extrabold text-black transition-all hover:bg-neutral-200 active:scale-95"
              >
                <span>Khám phá ngay</span>
                <ArrowRight size={14} className="stroke-[2.5]" />
              </Link>

              <button
                type="button"
                onClick={() => setShowInfoModal((prev) => !prev)}
                aria-label="Thông tin tuyển tập tuần"
                title="Thông tin tuyển tập"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-neutral-300 backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/15 hover:text-white active:scale-95"
              >
                <Info size={16} />
              </button>
            </div>

            {/* Quality and Audio Trust Strip */}
            <p className="text-[11px] font-semibold text-neutral-400 flex items-center gap-2 pt-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Cập nhật liên tục • Chuẩn 4K & Full HD • Âm thanh vòm</span>
            </p>
          </div>

          {/* Right Column: The 2 Centerpiece Elevated Spotlight Cards */}
          <div className="lg:col-span-7 flex items-center justify-center lg:justify-end gap-3 sm:gap-5 md:gap-6 py-2">
            {/* Spotlight Card 1 (Series Spotlight) */}
            {spotlightSeries && (
              <Link
                href={`/film/${spotlightSeries.slug}`}
                prefetch={false}
                onMouseEnter={() => handlePrefetch(spotlightSeries.slug)}
                onTouchStart={() => handlePrefetch(spotlightSeries.slug)}
                onPointerDown={() => handlePrefetch(spotlightSeries.slug)}
                onClick={() => router.push(`/film/${spotlightSeries.slug}`)}
                className="group/spotlight relative aspect-[2/3] w-[145px] sm:w-[185px] md:w-[210px] lg:w-[230px] shrink-0 rounded-2xl md:rounded-[24px] overflow-hidden bg-[#18181b] border-2 border-[#23ade5] ring-1 ring-[#23ade5]/30 transition-all duration-300 -rotate-1 sm:-rotate-2 hover:rotate-0 hover:scale-105 hover:z-30 hover:border-[#23ade5] hover:ring-[#23ade5]"
                aria-label={spotlightSeries.name}
              >
                <TmdbArtwork
                  film={spotlightSeries}
                  kind="poster"
                  allowTitleLookup
                  className="h-full w-full object-cover transition-transform duration-500 group-hover/spotlight:scale-105"
                  alt={spotlightSeries.name}
                />

                {/* Top Badge: Category Stamp */}
                <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10 pointer-events-none">
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#23ade5] text-black px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase">
                    <Tv size={11} className="stroke-[2.5]" />
                    {activeTab === 'single' ? 'Điện Ảnh' : 'Phim Bộ'}
                  </span>
                  <span className="rounded-md border border-white/20 bg-black/75 backdrop-blur-md px-1.5 py-0.5 text-[8.5px] sm:text-[9.5px] font-black text-white">
                    {spotlightSeries.quality || 'FHD'}
                  </span>
                </div>

                {/* Hover Play Button */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/spotlight:opacity-100 transition-opacity duration-300">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black transition-transform group-hover/spotlight:scale-110">
                    <Play size={20} fill="currentColor" className="ml-0.5" />
                  </div>
                </div>

                {/* Bottom Movie Title and Info */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent p-3 pt-8 flex flex-col justify-end">
                  <h3 className="text-xs sm:text-sm font-black text-white line-clamp-2 leading-snug group-hover/spotlight:text-cyan-300 transition-colors">
                    {spotlightSeries.name}
                  </h3>
                  <div className="flex items-center justify-between gap-1 mt-1 text-[10px] text-neutral-300">
                    <span className="font-semibold text-neutral-400">
                      {spotlightSeries.year || 2026}
                    </span>
                    {spotlightSeries.episode_current && (
                      <span className="text-[#23ade5] font-extrabold truncate max-w-[100px]">
                        {spotlightSeries.episode_current}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )}

            {/* Spotlight Card 2 (Single Movie Spotlight) */}
            {spotlightSingle && (
              <Link
                href={`/film/${spotlightSingle.slug}`}
                prefetch={false}
                onMouseEnter={() => handlePrefetch(spotlightSingle.slug)}
                onTouchStart={() => handlePrefetch(spotlightSingle.slug)}
                onPointerDown={() => handlePrefetch(spotlightSingle.slug)}
                onClick={() => router.push(`/film/${spotlightSingle.slug}`)}
                className="group/spotlight relative aspect-[2/3] w-[145px] sm:w-[185px] md:w-[210px] lg:w-[230px] shrink-0 rounded-2xl md:rounded-[24px] overflow-hidden bg-[#18181b] border-2 border-amber-400 ring-1 ring-amber-400/30 transition-all duration-300 rotate-1 sm:rotate-2 hover:rotate-0 hover:scale-105 hover:z-30 hover:border-amber-400 hover:ring-amber-400"
                aria-label={spotlightSingle.name}
              >
                <TmdbArtwork
                  film={spotlightSingle}
                  kind="poster"
                  allowTitleLookup
                  className="h-full w-full object-cover transition-transform duration-500 group-hover/spotlight:scale-105"
                  alt={spotlightSingle.name}
                />

                {/* Top Badge: Category Stamp */}
                <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10 pointer-events-none">
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-400 text-black px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase">
                    <Clapperboard size={11} className="stroke-[2.5]" />
                    {activeTab === 'series' ? 'Phim Bộ' : 'Phim Lẻ'}
                  </span>
                  <span className="rounded-md border border-white/20 bg-black/75 backdrop-blur-md px-1.5 py-0.5 text-[8.5px] sm:text-[9.5px] font-black text-white">
                    {spotlightSingle.quality || 'FHD'}
                  </span>
                </div>

                {/* Hover Play Button */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/spotlight:opacity-100 transition-opacity duration-300">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black transition-transform group-hover/spotlight:scale-110">
                    <Play size={20} fill="currentColor" className="ml-0.5" />
                  </div>
                </div>

                {/* Bottom Movie Title and Info */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent p-3 pt-8 flex flex-col justify-end">
                  <h3 className="text-xs sm:text-sm font-black text-white line-clamp-2 leading-snug group-hover/spotlight:text-amber-300 transition-colors">
                    {spotlightSingle.name}
                  </h3>
                  <div className="flex items-center justify-between gap-1 mt-1 text-[10px] text-neutral-300">
                    <span className="font-semibold text-neutral-400">
                      {spotlightSingle.year || 2026}
                    </span>
                    {spotlightSingle.imdb?.vote_average ? (
                      <span className="text-amber-400 font-extrabold flex items-center gap-0.5">
                        <Star size={10} fill="currentColor" />
                        {Number(spotlightSingle.imdb.vote_average).toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-neutral-400 font-semibold">
                        {spotlightSingle.origin_name ? 'Chiếu rạp' : 'Phim lẻ'}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )}
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
                className="text-xs font-bold text-neutral-400 hover:text-white px-2 py-1 rounded bg-white/10"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
