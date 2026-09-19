import { FilmCardSkeleton } from "@/components/film/FilmCard";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export default function BrowseFilmsLoading() {
  return (
    <div
      className={cn(
        cardFont.className,
        "relative min-h-[100dvh] bg-[#0a0b10] text-white pb-24 sm:pb-28 pt-16 sm:pt-20 select-none",
      )}
    >
      <div className="relative z-10 mx-auto w-full max-w-[1720px] px-3.5 sm:px-6 md:pl-20 md:pr-6 lg:pl-24 lg:pr-10 xl:pl-28 xl:pr-12 space-y-5 sm:space-y-6">
        {/* ── Header Tiêu Đề Skeleton ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-3 sm:pb-4 border-b border-white/[0.08] gap-1.5 sm:gap-2 animate-pulse">
          <div className="h-7 sm:h-8 w-44 rounded-xl bg-white/10" />
          <div className="h-4 w-60 sm:w-72 rounded-md bg-white/[0.06]" />
        </div>

        {/* ── Hàng 1: Quick Format Pills & Search Skeleton ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-1.5 overflow-hidden py-0.5">
            {[64, 76, 70, 60, 78, 92, 80].map((width, i) => (
              <div
                key={i}
                className="h-8 shrink-0 rounded-xl bg-white/[0.06] border border-white/[0.08]"
                style={{ width }}
              />
            ))}
          </div>
          <div className="h-9 w-full md:w-72 rounded-xl bg-white/[0.06] border border-white/10 shrink-0" />
        </div>

        {/* ── Hàng 2: Bộ lọc dropdowns ── */}
        <div className="flex flex-wrap items-center gap-2 pt-1 animate-pulse">
          {[88, 94, 76, 88, 100].map((w, i) => (
            <div
              key={i}
              className="h-8 rounded-xl bg-white/[0.04] border border-white/10 shrink-0"
              style={{ width: w }}
            />
          ))}
        </div>

        {/* ── Lưới Thẻ Phim Chuẩn 7 Cột (21 cards) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5 sm:gap-3.5 lg:gap-4 pt-2">
          {Array.from({ length: 21 }).map((_, i) => (
            <FilmCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
