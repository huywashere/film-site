"use client";

import { useState, startTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sliders,
  Tv,
  Bell,
  HardDrive,
  RotateCcw,
  Trash2,
  ArrowLeft,
  User,
  Sparkles,
  Lock,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";
import { cardFont } from "@/lib/fonts";

type SettingsTab = "all" | "player" | "notifications" | "storage";

// ── Toggle component (Identical to Profile page) ───────────────────
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none",
        checked ? "bg-violet-600" : "bg-white/10",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 shadow-sm",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

// ── Setting row (Identical to Profile page) ────────────────────────
function SettingRow({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-white/[0.06] last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs text-neutral-400 leading-5">{desc}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>("all");

  const {
    autoplay,
    autoNextEpisode,
    theaterMode,
    newMovieNotifications,
    commentNotifications,
    setAutoplay,
    setAutoNextEpisode,
    setTheaterMode,
    setNewMovieNotifications,
    setCommentNotifications,
  } = useSettingsStore();

  const [clearingCache, setClearingCache] = useState(false);
  const [clearingSearch, setClearingSearch] = useState(false);

  const handleClearCache = () => {
    setClearingCache(true);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        if (window.caches) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
        sessionStorage.clear();
        window.dispatchEvent(new Event("player_cache_cleared"));
      }
      setClearingCache(false);
      toast("Đã dọn dẹp bộ nhớ đệm trình phát phim thành công!", "success");
    }, 600);
  };

  const handleClearSearchHistory = () => {
    setClearingSearch(true);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("cineverse_search_history");
        window.dispatchEvent(new Event("search_history_cleared"));
      }
      setClearingSearch(false);
      toast("Đã xóa toàn bộ lịch sử tìm kiếm phim!", "success");
    }, 400);
  };

  const handleToggleNewMovieNotif = () => {
    const nextVal = !newMovieNotifications;
    setNewMovieNotifications(nextVal);
    toast(
      nextVal
        ? "Đã bật nhận thông báo phim tập mới!"
        : "Đã tắt thông báo phim cập nhật",
      nextVal ? "success" : "info",
    );
  };

  const handleToggleCommentNotif = () => {
    const nextVal = !commentNotifications;
    setCommentNotifications(nextVal);
    toast(
      nextVal
        ? "Đã bật thông báo phản hồi bình luận!"
        : "Đã tắt thông báo bình luận",
      nextVal ? "success" : "info",
    );
  };

  const TABS = [
    { id: "all" as const, label: "Tất cả cài đặt", icon: Sliders },
    { id: "player" as const, label: "Trình phát phim", icon: Tv },
    { id: "notifications" as const, label: "Thông báo & Tương tác", icon: Bell },
    { id: "storage" as const, label: "Bộ nhớ & Lưu trữ", icon: HardDrive },
  ];

  return (
    <main
      className={cn(
        "min-h-screen bg-[#141414] text-white select-none",
        cardFont.className,
      )}
    >
      <div className="mx-auto max-w-[1300px] px-4 sm:px-8 pt-24 pb-28">
        {/* ── TOP BAR: BACK BUTTON ── */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/");
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-white/[0.08] hover:border-white/20 cursor-pointer active:scale-95"
          >
            <ArrowLeft size={14} />
            <span>Quay lại</span>
          </button>
        </div>

        {/* ── HEADER IDENTIFICATION BAR ── */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6 pb-6 border-b border-white/[0.08]">
          <div className="relative shrink-0">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-2 border-white/20 bg-[#161618] shadow-xl flex items-center justify-center text-white">
              <Sliders className="h-10 w-10 text-neutral-200" strokeWidth={1.8} />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-1">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Cài đặt trải nghiệm
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-0.5 text-[11px] font-medium text-neutral-300">
                  <Sparkles size={11} className="text-violet-400" /> Hệ thống
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-400">
                Tùy chỉnh thông báo, trải nghiệm trình phát và quản lý dữ liệu lưu trữ trình duyệt.
              </p>
            </div>

            {/* Link to Profile */}
            {user && (
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  href={`/user/${encodeURIComponent(user.username || user.id)}`}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer active:scale-95"
                >
                  <User size={13} /> Hồ sơ cá nhân
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── MAIN WORKSPACE (MATCHING PROFILE DASHBOARD) ── */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 py-6 pb-28">
          {/* ── MOBILE IN-FLOW TAB BAR ── */}
          <div className="lg:hidden w-full overflow-x-auto scrollbar-none flex gap-2 pb-2 mb-2 border-b border-white/[0.08]">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => startTransition(() => setActiveTab(tab.id))}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all shrink-0 active:scale-95",
                    isActive
                      ? "text-white bg-white/15 border border-white/20 shadow-sm"
                      : "text-neutral-400 hover:text-white bg-white/[0.03] border border-white/[0.06]",
                  )}
                >
                  <Icon
                    size={14}
                    className={
                      isActive ? "text-violet-400" : "text-neutral-400"
                    }
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── LEFT SIDEBAR (Desktop) ── */}
          <aside className="hidden lg:block w-60 shrink-0 sticky top-24 self-start">
            <div className="space-y-5 rounded-2xl border border-white/10 bg-[#161618] p-3.5 shadow-xl">
              <div>
                <p className="px-2.5 mb-2 text-[10px] font-bold tracking-[0.1em] text-neutral-500 uppercase">
                  Danh mục cài đặt
                </p>
                <div className="space-y-1">
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() =>
                          startTransition(() => setActiveTab(tab.id))
                        }
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-[0.98]",
                          isActive
                            ? "bg-white/15 text-white shadow-sm border border-white/10"
                            : "text-neutral-400 hover:text-white hover:bg-white/[0.04]",
                        )}
                      >
                        <Icon
                          size={15}
                          className={
                            isActive ? "text-violet-400" : "text-neutral-400"
                          }
                        />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account Security Quick Link */}
              {user && (
                <div className="pt-3 border-t border-white/[0.06]">
                  <p className="px-2.5 mb-2 text-[10px] font-bold tracking-[0.1em] text-neutral-500 uppercase">
                    Tài khoản
                  </p>
                  <Link
                    href={`/user/${encodeURIComponent(user.username || user.id)}?tab=security`}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                  >
                    <Lock size={15} className="text-neutral-400" />
                    <span>Bảo mật & Mật khẩu</span>
                  </Link>
                </div>
              )}
            </div>
          </aside>

          {/* ── RIGHT MAIN CONTENT AREA ── */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* 1. TRÌNH PHÁT PHIM */}
            {(activeTab === "all" || activeTab === "player") && (
              <div className="animate-fade-in space-y-5 rounded-2xl border border-white/10 bg-[#161618] p-5 sm:p-7 shadow-xl">
                <div className="border-b border-white/[0.07] pb-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
                    <Tv className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Trình phát phim
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Tùy chỉnh các hành vi mặc định khi xem phim trên NetPhim.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.06]">
                  <div className="px-5">
                    <SettingRow
                      title="Tự động phát (Autoplay)"
                      desc="Tự động chạy phim ngay khi mở trang xem."
                      checked={autoplay}
                      onChange={() => setAutoplay(!autoplay)}
                    />
                    <SettingRow
                      title="Tự động chuyển tập tiếp theo"
                      desc="Chuyển sang tập kế tiếp khi tập hiện tại kết thúc."
                      checked={autoNextEpisode}
                      onChange={() => setAutoNextEpisode(!autoNextEpisode)}
                    />
                    <SettingRow
                      title="Chế độ rạp chiếu (Theater Mode)"
                      desc="Mặc định mở rộng trình phát tràn màn hình."
                      checked={theaterMode}
                      onChange={() => setTheaterMode(!theaterMode)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. THÔNG BÁO & TƯƠNG TÁC */}
            {(activeTab === "all" || activeTab === "notifications") && (
              <div className="animate-fade-in space-y-5 rounded-2xl border border-white/10 bg-[#161618] p-5 sm:p-7 shadow-xl">
                <div className="border-b border-white/[0.07] pb-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
                    <Bell className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Thông báo & Tương tác
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Cài đặt nhận thông báo cập nhật tập mới và phản hồi bình luận.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.06]">
                  <div className="px-5">
                    <SettingRow
                      title="Thông báo phim cập nhật"
                      desc="Nhận thông báo khi bộ phim trong Tủ Phim có tập mới."
                      checked={newMovieNotifications}
                      onChange={handleToggleNewMovieNotif}
                    />
                    <SettingRow
                      title="Thông báo phản hồi bình luận"
                      desc="Nhận thông báo khi có người trả lời thảo luận của bạn."
                      checked={commentNotifications}
                      onChange={handleToggleCommentNotif}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. BỘ NHỚ ĐỆM & LƯU TRỮ */}
            {(activeTab === "all" || activeTab === "storage") && (
              <div className="animate-fade-in space-y-5 rounded-2xl border border-white/10 bg-[#161618] p-5 sm:p-7 shadow-xl">
                <div className="border-b border-white/[0.07] pb-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
                    <HardDrive className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Bộ nhớ đệm & Lưu trữ
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Giải phóng dung lượng trình duyệt và làm mới dữ liệu tìm kiếm.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.06]">
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Xóa cache trình phát phim
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-400 leading-5">
                        Giải phóng dung lượng trình duyệt và khắc phục sự cố tải video khi xem.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearCache}
                      disabled={clearingCache}
                      className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-white px-4 py-2.5 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 active:scale-95"
                    >
                      {clearingCache ? (
                        <RotateCcw size={14} className="animate-spin text-violet-400" />
                      ) : (
                        <Trash2 size={14} className="text-neutral-400" />
                      )}
                      <span>Xóa Cache</span>
                    </button>
                  </div>

                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Xóa lịch sử tìm kiếm phim
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-400 leading-5">
                        Xóa danh sách các từ khóa bạn đã tra cứu trên thanh tìm kiếm.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSearchHistory}
                      disabled={clearingSearch}
                      className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-white px-4 py-2.5 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 active:scale-95"
                    >
                      {clearingSearch ? (
                        <RotateCcw size={14} className="animate-spin text-violet-400" />
                      ) : (
                        <Trash2 size={14} className="text-neutral-400" />
                      )}
                      <span>Xóa Lịch Sử</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
