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
  // 500 SERVER ERROR: Ahrefs Deep Space Replica Style (Royal Blue)
  // ═══════════════════════════════════════════════════════════════════════
  if (isServerError) {
    return (
      <main
        className={cn(
          cardFont.className,
          "status-page fixed inset-0 z-[1000] flex min-h-[100dvh] w-full flex-col justify-between overflow-x-hidden overflow-y-auto bg-[#044adb] text-white select-none selection:bg-white selection:text-[#044adb]",
        )}
      >
        {/* Top Header Navbar */}
        <header className="relative z-20 w-full shrink-0 px-6 sm:px-10 lg:px-14 py-6 flex items-center justify-between">
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
                width={32}
                height={32}
                priority
                unoptimized
                className="h-8 w-8 brightness-0 invert object-contain transition-transform duration-300 group-hover:scale-105"
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
              <span className="text-orange-400">Phim</span>
            </span>
          </Link>

          {/* Right Action: Trang chủ (Globe icon like Ahrefs Sign In) */}
          <div className="flex items-center space-x-6">
            <Link
              href="/"
              className="flex items-center space-x-2 text-sm font-semibold text-white/90 hover:text-white transition-opacity"
            >
              <svg
                className="w-4 h-4 text-white/80"
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

        {/* Main Hero Content (Ahrefs Split Layout) */}
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
                  className="h-auto w-full object-contain"
                />
              </div>
            </div>

            {/* Right Column: Outline 500 & Vietnamese Copy */}
            <div className="order-2 lg:order-2 lg:col-span-6 flex flex-col text-left relative">
              
              {/* Floating Yellow Dot / Star above middle zero */}
              <div
                className="w-3 h-3 rounded-full bg-[#fed857] shadow-sm mb-3 sm:mb-4 hidden sm:block animate-pulse"
                aria-hidden="true"
              />

              {/* Ahrefs Signature Hollow Outlined 500 with Barred Zeros */}
              <div
                className="flex items-center space-x-1 sm:space-x-2 text-7xl sm:text-8xl md:text-[130px] lg:text-[140px] font-extrabold leading-none mb-6 select-none tracking-tight"
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
              <h1 className="text-3xl sm:text-4xl md:text-[44px] font-bold text-white tracking-tight leading-snug mb-4">
                Oops, máy chủ gặp sự cố kết nối
              </h1>

              {/* Subheading / Detailed Vietnamese Copy */}
              <p className="text-base sm:text-lg text-white/90 leading-relaxed font-normal max-w-xl mb-8">
                Máy chủ đang gặp sự cố quá tải hoặc gián đoạn kết nối dữ liệu tạm thời. Bạn có thể kiểm tra lại đường truyền mạng, thử kết nối lại ngay hoặc quay về trang chủ để tiếp tục trải nghiệm phim.
              </p>

              {/* Primary Action Button (Ahrefs Arrow Link Style) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="group inline-flex items-center text-xl sm:text-2xl font-bold text-white hover:text-white/90 transition-all cursor-pointer"
                >
                  <span>Thử kết nối lại ngay</span>
                  <span className="ml-2.5 transition-transform duration-200 group-hover:translate-x-1.5">
                    →
                  </span>
                </button>
              </div>

              {/* Secondary Navigation Links */}
              <div className="mt-8 pt-6 border-t border-white/20 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
                <Link
                  href="/"
                  className="hover:text-white hover:underline underline-offset-4 transition-colors"
                >
                  Về Trang chủ
                </Link>
                <span className="text-white/40">•</span>
                <Link
                  href="/films"
                  className="hover:text-white hover:underline underline-offset-4 transition-colors"
                >
                  Kho phim lẻ &amp; bộ
                </Link>
                <span className="text-white/40">•</span>
                <Link
                  href="/genres"
                  className="hover:text-white hover:underline underline-offset-4 transition-colors"
                >
                  Vũ trụ điện ảnh
                </Link>
                <span className="text-white/40">•</span>
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

        {/* Decorative Planetary Ring Slice Peeking at Bottom Right */}
        <div
          className="fixed -bottom-16 -right-16 w-52 h-52 rounded-full border-[10px] border-white/10 pointer-events-none z-0"
          aria-hidden="true"
        />

        {/* Floating Help Circle (?) Button at Bottom Right */}
        <div className="fixed bottom-6 right-6 z-30">
          <Link
            href="/bao-loi"
            aria-label="Hỗ trợ & Báo lỗi"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0038a8] border border-blue-400/30 text-white font-bold text-base shadow-lg shadow-blue-900/50 hover:bg-[#002f8f] hover:scale-105 transition-all"
          >
            ?
          </Link>
        </div>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 404 NOT FOUND: Justinmind Minimalist Split Style (Clean White)
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <main
      className={cn(
        cardFont.className,
        "status-page fixed inset-0 z-[1000] flex min-h-[100dvh] w-full flex-col overflow-y-auto bg-white text-neutral-900 select-none",
      )}
    >
      {/* Top Brand Navbar (Justinmind style) */}
      <header className="relative z-20 w-full shrink-0 border-b border-neutral-100 bg-white/95 backdrop-blur-sm">
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
                className="h-8 w-8 object-contain transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/flexphim-logo.png";
                }}
              />
            </div>
            <span
              className={cn(
                logoFont.className,
                "text-[24px] font-bold uppercase tracking-[-0.01em] text-neutral-950 sm:text-[26px] leading-none",
              )}
            >
              Flex
              <span className="text-violet-600">Phim</span>
            </span>
          </Link>

          {/* Nav links on desktop */}
          <nav className="hidden md:flex items-center space-x-7 text-sm font-medium text-neutral-700">
            <Link href="/films?type=series" className="transition-colors hover:text-neutral-950">
              Phim bộ
            </Link>
            <Link href="/films?type=single" className="transition-colors hover:text-neutral-950">
              Phim lẻ
            </Link>
            <Link href="/genres" className="transition-colors hover:text-neutral-950">
              Vũ trụ phim
            </Link>
            <Link href="/films" className="transition-colors hover:text-neutral-950">
              Khám phá
            </Link>
          </nav>

          {/* Action button */}
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="inline-flex h-9 sm:h-10 items-center justify-center rounded-md bg-neutral-950 px-4 sm:px-5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-neutral-800 active:scale-[0.98]"
            >
              Về Trang Chủ
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero Content (Justinmind 2-col Split Layout) */}
      <div className="relative z-10 mx-auto flex flex-1 w-full max-w-7xl items-center px-6 sm:px-10 py-10 lg:py-16">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">

          {/* Left Column: Text & Helpful Links */}
          <div className="order-2 lg:order-1 lg:col-span-5 flex flex-col text-left">
            {/* Error Code Tag */}
            <span className="mb-3 text-xs sm:text-sm font-semibold uppercase tracking-wider text-neutral-400">
              ERROR CODE: 404
            </span>

            {/* OOOPS!! Heading */}
            <h1 className="mb-4 text-5xl sm:text-6xl md:text-[68px] font-black tracking-tight text-neutral-950 leading-none">
              OOOPS!!
            </h1>

            {/* Subheading */}
            <p className="mb-10 text-xl sm:text-2xl md:text-[26px] font-normal text-neutral-800 leading-snug max-w-md">
              Đây không phải là trang bạn đang tìm kiếm
            </p>

            {/* Helpful Links Prompt */}
            <p className="mb-4 text-sm sm:text-base font-normal text-neutral-500">
              Dưới đây là một số liên kết hữu ích:
            </p>

            {/* Underlined Links */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm sm:text-base font-medium text-neutral-900">
              <Link
                href="/"
                className="underline underline-offset-4 decoration-neutral-900 transition-colors hover:text-blue-600 hover:decoration-blue-600"
              >
                Trang chủ
              </Link>
              <Link
                href="/films"
                className="underline underline-offset-4 decoration-neutral-900 transition-colors hover:text-blue-600 hover:decoration-blue-600"
              >
                Kho phim
              </Link>
              <Link
                href="/genres"
                className="underline underline-offset-4 decoration-neutral-900 transition-colors hover:text-blue-600 hover:decoration-blue-600"
              >
                Vũ trụ điện ảnh
              </Link>
              <Link
                href="/search"
                className="underline underline-offset-4 decoration-neutral-900 transition-colors hover:text-blue-600 hover:decoration-blue-600"
              >
                Tìm kiếm
              </Link>
            </div>
          </div>

          {/* Right Column: Colorful Geometric Astronaut Illustration */}
          <div className="order-1 lg:order-2 lg:col-span-7 flex items-center justify-center">
            <div className="relative w-full max-w-[560px] select-none">
              <NextImage
                src="/images/status/404-astronaut.png"
                alt="Không tìm thấy trang 404"
                width={580}
                height={480}
                priority
                unoptimized
                className="h-auto w-full object-contain drop-shadow-sm transition-transform duration-500 hover:scale-[1.01]"
              />
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
