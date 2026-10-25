export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-[#0b0d12] text-white pt-20 sm:pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Hero Banner Skeleton */}
        <div className="relative h-44 sm:h-56 w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-neutral-900/60 shadow-2xl animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.03] via-white/[0.06] to-transparent" />
        </div>

        {/* Profile Header & Identity Skeleton */}
        <div className="relative -mt-12 sm:-mt-14 px-2 sm:px-4 flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6 pb-2">
          {/* Avatar Ring */}
          <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-neutral-800 border-4 border-[#0b0d12] shadow-xl shrink-0 overflow-hidden animate-pulse">
            <div className="h-full w-full bg-white/[0.05]" />
          </div>

          {/* Name & Badges */}
          <div className="flex-1 space-y-2.5 w-full">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="h-7 w-44 sm:w-56 rounded-lg bg-white/[0.1] animate-pulse" />
              <div className="h-5 w-16 rounded-full bg-white/[0.06] animate-pulse" />
              <div className="h-5 w-24 rounded-full bg-white/[0.06] animate-pulse" />
            </div>
            <div className="h-4 w-32 rounded-md bg-white/[0.05] animate-pulse" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
            <div className="h-9 w-28 rounded-xl bg-white/[0.08] animate-pulse" />
            <div className="h-9 w-24 rounded-xl bg-white/[0.08] animate-pulse" />
          </div>
        </div>

        {/* Tab Navigation Skeleton */}
        <div className="flex items-center gap-2 overflow-x-auto py-2 border-b border-white/[0.08] no-scrollbar">
          {[120, 110, 140, 100, 110].map((width, i) => (
            <div
              key={i}
              className="h-10 rounded-xl bg-white/[0.06] shrink-0 animate-pulse"
              style={{ width }}
            />
          ))}
        </div>

        {/* Content Area Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 sm:h-28 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 flex flex-col justify-between animate-pulse"
            >
              <div className="h-3 w-20 rounded bg-white/[0.06]" />
              <div className="h-7 w-16 rounded bg-white/[0.1]" />
            </div>
          ))}
        </div>

        {/* Main Section Skeleton */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 space-y-4 animate-pulse">
          <div className="h-5 w-40 rounded bg-white/[0.08]" />
          <div className="h-12 w-full rounded-xl bg-white/[0.04]" />
          <div className="h-12 w-full rounded-xl bg-white/[0.04]" />
          <div className="h-12 w-full rounded-xl bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}
