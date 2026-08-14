"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Search,
  Home,
  Film,
  Sparkles,
  Send,
  CheckCircle2,
  SearchX,
  Compass,
  ArrowRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { movieApi } from "@/lib/api";
import { FilmCard, FilmItem } from "./FilmCard";
import { cardFont } from "@/lib/fonts";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";

interface FilmNotFoundProps {
  querySlug?: string;
  title?: string;
}

export function FilmNotFound({
  querySlug,
  title = "Không tìm thấy kết quả phù hợp",
}: FilmNotFoundProps) {
  const { toast } = useToast();
  const [requestSent, setRequestSent] = useState(false);

  // Fetch top trending movies as recommendations
  const { data: trendingData } = useQuery({
    queryKey: ["film_not_found_recommendations"],
    queryFn: async () => {
      try {
        const res = await movieApi.getLatest(1);
        const items = res?.data?.items || (res as any)?.items || [];
        return items.slice(0, 14) as FilmItem[];
      } catch {
        return [] as FilmItem[];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const handleRequestMovie = () => {
    setRequestSent(true);
    toast(
      "Đã gửi yêu cầu bổ sung phim! NetPhim sẽ cập nhật trong thời gian sớm nhất.",
      "success",
    );
  };

  return (
    <div
      className={cn(
        "w-full min-h-[70vh] bg-transparent text-white pt-10 sm:pt-14 pb-20 px-4 sm:px-8 select-none flex flex-col items-center",
        cardFont.className,
      )}
    >
      {/* ── MAIN NOT FOUND SEAMLESS CONTAINER (NO BOX, SEAMLESS WITH WEB) ── */}
      <div className="relative w-full max-w-2xl flex flex-col items-center text-center mb-12">
        {/* Search Icon Emblem */}
        <div className="relative mb-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center shadow-lg">
            <SearchX
              className="w-8 h-8 sm:w-10 sm:h-10 text-neutral-300 stroke-[1.75]"
            />
          </div>
        </div>

        {/* Category Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-neutral-300 text-[11px] font-semibold mb-3">
          <Sparkles size={12} className="text-violet-400" />
          <span>Tìm kiếm</span>
        </div>

        {/* Heading */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2.5">
          {title}
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-neutral-400 max-w-md leading-relaxed mb-6">
          {querySlug ? (
            <>
              Rất tiếc, từ khóa{" "}
              <span className="font-bold text-white">
                &ldquo;{querySlug}&rdquo;
              </span>{" "}
              chưa có trên hệ thống hoặc tên phim chưa chính xác.
            </>
          ) : (
            "Bộ phim bạn đang tìm kiếm hiện chưa được cập nhật trên hệ thống."
          )}
        </p>

        {/* Suggestions Box (Seamless Dark) */}
        <div className="w-full max-w-md bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 text-left mb-6 text-xs text-neutral-400 space-y-2">
          <p className="font-bold text-neutral-200 mb-1 flex items-center gap-1.5 text-xs">
            <Film size={13} className="text-neutral-400" />
            Gợi ý tìm kiếm:
          </p>
          <div className="flex items-start gap-2">
            <span className="text-neutral-500 font-bold">•</span>
            <span>Kiểm tra lại chính tả hoặc thử gõ từ khóa ngắn gọn hơn.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-neutral-500 font-bold">•</span>
            <span>Thử tìm bằng tên gốc tiếng Anh hoặc tên tiếng Việt.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-neutral-500 font-bold">•</span>
            <span>Duyệt theo Thể loại hoặc Quốc gia ở thanh menu phía trên.</span>
          </div>
        </div>

        {/* Action Buttons (Seamless Theme Buttons) */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.08] hover:bg-white/[0.16] border border-white/10 text-white font-bold text-xs sm:text-sm rounded-xl transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            <Home size={15} />
            <span>Trang chủ</span>
          </Link>

          <Link
            href="/films/series"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-300 hover:text-white font-bold text-xs sm:text-sm rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            <Compass size={15} />
            <span>Khám phá phim</span>
          </Link>

          <button
            type="button"
            onClick={handleRequestMovie}
            disabled={requestSent}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all border cursor-pointer active:scale-95",
              requestSent
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 cursor-default"
                : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-neutral-300 hover:text-white",
            )}
          >
            {requestSent ? <CheckCircle2 size={15} /> : <Send size={14} />}
            <span>{requestSent ? "Đã gửi yêu cầu" : "Yêu cầu thêm phim"}</span>
          </button>
        </div>
      </div>

      {/* ── RECOMMENDED MOVIES ROW ("CÓ THỂ BẠN MUỐN XEM") ── */}
      {trendingData && trendingData.length > 0 && (
        <section className="w-full max-w-[1700px] mt-2">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              Có thể bạn muốn xem
            </h2>
            <Link
              href="/films/series"
              className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-y-6 sm:gap-y-8">
            {trendingData.slice(0, 14).map((film) => (
              <FilmCard key={film.slug || film._id} film={film} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
