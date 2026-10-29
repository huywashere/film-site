export default function WatchLoading() {
  return (
    <div className="relative min-h-screen select-none bg-[#101114] text-white">
      {/* ── MAIN — Matches WatchPageClient exact responsive grid & paddings ── */}
      <main className="mx-auto max-w-[1800px] px-3 pb-10 pt-[74px] sm:pt-[78px] md:pt-20 lg:pl-20">
        <div className="grid grid-cols-1 gap-x-5 gap-y-1 sm:gap-y-1 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_330px] 2xl:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[min-content_auto_auto]">
          {/* ───── 0. TOP CONTROLS & BREADCRUMB BAR (Above Player) ───── */}
          <div className="flex h-fit self-start items-center justify-between gap-2 py-1.5 px-3 sm:px-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs select-none mb-1 lg:col-start-1 lg:row-start-1 motion-safe:animate-pulse motion-reduce:animate-none">
            {/* Left: Back Button Pill */}
            <div className="h-7 w-20 rounded-full bg-white/10 border border-white/15" />

            {/* Right: Quick Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Yêu thích */}
              <div className="h-7 w-8 sm:w-20 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
              {/* Tủ phim */}
              <div className="h-7 w-8 sm:w-20 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
              {/* Tắt đèn */}
              <div className="h-7 w-8 sm:w-20 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
              {/* Xem chung (Hidden on mobile) */}
              <div className="hidden md:block h-7 w-22 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
              {/* Rạp phim (Hidden on mobile) */}
              <div className="hidden md:block h-7 w-20 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
              {/* Phím tắt (Hidden on mobile) */}
              <div className="hidden md:block h-7 w-20 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
              {/* Chia sẻ */}
              <div className="h-7 w-8 sm:w-16 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
            </div>
          </div>

          {/* ───── 1. VIDEO PLAYER CONTAINER (Row 2, Left Column) ───── */}
          <div className="netphim-watch-player bg-black rounded-none overflow-hidden relative shadow-2xl ring-1 ring-white/[0.06] select-none lg:col-start-1 lg:row-start-2 w-full aspect-video flex items-center justify-center motion-safe:animate-pulse motion-reduce:animate-none">
            {/* Subtle Radial Glow & Deep Cinema Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(35,173,229,0.06),transparent_50%),linear-gradient(135deg,#08090b_0%,#101318_54%,#090a0c_100%)]" />

            {/* Center Play Indicator */}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-white/15 bg-white/5 backdrop-blur-md flex items-center justify-center shadow-2xl">
                <div className="w-0 h-0 border-y-8 border-y-transparent border-l-[14px] border-l-white/40 ml-1" />
              </div>
              <div className="h-3 w-28 rounded-full bg-white/10" />
            </div>

            {/* Bottom Controls Bar & Mini Progress Bar Skeleton */}
            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/50 to-transparent">
              {/* Mini Progress Bar */}
              <div className="h-1 w-full rounded-full bg-white/15 overflow-hidden">
                <div className="h-full w-1/4 bg-[#23ade5]/60 rounded-full" />
              </div>

              {/* Bottom Control Bar Buttons */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/10" />
                  <div className="w-6 h-6 rounded-full bg-white/10" />
                  <div className="w-6 h-6 rounded-full bg-white/10" />
                  <div className="h-3 w-24 rounded-full bg-white/10 ml-1" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded bg-white/10" />
                  <div className="w-5 h-5 rounded bg-white/10" />
                  <div className="w-5 h-5 rounded bg-white/10" />
                  <div className="w-5 h-5 rounded bg-white/10" />
                </div>
              </div>
            </div>
          </div>

          {/* ───── 2. CONTENT UNDER PLAYER (Row 3, Left Column) ───── */}
          <div className="lg:col-start-1 lg:row-start-3 min-w-0 space-y-4 pt-3 motion-safe:animate-pulse motion-reduce:animate-none">
            {/* Title & Prev/Next Episode Controls */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="h-6 w-3/4 max-w-md rounded-md bg-white/15" />
                <div className="h-3 w-48 rounded bg-white/[0.06]" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-8 w-24 rounded-xl bg-white/[0.04] border border-white/10" />
                <div className="h-8 w-24 rounded-xl bg-white/10 border border-white/20" />
              </div>
            </div>

            {/* Seamless Cinema Navigation Tab Bar */}
            <div className="w-full pb-2.5 sm:pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {/* Active Tab (Tập phim) */}
                <div className="h-8 w-24 rounded-full bg-[#24262c] ring-1 ring-white/10 shrink-0" />
                {/* Other Tabs */}
                <div className="h-8 w-20 rounded-full bg-white/[0.04] shrink-0" />
                <div className="h-8 w-20 rounded-full bg-white/[0.04] shrink-0" />
                <div className="h-8 w-18 rounded-full bg-white/[0.04] shrink-0" />
                <div className="h-8 w-26 rounded-full bg-white/[0.04] shrink-0" />
              </div>
            </div>

            {/* Streaming Server Controls */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="h-9 w-28 rounded-lg bg-white/10 border border-white/15" />
              <div className="h-9 w-28 rounded-lg bg-white/[0.05] border border-white/[0.06]" />
              <div className="h-9 w-32 rounded-lg bg-white/[0.05] border border-white/[0.06]" />
              <div className="h-9 w-24 rounded-lg bg-white/[0.05] border border-white/[0.06]" />
            </div>

            {/* Episode Grid Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 rounded bg-white/10" />
                <div className="h-4 w-16 rounded bg-white/[0.06]" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                {Array.from({ length: 16 }, (_, index) => (
                  <div
                    key={index}
                    className="h-10 rounded-xl bg-white/[0.05] border border-white/[0.05]"
                  />
                ))}
              </div>
            </div>

            {/* Comment Section Skeleton Placeholder */}
            <div className="min-h-24 border-t border-white/[0.08] pt-5">
              <div className="h-24 rounded-xl border border-white/[0.05] bg-white/[0.02]" />
            </div>
          </div>

          {/* ───── 3. RIGHT SIDEBAR (Row-span-3, Right Column) ───── */}
          <div className="lg:col-start-2 lg:row-start-1 lg:row-span-3 space-y-4 min-w-0 motion-safe:animate-pulse motion-reduce:animate-none">
            {/* Sidebar Film Card Skeleton */}
            <div className="rounded-xl border border-white/[0.08] bg-[#15161a] p-3.5 space-y-3 shadow-lg">
              <div className="flex gap-3">
                <div className="w-16 h-24 rounded-xl bg-white/[0.08] shrink-0 border border-white/10" />
                <div className="flex-1 min-w-0 space-y-2 pt-0.5">
                  <div className="h-4 w-4/5 rounded bg-white/15" />
                  <div className="h-3 w-3/5 rounded bg-white/[0.07]" />
                  <div className="h-3 w-16 rounded bg-white/[0.05]" />
                  <div className="flex gap-1.5 pt-1">
                    <div className="h-4 w-12 rounded bg-white/[0.06]" />
                    <div className="h-4 w-14 rounded bg-white/[0.06]" />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <div className="h-2.5 w-full rounded bg-white/[0.05]" />
                <div className="h-2.5 w-4/5 rounded bg-white/[0.05]" />
              </div>
            </div>

            {/* Quick Actions Panel (Tự chuyển & Đổi server) */}
            <div className="pb-3 border-b border-white/[0.08]">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="h-8 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
                <div className="h-8 rounded-lg bg-white/10 border border-white/15" />
              </div>
            </div>

            {/* Recommendations Section (Phim Tương Tự) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between px-1">
                <div className="h-3.5 w-24 rounded bg-white/10" />
                <div className="h-5 w-16 rounded-full bg-purple-500/15 border border-purple-500/25" />
              </div>
              <div className="space-y-1.5">
                {Array.from({ length: 5 }, (_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-neutral-950/40 p-2.5"
                  >
                    <div className="h-[98px] w-[68px] shrink-0 rounded-xl bg-white/[0.06]" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-4/5 rounded bg-white/10" />
                      <div className="h-3 w-1/2 rounded bg-white/[0.06]" />
                      <div className="flex items-center gap-2 pt-1">
                        <div className="h-3 w-10 rounded bg-white/[0.05]" />
                        <div className="h-4 w-12 rounded bg-white/[0.07]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export { WatchLoading as WatchPageSkeleton };
