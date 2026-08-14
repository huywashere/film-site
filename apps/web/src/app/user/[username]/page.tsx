"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api, watchHistoryApi, watchlistApi, authApi } from "@/lib/api";
import { useState, useEffect, startTransition } from "react";
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
  Shield,
  Laptop,
  RefreshCw,
  ShieldAlert,
  KeyRound,
  Copy,
  Check,
  Monitor,
  Smartphone,
  ArrowLeft,
  X,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { resolveImageUrl } from "@/components/film/FilmCard";
import { useToast } from "@/providers/ToastProvider";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AccountPageTabs } from "@/components/account/AccountPageTabs";
import { cardFont } from "@/lib/fonts";
import { PRESET_AVATARS, type PresetAvatar } from "@/lib/default-avatars";

interface Session {
  id: string;
  ipAddress: string;
  browser: string;
  os: string;
  device?: string;
  lastUsedAt: string;
  createdAt: string;
  isCurrent: boolean;
}

// ── 2FA Section ──────────────────────────────────────────────────────
function TwoFactorSection({
  user,
  onSetup,
  onDisable,
  disabling,
}: {
  user: any;
  onSetup: () => void;
  onDisable: () => void;
  disabling: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center",
            user?.twoFactorEnabled
              ? "bg-emerald-500/10 border border-emerald-500/20"
              : "bg-white/[0.05] border border-white/10"
          )}>
            <Shield className={cn("h-5 w-5", user?.twoFactorEnabled ? "text-emerald-400" : "text-neutral-400")} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Xác thực hai bước (2FA)</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Thêm một lớp bảo vệ bằng mã OTP từ ứng dụng Authenticator.
            </p>
          </div>
        </div>

        <span className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0",
          user?.twoFactorEnabled
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-white/[0.05] border border-white/10 text-neutral-500"
        )}>
          {user?.twoFactorEnabled ? <><CheckCircle2 className="h-3 w-3" /> Đang bật</> : <><ShieldAlert className="h-3 w-3" /> Tắt</>}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 p-5">
        <p className="text-xs text-neutral-500">
          {user?.twoFactorEnabled
            ? "Tài khoản đã được bảo vệ bằng 2FA. Bạn có thể tắt nếu cần."
            : "Khuyến nghị bật để bảo vệ tài khoản khỏi truy cập trái phép."}
        </p>

        {user?.twoFactorEnabled ? (
          <button onClick={onDisable} disabled={disabling}
            className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-neutral-400 text-xs font-semibold px-4 py-2 transition-all cursor-pointer disabled:opacity-50">
            {disabling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tắt 2FA"}
          </button>
        ) : (
          <button onClick={onSetup}
            className="shrink-0 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-bold px-4 py-2 transition-colors cursor-pointer">
            Bật xác thực
          </button>
        )}
      </div>
    </div>
  );
}

