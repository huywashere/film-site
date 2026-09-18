import { FilmCardSkeleton } from "@/components/film/FilmCard";

export default function GenrePageLoading() {
  return (
    <div className="min-h-screen bg-[#07080b] text-white pt-20 md:pt-24 px-4 sm:px-8 max-w-[1720px] mx-auto pb-16">
      {/* Title & Description Skeleton */}
      <div className="mb-8 space-y-3 animate-pulse">
        <div className="h-8 w-60 rounded-xl bg-white/10" />
        <div className="h-4 w-80 rounded-md bg-white/[0.06]" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
        {Array.from({ length: 14 }).map((_, i) => (
          <FilmCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
