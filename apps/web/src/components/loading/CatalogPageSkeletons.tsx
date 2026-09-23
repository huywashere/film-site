import type { CSSProperties } from 'react';
import { FilmCardSkeleton } from '@/components/film/FilmCard';
import { cardFont } from '@/lib/fonts';
import { cn } from '@/lib/utils';

function SkeletonBlock({ className, style }: { className: string; style?: CSSProperties }) {
  return <div aria-hidden="true" className={cn('bg-white/[0.065]', className)} style={style} />;
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
        <div className="flex animate-pulse flex-col justify-between gap-1.5 border-b border-white/[0.08] pb-3 sm:flex-row sm:items-end sm:gap-2 sm:pb-4">
          <SkeletonBlock className="h-7 w-44 rounded-lg sm:h-8" />
          <SkeletonBlock className="h-4 w-60 max-w-full rounded sm:w-72" />
        </div>

        <div className="flex animate-pulse flex-col justify-between gap-3 md:flex-row md:items-center">
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

        <div className="flex animate-pulse flex-wrap items-center justify-between gap-2.5 pt-1">
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

        <CatalogCardGrid count={14} className="pt-2" />
      </div>
    </main>
  );
}

export function CatalogCardGrid({ count = 21, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3.5 md:grid-cols-4 lg:grid-cols-5 lg:gap-4 xl:grid-cols-6 2xl:grid-cols-7',
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
        'min-h-screen w-full bg-background pb-20 pl-4 pr-4 pt-20 text-foreground sm:pt-24 md:pr-10 lg:pl-24',
      )}
    >
      <div className="w-full">
        <div className="mx-auto mb-10 flex max-w-3xl animate-pulse flex-col items-center justify-center gap-2.5 border-b border-white/10 pb-6 text-center">
          <SkeletonBlock className="h-9 w-44 rounded-lg sm:h-10 sm:w-56" />
          <SkeletonBlock className="h-4 w-64 max-w-full rounded sm:w-80" />
          <SkeletonBlock className="mt-1 h-7 w-28 rounded-full border border-white/10" />
        </div>

        <CatalogCardGrid count={21} className="gap-3 gap-y-6 sm:gap-y-8" />

        <div className="mt-12 flex animate-pulse items-center justify-center gap-2">
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
        'min-h-screen w-full bg-background pb-20 pl-4 pr-4 pt-20 text-foreground sm:pt-24 md:pr-10 lg:pl-24',
      )}
    >
      <div className="w-full">
        <div className="mx-auto mb-10 flex max-w-3xl animate-pulse flex-col items-center justify-center gap-2.5 border-b border-white/10 pb-6 text-center">
          {eyebrow && <SkeletonBlock className="h-3.5 w-36 rounded" />}
          <SkeletonBlock className="h-9 w-60 max-w-full rounded-lg md:h-10 md:w-72" />
          <SkeletonBlock className="h-4 w-80 max-w-full rounded" />
          <SkeletonBlock className="mt-1 h-7 w-28 rounded-full border border-white/10" />
        </div>

        <div
          className={cn(
            'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5',
            columns === 'seven' ? 'xl:grid-cols-6 2xl:grid-cols-7' : 'xl:grid-cols-6',
          )}
        >
          {Array.from({ length: count }).map((_, index) => (
            <FilmCardSkeleton key={index} />
          ))}
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
      className={cn(cardFont.className, '-mt-20 min-h-[100dvh] w-full pb-20 sm:-mt-24')}
      style={{ backgroundColor: background }}
    >
      <section className="relative h-[68svh] min-h-[500px] max-h-[620px] w-full overflow-hidden sm:h-[96vh] sm:min-h-[760px] sm:max-h-[1080px] lg:h-[100vh] lg:min-h-[840px]">
        <div className="absolute inset-0 animate-pulse bg-white/[0.035]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0b10] via-[#0a0b10]/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b10] via-[#0a0b10]/55 via-35% to-transparent" />
        <div className="absolute inset-x-4 bottom-14 z-10 max-w-xl space-y-3 animate-pulse sm:inset-x-auto sm:left-14 sm:bottom-1/4 sm:w-[520px] md:left-20 lg:left-24">
          <SkeletonBlock className="h-16 w-56 max-w-full rounded-lg sm:h-24 sm:w-80" />
          <SkeletonBlock className="h-3.5 w-48 rounded" />
          <div className="flex gap-2">
            <SkeletonBlock className="h-6 w-16 rounded-full border border-white/10" />
            <SkeletonBlock className="h-6 w-24 rounded-full border border-white/10" />
            <SkeletonBlock className="h-6 w-16 rounded-full border border-white/10" />
          </div>
          <SkeletonBlock className="h-3.5 w-full rounded" />
          <SkeletonBlock className="h-3.5 w-4/5 rounded" />
          <div className="flex gap-2 pt-2">
            <SkeletonBlock className="h-11 w-28 rounded-xl" />
            <SkeletonBlock className="h-11 w-28 rounded-xl border border-white/10" />
          </div>
        </div>
      </section>

      <div className="relative z-20 -mt-6 space-y-6 px-4 pb-16 sm:-mt-24 sm:pl-12 sm:pr-4 md:-mt-32 md:pl-20 md:pr-6 lg:-mt-40 lg:pl-24">
        {Array.from({ length: 2 }).map((_, row) => (
          <section key={row} className="space-y-3" aria-hidden="true">
            <SkeletonBlock className="h-6 w-56 max-w-[70vw] animate-pulse rounded" />
            <div className="grid grid-cols-4 gap-2 overflow-hidden sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7">
              {Array.from({ length: 8 }).map((__, index) => (
                <FilmCardSkeleton key={index} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function UniversePageSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải vũ trụ điện ảnh"
      className={cn(cardFont.className, 'relative min-h-[100dvh] bg-[#07080c] text-white')}
    >
      <section className="relative h-[100dvh] min-h-[640px] max-h-[1020px] w-full overflow-hidden">
        <div className="absolute inset-0 animate-pulse bg-white/[0.035]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07080c] via-[#07080c]/75 via-40% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07080c] via-[#07080c]/50 via-25% to-transparent" />
        <div className="relative z-10 mx-auto flex h-full max-w-[1760px] flex-col justify-end px-4 pb-20 pt-20 sm:px-8 sm:pb-10 lg:px-14 lg:pb-12">
          <div className="max-w-xl animate-pulse space-y-4">
            <SkeletonBlock className="h-10 w-24 rounded-lg" />
            <SkeletonBlock className="h-20 w-72 max-w-full rounded-lg sm:h-28 sm:w-[420px]" />
            <SkeletonBlock className="h-4 w-64 rounded" />
            <div className="flex gap-2">
              <SkeletonBlock className="h-7 w-16 rounded-full border border-white/10" />
              <SkeletonBlock className="h-7 w-24 rounded-full border border-white/10" />
              <SkeletonBlock className="h-7 w-20 rounded-full border border-white/10" />
            </div>
            <SkeletonBlock className="h-4 w-full rounded" />
            <SkeletonBlock className="h-4 w-4/5 rounded" />
            <div className="grid grid-cols-2 gap-2 pt-2 sm:flex">
              <SkeletonBlock className="col-span-2 h-11 w-full rounded-xl sm:w-32" />
              <SkeletonBlock className="h-11 w-full rounded-xl border border-white/10 sm:w-28" />
              <SkeletonBlock className="h-11 w-full rounded-xl border border-white/10 sm:w-28" />
            </div>
          </div>
        </div>
      </section>
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
        'relative min-h-[100dvh] bg-[#0a0b10] pb-24 pt-16 text-white sm:pb-28 sm:pt-20',
      )}
    >
      <div className="relative z-10 mx-auto w-full max-w-[1720px] space-y-8 px-3.5 sm:space-y-10 sm:px-6 md:pl-20 md:pr-6 lg:pl-24 lg:pr-10 xl:pl-28 xl:pr-12">
        <div className="flex animate-pulse flex-col justify-between gap-1.5 border-b border-white/[0.08] pb-3 sm:flex-row sm:items-end sm:gap-2 sm:pb-4">
          <SkeletonBlock className="h-7 w-24 rounded-lg sm:h-8 sm:w-28" />
          <SkeletonBlock className="h-4 w-64 max-w-full rounded sm:w-72" />
        </div>

        <section className="space-y-4" aria-hidden="true">
          <div className="flex animate-pulse items-center gap-2.5">
            <SkeletonBlock className="h-5 w-1 rounded-full bg-red-600/60" />
            <SkeletonBlock className="h-6 w-20 rounded-md" />
            <SkeletonBlock className="h-6 w-20 rounded-full border border-white/[0.08]" />
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                key={index}
                className="relative aspect-[4/3] min-h-[170px] animate-pulse overflow-hidden rounded-xl border border-white/[0.10] bg-[#0e1017] sm:aspect-[16/10] sm:min-h-[210px] sm:rounded-2xl"
              >
                <div className="absolute inset-x-0 bottom-0 space-y-2 p-3 sm:p-[18px]">
                  <SkeletonBlock className="h-2.5 w-2/3 rounded" />
                  <SkeletonBlock className="h-4 w-1/2 rounded sm:h-5" />
                  <SkeletonBlock className="h-3 w-4/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
