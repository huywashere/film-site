"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Home, Film, Sparkles, Send, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { movieApi } from "@/lib/api";
import { FilmCard, FilmItem } from "./FilmCard";
import { cardFont } from "@/lib/fonts";
import { useToast } from "@/providers/ToastProvider";

interface FilmNotFoundProps {
  querySlug?: string;
  title?: string;
}

export function FilmNotFound({ querySlug, title = "Không tìm thấy phim này" }: FilmNotFoundProps) {
  const { toast } = useToast();
  const [requestSent, setRequestSent] = useState(false);

  // Fetch top trending movies as recommendations
  const { data: trendingData } = useQuery({
    queryKey: ["film_not_found_recommendations"],
    queryFn: async () => {
      const res = await movieApi.getLatest(1);
      const items = res?.data?.items || (res as any)?.items || [];
      return items.slice(0, 10) as FilmItem[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleRequestMovie = () => {
    setRequestSent(true);
    toast("Đã gửi yêu cầu bổ sung phim! Ban quản trị sẽ cập nhật sớm nhất.");
  };

  return (
    <div className="w-full bg-[#0b0e14] text-neutral-200 min-h-[85vh] pt-24 pb-16 px-4 font-sans select-none flex flex-col items-center">
      
      {/* ── CINEMATIC PROJECTOR BEAM HERO CONTAINER ── */}
      <div className="relative w-full max-w-3xl flex flex-col items-center text-center bg-black/40 border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl backdrop-blur-xl overflow-hidden mb-12">
        
        {/* Ambient Projector Beam Light Background */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[280px] bg-gradient-to-b from-sky-500/20 via-blue-500/10 to-transparent blur-3xl rounded-full" />
        
        {/* Projector Light Beam SVG Graphic */}
        <div className="relative mb-6 z-10">
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-white/5 border border-white/15 flex items-center justify-center shadow-2xl backdrop-blur-md animate-float-slow">
            
            {/* Film Projector SVG Illustration */}
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-14 h-14 sm:w-18 sm:h-18 drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]">
              {/* Projector Body */}
              <rect x="2" y="10" width="14" height="9" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
              {/* Lens */}
              <polygon points="16,12 21,9 21,20 16,17" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
              {/* Top Film Reels */}
              <circle cx="6" cy="6" r="3.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
              <circle cx="12" cy="6" r="3.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
              <circle cx="6" cy="6" r="1" fill="#38bdf8" />
              <circle cx="12" cy="6" r="1" fill="#38bdf8" />
            </svg>

            {/* Glowing beam dust particles */}
            <span className="absolute -bottom-2 -right-2 w-3 h-3 rounded-full bg-cyan-400 blur-[1px] animate-ping" />
          </div>

          {/* Projector Light Cone overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-48 h-32 bg-gradient-to-b from-sky-400/20 to-transparent clip-path-cone pointer-events-none animate-beam-shine" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[11px] font-bold uppercase tracking-wider mb-3 z-10">
          <Sparkles size={13} />
          Thông báo tìm kiếm
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3 z-10">
          {title}
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-neutral-400 max-w-lg leading-relaxed mb-6 z-10">
          {querySlug ? (
            <>
              Rất tiếc, bộ phim <span className="font-semibold text-sky-300">"{querySlug}"</span> hiện chưa có bản chiếu trên hệ thống hoặc tên tìm kiếm chưa chính xác.
            </>
          ) : (
            "Bộ phim bạn đang tìm kiếm hiện chưa được cập nhật trên hệ thống hoặc đường dẫn không khả dụng."
          )}
        </p>

        {/* Helpful Suggestions Box */}
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-4 text-left mb-8 text-xs text-neutral-300 space-y-2 z-10">
          <p className="font-bold text-white mb-1.5 flex items-center gap-1.5 text-xs">
            <Film size={14} className="text-sky-400" />
            Mẹo tìm kiếm phim hiệu quả:
          </p>
          <div className="flex items-start gap-2">
            <span className="text-sky-400 font-bold">•</span>
            <span>Kiểm tra lại chính tả hoặc thử gõ tên phim ngắn gọn hơn.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-sky-400 font-bold">•</span>
            <span>Thử tìm bằng tên gốc tiếng Anh (VD: <i>Jack Ryan</i> thay vì <i>Siêu điệp viên</i>).</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-sky-400 font-bold">•</span>
            <span>Lọc theo thể loại hoặc quốc gia ở thanh menu phía trên.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#00e054] hover:bg-[#00c749] text-black font-extrabold text-xs sm:text-sm rounded-full transition-all shadow-lg active:scale-95"
          >
            <Home size={16} />
            Quay về trang chủ
          </Link>

          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1e2736] hover:bg-[#283548] text-white border border-white/15 font-bold text-xs sm:text-sm rounded-full transition-all shadow-lg active:scale-95"
          >
            <Search size={16} />
            Tìm kiếm phim khác
          </Link>

          <button
            onClick={handleRequestMovie}
            disabled={requestSent}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-xs sm:text-sm transition-all border shadow-lg active:scale-95 ${
              requestSent
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 cursor-default"
                : "bg-white/5 hover:bg-white/10 border-white/15 text-neutral-300 hover:text-white"
            }`}
          >
            {requestSent ? <CheckCircle2 size={16} /> : <Send size={15} />}
            {requestSent ? "Đã gửi yêu cầu" : "Yêu cầu cập nhật phim"}
          </button>
        </div>

      </div>

      {/* ── RECOMMENDED MOVIES ROW ("CÓ THỂ BẠN MUỐN XEM") ── */}
      {trendingData && trendingData.length > 0 && (
        <section className="w-full max-w-6xl mt-4">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className={`${cardFont.className} text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2`}>
              <Sparkles size={18} className="text-amber-400" />
              Có thể bạn muốn xem
            </h2>
            <Link
              href="/search"
              className="text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
            >
              Xem tất cả →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {trendingData.slice(0, 10).map((film) => (
              <FilmCard key={film.slug || film._id} film={film} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
