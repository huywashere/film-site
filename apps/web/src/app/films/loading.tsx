import { FilmCardSkeleton } from "@/components/film/FilmCard";

export default function BrowseFilmsLoading() {
  return (
    <div className="min-h-screen bg-[#0a0b10] text-white pt-20 md:pt-24 px-4 sm:px-8 max-w-[1720px] mx-auto">
      {/* Title & Filter Pills Skeleton */}
      <div className="mb-6 space-y-4 animate-pulse">
        <div className="h-8 w-56 rounded-xl bg-white/10" />
        <div className="flex gap-2 overflow-hidden py-1">
          {[80, 96, 88, 76, 92, 108, 84].map((width, i) => (
            <div
              key={i}
              className="h-8 shrink-0 rounded-full bg-white/[0.06] border border-white/[0.06]"
              style={{ width }}
            />
          ))}
        </div>
      </div>

      {/* 7-Cols Standard Film Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
        {Array.from({ length: 14 }).map((_, i) => (
          <FilmCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
