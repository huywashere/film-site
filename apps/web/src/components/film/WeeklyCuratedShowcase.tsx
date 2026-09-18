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
  X,
} from 'lucide-react';
import { FilmItem } from '@/components/film/FilmCard';
import { TmdbArtwork } from '@/components/film/TmdbArtwork';
import { cardFont } from '@/lib/fonts';
import { cn } from '@/lib/utils';
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

  // Selected films to display in the multi-card small grid (8 cards)
  const displayedFilms = useMemo(() => {
    if (activeTab === 'series') {
      return cleanSeries.slice(0, 8);
    }
    if (activeTab === 'single') {
      return cleanSingles.slice(0, 8);
    }
    // Default 'all': interleave top series & single movies
    const combined: FilmItem[] = [];
    const maxLen = Math.max(cleanSeries.length, cleanSingles.length);
    for (let i = 0; i < maxLen; i++) {
      if (cleanSeries[i]) combined.push(cleanSeries[i]);
      if (cleanSingles[i]) combined.push(cleanSingles[i]);
      if (combined.length >= 8) break;
    }
    return combined.slice(0, 8);
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
        <div className="relative overflow-hidden rounded-3xl sm:rounded-[36px] border border-white/[0.08] bg-[#141414] p-6 sm:p-10 min-h-[420px] animate-pulse">
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

  if (displayedFilms.length === 0) {
    return null;
  }

  return (
    <section
      data-cinematic-section="true"
      className={`${cardFont.className} relative my-8 sm:my-12 md:my-16 w-full select-none`}
    >
      {/* ── Main Billboard Container ── */}
      <div className="relative overflow-hidden rounded-3xl sm:rounded-[36px] border border-white/[0.08] bg-gradient-to-br from-[#18181b] via-[#141414] to-black p-6 sm:p-8 md:p-10 lg:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
        {/* Subtle decorative glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-purple-600/10 blur-[100px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-cyan-600/10 blur-[100px]"
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Headline, Filter Tabs & Call To Action */}
          <div className="lg:col-span-4 xl:col-span-4 flex flex-col justify-center space-y-4 sm:space-y-5">
            {/* Headline */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-[1.15]">
                Phim Bộ & Phim Lẻ Tuần Này
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed text-neutral-300/90 max-w-md">
                Tuyển chọn những series đặc sắc và phim điện ảnh bom tấn ăn khách nhất được cập nhật trong tuần trên FlexPhim.
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
                    ? 'bg-white text-black shadow'
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
                    ? 'bg-[#23ade5] text-black shadow'
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
                    ? 'bg-amber-400 text-black shadow'
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
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-neutral-300 backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/15 hover:text-white active:scale-95"
              >
                <Info size={16} />
              </button>
            </div>
          </div>

          {/* Right Column: Multi-Card Small Movie Cards Grid */}
          <div className="lg:col-span-8 xl:col-span-8 w-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5">
              {displayedFilms.map((film, idx) => {
                const rating = Number(
                  film.imdb?.vote_average ||
                    film.imdb?.rating ||
                    film.imdb_rating ||
                    film.vote_average ||
                    film.tmdb?.vote_average ||
                    0,
                );

                const isSeries = film.type === 'series' || film.type === 'tv';

                return (
                  <Link
                    key={`small-card-${film.slug || idx}-${idx}`}
                    href={`/film/${film.slug}`}
                    prefetch={false}
                    onMouseEnter={() => handlePrefetch(film.slug)}
                    onTouchStart={() => handlePrefetch(film.slug)}
                    onPointerDown={() => handlePrefetch(film.slug)}
                    onClick={() => router.push(`/film/${film.slug}`)}
                    className="group/smallcard relative aspect-[2/3] w-full rounded-xl overflow-hidden border border-white/10 bg-[#19191e] shadow-md transition-all duration-300 hover:scale-[1.04] hover:z-20 hover:border-cyan-400/80 hover:shadow-[0_8px_24px_rgba(35,173,229,0.3)]"
                    title={film.name}
                    aria-label={film.name}
                  >
                    <TmdbArtwork
                      film={film}
                      kind="poster"
                      allowTitleLookup
                      className="h-full w-full object-cover transition-transform duration-500 group-hover/smallcard:scale-105"
                      alt={film.name}
                    />

                    {/* Top Badges */}
                    <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10 pointer-events-none">
                      <span
                        className={cn(
                          'rounded-md px-1.5 py-0.5 text-[8.5px] font-black uppercase shadow',
                          isSeries
                            ? 'bg-[#23ade5] text-black'
                            : 'bg-amber-400 text-black',
                        )}
                      >
                        {isSeries ? 'Bộ' : 'Lẻ'}
                      </span>
                      {film.episode_current ? (
                        <span className="rounded-md border border-white/20 bg-black/80 backdrop-blur-md px-1.5 py-0.5 text-[8px] font-bold text-cyan-300 max-w-[80px] truncate">
                          {film.episode_current}
                        </span>
                      ) : (
                        <span className="rounded-md border border-white/20 bg-black/80 backdrop-blur-md px-1.5 py-0.5 text-[8px] font-bold text-white">
                          {film.quality || 'FHD'}
                        </span>
                      )}
                    </div>

                    {/* Hover Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/smallcard:opacity-100 transition-opacity duration-200 pointer-events-none">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform group-hover/smallcard:scale-110">
                        <Play size={16} fill="currentColor" className="ml-0.5" />
                      </div>
                    </div>

                    {/* Bottom Info Overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2.5 pt-7 flex flex-col justify-end pointer-events-none">
                      <p className="text-[11px] sm:text-xs font-black text-white line-clamp-1 leading-tight group-hover/smallcard:text-cyan-300 transition-colors">
                        {film.name}
                      </p>
                      <div className="flex items-center justify-between mt-1 text-[9px] text-neutral-300">
                        <span className="font-semibold text-neutral-400">
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
        </div>

        {/* ── Expandable Info Card Popup ── */}
        {showInfoModal && (
          <div className="relative z-30 mt-6 border-t border-white/10 bg-black/80 p-4 sm:p-5 rounded-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start justify-between gap-4 max-w-4xl mx-auto">
              <div className="space-y-1 text-xs">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-400" />
                  <span>Về Tuyển Tập Phim Bộ & Phim Lẻ Tuần Này</span>
                </p>
                <p className="text-neutral-400 leading-relaxed">
                  Bảng tuyển chọn tổng hợp tự động các tác phẩm đạt lượt xem cao,
                  điểm đánh giá IMDb xuất sắc và chất lượng hình ảnh sắc nét nhất
                  trong tuần. Bạn có thể nhấn vào bất kỳ thẻ phim nào để xem chi
                  tiết và bắt đầu xem phim ngay.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
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
