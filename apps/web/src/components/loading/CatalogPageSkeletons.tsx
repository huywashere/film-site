import type { CSSProperties } from 'react';
import { FilmCardSkeleton } from '@/components/film/FilmCard';
import { cardFont } from '@/lib/fonts';
import { cn } from '@/lib/utils';

function SkeletonBlock({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded bg-white/[0.07]', className)}
      style={style}
    />
  );
}

export function BrowseFilmsSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Đang tải danh sách phim"
      className={cn(
        cardFont.className,
        'relative min-h-[100dvh] select-none bg-[#0a0b10] pb-24 pt-16 text-white sm:pb-28 sm:pt-20',
      )}
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[1200px] -translate-x-1/2 rounded-full bg-gradient-to-b from-white/[0.025] to-transparent blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1720px] space-y-5 px-3.5 sm:space-y-6 sm:px-6 md:pl-20 md:pr-6 lg:pl-24 lg:pr-10 xl:pl-28 xl:pr-12">
        <div className="flex flex-col justify-between gap-1.5 border-b border-white/[0.08] pb-3 sm:flex-row sm:items-end sm:gap-2 sm:pb-4">
          <SkeletonBlock className="h-7 w-44 rounded-lg sm:h-8" />
          <SkeletonBlock className="h-4 w-60 max-w-full rounded sm:w-72" />
        </div>

        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-1.5 overflow-hidden py-0.5">
            {[64, 76, 70, 60, 78, 92, 80].map((width, index) => (
              <SkeletonBlock
                key={index}
                className="h-8 shrink-0 rounded-xl border border-white/[0.08]"
                style={{ width }}
              />
            ))}
          </div>
          <SkeletonBlock className="h-9 w-full shrink-0 rounded-xl border border-white/10 md:w-72" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {[88, 94, 76, 88, 100, 92].map((width, index) => (
              <SkeletonBlock
                key={index}
                className="h-8 shrink-0 rounded-xl border border-white/10"
                style={{ width }}
              />
            ))}
          </div>
          <SkeletonBlock className="h-3 w-20 rounded" />
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-1.5 sm:gap-3.5 lg:gap-4 gap-y-3.5 sm:gap-y-6 pt-2">
          {Array.from({ length: 14 }).map((_, index) => (
            <FilmCardSkeleton key={index} />
          ))}
        </div>

        <div className="mt-12 flex items-center justify-center gap-2">
          <SkeletonBlock className="h-9 w-20 rounded-lg border border-white/10" />
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-9 w-9 rounded-lg border border-white/10" />
            ))}
          </div>
          <SkeletonBlock className="h-9 w-20 rounded-lg border border-white/10" />
        </div>
      </div>
    </main>
  );
}

export function CatalogCardGrid({
  count = 21,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-4 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-y-3.5 sm:gap-y-8',
        className,
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <FilmCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function FilmTypeSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải danh mục phim"
      className={cn(
        cardFont.className,
        'min-h-screen w-full bg-[#0a0b10] pb-20 pl-4 pr-4 pt-20 text-white sm:pt-24 md:pr-10 lg:pl-24 select-none',
      )}
    >
      <div className="w-full">
        {/* Page Header — Centered */}
        <div className="mx-auto mb-10 flex max-w-3xl flex-col items-center justify-center gap-2.5 border-b border-white/10 pb-6 text-center">
          <SkeletonBlock className="h-9 w-44 rounded-lg sm:h-10 sm:w-56" />
          <SkeletonBlock className="h-4 w-64 max-w-full rounded sm:w-80" />
          <SkeletonBlock className="mt-1 h-7 w-28 rounded-full border border-white/10" />
        </div>

        {/* 21 Cards Standard 7-Cols Grid */}
        <CatalogCardGrid count={21} />

        {/* Centered Pagination Skeletons */}
        <div className="mt-12 flex items-center justify-center gap-2">
          <SkeletonBlock className="h-9 w-20 rounded-lg border border-white/10" />
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-9 w-9 rounded-lg border border-white/10" />
            ))}
          </div>
          <SkeletonBlock className="h-9 w-20 rounded-lg border border-white/10" />
        </div>
      </div>
    </div>
  );
}

