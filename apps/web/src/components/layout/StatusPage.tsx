"use client";

import { useEffect, useState, useCallback, useId } from "react";
import Link from "next/link";
import NextImage from "next/image";
import {
  RotateCcw,
  Home,
  Film,
  SlidersHorizontal,
  Layers,
  Search,
  Shuffle,
  ShieldAlert,
  Terminal,
  Copy,
  Check,
  ArrowRight,
  Activity,
  Wifi,
} from "lucide-react";
import { recordTelemetry } from "@/lib/telemetry";
import { cardFont, logoFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

type StatusPageProps = {
  code: "404" | "500";
  onRetry?: () => void;
};

export function StatusPage({ code, onRetry }: StatusPageProps) {
  const isServerError = code === "500";
  const [isRetrying, setIsRetrying] = useState(false);
  const [copiedTrace, setCopiedTrace] = useState(false);
  const rawId = useId();
  const [traceId, setTraceId] = useState(() => `fxp-edge-${rawId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "live"}`);

  useEffect(() => {
    document.body.dataset.statusPage = "true";
    recordTelemetry(`route.${code}`, { status: code }, "warning");
    setTraceId(`fxp-edge-${Math.floor(Date.now() / 1000).toString(16)}-${code}`);
    return () => {
      delete document.body.dataset.statusPage;
    };
  }, [code]);

  const handleRetry = useCallback(() => {
    if (isRetrying) return;
    setIsRetrying(true);
    if (onRetry) {
      try {
        onRetry();
      } catch {
        window.location.reload();
      }
    } else {
      window.location.reload();
    }
    const timer = setTimeout(() => {
      setIsRetrying(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [isRetrying, onRetry]);

  const handleCopyTrace = useCallback(() => {
    navigator.clipboard?.writeText(traceId).then(() => {
      setCopiedTrace(true);
      setTimeout(() => setCopiedTrace(false), 2000);
    }).catch(() => {
      // Fallback
      setCopiedTrace(true);
      setTimeout(() => setCopiedTrace(false), 2000);
    });
  }, [traceId]);

  const title = isServerError
    ? "Hệ thống gặp sự cố kết nối tạm thời"
    : "Không tìm thấy nội dung yêu cầu";

  const description = isServerError
    ? "Máy chủ đang gặp tình trạng quá tải hoặc quá trình đồng bộ luồng phát bị gián đoạn. Đội ngũ kỹ thuật đã ghi nhận và đang tự động xử lý."
    : "Đường dẫn bạn yêu cầu không khả dụng. Bộ phim có thể đã thay đổi tên, cập nhật máy chủ phát hoặc liên kết bị gián đoạn.";

  const quickLinks = [
    {
      title: "Kho phim tổng hợp",
      description: "Duyệt tìm danh mục phim mới nhất",
      href: "/films",
      icon: Film,
    },
    {
      title: "Vũ trụ điện ảnh",
      description: "Khám phá 6 vũ trụ & Top 10 thịnh hành",
      href: "/genres",
      icon: Layers,
    },
    {
      title: "Tìm kiếm phim",
      description: "Tra cứu theo diễn viên, tên phim",
      href: "/search",
      icon: Search,
    },
    {
      title: "Gợi ý ngẫu nhiên",
      description: "Chọn ngẫu nhiên một tác phẩm đặc sắc",
      href: "/random",
      icon: Shuffle,
    },
  ];

  return (
    <main
      className={cn(
        cardFont.className,
        "status-page fixed inset-0 z-[1000] flex min-h-[100dvh] w-full flex-col overflow-y-auto bg-[#08090d] text-white selection:bg-[#23ade5]/30 selection:text-white [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]",
      )}
    >
      {/* ══ TOP BRAND HEADER ════════════════════════════════════════════ */}
      <header className="relative z-20 w-full shrink-0 border-b border-white/[0.06] bg-[#08090d]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
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
                className="h-8 w-8 object-contain drop-shadow-[0_0_12px_rgba(168,85,247,0.35)] transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/flexphim-logo.png";
                }}
              />
            </div>
            <span
              className={cn(
                logoFont.className,
                "text-[22px] font-bold uppercase tracking-[-0.01em] text-white sm:text-[24px] leading-none",
              )}
            >
              Flex
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-300 bg-clip-text text-transparent">
                Phim
              </span>
            </span>
          </Link>

          {/* System status pill */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-mono text-neutral-300 backdrop-blur-md">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isServerError
                    ? "bg-rose-500 animate-ping"
                    : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
                )}
              />
              <span className="hidden sm:inline">
                {isServerError ? "TRẠNG THÁI MẠNG: GIÁN ĐOẠN" : "TRẠNG THÁI: TRỰC TUYẾN"}
              </span>
              <span className="sm:hidden">{code}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ══ AMBIENT BACKGROUND EFFECTS ══════════════════════════════════ */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Subtle radial spotlight */}
        <div
          className={cn(
            "absolute left-1/2 top-1/4 h-[380px] w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px]",
            isServerError
              ? "bg-rose-500/[0.07]"
              : "bg-[#23ade5]/[0.08]",
          )}
        />
        {/* Architectural hairline grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_40%,#000_65%,transparent_100%)]" />
      </div>

      {/* ══ MAIN HERO CONTENT ═══════════════════════════════════════════ */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-16 text-center">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center">

          {/* Engineering Protocol Badge */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1 text-xs font-mono text-neutral-300 shadow-sm backdrop-blur-md">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isServerError ? "bg-rose-500 animate-pulse" : "bg-[#23ade5] animate-pulse",
              )}
            />
            <span className="tracking-wide">
              {isServerError ? "HTTP 500 // INTERNAL_SERVER_ERROR" : "HTTP 404 // NOT_FOUND"}
            </span>
          </div>

          {/* Sculptural Display Numerals with Cinematic Aperture Accent */}
          <div className="relative my-1 flex items-center justify-center select-none">
            {/* Background aperture ring vectors */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-25">
              <svg
                className="h-[280px] w-[280px] sm:h-[360px] sm:w-[360px] animate-[spin_60s_linear_infinite]"
                viewBox="0 0 200 200"
                fill="none"
              >
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  stroke={isServerError ? "#ef4444" : "#23ade5"}
                  strokeWidth="0.75"
                  strokeDasharray="4 6"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="65"
                  stroke="#ffffff"
                  strokeWidth="0.5"
                  strokeDasharray="2 8"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="98"
                  stroke="#ffffff"
                  strokeWidth="0.5"
                  opacity="0.3"
                />
              </svg>
            </div>

            {/* Giant Monospace Display Digits */}
            <h1
              className="relative text-[7.5rem] font-black tracking-tighter leading-none text-transparent sm:text-[11rem] md:text-[13rem] bg-gradient-to-b from-white via-white/80 to-white/10 bg-clip-text drop-shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
            >
              {code}
            </h1>
          </div>

          {/* Heading & Subtext */}
          <h2 className="mb-3 text-xl font-extrabold tracking-tight text-white sm:text-2xl md:text-3xl">
            {title}
          </h2>
          <p className="mb-8 max-w-lg text-xs leading-relaxed text-neutral-400 sm:text-sm">
            {description}
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {isServerError ? (
              <>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#23ade5] px-6 text-sm font-bold text-black shadow-lg shadow-[#23ade5]/20 transition-all duration-200 hover:bg-[#1fb8f8] active:scale-[0.98] disabled:opacity-60"
                >
                  <RotateCcw size={16} className={cn(isRetrying && "animate-spin")} />
                  <span>{isRetrying ? "Đang kết nối lại..." : "Thử kết nối lại"}</span>
                </button>
                <Link
                  href="/"
                  className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 text-sm font-semibold text-neutral-200 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white active:scale-[0.98]"
                >
                  <Home size={16} />
                  <span>Về Trang chủ</span>
                </Link>
                <Link
                  href="/bao-loi"
                  className="inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-4 text-xs font-semibold text-neutral-400 transition-all duration-200 hover:bg-white/[0.06] hover:text-white active:scale-[0.98]"
                >
                  <ShieldAlert size={14} />
                  <span>Báo lỗi</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/"
                  className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-black shadow-lg shadow-white/5 transition-all duration-200 hover:bg-neutral-200 active:scale-[0.98]"
                >
                  <Home size={16} />
                  <span>Về Trang chủ</span>
                </Link>
                <Link
                  href="/films"
                  className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 text-sm font-semibold text-neutral-200 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white active:scale-[0.98]"
                >
                  <SlidersHorizontal size={16} />
                  <span>Duyệt tìm kho phim</span>
                </Link>
              </>
            )}
          </div>

          {/* ══ CONTENT MATRIX FOR 404 ═══════════════════════════════════ */}
          {!isServerError && (
            <div className="mt-12 w-full max-w-3xl">
              <div className="mb-3 flex items-center justify-between px-1 text-left">
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                  Điểm đến gợi ý
                </span>
                <span className="text-[11px] text-neutral-600">
                  FlexPhim Catalog
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {quickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex flex-col justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 text-left transition-all duration-200 hover:border-white/20 hover:bg-white/[0.05] active:scale-[0.98]"
                    >
                      <div>
                        <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#23ade5] transition-colors group-hover:border-[#23ade5]/30 group-hover:bg-[#23ade5]/10">
                          <Icon size={16} />
                        </div>
                        <h3 className="text-xs font-bold text-white transition-colors group-hover:text-[#23ade5]">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-[11px] leading-snug text-neutral-400">
                          {item.description}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center text-[10.5px] font-medium text-neutral-500 transition-colors group-hover:text-white">
                        <span>Truy cập</span>
                        <ArrowRight size={12} className="ml-1 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ DIAGNOSTIC TRACE CONSOLE FOR 500 ════════════════════════ */}
          {isServerError && (
            <div className="mt-10 w-full max-w-xl text-left">
              <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/40 backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-3.5 py-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                    <Terminal size={14} className="text-rose-400" />
                    <span>DIAGNOSTIC_TRACE</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-500">
                    <Activity size={12} className="text-emerald-400" />
                    <span>PoP Edge Active</span>
                  </div>
                </div>

                <div className="p-3.5 font-mono text-xs text-neutral-300">
                  <div className="flex items-center justify-between gap-2 py-1">
                    <span className="text-neutral-500">TRACE_ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#23ade5] select-all">{traceId}</span>
                      <button
                        type="button"
                        onClick={handleCopyTrace}
                        aria-label="Sao chép mã chẩn đoán"
                        className="rounded p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        {copiedTrace ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-1">
                    <span className="text-neutral-500">SERVER_NODE:</span>
                    <span className="text-neutral-400">api.flexphim.vn (Cluster Edge)</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-1">
                    <span className="text-neutral-500">PROTOCOL:</span>
                    <span className="text-neutral-400">HTTP/2 TLS 1.3 - HLS Relay</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ══ MINIMALIST FOOTER ════════════════════════════════════════════ */}
      <footer className="relative z-10 w-full shrink-0 border-t border-white/[0.06] bg-[#08090d]/60 py-4 text-xs text-neutral-500">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6">
          <p>&copy; 2026 FlexPhim. Nền tảng xem phim trực tuyến.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/terms" className="transition-colors hover:text-neutral-300">
              Điều khoản
            </Link>
            <span className="text-neutral-700">&bull;</span>
            <Link href="/privacy" className="transition-colors hover:text-neutral-300">
              Bảo mật
            </Link>
            <span className="text-neutral-700">&bull;</span>
            <Link href="/bao-loi" className="transition-colors hover:text-neutral-300">
              Báo lỗi kỹ thuật
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