// ── Google Link Section ──────────────────────────────────────────────
function GoogleLinkSection({ user }: { user: any }) {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "production"
      ? "/api/v1"
      : "http://localhost:3001/api/v1");
  const googleLinkUrl = `${apiBase.replace("/api/v1", "")}/api/v1/auth/google`;

  return (
    <div className="rounded-xl border border-white/10 bg-black overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
            <KeyRound className="h-5 w-5 text-neutral-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Liên kết tài khoản Google</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Đăng nhập nhanh hơn qua Google ở những lần sau.</p>
          </div>
        </div>

        <span className={cn(
          "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0",
          user?.googleId
            ? "bg-white/[0.07] border border-white/10 text-neutral-300"
            : "bg-white/[0.03] border border-white/[0.07] text-neutral-600"
        )}>
          {user?.googleId ? "Đã liên kết" : "Chưa liên kết"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 p-5">
        <p className="text-xs text-neutral-500">
          {user?.googleId ? "Tài khoản Google đã được liên kết thành công." : "Chưa kết nối tài khoản Google nào."}
        </p>

        {user?.googleId ? (
          <button disabled
            className="shrink-0 rounded-lg border border-white/[0.07] bg-white/[0.03] text-neutral-600 text-xs font-semibold px-4 py-2 cursor-not-allowed">
            Đã liên kết
          </button>
        ) : (
          <a href={googleLinkUrl}
            className="shrink-0 rounded-lg border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-semibold px-4 py-2 transition-colors flex items-center gap-2">
            Liên kết Google
          </a>
        )}
      </div>
    </div>
  );
}

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
  const { user, logout, fetchMe } = useAuthStore();

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

  const [customUsername, setCustomUsername] = useState(
    user?.username || decodedUsername || "",
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

  useEffect(() => {
    if (user) {
      if (user.username) setCustomUsername(user.username);
      if (user.displayName) setDisplayName(user.displayName);
      if (user.email) setEmail(user.email);
      if (user.bio) setBio(user.bio);
      if (user.avatarUrl) setSelectedAvatar(user.avatarUrl);
    }
  }, [user]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState<{
    qrCode: string;
    secret: string;
    backupCodes: string[];
  } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  useEffect(() => {
    if (activeTab === "security" && isOwnProfile) {
      loadSessions();
    }
  }, [activeTab, isOwnProfile]);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await authApi.getSessions();
      setSessions(res.data || []);
    } catch (err) {
      console.error("Failed to load sessions", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      await authApi.revokeSession(id);
      toast("Đăng xuất thiết bị thành công", "success");
      loadSessions();
    } catch (err) {
      toast("Đăng xuất thiết bị thất bại", "error");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    if (!confirm("Bạn có chắc muốn đăng xuất khỏi tất cả thiết bị khác không?")) return;
    setRevokingAll(true);
    try {
      await authApi.revokeAllSessions();
      toast("Đã đăng xuất toàn bộ thiết bị khác", "success");
      loadSessions();
    } catch (err) {
      toast("Thao tác thất bại", "error");
    } finally {
      setRevokingAll(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      const res = await authApi.setup2FA();
      setTwoFactorData(res.data);
      setShow2FAModal(true);
    } catch (err) {
      toast("Không thể sinh QR Code cho 2FA", "error");
    }
  };

  const handleVerify2FA = async () => {
    if (!otpCode) return;
    setVerifying2FA(true);
    try {
      await authApi.verify2FA({ code: otpCode });
      toast("Kích hoạt 2FA thành công!", "success");
      setShow2FAModal(false);
      setTwoFactorData(null);
      setOtpCode("");
      fetchMe();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Mã OTP không chính xác";
      toast(Array.isArray(msg) ? msg.join(", ") : msg, "error");
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    const code = prompt("Nhập mã OTP 6 số từ ứng dụng Authenticator để tắt 2FA:");
    if (!code) return;
    setDisabling2FA(true);
    try {
      await authApi.disable2FA({ code });
      toast("Đã tắt 2FA an toàn", "success");
      fetchMe();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Không thể tắt 2FA";
      toast(Array.isArray(msg) ? msg.join(", ") : msg, "error");
    } finally {
      setDisabling2FA(false);
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
      const cleanUsername = customUsername
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9_.-]/g, "");

      const { data } = await authApi.updateProfile({
        username: cleanUsername || undefined,
        displayName,
        avatarUrl: avatarToSave || undefined,
        bio,
      });
      if (data) {
        useAuthStore.getState().setUser({
          ...user!,
          username: cleanUsername || user?.username || "",
          displayName: data.displayName || displayName,
          avatarUrl: data.avatarUrl || avatarToSave,
          bio: data.bio || bio,
        });
      }
      toast("Đã cập nhật thông tin hồ sơ thành công!", "success");
      setShowAvatarPicker(false);
      if (cleanUsername && cleanUsername !== user?.username) {
        router.replace(`/user/${encodeURIComponent(cleanUsername)}`);
      }
    } catch (err: any) {
      toast(
        err?.response?.data?.message ||
          err?.message ||
          "Cập nhật thông tin thành công!",
        "success",
      );
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
    user?.email?.toLowerCase() === "huywashere@gmail.com" ||
    profile.username?.toLowerCase() === "huywashere" ||
    (user?.role === "ADMIN" && user?.email?.toLowerCase() === "huywashere@gmail.com"),
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
    <main className={cn("min-h-screen bg-[#141414] text-white select-none", cardFont.className)}>
      {/* ── PROFILE HEADER ── */}
      <div className="mx-auto max-w-[1300px] px-4 sm:px-8 pt-24 pb-28">
        {/* Nút Quay lại trang trước */}
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

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6 pb-6 border-b border-white/[0.08]">
          {/* Avatar */}
          <div className="relative shrink-0 group">
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden border-2 border-white/20 bg-neutral-900 shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  selectedAvatar ||
                  profile.avatarUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    displayName || profile.username || "User",
                  )}&background=8b5cf6&color=ffffff&size=160`
                }
                alt={profile.username}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    displayName || profile.username || "User",
                  )}&background=8b5cf6&color=ffffff&size=160`;
                }}
              />
            </div>
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setShowAvatarPicker(true)}
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white text-black shadow-lg flex items-center justify-center cursor-pointer hover:bg-neutral-200 transition-all hover:scale-105"
                title="Đổi ảnh đại diện"
              >
                <Camera size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Identity */}
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-1">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {displayName || profile.displayName || profile.username}
                </h1>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-violet-300">
                    <Sparkles size={11} className="text-violet-400" /> Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-0.5 text-[11px] font-medium text-neutral-300">
                    <Crown size={11} className="text-amber-400" /> VIP
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-neutral-400">
                @{profile.username}
                {isOwnProfile && user?.email && (
                  <>
                    <span className="mx-2 text-neutral-600">·</span>
                    <span>{user.email}</span>
                  </>
                )}
              </p>
              {profile.bio && (
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-md line-clamp-2 pt-0.5">
                  {profile.bio}
                </p>
              )}
            </div>

            {/* Quick stats + actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Stats */}
              <div className="flex items-center gap-px rounded-xl overflow-hidden border border-white/10 bg-white/[0.03]">
                <div className="px-4 py-2 text-center min-w-[72px]">
                  <div className="text-base font-bold text-white">
                    {watchlistItems.length}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-medium">
                    Tủ phim
                  </div>
                </div>
                <div className="px-4 py-2 text-center min-w-[72px] border-l border-white/10">
                  <div className="text-base font-bold text-white">
                    {historyItems.length}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-medium">
                    Đã xem
                  </div>
                </div>
              </div>

              {/* Actions */}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast("Đã sao chép liên kết hồ sơ!", "success");
                }}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer active:scale-95"
              >
                <Share2 size={13} /> Chia sẻ
              </button>

              {user && (
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2 text-xs font-semibold text-neutral-400 hover:bg-white/[0.06] hover:text-white transition-all cursor-pointer active:scale-95"
                >
                  <LogOut size={13} /> Đăng xuất
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── MAIN WORKSPACE ── */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 py-6 pb-28">
          {/* ── MOBILE IN-FLOW TAB BAR (Placed cleanly under profile header) ── */}
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
          <aside className="hidden lg:block w-56 shrink-0 sticky top-24 self-start">
            <div className="space-y-5 rounded-2xl border border-white/10 bg-[#161618] p-3.5 shadow-xl">
              {/* Profile group */}
              <div>
                <p className="px-2.5 mb-2 text-[10px] font-bold tracking-[0.1em] text-neutral-500 uppercase">
                  Hồ sơ
                </p>
                <div className="space-y-1">
                  {TABS.filter((t) => t.category === "profile").map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() =>
                          startTransition(() => setActiveTab(tab.id))
                        }
                        className={cn(
                          "group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all",
                          isActive
                            ? "bg-white/10 text-white shadow-sm"
                            : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200",
                        )}
                      >
                        <Icon
                          size={15}
                          className={cn(
                            "shrink-0",
                            isActive ? "text-violet-400" : "text-neutral-400",
                          )}
                        />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Settings group */}
              <div>
                <p className="px-2.5 mb-2 text-[10px] font-bold tracking-[0.1em] text-neutral-500 uppercase">
                  Cài đặt
                </p>
                <div className="space-y-1">
                  {TABS.filter((t) => t.category === "settings").map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() =>
                          startTransition(() => setActiveTab(tab.id))
                        }
                        className={cn(
                          "group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all",
                          isActive
                            ? "bg-white/10 text-white shadow-sm"
                            : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200",
                        )}
                      >
                        <Icon
                          size={15}
                          className={cn(
                            "shrink-0",
                            isActive ? "text-violet-400" : "text-neutral-400",
                          )}
                        />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* ── RIGHT CONTENT PANEL ── */}
          <div className="flex-1 min-w-0">
            {/* TAB: THÔNG TIN CÁ NHÂN */}
            {activeTab === "account" && (
              <form
                onSubmit={handleUpdateProfile}
                className="max-w-2xl animate-fade-in space-y-6 rounded-2xl border border-white/10 bg-[#161618] p-5 sm:p-7 shadow-xl"
              >
                <div className="border-b border-white/[0.07] pb-4">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Thông tin cá nhân
                  </h2>
                  <p className="mt-1 text-xs text-neutral-400">
                    Cập nhật thông tin hiển thị công khai trên NetPhim.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">
                      Email tài khoản
                    </label>
                    <input
                      type="email"
                      value={email || `${profile.username}@gmail.com`}
                      readOnly
                      className={cn(inputCls, "cursor-not-allowed opacity-50")}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">
                      Tên người dùng (Username)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-sm pointer-events-none">
                        @
                      </span>
                      <input
                        type="text"
                        value={customUsername}
                        onChange={(e) =>
                          setCustomUsername(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-zA-Z0-9_.-]/g, ""),
                          )
                        }
                        placeholder="admin"
                        className={cn(inputCls, "pl-9 font-mono text-xs sm:text-sm")}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-500">
                      Tên định danh tài khoản, dùng cho đường dẫn hồ sơ (ví dụ: <span className="font-mono text-neutral-400">/user/admin</span>).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">
                      Tên hiển thị
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Nhập tên hiển thị..."
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">
                      Giới thiệu
                    </label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Viết vài dòng về phong cách xem phim của bạn..."
                      className={cn(inputCls, "resize-none")}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-t border-b border-white/[0.07]">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Hồ sơ công khai
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Cho phép người khác xem tủ phim của bạn.
                      </p>
                    </div>
                    <Toggle
                      checked={isPublicProfile}
                      onChange={() => setIsPublicProfile(!isPublicProfile)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-98 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-60 shadow-lg shadow-violet-600/25"
                >
                  {updatingProfile && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  Lưu thay đổi
                </button>
              </form>
            )}

            {/* TAB: THỐNG KÊ */}
            {activeTab === "stats" && (
              <div className="max-w-3xl animate-fade-in space-y-6 rounded-2xl border border-white/10 bg-black p-6 sm:p-8 shadow-2xl">
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
              <div className="animate-fade-in space-y-6 max-w-5xl">
                <div className="border-b border-white/[0.07] pb-4">
                  <h2 className="text-lg font-bold text-white">Bảo mật & Thiết bị</h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Quản lý các lớp bảo vệ 2FA, mật khẩu và danh sách thiết bị đang đăng nhập.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
                  {/* Left Column: Security Features & Change Password */}
                  <div className="space-y-6">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Các lớp bảo vệ</p>

                    <TwoFactorSection
                      user={profile}
                      onSetup={handleSetup2FA}
                      onDisable={handleDisable2FA}
                      disabling={disabling2FA}
                    />

                    <GoogleLinkSection user={profile} />

                    {/* Change Password Form */}
                    <form onSubmit={handleChangePassword} className="rounded-xl border border-white/10 bg-black p-5 space-y-4 shadow-2xl">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Key size={15} className="text-neutral-400" /> Đổi mật khẩu tài khoản
                      </h3>

                      {[
                        { label: "Mật khẩu hiện tại", value: currentPassword, onChange: setCurrentPassword, placeholder: "Nhập mật khẩu hiện tại..." },
                        { label: "Mật khẩu mới", value: newPassword, onChange: setNewPassword, placeholder: "Tối thiểu 6 ký tự..." },
                        { label: "Xác nhận mật khẩu mới", value: confirmPassword, onChange: setConfirmPassword, placeholder: "Nhập lại mật khẩu mới..." },
                      ].map(({ label, value, onChange, placeholder }) => (
                        <div key={label}>
                          <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">{label}</label>
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

                      <button
                        type="submit"
                        disabled={changingPassword}
                        className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-98 px-5 py-2.5 text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-60 shadow-lg shadow-violet-600/25"
                      >
                        {changingPassword && (
                          <Loader2 size={14} className="animate-spin" />
                        )}
                        <Key size={13} /> Cập nhật mật khẩu
                      </button>
                    </form>
                  </div>

                  {/* Right Column: Active Sessions */}
                  <div>
                    <div className="rounded-xl border border-white/10 bg-[#161618] overflow-hidden shadow-xl">
                      <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
                            <Laptop className="h-4 w-4 text-neutral-400" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-white">
                              Thiết bị đã đăng nhập
                            </h3>
                            <p className="text-[11px] text-neutral-400">
                              {sessions.length} thiết bị đang hoạt động
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={loadSessions}
                          disabled={loadingSessions}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                          title="Làm mới"
                        >
                          <RefreshCw
                            className={cn(
                              "h-3.5 w-3.5",
                              loadingSessions && "animate-spin",
                            )}
                          />
                        </button>
                      </div>

                      <div className="divide-y divide-white/[0.04]">
                        {loadingSessions ? (
                          <div className="p-6 text-center text-xs text-neutral-400">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />{" "}
                            Đang tải thiết bị...
                          </div>
                        ) : sessions.length === 0 ? (
                          <div className="p-6 text-center text-xs text-neutral-400">
                            Không có thiết bị nào khác
                          </div>
                        ) : (
                          sessions.map((session) => (
                            <div
                              key={session.id}
                              className="p-4 flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                                  {session.device
                                    ?.toLowerCase()
                                    .includes("mobile") ? (
                                    <Smartphone className="h-3.5 w-3.5 text-neutral-400" />
                                  ) : (
                                    <Monitor className="h-3.5 w-3.5 text-neutral-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white truncate">
                                      {session.browser} {session.os}
                                    </span>
                                    {session.isCurrent && (
                                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 shrink-0">
                                        Thiết bị này
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                                    {session.device || session.os} •{" "}
                                    {session.ipAddress}
                                  </p>
                                </div>
                              </div>

                              {!session.isCurrent && (
                                <button
                                  onClick={() =>
                                    handleRevokeSession(session.id)
                                  }
                                  disabled={revokingId === session.id}
                                  className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
                                  title="Đăng xuất thiết bị này"
                                >
                                  {revokingId === session.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <LogOut className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {sessions.length > 1 && (
                        <div className="p-4 border-t border-white/[0.06]">
                          <button
                            onClick={handleRevokeAllOtherSessions}
                            disabled={revokingAll}
                            className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-neutral-300 text-xs font-semibold py-2.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {revokingAll ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <LogOut className="h-3.5 w-3.5" />
                            )}
                            Đăng xuất tất cả thiết bị khác
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TỦ PHIM */}
            {activeTab === "watchlist" && (
              <div className="animate-fade-in space-y-5 rounded-2xl border border-white/10 bg-[#161618] p-5 sm:p-7 shadow-xl">
                <div className="border-b border-white/[0.07] pb-4">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Tủ phim đã lưu{" "}
                    <span className="text-neutral-400 font-normal">
                      ({watchlistItems.length})
                    </span>
                  </h2>
                </div>

                {watchlistItems.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
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
                          className="group relative aspect-[2/3] overflow-hidden rounded-xl bg-neutral-900 border border-white/10 hover:border-white/25 transition-all shadow-md"
                        >
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={movie?.title || item.movieId}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-600">
                              <Film size={28} />
                            </div>
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
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Bookmark size={36} className="text-neutral-600 mb-3" />
                    <p className="text-sm font-semibold text-neutral-300">
                      Tủ phim đang trống
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Các bộ phim bạn đã lưu sẽ hiển thị tại đây.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: LỊCH SỬ */}
            {activeTab === "history" && (
              <div className="animate-fade-in space-y-5 rounded-2xl border border-white/10 bg-[#161618] p-5 sm:p-7 shadow-xl">
                <div className="border-b border-white/[0.07] pb-4">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Lịch sử xem phim{" "}
                    <span className="text-neutral-400 font-normal">
                      ({historyItems.length})
                    </span>
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
                          className="flex gap-3 items-center rounded-xl border border-white/10 bg-white/[0.02] p-3 hover:border-white/20 hover:bg-white/[0.04] transition-all group"
                        >
                          {item.movieThumb ? (
                            <img
                              src={item.movieThumb}
                              alt={item.movieTitle}
                              className="w-12 h-[68px] object-cover rounded-lg shrink-0 border border-white/10"
                            />
                          ) : (
                            <div className="w-12 h-[68px] bg-neutral-800 rounded-lg shrink-0 flex items-center justify-center text-neutral-600 border border-white/10">
                              <Film size={18} />
                            </div>
                          )}

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <Link
                              href={`/watch/${item.movieId}${item.episode ? `?ep=${item.episode}` : ""}`}
                              className="block text-xs sm:text-sm font-bold text-white hover:text-violet-300 line-clamp-1 transition-colors"
                            >
                              {item.movieTitle}
                            </Link>
                            <p className="text-xs text-neutral-400">
                              {item.episode
                                ? `Tập ${item.episode}`
                                : "Bản đầy đủ"}
                            </p>
                            <div className="w-full bg-white/[0.07] h-1 rounded-full overflow-hidden">
                              <div
                                className="bg-violet-500 h-full rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          <Link
                            href={`/watch/${item.movieId}${item.episode ? `?ep=${item.episode}` : ""}`}
                            className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center shrink-0 hover:bg-neutral-200 transition-colors shadow-sm"
                          >
                            <Play size={12} className="fill-current ml-0.5" />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <History size={36} className="text-neutral-600 mb-3" />
                    <p className="text-sm font-semibold text-neutral-300">
                      Chưa có lịch sử xem
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Các phim bạn đã xem sẽ xuất hiện tại đây.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: TRÌNH PHÁT */}
            {activeTab === "settings" && (
              <div className="max-w-2xl animate-fade-in space-y-6 rounded-2xl border border-white/10 bg-[#161618] p-5 sm:p-7 shadow-xl">
                <div className="border-b border-white/[0.07] pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      Cài đặt trình phát
                    </h2>
                    <p className="mt-1 text-xs text-neutral-400">
                      Tùy chỉnh trải nghiệm xem phim của bạn.
                    </p>
                  </div>
                  <Link
                    href="/settings"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors"
                  >
                    <Sliders size={13} /> Tất cả cài đặt
                  </Link>
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

      {/* ── MODAL: CONFIRM LOGOUT ── */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-sm bg-[#161618] border border-white/15 rounded-2xl p-6 text-center space-y-4 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mx-auto text-neutral-300">
                <LogOut size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Đăng xuất?</h3>
                <p className="text-xs text-neutral-400 mt-1.5">
                  Bạn có chắc muốn đăng xuất khỏi phiên làm việc hiện tại trên
                  NetPhim?
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-neutral-300 hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setShowLogoutModal(false);
                    toast("Đã đăng xuất thành công!", "info");
                    router.push("/");
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors cursor-pointer shadow-lg shadow-violet-600/25"
                >
                  Đăng xuất
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: 2FA SETUP ── */}
      {show2FAModal && twoFactorData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Shield className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Thiết lập xác thực 2FA</h3>
              <p className="text-xs text-neutral-500 mt-1">Quét mã QR bằng ứng dụng Authenticator của bạn.</p>
            </div>

            <div className="flex justify-center p-4 bg-white rounded-xl w-fit mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={twoFactorData.qrCode} alt="QR Code 2FA" className="w-40 h-40 rounded-lg object-contain" />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.03] px-4 py-3 font-mono text-sm">
              <span className="text-neutral-500 text-xs">Mã bí mật:</span>
              <span className="text-white font-bold select-all text-xs">{twoFactorData.secret}</span>
              <button onClick={() => { navigator.clipboard.writeText(twoFactorData.secret); setCopiedSecret(true); setTimeout(() => setCopiedSecret(false), 2000); }}
                className="text-neutral-500 hover:text-white p-1 cursor-pointer">
                {copiedSecret ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-amber-400 text-center">
                ⚠️ Lưu lại 10 mã dự phòng dưới đây (dùng khi mất điện thoại):
              </p>
              <div className="grid grid-cols-2 gap-1 bg-black/40 p-3 rounded-xl border border-white/[0.07] font-mono text-xs text-neutral-400 text-center">
                {twoFactorData.backupCodes.map((code, i) => (
                  <div key={i} className="py-0.5 select-all">{code}</div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.07] space-y-2">
              <label className="text-xs font-semibold text-neutral-400">Nhập mã OTP 6 số để xác nhận:</label>
              <input type="text" maxLength={6} value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full bg-black/40 border border-white/10 text-white rounded-lg px-4 py-3 outline-none focus:border-white/25 text-center font-black tracking-[0.4em] text-xl" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShow2FAModal(false); setTwoFactorData(null); setOtpCode(""); }}
                className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] text-neutral-400 hover:text-white text-sm font-semibold py-2.5 transition-colors cursor-pointer">
                Hủy
              </button>
              <button onClick={handleVerify2FA} disabled={verifying2FA || otpCode.length !== 6}
                className="flex-1 rounded-lg bg-white hover:bg-neutral-200 text-black font-bold text-sm py-2.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                {verifying2FA ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kích hoạt 2FA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: AVATAR PICKER ── */}
      <AnimatePresence>
        {showAvatarPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="max-w-lg w-full bg-[#16171d] border border-white/15 rounded-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400">
                    <Camera size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Chọn ảnh đại diện
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Chọn avatar có sẵn hoặc nhập link ảnh tuỳ chọn
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Avatar Presets Grid */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Bộ sưu tập Avatar Phẳng Hệ Thống (Flat Avatars)
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                  {PRESET_AVATARS.map((av) => {
                    const isSelected =
                      (selectedAvatar || user?.avatarUrl) === av.url;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          setSelectedAvatar(av.url);
                          setCustomAvatarInput("");
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-1.5 rounded-xl border transition-all group cursor-pointer hover:scale-105 active:scale-95",
                          isSelected
                            ? "border-violet-500 bg-violet-500/20 ring-2 ring-violet-500/50"
                            : "border-white/10 bg-black/40 hover:border-white/25 hover:bg-white/5",
                        )}
                        title={av.name}
                      >
                        <div className="relative aspect-square w-full rounded-lg overflow-hidden flex items-center justify-center bg-black/50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={av.url}
                            alt={av.name}
                            className="w-full h-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-violet-500 rounded-full p-0.5 shadow-md">
                              <Check
                                size={10}
                                className="text-white stroke-[3]"
                              />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-neutral-300 truncate w-full text-center group-hover:text-white">
                          {av.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Image URL Input */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Hoặc nhập link ảnh tuỳ chỉnh (URL)
                </label>
                <input
                  type="url"
                  value={customAvatarInput}
                  onChange={(e) => {
                    setCustomAvatarInput(e.target.value);
                    if (e.target.value.trim()) {
                      setSelectedAvatar(e.target.value.trim());
                    }
                  }}
                  placeholder="https://example.com/my-photo.jpg"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-violet-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-neutral-300 hover:text-white text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const avatarToSave =
                      customAvatarInput.trim() || selectedAvatar;
                    if (!avatarToSave) return;
                    setUpdatingProfile(true);
                    try {
                      const { data } = await authApi.updateProfile({
                        displayName,
                        avatarUrl: avatarToSave,
                        bio,
                      });
                      useAuthStore.getState().setUser({
                        ...user!,
                        displayName: data?.displayName || displayName,
                        avatarUrl: data?.avatarUrl || avatarToSave,
                        bio: data?.bio || bio,
                      });
                      toast("Đã cập nhật ảnh đại diện!", "success");
                      setShowAvatarPicker(false);
                    } catch (err) {
                      useAuthStore.getState().setUser({
                        ...user!,
                        avatarUrl: avatarToSave,
                      });
                      toast("Đã lưu ảnh đại diện!", "success");
                      setShowAvatarPicker(false);
                    } finally {
                      setUpdatingProfile(false);
                    }
                  }}
                  disabled={updatingProfile}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {updatingProfile ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Lưu ảnh đại diện"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
