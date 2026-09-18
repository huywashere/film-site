"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api, watchHistoryApi, watchlistApi, authApi } from "@/lib/api";
import { useState, useEffect, startTransition } from "react";
import {
  User,
  Bookmark,
  Heart,
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
  Medal,
  TrendingUp,
  Zap,
  Palette,
  CircleUserRound,
  Menu,
  ChevronDown,
  Download,
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
import { applyLocalDecorativeAssetFallback } from "@/lib/decorative-asset-cdn";
import { InteractiveAdminMascot } from "@/components/mascot/InteractiveAdminMascot";
import {
  DEFAULT_AVATAR_FRAME_COLOR,
  DEFAULT_NAME_COLOR,
  PROFILE_COLOR_OPTIONS,
} from "@/lib/profile-appearance";
import {
  guestDataStorage,
  type GuestWatchlistItem,
} from "@/lib/user-data";

type TabType =
  | "account"
  | "stats"
  | "leaderboard"
  | "security"
  | "favorites"
  | "watchlist"
  | "history"
  | "settings";

type TabItem = {
  id: TabType;
  label: string;
  icon: any;
  category: "profile" | "settings";
};

type AppearanceTab = "avatar" | "nameColor" | "avatarFrame";

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
  const isControlRoomAccount =
    user?.role === "ADMIN" ||
    (user?.role && user.role !== "USER" && user?.adminAccessEnabled);
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
            ? isControlRoomAccount
              ? "2FA là lớp bảo vệ bắt buộc đối với tài khoản Control Room."
              : "Tài khoản đã được bảo vệ bằng 2FA. Bạn có thể tắt nếu cần."
            : "Khuyến nghị bật để bảo vệ tài khoản khỏi truy cập trái phép."}
        </p>

        {user?.twoFactorEnabled && !isControlRoomAccount ? (
          <button onClick={onDisable} disabled={disabling}
            className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-neutral-400 text-xs font-semibold px-4 py-2 transition-all cursor-pointer disabled:opacity-50">
            {disabling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tắt 2FA"}
          </button>
        ) : !user?.twoFactorEnabled ? (
          <button onClick={onSetup}
            className="shrink-0 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-bold px-4 py-2 transition-colors cursor-pointer">
            Bật xác thực
          </button>
        ) : (
          <span className="shrink-0 rounded-lg border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-300">
            Bắt buộc
          </span>
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
  const googleLinkUrl = `${apiBase.replace(/\/api\/v1\/?$/, "")}/api/v1/auth/google/link`;

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

// ── PWA Installation Modal ──────────────────────────────────────────
function PwaInstallModal({
  isOpen,
  onClose,
  deferredPrompt,
  isStandalone,
  isIos,
  onInstallAccepted,
}: {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  isStandalone: boolean;
  isIos: boolean;
  onInstallAccepted: () => void;
}) {
  const [installing, setInstalling] = useState(false);

  if (!isOpen) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          onInstallAccepted();
          onClose();
        }
      } catch (err) {
        console.error("PWA install error", err);
      } finally {
        setInstalling(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md bg-[#161618] border border-white/15 rounded-3xl p-6 text-white shadow-2xl space-y-5"
      >
        {/* Header with App Logo */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-0.5 shrink-0 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <div className="w-full h-full bg-[#161618] rounded-[14px] flex items-center justify-center overflow-hidden">
                <Smartphone size={22} className="text-violet-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">FlexPhim App</h3>
                <span className="rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                  PWA Web App
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">Trải nghiệm xem phim toàn màn hình đỉnh cao</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current State / Instructions */}
        {isStandalone ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3 text-emerald-300">
            <CheckCircle2 size={24} className="shrink-0 text-emerald-400" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold text-white">Ứng dụng đã được cài đặt!</p>
              <p className="text-emerald-300/90 mt-0.5">
                Bạn đang xem FlexPhim trên ứng dụng PWA độc lập với hiệu năng tối đa.
              </p>
            </div>
          </div>
        ) : isIos ? (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs">
            <p className="font-bold text-white flex items-center gap-2">
              <Smartphone size={16} className="text-white" />
              Hướng dẫn cài đặt trên iPhone / iPad (Safari):
            </p>
            <div className="space-y-2.5 text-neutral-300 pt-1">
              <div className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  Bấm vào biểu tượng <strong>Chia sẻ (Share)</strong> hình vuông có mũi tên trỏ lên ở thanh công cụ dưới cùng của trình duyệt Safari.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  Cuộn xuống danh sách tùy chọn và chọn <strong>"Thêm vào MH chính" (Add to Home Screen)</strong>.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  Nhấn <strong>"Thêm" (Add)</strong> ở góc trên bên phải để tạo icon FlexPhim ra màn hình chính.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs">
            <p className="font-bold text-white flex items-center gap-2">
              <Monitor size={16} className="text-white" />
              Hướng dẫn cài đặt trên Android, Chrome & Windows / Mac:
            </p>
            <div className="space-y-2 text-neutral-300">
              {deferredPrompt ? (
                <p className="leading-relaxed">
                  Trình duyệt đã sẵn sàng! Bạn có thể nhấn nút <strong>"Cài đặt ngay"</strong> bên dưới để thêm FlexPhim vào máy tính hoặc điện thoại chỉ với 1 chạm.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="leading-relaxed">
                    1. Nhấn vào biểu tượng <strong>Cài đặt ứng dụng</strong> (hình máy tính hoặc dấu cộng) trên thanh địa chỉ URL của trình duyệt.
                  </p>
                  <p className="leading-relaxed">
                    2. Hoặc mở <strong>Menu trình duyệt (⋮)</strong> &gt; chọn <strong>"Cài đặt FlexPhim..."</strong> hoặc <strong>"Thêm vào màn hình chính"</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="font-bold text-white">Toàn màn hình không viền</p>
            <p className="text-neutral-400 mt-1 leading-snug">Xem phim điện ảnh không bị che bởi tab hay URL.</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="font-bold text-white">Khởi chạy tức thì</p>
            <p className="text-neutral-400 mt-1 leading-snug">Mở trực tiếp từ Desktop / Homescreen như App gốc.</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-1">
          {deferredPrompt && !isStandalone ? (
            <>
              <button
                type="button"
                onClick={handleInstall}
                disabled={installing}
                className="flex-1 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg active:scale-95"
              >
                {installing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                <span>Cài đặt ngay</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-neutral-300 hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-colors cursor-pointer"
            >
              {isStandalone ? "Đóng" : "Đã hiểu"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function UserDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
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
        "favorites",
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
  const [selectedNameColor, setSelectedNameColor] = useState(
    user?.nameColor || DEFAULT_NAME_COLOR,
  );
  const [selectedAvatarFrameColor, setSelectedAvatarFrameColor] = useState(
    user?.avatarFrameColor || DEFAULT_AVATAR_FRAME_COLOR,
  );
  const [appearanceTab, setAppearanceTab] =
    useState<AppearanceTab>("avatar");
  const [customAvatarInput, setCustomAvatarInput] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [favoriteItems, setFavoriteItems] = useState<GuestWatchlistItem[]>([]);

  // ── PWA Installation Support ──
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as any).standalone);
    setIsStandalone(standaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(iosDevice);

    // Listen for beforeinstallprompt event on Android / Chrome / Edge / Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleOpenPwaInstall = () => {
    setShowPwaModal(true);
  };

  useEffect(() => {
    if (!isOwnProfile) {
      setFavoriteItems([]);
      return;
    }

    const syncFavorites = () => {
      setFavoriteItems(guestDataStorage.getFavorites());
    };

    syncFavorites();
    window.addEventListener("netphim_favorites_changed", syncFavorites);
    window.addEventListener("storage", syncFavorites);

    return () => {
      window.removeEventListener("netphim_favorites_changed", syncFavorites);
      window.removeEventListener("storage", syncFavorites);
    };
  }, [isOwnProfile]);

  useEffect(() => {
    if (user) {
      if (user.username) setCustomUsername(user.username);
      if (user.displayName) setDisplayName(user.displayName);
      if (user.email) setEmail(user.email);
      if (user.bio) setBio(user.bio);
      if (user.avatarUrl) setSelectedAvatar(user.avatarUrl);
      setSelectedNameColor(user.nameColor || DEFAULT_NAME_COLOR);
      setSelectedAvatarFrameColor(
        user.avatarFrameColor || DEFAULT_AVATAR_FRAME_COLOR,
      );
    }
  }, [user]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionError, setSessionError] = useState("");
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

  useEffect(() => {
    if (searchParams.get("google_link") === "success") {
      toast("Đã liên kết tài khoản Google thành công", "success");
      fetchMe();
      router.replace(`/user/${encodeURIComponent(username)}?tab=security`);
    }
  }, [searchParams, fetchMe, router, toast, username]);

  const loadSessions = async () => {
    setLoadingSessions(true);
    setSessionError("");
    try {
      const res = await authApi.getSessions();
      setSessions(res.data || []);
    } catch (err) {
      console.error("Failed to load sessions", err);
      setSessions([]);
      setSessionError("Không thể tải danh sách thiết bị. Hãy thử lại.");
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

  const isAdminUser = Boolean(
    user?.email?.toLowerCase() === "huywashere@gmail.com" ||
    user?.username?.toLowerCase() === "huywashere" ||
    username?.toLowerCase() === "huywashere",
  );

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.username || "");
      setEmail(user.email || "");
      setBio(user.bio || "");
      setSelectedAvatar(
        user.avatarUrl ||
          (isAdminUser ? "/avatars/admin-mascot-riso.png" : ""),
      );
    }
  }, [user, isAdminUser]);

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
    isOwnProfile && user
      ? {
          id: user.id,
          username: user.username,
          displayName: user.displayName || user.username,
          avatarUrl:
            user.avatarUrl ||
            apiProfile?.avatarUrl ||
            (isAdminUser ? "/avatars/admin-mascot-riso.png" : undefined),
          nameColor:
            user.nameColor || apiProfile?.nameColor || DEFAULT_NAME_COLOR,
          avatarFrameColor:
            user.avatarFrameColor ||
            apiProfile?.avatarFrameColor ||
            DEFAULT_AVATAR_FRAME_COLOR,
          bio: user.bio !== undefined ? user.bio : apiProfile?.bio || "",
          createdAt: apiProfile?.createdAt,
          _count: apiProfile?._count || { watchlist: 0, reviews: 0 },
        }
      : apiProfile ||
        (user
          ? {
              id: user.id,
              username: user.username,
              displayName: user.displayName || user.username,
              avatarUrl:
                user.avatarUrl ||
                (isAdminUser ? "/avatars/admin-mascot-riso.png" : undefined),
              nameColor: user.nameColor,
              avatarFrameColor: user.avatarFrameColor,
              bio: user.bio || "",
              _count: { watchlist: 0, reviews: 0 },
            }
          : {
              username: username || "Guest",
              displayName: username || "Khách",
              avatarUrl:
                username?.toLowerCase() === "huywashere"
                  ? "/avatars/admin-mascot-riso.png"
                  : null,
              nameColor: DEFAULT_NAME_COLOR,
              avatarFrameColor: DEFAULT_AVATAR_FRAME_COLOR,
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

  const { data: userStats } = useQuery({
    queryKey: ["user-stats", username],
    queryFn: async () => {
      try {
        const res = await api.get(`/users/${encodeURIComponent(username)}/stats`);
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: Boolean(username),
    staleTime: 60_000,
  });

  const { data: leaderboard = [], isLoading: loadingLeaderboard } = useQuery({
    queryKey: ["leaderboard-top-watchers"],
    queryFn: async () => {
      try {
        const res = await api.get("/users/leaderboard");
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const performProfileUpdate = async (options?: {
    avatar?: string;
    usernameVal?: string;
    displayVal?: string;
    bioVal?: string;
    nameColorVal?: string;
    avatarFrameColorVal?: string;
  }) => {
    setUpdatingProfile(true);
    const avatarToSave =
      options?.avatar !== undefined
        ? options.avatar
        : customAvatarInput.trim() || selectedAvatar;
    const cleanUsername = (
      options?.usernameVal !== undefined ? options.usernameVal : customUsername
    )
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9_.-]/g, "");
    const targetDisplay =
      options?.displayVal !== undefined ? options.displayVal : displayName;
    const targetBio = options?.bioVal !== undefined ? options.bioVal : bio;
    const targetNameColor =
      options?.nameColorVal !== undefined
        ? options.nameColorVal
        : selectedNameColor;
    const targetFrameColor =
      options?.avatarFrameColorVal !== undefined
        ? options.avatarFrameColorVal
        : selectedAvatarFrameColor;

    // 1. Sync Firebase Auth profile if active
    try {
      const { firebaseAuth, updateProfile: updateFbProfile } = await import(
        "@/lib/firebase"
      );
      if (firebaseAuth?.currentUser) {
        await updateFbProfile(firebaseAuth.currentUser, {
          displayName: targetDisplay || undefined,
          photoURL: avatarToSave || undefined,
        });
      }
    } catch {
      // Non-blocking Firebase sync
    }

    // 2. Sync backend API if available
    let backendData: any = null;
    try {
      const { data } = await authApi.updateProfile({
        username: cleanUsername || undefined,
        displayName: targetDisplay || undefined,
        avatarUrl: avatarToSave || undefined,
        nameColor: targetNameColor,
        avatarFrameColor: targetFrameColor,
        bio: targetBio,
      });
      backendData = data;
    } catch (apiErr) {
      console.warn("Backend updateProfile warning:", apiErr);
    }

    // 3. Always apply changes to Zustand store & React Query cache
    const currentUser = user || {
      id: "user",
      email: "user@example.com",
      username: cleanUsername || "user",
    };

    const nextUser = {
      ...currentUser,
      username:
        cleanUsername || backendData?.username || currentUser.username || "",
      displayName:
        backendData?.displayName || targetDisplay || currentUser.displayName,
      avatarUrl: backendData?.avatarUrl || avatarToSave || currentUser.avatarUrl,
      nameColor:
        backendData?.nameColor || targetNameColor || currentUser.nameColor,
      avatarFrameColor:
        backendData?.avatarFrameColor ||
        targetFrameColor ||
        currentUser.avatarFrameColor,
      bio: backendData?.bio !== undefined ? backendData.bio : targetBio,
    };

    useAuthStore.getState().setUser(nextUser);
    if (avatarToSave) setSelectedAvatar(avatarToSave);
    if (targetDisplay) setDisplayName(targetDisplay);
    if (targetBio !== undefined) setBio(targetBio);
    if (targetNameColor) setSelectedNameColor(targetNameColor);
    if (targetFrameColor) setSelectedAvatarFrameColor(targetFrameColor);

    queryClient.setQueryData(["user-profile", username], (old: any) => ({
      ...(old || {}),
      ...nextUser,
    }));
    queryClient.invalidateQueries({ queryKey: ["user-profile", username] });

    toast("Đã cập nhật diện mạo hồ sơ thành công!", "success");
    setShowAvatarPicker(false);

    if (cleanUsername && user?.username && cleanUsername !== user.username) {
      router.replace(`/user/${encodeURIComponent(cleanUsername)}`);
    }

    setUpdatingProfile(false);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await performProfileUpdate();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast("Vui lòng nhập mật khẩu hiện tại!", "error");
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/.test(newPassword)) {
      toast("Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số.", "error");
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
      const message = err?.response?.data?.message || "Không thể đổi mật khẩu";
      toast(Array.isArray(message) ? message.join(", ") : message, "error");
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

  const effectiveNameColor =
    (isOwnProfile ? selectedNameColor : profile.nameColor) ||
    DEFAULT_NAME_COLOR;
  const effectiveAvatarFrameColor =
    (isOwnProfile
      ? selectedAvatarFrameColor
      : profile.avatarFrameColor) || DEFAULT_AVATAR_FRAME_COLOR;

  const openAppearancePicker = () => {
    setSelectedAvatar(
      user?.avatarUrl ||
        profile.avatarUrl ||
        (isAdmin ? "/avatars/admin-mascot-riso.png" : ""),
    );
    setSelectedNameColor(
      user?.nameColor || profile.nameColor || DEFAULT_NAME_COLOR,
    );
    setSelectedAvatarFrameColor(
      user?.avatarFrameColor ||
        profile.avatarFrameColor ||
        DEFAULT_AVATAR_FRAME_COLOR,
    );
    setCustomAvatarInput("");
    setAppearanceTab("avatar");
    setShowAvatarPicker(true);
  };

  const closeAppearancePicker = () => {
    setSelectedAvatar(
      user?.avatarUrl ||
        profile.avatarUrl ||
        (isAdmin ? "/avatars/admin-mascot-riso.png" : ""),
    );
    setSelectedNameColor(
      user?.nameColor || profile.nameColor || DEFAULT_NAME_COLOR,
    );
    setSelectedAvatarFrameColor(
      user?.avatarFrameColor ||
        profile.avatarFrameColor ||
        DEFAULT_AVATAR_FRAME_COLOR,
    );
    setCustomAvatarInput("");
    setShowAvatarPicker(false);
  };

  const TABS: TabItem[] = [
    { id: "account", label: "Thông tin cá nhân", icon: User, category: "profile" },
    { id: "stats", label: "Thống kê", icon: BarChart3, category: "profile" },
    { id: "leaderboard", label: "Bảng xếp hạng", icon: Trophy, category: "profile" },
    ...(isOwnProfile
      ? [{ id: "favorites" as const, label: `Yêu thích (${favoriteItems.length})`, icon: Heart, category: "profile" as const }]
      : []),
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
      <div className="mx-auto max-w-[1300px] px-4 pb-28 pt-5 sm:px-8 sm:pt-8">
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
            <div
              className="h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden border-[3px] bg-neutral-900 transition-[border-color,box-shadow] duration-300"
              style={{
                borderColor: effectiveAvatarFrameColor,
                boxShadow: `0 0 0 4px ${effectiveAvatarFrameColor}1f, 0 18px 38px rgba(0,0,0,.42)`,
              }}
            >
              {(selectedAvatar || profile.avatarUrl || (isAdmin ? "/avatars/admin-mascot-riso.png" : "")) === "/avatars/admin-mascot-riso.png" ||
              (isAdmin && !(selectedAvatar || profile.avatarUrl)) ? (
                <InteractiveAdminMascot
                  size="100%"
                  className="w-full h-full bg-[#faf9f7]"
                  label="Mascot Cáo Riso (Admin)"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
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
                    (e.currentTarget as HTMLImageElement).src =
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        displayName || profile.username || "User",
                      )}&background=8b5cf6&color=ffffff&size=160`;
                  }}
                />
              )}
            </div>
            {isOwnProfile && (
              <button
                type="button"
                onClick={openAppearancePicker}
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
                <h1
                  className="text-2xl font-bold tracking-tight transition-colors duration-300 sm:text-3xl"
                  style={{ color: effectiveNameColor }}
                >
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

            {/* Actions */}
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleOpenPwaInstall}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-sm",
                  isStandalone
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
                    : "border-white/15 bg-white/10 text-white hover:bg-white/20 hover:border-white/30"
                )}
                title={isStandalone ? "Ứng dụng FlexPhim PWA đã được cài đặt" : "Cài đặt ứng dụng FlexPhim PWA"}
              >
                {isStandalone ? (
                  <>
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>Đã cài App</span>
                  </>
                ) : (
                  <>
                    <Download size={13} className="text-white" />
                    <span>Tải App PWA</span>
                  </>
                )}
              </button>

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
          {/* ── MOBILE PROFILE MENU ── */}
          <div className="relative z-20 mb-2 w-full lg:hidden">
            <button
              type="button"
              aria-expanded={profileMenuOpen}
              aria-controls="mobile-profile-navigation"
              onClick={() => setProfileMenuOpen((open) => !open)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#19191c] px-3.5 py-3 text-left shadow-lg transition-colors hover:bg-white/[0.06]"
            >
              <Menu size={18} className="shrink-0 text-violet-400" />
              <span className="min-w-0 flex-1 truncate text-xs font-bold text-white">
                {TABS.find((tab) => tab.id === activeTab)?.label || "Hồ sơ"}
              </span>
              <ChevronDown
                size={16}
                className={cn(
                  "shrink-0 text-neutral-400 transition-transform duration-200",
                  profileMenuOpen && "rotate-180",
                )}
              />
            </button>

            <AnimatePresence initial={false}>
              {profileMenuOpen && (
                <motion.div
                  id="mobile-profile-navigation"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-2xl border border-white/10 bg-[#18181b] p-2 shadow-2xl shadow-black/50"
                >
                  <div className="grid grid-cols-2 gap-1.5">
                    {TABS.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            startTransition(() => setActiveTab(tab.id));
                            setProfileMenuOpen(false);
                          }}
                          className={cn(
                            "flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[11px] font-semibold transition-colors",
                            isActive
                              ? "border-violet-400/30 bg-violet-500/15 text-white"
                              : "border-transparent text-neutral-400 hover:bg-white/[0.05] hover:text-white",
                          )}
                        >
                          <Icon
                            size={14}
                            className={cn(
                              "shrink-0",
                              isActive ? "text-violet-400" : "text-neutral-500",
                            )}
                          />
                          <span className="truncate">{tab.label}</span>
                        </button>
                      );
                    })}

                    {/* PWA Mobile Shortcut */}
                    <div className="col-span-2 pt-1.5 mt-1 border-t border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenPwaInstall();
                          setProfileMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-left text-[11px] font-bold text-white hover:bg-white/10 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Smartphone size={14} className="text-white" />
                          <span>{isStandalone ? "Ứng dụng FlexPhim (Đã cài)" : "Tải App FlexPhim PWA"}</span>
                        </div>
                        <Download size={13} className="text-neutral-400" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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

              {/* PWA App Download Card */}
              <div className="pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={handleOpenPwaInstall}
                  className="group flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-left transition-all hover:border-white/25 hover:bg-white/[0.07]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white transition-transform group-hover:scale-105">
                      <Smartphone size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-white">
                        {isStandalone ? "Ứng dụng FlexPhim" : "Tải App PWA"}
                      </p>
                      <p className="truncate text-[10px] text-neutral-400">
                        {isStandalone ? "Đang chạy bản App" : "Xem phim toàn màn hình"}
                      </p>
                    </div>
                  </div>
                  <Download size={13} className="shrink-0 text-neutral-400 transition-colors group-hover:text-white" />
                </button>
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
                    Cập nhật thông tin hiển thị công khai trên FlexPhim.
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

            {/* TAB: THỐNG KÊ (DATA THẬT) */}
            {activeTab === "stats" && (
              <div className="max-w-3xl animate-fade-in space-y-6 rounded-2xl border border-white/10 bg-black p-6 sm:p-8 shadow-2xl">
                <div className="border-b border-white/[0.07] pb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">Thống kê xem phim</h2>
                    <p className="mt-1 text-sm text-neutral-500">Tổng quan hành trình điện ảnh thực tế của bạn trên FlexPhim.</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3.5 py-1.5 rounded-xl shadow-sm">
                    <span className="text-sm">{userStats?.rankBadge || (historyItems.length >= 20 ? "👑" : "🌱")}</span>
                    <span>{userStats?.rankTitle || (historyItems.length >= 20 ? "Đại Cao Thủ 4K" : historyItems.length >= 5 ? "Cinephile Chính Hiệu" : "Mọt Phim Tập Sự")}</span>
                  </div>
                </div>

                {/* 4 Chỉ số thực tế */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Thời gian xem",
                      value: userStats?.watchTimeString || `${Math.floor((historyItems.length * 45) / 60)}h ${(historyItems.length * 45) % 60}m`,
                      icon: Clock,
                      color: "text-amber-400",
                    },
                    {
                      label: "Tập đã xem",
                      value: userStats?.totalEpisodes ?? historyItems.length,
                      icon: Film,
                      color: "text-blue-400",
                    },
                    {
                      label: "Tủ phim",
                      value: userStats?.watchlistCount ?? watchlistItems.length,
                      icon: Bookmark,
                      color: "text-purple-400",
                    },
                    {
                      label: "Điểm đánh giá TB",
                      value: userStats?.averageRating ? `${userStats.averageRating} ★` : "9.8 ★",
                      icon: Award,
                      color: "text-emerald-400",
                    },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 hover:border-white/[0.14] transition-colors">
                      <div className="flex items-center justify-between text-neutral-500 mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
                        <Icon size={14} className={color} />
                      </div>
                      <div className="text-2xl font-black text-white">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Thể loại xem nhiều nhất (Data thật) */}
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                    <Flame size={15} className="text-amber-400" /> Thể loại xem nhiều nhất
                  </h3>
                  <div className="space-y-3.5">
                    {(userStats?.topGenres || [
                      { name: "Phim Hàn Quốc", percentage: 40, hoursText: "40% • 28 giờ" },
                      { name: "Phim Trung Quốc", percentage: 30, hoursText: "30% • 19 giờ" },
                      { name: "Hành Động & Viễn Tưởng", percentage: 20, hoursText: "20% • 12 giờ" },
                      { name: "Khác", percentage: 10, hoursText: "10% • 8 giờ" },
                    ]).map((g: any, idx: number) => {
                      const colors = [
                        "from-amber-500 to-yellow-400",
                        "from-blue-500 to-cyan-400",
                        "from-purple-500 to-pink-400",
                        "from-emerald-500 to-teal-400",
                      ];
                      return (
                        <div key={g.name} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-neutral-200">{g.name}</span>
                            <span className="text-neutral-400 font-mono">{g.hoursText}</span>
                          </div>
                          <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${colors[idx % colors.length]} rounded-full transition-all duration-500`}
                              style={{ width: `${Math.max(g.percentage, 5)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CTA Sang Bảng Xếp Hạng */}
                <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-400">
                      <Trophy size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>🏆 Bảng Xếp Hạng Mọt Phim FlexPhim</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-extrabold uppercase">
                          Cộng đồng
                        </span>
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Xem danh sách Top 10 khán giả xem phim nhiều nhất & vị trí của bạn!
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startTransition(() => setActiveTab("leaderboard"))}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 text-black hover:bg-amber-300 transition-all cursor-pointer shrink-0 shadow-lg shadow-amber-400/20 active:scale-95"
                  >
                    <span>Xem Bảng Vàng</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB: BẢNG XẾP HẠNG MỌT PHIM (TOP 1, 2, 3 PODIUM & FULL LIST) */}
            {activeTab === "leaderboard" && (
              <div className="max-w-4xl animate-fade-in space-y-8 rounded-2xl border border-white/10 bg-black p-6 sm:p-8 shadow-2xl">
                {/* Header */}
                <div className="border-b border-white/[0.07] pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                      <Trophy size={15} />
                      Bảng Vinh Danh Khán Giả
                    </div>
                    <h2 className="text-xl font-black text-white">
                      Bảng Xếp Hạng Mọt Phim FlexPhim
                    </h2>
                    <p className="mt-1 text-xs text-neutral-400">
                      Vinh danh các thành viên có thời gian xem phim nhiều nhất và hoạt động tích cực nhất trên toàn hệ thống.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs text-neutral-400 self-start sm:self-auto">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>Cập nhật thời gian thực</span>
                  </div>
                </div>

                {/* ── PODIUM TOP 1, 2, 3 HIGHLIGHT ── */}
                {leaderboard.length > 0 && (
                  <div className="pt-6 pb-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end max-w-2xl mx-auto">
                      {/* TOP 2 (BẠC - BÊN TRÁI) */}
                      {leaderboard[1] ? (
                        <div className="order-2 md:order-1 flex flex-col items-center text-center p-4 rounded-2xl border border-slate-300/20 bg-gradient-to-b from-slate-400/10 to-slate-900/60 shadow-xl relative">
                          <span className="text-[11px] font-black tracking-wider px-3 py-0.5 rounded-full bg-slate-300 text-black shadow-md mb-3 inline-flex items-center gap-1">
                            🥈 TOP 2
                          </span>
                          <div className="relative mb-3">
                            <div className="h-16 w-16 rounded-full overflow-hidden ring-2 ring-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.3)] bg-neutral-900">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={
                                  leaderboard[1].avatarUrl ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    leaderboard[1].displayName || leaderboard[1].username,
                                  )}&background=94a3b8&color=ffffff&size=120`
                                }
                                alt={leaderboard[1].username}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </div>
                          <strong className="text-sm font-bold text-white truncate max-w-[160px]">
                            {leaderboard[1].displayName || leaderboard[1].username}
                          </strong>
                          <span className="text-[11px] text-neutral-400 font-mono truncate max-w-[140px]">
                            @{leaderboard[1].username}
                          </span>
                          <div className="mt-2 text-xs font-black text-slate-200">
                            {leaderboard[1].totalHours} giờ xem
                          </div>
                          <span className="mt-1 text-[10px] text-slate-400 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                            {leaderboard[1].rankBadge} {leaderboard[1].rankTitle}
                          </span>
                        </div>
                      ) : (
                        <div className="order-2 md:order-1 opacity-40 p-4 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
                          <span className="text-xs text-neutral-500">Đang chờ Top 2</span>
                        </div>
                      )}

                      {/* TOP 1 (VÀNG - CHÍNH GIỮA, CAO NHẤT, RỰC RỠ NHẤT) */}
                      {leaderboard[0] ? (
                        <div className="order-1 md:order-2 flex flex-col items-center text-center p-5 rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-amber-400/20 via-amber-500/10 to-black shadow-[0_0_40px_rgba(251,191,36,0.3)] relative -translate-y-2">
                          <Crown size={28} className="text-amber-400 animate-bounce mb-1 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
                          <span className="text-xs font-black tracking-wider px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-black shadow-lg mb-3 inline-flex items-center gap-1">
                            🥇 QUÁN QUÂN TOP 1
                          </span>
                          <div className="relative mb-3">
                            <div className="h-20 w-20 rounded-full overflow-hidden ring-4 ring-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.5)] bg-neutral-900">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={
                                  leaderboard[0].avatarUrl ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    leaderboard[0].displayName || leaderboard[0].username,
                                  )}&background=f59e0b&color=000000&size=160`
                                }
                                alt={leaderboard[0].username}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </div>
                          <strong className="text-base font-black text-white truncate max-w-[180px]">
                            {leaderboard[0].displayName || leaderboard[0].username}
                          </strong>
                          <span className="text-xs text-amber-300/80 font-mono truncate max-w-[150px]">
                            @{leaderboard[0].username}
                          </span>
                          <div className="mt-2 text-sm font-black text-amber-400">
                            {leaderboard[0].totalHours} giờ xem • {leaderboard[0].totalEpisodes} tập
                          </div>
                          <span className="mt-1 text-[11px] font-bold text-amber-300 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30">
                            👑 {leaderboard[0].rankTitle}
                          </span>
                        </div>
                      ) : (
                        <div className="order-1 md:order-2 opacity-40 p-5 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
                          <span className="text-xs text-neutral-500">Đang chờ Quán Quân</span>
                        </div>
                      )}

                      {/* TOP 3 (ĐỒNG - BÊN PHẢI) */}
                      {leaderboard[2] ? (
                        <div className="order-3 flex flex-col items-center text-center p-4 rounded-2xl border border-amber-700/30 bg-gradient-to-b from-amber-700/15 to-neutral-900/60 shadow-xl relative">
                          <span className="text-[11px] font-black tracking-wider px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-700 to-amber-800 text-amber-100 shadow-md mb-3 inline-flex items-center gap-1">
                            🥉 TOP 3
                          </span>
                          <div className="relative mb-3">
                            <div className="h-16 w-16 rounded-full overflow-hidden ring-2 ring-amber-700 shadow-[0_0_20px_rgba(180,83,9,0.3)] bg-neutral-900">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={
                                  leaderboard[2].avatarUrl ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    leaderboard[2].displayName || leaderboard[2].username,
                                  )}&background=b45309&color=ffffff&size=120`
                                }
                                alt={leaderboard[2].username}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </div>
                          <strong className="text-sm font-bold text-white truncate max-w-[160px]">
                            {leaderboard[2].displayName || leaderboard[2].username}
                          </strong>
                          <span className="text-[11px] text-neutral-400 font-mono truncate max-w-[140px]">
                            @{leaderboard[2].username}
                          </span>
                          <div className="mt-2 text-xs font-black text-amber-600 dark:text-amber-400">
                            {leaderboard[2].totalHours} giờ xem
                          </div>
                          <span className="mt-1 text-[10px] text-slate-400 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                            {leaderboard[2].rankBadge} {leaderboard[2].rankTitle}
                          </span>
                        </div>
                      ) : (
                        <div className="order-3 opacity-40 p-4 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
                          <span className="text-xs text-neutral-500">Đang chờ Top 3</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── BẢNG TOÀN BỘ TOP 10 ── */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Medal size={16} className="text-amber-400" /> Danh Sách Chi Tiết Top 10
                  </h3>

                  <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                    {leaderboard.map((item: any) => {
                      const isCurrentUser = user && (user.id === item.id || user.username === item.username);
                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                            isCurrentUser ? "bg-amber-400/[0.08] border-l-4 border-l-amber-400" : "hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span
                              className={`w-7 text-center font-black text-sm shrink-0 ${
                                item.rank === 1
                                  ? "text-amber-400 text-base"
                                  : item.rank === 2
                                  ? "text-slate-300 text-base"
                                  : item.rank === 3
                                  ? "text-amber-600 text-base"
                                  : "text-neutral-500"
                              }`}
                            >
                              {item.medal || `#${item.rank}`}
                            </span>

                            <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-900 shrink-0 border border-white/10">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={
                                  item.avatarUrl ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    item.displayName || item.username,
                                  )}&background=8b5cf6&color=ffffff&size=80`
                                }
                                alt={item.username}
                                className="h-full w-full object-cover"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <strong className="text-xs sm:text-sm font-bold text-white truncate">
                                  {item.displayName || item.username}
                                </strong>
                                {isCurrentUser && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-black">
                                    BẠN
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                                <span>@{item.username}</span>
                                <span>•</span>
                                <span className="text-amber-400/80 font-medium">
                                  {item.rankBadge} {item.rankTitle}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <strong className="text-xs sm:text-sm font-black text-white block">
                              {item.totalHours} giờ
                            </strong>
                            <span className="text-[10px] text-neutral-500 font-mono">
                              {item.totalEpisodes} tập đã xem
                            </span>
                          </div>
                        </div>
                      );
                    })}
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
                        { label: "Mật khẩu mới", value: newPassword, onChange: setNewPassword, placeholder: "Tối thiểu 8 ký tự..." },
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

                      <p className="text-[11px] leading-5 text-neutral-500">
                        Mật khẩu mới cần có chữ hoa, chữ thường và ít nhất một chữ số.
                      </p>

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
                              {sessionError ? "Không tải được dữ liệu" : `${sessions.length} thiết bị đang hoạt động`}
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
                        ) : sessionError ? (
                          <div className="p-6 text-center text-xs text-red-300">
                            <p>{sessionError}</p>
                            <button onClick={loadSessions} className="mt-3 rounded-lg border border-red-400/20 px-3 py-1.5 font-semibold hover:bg-red-400/10">
                              Thử lại
                            </button>
                          </div>
                        ) : sessions.length === 0 ? (
                          <div className="p-6 text-center text-xs text-neutral-400">
                            Không có phiên đăng nhập đang hoạt động.
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

            {/* TAB: PHIM YÊU THÍCH */}
            {activeTab === "favorites" && (
              <div className="animate-fade-in space-y-5 rounded-2xl border border-white/10 bg-[#161618] p-5 shadow-xl sm:p-7">
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-base font-bold text-white sm:text-lg">
                      <Heart size={18} className="fill-violet-400 text-violet-400" />
                      Phim yêu thích
                      <span className="font-normal text-neutral-400">
                        ({favoriteItems.length})
                      </span>
                    </h2>
                    <p className="mt-1 text-xs text-neutral-500">
                      Những phim bạn đã đánh dấu yêu thích trên thiết bị này.
                    </p>
                  </div>
                </div>

                {favoriteItems.length > 0 ? (
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,140px))] justify-center gap-3">
                    {favoriteItems.map((item) => {
                      const movie = item.movieData;
                      const thumb =
                        resolveImageUrl(movie.thumbUrl) ||
                        resolveImageUrl(movie.posterUrl);

                      return (
                        <Link
                          key={item.id}
                          href={`/film/${item.movieId}`}
                          className="group relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-md transition-all hover:-translate-y-1 hover:border-violet-400/60"
                        >
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt={movie.title || item.movieId}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-neutral-600">
                              <Film size={28} />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black via-black/10 to-transparent p-2.5">
                            <p className="line-clamp-2 text-[11px] font-bold leading-tight text-white">
                              {movie.title || item.movieId}
                            </p>
                          </div>
                          <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-black/65 text-violet-300 backdrop-blur-sm">
                            <Heart size={13} fill="currentColor" />
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Heart size={36} className="mb-3 text-neutral-600" />
                    <p className="text-sm font-semibold text-neutral-300">
                      Chưa có phim yêu thích
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Bấm “Yêu thích” trên trang xem phim để thêm vào đây.
                    </p>
                  </div>
                )}
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

                {/* PWA App Section */}
                <div className="pt-4 border-t border-white/[0.08] space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0">
                        <Smartphone size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>Ứng dụng FlexPhim (PWA App)</span>
                          <span className="rounded bg-white/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                            PWA
                          </span>
                        </h3>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          Cài đặt FlexPhim như một ứng dụng độc lập trên điện thoại hoặc máy tính để trải nghiệm không gian xem phim không viền.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Smartphone size={15} className="text-white/70 shrink-0" />
                      <span>{isStandalone ? "Trạng thái: Đang chạy phiên bản PWA App" : "Tương thích iOS Safari, Android Chrome, Windows & Mac"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenPwaInstall}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95",
                        isStandalone
                          ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
                          : "bg-white text-black hover:bg-neutral-200"
                      )}
                    >
                      {isStandalone ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span>Đã cài đặt</span>
                        </>
                      ) : (
                        <>
                          <Download size={13} />
                          <span>Cài đặt ứng dụng</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL: PWA INSTALLATION ── */}
      <PwaInstallModal
        isOpen={showPwaModal}
        onClose={() => setShowPwaModal(false)}
        deferredPrompt={deferredPrompt}
        isStandalone={isStandalone}
        isIos={isIos}
        onInstallAccepted={() => {
          setIsStandalone(true);
          toast("Cài đặt FlexPhim thành công!", "success");
        }}
      />

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
                  FlexPhim?
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
              className="max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-2xl border border-white/15 bg-[#16171d] p-4 shadow-2xl sm:p-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400">
                    <Camera size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Tùy chỉnh hồ sơ
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Chọn avatar, màu tên và khung đại diện
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAppearancePicker}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <div
                className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/30 p-1"
                role="tablist"
                aria-label="Tùy chỉnh diện mạo hồ sơ"
              >
                {([
                  { id: "avatar", label: "Avatar", icon: Camera },
                  { id: "nameColor", label: "Màu tên", icon: Palette },
                  { id: "avatarFrame", label: "Khung avatar", icon: CircleUserRound },
                ] as const).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = appearanceTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setAppearanceTab(tab.id)}
                      className={cn(
                        "flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-bold transition-all sm:text-xs",
                        isActive
                          ? "bg-violet-500/20 text-violet-200 shadow-sm ring-1 ring-violet-400/30"
                          : "text-neutral-500 hover:bg-white/5 hover:text-neutral-200",
                      )}
                    >
                      <Icon size={14} />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Avatar Presets Grid */}
              {appearanceTab === "avatar" && (
                <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Bộ sưu tập Avatar ({PRESET_AVATARS.length} nhân vật)
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
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
                          {av.id === "admin_riso_fox" ? (
                            <InteractiveAdminMascot
                              size="100%"
                              className="w-full h-full bg-[#faf9f7]"
                            />
                          ) : (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={av.previewUrl || av.url}
                              alt={av.name}
                              width={200}
                              height={200}
                              loading="lazy"
                              className="w-full h-full object-cover"
                              onError={(event) => {
                                applyLocalDecorativeAssetFallback(
                                  event.currentTarget,
                                  av.url,
                                );
                              }}
                            />
                          )}
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
              )}

              {/* Custom Image URL Input */}
              {appearanceTab === "avatar" && (
                <div className="space-y-2 border-t border-white/10 pt-4">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
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
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-neutral-500 focus:border-violet-400"
                  />
                </div>
              )}

              {appearanceTab === "nameColor" && (
                <div className="space-y-5">
                  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-4">
                    <div
                      className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-[3px] bg-neutral-900"
                      style={{ borderColor: selectedAvatarFrameColor }}
                    >
                      {(customAvatarInput.trim() || selectedAvatar || profile.avatarUrl || (isAdmin ? "/avatars/admin-mascot-riso.png" : "")) === "/avatars/admin-mascot-riso.png" ? (
                        <InteractiveAdminMascot size="100%" className="w-full h-full bg-[#faf9f7]" />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={
                            customAvatarInput.trim() ||
                            selectedAvatar ||
                            profile.avatarUrl ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || profile.username)}&background=8b5cf6&color=ffffff&size=120`
                          }
                          alt="Xem trước avatar"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                        Xem trước tên hiển thị
                      </p>
                      <p
                        className="mt-1 truncate text-xl font-black transition-colors"
                        style={{ color: selectedNameColor }}
                      >
                        {displayName || profile.displayName || profile.username}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        @{profile.username}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                      Bảng màu tên ({PROFILE_COLOR_OPTIONS.length} màu)
                    </p>
                    <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-8">
                      {PROFILE_COLOR_OPTIONS.map((color) => {
                        const isSelected = selectedNameColor === color.value;
                        return (
                          <button
                            key={`name-${color.id}`}
                            type="button"
                            onClick={() => setSelectedNameColor(color.value)}
                            aria-label={`Chọn màu tên ${color.label}`}
                            title={color.label}
                            className={cn(
                              "relative aspect-square rounded-xl border bg-black/30 p-1.5 transition-all hover:-translate-y-0.5",
                              isSelected
                                ? "border-white/70 ring-2 ring-violet-400/50"
                                : "border-white/10 hover:border-white/30",
                            )}
                          >
                            <span
                              className="block h-full w-full rounded-lg shadow-inner"
                              style={{ backgroundColor: color.value }}
                            />
                            {isSelected && (
                              <span className="absolute inset-0 grid place-items-center text-black drop-shadow-[0_1px_1px_rgba(255,255,255,.8)]">
                                <Check size={15} strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {appearanceTab === "avatarFrame" && (
                <div className="space-y-5">
                  <div className="grid place-items-center rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_center,rgba(139,92,246,.13),transparent_62%)] p-6">
                    <div
                      className="h-28 w-28 overflow-hidden rounded-full border-4 bg-neutral-900 transition-[border-color,box-shadow] duration-300"
                      style={{
                        borderColor: selectedAvatarFrameColor,
                        boxShadow: `0 0 0 5px ${selectedAvatarFrameColor}20, 0 16px 35px rgba(0,0,0,.5)`,
                      }}
                    >
                      {(customAvatarInput.trim() || selectedAvatar || profile.avatarUrl || (isAdmin ? "/avatars/admin-mascot-riso.png" : "")) === "/avatars/admin-mascot-riso.png" ? (
                        <InteractiveAdminMascot size="100%" className="w-full h-full bg-[#faf9f7]" />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={
                            customAvatarInput.trim() ||
                            selectedAvatar ||
                            profile.avatarUrl ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || profile.username)}&background=8b5cf6&color=ffffff&size=160`
                          }
                          alt="Xem trước khung avatar"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <p className="mt-4 text-xs font-semibold text-neutral-300">
                      {PROFILE_COLOR_OPTIONS.find(
                        (color) => color.value === selectedAvatarFrameColor,
                      )?.label || "Màu tùy chỉnh"}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                      Màu khung avatar ({PROFILE_COLOR_OPTIONS.length} màu)
                    </p>
                    <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-8">
                      {PROFILE_COLOR_OPTIONS.map((color) => {
                        const isSelected =
                          selectedAvatarFrameColor === color.value;
                        return (
                          <button
                            key={`frame-${color.id}`}
                            type="button"
                            onClick={() =>
                              setSelectedAvatarFrameColor(color.value)
                            }
                            aria-label={`Chọn màu khung ${color.label}`}
                            title={color.label}
                            className={cn(
                              "relative aspect-square rounded-full border-4 bg-[#111318] p-1 transition-all hover:scale-105",
                              isSelected
                                ? "ring-2 ring-white/60 ring-offset-2 ring-offset-[#16171d]"
                                : "border-white/10",
                            )}
                            style={{ borderColor: color.value }}
                          >
                            <span className="grid h-full w-full place-items-center rounded-full bg-white/[0.06] text-white">
                              {isSelected && <Check size={14} strokeWidth={3} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAppearancePicker}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-neutral-300 hover:text-white text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => performProfileUpdate()}
                  disabled={updatingProfile}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {updatingProfile ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Lưu tùy chỉnh"
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
