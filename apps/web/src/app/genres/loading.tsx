export default function GenresLoading() {
  return (
    <div className="min-h-screen bg-[#07080b] text-white pt-20 md:pt-24 px-4 sm:px-8 max-w-[1720px] mx-auto pb-16">
      {/* Title Skeleton */}
      <div className="mb-8 space-y-2 animate-pulse">
        <div className="h-8 w-64 rounded-xl bg-white/10" />
        <div className="h-4 w-96 rounded-md bg-white/[0.06]" />
      </div>

      {/* Topic Cards Grid Skeleton */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/3] min-h-[170px] rounded-xl border border-white/[0.08] bg-white/[0.04] sm:aspect-[16/10] sm:min-h-[210px] sm:rounded-2xl"
          />
        ))}
      </div>
    </div>
  );
}
