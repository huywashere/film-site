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
        "status-page fixed inset-0 z-[1000] flex min-h-[100dvh] w-full flex-col justify-between overflow-hidden bg-black text-white select-none relative",
      )}
    >
      {/* ══ Netflix-Style Fullscreen Cinematic Background Artwork ══ */}
      <div className="absolute inset-0 -z-20 overflow-hidden pointer-events-none">
        <NextImage
          src="/images/netflix-404-bg.png"
          alt="Cinematic Background"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-center pointer-events-none select-none scale-105"
        />
        {/* Subtle Dark Vignette & Gradient Overlays for High Contrast Text Readability */}
        <div className="absolute inset-0 bg-black/40 bg-gradient-to-t from-black/85 via-black/35 to-black/70 pointer-events-none" />
      </div>

      {/* ══ Netflix-Style Top Header Bar with FlexPhim Brand Logo ══ */}
      <header className="relative z-30 w-full shrink-0 h-16 sm:h-20 px-6 sm:px-12 flex items-center justify-between">
        <Link
          href="/"
          aria-label="FlexPhim - Trang chủ"
          className="group flex select-none items-center space-x-2.5 transition-opacity hover:opacity-90 active:scale-95"
        >
          <div className="relative flex cursor-pointer items-center justify-center">
            <NextImage
              src="/flexphim-logo.svg"
              alt="FlexPhim Logo"
              width={38}
              height={38}
              priority
              unoptimized
              className="relative z-10 h-8 w-8 sm:h-9 sm:w-9 object-contain drop-shadow-[0_0_12px_rgba(168,85,247,0.45)] transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/flexphim-logo.png";
              }}
            />
          </div>
          <div className="relative overflow-hidden">
            <span
              className={cn(
                logoFont.className,
                "block text-[24px] sm:text-[28px] font-bold uppercase tracking-[-0.01em] text-white select-none transition-all duration-300 group-hover:brightness-110 leading-none",
              )}
            >
              Flex
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(168,85,247,0.45)]">
                Phim
              </span>
            </span>
          </div>
        </Link>
      </header>

      {/* ══ Netflix-Style Centered Hero Content ══ */}
      <div className="relative z-20 flex flex-1 flex-col items-center justify-center text-center px-6 max-w-2xl mx-auto my-auto py-8">
        {/* Main Title (Identical to Netflix "Lost your way?") */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight mb-4 sm:mb-6 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
          {isServerError ? "Oops, có chút sự cố!" : "Lost your way?"}
        </h1>

        {/* Subtitle / Description */}
        <p className="max-w-xl text-base sm:text-xl md:text-2xl font-normal text-white/90 leading-relaxed text-center mb-6 sm:mb-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] px-2">
          {isServerError
            ? "Máy chủ đang gặp sự cố kết nối tạm thời. Bạn có thể thử kết nối lại hoặc quay về trang chủ để tiếp tục xem phim."
            : "Sorry, we can't find that page. You'll find lots to explore on the home page."}
        </p>

        {/* Action Button (Solid White Button, Black Text, Rounded Corners - 100% Netflix Standard) */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-8 sm:mb-12">
          {isServerError && onRetry ? (
            <button
              type="button"
              onClick={handleRetry}
              className="px-6 sm:px-8 py-2.5 sm:py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm sm:text-base rounded active:scale-95 transition-all shadow-[0_4px_20px_rgba(124,58,237,0.5)] cursor-pointer select-none"
            >
              Thử lại ngay
            </button>
          ) : null}
          <Link
            href="/"
            className="px-6 sm:px-8 py-2.5 sm:py-3.5 bg-white hover:bg-neutral-200 text-neutral-950 font-bold text-sm sm:text-base rounded active:scale-95 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)] cursor-pointer select-none inline-flex items-center justify-center"
          >
            FlexPhim Home
          </Link>
        </div>

        {/* Error Code Callout with Soft Light Purple Bar (Yêu cầu: gạch đỏ nhỏ nhỏ dùng màu tím nhẹ) */}
        <div className="flex items-center justify-center space-x-3 text-sm sm:text-base md:text-lg text-white font-light drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] select-none">
          <span
            className="w-[3px] sm:w-[4px] h-6 sm:h-7 rounded-full bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.9)]"
            aria-hidden="true"
          />
          <span>
            Error Code <strong className="font-bold text-white tracking-wide">NSES-{code}</strong>
          </span>
        </div>
      </div>

      {/* ══ Netflix-Style Bottom Right Movie Reference Tag ══ */}
      <footer className="relative z-20 w-full shrink-0 px-6 sm:px-12 py-5 sm:py-6 flex items-center justify-end pointer-events-none select-none">
        <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-white/50 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
          FROM <span className="text-white/85 font-bold">THẾ GIỚI TIÊN HIỆP</span>
        </div>
      </footer>
    </main>
  );
}
