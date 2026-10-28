"use client";

import Image from "next/image";
import {
  RotateCcw,
  ShieldCheck,
  Wrench,
  ExternalLink,
  Lock,
  X,
  KeyRound,
} from "lucide-react";
import type { PublicSiteConfiguration } from "@/lib/api";
import { cardFont, logoFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

function TelegramIcon({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M9.78 18.65l.28-4.2 7.64-6.88c.34-.31-.07-.48-.52-.19l-9.45 5.95-4.07-1.27c-.89-.28-.91-.88.19-1.31L19.8 4.63c.74-.28 1.39.18 1.15 1.31l-2.7 12.72c-.2 1-.79 1.25-1.6.78l-4.52-3.33-2.18 2.1c-.24.24-.44.44-.9.44z" />
    </svg>
  );
}

interface MaintenanceOverlayProps {
  config: PublicSiteConfiguration | undefined;
  isAdmin: boolean;
  handleManualCheck: () => Promise<void>;
  isChecking: boolean;
  showAdminModal: boolean;
  setShowAdminModal: (show: boolean) => void;
  bypassPasscode: string;
  setBypassPasscode: (code: string) => void;
  passcodeError: string;
  handleVerifyPasscode: (e: React.FormEvent) => void;
  openAuthModal: (mode: "login" | "register") => void;
}

export function MaintenanceOverlay({
  config,
  isAdmin,
  handleManualCheck,
  isChecking,
  showAdminModal,
  setShowAdminModal,
  bypassPasscode,
  setBypassPasscode,
  passcodeError,
  handleVerifyPasscode,
  openAuthModal,
}: MaintenanceOverlayProps) {
  // Case 1: Maintenance is active AND user is an authorized admin
  if (isAdmin) {
    return (
      <aside
        role="alert"
        className={cn(
          cardFont.className,
          "fixed top-0 inset-x-0 z-[99999] flex items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-amber-950/95 via-red-950/95 to-amber-950/95 border-b border-amber-500/40 text-white shadow-2xl backdrop-blur-xl text-xs sm:text-sm select-none",
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <span className="font-bold text-amber-200 truncate">
            Chế độ bảo trì ĐANG BẬT: Khách xem phim đang bị tạm khóa toàn bộ.
          </span>
          <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-semibold border border-amber-500/30">
            <ShieldCheck size={13} />
            Đặc quyền Admin
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isChecking}
            title="Kiểm tra lại cấu hình"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <RotateCcw size={14} className={cn(isChecking && "animate-spin")} />
          </button>
          <a
            href="https://film-site-admin.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-colors cursor-pointer"
          >
            <span>Trang Admin</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </aside>
    );
  }

  // Case 2: Maintenance is active AND user is a normal visitor -> FULL SITE SHUTDOWN WALL
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Thông báo bảo trì hệ thống"
      className={cn(
        cardFont.className,
        "fixed inset-0 z-[999999] flex flex-col items-center justify-center p-4 sm:p-6 bg-[#07080d] text-white select-none overflow-y-auto",
      )}
    >
      {/* Ambient Nebula Lighting Effects */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-amber-500/15 via-violet-600/10 to-transparent blur-[140px] rounded-full"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-t from-violet-600/15 to-transparent blur-[140px] rounded-full"
      />

      <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col items-center text-center space-y-6">
        {/* Logo Brand Header */}
        <div className="flex items-center gap-2.5">
          <Image
            src="/flexphim-logo.svg"
            alt="FlexPhim"
            width={42}
            height={42}
            className="rounded-xl drop-shadow-[0_0_20px_rgba(168,85,247,0.6)]"
            priority
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/flexphim-logo.png";
            }}
          />
          <span
            className={cn(
              logoFont.className,
              "text-[30px] sm:text-[36px] font-bold uppercase tracking-[-0.01em] text-white select-none leading-none",
            )}
          >
            Flex
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(168,85,247,0.5)]">
              Phim
            </span>
          </span>
        </div>

        {/* Animated Mascot / System Maintenance Shield */}
        <div className="relative my-2">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-amber-500/20 via-violet-600/20 to-neutral-900 border border-amber-500/30 flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(245,158,11,0.25)]">
            <Wrench
              size={54}
              className="text-amber-400 stroke-[1.8] animate-bounce [animation-duration:2.5s]"
            />
          </div>
          {/* Pulsing beacon glow */}
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-5 w-5 bg-amber-500 border-2 border-[#07080d]" />
          </span>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-bold tracking-wide shadow-sm">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>HỆ THỐNG ĐANG BẢO TRÌ NÂNG CẤP</span>
        </div>

        {/* Main Title & Notice */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            Website Đang Tạm Dừng Để Bảo Trì
          </h1>
          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-md mx-auto">
            {config?.maintenanceNotice ||
              "Chúng tôi đang tiến hành nâng cấp hệ thống máy chủ và tối ưu hóa hạ tầng phát sóng để mang lại trải nghiệm xem phim hoàn hảo nhất cho bạn. Toàn bộ kho phim sẽ mở lại ngay sau khi hoàn tất. Xin cảm ơn quý khán giả đã kiên nhẫn đồng hành!"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isChecking}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-extrabold text-sm transition-all shadow-[0_10px_25px_rgba(124,58,237,0.4)] cursor-pointer"
          >
            <RotateCcw size={16} className={cn(isChecking && "animate-spin")} />
            <span>{isChecking ? "Đang kiểm tra…" : "Kiểm tra lại ngay"}</span>
          </button>

          <a
            href="https://t.me/+ijCR1KCdx2E0ZTA9"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/15 text-neutral-200 hover:text-white font-bold text-sm transition-all cursor-pointer"
          >
            <TelegramIcon className="text-[#229ED9]" size={18} />
            <span>Kênh Telegram</span>
          </a>
        </div>

        {/* Auto Refresh Hint & Admin Bypass Trigger */}
        <div className="pt-4 flex flex-col items-center gap-2 text-xs text-neutral-500">
          <p className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 animate-pulse" />
            Tự động kiểm tra lại sau mỗi 12 giây
          </p>

          <button
            type="button"
            onClick={() => setShowAdminModal(true)}
            className="inline-flex items-center gap-1 text-[11px] text-neutral-600 hover:text-neutral-400 hover:underline transition-colors mt-1 cursor-pointer"
          >
            <Lock size={11} />
            <span>Dành cho Quản trị viên (Admin)</span>
          </button>
        </div>
      </div>

      {/* ── Admin Login & Passcode Bypass Modal ── */}
      {showAdminModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-sm rounded-2xl border border-white/15 bg-neutral-900/95 p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <KeyRound size={18} className="text-violet-400" />
                <span>Xác thực Quản trị viên</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Nếu bạn là quản trị viên hệ thống, vui lòng đăng nhập tài khoản Admin hoặc nhập mã truy cập để vào trang web.
            </p>

            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowAdminModal(false);
                  openAuthModal("login");
                }}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Đăng nhập với tài khoản Admin
              </button>

              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-white/10" />
                <span className="absolute px-2 bg-neutral-900 text-[10px] text-neutral-500 uppercase tracking-wider">
                  Hoặc nhập mã
                </span>
              </div>

              <form onSubmit={handleVerifyPasscode} className="space-y-2.5">
                <input
                  type="password"
                  value={bypassPasscode}
                  onChange={(e) => setBypassPasscode(e.target.value)}
                  placeholder="Nhập mã truy cập nhanh…"
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
                {passcodeError && (
                  <p className="text-[11px] text-red-400 font-medium">
                    {passcodeError}
                  </p>
                )}
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Mở khóa quyền Admin
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
