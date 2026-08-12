"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sliders,
  Tv,
  Subtitles,
  Volume2,
  Bell,
  Trash2,
  Check,
  ArrowLeft,
  User,
  ShieldCheck,
  Sparkles,
  Zap,
  RotateCcw,
  HardDrive,
} from "lucide-react";
import { useSettingsStore, QualitySetting, ServerSetting, SubtitleLangSetting, SubtitleSizeSetting, SubtitleColorSetting, AudioModeSetting } from "@/store/settingsStore";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";
import { cardFont } from "@/lib/fonts";

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
        checked ? "bg-[#e50914]" : "bg-white/10"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const {
    autoplay,
    autoNextEpisode,
    theaterMode,
    defaultQuality,
    defaultServer,
    subtitleLang,
    subtitleSize,
    subtitleColor,
    audioMode,
    newMovieNotifications,
    commentNotifications,
    setAutoplay,
    setAutoNextEpisode,
    setTheaterMode,
    setDefaultQuality,
    setDefaultServer,
    setSubtitleLang,
    setSubtitleSize,
    setSubtitleColor,
    setAudioMode,
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
      nextVal ? "success" : "info"
    );
  };

  const handleToggleCommentNotif = () => {
    const nextVal = !commentNotifications;
    setCommentNotifications(nextVal);
    toast(
      nextVal
        ? "Đã bật thông báo phản hồi bình luận!"
        : "Đã tắt thông báo bình luận",
      nextVal ? "success" : "info"
    );
  };

  return (
    <div className={cn("min-h-screen bg-[#141414] text-white select-none", cardFont.className)}>
      <div className="mx-auto max-w-[1100px] px-4 sm:px-8 pt-24 pb-28">

        {/* ── PAGE HEADER ── */}
        <div className="mb-8 border-b border-white/[0.07] pb-6">
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
            <Link href="/" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <ArrowLeft size={12} /> Trang chủ
            </Link>
            <span>/</span>
            <span className="text-neutral-300">Cài đặt trải nghiệm</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl flex items-center gap-2.5">
                <Sliders className="h-7 w-7 text-[#e50914]" /> Cài đặt trải nghiệm
              </h1>
              <p className="mt-1.5 text-sm text-neutral-400">
                Quản lý nhận thông báo tự động và dọn dẹp dữ liệu lưu trữ trên trình duyệt.
              </p>
            </div>

            {/* Quick Link to Profile */}
            {user && (
              <Link
                href={`/user/${encodeURIComponent(user.username)}`}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-neutral-300 transition-colors"
              >
                <User size={14} /> Hồ sơ
              </Link>
            )}
          </div>
        </div>

        {/* ── MAIN SETTINGS GRID ── */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">

          {/* 🔔 SECTION 3: THÔNG BÁO & TƯƠNG TÁC */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
              <Bell size={14} className="text-emerald-400" /> Thông báo & Tương tác
            </div>

            <div className="rounded-2xl border border-white/10 bg-black p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-sm font-bold text-white block">Thông báo phim cập nhật</label>
                  <span className="text-xs text-neutral-500">Nhận thông báo khi bộ phim trong Tủ Phim có tập mới.</span>
                </div>
                <Toggle checked={newMovieNotifications} onChange={handleToggleNewMovieNotif} />
              </div>

              <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/[0.06]">
                <div>
                  <label className="text-sm font-bold text-white block">Thông báo phản hồi bình luận</label>
                  <span className="text-xs text-neutral-500">Nhận thông báo khi có người trả lời thảo luận của bạn.</span>
                </div>
                <Toggle checked={commentNotifications} onChange={handleToggleCommentNotif} />
              </div>
            </div>
          </div>

          {/* 🧹 SECTION 4: BỘ NHỚ ĐỆM & GIẢI PHÓNG DỮ LIỆU */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
              <HardDrive size={14} className="text-violet-400" /> Bộ nhớ đệm & Giải phóng dung lượng
            </div>

            <div className="rounded-2xl border border-white/10 bg-black p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-sm font-bold text-white block">Xóa cache trình phát phim</label>
                  <span className="text-xs text-neutral-500">Giải phóng dung lượng trình duyệt và khắc phục sự cố tải video.</span>
                </div>
                <button
                  onClick={handleClearCache}
                  disabled={clearingCache}
                  className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] text-xs font-bold text-white px-4 py-2.5 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {clearingCache ? <RotateCcw size={14} className="animate-spin text-red-400" /> : <Trash2 size={14} className="text-neutral-400" />}
                  Xóa Cache
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/[0.06]">
                <div>
                  <label className="text-sm font-bold text-white block">Xóa lịch sử tìm kiếm phim</label>
                  <span className="text-xs text-neutral-500">Xóa danh sách các từ khóa bạn đã tra cứu trên thanh tìm kiếm.</span>
                </div>
                <button
                  onClick={handleClearSearchHistory}
                  disabled={clearingSearch}
                  className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] text-xs font-bold text-white px-4 py-2.5 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {clearingSearch ? <RotateCcw size={14} className="animate-spin text-red-400" /> : <Trash2 size={14} className="text-neutral-400" />}
                  Xóa Lịch Sử
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
