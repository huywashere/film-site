export default function FilmDetailLoading() {
  return (
    <div className="relative min-h-screen select-none overflow-hidden bg-[#0d0f12] pb-24 text-white">
      {/* ── Giant Backdrop Banner Skeleton (Plex Style Left-to-Right Blended Layout) ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[86vh] min-h-[720px] w-full select-none overflow-hidden md:h-[105vh] md:max-h-[1040px]">
        <div className="h-full w-full animate-pulse bg-gradient-to-br from-[#161a22] via-[#0e1117] to-[#0d0f12] opacity-50" />
        <div className="absolute inset-0 bg-[#0d0f12]/60" />
        <div className="absolute inset-0 w-full bg-gradient-to-r from-[#0d0f12] via-[#0d0f12]/85 to-[#0d0f12]/20 md:w-[72%]" />
        <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-[#0d0f12] via-[#0d0f12]/78 to-transparent" />
      </div>

      <div className="container relative z-10 mx-auto px-4 pt-24 md:px-12 lg:pl-20 sm:pt-28">
        <div className="motion-safe:animate-pulse motion-reduce:animate-none">
          {/* Breadcrumb skeleton */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <div className="h-7 w-20 rounded-full bg-white/10 border border-white/10" />
            <div className="h-4 w-16 rounded bg-white/[0.08]" />
            <div className="h-3 w-3 rounded-full bg-white/[0.05]" />
            <div className="h-4 w-20 rounded bg-white/[0.08]" />
            <div className="h-3 w-3 rounded-full bg-white/[0.05]" />
            <div className="h-4 w-14 rounded bg-white/[0.08]" />
            <div className="h-3 w-3 rounded-full bg-white/[0.05]" />
            <div className="h-4 w-32 rounded bg-white/[0.08]" />
          </div>

          {/* Hero Content Grid (Left Info + Right Desktop Poster) */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
            <div className="flex flex-col items-center space-y-4 text-center sm:items-start sm:text-left md:space-y-5 lg:col-span-8">
              {/* Mobile/Tablet Poster (Visible < lg) */}
              <div className="mb-2 aspect-[2/3] w-36 shrink-0 rounded-2xl border border-white/15 bg-neutral-900/80 shadow-2xl sm:w-40 lg:hidden" />

              {/* Title & Origin Title */}
              <div className="w-full space-y-2.5">
                <div className="mx-auto h-9 w-4/5 max-w-lg rounded-xl bg-white/15 sm:mx-0 sm:h-12 md:h-14" />
                <div className="mx-auto h-4 w-1/2 max-w-sm rounded bg-white/[0.08] sm:mx-0" />
              </div>

              {/* Badges Row (HD, Vietsub, Episode, Year, Duration) */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <div className="h-6 w-12 rounded bg-white/[0.09]" />
                <div className="h-6 w-16 rounded bg-white/[0.09]" />
                <div className="h-6 w-14 rounded bg-white/[0.09]" />
                <div className="h-6 w-12 rounded bg-white/[0.09]" />
                <div className="h-6 w-20 rounded bg-white/[0.09]" />
              </div>

              {/* 4 Ratings Logo Badges (TMDB, IMDb, Rotten Tomatoes, Popcornmeter) */}
              <div className="flex w-full items-center justify-center gap-4 py-1 sm:justify-start sm:gap-5">
                <div className="h-6 w-14 rounded-md bg-white/[0.08] border border-white/[0.06]" />
                <div className="h-6 w-16 rounded-md bg-white/[0.08] border border-white/[0.06]" />
                <div className="h-6 w-16 rounded-md bg-white/[0.08] border border-white/[0.06]" />
                <div className="h-6 w-16 rounded-md bg-white/[0.08] border border-white/[0.06]" />
              </div>

              {/* Action Buttons: Xem phim, Trailer, and 3 Circular Quick Actions */}
              <div className="flex w-full flex-wrap items-center justify-center gap-3 pt-2 sm:justify-start">
                {/* Xem phim Pill */}
                <div className="h-11 w-36 rounded-full bg-white/20 sm:h-12 shadow-lg" />
                {/* Trailer Pill */}
                <div className="h-11 w-28 rounded-full border border-white/15 bg-[#181b22] sm:h-12 shadow-md" />
                {/* 3 Circular Actions (Tủ phim, Theo dõi, Đánh giá) */}
                <div className="flex items-center space-x-3 sm:ml-2">
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-10 w-10 rounded-full border border-white/10 bg-[#181b22]" />
                    <div className="h-2.5 w-10 rounded bg-white/[0.07]" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-10 w-10 rounded-full border border-white/10 bg-[#181b22]" />
                    <div className="h-2.5 w-12 rounded bg-white/[0.07]" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-10 w-10 rounded-full border border-white/10 bg-[#181b22]" />
                    <div className="h-2.5 w-12 rounded bg-white/[0.07]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Poster Card (Hidden on Mobile, Visible lg+) */}
            <div className="hidden justify-end lg:col-span-4 lg:flex">
              <div className="aspect-[2/3] w-64 shrink-0 rounded-2xl border border-white/15 bg-neutral-950/60 shadow-[0_20px_50px_rgba(0,0,0,0.8)]" />
            </div>
          </div>

          {/* Details Section */}
          <div className="mt-8 space-y-8">
            {/* Unified Information Card (Thể loại, Quốc gia, Thời lượng, Số tập, Trạng thái) */}
            <div className="rounded-xl border border-white/10 bg-[#0d0f12]/60 p-3.5 shadow-lg backdrop-blur-xl sm:p-4">
              <div className="flex flex-col gap-2.5">
                {/* Row 1: Thể loại & Quốc gia */}
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="h-3.5 w-14 rounded bg-white/[0.08]" />
                    <div className="h-5 w-16 rounded-md bg-white/[0.05]" />
                    <div className="h-5 w-20 rounded-md bg-white/[0.05]" />
                    <div className="h-5 w-16 rounded-md bg-white/[0.05]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-14 rounded bg-white/[0.08]" />
                    <div className="h-5 w-16 rounded-md bg-white/[0.05]" />
                    <div className="h-5 w-16 rounded-md bg-white/[0.05]" />
                  </div>
                </div>
                {/* Row 2: Thời lượng · Số tập · Trạng thái */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="h-3 w-28 rounded bg-white/[0.06]" />
                    <div className="h-3 w-24 rounded bg-white/[0.06]" />
                  </div>
                  <div className="h-5 w-20 rounded-full bg-white/[0.06]" />
                </div>
              </div>
            </div>

            {/* Cast & Crew Section */}
            <div className="space-y-3">
              <div className="h-4 w-40 rounded bg-white/[0.09]" />
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    key={index}
                    className="flex w-24 shrink-0 flex-col items-center gap-2 rounded-xl bg-white/[0.02] p-2.5 sm:w-28"
                  >
                    <div className="h-20 w-20 rounded-full bg-white/[0.06] sm:h-24 sm:w-24" />
                    <div className="h-3 w-16 rounded bg-white/[0.07]" />
                    <div className="h-2.5 w-12 rounded bg-white/[0.05]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Synopsis Section */}
            <div className="space-y-3.5 border-t border-white/5 pt-5">
              <div className="h-5 w-36 rounded bg-white/[0.09]" />
              <div className="h-4 w-2/3 rounded border-l-2 border-amber-400/40 bg-amber-400/15 pl-3" />
              <div className="space-y-2.5 pt-1">
                <div className="h-3.5 w-full rounded bg-white/[0.05]" />
                <div className="h-3.5 w-[96%] rounded bg-white/[0.05]" />
                <div className="h-3.5 w-4/5 rounded bg-white/[0.05]" />
              </div>
            </div>

            {/* Episode Grid Section */}
            <div className="space-y-3.5 border-t border-white/5 pt-5">
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 rounded bg-white/[0.09]" />
                <div className="h-6 w-20 rounded-full bg-white/[0.05]" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-28 rounded-lg bg-white/[0.08]" />
                <div className="h-8 w-28 rounded-lg bg-white/[0.04]" />
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                {Array.from({ length: 12 }, (_, index) => (
                  <div
                    key={index}
                    className="h-10 rounded-xl bg-white/[0.05] border border-white/[0.04]"
                  />
                ))}
              </div>
            </div>

            {/* Similar Movies Section (Desktop 7-Cols Standard) */}
            <div className="space-y-3.5 border-t border-white/5 pt-6">
              <div className="h-5 w-40 rounded bg-white/[0.09]" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-7">
                {Array.from({ length: 7 }, (_, index) => (
                  <div key={index} className="space-y-2">
                    <div className="aspect-[2/3] w-full rounded-2xl bg-white/[0.06] border border-white/[0.05]" />
                    <div className="h-3.5 w-3/4 rounded bg-white/[0.07]" />
                    <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { FilmDetailLoading as FilmDetailSkeleton };
