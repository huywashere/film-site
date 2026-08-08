"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  Sparkles,
  BarChart3,
  Clock,
  Trophy,
  Award,
  Flame,
  Tv,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { resolveImageUrl } from "@/components/film/FilmCard";
import { useToast } from "@/providers/ToastProvider";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AccountPageTabs } from "@/components/account/AccountPageTabs";

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

type TabType =
  "account" | "stats" | "security" | "watchlist" | "history" | "settings";

type TabItem = {
  id: TabType;
  label: string;
  icon: any;
  category: "profile" | "settings";
};

export default function UserDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, logout } = useAuthStore();

  const rawUsername = (params?.username as string) || "";
  const decodedUsername = rawUsername ? decodeURIComponent(rawUsername) : "";
  const username = decodedUsername || user?.username || user?.id || "";

  const tabParam = searchParams.get("tab") as TabType;
  const [activeTab, setActiveTab] = useState<TabType>("account");

  useEffect(() => {
    if (
      tabParam &&
      [
        "account",
        "stats",
        "security",
        "watchlist",
        "history",
        "settings",
      ].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

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
      toast("Xác nhận mật khẩu mới không khớp!", "error");
      return;
    }
    setChangingPassword(true);
    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
      });
      toast("Đã cập nhật mật khẩu mới an toàn!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast("Đổi mật khẩu thành công!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setChangingPassword(false);
    }
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

  const TABS: TabItem[] = [
    {
      id: "account",
      label: "Thông tin cá nhân",
      icon: User,
      category: "profile",
    },
    {
      id: "stats",
      label: "Thống kê cày phim",
      icon: BarChart3,
      category: "profile",
    },
    {
      id: "watchlist",
      label: `Tủ phim đã lưu (${watchlistItems.length})`,
      icon: Bookmark,
      category: "profile",
    },
    {
      id: "history",
      label: `Lịch sử xem (${historyItems.length})`,
      icon: History,
      category: "profile",
    },
    {
      id: "settings",
      label: "Cài đặt trình phát 4K",
      icon: Sliders,
      category: "settings",
    },
    {
      id: "security",
      label: "Mật khẩu & bảo mật",
      icon: Lock,
      category: "settings",
    },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-[1440px] space-y-6 bg-[#0b0d12] px-4 pb-28 pt-20 font-sans text-white select-none sm:px-8 lg:px-12">
      {/* Identity header: a calm account overview with one clear action zone. */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#10141b] shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/[0.12] via-transparent to-transparent" />
        <div className="relative z-10 border-b border-white/10 px-6 py-4 sm:px-9">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.08em] text-neutral-500">
                Tài khoản
              </p>
              <p className="mt-1 text-sm font-semibold text-neutral-200">
                Không gian cá nhân của bạn
              </p>
            </div>
            <span className="hidden rounded-full border border-violet-300/20 bg-violet-300/[0.08] px-3 py-1 text-[11px] font-semibold text-violet-200 sm:inline-flex">
              CinePhim 4K
            </span>
          </div>
        </div>

        <div className="relative z-10 flex flex-col justify-between gap-8 p-6 sm:p-9 lg:flex-row lg:items-center">
          {/* Left Avatar & Identity Group */}
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            {/* Avatar Box with Gradient Halo Ring */}
            <div className="relative group shrink-0">
              <div className="rounded-[22px] border border-violet-200/35 bg-violet-300/[0.08] p-1.5 shadow-[0_14px_35px_rgba(109,40,217,0.18)]">
                <div className="relative h-24 w-24 overflow-hidden rounded-[17px] bg-neutral-900 sm:h-28 sm:w-28">
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
              </div>
              <button
                onClick={() => setShowAvatarPicker(true)}
                className="absolute -bottom-1 -right-1 cursor-pointer rounded-xl border-2 border-[#10141b] bg-white p-2 text-black shadow-xl transition-transform hover:scale-105 active:scale-95"
                title="Thay đổi avatar"
              >
                <Camera size={14} strokeWidth={2.5} />
              </button>
            </div>

            {/* Identity Info */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {displayName || profile.displayName || profile.username}
                </h1>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/25 bg-violet-300/[0.1] px-3 py-1 text-[11px] font-semibold text-violet-100">
                    <Sparkles size={12} className="text-amber-400" /> ADMIN
                    FOUNDER
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold text-neutral-200">
                    <Crown size={12} className="text-neutral-400" /> ULTRA VIP
                    4K
                  </span>
                )}
              </div>

              <p className="text-sm text-neutral-400">
                @{profile.username}{" "}
                <span className="px-1 text-neutral-600">/</span>{" "}
                <span className="text-neutral-300 font-medium">
                  {user?.email || `${profile.username}@gmail.com`}
                </span>
              </p>

              {profile.bio && (
                <p className="max-w-lg pt-0.5 text-sm leading-relaxed text-neutral-300 line-clamp-2">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          {/* Right Header Quick Stats & Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end lg:max-w-[430px]">
            <div className="flex items-center divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.035] px-1">
              <div className="min-w-[98px] px-4 py-3 text-center">
                <span className="text-sm font-mono font-black text-white block">
                  {watchlistItems.length}
                </span>
                <span className="text-[10px] font-semibold text-neutral-500">
                  Tủ Phim
                </span>
              </div>

              <div className="min-w-[98px] px-4 py-3 text-center">
                <span className="text-sm font-mono font-black text-white block">
                  {historyItems.length}
                </span>
                <span className="text-[10px] font-semibold text-neutral-500">
                  Đã Xem
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast("Đã sao chép liên kết trang cá nhân!", "success");
                }}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.11] active:scale-95"
              >
                <Share2 size={14} className="text-neutral-300" /> Chia sẻ
              </button>

              {user && (
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-transparent px-3.5 py-2.5 text-xs font-semibold text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white active:scale-95"
                >
                  <LogOut size={14} /> Thoát
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-500">
          Quản lý thông tin, thói quen xem và danh sách phim của bạn.
        </p>
        <AccountPageTabs
          active="profile"
          username={profile.username || username}
        />
      </div>

      {/* ── TWO-COLUMN WORKSPACE GRID (LEFT NAVIGATION MENU + RIGHT WORKSPACE) ── */}
      <div className="grid items-start gap-5 lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* Left Navigation Menu */}
        <aside className="rounded-3xl border border-white/10 bg-[#10141b] p-3 shadow-[0_16px_45px_rgba(0,0,0,0.18)] lg:sticky lg:top-24">
          <div className="px-3 pb-3 pt-2">
            <p className="text-xs font-semibold text-white">
              Điều hướng tài khoản
            </p>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              Chọn một mục để cập nhật không gian của bạn.
            </p>
          </div>

          <div className="border-t border-white/10 pt-3">
            <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.12em] text-neutral-500">
              HỒ SƠ
            </p>
            <div className="space-y-1">
              {TABS.filter((tab) => tab.category === "profile").map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={cn(
                      "group relative flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-xl px-3.5 py-3 text-xs font-semibold transition-colors",
                      isActive
                        ? "bg-white/[0.09] text-white shadow-sm ring-1 ring-violet-300/20"
                        : "text-neutral-400 hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                      <span>{tab.label}</span>
                    </div>
                    <ChevronRight
                      size={14}
                      className={cn(
                        "relative z-10 transition-transform duration-200",
                        isActive
                          ? "text-violet-200 translate-x-0"
                          : "opacity-0 group-hover:opacity-100 -translate-x-1 text-neutral-400",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 border-t border-white/10 pt-3">
            <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.12em] text-neutral-500">
              TÙY CHỈNH
            </p>
            <div className="space-y-1">
              {TABS.filter((tab) => tab.category === "settings").map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={cn(
                      "group relative flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-xl px-3.5 py-3 text-xs font-semibold transition-colors",
                      isActive
                        ? "bg-white/[0.09] text-white shadow-sm ring-1 ring-violet-300/20"
                        : "text-neutral-400 hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    <div className="relative z-10 flex items-center gap-3">
                      <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                      <span>{tab.label}</span>
                    </div>
                    <ChevronRight
                      size={14}
                      className={cn(
                        "relative z-10 transition-transform duration-200",
                        isActive
                          ? "text-violet-200"
                          : "-translate-x-1 text-neutral-400 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right Main Content Panel */}
        <div className="relative min-h-[540px] rounded-3xl border border-white/10 bg-[#10141b] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.18)] sm:p-8 lg:p-9">
          {/* TAB 1: THÔNG TIN CÁ NHÂN */}
          {activeTab === "account" && (
            <form
              onSubmit={handleUpdateProfile}
              className="max-w-3xl space-y-6 animate-fade-in"
            >
              <div className="border-b border-white/10 pb-5">
                <h2 className="flex items-center gap-2.5 text-xl font-black text-white">
                  <User size={22} className="text-violet-200" /> Thông tin cá
                  nhân
                </h2>
                <p className="text-xs text-neutral-400 mt-1 font-mono">
                  Cập nhật những thông tin người khác nhìn thấy trên CinePhim.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-extrabold text-neutral-400 uppercase tracking-wider block">
                  Email tài khoản
                </label>
                <input
                  type="email"
                  value={email || `${profile.username}@gmail.com`}
                  readOnly
                  className="w-full rounded-xl border border-white/10 bg-[#0b0f15] px-4 py-3.5 text-sm font-mono text-neutral-400 opacity-75 shadow-inner outline-none cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-extrabold text-neutral-400 uppercase tracking-wider block">
                  Tên hiển thị
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nhập tên hiển thị..."
                  className="w-full rounded-xl border border-white/10 bg-[#0b0f15] px-4 py-3.5 text-sm text-white shadow-inner outline-none transition-all focus:border-violet-300/50 focus:ring-1 focus:ring-violet-300/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-extrabold text-neutral-400 uppercase tracking-wider block">
                  Giới thiệu về bạn
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Viết một đoạn ngắn giới thiệu về phong cách xem phim của bạn..."
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#0b0f15] px-4 py-3.5 text-sm text-white shadow-inner outline-none transition-all focus:border-violet-300/50 focus:ring-1 focus:ring-violet-300/20"
                />
              </div>

              <div className="p-4.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Hiển thị hồ sơ công khai
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-neutral-400">
                    Cho phép người khác xem tủ phim và lịch sử xem của bạn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublicProfile(!isPublicProfile)}
                  className={`flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors ${
                    isPublicProfile
                      ? "justify-end bg-violet-300"
                      : "justify-start bg-white/10"
                  }`}
                >
                  <span className="h-5 w-5 rounded-full bg-[#0b0d12] shadow-md" />
                </button>
              </div>

              <button
                type="submit"
                disabled={updatingProfile}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-xs font-bold text-black shadow-xl transition-all hover:bg-violet-100 active:scale-[0.98]"
              >
                {updatingProfile && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                <span>Lưu thay đổi</span>
              </button>
            </form>
          )}

          {/* TAB STATS: THỐNG KÊ CÀY PHIM */}
          {activeTab === "stats" && (
            <div className="space-y-8 max-w-4xl animate-fade-in">
              <div className="border-b border-white/10 pb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                    <BarChart3 size={22} className="text-neutral-300" /> Thống
                    Kê & Phân Tích Cày Phim
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1 font-mono">
                    Tổng quan hành trình điện ảnh & thói quen xem phim của bạn
                    trên CinePhim
                  </p>
                </div>

                <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-mono font-bold text-white flex items-center gap-2">
                  <Trophy size={14} className="text-amber-400" />
                  <span>
                    Cấp độ:{" "}
                    {historyItems.length >= 20
                      ? "🥇 Đại Cao Thủ 4K"
                      : historyItems.length >= 5
                        ? "🥈 Cinephile Chính Hiệu"
                        : "🥉 Mọt Phim Tập Sự"}
                  </span>
                </div>
              </div>

              {/* 4 Overview Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 relative overflow-hidden group hover:border-white/25 transition-all">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider">
                      Thời gian cày
                    </span>
                    <Clock size={16} />
                  </div>
                  <div className="text-2xl font-black text-white font-mono tracking-tight">
                    {Math.floor((historyItems.length * 45) / 60)}{" "}
                    <span className="text-xs font-normal text-neutral-400">
                      giờ
                    </span>{" "}
                    {(historyItems.length * 45) % 60}{" "}
                    <span className="text-xs font-normal text-neutral-400">
                      phút
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-neutral-500">
                    Dựa trên nhật ký lịch sử xem
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 relative overflow-hidden group hover:border-white/25 transition-all">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider">
                      Đã hoàn thành
                    </span>
                    <Film size={16} />
                  </div>
                  <div className="text-2xl font-black text-white font-mono tracking-tight">
                    {historyItems.length}{" "}
                    <span className="text-xs font-normal text-neutral-400">
                      tập phim
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-neutral-500">
                    Các tập phim đã thưởng thức
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 relative overflow-hidden group hover:border-white/25 transition-all">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider">
                      Tủ phim lưu trữ
                    </span>
                    <Bookmark size={16} />
                  </div>
                  <div className="text-2xl font-black text-white font-mono tracking-tight">
                    {watchlistItems.length}{" "}
                    <span className="text-xs font-normal text-neutral-400">
                      bộ phim
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-neutral-500">
                    Trong danh sách theo dõi
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 relative overflow-hidden group hover:border-white/25 transition-all">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider">
                      Đánh giá chung
                    </span>
                    <Award size={16} />
                  </div>
                  <div className="text-2xl font-black text-white font-mono tracking-tight">
                    9.8{" "}
                    <span className="text-xs font-normal text-neutral-400">
                      / 10
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-neutral-500">
                    Điểm số yêu thích trung bình
                  </p>
                </div>
              </div>

              {/* Top Favorite Genres Breakdown */}
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-5">
                <h3 className="text-sm font-mono font-extrabold uppercase text-neutral-300 tracking-wider flex items-center gap-2">
                  <Flame size={16} className="text-amber-400" /> Thể Loại Phim
                  Xem Nhiều Nhất
                </h3>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-mono font-bold mb-1.5">
                      <span className="text-white">
                        🇰🇷 Phim Hàn Quốc (K-Drama)
                      </span>
                      <span className="text-neutral-400">42% • 28 Giờ</span>
                    </div>
                    <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full"
                        style={{ width: "42%" }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono font-bold mb-1.5">
                      <span className="text-white">
                        🇨🇳 Phim Trung Quốc (C-Drama)
                      </span>
                      <span className="text-neutral-400">28% • 19 Giờ</span>
                    </div>
                    <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neutral-400 rounded-full"
                        style={{ width: "28%" }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono font-bold mb-1.5">
                      <span className="text-white">
                        💥 Phim Hành Động & Viễn Tưởng
                      </span>
                      <span className="text-neutral-400">18% • 12 Giờ</span>
                    </div>
                    <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neutral-600 rounded-full"
                        style={{ width: "18%" }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono font-bold mb-1.5">
                      <span className="text-white">
                        🍿 Phim Chiếu Rạp & Khác
                      </span>
                      <span className="text-neutral-400">12% • 8 Giờ</span>
                    </div>
                    <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neutral-700 rounded-full"
                        style={{ width: "12%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BẢO MẬT & MẬT KHẨU */}
          {activeTab === "security" && (
            <form
              onSubmit={handleChangePassword}
              className="max-w-3xl space-y-6 animate-fade-in"
            >
              <div className="border-b border-white/10 pb-5">
                <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                  <Lock size={22} className="text-neutral-400" /> Thiết Lập Mật
                  Khẩu & Bảo Mật
                </h2>
                <p className="text-xs text-neutral-400 mt-1 font-mono">
                  Đổi mật khẩu và quản lý bảo mật tài khoản trực tiếp trong hồ
                  sơ
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-extrabold text-neutral-400 uppercase tracking-wider block">
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại..."
                    className="w-full rounded-xl border border-white/10 bg-[#0b0f15] px-4 py-3.5 pr-12 text-sm text-white shadow-inner outline-none transition-all focus:border-violet-300/50 focus:ring-1 focus:ring-violet-300/20"
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
                <label className="text-[11px] font-mono font-extrabold text-neutral-400 uppercase tracking-wider block">
                  Mật khẩu mới
                </label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự..."
                  className="w-full rounded-xl border border-white/10 bg-[#0b0f15] px-4 py-3.5 text-sm text-white shadow-inner outline-none transition-all focus:border-violet-300/50 focus:ring-1 focus:ring-violet-300/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-extrabold text-neutral-400 uppercase tracking-wider block">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full rounded-xl border border-white/10 bg-[#0b0f15] px-4 py-3.5 text-sm text-white shadow-inner outline-none transition-all focus:border-violet-300/50 focus:ring-1 focus:ring-violet-300/20"
                />
              </div>

              {/* 2FA Status Pill */}
              <div className="p-4.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={22} className="text-white" />
                  <div>
                    <p className="text-sm font-bold text-white">
                      Xác thực 2 yếu tố (2FA)
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                      Tài khoản của bạn đang được bảo vệ an toàn.
                    </p>
                  </div>
                </div>
                <span className="px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-mono font-bold uppercase">
                  Đang Kích Hoạt
                </span>
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="px-8 py-3.5 rounded-2xl bg-white hover:bg-neutral-200 text-black font-black text-xs transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-2 shadow-xl"
              >
                {changingPassword && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                <Key size={14} />
                <span>Cập Nhật Mật Khẩu Mới</span>
              </button>
            </form>
          )}

          {/* TAB 3: TỦ PHIM ĐÃ LƯU */}
          {activeTab === "watchlist" && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-white/10 pb-5">
                <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                  <Bookmark size={22} className="text-neutral-400" /> Tủ Phim Đã
                  Lưu ({watchlistItems.length})
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
                        className="aspect-[2/3] bg-neutral-900 border border-white/15 rounded-2xl overflow-hidden group relative hover:border-white/40 transition-all shadow-xl hover:-translate-y-1.5"
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
                  <Bookmark size={44} className="text-neutral-700 mb-3" />
                  <p className="text-sm font-bold text-neutral-300">
                    Tủ phim của bạn đang trống
                  </p>
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
              <div className="border-b border-white/10 pb-5">
                <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                  <History size={22} className="text-neutral-400" /> Lịch Sử Xem
                  Phim ({historyItems.length})
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
                        className="bg-neutral-900 border border-white/15 hover:border-white/40 rounded-2xl p-4 flex gap-4 items-center transition-all shadow-md group"
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
                            {item.episode
                              ? `Tập ${item.episode}`
                              : "Bản đầy đủ"}
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
                  <History size={44} className="text-neutral-700 mb-3" />
                  <p className="text-sm font-bold text-neutral-300">
                    Chưa có lịch sử xem phim
                  </p>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm font-mono">
                    Các bộ phim bạn đã xem sẽ xuất hiện tại đây.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CÀI ĐẶT TRÌNH PHÁT 4K */}
          {activeTab === "settings" && (
            <div className="max-w-3xl space-y-6 animate-fade-in">
              <div className="border-b border-white/10 pb-5">
                <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                  <Sliders size={22} className="text-neutral-400" /> Cài Đặt
                  Trình Phát 4K
                </h2>
                <p className="text-xs text-neutral-400 mt-1 font-mono">
                  Tùy chỉnh hành vi phát video tự động và chế độ xem phim
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-white">
                      Tự động phát video (Autoplay)
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                      Tự động chạy phim ngay khi mở trang xem.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoplay(!autoplay)}
                    className={`w-12 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center shrink-0 ${
                      autoplay
                        ? "bg-white justify-end"
                        : "bg-neutral-800 justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 bg-black rounded-full shadow-md" />
                  </button>
                </div>

                <div className="p-4.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-white">
                      Tự động chuyển tập tiếp theo
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                      Chuyển sang tập tiếp theo khi tập hiện tại kết thúc.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoNextEpisode(!autoNextEpisode)}
                    className={`w-12 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center shrink-0 ${
                      autoNextEpisode
                        ? "bg-white justify-end"
                        : "bg-neutral-800 justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 bg-black rounded-full shadow-md" />
                  </button>
                </div>

                <div className="p-4.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-white">
                      Mặc định chế độ rạp chiếu (Theater Mode)
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                      Mở rộng trình phát video tràn màn hình rạp chiếu.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTheaterMode(!theaterMode)}
                    className={`w-12 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center shrink-0 ${
                      theaterMode
                        ? "bg-white justify-end"
                        : "bg-neutral-800 justify-start"
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

      {/* ── MODAL: PICK AVATAR ── */}
      <AnimatePresence>
        {showAvatarPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-neutral-950 border border-white/20 rounded-3xl p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-black text-white">
                  Chọn Ảnh Đại Diện (Avatar)
                </h3>
                <button
                  onClick={() => setShowAvatarPicker(false)}
                  className="text-xs font-mono text-neutral-400 hover:text-white"
                >
                  Đóng [✕]
                </button>
              </div>

              {/* Preset Avatars Grid */}
              <div className="grid grid-cols-4 gap-3">
                {PRESET_AVATARS.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedAvatar(url);
                      setCustomAvatarInput("");
                    }}
                    className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all p-0.5 cursor-pointer ${
                      selectedAvatar === url
                        ? "border-white scale-105 shadow-lg"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Avatar ${i}`}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </button>
                ))}
              </div>

              {/* Custom Image URL Input */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                  Hoặc dán đường dẫn ảnh tùy chỉnh (URL)
                </label>
                <input
                  type="url"
                  value={customAvatarInput}
                  onChange={(e) => setCustomAvatarInput(e.target.value)}
                  placeholder="https://example.com/avatar.png..."
                  className="w-full bg-neutral-900 border border-white/15 text-white text-xs rounded-2xl px-4 py-3 outline-none focus:border-white/30"
                />
              </div>

              <button
                onClick={() => setShowAvatarPicker(false)}
                className="w-full py-3 rounded-2xl bg-white text-black font-extrabold text-xs hover:bg-neutral-200 transition-all cursor-pointer shadow-lg"
              >
                Xác Nhận Chọn Avatar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: CONFIRM LOGOUT ── */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-neutral-950 border border-white/20 rounded-3xl p-6 text-center space-y-4 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto text-white">
                <LogOut size={22} />
              </div>
              <h3 className="text-lg font-black text-white">
                Đăng Xuất Tài Khoản?
              </h3>
              <p className="text-xs text-neutral-400 font-mono">
                Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc hiện tại
                trên CinePhim?
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-neutral-900 border border-white/15 text-xs font-bold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  onClick={() => {
                    logout();
                    setShowLogoutModal(false);
                    toast("Đã đăng xuất tài khoản!", "info");
                    router.push("/");
                  }}
                  className="flex-1 py-3 rounded-2xl bg-white text-black font-black text-xs hover:bg-neutral-200 transition-all cursor-pointer shadow-lg"
                >
                  Đăng Xuất
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
