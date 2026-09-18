export default function GenresLoading() {
  return (
    <div className="min-h-screen bg-[#07080b] text-white pt-20 md:pt-24 px-4 sm:px-8 max-w-[1720px] mx-auto pb-16">
      {/* Title Skeleton */}
      <div className="mb-8 space-y-2 animate-pulse">
        <div className="h-8 w-64 rounded-xl bg-white/10" />
        <div className="h-4 w-96 rounded-md bg-white/[0.06]" />
      </div>

      {/* Top 10 Row Skeleton */}
      <div className="mb-12 h-44 sm:h-56 w-full animate-pulse rounded-2xl bg-white/[0.04] border border-white/[0.06]" />

      {/* 6 Universe Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[16/9] rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08]"
          />
        ))}
      </div>
    </div>
  );
}