export function CenteredCatalogSkeleton({
  eyebrow = false,
  columns = 'seven',
  count = 21,
}: {
  eyebrow?: boolean;
  columns?: 'six' | 'seven';
  count?: number;
}) {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải danh sách phim"
      className={cn(
        cardFont.className,
        'min-h-screen w-full bg-[#0a0b10] pb-20 pl-4 pr-4 pt-20 text-white sm:pt-24 md:pr-10 lg:pl-24 select-none',
      )}
    >
      <div className="w-full">
        <div className="mx-auto mb-10 flex max-w-3xl flex-col items-center justify-center gap-2.5 border-b border-white/10 pb-6 text-center">
          {eyebrow && <SkeletonBlock className="h-3.5 w-36 rounded" />}
          <SkeletonBlock className="h-9 w-60 max-w-full rounded-lg md:h-10 md:w-72" />
          <SkeletonBlock className="h-4 w-80 max-w-full rounded" />
          <SkeletonBlock className="mt-1 h-7 w-28 rounded-full border border-white/10" />
        </div>

        <div
          className={cn(
            'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 gap-y-6 sm:gap-y-8',
            columns === 'seven' ? 'xl:grid-cols-6 2xl:grid-cols-7' : 'xl:grid-cols-6',
          )}
        >
          {Array.from({ length: count }).map((_, index) => (
            <FilmCardSkeleton key={index} />
          ))}
        </div>

        <div className="mt-12 flex items-center justify-center gap-2">
          <SkeletonBlock className="h-9 w-20 rounded-lg border border-white/10" />
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-9 w-9 rounded-lg border border-white/10" />
            ))}
          </div>
          <SkeletonBlock className="h-9 w-20 rounded-lg border border-white/10" />
        </div>
      </div>
    </div>
  );
}

