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

// ── Toggle component ────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
        checked ? "bg-[#e50914]" : "bg-white/10"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

// ── Setting row ─────────────────────────────────────────────────────
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
        <p className="mt-0.5 text-xs text-neutral-500 leading-5">{desc}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

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
      await authApi.changePassword({ currentPassword, newPassword });
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
    { id: "account", label: "Thông tin cá nhân", icon: User, category: "profile" },
    { id: "stats", label: "Thống kê", icon: BarChart3, category: "profile" },
    { id: "watchlist", label: `Tủ phim (${watchlistItems.length})`, icon: Bookmark, category: "profile" },
    { id: "history", label: `Lịch sử (${historyItems.length})`, icon: History, category: "profile" },
    { id: "settings", label: "Trình phát", icon: Sliders, category: "settings" },
    { id: "security", label: "Bảo mật", icon: Lock, category: "settings" },
  ];

  // ── Input style ──────────────────────────────────────────────────
  const inputCls =
    "w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none transition-all focus:border-white/25 focus:bg-white/[0.07]";

  return (
    <main className="min-h-screen bg-[#141414] text-white select-none">
      {/* ── COVER BANNER ── */}
      <div className="relative h-48 sm:h-56 overflow-hidden bg-gradient-to-br from-neutral-900 via-[#1a1a1a] to-[#141414]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(229,9,20,0.12)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(255,255,255,0.03)_0%,_transparent_50%)]" />
        {/* Subtle film strip pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "repeating-linear-gradient(90deg, #fff 0px, #fff 2px, transparent 2px, transparent 60px)" }} />
      </div>

      {/* ── PROFILE HEADER (overlapping cover) ── */}
      <div className="mx-auto max-w-[1300px] px-4 sm:px-8">
        <div className="-mt-16 flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-6 pb-6 border-b border-white/[0.07]">
          {/* Avatar */}
          <div className="relative shrink-0 group">
            <div className={cn(
              "h-28 w-28 sm:h-32 sm:w-32 rounded-full overflow-hidden border-4 ring-2",
              isOwnProfile
                ? "border-[#141414] ring-[#e50914]/60"
                : "border-[#141414] ring-white/10"
            )}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  selectedAvatar ||
                  profile.avatarUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    displayName || profile.username || "User",
                  )}&background=1a1a1a&color=ffffff`
                }
                alt={profile.username}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            {isOwnProfile && (
              <button
                onClick={() => setShowAvatarPicker(true)}
                className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-white text-black flex items-center justify-center cursor-pointer hover:bg-neutral-200 transition-colors"
                title="Đổi avatar"
              >
                <Camera size={13} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Identity */}
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between pb-1">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {displayName || profile.displayName || profile.username}
                </h1>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#e50914]/10 border border-[#e50914]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#e50914] uppercase tracking-wider">
                    <Sparkles size={10} /> Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] border border-white/10 px-2.5 py-0.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    <Crown size={10} /> VIP 4K
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-500">
                @{profile.username}
                <span className="mx-2 text-neutral-700">·</span>
                <span className="text-neutral-400">{user?.email || `${profile.username}@gmail.com`}</span>
              </p>
              {profile.bio && (
                <p className="text-sm text-neutral-400 leading-relaxed max-w-md line-clamp-2">
                  {profile.bio}
                </p>
              )}
            </div>

            {/* Quick stats + actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Stats */}
              <div className="flex items-center gap-px rounded-lg overflow-hidden border border-white/10">
                <div className="px-5 py-2.5 bg-white/[0.04] text-center min-w-[80px]">
                  <div className="text-lg font-black text-white">{watchlistItems.length}</div>
                  <div className="text-[10px] text-neutral-500 font-medium">Tủ phim</div>
                </div>
                <div className="px-5 py-2.5 bg-white/[0.04] text-center min-w-[80px] border-l border-white/10">
                  <div className="text-lg font-black text-white">{historyItems.length}</div>
                  <div className="text-[10px] text-neutral-500 font-medium">Đã xem</div>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast("Đã sao chép liên kết!", "success");
                }}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs font-semibold text-neutral-300 hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
              >
                <Share2 size={13} /> Chia sẻ
              </button>

              {user && (
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-transparent px-3.5 py-2.5 text-xs font-semibold text-neutral-500 hover:bg-white/[0.04] hover:text-white transition-colors cursor-pointer"
                >
                  <LogOut size={13} /> Đăng xuất
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── MAIN WORKSPACE ── */}
        <div className="flex gap-8 py-8 pb-28">
          {/* ── LEFT SIDEBAR ── */}
          <aside className="hidden lg:block w-52 shrink-0 sticky top-20 self-start">
            <div className="space-y-6">
              {/* Profile group */}
              <div>
                <p className="px-2 mb-2 text-[10px] font-bold tracking-[0.1em] text-neutral-600 uppercase">
                  Hồ sơ
                </p>
                <div className="space-y-0.5">
                  {TABS.filter((t) => t.category === "profile").map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                          isActive
                            ? "bg-white/[0.08] text-white border-l-2 border-[#e50914] pl-[10px]"
                            : "text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-200 border-l-2 border-transparent pl-[10px]"
                        )}
                      >
                        <Icon size={15} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Settings group */}
              <div>
                <p className="px-2 mb-2 text-[10px] font-bold tracking-[0.1em] text-neutral-600 uppercase">
                  Cài đặt
                </p>
                <div className="space-y-0.5">
                  {TABS.filter((t) => t.category === "settings").map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                          isActive
                            ? "bg-white/[0.08] text-white border-l-2 border-[#e50914] pl-[10px]"
                            : "text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-200 border-l-2 border-transparent pl-[10px]"
                        )}
                      >
                        <Icon size={15} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* ── MOBILE TAB BAR ── */}
          <div className="lg:hidden w-full fixed bottom-0 left-0 z-40 bg-[#141414]/95 backdrop-blur border-t border-white/[0.07] flex overflow-x-auto px-2 py-2 gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap cursor-pointer transition-colors shrink-0",
                    isActive ? "text-white bg-white/10" : "text-neutral-600"
                  )}
                >
                  <Icon size={16} />
                  <span>{tab.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>

          {/* ── RIGHT CONTENT PANEL ── */}
          <div className="flex-1 min-w-0">

            {/* TAB: THÔNG TIN CÁ NHÂN */}
            {activeTab === "account" && (
              <form onSubmit={handleUpdateProfile} className="max-w-2xl animate-fade-in space-y-6">
                <div className="border-b border-white/[0.07] pb-4">
                  <h2 className="text-lg font-bold text-white">Thông tin cá nhân</h2>
                  <p className="mt-1 text-sm text-neutral-500">Cập nhật thông tin hiển thị công khai trên CinePhim.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">Email tài khoản</label>
                    <input type="email" value={email || `${profile.username}@gmail.com`} readOnly
                      className={cn(inputCls, "cursor-not-allowed opacity-50")} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">Tên hiển thị</label>
                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Nhập tên hiển thị..." className={inputCls} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">Giới thiệu</label>
                    <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)}
                      placeholder="Viết vài dòng về phong cách xem phim của bạn..."
                      className={cn(inputCls, "resize-none")} />
                  </div>

                  <div className="flex items-center justify-between py-3 border-t border-b border-white/[0.07]">
                    <div>
                      <p className="text-sm font-semibold text-white">Hồ sơ công khai</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Cho phép người khác xem tủ phim của bạn.</p>
                    </div>
                    <Toggle checked={isPublicProfile} onChange={() => setIsPublicProfile(!isPublicProfile)} />
                  </div>
                </div>

                <button type="submit" disabled={updatingProfile}
                  className="flex items-center gap-2 rounded-lg bg-[#e50914] hover:bg-[#c4070f] px-6 py-3 text-sm font-bold text-white transition-colors cursor-pointer disabled:opacity-60">
                  {updatingProfile && <Loader2 size={15} className="animate-spin" />}
                  Lưu thay đổi
                </button>
              </form>
            )}

            {/* TAB: THỐNG KÊ */}
            {activeTab === "stats" && (
              <div className="max-w-3xl animate-fade-in space-y-6">
                <div className="border-b border-white/[0.07] pb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">Thống kê xem phim</h2>
                    <p className="mt-1 text-sm text-neutral-500">Tổng quan hành trình điện ảnh của bạn trên CinePhim.</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-lg">
                    <Trophy size={13} />
                    {historyItems.length >= 20 ? "Đại Cao Thủ 4K" : historyItems.length >= 5 ? "Cinephile Chính Hiệu" : "Mọt Phim Tập Sự"}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Thời gian xem", value: `${Math.floor((historyItems.length * 45) / 60)}h ${(historyItems.length * 45) % 60}m`, icon: Clock },
                    { label: "Tập đã xem", value: historyItems.length, icon: Film },
                    { label: "Tủ phim", value: watchlistItems.length, icon: Bookmark },
                    { label: "Điểm TB", value: "9.8", icon: Award },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 hover:border-white/[0.14] transition-colors">
                      <div className="flex items-center justify-between text-neutral-500 mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
                        <Icon size={14} />
                      </div>
                      <div className="text-2xl font-black text-white">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-white mb-4">
                    <Flame size={14} className="text-amber-400" /> Thể loại xem nhiều nhất
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: "🇰🇷 Phim Hàn Quốc", pct: 42, note: "42% • 28 giờ" },
                      { label: "🇨🇳 Phim Trung Quốc", pct: 28, note: "28% • 19 giờ" },
                      { label: "💥 Hành Động & Viễn Tưởng", pct: 18, note: "18% • 12 giờ" },
                      { label: "🍿 Khác", pct: 12, note: "12% • 8 giờ" },
                    ].map(({ label, pct, note }) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs font-medium mb-1.5">
                          <span className="text-neutral-300">{label}</span>
                          <span className="text-neutral-500">{note}</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: BẢO MẬT */}
            {activeTab === "security" && (
              <form onSubmit={handleChangePassword} className="max-w-2xl animate-fade-in space-y-6">
                <div className="border-b border-white/[0.07] pb-4">
                  <h2 className="text-lg font-bold text-white">Mật khẩu & Bảo mật</h2>
                  <p className="mt-1 text-sm text-neutral-500">Đổi mật khẩu và bảo vệ tài khoản của bạn.</p>
                </div>

                <div className="space-y-4">
                  {[
                    { label: "Mật khẩu hiện tại", value: currentPassword, onChange: setCurrentPassword, placeholder: "Nhập mật khẩu hiện tại..." },
                    { label: "Mật khẩu mới", value: newPassword, onChange: setNewPassword, placeholder: "Tối thiểu 6 ký tự..." },
                    { label: "Xác nhận mật khẩu mới", value: confirmPassword, onChange: setConfirmPassword, placeholder: "Nhập lại mật khẩu mới..." },
                  ].map(({ label, value, onChange, placeholder }) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">{label}</label>
                      <div className="relative">
                        <input type={showPasswords ? "text" : "password"} value={value}
                          onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                          className={cn(inputCls, "pr-12")} />
                        <button type="button" onClick={() => setShowPasswords(!showPasswords)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer">
                          {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">Xác thực 2 yếu tố (2FA)</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Tài khoản của bạn đang được bảo vệ an toàn.</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
                    Đang bật
                  </span>
                </div>

                <button type="submit" disabled={changingPassword}
                  className="flex items-center gap-2 rounded-lg bg-[#e50914] hover:bg-[#c4070f] px-6 py-3 text-sm font-bold text-white transition-colors cursor-pointer disabled:opacity-60">
                  {changingPassword && <Loader2 size={15} className="animate-spin" />}
                  <Key size={14} /> Cập nhật mật khẩu
                </button>
              </form>
            )}

            {/* TAB: TỦ PHIM */}
            {activeTab === "watchlist" && (
              <div className="animate-fade-in space-y-5">
                <div className="border-b border-white/[0.07] pb-4">
                  <h2 className="text-lg font-bold text-white">Tủ phim đã lưu <span className="text-neutral-500 font-normal">({watchlistItems.length})</span></h2>
                </div>

                {watchlistItems.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {watchlistItems.map((item: any) => {
                      const movie = item.movieData || item.movie;
                      const thumb = resolveImageUrl(movie?.thumb_url) || resolveImageUrl(movie?.poster_url) || item.thumbUrl;
                      return (
                        <Link key={item.id} href={`/film/${movie?.slug || item.movieId}`}
                          className="group relative aspect-[2/3] overflow-hidden rounded-lg bg-neutral-900 border border-white/[0.07] hover:border-white/20 transition-all">
                          {thumb ? (
                            <img src={thumb} alt={movie?.title || item.movieId}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-700"><Film size={28} /></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-2.5 flex items-end">
                            <p className="text-[11px] font-bold text-white line-clamp-2 leading-tight">
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
                    <p className="text-sm font-semibold text-neutral-400">Tủ phim đang trống</p>
                    <p className="text-xs text-neutral-600 mt-1">Bấm nút lưu trên các bộ phim để thêm vào đây.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: LỊCH SỬ */}
            {activeTab === "history" && (
              <div className="animate-fade-in space-y-5">
                <div className="border-b border-white/[0.07] pb-4">
                  <h2 className="text-lg font-bold text-white">Lịch sử xem phim <span className="text-neutral-500 font-normal">({historyItems.length})</span></h2>
                </div>

                {historyItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {historyItems.map((item: any) => {
                      const pct = item.duration > 0
                        ? Math.min(100, Math.round((item.progress / item.duration) * 100))
                        : 0;
                      return (
                        <div key={item.id}
                          className="flex gap-3 items-center rounded-lg border border-white/[0.07] bg-white/[0.02] p-3 hover:border-white/[0.14] hover:bg-white/[0.04] transition-all group">
                          {item.movieThumb ? (
                            <img src={item.movieThumb} alt={item.movieTitle}
                              className="w-12 h-[68px] object-cover rounded-md shrink-0 border border-white/[0.07]" />
                          ) : (
                            <div className="w-12 h-[68px] bg-neutral-800 rounded-md shrink-0 flex items-center justify-center text-neutral-600 border border-white/[0.07]">
                              <Film size={18} />
                            </div>
                          )}

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <Link href={`/watch/${item.movieId}${item.episode ? `?ep=${item.episode}` : ""}`}
                              className="block text-sm font-bold text-white hover:text-neutral-200 line-clamp-1 transition-colors">
                              {item.movieTitle}
                            </Link>
                            <p className="text-xs text-neutral-500">{item.episode ? `Tập ${item.episode}` : "Bản đầy đủ"}</p>
                            <div className="w-full bg-white/[0.07] h-1 rounded-full overflow-hidden">
                              <div className="bg-[#e50914] h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>

                          <Link href={`/watch/${item.movieId}${item.episode ? `?ep=${item.episode}` : ""}`}
                            className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center shrink-0 hover:bg-neutral-200 transition-colors">
                            <Play size={12} className="fill-current ml-0.5" />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <History size={40} className="text-neutral-700 mb-3" />
                    <p className="text-sm font-semibold text-neutral-400">Chưa có lịch sử xem</p>
                    <p className="text-xs text-neutral-600 mt-1">Các phim bạn đã xem sẽ xuất hiện tại đây.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: TRÌNH PHÁT */}
            {activeTab === "settings" && (
              <div className="max-w-2xl animate-fade-in space-y-6">
                <div className="border-b border-white/[0.07] pb-4">
                  <h2 className="text-lg font-bold text-white">Cài đặt trình phát</h2>
                  <p className="mt-1 text-sm text-neutral-500">Tùy chỉnh trải nghiệm xem phim 4K của bạn.</p>
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
          </div>
        </div>
      </div>

      {/* ── MODAL: PICK AVATAR ── */}
      <AnimatePresence>
        {showAvatarPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }} transition={{ duration: 0.15 }}
              className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Chọn ảnh đại diện</h3>
                <button onClick={() => setShowAvatarPicker(false)}
                  className="text-neutral-500 hover:text-white text-xs cursor-pointer">✕ Đóng</button>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {PRESET_AVATARS.map((url, i) => (
                  <button key={i} onClick={() => { setSelectedAvatar(url); setCustomAvatarInput(""); }}
                    className={cn("aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer",
                      selectedAvatar === url ? "border-[#e50914] scale-105" : "border-transparent opacity-60 hover:opacity-100")}>
                    <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover rounded-lg" />
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-white/[0.07] space-y-2">
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Hoặc dán URL ảnh tùy chỉnh
                </label>
                <input type="url" value={customAvatarInput} onChange={(e) => setCustomAvatarInput(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                  className="w-full bg-white/[0.04] border border-white/10 text-white text-sm rounded-lg px-4 py-2.5 outline-none focus:border-white/25" />
              </div>

              <button onClick={() => setShowAvatarPicker(false)}
                className="w-full py-2.5 rounded-lg bg-[#e50914] hover:bg-[#c4070f] text-white text-sm font-bold transition-colors cursor-pointer">
                Xác nhận
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: CONFIRM LOGOUT ── */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }} transition={{ duration: 0.15 }}
              className="w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                <LogOut size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Đăng xuất?</h3>
                <p className="text-xs text-neutral-500 mt-1.5">Bạn có chắc muốn đăng xuất khỏi phiên làm việc hiện tại trên CinePhim?</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 bg-white/[0.04] text-sm font-semibold text-neutral-300 hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer">
                  Hủy
                </button>
                <button onClick={() => { logout(); setShowLogoutModal(false); toast("Đã đăng xuất!", "info"); router.push("/"); }}
                  className="flex-1 py-2.5 rounded-lg bg-[#e50914] hover:bg-[#c4070f] text-sm font-bold text-white transition-colors cursor-pointer">
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
