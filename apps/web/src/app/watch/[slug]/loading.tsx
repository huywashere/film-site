export default function WatchLoading() {
  return (
    <div className="min-h-screen bg-[#101114] text-white">
      <main className="mx-auto max-w-[1800px] px-3 pb-10 pt-20 md:px-5 lg:pl-20 lg:pt-22">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-4 motion-safe:animate-pulse motion-reduce:animate-none">
            <div className="relative aspect-video w-full overflow-hidden rounded-none border border-white/[0.06] bg-black shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.045),transparent_28%),linear-gradient(135deg,#08090b_0%,#101318_54%,#090a0c_100%)]" />
              <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.07] bg-white/[0.055]" />
              <div className="absolute inset-x-4 bottom-4">
                <div className="h-1 w-full rounded-full bg-white/[0.09]" />
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-white/[0.09]" />
                  <div className="h-6 w-6 rounded-full bg-white/[0.07]" />
                  <div className="h-3 w-24 rounded-full bg-white/[0.07]" />
                  <div className="ml-auto flex gap-3">
                    {Array.from({ length: 4 }, (_, index) => (
                      <div
                        key={index}
                        className="h-6 w-6 rounded-md bg-white/[0.065]"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex h-11 items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5">
              <div className="h-4 w-36 rounded-full bg-white/[0.075] sm:w-64" />
              <div className="flex shrink-0 gap-2">
                <div className="h-6 w-8 rounded-lg bg-white/[0.06] sm:w-20" />
                <div className="h-6 w-8 rounded-lg bg-white/[0.06] sm:w-20" />
                <div className="h-6 w-8 rounded-lg bg-white/[0.06] sm:w-20" />
              </div>
            </div>

            <div className="flex items-start justify-between gap-4 py-1">
              <div className="space-y-2">
                <div className="h-5 w-52 rounded-md bg-white/[0.1] sm:w-72" />
                <div className="h-3 w-40 rounded-full bg-white/[0.055] sm:w-56" />
              </div>
              <div className="h-9 w-24 shrink-0 rounded-lg bg-white/[0.075]" />
            </div>

            <div className="overflow-hidden border-y border-white/[0.07] py-4">
              <div className="flex gap-3 overflow-hidden">
                {[112, 128, 116].map((width, index) => (
                  <div
                    key={index}
                    className="h-9 shrink-0 rounded-lg bg-white/[0.07]"
                    style={{ width }}
                  />
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 overflow-hidden">
                <div className="h-3 w-20 shrink-0 rounded-full bg-white/[0.055]" />
                {[112, 124].map((width, index) => (
                  <div
                    key={index}
                    className="h-9 shrink-0 rounded-lg bg-white/[0.07]"
                    style={{ width }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4 py-1">
              <div className="flex items-center justify-between">
                <div className="h-4 w-44 rounded-full bg-white/[0.08]" />
                <div className="h-6 w-16 rounded-full bg-white/[0.06]" />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {Array.from({ length: 12 }, (_, index) => (
                  <div
                    key={index}
                    className="h-10 rounded-xl border border-white/[0.05] bg-white/[0.055]"
                  />
                ))}
              </div>
            </div>
          </div>

          <aside className="hidden space-y-4 motion-safe:animate-pulse motion-reduce:animate-none xl:block">
            <div className="flex gap-3 px-1">
              <div className="aspect-[2/3] w-16 shrink-0 rounded-md bg-white/[0.07]" />
              <div className="min-w-0 flex-1 space-y-2 pt-1">
                <div className="h-4 w-full rounded bg-white/[0.1]" />
                <div className="h-3 w-4/5 rounded bg-white/[0.06]" />
                <div className="h-3 w-16 rounded bg-white/[0.05]" />
                <div className="flex gap-1.5 pt-1">
                  <div className="h-5 w-10 rounded bg-white/[0.07]" />
                  <div className="h-5 w-14 rounded bg-white/[0.07]" />
                </div>
              </div>
            </div>
            <div className="h-9 rounded-xl border border-white/[0.06] bg-white/[0.035]" />
            <div className="border-t border-white/[0.07] pt-5">
              <div className="mb-4 h-3 w-24 rounded bg-white/[0.08]" />
              <div className="space-y-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="h-[84px] w-14 shrink-0 rounded-md bg-white/[0.07]" />
                    <div className="flex-1 space-y-2 pt-1.5">
                      <div className="h-3 w-full rounded bg-white/[0.08]" />
                      <div className="h-3 w-3/4 rounded bg-white/[0.05]" />
                      <div className="mt-4 h-3 w-16 rounded bg-white/[0.05]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