export function CinematicTopicSkeleton({ background = '#0a0b10' }: { background?: string }) {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải chủ đề phim"
      className={cn(cardFont.className, '-mt-20 min-h-[100dvh] w-full pb-20 sm:-mt-24 select-none')}
      style={{ backgroundColor: background }}
    >
      {/* ── 1. NETFLIX-GRADE HERO BANNER SKELETON ── */}
      <section className="relative h-[68svh] min-h-[500px] max-h-[620px] w-full overflow-hidden bg-[#141414] sm:h-[96vh] sm:min-h-[760px] sm:max-h-[1080px] lg:h-[100vh] lg:min-h-[840px]">
        {/* Subtle Ambient Pulse */}
        <div className="absolute inset-0 animate-pulse bg-white/[0.02]" />

        {/* Cinematic Vignettes */}
        <div
          className="hidden sm:block absolute inset-0 z-10 pointer-events-none"
          style={{
            background: `
              linear-gradient(to right, rgba(16,16,16,0.96) 0%, rgba(16,16,16,0.72) 36%, rgba(16,16,16,0.15) 68%, transparent 100%),
              linear-gradient(to top, #141414 0%, rgba(20,20,20,0.85) 28%, transparent 55%),
              linear-gradient(to bottom, rgba(16,16,16,0.65) 0%, transparent 25%)
            `,
          }}
        />
        <div
          className="block sm:hidden absolute inset-0 z-10 pointer-events-none"
          style={{
            background: `
              linear-gradient(to top, #141414 0%, rgba(20,20,20,0.92) 36%, rgba(20,20,20,0.4) 65%, transparent 100%),
              linear-gradient(to bottom, rgba(16,16,16,0.6) 0%, transparent 25%)
            `,
          }}
        />

        {/* Hero Content Overlay */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end px-4 pb-14 sm:justify-center sm:px-14 sm:pb-20 md:px-20 lg:px-24 lg:pb-0">
          <div className="max-w-2xl space-y-2.5 sm:space-y-4 lg:space-y-5 pt-0 sm:pt-8">
            {/* Title / Logo block */}
            <SkeletonBlock className="h-12 w-44 rounded-xl sm:h-20 sm:w-80 md:h-24 md:w-96" />

            {/* Subtitle */}
            <SkeletonBlock className="h-3.5 w-48 sm:w-64 rounded" />

            {/* Metadata Pills */}
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-5 w-12 rounded" />
              <SkeletonBlock className="h-5 w-24 rounded" />
              <SkeletonBlock className="h-5 w-16 rounded" />
              <SkeletonBlock className="h-5 w-14 rounded" />
            </div>

            {/* Genre Tags */}
            <div className="flex gap-1.5">
              <SkeletonBlock className="h-6 w-16 rounded border border-white/10" />
              <SkeletonBlock className="h-6 w-20 rounded border border-white/10" />
              <SkeletonBlock className="h-6 w-16 rounded border border-white/10" />
            </div>

            {/* Description */}
            <div className="hidden sm:block space-y-1.5 pt-1">
              <SkeletonBlock className="h-3.5 w-full max-w-lg rounded" />
              <SkeletonBlock className="h-3.5 w-4/5 max-w-md rounded" />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 pt-1 sm:pt-2">
              <SkeletonBlock className="h-10 sm:h-12 w-28 sm:w-36 rounded-md sm:rounded-xl bg-white/20" />
              <SkeletonBlock className="h-10 sm:h-12 w-24 sm:w-32 rounded-md sm:rounded-xl border border-white/10" />
            </div>
          </div>
        </div>

        {/* Pagination Dots */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-3 sm:bottom-8 lg:left-auto lg:right-14 lg:translate-x-0 lg:bottom-44 z-30 flex items-center gap-1.5">
          <SkeletonBlock className="h-1.5 w-6 rounded-full bg-white/40" />
          <SkeletonBlock className="h-1.5 w-1.5 rounded-full" />
          <SkeletonBlock className="h-1.5 w-1.5 rounded-full" />
          <SkeletonBlock className="h-1.5 w-1.5 rounded-full" />
        </div>
      </section>

      {/* ── 2. CURATED CATEGORY ROWS (OVERLAPPING HERO BANNER) ── */}
      <div className="relative z-20 pl-4 sm:pl-12 md:pl-20 lg:pl-24 pr-2 sm:pr-4 md:pr-6 pb-16 space-y-6 sm:space-y-8 mt-3 sm:-mt-24 md:-mt-36 lg:-mt-48">
        {/* Curated Swiper Rows */}
        {Array.from({ length: 3 }).map((_, rowIndex) => (
          <section key={rowIndex} className="space-y-3" aria-hidden="true">
            <SkeletonBlock className="h-5 sm:h-6 w-52 sm:w-72 rounded-lg mb-3 px-1" />
            <div className="flex gap-2 sm:gap-3 lg:gap-4 overflow-hidden py-1">
              {Array.from({ length: 8 }).map((__, cardIndex) => (
                <div
                  key={cardIndex}
                  className="w-[22vw] sm:w-[17vw] md:w-[15vw] lg:w-[13vw] xl:w-[11.5vw] shrink-0"
                >
                  <FilmCardSkeleton />
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Full Catalog Header */}
        <div className="mt-14 mb-8 pt-8 border-t border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div className="space-y-1.5">
            <SkeletonBlock className="h-6 sm:h-7 w-64 sm:w-80 rounded-lg" />
            <SkeletonBlock className="h-3.5 w-72 sm:w-96 rounded" />
          </div>
          <SkeletonBlock className="h-7 w-24 rounded-full border border-white/10 self-start md:self-auto" />
        </div>

        {/* Full Catalog Grid (Standard 7-Cols Desktop) */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-7 pt-2">
          {Array.from({ length: 14 }).map((_, index) => (
            <FilmCardSkeleton key={index} />
          ))}
        </div>

        {/* Centered Pagination */}
        <div className="mt-12 flex items-center justify-center gap-2">
          <SkeletonBlock className="h-9 w-20 rounded-lg border border-white/10" />
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-9 w-9 rounded-lg border border-white/10" />
            ))}
          </div>
          <SkeletonBlock className="h-9 w-20 rounded-lg border border-white/10" />
        </div>
      </div>
    </div>
  );
}

export function UniversePageSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải vũ trụ điện ảnh"
      className={cn(cardFont.className, 'relative min-h-[100dvh] bg-[#07080c] text-white select-none')}
    >
      {/* ── 1. UNIVERSE HERO BANNER SKELETON ── */}
      <section className="relative h-[100dvh] min-h-[640px] max-h-[1020px] w-full overflow-hidden bg-[#07080c]">
        <div className="absolute inset-0 animate-pulse bg-white/[0.02]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07080c] via-[#07080c]/80 via-40% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07080c] via-[#07080c]/60 via-25% to-transparent" />

        <div className="relative z-10 mx-auto flex h-full max-w-[1760px] flex-col justify-end px-4 pb-20 pt-20 sm:px-8 sm:pb-12 lg:px-14 lg:pb-14">
          <div className="flex flex-col 2xl:flex-row 2xl:items-end justify-between gap-8 2xl:gap-12">
            {/* Left Column: Title & Info */}
            <div className="max-w-xl space-y-4">
              <SkeletonBlock className="h-6 w-28 rounded-md border border-white/10" />
              <SkeletonBlock className="h-16 w-64 rounded-xl sm:h-24 sm:w-80 md:h-28 md:w-96" />
              <SkeletonBlock className="h-4 w-60 rounded" />

              <div className="flex items-center gap-2">
                <SkeletonBlock className="h-5 w-12 rounded" />
                <SkeletonBlock className="h-5 w-14 rounded" />
                <SkeletonBlock className="h-5 w-16 rounded" />
                <SkeletonBlock className="h-5 w-20 rounded" />
              </div>

              <div className="space-y-1.5 pt-1">
                <SkeletonBlock className="h-3.5 w-full rounded" />
                <SkeletonBlock className="h-3.5 w-4/5 rounded" />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 sm:flex sm:items-center sm:gap-3">
                <SkeletonBlock className="col-span-2 h-11 w-full rounded-xl sm:w-32 bg-white/20" />
                <SkeletonBlock className="h-11 w-full rounded-xl border border-white/10 sm:w-28" />
                <SkeletonBlock className="h-11 w-full rounded-xl border border-white/10 sm:w-28" />
              </div>
            </div>

            {/* Right Column: Carousel Thumbnails */}
            <div className="hidden sm:flex items-center gap-2.5 overflow-hidden py-2.5 shrink-0">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-video w-32 sm:w-40 shrink-0 rounded-xl border border-white/10 overflow-hidden bg-white/[0.04]"
                >
                  <div className="h-full w-full animate-pulse bg-white/[0.05]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. UNIVERSE CONTENT SKELETON BELOW HERO ── */}
      <div className="relative z-20 mx-auto max-w-[1760px] px-4 pt-6 sm:px-8 sm:pt-10 lg:px-14 space-y-8 sm:space-y-12 pb-20">
        {/* Sub-tabs / Nav pills */}
        <div className="flex items-center gap-2 border-b border-white/[0.08] pb-4">
          <SkeletonBlock className="h-10 w-28 rounded-xl bg-white/15" />
          <SkeletonBlock className="h-10 w-36 rounded-xl border border-white/10" />
        </div>

        {/* Spotlight Rails (Landscape format) */}
        {Array.from({ length: 2 }).map((_, railIndex) => (
          <section key={railIndex} className="space-y-3" aria-hidden="true">
            <SkeletonBlock className="h-6 w-60 sm:w-80 rounded-lg mb-3" />
            <div className="flex gap-3 overflow-hidden py-1">
              {Array.from({ length: 5 }).map((__, cardIndex) => (
                <div
                  key={cardIndex}
                  className="aspect-video w-[65vw] sm:w-[42vw] md:w-[30vw] lg:w-[22vw] xl:w-[18vw] shrink-0 rounded-xl border border-white/[0.08] bg-[#12141c] overflow-hidden"
                >
                  <div className="h-full w-full animate-pulse bg-gradient-to-tr from-white/[0.02] via-white/[0.05] to-transparent" />
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Full Universe Catalog Section */}
        <section className="pt-8 sm:pt-12 border-t border-white/[0.08] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <SkeletonBlock className="h-7 w-56 rounded-lg" />
            <div className="flex items-center gap-2 overflow-hidden">
              {[70, 80, 75, 90, 85].map((w, i) => (
                <SkeletonBlock
                  key={i}
                  className="h-8 rounded-xl border border-white/10 shrink-0"
                  style={{ width: w }}
                />
              ))}
            </div>
          </div>

          {/* Standard 7-Cols Desktop Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-y-6 sm:gap-y-8">
            {Array.from({ length: 14 }).map((_, index) => (
              <FilmCardSkeleton key={index} />
            ))}
          </div>

          {/* Centered Pagination */}
          <div className="mt-12 flex items-center justify-center gap-2">
            <SkeletonBlock className="h-9 w-20 rounded-lg border border-white/10" />
            <div className="flex gap-1.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-9 w-9 rounded-lg border border-white/10" />
              ))}
            </div>
            <SkeletonBlock className="h-9 w-20 rounded-lg border border-white/10" />
          </div>
        </section>
      </div>
    </div>
  );
}

export function TopicsIndexSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Đang tải các chủ đề phim"
      className={cn(
        cardFont.className,
        'relative min-h-[100dvh] bg-[#0a0b10] pb-24 pt-16 text-white sm:pb-28 sm:pt-20 select-none',
      )}
    >
      <div className="relative z-10 mx-auto w-full max-w-[1720px] space-y-8 sm:space-y-10 px-3.5 sm:px-6 md:pl-20 md:pr-6 lg:pl-24 lg:pr-10 xl:pl-28 xl:pr-12">
        <section className="space-y-4" aria-hidden="true">
          <SkeletonBlock className="h-8 w-28 rounded-lg sm:h-9 sm:w-36" />

          {/* 10 Cinematic Hub Cards Grid (2 cols mobile, 2 tablet, 4 desktop) */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                key={index}
                className="relative aspect-[4/3] sm:aspect-[16/10] min-h-[170px] sm:min-h-[210px] overflow-hidden rounded-xl sm:rounded-2xl border border-white/[0.10] bg-[#0e1017] shadow-[0_16px_42px_rgba(0,0,0,0.20)]"
              >
                <div className="h-full w-full animate-pulse bg-gradient-to-tr from-white/[0.02] via-white/[0.05] to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 sm:p-[18px]">
                  <SkeletonBlock className="h-4 w-3/5 rounded sm:h-5" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export function SongNguSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Đang tải phim song ngữ"
      className={cn('min-h-screen bg-[#101012] text-white pt-20 pb-28 select-none', cardFont.className)}
    >
      {/* Hero Banner Section */}
      <div className="relative overflow-hidden border-b border-cyan-500/20 bg-gradient-to-b from-cyan-950/40 via-violet-950/20 to-[#101012] py-12 px-4 sm:px-8">
        <div className="mx-auto max-w-[1300px] relative z-10 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <SkeletonBlock className="h-6 w-36 rounded-full bg-cyan-500/20" />
            <SkeletonBlock className="h-6 w-44 rounded-full border border-white/10" />
          </div>
          <SkeletonBlock className="h-8 sm:h-12 w-3/4 max-w-2xl rounded-xl" />
          <SkeletonBlock className="h-4 w-full max-w-xl rounded" />
          <div className="mt-6 flex flex-wrap items-center gap-3 pt-2">
            <SkeletonBlock className="h-8 w-48 rounded-xl border border-white/[0.08]" />
            <SkeletonBlock className="h-8 w-36 rounded-xl border border-white/[0.08]" />
            <SkeletonBlock className="h-8 w-44 rounded-xl border border-white/[0.08]" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="mx-auto max-w-[1300px] px-4 sm:px-8 mt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {[140, 180, 160, 150].map((w, i) => (
              <SkeletonBlock key={i} className="h-9 rounded-xl border border-white/[0.08] shrink-0" style={{ width: w }} />
            ))}
          </div>
          <SkeletonBlock className="h-9 w-full md:w-72 rounded-xl border border-white/10 shrink-0" />
        </div>

        {/* Film Grid 7-Cols Desktop */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-3.5 gap-y-6">
          {Array.from({ length: 14 }).map((_, i) => (
            <FilmCardSkeleton key={i} />
          ))}
        </div>

        {/* Pagination */}
        <div className="mt-12 flex justify-center">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-9 w-20 rounded-lg border border-white/10" />
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonBlock key={i} className="h-9 w-9 rounded-lg border border-white/10" />
              ))}
            </div>
            <SkeletonBlock className="h-9 w-20 rounded-lg border border-white/10" />
          </div>
        </div>
      </div>
    </main>
  );
}

