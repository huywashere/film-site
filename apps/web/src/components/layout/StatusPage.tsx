"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Clapperboard, Home, RefreshCw } from "lucide-react";
import { recordTelemetry } from "@/lib/telemetry";

type StatusPageProps = {
  code: "404" | "500";
  onRetry?: () => void;
};

export function StatusPage({ code, onRetry }: StatusPageProps) {
  const isServerError = code === "500";

  useEffect(() => {
    document.body.dataset.statusPage = "true";
    recordTelemetry(
      `route.${code}`,
      { status: code },
      isServerError ? "error" : "warning",
    );

    return () => {
      delete document.body.dataset.statusPage;
    };
  }, [code, isServerError]);

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.assign("/");
  };

  const title = isServerError ? "Suất chiếu đang bị gián đoạn" : "Cảnh phim này không tồn tại";
  const description = isServerError
    ? "Hệ thống chưa thể tải trang này. Bạn có thể thử lại hoặc trở về trang chủ."
    : "Đường dẫn có thể đã thay đổi, hoặc nội dung này không còn được phát hành.";

  return (
    <main className="relative isolate flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#06080c] px-5 py-10 font-sans text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_42%_at_50%_48%,rgba(31,55,93,.28),transparent_72%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/25 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34vh] bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.42))]" />

      <section className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
        <div className="relative flex h-[13.5rem] w-full items-center justify-center sm:h-[17.5rem] lg:h-[22rem]">
          <span className="pointer-events-none absolute select-none text-[clamp(10rem,33vw,23rem)] font-black leading-none tracking-[-.115em] text-[#111824]">
            {code}
          </span>
          <div className="relative grid h-24 w-24 place-items-center rounded-[1.5rem] border border-white/[.12] bg-white/[.035] shadow-[inset_0_1px_0_rgba(255,255,255,.06)] sm:h-28 sm:w-28">
            <Clapperboard size={34} strokeWidth={1.35} className={isServerError ? "text-rose-300" : "text-blue-200"} aria-hidden="true" />
            <span className={`absolute -bottom-1.5 h-1.5 w-1.5 rounded-full ${isServerError ? "bg-rose-400" : "bg-blue-300"}`} />
          </div>
        </div>

        <div className="mt-1 max-w-md sm:mt-3">
          <p className={`mb-3 text-[11px] font-bold uppercase tracking-[.22em] ${isServerError ? "text-rose-300/85" : "text-blue-200/85"}`}>
            {isServerError ? "Lỗi hệ thống 500" : "Không tìm thấy 404"}
          </p>
          <h1 className="text-[clamp(1.8rem,4vw,2.7rem)] font-bold leading-[1.08] tracking-[-.055em] text-white">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-400 sm:text-[15px]">
            {description}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {isServerError && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#0a0d13] transition-transform hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#06080c] active:translate-y-px"
            >
              <RefreshCw size={16} strokeWidth={2.2} />
              Thử tải lại
            </button>
          )}
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2268e8] px-4 text-sm font-bold text-white transition-colors hover:bg-[#3479f4] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06080c] active:translate-y-px"
          >
            <Home size={16} strokeWidth={2.2} />
            Về trang chủ
          </Link>
          {!isServerError && (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[.12] bg-white/[.035] px-4 text-sm font-semibold text-slate-200 transition-colors hover:border-white/[.22] hover:bg-white/[.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#06080c] active:translate-y-px"
            >
              <ArrowLeft size={16} strokeWidth={2.2} />
              Quay lại
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
