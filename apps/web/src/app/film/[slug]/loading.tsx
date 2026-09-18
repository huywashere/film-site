export default function FilmDetailLoading() {
  return (
    <div className="relative min-h-screen bg-black pb-24 text-white">
      {/* Hero Backdrop Skeleton */}
      <div className="absolute inset-x-0 top-0 h-[65vh] overflow-hidden md:h-[82vh]">
        <div className="h-full w-full animate-pulse bg-gradient-to-br from-[#161b22] via-[#0d1015] to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="container relative z-10 mx-auto px-4 pt-24 md:px-12 sm:pt-28">
        <div className="animate-pulse">
          {/* Breadcrumb skeleton */}
          <div className="mb-5 h-7 w-72 rounded-full bg-white/[0.07]" />

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-8">
              {/* Title skeleton */}
              <div className="h-11 w-4/5 rounded-lg bg-white/10 sm:h-14 md:h-16" />
              {/* Origin title skeleton */}
              <div className="h-4 w-2/5 rounded bg-white/[0.07]" />
              {/* Badges skeleton */}
              <div className="flex gap-2">
                {[72, 104, 56, 88].map((width, index) => (
                  <div key={index} className="h-6 rounded-md bg-white/[0.08]" style={{ width }} />
                ))}
              </div>
              {/* Action buttons skeleton (Xem phim, Trailer, Theo dõi) */}
              <div className="flex gap-3 pt-2">
                <div className="h-11 w-32 rounded-full bg-white/15" />
                <div className="h-11 w-24 rounded-full bg-white/[0.08]" />
                <div className="h-11 w-32 rounded-full bg-white/[0.05]" />
              </div>
            </div>

            {/* Poster card skeleton */}
            <div className="hidden justify-end lg:col-span-4 lg:flex">
              <div className="aspect-[2/3] w-64 rounded-2xl border border-white/[0.08] bg-white/[0.07]" />
            </div>
          </div>

          {/* Quick info boxes */}
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="h-28 rounded-xl border border-white/[0.07] bg-white/[0.035] p-4"
              >
                <div className="h-3 w-20 rounded bg-white/[0.08]" />
                <div className="mt-5 h-4 w-3/4 rounded bg-white/[0.06]" />
                <div className="mt-2 h-3 w-1/2 rounded bg-white/[0.04]" />
              </div>
            ))}
          </div>

          {/* Synopsis and cast/episodes skeleton */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <div className="h-64 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
              <div className="h-5 w-36 rounded bg-white/[0.08]" />
              <div className="mt-5 h-3 w-full rounded bg-white/[0.055]" />
              <div className="mt-3 h-3 w-11/12 rounded bg-white/[0.055]" />
              <div className="mt-3 h-3 w-4/5 rounded bg-white/[0.055]" />
            </div>
            <div className="h-64 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
              <div className="h-5 w-28 rounded bg-white/[0.08]" />
              <div className="mt-5 grid grid-cols-4 gap-2">
                {Array.from({ length: 12 }, (_, index) => (
                  <div key={index} className="h-9 rounded-lg bg-white/[0.055]" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
