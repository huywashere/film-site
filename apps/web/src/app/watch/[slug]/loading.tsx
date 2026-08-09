export default function WatchLoading() {
  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto max-w-screen-2xl px-3 pb-10 pt-20 md:px-5 lg:pl-24 lg:pt-22">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
          <div className="min-w-0 space-y-4 animate-pulse">
            <div className="flex h-11 items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-3">
              <div className="h-6 w-48 rounded-lg bg-white/[0.08] sm:w-80" />
              <div className="hidden h-6 w-48 rounded-lg bg-white/[0.06] sm:block" />
            </div>

            <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d0f13]">
              <div className="h-full w-full bg-gradient-to-br from-white/[0.045] via-transparent to-white/[0.025]" />
            </div>

            <div className="space-y-2 py-1">
              <div className="h-5 w-2/5 rounded bg-white/10" />
              <div className="h-3 w-1/4 rounded bg-white/[0.06]" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-[135px] rounded-2xl border border-white/[0.08] bg-white/[0.035] sm:h-[145px]"
                >
                  <div className="m-5 h-3 w-24 rounded bg-white/[0.08]" />
                  <div className="mx-5 mt-7 h-5 w-3/5 rounded bg-white/10" />
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="h-3 w-40 rounded bg-white/[0.08]" />
              <div className="flex flex-wrap gap-2">
                {[88, 132, 116, 148].map((width, index) => (
                  <div
                    key={index}
                    className="h-9 rounded-xl bg-white/[0.07]"
                    style={{ width }}
                  />
                ))}
              </div>
              <div className="grid grid-cols-5 gap-2 pt-3 sm:grid-cols-8 lg:grid-cols-10">
                {Array.from({ length: 20 }, (_, index) => (
                  <div key={index} className="h-9 rounded-lg bg-white/[0.055]" />
                ))}
              </div>
            </div>
          </div>

          <aside className="hidden space-y-4 animate-pulse xl:block">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
              <div className="mx-auto aspect-[2/3] w-28 rounded-xl bg-white/[0.07]" />
              <div className="mx-auto mt-4 h-4 w-4/5 rounded bg-white/[0.09]" />
              <div className="mx-auto mt-2 h-3 w-2/5 rounded bg-white/[0.05]" />
            </div>
            <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="h-3 w-28 rounded bg-white/[0.08]" />
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="flex gap-3">
                  <div className="h-20 w-14 shrink-0 rounded-lg bg-white/[0.07]" />
                  <div className="flex-1 space-y-2 pt-2">
                    <div className="h-3 w-full rounded bg-white/[0.08]" />
                    <div className="h-3 w-2/3 rounded bg-white/[0.05]" />
                  </div>
                </div>
              ))}
            </div>
          </aside>
          </div>
      </main>
    </div>
  );
}
