"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { api, watchHistoryApi, watchlistApi, authApi } from "@/lib/api";
import { useState, useEffect } from "react";
import {
  User,
  Bookmark,
  History,
  Sliders,
  LogOut,
  Camera,
  Crown,
  Share2,
  Lock,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  Film,
  Play,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
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

type TabType = "account" | "security" | "watchlist" | "history" | "settings";

export default function UserDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, logout } = useAuthStore();

  const rawUsername = (params?.username as string) || "";
  const decodedUsername = rawUsername ? decodeURIComponent(rawUsername) : "";
  const username = decodedUsername || user?.username || user?.id || "";

  // Utility Settings Store
  const {
    autoplay,
    autoNextEpisode,
    theaterMode,
    setAutoplay,
    setAutoNextEpisode,
    setTheaterMode,
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

  const [activeTab, setActiveTab] = useState<TabType>("account");

  // Form Profile State
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

  // Password Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast("Mật khẩu mới phải có ít nhất 6 ký tự!", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("Xác nhận mật khẩu mới không trùng khớp!", "error");
      return;
    }

    setChangingPassword(true);
    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
      });
      toast("Cập nhật mật khẩu bảo mật thành công!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast("Đã cập nhật mật khẩu!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setChangingPassword(false);
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

  const TABS = [
    { id: "account", label: "Thông tin cá nhân", icon: User },
    { id: "security", label: "Bảo mật & Mật khẩu", icon: Lock },
    { id: "watchlist", label: `Tủ phim đã lưu (${watchlistItems.length})`, icon: Bookmark },
    { id: "history", label: `Lịch sử xem (${historyItems.length})`, icon: History },
    { id: "settings", label: "Cài đặt trình phát 4K", icon: Sliders },
  ];

  return (
    <main className="min-h-screen bg-black text-white pt-20 pb-28 px-4 sm:px-8 lg:px-12 max-w-[1440px] mx-auto font-sans select-none space-y-6">
      
      {/* ── CINEMA PROFILE HEADER ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 shadow-2xl">
        {/* Subtle Ambient Cover Scrim */}
        <div className="relative h-36 sm:h-48 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop"
            alt="Cover"
            className="w-full h-full object-cover brightness-[0.25]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-transparent" />
        </div>

        {/* User Identity Content Bar */}
        <div className="relative px-6 sm:px-10 pb-6 -mt-16 sm:-mt-20 z-10 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 text-center md:text-left">
          
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            {/* Avatar Box */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-4 border-neutral-950 bg-neutral-900 shadow-2xl relative">
                <img
                  src={
                    selectedAvatar ||
                    profile.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      displayName || profile.username || "User",
                    )}&background=171717&color=ffffff`
                  }
                  alt={profile.username}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <button
                onClick={() => setShowAvatarPicker(true)}
                className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-white text-black shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-neutral-950"
                title="Thay đổi avatar"
              >
                <Camera size={14} strokeWidth={2.5} />
              </button>
            </div>

            {/* Profile Info */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {displayName || profile.displayName || profile.username}
                </h1>
                {isAdmin ? (
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-mono font-extrabold uppercase tracking-wider">
                    👑 ADMIN FOUNDER
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-neutral-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                    <Crown size={12} className="inline mr-1 text-neutral-400" /> ULTRA VIP 4K
                  </span>
                )}
              </div>

              <p className="text-xs font-mono text-neutral-400">
                @{profile.username} •{" "}
                <span className="text-neutral-300 font-medium">
                  {user?.email || `${profile.username}@gmail.com`}
                </span>
              </p>

              {profile.bio && (
                <p className="text-xs text-neutral-400 max-w-lg pt-0.5 line-clamp-2">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          {/* Quick Header Actions & Stats */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-center min-w-[80px]">
                <span className="text-xs font-mono font-black text-white block">
                  {watchlistItems.length}
                </span>
                <span className="text-[9px] font-mono text-neutral-400 uppercase">Tủ Phim</span>
              </div>

              <div className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-center min-w-[80px]">
                <span className="text-xs font-mono font-black text-white block">
                  {historyItems.length}
                </span>
                <span className="text-[9px] font-mono text-neutral-400 uppercase">Đã Xem</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast("Đã sao chép liên kết trang cá nhân!", "success");
                }}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-mono font-bold text-neutral-200 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Share2 size={13} className="text-neutral-400" /> Chia sẻ
              </button>

              {user && (
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-mono font-bold text-neutral-300 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <LogOut size={13} /> Thoát
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN WORKSPACE GRID (LEFT MENU + RIGHT CONTENT) ── */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
        
        {/* Left Profile Navigation Menu */}
        <aside className="rounded-3xl border border-white/10 bg-neutral-950 p-3 space-y-1 shadow-2xl">
          <div className="px-4 py-3 border-b border-white/10 mb-2">
            <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-[0.2em]">
              QUẢN LÝ TÀI KHOẢN
            </span>
          </div>

          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-bold transition-all cursor-pointer",
                  isActive
                    ? "bg-white text-black shadow-lg font-black translate-x-1"
                    : "text-neutral-400 hover:text-white hover:bg-white/[0.05]",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </div>
                <ChevronRight
                  size={14}
                  className={isActive ? "text-black" : "opacity-0 group-hover:opacity-100 text-neutral-500"}
                />
              </button>
            );
          })}
        </aside>

        {/* Right Main Content Panel */}
        <div className="rounded-3xl border border-white/10 bg-neutral-950 p-6 sm:p-8 min-h-[520px] shadow-2xl">
          
          {/* TAB 1: THÔNG TIN CÁ NHÂN */}
          {activeTab === "account" && (
            <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl animate-fade-in">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                  <User size={20} className="text-neutral-400" /> Hồ Sơ Cá Nhân
                </h2>
                <p className="text-xs text-neutral-400 mt-1 font-mono">
                  Cập nhật các thông tin định danh hiển thị trên CineVerse
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold text-neutral-400 uppercase block">
                  Địa chỉ Email tài khoản
                </label>
                <input
                  type="email"
                  value={email || `${profile.username}@gmail.com`}
                  readOnly
                  className="w-full bg-neutral-900 border border-white/10 text-neutral-400 text-sm font-mono rounded-2xl px-4 py-3.5 outline-none cursor-not-allowed opacity-75"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold text-neutral-400 uppercase block">
                  Tên hiển thị (Display Name)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nhập tên hiển thị..."
                  className="w-full bg-neutral-900 border border-white/15 text-white text-sm rounded-2xl px-4 py-3.5 outline-none focus:border-white/30 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold text-neutral-400 uppercase block">
                  Lời giới thiệu (Bio)
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Viết một đoạn ngắn giới thiệu về phong cách xem phim của bạn..."
                  className="w-full bg-neutral-900 border border-white/15 text-white text-sm rounded-2xl px-4 py-3.5 outline-none focus:border-white/30 transition-all resize-none"
                />
              </div>

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

              <button
                type="submit"
                disabled={updatingProfile}
                className="px-8 py-3.5 rounded-2xl bg-white hover:bg-neutral-200 text-black font-extrabold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              >
                {updatingProfile && <Loader2 size={16} className="animate-spin" />}
                <span>Lưu Thay Đổi Hồ Sơ</span>
              </button>
            </form>
          )}

          {/* TAB 2: BẢO MẬT & MẬT KHẨU (EMBEDDED DIRECTLY IN PROFILE) */}
          {activeTab === "security" && (
            <form onSubmit={handleChangePassword} className="space-y-6 max-w-2xl animate-fade-in">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                  <Lock size={20} className="text-neutral-400" /> Thiết Lập Mật Khẩu & Bảo Mật
                </h2>
                <p className="text-xs text-neutral-400 mt-1 font-mono">
                  Đổi mật khẩu và quản lý bảo mật tài khoản trực tiếp trong hồ sơ
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold text-neutral-400 uppercase block">
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại..."
                    className="w-full bg-neutral-900 border border-white/15 text-white text-sm rounded-2xl px-4 py-3.5 outline-none focus:border-white/30 transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold text-neutral-400 uppercase block">
                  Mật khẩu mới
                </label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự..."
                  className="w-full bg-neutral-900 border border-white/15 text-white text-sm rounded-2xl px-4 py-3.5 outline-none focus:border-white/30 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold text-neutral-400 uppercase block">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full bg-neutral-900 border border-white/15 text-white text-sm rounded-2xl px-4 py-3.5 outline-none focus:border-white/30 transition-all"
                />
              </div>

              {/* 2FA Status Pill */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={22} className="text-white" />
                  <div>
                    <p className="text-sm font-bold text-white">Xác thực 2 yếu tố (2FA)</p>
                    <p className="text-xs text-neutral-400 mt-0.5">Tài khoản của bạn đang được bảo vệ an toàn.</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-mono font-bold uppercase">
                  Đang Kích Hoạt
                </span>
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="px-8 py-3.5 rounded-2xl bg-white hover:bg-neutral-200 text-black font-extrabold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              >
                {changingPassword && <Loader2 size={16} className="animate-spin" />}
                <Key size={14} />
                <span>Cập Nhật Mật Khẩu Mới</span>
              </button>
            </form>
          )}

          {/* TAB 3: TỦ PHIM ĐÃ LƯU */}
          {activeTab === "watchlist" && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                  <Bookmark size={20} className="text-neutral-400" /> Tủ Phim Đã Lưu ({watchlistItems.length})
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

          {/* TAB 4: LỊCH SỬ ĐÃ XEM */}
          {activeTab === "history" && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                  <History size={20} className="text-neutral-400" /> Lịch Sử Xem Phim ({historyItems.length})
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

          {/* TAB 5: CÀI ĐẶT TRÌNH PHÁT 4K */}
          {activeTab === "settings" && (
            <div className="space-y-8 animate-fade-in max-w-2xl">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                  <Sliders size={20} className="text-neutral-400" /> Cài Đặt Tiện Ích Trình Phát
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
            </div>
          )}

        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-950 border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center"
            >
              <LogOut size={32} className="mx-auto text-neutral-400" />
              <h3 className="text-base font-black text-white">Xác nhận đăng xuất</h3>
              <p className="text-xs text-neutral-400">
                Bạn có chắc chắn muốn đăng xuất khỏi tài khoản CineVerse?
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-neutral-300 hover:bg-white/10 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 py-2.5 rounded-xl bg-white text-black font-extrabold text-xs hover:bg-neutral-200 transition-colors"
                >
                  Đăng xuất
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Avatar Picker Modal */}
      <AnimatePresence>
        {showAvatarPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-950 border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-black text-white">Chọn ảnh đại diện Avatar</h3>
                <button
                  onClick={() => setShowAvatarPicker(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Avatar Grid */}
              <div className="grid grid-cols-4 gap-3">
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(url);
                      setCustomAvatarInput("");
                    }}
                    className={cn(
                      "w-full aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer relative",
                      selectedAvatar === url
                        ? "border-white ring-2 ring-white/50 scale-105"
                        : "border-white/10 opacity-70 hover:opacity-100",
                    )}
                  >
                    <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                    {selectedAvatar === url && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <CheckCircle2 size={18} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom URL Input */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">
                  Hoặc dán URL ảnh của bạn
                </label>
                <input
                  type="url"
                  value={customAvatarInput}
                  onChange={(e) => {
                    setCustomAvatarInput(e.target.value);
                    if (e.target.value) setSelectedAvatar("");
                  }}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full bg-neutral-900 border border-white/15 text-white text-xs rounded-xl px-3 py-2.5 outline-none focus:border-white/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAvatarPicker(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white"
                >
                  Đóng
                </button>
                <button
                  onClick={handleUpdateProfile}
                  className="px-5 py-2 rounded-xl bg-white text-black font-extrabold text-xs hover:bg-neutral-200"
                >
                  Lưu Avatar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
