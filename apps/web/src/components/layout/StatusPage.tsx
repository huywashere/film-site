"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { recordTelemetry } from "@/lib/telemetry";
import { cardFont, logoFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

type StatusPageProps = {
  code: "404" | "500";
  onRetry?: () => void;
};

export function StatusPage({ code, onRetry }: StatusPageProps) {
  const isServerError = code === "500";

  useEffect(() => {
    document.body.dataset.statusPage = "true";
    recordTelemetry(`route.${code}`, { status: code }, "warning");
    return () => {
      delete document.body.dataset.statusPage;
    };
  }, [code]);

  const handleRetry = useCallback(() => {
    if (onRetry) {
      try {
        onRetry();
      } catch {
        window.location.reload();
      }
    } else {
      window.location.reload();
    }
  }, [onRetry]);

  return (
    <main
      className={cn(
        cardFont.className,
        "status-page fixed inset-0 z-[1000] flex min-h-[100dvh] w-full flex-col justify-between overflow-x-hidden overflow-y-auto bg-[#0b0d12] text-white select-none selection:bg-violet-600 selection:text-white relative",
      )}
    >
      {/* ══ Ambient Cinematic Top Glow (identical to Home Page hero lighting) ══ */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-violet-600/15 via-purple-900/10 to-transparent blur-[120px] -z-10"
        aria-hidden="true"
      />

      {/* ══ Official FlexPhim Navbar (100% matched to Home Page) ══ */}
      <header className="relative z-30 w-full shrink-0 h-16 sm:h-[70px] px-6 sm:px-10 lg:px-14 flex items-center justify-between border-b border-white/[0.08] bg-[#0b0d12]/80 backdrop-blur-xl">
        {/* Brand Logo with Signature Purple Glow & Gradient */}
        <Link
          href="/"
          aria-label="FlexPhim - Trang chủ"
          className="group flex select-none items-center space-x-2.5 transition-opacity hover:opacity-90"
        >
          <div className="relative flex cursor-pointer items-center justify-center active:scale-95 transition-transform duration-200">
            <NextImage
              src="/flexphim-logo.svg"
              alt="FlexPhim Logo"
              width={38}
              height={38}
              priority
              unoptimized
              className="relative z-10 h-9 w-9 object-contain drop-shadow-[0_0_12px_rgba(168,85,247,0.45)] transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/flexphim-logo.png";
              }}
            />
          </div>
          <div className="relative overflow-hidden">
            <span
              className={cn(
                logoFont.className,
                "block text-[25px] font-bold uppercase tracking-[-0.01em] text-white select-none transition-all duration-300 group-hover:brightness-110 sm:text-[28px] leading-none",
              )}
            >
              Flex
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(168,85,247,0.45)]">
                Phim
              </span>
            </span>
          </div>
        </Link>

        {/* Nav Links (matched with Home Page items) */}
        <nav className="hidden md:flex items-center space-x-7 text-sm font-semibold text-neutral-300">
          <Link href="/films?type=series" className="hover:text-white transition-colors">
            Phim Bộ
          </Link>
          <Link href="/films?type=single" className="hover:text-white transition-colors">
            Phim Lẻ
          </Link>
          <Link href="/genres" className="hover:text-white transition-colors">
            Vũ Trụ Phim
          </Link>
          <Link href="/films" className="hover:text-white transition-colors">
            Khám Phá
          </Link>
        </nav>

        {/* Right Action: Pill Glass Button matching Home Page Hero Style */}
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/15 backdrop-blur-md transition-all shadow-sm active:scale-95"
          >
            <span>Trang chủ</span>
            <span>→</span>
          </Link>
        </div>
      </header>

      {/* ══ Main Hero Content Area ══ */}
      <div className="relative z-10 mx-auto flex flex-1 w-full max-w-7xl items-center px-6 sm:px-10 lg:px-14 py-8 lg:py-14">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">

          {/* Left Column: Floating Space Characters */}
          <div className="order-1 lg:order-1 lg:col-span-6 flex items-center justify-center">
            <div className="relative w-full max-w-[480px] select-none">
              <NextImage
                src="/images/status/500-ahrefs-characters.png"
                alt="Phi hành gia và Corgi không gian"
                width={520}
                height={590}
                priority
                unoptimized
                className="h-auto w-full object-contain drop-shadow-[0_20px_45px_rgba(0,0,0,0.7)]"
              />
            </div>
          </div>

          {/* Right Column: Error Content with Home Page Design System */}
          <div className="order-2 lg:order-2 lg:col-span-6 flex flex-col items-start text-left">
            
            {/* Error Pill Badge (Matches Home Page metadata pill style) */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-bold uppercase tracking-wider mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span>MÃ LỖI: {code}</span>
            </div>

            {/* Outlined Digits with Barred Theta Zeros */}
            <div
              className="flex items-center space-x-1 sm:space-x-2 text-6xl sm:text-7xl md:text-[120px] lg:text-[135px] font-black leading-none mb-5 select-none tracking-tight"
              style={{
                WebkitTextStroke: "3.5px #ffffff",
                color: "transparent",
              }}
            >
              {isServerError ? (
                <>
                  <span>5</span>
                  <div className="relative inline-flex items-center justify-center">
                    <span>0</span>
                    <span
                      className="absolute left-[26%] right-[26%] top-1/2 -translate-y-1/2 h-[3.5px] bg-white pointer-events-none rounded-full"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="relative inline-flex items-center justify-center">
                    <span>0</span>
                    <span
                      className="absolute left-[26%] right-[26%] top-1/2 -translate-y-1/2 h-[3.5px] bg-white pointer-events-none rounded-full"
                      aria-hidden="true"
                    />
                  </div>
                </>
              ) : (
                <>
                  <span>4</span>
                  <div className="relative inline-flex items-center justify-center">
                    <span>0</span>
                    <span
                      className="absolute left-[26%] right-[26%] top-1/2 -translate-y-1/2 h-[3.5px] bg-white pointer-events-none rounded-full"
                      aria-hidden="true"
                    />
                  </div>
                  <span>4</span>
                </>
              )}
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-[42px] font-black text-white tracking-tight leading-tight mb-4">
              {isServerError ? "Oops, máy chủ gặp sự cố kết nối" : "Oops, không tìm thấy trang này"}
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal max-w-xl mb-8">
              {isServerError
                ? "Máy chủ đang gặp sự cố quá tải hoặc gián đoạn luồng dữ liệu tạm thời. Bạn có thể kiểm tra lại kết nối mạng hoặc thử kết nối lại ngay."
                : "Đường dẫn bạn đang truy cập có thể đã thay đổi, bị xóa hoặc không khả dụng. Bạn có thể quay về trang chủ để tiếp tục khám phá kho phim."}
            </p>

            {/* Action Pill Buttons (identical to Home Page Hero actions) */}
            <div className="flex flex-wrap items-center gap-4 mb-10">
              {isServerError ? (
                <>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-white text-neutral-950 font-extrabold text-sm sm:text-base hover:bg-neutral-200 transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)] active:scale-95 cursor-pointer"
                  >
                    <span>Thử kết nối lại ngay</span>
                    <span className="text-lg">↻</span>
                  </button>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/10 text-white font-semibold text-sm sm:text-base border border-white/15 backdrop-blur-md hover:bg-white/20 transition-all active:scale-95"
                  >
                    <span>Về Trang chủ</span>
                    <span>→</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-white text-neutral-950 font-extrabold text-sm sm:text-base hover:bg-neutral-200 transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)] active:scale-95"
                  >
                    <span>Về Trang chủ</span>
                    <span>→</span>
                  </Link>
                  <Link
                    href="/films"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/10 text-white font-semibold text-sm sm:text-base border border-white/15 backdrop-blur-md hover:bg-white/20 transition-all active:scale-95"
                  >
                    <span>Khám phá kho phim</span>
                  </Link>
                </>
              )}
            </div>

            {/* Secondary Navigation Row */}
            <div className="w-full pt-6 border-t border-white/[0.08] flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-400 font-medium">
              <Link href="/" className="hover:text-white transition-colors">
                Trang chủ
              </Link>
              <span className="text-neutral-600">•</span>
              <Link href="/films" className="hover:text-white transition-colors">
                Kho phim lẻ &amp; bộ
              </Link>
              <span className="text-neutral-600">•</span>
              <Link href="/genres" className="hover:text-white transition-colors">
                Vũ trụ điện ảnh
              </Link>
              <span className="text-neutral-600">•</span>
              <Link href="/search" className="hover:text-white transition-colors">
                Tìm kiếm phim
              </Link>
              <span className="text-neutral-600">•</span>
              <Link href="/bao-loi" className="hover:text-white transition-colors">
                Báo lỗi kỹ thuật
              </Link>
            </div>

          </div>

        </div>
      </div>

      {/* Floating Help Circle (?) Button at Bottom Right */}
      <div className="fixed bottom-6 right-6 z-30">
        <Link
          href="/bao-loi"
          aria-label="Hỗ trợ & Báo lỗi"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#161a23]/90 border border-white/15 text-neutral-300 font-bold text-base shadow-2xl hover:text-white hover:border-violet-500/50 hover:bg-violet-600/20 transition-all active:scale-90"
        >
          ?
        </Link>
      </div>
    </main>
  );
}
