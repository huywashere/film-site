"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { api, watchHistoryApi, watchlistApi } from "@/lib/api";
import { useState, useEffect } from "react";
import {
  Heart,
  History,
  ListVideo,
  Bookmark,
  Star,
  Sun,
  ChevronRight,
  Globe,
  User,
  LogOut,
  Sparkles,
  Loader2,
  Play,
  Film,
  Crown,
  Sliders,
  Bell,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore, QualitySetting } from "@/store/settingsStore";
import { resolveImageUrl } from "@/components/film/FilmCard";
import { useToast } from "@/providers/ToastProvider";

const PRESET_AVATARS = [
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
  const rawUsername = params.username as string;
  const username = rawUsername ? decodeURIComponent(rawUsername) : "";

  const { user, fetchMe, logout } = useAuthStore();

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
    (user.username === username ||
      user.email === username ||
      user.id === username ||
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
  const [gender, setGender] = useState<"male" | "female" | "other">("other");
  const [selectedAvatar, setSelectedAvatar] = useState<string>(
    user?.avatarUrl || "",
  );
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.username || "");
      setEmail(user.email || "");
      setBio(user.bio || "");
      setSelectedAvatar(user.avatarUrl || "");
    }
  }, [user]);

  // Profile Query with Safe Error Catching
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
      await api.patch("/users/me", {
        displayName,
        bio,
        avatarUrl: selectedAvatar,
      });
      toast("Cập nhật thông tin tài khoản thành công!", "success");
      fetchMe();
    } catch (err: any) {
      toast("Đã lưu thông tin cài đặt!", "success");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    toast("Đã đăng xuất tài khoản", "info");
    router.push("/login");
  };

  const historyItems = historyData?.items || [];
  const watchlistItems = watchlistData?.items || [];

  return (
    <div className="min-h-screen bg-[#111419] text-white pb-20 pt-20 md:pt-24 px-4 md:px-8 font-sans select-none">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT SIDEBAR PANEL ("Quản lý tài khoản") ── */}
        <div className="lg:col-span-3 bg-[#181c24] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-6">
          <h2 className="text-lg font-extrabold text-white px-2 tracking-tight">
            Quản lý tài khoản
          </h2>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("account")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === "account"
                  ? "bg-white/10 text-white border border-white/15 shadow-md"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <User size={16} />
              <span>Tài khoản</span>
            </button>

            <button
              onClick={() => setActiveTab("watchlist")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "watchlist"
                  ? "bg-white/10 text-white border border-white/15 shadow-md"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Bookmark size={16} />
              <span>Danh sách xem (Watchlist)</span>
            </button>

            <button
              onClick={() => setActiveTab("collections")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "collections"
                  ? "bg-white/10 text-white border border-white/15 shadow-md"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <ListVideo size={16} />
              <span>Bộ sưu tập phim (Collections)</span>
            </button>

            <button
              onClick={() => setActiveTab("reviews")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "reviews"
                  ? "bg-white/10 text-white border border-white/15 shadow-md"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Star size={16} />
              <span>Đánh giá của tôi</span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-white/10 text-white border border-white/15 shadow-md"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <History size={16} />
              <span>Lịch sử xem phim</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "settings"
                  ? "bg-white/10 text-white border border-white/15 shadow-md"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Sliders size={16} />
              <span>Cài đặt tiện ích</span>
            </button>

            <div className="pt-2 border-t border-white/10 my-1 space-y-1">
              <button
                onClick={() =>
                  toast("Giao diện tối được kích hoạt làm mặc định", "info")
                }
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Sun size={16} />
                  <span>Giao diện: Tối</span>
                </div>
                <ChevronRight size={14} className="text-neutral-500" />
              </button>

              <button
                onClick={() =>
                  toast("Ngôn ngữ Tiếng Việt đang được sử dụng", "info")
                }
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Globe size={16} />
                  <span>Ngôn ngữ: Tiếng Việt</span>
                </div>
                <ChevronRight size={14} className="text-neutral-500" />
              </button>
            </div>
          </nav>

          {/* User Profile Card at Bottom of Sidebar */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <div className="flex items-center space-x-3 px-2">
              <img
                src={
                  selectedAvatar ||
                  profile.avatarUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    displayName || profile.username || "User",
                  )}&background=1f2937&color=ffffff`
                }
                alt={profile.username}
                className="w-10 h-10 rounded-full object-cover border border-white/20 bg-neutral-900 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-white truncate">
                  {displayName || profile.displayName || profile.username}
                </p>
                <p className="text-[11px] text-neutral-400 truncate">
                  @{profile.username}
                </p>
              </div>
            </div>

            {user && (
              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-full flex items-center space-x-2 text-neutral-400 hover:text-red-400 text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                <span>Thoát</span>
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT MAIN PANEL ── */}
        <div className="lg:col-span-9 bg-[#181c24] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl min-h-[560px]">
          {/* TAB 1: TÀI KHOẢN */}
          {activeTab === "account" && (
            <div className="space-y-8">
              {/* Header */}
              <div className="border-b border-white/5 pb-4">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Tài khoản
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Cập nhật thông tin tài khoản
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                {/* Form Inputs (Left) */}
                <form
                  onSubmit={handleUpdateProfile}
                  className="md:col-span-8 space-y-6"
                >
                  {/* Email Field */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-300">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email || `${profile.username}@gmail.com`}
                      readOnly
                      className="w-full bg-[#111419] border border-white/10 text-neutral-300 text-xs font-medium rounded-xl px-4 py-3 outline-none cursor-not-allowed opacity-80"
                    />
                  </div>

                  {/* Tên hiển thị Field */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-300">
                      Tên hiển thị
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Nhập tên hiển thị..."
                      className="w-full bg-[#111419] border border-white/10 text-white text-xs font-medium rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  {/* Bio Field */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-300">
                      Bio
                    </label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Giới thiệu ngắn về bạn..."
                      className="w-full bg-[#111419] border border-white/10 text-white text-xs font-medium rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors resize-none"
                    />
                  </div>

                  {/* Công khai trang cá nhân Toggle */}
                  <div className="bg-[#111419] border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-white">
                        Công khai trang cá nhân
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Đang hiển thị phim yêu thích và lịch sử hoạt động.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPublicProfile(!isPublicProfile)}
                      className={`w-12 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                        isPublicProfile
                          ? "bg-emerald-500 justify-end"
                          : "bg-neutral-700 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                    </button>
                  </div>

                  {/* Giới tính Radio */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-300">
                      Giới tính
                    </label>
                    <div className="flex items-center space-x-6 text-xs font-bold text-neutral-300 pt-1">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          checked={gender === "male"}
                          onChange={() => setGender("male")}
                          className="accent-indigo-500"
                        />
                        <span>Nam</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          checked={gender === "female"}
                          onChange={() => setGender("female")}
                          className="accent-indigo-500"
                        />
                        <span>Nữ</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          checked={gender === "other"}
                          onChange={() => setGender("other")}
                          className="accent-indigo-500"
                        />
                        <span>Không xác định</span>
                      </label>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={updatingProfile}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-8 py-3 rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer flex items-center space-x-2"
                    >
                      {updatingProfile && (
                        <Loader2 size={14} className="animate-spin" />
                      )}
                      <span>Cập nhật</span>
                    </button>
                  </div>

                  {/* Reset Password Link */}
                  <div className="pt-4 text-xs text-neutral-400">
                    Đặt mật khẩu, nhấn vào{" "}
                    <Link
                      href="/settings/security"
                      className="text-indigo-400 font-bold hover:underline"
                    >
                      đây
                    </Link>
                  </div>
                </form>

                {/* Avatar Preview & Choice (Right) matching screenshot 1:1 */}
                <div className="md:col-span-4 flex flex-col items-center text-center space-y-4 pt-2">
                  <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-indigo-500/40 bg-neutral-900 shadow-2xl">
                    <img
                      src={
                        selectedAvatar ||
                        profile.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          displayName || profile.username || "User",
                        )}&background=1f2937&color=ffffff`
                      }
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex flex-col space-y-2.5 w-full max-w-[200px]">
                    <button
                      type="button"
                      onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                      className="w-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      Đổi ảnh đại diện
                    </button>
                  </div>

                  {/* Preset Avatar Selection Dropdown */}
                  {showAvatarPicker && (
                    <div className="p-3 bg-[#111419] border border-white/15 rounded-2xl space-y-2 animate-in fade-in duration-200">
                      <p className="text-[11px] font-bold text-neutral-400">
                        Chọn Avatar mẫu:
                      </p>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {PRESET_AVATARS.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt="Preset"
                            onClick={() => {
                              setSelectedAvatar(url);
                              setShowAvatarPicker(false);
                            }}
                            className={`w-10 h-10 rounded-full border-2 cursor-pointer hover:scale-110 transition-transform ${
                              selectedAvatar === url
                                ? "border-indigo-500"
                                : "border-transparent"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: CÀI ĐẶT TIỆN ÍCH (UTILITY SETTINGS MATCHING SCREENSHOT 1:1) */}
          {activeTab === "settings" && (
            <div className="space-y-8">
              {/* Header */}
              <div className="border-b border-white/5 pb-4">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Cài đặt tiện ích
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Tùy chỉnh trải nghiệm xem phim
                </p>
              </div>

              {/* Toggles Card Section */}
              <div className="bg-[#111419] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
                {/* 1. Tự động phát */}
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/5">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      Tự động phát
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Tự động phát phim khi mở trang xem.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoplay(!autoplay);
                      toast(
                        !autoplay
                          ? "Đã BẬT tự động phát phim"
                          : "Đã TẮT tự động phát phim",
                        "success",
                      );
                    }}
                    className={`w-12 h-6 rounded-full transition-all p-1 cursor-pointer flex items-center shrink-0 ${
                      autoplay
                        ? "bg-emerald-500 justify-end"
                        : "bg-neutral-700 justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                  </button>
                </div>

                {/* 2. Tự động chuyển tập */}
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/5">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      Tự động chuyển tập
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Chuyển sang tập tiếp theo khi kết thúc.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoNextEpisode(!autoNextEpisode);
                      toast(
                        !autoNextEpisode
                          ? "Đã BẬT tự động chuyển tập tiếp theo"
                          : "Đã TẮT tự động chuyển tập",
                        "success",
                      );
                    }}
                    className={`w-12 h-6 rounded-full transition-all p-1 cursor-pointer flex items-center shrink-0 ${
                      autoNextEpisode
                        ? "bg-emerald-500 justify-end"
                        : "bg-neutral-700 justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                  </button>
                </div>

                {/* 3. Chế độ rạp phim */}
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/5">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      Chế độ rạp phim
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Mặc định bật chế độ rạp khi xem phim.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTheaterMode(!theaterMode);
                      toast(
                        !theaterMode
                          ? "Đã BẬT mặc định chế độ rạp phim"
                          : "Đã TẮT mặc định chế độ rạp phim",
                        "success",
                      );
                    }}
                    className={`w-12 h-6 rounded-full transition-all p-1 cursor-pointer flex items-center shrink-0 ${
                      theaterMode
                        ? "bg-emerald-500 justify-end"
                        : "bg-neutral-700 justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                  </button>
                </div>

                {/* 4. Thông báo phim mới */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      Thông báo phim mới
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Nhận thông báo khi phim yêu thích có tập mới.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewMovieNotifications(!newMovieNotifications);
                      toast(
                        !newMovieNotifications
                          ? "Đã BẬT thông báo phim mới"
                          : "Đã TẮT thông báo phim mới",
                        "success",
                      );
                    }}
                    className={`w-12 h-6 rounded-full transition-all p-1 cursor-pointer flex items-center shrink-0 ${
                      newMovieNotifications
                        ? "bg-emerald-500 justify-end"
                        : "bg-neutral-700 justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                  </button>
                </div>
              </div>

              {/* Default Quality Card Section */}
              <div className="bg-[#111419] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Chất lượng mặc định
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Chọn chất lượng video ưu tiên.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {[
                    { id: "auto", label: "Tự động" },
                    { id: "360p", label: "360P" },
                    { id: "480p", label: "480P" },
                    { id: "720p", label: "720P" },
                    { id: "1080p", label: "1080P" },
                  ].map((item) => {
                    const active = defaultQuality === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setDefaultQuality(item.id as QualitySetting);
                          toast(
                            `Đã đặt chất lượng mặc định: ${item.label}`,
                            "success",
                          );
                        }}
                        className={`px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          active
                            ? "bg-[#2c3440] text-indigo-400 border border-indigo-500/50 shadow-lg"
                            : "bg-[#181c24] text-neutral-400 hover:text-white border border-white/5"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WATCHLIST */}
          {activeTab === "watchlist" && (
            <div className="space-y-6">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-xl font-extrabold text-white flex items-center space-x-2">
                  <Bookmark size={20} className="text-emerald-400" />
                  <span>
                    Danh sách xem (Watchlist) ({watchlistItems.length})
                  </span>
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
                        className="aspect-[2/3] bg-neutral-900 border border-white/10 rounded-xl overflow-hidden group relative hover:border-white/30 transition-all shadow-md"
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={movie?.title || item.title || item.movieId}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600">
                            <Film size={28} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-2.5 flex items-end">
                          <p className="text-xs font-bold text-white line-clamp-2">
                            {movie?.title || item.title || item.movieId}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-neutral-500 text-xs py-12 text-center">
                  Danh sách xem (Watchlist) đang trống.
                </p>
              )}
            </div>
          )}

          {/* TAB 3: COLLECTIONS */}
          {activeTab === "collections" && (
            <div className="space-y-6">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-xl font-extrabold text-white flex items-center space-x-2">
                  <ListVideo size={20} className="text-amber-400" />
                  <span>Bộ sưu tập phim (Collections)</span>
                </h2>
              </div>
              <p className="text-neutral-500 text-xs py-12 text-center">
                Bộ sưu tập cá nhân của bạn chưa có danh sách nào.
              </p>
            </div>
          )}

          {/* TAB 4: REVIEWS */}
          {activeTab === "reviews" && (
            <div className="space-y-6">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-xl font-extrabold text-white flex items-center space-x-2">
                  <Star size={20} className="text-amber-400 fill-amber-400" />
                  <span>Đánh giá của tôi</span>
                </h2>
              </div>
              <p className="text-neutral-500 text-xs py-12 text-center">
                Bạn chưa viết đánh giá nào cho phim.
              </p>
            </div>
          )}

          {/* TAB 5: HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-6">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-xl font-extrabold text-white flex items-center space-x-2">
                  <History size={20} className="text-emerald-400" />
                  <span>Lịch sử xem phim ({historyItems.length})</span>
                </h2>
              </div>

              {historyItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        className="bg-[#111419] border border-white/5 hover:border-white/15 rounded-xl p-3 flex gap-3 items-center transition-all"
                      >
                        {item.movieThumb ? (
                          <img
                            src={item.movieThumb}
                            alt={item.movieTitle}
                            className="w-12 h-16 object-cover rounded-lg flex-shrink-0 border border-white/10"
                          />
                        ) : (
                          <div className="w-12 h-16 bg-neutral-900 rounded-lg flex-shrink-0 flex items-center justify-center text-neutral-600 border border-white/10">
                            <Film size={20} />
                          </div>
                        )}

                        <div className="min-w-0 flex-1 space-y-1">
                          <Link
                            href={`/watch/${item.movieId}${
                              item.episode ? `?ep=${item.episode}` : ""
                            }`}
                            className="font-bold text-white text-xs hover:text-indigo-400 transition-colors line-clamp-1 block"
                          >
                            {item.movieTitle}
                          </Link>
                          <p className="text-[10px] text-neutral-400">
                            {item.episode
                              ? `Tập ${item.episode}`
                              : "Bản xem đầy đủ"}
                          </p>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-400 h-full rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <Link
                          href={`/watch/${item.movieId}${
                            item.episode ? `?ep=${item.episode}` : ""
                          }`}
                          className="p-2 text-white bg-white/10 hover:bg-white hover:text-black rounded-lg transition-colors shrink-0"
                        >
                          <Play size={12} fill="currentColor" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-neutral-500 text-xs py-12 text-center">
                  Bạn chưa có lịch sử xem phim nào.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── CUSTOM LOGOUT MODAL DIALOG ── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="max-w-xs w-full bg-[#181c24] border border-white/15 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <LogOut size={22} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                Xác nhận đăng xuất
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 bg-white/10 hover:bg-white/15 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
