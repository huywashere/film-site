"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Radio, RefreshCw, Home, Compass } from "lucide-react";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export default function TvError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[LiveTV Error Boundary]", error);
  }, [error]);

  return (
    <div
      className={cn(
        cardFont.className,
        "min-h-screen bg-[#0a0b10] text-white pt-[76px] sm:pt-20 pb-24 sm:pb-28 lg:pb-16 lg:pl-20 flex items-center justify-center px-4 relative selection:bg-[#23ade5]/30",
      )}
    >
      {/* Background ambient radial glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(35,173,229,0.08),transparent_70%)]"
        aria-hidden="true"
      />

      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0e1017]/90 p-6 sm:p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.15)]">
          <Radio size={30} className="animate-pulse" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30 mb-3">
          SỰ CỐ KẾT NỐI TRUYỀN HÌNH
        </span>

        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Không thể tải kênh truyền hình
        </h2>

        <p className="mt-2 text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-sm mx-auto">
          Đã xảy ra sự cố khi thiết lập luồng phát hoặc dữ liệu kênh. Vui lòng thử tải lại trang hoặc quay về trang chủ.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#23ade5] hover:bg-[#1fa0d4] text-black shadow-lg shadow-[#23ade5]/20 transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw size={15} />
            <span>Tải lại trang</span>
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all cursor-pointer active:scale-95"
          >
            <Home size={15} className="text-[#23ade5]" />
            <span>Trang chủ</span>
          </Link>

          <Link
            href="/films"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/10 transition-all cursor-pointer active:scale-95"
          >
            <Compass size={15} />
            <span>Kho phim</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
