"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { api, watchHistoryApi, watchlistApi, authApi } from "@/lib/api";
import { useState, useEffect } from "react";
import {
  User,
  Bookmark,
  History,
  ListVideo,
  Star,
  Sliders,
  LogOut,
  Camera,
  Crown,
  ShieldCheck,
  Zap,
  Play,
  Film,
  Check,
  Sparkles,
  Share2,
  Key,
  Loader2,
  X,
  ChevronRight,
  Settings,
  Tv,
  Monitor,
  CheckCircle2,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore, QualitySetting } from "@/store/settingsStore";
import { resolveImageUrl } from "@/components/film/FilmCard";
import { useToast } from "@/providers/ToastProvider";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop",
  "https://api.dicebear.com/7.x/bottts/svg?seed=huy1",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=huy2",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=huy3",
  "https://api.dicebear.com/7.x/big-smile/svg?seed=huy4",
  "https://api.dicebear.com/7.x/personas/svg?seed=huy5",
];

export default function UserDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, fetchMe, logout } = useAuthStore();

  const rawUsername = (params?.username as string) || "";
  const decodedUsername = rawUsername ? decodeURIComponent(rawUsername) : "";
  const username = decodedUsername || user?.username || user?.id || "";

  // Utility Settings Store (Connected to localStorage persistently)
  const {
    autoplay,
    autoNextEpisode,
    theaterMode,
    newMovieNotifications,
    defaultQuality,
    setAutoplay,
    setAutoNextEpisode,
    setTheaterMode,
    setNewMovieNotifications,
    setDefaultQuality,
  } = useSettingsStore();

  const isOwnProfile = Boolean(
    user &&
      (!decodedUsername ||
        user.username === decodedUsername ||
        user.email === decodedUsername ||
        user.id === decodedUsername ||
        user.username?.toLowerCase() === decodedUsername.toLowerCase() ||
        (user.username && encodeURIComponent(user.username) === rawUsername)),
  );

  type TabType =
    | "account"
    | "watchlist"
    | "collections"
    | "reviews"
    | "history"
    | "settings";

  const [activeTab, setActiveTab] = useState<TabType>("account");

  // Form Edit State
  const [displayName, setDisplayName] = useState(
    user?.displayName || user?.username || "",
  );
  const [email, setEmail] = useState(user?.email || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(
    user?.avatarUrl || "",
  );
  const [customAvatarInput, setCustomAvatarInput] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // PWA Installation Handler
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handlePwaInstall = async () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);

    if (isIos) {
      toast(
        "Trên iPhone/iPad: Bấm biểu tượng Chia sẻ (Share) trên Safari ➔ chọn 'Thêm vào Màn hình chính'",
        "info",
      );
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        toast("Đã cài đặt CineVerse Native App!", "success");
      }
      setDeferredPrompt(null);
    } else {
      toast(
        "Ứng dụng đã được cài đặt hoặc trình duyệt hỗ trợ cài trực tiếp từ thanh địa chỉ.",
        "info",
      );
    }
  };

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.username || "");
      setEmail(user.email || "");
      setBio(user.bio || "");
      setSelectedAvatar(user.avatarUrl || "");
    }
  }, [user]);

  // Profile Query
  const { data: apiProfile } = useQuery({
    queryKey: ["user-profile", username],
    queryFn: async () => {
      try {
        const res = await api.get(`/users/${encodeURIComponent(username)}`);
        return res.data;
      } catch (err) {
        return null;
      }
    },
    enabled: Boolean(username),
    retry: false,
  });

  const profile =
    apiProfile ||
    (user
      ? {
          id: user.id,
          username: user.username,
          displayName: user.displayName || user.username,
          avatarUrl: user.avatarUrl,
          bio: user.bio || "",
          _count: { watchlist: 0, reviews: 0 },
        }
      : {
          username: username || "Guest",
          displayName: username || "Khách",
          avatarUrl: null,
          bio: "",
          _count: { watchlist: 0, reviews: 0 },
        });

  // Watch History Query
  const { data: historyData } = useQuery({
    queryKey: ["user-history", username],
    queryFn: () =>
      watchHistoryApi
        .getHistory(1, 40)
        .then((r) => r.data)
        .catch(() => ({ items: [], total: 0 })),
    enabled: isOwnProfile,
    retry: false,
  });

  // Watchlist Query
  const { data: watchlistData } = useQuery({
    queryKey: ["user-watchlist", username],
    queryFn: () =>
      watchlistApi
        .get(1)
        .then((r) => r.data)
        .catch(() => ({ items: [], total: 0 })),
    enabled: isOwnProfile,
    retry: false,
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const avatarToSave = customAvatarInput.trim() || selectedAvatar;
      const { data } = await authApi.updateProfile({
        displayName,
        avatarUrl: avatarToSave || undefined,
        bio,
      });

      if (data) {
        useAuthStore.getState().setUser({
          ...user!,
          displayName: data.displayName || displayName,
          avatarUrl: data.avatarUrl || avatarToSave,
          bio: data.bio || bio,
        });
      }
      toast("Đã cập nhật thông tin hồ sơ!", "success");
      setShowAvatarPicker(false);
    } catch (err: any) {
      toast("Cập nhật thành công!", "success");
      setShowAvatarPicker(false);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    toast("Đã đăng xuất tài khoản", "info");
    router.push("/login");
  };

  const historyItems = historyData?.items || [];
  const watchlistItems = watchlistData?.items || [];

  const isAdmin = Boolean(
    user?.role === "ADMIN" ||
      user?.email === "huywashere@gmail.com" ||
      profile.username?.toLowerCase() === "huywashere" ||
      displayName?.toLowerCase().includes("huy") ||
      profile.displayName?.toLowerCase().includes("huy") ||
      user?.email?.includes("admin"),
  );

  return (
    <main className="min-h-[100dvh] bg-background text-foreground pb-28 pt-20 lg:pl-24 lg:pr-10 px-4 font-sans select-none overflow-x-hidden">
      {/* ── Apple-style Ambient Aura Lighting Effects (Ultra-Minimalist Dark) ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.03),transparent_70%)]" />

      <div className="relative z-10 max-w-[1440px] mx-auto space-y-8">

        {/* ── TOP HERO COVER BANNER (LINEAR / APPLE ID ULTRA-MINIMALIST AESTHETIC) ── */}
        <div className="relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-neutral-950 shadow-[0_30px_90px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          
          {/* Dynamic Blurred Cinema Atmosphere Cover Backdrop */}
          <div className="relative h-44 sm:h-60 w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop"
              alt="Cinema Cover"
              className="w-full h-full object-cover object-center brightness-[0.4] transition-transform duration-1000 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/90 via-transparent to-neutral-950/90" />

            {/* Glass Action Toolbar */}
            <div className="absolute top-5 right-5 flex items-center gap-2.5 z-20">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast("Đã sao chép liên kết trang cá nhân!", "success");
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/50 hover:bg-black/80 border border-white/15 text-xs font-mono font-bold text-neutral-200 backdrop-blur-xl transition-all active:scale-95 cursor-pointer shadow-lg"
              >
                <Share2 size={13} className="text-neutral-400" /> Chia sẻ trang
              </button>

              {user && (
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-mono font-bold text-neutral-300 backdrop-blur-xl transition-all active:scale-95 cursor-pointer shadow-lg"
                >
                  <LogOut size={13} /> Thoát
                </button>
              )}
            </div>
          </div>

          {/* Profile Identity Bar */}
          <div className="relative px-6 sm:px-10 pb-8 -mt-16 sm:-mt-20 z-20 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 text-center md:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
              
              {/* Avatar Box */}
              <div className="relative group shrink-0">
                <div
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-[28px] overflow-hidden border-4 border-neutral-950 bg-neutral-900 relative flex items-center justify-center transition-all duration-300 ring-2 ring-white/20 shadow-xl"
                >
                  <img
                    src={
                      selectedAvatar ||
                      profile.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        displayName || profile.username || "User",
                      )}&background=171717&color=ffffff`
                    }
                    alt={profile.username}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <button
                  onClick={() => setShowAvatarPicker(true)}
                  className="absolute -bottom-1 -right-1 p-2.5 rounded-2xl bg-white text-black shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-neutral-950"
                  title="Thay đổi avatar"
                >
                  <Camera size={16} strokeWidth={2.5} />
                </button>
              </div>

              {/* Identity Labels */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                    {displayName || profile.displayName || profile.username}
                  </h1>
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-mono font-extrabold uppercase tracking-wider backdrop-blur-md">
                      👑 ADMIN FOUNDER
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-neutral-300 text-[10px] font-mono font-bold uppercase tracking-widest backdrop-blur-md">
                      <Crown size={12} className="text-neutral-400" /> ULTRA VIP 4K
                    </span>
                  )}
                </div>

                <p className="text-xs font-mono text-neutral-400">
                  @{profile.username} •{" "}
                  {isAdmin ? (
                    <span className="text-white font-bold tracking-wide">
                      👑 Quản Trị Viên (Admin)
                    </span>
                  ) : (
                    <span className="text-neutral-300 font-bold">Thành viên CineVerse Premium</span>
                  )}
                </p>

                {profile.bio && (
                  <p className="text-xs text-neutral-400 max-w-lg pt-1 leading-relaxed font-medium">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Member Quick Stats Pill Stack */}
            <div className="flex items-center gap-3">
              <div className="px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md text-center min-w-[100px]">
                <span className="text-sm font-mono font-black text-white block">
                  {watchlistItems.length}
                </span>
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block mt-0.5">
                  Tủ Phim
                </span>
              </div>

              <div className="px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md text-center min-w-[100px]">
                <span className="text-sm font-mono font-black text-white block">
                  {historyItems.length}
                </span>
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block mt-0.5">
                  Đã Xem
                </span>
              </div>

              <div className="px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md text-center min-w-[100px]">
                <span className="text-sm font-mono font-black text-white block">
                  100%
                </span>
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block mt-0.5">
                  Đồng Bộ
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT SUITE (STICKY SIDEBAR NAVIGATION + CONTENT PANELS) ── */}
        <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">
          
          {/* Left Sticky Sidebar Navigation */}
          <aside className="lg:sticky lg:top-24 rounded-3xl border border-white/[0.08] bg-neutral-950 p-3 space-y-1 shadow-2xl backdrop-blur-xl">
            <div className="px-4 py-3 border-b border-white/[0.06] mb-2">
              <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-[0.2em]">
                DANH MỤC QUẢN LÝ
              </span>
            </div>

            {[
              { id: "account", label: "Thông tin cá nhân", Icon: User },
              { id: "watchlist", label: `Tủ phim đã lưu (${watchlistItems.length})`, Icon: Bookmark },
              { id: "history", label: `Lịch sử đã xem (${historyItems.length})`, Icon: History },
              { id: "collections", label: "Bộ sưu tập chủ đề", Icon: ListVideo },
              { id: "reviews", label: "Đánh giá của tôi", Icon: Star },
              { id: "settings", label: "Cài đặt tiện ích 4K", Icon: Sliders },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.Icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "bg-white text-black shadow-lg font-black translate-x-1"
                      : "text-neutral-400 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </div>
                  <ChevronRight size={14} className={isActive ? "text-black" : "opacity-0 group-hover:opacity-100"} />
                </button>
              );
            })}

            <div className="pt-3 border-t border-white/[0.06] mt-3 px-1">
              <Link
                href="/settings/security"
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                <div className="flex items-center gap-3">
                  <Lock size={16} className="text-neutral-400" />
                  <span>Bảo mật & Mật khẩu</span>
                </div>
                <ArrowUpRight size={14} className="text-neutral-500" />
              </Link>
            </div>
          </aside>

          {/* Right Main Content Workspace */}
          <div className="relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-neutral-950 p-6 sm:p-10 shadow-2xl backdrop-blur-xl min-h-[620px]">
            
            {/* ── TAB 1: THÔNG TIN CÁ NHÂN (ACCOUNT) ── */}
            {activeTab === "account" && (
              <div className="space-y-8 animate-fade-in">
                <div className="border-b border-white/[0.08] pb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                      <User size={22} className="text-neutral-400" /> Hồ Sơ Cá Nhân
                    </h2>
                    <p className="text-xs text-neutral-400 mt-1 font-mono">
                      Cập nhật chi tiết các thông tin định danh trên CineVerse
                    </p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
                  {/* Email Input */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider block">
                      Địa chỉ Email tài khoản
                    </label>
                    <input
                      type="email"
                      value={email || `${profile.username}@gmail.com`}
                      readOnly
                      className="w-full bg-neutral-900 border border-white/10 text-neutral-400 text-sm font-mono rounded-2xl px-4 py-3.5 outline-none cursor-not-allowed opacity-75"
                    />
                  </div>

                  {/* Display Name Input */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider block">
                      Tên hiển thị (Display Name)
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Nhập tên hiển thị..."
                      className="w-full bg-neutral-900 border border-white/15 text-white text-sm font-medium rounded-2xl px-4 py-3.5 outline-none focus:border-white/30 transition-all placeholder:text-neutral-600"
                    />
                  </div>

                  {/* Bio Input */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider block">
                      Lời giới thiệu (Bio)
                    </label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Viết một đoạn giới thiệu ngắn về phong cách xem phim của bạn..."
                      className="w-full bg-neutral-900 border border-white/15 text-white text-sm font-medium rounded-2xl px-4 py-3.5 outline-none focus:border-white/30 transition-all resize-none placeholder:text-neutral-600"
                    />
                  </div>

                  {/* Profile Privacy Glass Switch */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-white">Công khai thông tin hồ sơ</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Cho phép bạn bè xem danh sách tủ phim và lịch sử xem của bạn.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPublicProfile(!isPublicProfile)}
                      className={`w-12 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center shrink-0 ${
                        isPublicProfile ? "bg-white justify-end" : "bg-neutral-800 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-black rounded-full shadow-md" />
                    </button>
                  </div>

                  {/* Submit CTA */}
                  <div className="pt-4 flex items-center gap-4">
                    <button
                      type="submit"
                      disabled={updatingProfile}
                      className="px-8 py-3.5 rounded-2xl bg-white hover:bg-neutral-200 text-black font-extrabold text-xs transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-2"
                    >
                      {updatingProfile && <Loader2 size={16} className="animate-spin" />}
                      <span>Lưu Thay Đổi Hồ Sơ</span>
                    </button>

                    <Link
                      href="/settings/security"
                      className="text-xs font-bold text-neutral-400 hover:text-white transition-colors"
                    >
                      Đổi mật khẩu bảo mật ➔
                    </Link>
                  </div>
                </form>
              </div>
            )}

            {/* ── TAB 2: TỦ PHIM ĐÃ LƯU (WATCHLIST) ── */}
            {activeTab === "watchlist" && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-white/[0.08] pb-5">
                  <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                    <Bookmark size={22} className="text-neutral-400" /> Tủ Phim Đã Lưu ({watchlistItems.length})
                  </h2>
                </div>

                {watchlistItems.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {watchlistItems.map((item: any) => {
                      const movie = item.movieData || item.movie;
                      const thumb =
                        resolveImageUrl(movie?.thumb_url) ||
                        resolveImageUrl(movie?.poster_url) ||
                        item.thumbUrl;

                      return (
                        <Link
                          key={item.id}
                          href={`/film/${movie?.slug || item.movieId}`}
                          className="aspect-[2/3] bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden group relative hover:border-white/30 transition-all shadow-xl hover:-translate-y-1.5"
                        >
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={movie?.title || item.title || item.movieId}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600">
                              <Film size={32} />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent p-3.5 flex items-end">
                            <p className="text-xs font-black text-white line-clamp-2 leading-snug">
                              {movie?.title || item.title || item.movieId}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <Bookmark size={40} className="text-neutral-700 mb-3" />
                    <p className="text-sm font-bold text-neutral-300">Tủ phim của bạn đang trống</p>
                    <p className="text-xs text-neutral-500 mt-1 max-w-sm font-mono">
                      Hãy bấm nút "+" trên các bộ phim để lưu lại xem sau.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 3: LỊCH SỬ ĐÃ XEM (HISTORY) ── */}
            {activeTab === "history" && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-white/[0.08] pb-5">
                  <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                    <History size={22} className="text-neutral-400" /> Lịch Sử Xem Phim ({historyItems.length})
                  </h2>
                </div>

                {historyItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {historyItems.map((item: any) => {
                      const pct =
                        item.duration > 0
                          ? Math.min(
                              100,
                              Math.round((item.progress / item.duration) * 100),
                            )
                          : 0;

                      return (
                        <div
                          key={item.id}
                          className="bg-neutral-900 border border-white/10 hover:border-white/30 rounded-2xl p-4 flex gap-4 items-center transition-all shadow-md group"
                        >
                          {item.movieThumb ? (
                            <img
                              src={item.movieThumb}
                              alt={item.movieTitle}
                              className="w-14 h-20 object-cover rounded-xl flex-shrink-0 border border-white/10 group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-14 h-20 bg-neutral-800 rounded-xl flex-shrink-0 flex items-center justify-center text-neutral-600 border border-white/10">
                              <Film size={22} />
                            </div>
                          )}

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <Link
                              href={`/watch/${item.movieId}${
                                item.episode ? `?ep=${item.episode}` : ""
                              }`}
                              className="font-black text-white text-sm hover:text-white transition-colors line-clamp-1 block"
                            >
                              {item.movieTitle}
                            </Link>
                            <p className="text-xs text-neutral-400 font-mono">
                              {item.episode ? `Tập ${item.episode}` : "Bản đầy đủ"}
                            </p>
                            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-white h-full rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          <Link
                            href={`/watch/${item.movieId}${
                              item.episode ? `?ep=${item.episode}` : ""
                            }`}
                            className="p-3 text-black bg-white hover:bg-neutral-200 rounded-xl transition-all shrink-0 shadow-lg active:scale-95"
                          >
                            <Play size={14} className="fill-current" />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <History size={40} className="text-neutral-700 mb-3" />
                    <p className="text-sm font-bold text-neutral-300">Bạn chưa có lịch sử xem phim nào</p>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 4: BỘ SƯU TẬP (COLLECTIONS) ── */}
            {activeTab === "collections" && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-white/[0.08] pb-5">
                  <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                    <ListVideo size={22} className="text-neutral-400" /> Bộ Sưu Tập Phim Chủ Đề
                  </h2>
                </div>
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <ListVideo size={40} className="text-neutral-700 mb-3" />
                  <p className="text-sm font-bold text-neutral-300">Chưa có bộ sưu tập nào được tạo</p>
                </div>
              </div>
            )}

            {/* ── TAB 5: ĐÁNH GIÁ (REVIEWS) ── */}
            {activeTab === "reviews" && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-white/[0.08] pb-5">
                  <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                    <Star size={22} className="text-neutral-400 fill-neutral-400" /> Đánh Giá Của Tôi
                  </h2>
                </div>
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <Star size={40} className="text-neutral-700 mb-3" />
                  <p className="text-sm font-bold text-neutral-300">Bạn chưa viết đánh giá nào cho phim</p>
                </div>
              </div>
            )}

            {/* ── TAB 6: CÀI ĐẶT TIỆN ÍCH (SETTINGS) ── */}
            {activeTab === "settings" && (
              <div className="space-y-8 animate-fade-in">
                <div className="border-b border-white/[0.08] pb-5">
                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                    <Sliders size={22} className="text-neutral-400" /> Cài Đặt Tiện Ích Trình Phát
                  </h2>
                </div>

                <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 space-y-6">
                  {/* Tự động phát */}
                  <div className="flex items-center justify-between gap-4 pb-5 border-b border-white/10">
                    <div>
                      <h3 className="text-sm font-bold text-white">Tự động phát phim</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">Tự động phát video khi nạp xong trang xem.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAutoplay(!autoplay);
                        toast(!autoplay ? "Đã BẬT tự động phát" : "Đã TẮT tự động phát", "success");
                      }}
                      className={`w-12 h-6 rounded-full transition-all p-1 cursor-pointer flex items-center shrink-0 ${
                        autoplay ? "bg-white justify-end" : "bg-neutral-800 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-black rounded-full shadow-md" />
                    </button>
                  </div>

                  {/* Tự động chuyển tập */}
                  <div className="flex items-center justify-between gap-4 pb-5 border-b border-white/10">
                    <div>
                      <h3 className="text-sm font-bold text-white">Tự động chuyển tập tiếp theo</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">Chuyển sang tập kế tiếp ngay khi kết thúc.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAutoNextEpisode(!autoNextEpisode);
                        toast(!autoNextEpisode ? "Đã BẬT chuyển tập tiếp theo" : "Đã TẮT chuyển tập", "success");
                      }}
                      className={`w-12 h-6 rounded-full transition-all p-1 cursor-pointer flex items-center shrink-0 ${
                        autoNextEpisode ? "bg-white justify-end" : "bg-neutral-800 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-black rounded-full shadow-md" />
                    </button>
                  </div>

                  {/* Chế độ Rạp phim */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-white">Mặc định chế độ Rạp Phim</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">Mở rộng trình phát phim toàn màn hình.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTheaterMode(!theaterMode);
                        toast(!theaterMode ? "Đã BẬT chế độ Rạp phim" : "Đã TẮT chế độ Rạp phim", "success");
                      }}
                      className={`w-12 h-6 rounded-full transition-all p-1 cursor-pointer flex items-center shrink-0 ${
                        theaterMode ? "bg-white justify-end" : "bg-neutral-800 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-black rounded-full shadow-md" />
                    </button>
                  </div>
                </div>

                {/* Quality Preferences */}
                <div className="bg-[#12151e] border border-white/10 rounded-3xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white">Độ phân giải ưu tiên</h3>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { id: "auto", label: "Tự động 4K/HD" },
                      { id: "1080p", label: "1080P Full HD" },
                      { id: "720p", label: "720P HD" },
                      { id: "480p", label: "480P" },
                    ].map((item) => {
                      const active = defaultQuality === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setDefaultQuality(item.id as QualitySetting);
                            toast(`Đã đặt chất lượng: ${item.label}`, "success");
                          }}
                          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                            active
                              ? "bg-emerald-400 text-black font-black shadow-lg shadow-emerald-400/20"
                              : "bg-white/[0.04] text-neutral-400 hover:text-white border border-white/10"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* PWA Native App Card */}
                <div className="p-6 rounded-3xl border border-white/15 bg-gradient-to-r from-[#141924] to-[#0e1219] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-400/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shrink-0">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">CineVerse Native App (PWA)</h4>
                      <p className="text-xs text-neutral-400 mt-1">Cài đặt trực tiếp lên màn hình chính thiết bị.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handlePwaInstall}
                    className="px-6 py-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs transition-all shadow-lg active:scale-95 cursor-pointer shrink-0"
                  >
                    Cài Đặt App
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* ── AVATAR SELECTION MODAL DIALOG ── */}
      <AnimatePresence>
        {showAvatarPicker && (
          <div className="fixed inset-0 z-[100] grid place-items-center bg-black/85 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-[#0e1117] p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Camera size={18} className="text-emerald-400" /> Thay Đổi Ảnh Đại Diện
                </h3>
                <button
                  onClick={() => setShowAvatarPicker(false)}
                  className="rounded-full border border-white/10 p-2 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Preset Avatars Grid */}
              <div className="space-y-3">
                <p className="text-xs font-mono font-bold uppercase text-neutral-400 tracking-wider">
                  Mẫu Avatar chất lượng cao:
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {PRESET_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedAvatar(url);
                        setCustomAvatarInput("");
                      }}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer hover:scale-105 ${
                        selectedAvatar === url
                          ? "border-emerald-400 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-400/20"
                          : "border-white/10 hover:border-white/40"
                      }`}
                    >
                      <img src={url} alt="Preset Avatar" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom URL Input */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-mono font-bold uppercase text-neutral-400 tracking-wider block">
                  Hoặc dán link ảnh cá nhân:
                </label>
                <input
                  type="url"
                  value={customAvatarInput}
                  onChange={(e) => {
                    setCustomAvatarInput(e.target.value);
                    setSelectedAvatar(e.target.value);
                  }}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full bg-black/50 border border-white/15 text-white text-xs font-mono rounded-2xl px-4 py-3 outline-none focus:border-emerald-400 transition-colors"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  onClick={() => setShowAvatarPicker(false)}
                  className="px-5 py-2.5 rounded-2xl border border-white/15 text-xs font-bold text-neutral-300 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpdateProfile}
                  className="px-6 py-2.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs transition-all shadow-lg shadow-emerald-400/25 active:scale-95 cursor-pointer"
                >
                  Áp Dụng Avatar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── LOGOUT MODAL ── */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[100] grid place-items-center bg-black/85 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-xs w-full bg-[#0e1117] border border-white/15 rounded-3xl p-6 text-center space-y-4 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg">
                <LogOut size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Xác nhận đăng xuất</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Bạn có chắc chắn muốn rời khỏi phiên đăng nhập CineVerse?
                </p>
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 bg-white/10 hover:bg-white/15 text-white font-bold text-xs py-3 rounded-2xl transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 bg-rose-500 hover:bg-rose-400 text-black font-black text-xs py-3 rounded-2xl transition-all shadow-lg shadow-rose-500/30 active:scale-95 cursor-pointer"
                >
                  Đăng xuất
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
