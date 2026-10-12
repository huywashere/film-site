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

  // ═══════════════════════════════════════════════════════════════════════
  // 500 SERVER ERROR: Ahrefs Space Replica with Home Page Dark Theme
  // ═══════════════════════════════════════════════════════════════════════
  if (isServerError) {
    return (
      <main
        className={cn(
          cardFont.className,
          "status-page fixed inset-0 z-[1000] flex min-h-[100dvh] w-full flex-col justify-between overflow-x-hidden overflow-y-auto bg-[#141414] text-white select-none selection:bg-[#e50914] selection:text-white",
        )}
      >
        {/* Top Header Navbar */}
        <header className="relative z-20 w-full shrink-0 border-b border-white/[0.08] px-6 sm:px-10 lg:px-14 py-5 flex items-center justify-between">
          {/* Logo Brand */}
          <Link
            href="/"
            aria-label="FlexPhim - Trang chủ"
            className="group flex items-center space-x-2.5 transition-opacity hover:opacity-90"
          >
            <div className="relative flex items-center justify-center">
              <NextImage
                src="/flexphim-logo.svg"
                alt="FlexPhim Logo"
                width={34}
                height={34}
                priority
                unoptimized
                className="h-8 w-8 object-contain drop-shadow-[0_0_12px_rgba(229,9,20,0.35)] transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/flexphim-logo.png";
                }}
              />
            </div>
            <span
              className={cn(
                logoFont.className,
                "text-[24px] font-bold uppercase tracking-[-0.01em] text-white sm:text-[26px] leading-none",
              )}
            >
              Flex
              <span className="text-[#e50914]">Phim</span>
            </span>
          </Link>

          {/* Right Action: Trang chủ (Globe icon like Ahrefs Sign In) */}
          <div className="flex items-center space-x-6">
            <Link
              href="/"
              className="flex items-center space-x-2 text-sm font-semibold text-neutral-400 hover:text-white transition-colors"
            >
              <svg
                className="w-4 h-4 text-neutral-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>Trang chủ</span>
            </Link>
          </div>
        </header>

        {/* Main Hero Content (Ahrefs Deep Space Split Layout on Dark Theme) */}
        <div className="relative z-10 mx-auto flex flex-1 w-full max-w-7xl items-center px-6 sm:px-10 lg:px-14 py-8 lg:py-12">
          <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">

            {/* Left Column: Floating Space Characters */}
            <div className="order-1 lg:order-1 lg:col-span-6 flex items-center justify-center">
              <div className="relative w-full max-w-[500px] select-none">
                <NextImage
                  src="/images/status/500-ahrefs-characters.png"
                  alt="Phi hành gia và Corgi không gian"
                  width={520}
                  height={590}
                  priority
                  unoptimized
                  className="h-auto w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
                />
              </div>
            </div>

            {/* Right Column: Outline 500 & Vietnamese Copy */}
            <div className="order-2 lg:order-2 lg:col-span-6 flex flex-col text-left relative">
              
              {/* Floating Yellow Dot / Star above middle zero */}
              <div
                className="w-3 h-3 rounded-full bg-[#fed857] shadow-[0_0_10px_rgba(254,216,87,0.5)] mb-3 sm:mb-4 hidden sm:block animate-pulse"
                aria-hidden="true"
              />

              {/* Ahrefs Signature Hollow Outlined 500 with Barred Zeros */}
              <div
                className="flex items-center space-x-1 sm:space-x-2 text-7xl sm:text-8xl md:text-[130px] lg:text-[140px] font-black leading-none mb-6 select-none tracking-tight"
                style={{
                  WebkitTextStroke: "3.5px #ffffff",
                  color: "transparent",
                }}
              >
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
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-[44px] font-black text-white tracking-tight leading-snug mb-4">
                Oops, máy chủ gặp sự cố kết nối
              </h1>

              {/* Subheading / Detailed Vietnamese Copy */}
              <p className="text-base sm:text-lg text-neutral-400 leading-relaxed font-normal max-w-xl mb-8">
                Máy chủ đang gặp sự cố quá tải hoặc gián đoạn kết nối dữ liệu tạm thời. Bạn có thể kiểm tra lại đường truyền mạng, thử kết nối lại ngay hoặc quay về trang chủ để tiếp tục trải nghiệm phim.
              </p>

              {/* Primary Action Button (Ahrefs Arrow Link Style with Red Accent) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="group inline-flex items-center text-xl sm:text-2xl font-bold text-white hover:text-[#e50914] transition-colors cursor-pointer"
                >
                  <span>Thử kết nối lại ngay</span>
                  <span className="ml-2.5 transition-transform duration-200 group-hover:translate-x-1.5">
                    →
                  </span>
                </button>
              </div>

              {/* Secondary Navigation Links */}
              <div className="mt-8 pt-6 border-t border-white/[0.08] flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-neutral-400">
                <Link
                  href="/"
                  className="hover:text-white hover:underline underline-offset-4 transition-colors"
                >
                  Về Trang chủ
                </Link>
                <span className="text-neutral-600">•</span>
                <Link
                  href="/films"
                  className="hover:text-white hover:underline underline-offset-4 transition-colors"
                >
                  Kho phim lẻ &amp; bộ
                </Link>
                <span className="text-neutral-600">•</span>
                <Link
                  href="/genres"
                  className="hover:text-white hover:underline underline-offset-4 transition-colors"
                >
                  Vũ trụ điện ảnh
                </Link>
                <span className="text-neutral-600">•</span>
                <Link
                  href="/bao-loi"
                  className="hover:text-white hover:underline underline-offset-4 transition-colors"
                >
                  Báo lỗi kỹ thuật
                </Link>
              </div>

            </div>

          </div>
        </div>

        {/* Decorative Subtle Ring Slice Peeking at Bottom Right */}
        <div
          className="fixed -bottom-16 -right-16 w-52 h-52 rounded-full border-[10px] border-white/[0.03] pointer-events-none z-0"
          aria-hidden="true"
        />

        {/* Floating Help Circle (?) Button at Bottom Right */}
        <div className="fixed bottom-6 right-6 z-30">
          <Link
            href="/bao-loi"
            aria-label="Hỗ trợ & Báo lỗi"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 border border-white/10 text-neutral-300 font-bold text-base shadow-xl hover:text-white hover:border-white/20 transition-all hover:scale-105"
          >
            ?
          </Link>
        </div>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 404 NOT FOUND: Justinmind Minimalist Split Style with Home Dark Theme
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <main
      className={cn(
        cardFont.className,
        "status-page fixed inset-0 z-[1000] flex min-h-[100dvh] w-full flex-col overflow-y-auto bg-[#141414] text-white select-none selection:bg-[#e50914] selection:text-white",
      )}
    >
      {/* Top Brand Navbar */}
      <header className="relative z-20 w-full shrink-0 border-b border-white/[0.08] bg-[#141414]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-6 sm:px-10">
          {/* Logo Brand */}
          <Link
            href="/"
            aria-label="FlexPhim - Trang chủ"
            className="group flex items-center space-x-2.5 transition-opacity hover:opacity-90"
          >
            <div className="relative flex items-center justify-center">
              <NextImage
                src="/flexphim-logo.svg"
                alt="FlexPhim Logo"
                width={34}
                height={34}
                priority
                unoptimized
                className="h-8 w-8 object-contain drop-shadow-[0_0_12px_rgba(229,9,20,0.35)] transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/flexphim-logo.png";
                }}
              />
            </div>
            <span
              className={cn(
                logoFont.className,
                "text-[24px] font-bold uppercase tracking-[-0.01em] text-white sm:text-[26px] leading-none",
              )}
            >
              Flex
              <span className="text-[#e50914]">Phim</span>
            </span>
          </Link>

          {/* Nav links on desktop */}
          <nav className="hidden md:flex items-center space-x-7 text-sm font-medium text-neutral-400">
            <Link href="/films?type=series" className="transition-colors hover:text-white">
              Phim bộ
            </Link>
            <Link href="/films?type=single" className="transition-colors hover:text-white">
              Phim lẻ
            </Link>
            <Link href="/genres" className="transition-colors hover:text-white">
              Vũ trụ phim
            </Link>
            <Link href="/films" className="transition-colors hover:text-white">
              Khám phá
            </Link>
          </nav>

          {/* Action button */}
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="inline-flex h-9 sm:h-10 items-center justify-center rounded-md bg-[#e50914] px-4 sm:px-5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#b80710] active:scale-[0.98]"
            >
              Về Trang Chủ
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero Content (Justinmind 2-col Split Layout on Dark Theme) */}
      <div className="relative z-10 mx-auto flex flex-1 w-full max-w-7xl items-center px-6 sm:px-10 py-10 lg:py-16">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">

          {/* Left Column: Text & Helpful Links */}
          <div className="order-2 lg:order-1 lg:col-span-5 flex flex-col text-left">
            {/* Error Code Tag */}
            <span className="mb-3 text-xs sm:text-sm font-semibold uppercase tracking-wider text-neutral-500">
              ERROR CODE: 404
            </span>

            {/* OOOPS!! Heading */}
            <h1 className="mb-4 text-5xl sm:text-6xl md:text-[68px] font-black tracking-tight text-white leading-none">
              OOOPS!!
            </h1>

            {/* Subheading */}
            <p className="mb-10 text-xl sm:text-2xl md:text-[26px] font-normal text-neutral-300 leading-snug max-w-md">
              Đây không phải là trang bạn đang tìm kiếm
            </p>

            {/* Helpful Links Prompt */}
            <p className="mb-4 text-sm sm:text-base font-normal text-neutral-500">
              Dưới đây là một số liên kết hữu ích:
            </p>

            {/* Underlined Links */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm sm:text-base font-medium text-neutral-300">
              <Link
                href="/"
                className="underline underline-offset-4 decoration-neutral-600 transition-colors hover:text-white hover:decoration-white"
              >
                Trang chủ
              </Link>
              <Link
                href="/films"
                className="underline underline-offset-4 decoration-neutral-600 transition-colors hover:text-white hover:decoration-white"
              >
                Kho phim
              </Link>
              <Link
                href="/genres"
                className="underline underline-offset-4 decoration-neutral-600 transition-colors hover:text-white hover:decoration-white"
              >
                Vũ trụ điện ảnh
              </Link>
              <Link
                href="/search"
                className="underline underline-offset-4 decoration-neutral-600 transition-colors hover:text-white hover:decoration-white"
              >
                Tìm kiếm
              </Link>
            </div>
          </div>

          {/* Right Column: Colorful Geometric Astronaut Illustration */}
          <div className="order-1 lg:order-2 lg:col-span-7 flex items-center justify-center">
            <div className="relative w-full max-w-[560px] select-none rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-6 shadow-2xl backdrop-blur-sm">
              <NextImage
                src="/images/status/404-astronaut.png"
                alt="Không tìm thấy trang 404"
                width={580}
                height={480}
                priority
                unoptimized
                className="h-auto w-full object-contain rounded-2xl drop-shadow-sm transition-transform duration-500 hover:scale-[1.01]"
              />
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
