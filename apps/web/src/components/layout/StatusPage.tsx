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

  const errorCodeText = isServerError ? "ERROR CODE: 500" : "ERROR CODE: 404";
  const headline = "OOOPS!!";
  const subHeadline = isServerError
    ? "Máy chủ đang gặp sự cố kết nối hoặc bảo trì"
    : "Đây không phải là trang bạn đang tìm kiếm";

  const helperText = "Dưới đây là một số liên kết hữu ích:";

  return (
    <main
      className={cn(
        cardFont.className,
        "status-page fixed inset-0 z-[1000] flex min-h-[100dvh] w-full flex-col overflow-y-auto bg-white text-neutral-900 select-none",
      )}
    >
      {/* ══ TOP BRAND NAVBAR (Justinmind style) ═════════════════════════ */}
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

      {/* ══ MAIN HERO CONTENT (Exact 2-col Split Justinmind Layout) ═══ */}
      <div className="relative z-10 mx-auto flex flex-1 w-full max-w-7xl items-center px-6 sm:px-10 py-10 lg:py-16">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">

          {/* LEFT COLUMN: Text & Helpful Links */}
          <div className="order-2 lg:order-1 lg:col-span-5 flex flex-col text-left">
            {/* Error Code Tag */}
            <span className="mb-3 text-xs sm:text-sm font-semibold uppercase tracking-wider text-neutral-400">
              {errorCodeText}
            </span>

            {/* OOOPS!! Heading */}
            <h1 className="mb-4 text-5xl sm:text-6xl md:text-[68px] font-black tracking-tight text-neutral-950 leading-none">
              {headline}
            </h1>

            {/* Subheading */}
            <p className="mb-10 text-xl sm:text-2xl md:text-[26px] font-normal text-neutral-800 leading-snug max-w-md">
              {subHeadline}
            </p>

            {/* Helpful Links Prompt */}
            <p className="mb-4 text-sm sm:text-base font-normal text-neutral-500">
              {helperText}
            </p>

            {/* Underlined Links */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm sm:text-base font-medium text-neutral-900">
              {isServerError ? (
                <>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="cursor-pointer underline underline-offset-4 decoration-neutral-900 transition-colors hover:text-blue-600 hover:decoration-blue-600 font-semibold"
                  >
                    Thử lại
                  </button>
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
                    href="/bao-loi"
                    className="underline underline-offset-4 decoration-neutral-900 transition-colors hover:text-blue-600 hover:decoration-blue-600"
                  >
                    Báo lỗi
                  </Link>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Colorful Geometric Astronaut Illustration */}
          <div className="order-1 lg:order-2 lg:col-span-7 flex items-center justify-center">
            <div className="relative w-full max-w-[560px] select-none">
              <NextImage
                src={isServerError ? "/images/status/500-astronaut.png" : "/images/status/404-astronaut.png"}
                alt={isServerError ? "Lỗi máy chủ 500" : "Không tìm thấy trang 404"}
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
