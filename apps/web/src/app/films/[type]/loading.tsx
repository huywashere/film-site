import { FilmCardSkeleton } from "@/components/film/FilmCard";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export default function FilmTypeLoading() {
  return (
    <div
      className={cn(
        cardFont.className,
        "min-h-screen w-full bg-background text-foreground pb-20 pl-4 pr-4 pt-20 sm:pt-24 md:pr-10 lg:pl-24",
      )}
    >
      <div className="w-full">
        {/* ── Page Header — Centered Skeleton (Matches Phim Bộ, Phim Lẻ) ── */}
        <div className="flex flex-col items-center justify-center text-center mb-10 pb-6 border-b border-white/10 gap-2.5 max-w-3xl mx-auto animate-pulse">
          {/* Title skeleton */}
          <div className="h-9 sm:h-10 w-44 sm:w-56 rounded-xl bg-white/10" />
          {/* Subtitle skeleton */}
          <div className="h-4 w-64 sm:w-80 rounded-md bg-white/[0.06]" />
          {/* Page badge skeleton */}
          <div className="mt-1 h-7 w-28 rounded-full bg-white/5 border border-white/10" />
        </div>

        {/* ── 7-Cols Standard Film Grid Skeleton (21 cards) ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-y-6 sm:gap-y-8">
          {Array.from({ length: 21 }).map((_, i) => (
            <FilmCardSkeleton key={i} />
          ))}
        </div>

        {/* ── Pagination Skeleton ── */}
        <div className="mt-12 flex items-center justify-center gap-2 animate-pulse">
          <div className="h-9 w-20 rounded-lg bg-white/5 border border-white/10" />
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-9 w-9 rounded-lg bg-white/5 border border-white/10"
              />
            ))}
          </div>
          <div className="h-9 w-20 rounded-lg bg-white/5 border border-white/10" />
        </div>
      </div>
    </div>
  );
}
