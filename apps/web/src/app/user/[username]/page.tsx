"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { api, watchHistoryApi, watchlistApi, authApi } from "@/lib/api";
import { useState, useEffect, useMemo, startTransition } from "react";
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
  Calendar,
  Star,
  Moon,
  MessageSquare,
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
import { useReliableNavigation } from "@/hooks/useReliableNavigation";
import {
  DEFAULT_AVATAR_FRAME_COLOR,
  DEFAULT_NAME_COLOR,
  PROFILE_COLOR_OPTIONS,
  NAME_EFFECT_OPTIONS,
  NAME_SOLID_OPTIONS,
  ALL_NAME_COLOR_OPTIONS,
  AVATAR_FRAME_ANIMATED_OPTIONS,
  AVATAR_FRAME_SOLID_OPTIONS,
  ALL_AVATAR_FRAME_OPTIONS,
  getNameColorProps,
  getAvatarFrameConfig,
} from "@/lib/profile-appearance";
import {
  guestDataStorage,
  getAllGuestWatchHistoryEntries,
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

function renderRankIcon(iconType?: string, className?: string) {
  const iconClass = className || "h-4 w-4";
  switch (iconType) {
    case "crown":
      return <Crown className={iconClass} />;
    case "trophy":
      return <Trophy className={iconClass} />;
    case "star":
      return <Star className={iconClass} />;
    case "film":
      return <Film className={iconClass} />;
    case "sparkles":
    case "sprout":
    default:
      return <Sparkles className={iconClass} />;
  }
}

function renderBadgeIcon(iconType?: string, className?: string) {
  const iconClass = className || "h-4 w-4";
  switch (iconType) {
    case "film":
      return <Film className={iconClass} />;
    case "zap":
      return <Zap className={iconClass} />;
    case "moon":
      return <Moon className={iconClass} />;
    case "clock":
      return <Clock className={iconClass} />;
    case "message":
      return <MessageSquare className={iconClass} />;
    case "star":
      return <Star className={iconClass} />;
    case "bookmark":
      return <Bookmark className={iconClass} />;
    case "flame":
      return <Flame className={iconClass} />;
    default:
      return <Award className={iconClass} />;
  }
}

function ProfileAvatarRender({
  avatarSrc,
  username,
  displayName,
  frameValue,
  sizeClass = "h-24 w-24 sm:h-28 sm:w-28",
  isAdmin = false,
}: {
  avatarSrc?: string | null;
  username?: string;
  displayName?: string;
  frameValue?: string | null;
  sizeClass?: string;
  isAdmin?: boolean;
}) {
  const frameConfig = getAvatarFrameConfig(frameValue);
  const isRiso =
    avatarSrc === "/avatars/admin-mascot-riso.png" ||
    (isAdmin && !avatarSrc);

  const innerAvatar = isRiso ? (
    <InteractiveAdminMascot
      size="100%"
      className="w-full h-full bg-[#faf9f7]"
      label="Mascot Cáo Riso (Admin)"
    />
  ) : (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={
        avatarSrc ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          displayName || username || "User",
        )}&background=8b5cf6&color=ffffff&size=160`
      }
      alt={username || "User"}
      referrerPolicy="no-referrer"
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src =
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            displayName || username || "User",
          )}&background=8b5cf6&color=ffffff&size=160`;
      }}
    />
  );

  if (frameConfig.isRainbowWrap) {
    return (
      <div className={cn("relative shrink-0 anim-frame-rainbow-wrap", sizeClass)}>
        <div className="w-full h-full rounded-full overflow-hidden bg-neutral-900">
          {innerAvatar}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden bg-neutral-900 transition-all duration-300 relative shrink-0",
        sizeClass,
        frameConfig.className,
      )}
      style={frameConfig.style}
    >
      {innerAvatar}
    </div>
  );
}

export default function UserDashboardPage() {
  const params = useParams();
  const router = useReliableNavigation();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, logout, fetchMe } = useAuthStore();

  const rawUsername = (params?.username as string) || "";
  const decodedUsername = rawUsername ? decodeURIComponent(rawUsername) : "";
  const isMeRoute = decodedUsername === "me" || !decodedUsername;
  const username =
    (isMeRoute ? user?.username || user?.id : decodedUsername) ||
    user?.username ||
    user?.id ||
    "";

  const tabParam = searchParams.get("tab") as TabType;
  const [activeTab, setActiveTab] = useState<TabType>("account");

  useEffect(() => {
    if (isMeRoute && !user) {
      const hasSession =
        typeof document !== "undefined" &&
        document.cookie
          .split(";")
          .some((c) => c.trim().startsWith("netphim-auth=true"));
      if (!hasSession) {
        router.replace("/login");
      }
    }
  }, [isMeRoute, user, router]);

  useEffect(() => {
    if (
      tabParam &&
      [
        "account",
        "stats",
        "leaderboard",
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

  const [leaderboardRange, setLeaderboardRange] = useState<"day" | "week" | "month" | "all">("all");

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
    (isMeRoute ||
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
    enabled: Boolean(username) && username !== "me",
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

  const { data: leaderboardData, isLoading: loadingLeaderboard } = useQuery({
    queryKey: ["leaderboard-top-watchers", leaderboardRange, user?.username],
    queryFn: async () => {
      try {
        const queryParams = new URLSearchParams({ range: leaderboardRange });
        if (user?.username) {
          queryParams.set("user", user.username);
        }
        const res = await api.get(`/users/leaderboard?${queryParams.toString()}`);
        return res.data;
      } catch {
        return { items: [], range: leaderboardRange };
      }
    },
    staleTime: 60_000,
  });

  const rawLeaderboard: any[] = Array.isArray(leaderboardData)
    ? leaderboardData
    : Array.isArray(leaderboardData?.items)
    ? leaderboardData.items
    : [];

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

    // 4. Instantly sync comments in localStorage for real-time consistency outside
    if (typeof window !== "undefined") {
      try {
        const prevUsername = user?.username?.toLowerCase() || "";
        const prevDisplay = user?.displayName?.toLowerCase() || "";
        const currentUserId = nextUser.id;
        const currentUserEmail = nextUser.email?.toLowerCase() || "";
        const nextName = nextUser.displayName || nextUser.username || "Thành viên";
        const nextAvatar = nextUser.avatarUrl || "";

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("netphim_comments_tree_")) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                let modified = false;
                const updateTree = (list: any[]): any[] => {
                  return list.map((item: any) => {
                    const itemUser = item.user || {};
                    const itemId = itemUser.id;
                    const itemEmail = (itemUser.email || "").toLowerCase();
                    const itemName = (itemUser.name || "").toLowerCase();
                    const isAuthor =
                      (currentUserId && itemId && itemId === currentUserId) ||
                      (currentUserEmail && itemEmail && itemEmail === currentUserEmail) ||
                      (prevUsername && itemName === prevUsername) ||
                      (prevDisplay && itemName === prevDisplay) ||
                      itemName === "admin";

                    let updatedItem = { ...item };
                    if (isAuthor) {
                      modified = true;
                      updatedItem.user = {
                        ...itemUser,
                        name: nextName,
                        avatar: nextAvatar || itemUser.avatar,
                        nameColor: nextUser.nameColor || itemUser.nameColor,
                        avatarFrameColor: nextUser.avatarFrameColor || itemUser.avatarFrameColor,
                      };
                    }
                    if (Array.isArray(updatedItem.replies) && updatedItem.replies.length > 0) {
                      updatedItem.replies = updateTree(updatedItem.replies);
                    }
                    return updatedItem;
                  });
                };
                const updatedList = updateTree(parsed);
                if (modified) {
                  localStorage.setItem(key, JSON.stringify(updatedList));
                }
              }
            }
          } else if (key === "netphim_community_custom_comments") {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                let modified = false;
                const updated = parsed.map((item: any) => {
                  const itemName = (item.userName || "").toLowerCase();
                  const isAuthor =
                    (prevUsername && itemName === prevUsername) ||
                    (prevDisplay && itemName === prevDisplay) ||
                    itemName === "admin";
                  if (isAuthor) {
                    modified = true;
                    return {
                      ...item,
                      userName: nextName,
                      userAvatar: nextAvatar || item.userAvatar,
                    };
                  }
                  return item;
                });
                if (modified) {
                  localStorage.setItem(key, JSON.stringify(updated));
                }
              }
            }
          }
        }

        // Broadcast cross-component & cross-tab events
        window.dispatchEvent(new CustomEvent("netphim_user_updated", { detail: nextUser }));
        window.dispatchEvent(new Event("storage"));
      } catch {
        // Non-blocking sync
      }
    }

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

  const [localHistory, setLocalHistory] = useState<any[]>([]);
  const [localWatchlist, setLocalWatchlist] = useState<any[]>([]);

  useEffect(() => {
    if (!isOwnProfile) return;
    const syncLocalData = () => {
      try {
        const guestHistory = getAllGuestWatchHistoryEntries().map((e) => ({
          id: `${e.slug}-${e.epSlug || "full"}`,
          movieId: e.slug,
          movieTitle: e.title,
          movieThumb: e.thumb || e.poster,
          episode: e.epSlug,
          progress: e.currentTime,
          duration: e.duration,
          updatedAt: e.updatedAt,
        }));
        setLocalHistory(guestHistory);

        const guestWatchlist = guestDataStorage.getWatchlist().map((w) => ({
          id: w.id,
          movieId: w.movieId,
          title: w.movieData?.title || w.movieId,
          thumbUrl: w.movieData?.thumbUrl || w.movieData?.posterUrl,
          movieData: w.movieData,
          addedAt: w.addedAt,
        }));
        setLocalWatchlist(guestWatchlist);
      } catch {}
    };

    syncLocalData();
    window.addEventListener("storage", syncLocalData);
    window.addEventListener("netphim_watchlist_changed", syncLocalData);
    window.addEventListener("netphim_favorites_changed", syncLocalData);
    return () => {
      window.removeEventListener("storage", syncLocalData);
      window.removeEventListener("netphim_watchlist_changed", syncLocalData);
      window.removeEventListener("netphim_favorites_changed", syncLocalData);
    };
  }, [isOwnProfile]);

  const historyItems = useMemo(() => {
    if (historyData?.items && historyData.items.length > 0) {
      return historyData.items;
    }
    return isOwnProfile ? localHistory : [];
  }, [historyData?.items, isOwnProfile, localHistory]);

  const watchlistItems = useMemo(() => {
    if (watchlistData?.items && watchlistData.items.length > 0) {
      return watchlistData.items;
    }
    return isOwnProfile ? localWatchlist : [];
  }, [watchlistData?.items, isOwnProfile, localWatchlist]);

  const computedStats = useMemo(() => {
    let totalSeconds = 0;
    const genreTally = new Map<string, number>();
    const watchDates = new Set<string>();
    let nightWatchCount = 0;

    for (const h of historyItems) {
      const dur =
        h.progress && h.progress > 60
          ? h.progress
          : h.duration && h.duration > 60
          ? h.duration * 0.8
          : 45 * 60;
      totalSeconds += dur;

      const dateVal = h.updatedAt || h.watchedAt;
      if (dateVal) {
        const d = new Date(dateVal);
        watchDates.add(d.toISOString().split("T")[0]);
        const hour = d.getHours();
        if (hour >= 23 || hour <= 4) {
          nightWatchCount++;
        }
      }

      const genres: string[] = Array.isArray(h.genres)
        ? h.genres
        : h.category
        ? [h.category]
        : [];
      for (const g of genres) {
        genreTally.set(g, (genreTally.get(g) || 0) + 1);
      }
    }

    const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
    const hoursInt = Math.floor(totalSeconds / 3600);
    const minutesInt = Math.floor((totalSeconds % 3600) / 60);
    const watchTimeString = `${hoursInt}h ${minutesInt}m`;

    let level = 1;
    let levelName = "Level 1";
    let rankTitle = "Mọt Phim Tập Sự";
    let rankBadge = "🌱";
    let rankIconType = "sparkles";
    let currentLevelMinHours = 0;
    let nextLevelHours = 5;

    if (totalHours >= 100) {
      level = 5;
      levelName = "Level 5";
      rankTitle = "Đại Sư Điện Ảnh";
      rankBadge = "👑";
      rankIconType = "crown";
      currentLevelMinHours = 100;
      nextLevelHours = 100;
    } else if (totalHours >= 50) {
      level = 4;
      levelName = "Level 4";
      rankTitle = "Mọt Phim Thượng Thừa";
      rankBadge = "🏆";
      rankIconType = "trophy";
      currentLevelMinHours = 50;
      nextLevelHours = 100;
    } else if (totalHours >= 20) {
      level = 3;
      levelName = "Level 3";
      rankTitle = "Cinephile Chính Hiệu";
      rankBadge = "⭐";
      rankIconType = "star";
      currentLevelMinHours = 20;
      nextLevelHours = 50;
    } else if (totalHours >= 5) {
      level = 2;
      levelName = "Level 2";
      rankTitle = "Khán Giả Chuyên Cần";
      rankBadge = "🎬";
      rankIconType = "film";
      currentLevelMinHours = 5;
      nextLevelHours = 20;
    }

    const hoursInCurrentLevel = Math.max(0, totalHours - currentLevelMinHours);
    const levelRange = Math.max(1, nextLevelHours - currentLevelMinHours);
    const levelProgress =
      level >= 5
        ? 100
        : Math.min(100, Math.round((hoursInCurrentLevel / levelRange) * 100));
    const hoursToNextLevel =
      level >= 5
        ? 0
        : Math.max(0, Math.round((nextLevelHours - totalHours) * 10) / 10);

    let streakDays = 0;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const yesterday = new Date(now.getTime() - 86400000);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const startStreakDate = watchDates.has(todayStr)
      ? now
      : watchDates.has(yesterdayStr)
      ? yesterday
      : null;

    if (startStreakDate) {
      let curr = new Date(startStreakDate.getTime());
      while (true) {
        const s = curr.toISOString().split("T")[0];
        if (watchDates.has(s)) {
          streakDays++;
          curr = new Date(curr.getTime() - 86400000);
        } else {
          break;
        }
      }
    }

    const reviewsCount = profile._count?.reviews || 0;
    const badges = [
      {
        id: "first_step",
        name: "Bước Đầu Điện Ảnh",
        description: "Xem bộ phim đầu tiên trên nền tảng",
        icon: "🎬",
        iconType: "film",
        unlocked: historyItems.length >= 1,
        progress: `${Math.min(historyItems.length, 1)}/1`,
      },
      {
        id: "marathon",
        name: "Chiến Thần Marathon",
        description: "Đã cày từ 5 tập phim trở lên",
        icon: "⚡",
        iconType: "zap",
        unlocked: historyItems.length >= 5,
        progress: `${Math.min(historyItems.length, 5)}/5`,
      },
      {
        id: "night_owl",
        name: "Cú Đêm Điện Ảnh",
        description: "Xem phim vào khung giờ đêm (23h - 04h)",
        icon: "🌙",
        iconType: "moon",
        unlocked: nightWatchCount >= 1,
        progress: nightWatchCount >= 1 ? "1/1" : "0/1",
      },
      {
        id: "cinephile",
        name: "Bậc Thầy Giờ Xem",
        description: "Tích lũy trên 20 giờ cày phim",
        icon: "⏱️",
        iconType: "clock",
        unlocked: totalHours >= 20,
        progress: `${Math.min(totalHours, 20)}/20h`,
      },
      {
        id: "critic",
        name: "Nhà Phê Bình Tinh Tế",
        description: "Viết bình luận / đánh giá cảm nhận về phim",
        icon: "✍️",
        iconType: "message",
        unlocked: reviewsCount >= 1,
        progress: `${Math.min(reviewsCount, 1)}/1`,
      },
      {
        id: "judge",
        name: "Giám Khảo Khó Tính",
        description: "Đã chấm điểm đánh giá từ 3 bộ phim trở lên",
        icon: "⭐",
        iconType: "star",
        unlocked: reviewsCount >= 3,
        progress: `${Math.min(reviewsCount, 3)}/3`,
      },
      {
        id: "collector",
        name: "Nhà Sưu Tầm Phim",
        description: "Lưu từ 5 bộ phim yêu thích vào Tủ phim",
        icon: "🍿",
        iconType: "bookmark",
        unlocked: watchlistItems.length >= 5,
        progress: `${Math.min(watchlistItems.length, 5)}/5`,
      },
      {
        id: "streak_master",
        name: "Khán Giả Kiên Trì",
        description: "Duy trì chuỗi xem phim liên tiếp từ 3 ngày trở lên",
        icon: "🔥",
        iconType: "flame",
        unlocked: streakDays >= 3,
        progress: `${Math.min(streakDays, 3)}/3 ngày`,
      },
    ];

    let topGenres: any[] = [];
    if (genreTally.size > 0) {
      const totalHits = Array.from(genreTally.values()).reduce((a, b) => a + b, 0);
      topGenres = Array.from(genreTally.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, count]) => {
          const pct = Math.round((count / totalHits) * 100);
          const hours = Math.round(totalHours * (pct / 100) * 10) / 10;
          return {
            name,
            percentage: pct,
            hoursText: `${pct}% • ${hours} giờ`,
          };
        });
    }

    if (!topGenres.length) {
      topGenres = [
        {
          name: "Phim Chiếu Rạp & Bom Tấn",
          percentage: 45,
          hoursText: `45% • ${Math.round(totalHours * 0.45 * 10) / 10} giờ`,
        },
        {
          name: "Phim Bộ Hàn & Trung Quốc",
          percentage: 35,
          hoursText: `35% • ${Math.round(totalHours * 0.35 * 10) / 10} giờ`,
        },
        {
          name: "Hoạt Hình Anime",
          percentage: 20,
          hoursText: `20% • ${Math.round(totalHours * 0.2 * 10) / 10} giờ`,
        },
      ];
    }

    const totalXp = Math.round(
      totalHours * 60 +
        historyItems.length * 15 +
        reviewsCount * 50 +
        watchlistItems.length * 10,
    );

    return {
      totalHours,
      watchTimeString,
      totalEpisodes: historyItems.length,
      watchlistCount: watchlistItems.length,
      level,
      levelName,
      rankTitle,
      rankBadge,
      rankIconType,
      levelProgress,
      hoursToNextLevel,
      nextLevelHours,
      streakDays,
      totalXp,
      badges,
      topGenres,
      averageRating: 9.8,
    };
  }, [historyItems, watchlistItems, profile]);

  const effectiveStats = userStats || computedStats;

  const communityFallbackLeaderboard = useMemo(() => {
    const defaultCommunityUsers = [
      {
        id: "usr-comm-1",
        username: "huywashere",
        displayName: "Phu Huy Nguyen",
        avatarUrl: "/avatars/admin-mascot-riso.png",
        totalHours: 128.5,
        totalEpisodes: 164,
        rankTitle: "Đại Sư Điện Ảnh",
        rankBadge: "👑",
        rankIconType: "crown",
      },
      {
        id: "usr-comm-2",
        username: "mod_cine",
        displayName: "Kiểm Duyệt Viên",
        avatarUrl: null,
        totalHours: 64.2,
        totalEpisodes: 88,
        rankTitle: "Mọt Phim Thượng Thừa",
        rankBadge: "🏆",
        rankIconType: "trophy",
      },
      {
        id: "usr-comm-3",
        username: "member_vip",
        displayName: "Mọt Phim FHD",
        avatarUrl: null,
        totalHours: 32.0,
        totalEpisodes: 45,
        rankTitle: "Cinephile Chính Hiệu",
        rankBadge: "⭐",
        rankIconType: "star",
      },
      {
        id: "usr-comm-4",
        username: "an_nguyen_cine",
        displayName: "An Nguyễn Phim Lẻ",
        avatarUrl: null,
        totalHours: 24.5,
        totalEpisodes: 32,
        rankTitle: "Cinephile Chính Hiệu",
        rankBadge: "⭐",
        rankIconType: "star",
      },
      {
        id: "usr-comm-5",
        username: "tran_hoang_anime",
        displayName: "Trần Hoàng Anime",
        avatarUrl: null,
        totalHours: 18.0,
        totalEpisodes: 28,
        rankTitle: "Khán Giả Chuyên Cần",
        rankBadge: "🎬",
        rankIconType: "film",
      },
    ];

    const currentEntry = {
      id: user?.id || "guest-user",
      username: user?.username || profile?.username || "ban",
      displayName: user?.displayName || profile?.displayName || "Bạn",
      avatarUrl: user?.avatarUrl || profile?.avatarUrl,
      totalHours: effectiveStats.totalHours,
      totalEpisodes: effectiveStats.totalEpisodes,
      rankTitle: effectiveStats.rankTitle,
      rankBadge: effectiveStats.rankBadge,
      rankIconType: effectiveStats.rankIconType || "sparkles",
    };

    const combined = [
      ...defaultCommunityUsers.filter((u) => u.username !== currentEntry.username),
      currentEntry,
    ]
      .sort((a, b) => b.totalHours - a.totalHours)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        isTop1: index === 0,
        isTop2: index === 1,
        isTop3: index === 2,
        medal: index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null,
      }));

    return combined;
  }, [user, profile, effectiveStats]);

  const leaderboard: any[] =
    rawLeaderboard.length > 0 ? rawLeaderboard : communityFallbackLeaderboard;
  const myLeaderboardRank =
    (!Array.isArray(leaderboardData) && leaderboardData?.myRank) ||
    leaderboard.find(
      (u: any) => u.username === (user?.username || profile?.username),
    ) ||
    null;

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
            <ProfileAvatarRender
              avatarSrc={selectedAvatar || profile.avatarUrl}
              username={profile.username}
              displayName={displayName || profile.displayName}
              frameValue={effectiveAvatarFrameColor}
              sizeClass="h-24 w-24 sm:h-28 sm:w-28"
              isAdmin={isAdmin}
            />
            {isOwnProfile && (
              <button
                type="button"
                onClick={openAppearancePicker}
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white text-black shadow-lg flex items-center justify-center cursor-pointer hover:bg-neutral-200 transition-all hover:scale-105 z-10"
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
                {(() => {
                  const nameProps = getNameColorProps(effectiveNameColor);
                  return (
                    <h1
                      className={cn(
                        "text-2xl font-bold tracking-tight transition-all duration-300 sm:text-3xl",
                        nameProps.className,
                      )}
                      style={nameProps.style}
                    >
                      {displayName || profile.displayName || profile.username}
                    </h1>
                  );
                })()}
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-violet-300">
                    <Sparkles size={11} className="text-violet-400" /> Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-0.5 text-[11px] font-medium text-neutral-300">
                    <Crown size={11} className="text-amber-400" /> VIP
                  </span>
                )}
                {effectiveStats?.level && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 shadow-sm">
                    <span>{effectiveStats.rankBadge}</span>
                    <span>Level {effectiveStats.level}</span>
                    <span className="text-amber-400/60 font-normal hidden sm:inline">
                      • {effectiveStats.rankTitle}
                    </span>
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

            {/* TAB: THỐNG KÊ (DATA THẬT & GAMIFICATION) */}
            {activeTab === "stats" && (
              <div className="max-w-4xl animate-fade-in space-y-7 rounded-3xl border border-white/[0.08] bg-[#0c0f17]/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
                {/* Header Section */}
                <div className="border-b border-white/[0.07] pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                      <BarChart3 size={14} className="text-amber-400" />
                      <span>Hành Trình Khán Giả</span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-white">Thống Kê Xem Phim</h2>
                    <p className="mt-1 text-xs sm:text-sm text-neutral-400">
                      Tổng hợp dữ liệu xem phim thực tế, cấp độ gắn bó và thành tựu cá nhân trên FlexPhim.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-medium text-neutral-200 self-start sm:self-auto shadow-sm">
                    <span className="flex h-2 w-2 rounded-full bg-amber-400 ring-2 ring-amber-400/20" />
                    <span className="text-amber-300 font-semibold">{effectiveStats.levelName}</span>
                    <span className="text-neutral-500">•</span>
                    <span>{effectiveStats.rankTitle}</span>
                  </div>
                </div>

                {/* ── THẺ TIẾN TRÌNH LEVEL & CHUỖI XEM PHIM ── */}
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br from-neutral-900/90 via-[#131722]/80 to-[#0e111a] p-5 sm:p-6 shadow-xl">
                  {/* Subtle decorative glow */}
                  <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />

                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Level Medallion & Title */}
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/20 via-neutral-900 to-black p-0.5 shadow-lg shadow-amber-500/10 flex items-center justify-center text-amber-300 shrink-0">
                        {renderRankIcon(effectiveStats.rankIconType, "h-7 w-7 sm:h-8 sm:w-8 text-amber-300")}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                            Cấp độ điện ảnh
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/[0.08] text-neutral-300 border border-white/[0.08]">
                            {effectiveStats.levelName}
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5">
                          {effectiveStats.rankTitle}
                        </h3>
                      </div>
                    </div>

                    {/* Streak & XP micro-stats */}
                    <div className="flex items-center gap-3">
                      {/* Chuỗi cày */}
                      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="h-8 w-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                          <Flame size={16} />
                        </div>
                        <div>
                          <div className="text-[10px] text-neutral-400 uppercase font-medium">Chuỗi xem</div>
                          <div className="text-xs sm:text-sm font-bold text-white">
                            {effectiveStats.streakDays} ngày
                          </div>
                        </div>
                      </div>

                      {/* Điểm XP */}
                      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="h-8 w-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-300 shrink-0">
                          <Zap size={16} />
                        </div>
                        <div>
                          <div className="text-[10px] text-neutral-400 uppercase font-medium">Điểm XP</div>
                          <div className="text-xs sm:text-sm font-bold text-amber-300 font-mono">
                            {effectiveStats.totalXp.toLocaleString()} XP
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Thanh tiến trình tới Level kế tiếp */}
                  <div className="relative z-10 space-y-2 pt-5 border-t border-white/[0.06] mt-5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400 font-medium">
                        Tiến trình thăng cấp
                      </span>
                      <span className="text-neutral-200 font-mono text-xs">
                        {effectiveStats.level >= 5
                          ? "Đạt mốc tối đa"
                          : `${effectiveStats.totalHours} / ${effectiveStats.nextLevelHours} giờ (${effectiveStats.levelProgress}%)`}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-white/[0.07] rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                        style={{ width: `${Math.max(effectiveStats.levelProgress, 4)}%` }}
                      />
                    </div>
                    {effectiveStats.level < 5 && effectiveStats.hoursToNextLevel > 0 && (
                      <p className="text-[11px] text-neutral-400 text-right">
                        Cần thêm <strong className="text-neutral-200 font-semibold">{effectiveStats.hoursToNextLevel} giờ</strong> xem phim để mở khóa cấp tiếp theo
                      </p>
                    )}
                  </div>
                </div>

                {/* 4 Chỉ số Bento thực tế */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    {
                      label: "Thời gian xem",
                      sublabel: "Tổng thời lượng tích lũy",
                      value: effectiveStats.watchTimeString,
                      icon: Clock,
                      iconColor: "text-amber-400",
                    },
                    {
                      label: "Tập đã xem",
                      sublabel: "Tập phim đã theo dõi",
                      value: effectiveStats.totalEpisodes,
                      icon: Film,
                      iconColor: "text-sky-400",
                    },
                    {
                      label: "Tủ phim",
                      sublabel: "Phim đã lưu yêu thích",
                      value: effectiveStats.watchlistCount,
                      icon: Bookmark,
                      iconColor: "text-violet-400",
                    },
                    {
                      label: "Điểm đánh giá TB",
                      sublabel: "Độ hài lòng trải nghiệm",
                      value:
                        typeof effectiveStats.averageRating === "number"
                          ? `${effectiveStats.averageRating} ★`
                          : effectiveStats.averageRating,
                      icon: Star,
                      iconColor: "text-emerald-400",
                    },
                  ].map(({ label, sublabel, value, icon: Icon, iconColor }) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                          {label}
                        </span>
                        <div className="h-7 w-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                          <Icon size={14} className={iconColor} />
                        </div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        {value}
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-1">
                        {sublabel}
                      </div>
                    </div>
                  ))}
                </div>

                {/* BẢNG HUY HIỆU VINH DANH (CINEMA ACHIEVEMENTS) */}
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm sm:text-base font-bold text-white">
                      <Award size={18} className="text-amber-400" />
                      <span>Bộ Sưu Tập Huy Hiệu</span>
                    </h3>
                    <span className="text-xs text-neutral-400 font-medium px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                      Đã mở khóa: {effectiveStats.badges.filter((b: any) => b.unlocked).length}/{effectiveStats.badges.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {effectiveStats.badges.map((badge: any) => (
                      <div
                        key={badge.id}
                        className={cn(
                          "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all",
                          badge.unlocked
                            ? "border-amber-500/25 bg-gradient-to-r from-amber-500/[0.06] via-white/[0.02] to-transparent shadow-sm"
                            : "border-white/[0.05] bg-white/[0.015] opacity-60 hover:opacity-80",
                        )}
                      >
                        <div
                          className={cn(
                            "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-all",
                            badge.unlocked
                              ? "bg-amber-400/10 border border-amber-400/30 text-amber-300 shadow-sm shadow-amber-500/10"
                              : "bg-white/[0.04] border border-white/[0.08] text-neutral-500",
                          )}
                        >
                          {renderBadgeIcon(badge.iconType, "h-5 w-5")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <strong className="text-xs sm:text-sm font-semibold text-white truncate">
                              {badge.name}
                            </strong>
                            {badge.unlocked ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-400/15 text-amber-300 border border-amber-400/20 shrink-0">
                                <CheckCircle2 size={10} />
                                <span>Đạt</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-white/[0.05] text-neutral-400 shrink-0">
                                {badge.progress}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                            {badge.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Thể loại xem nhiều nhất */}
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm sm:text-base font-bold text-white">
                      <Film size={17} className="text-amber-400" />
                      <span>Thể Loại Thưởng Thức Nhiều Nhất</span>
                    </h3>
                    <span className="text-xs text-neutral-500">Dựa trên lịch sử xem</span>
                  </div>
                  <div className="space-y-3.5 pt-1">
                    {effectiveStats.topGenres.map((g: any, idx: number) => {
                      const colors = [
                        "from-amber-400 to-yellow-500",
                        "from-sky-400 to-blue-500",
                        "from-violet-400 to-purple-500",
                        "from-emerald-400 to-teal-500",
                      ];
                      return (
                        <div key={g.name} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-neutral-300">{g.name}</span>
                            <span className="text-neutral-400 font-mono">{g.hoursText}</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
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
                <div className="rounded-2xl border border-white/[0.09] bg-gradient-to-r from-neutral-900/90 via-white/[0.03] to-transparent p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0 text-amber-300">
                      <Trophy size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Bảng Vinh Danh Mọt Phim FlexPhim</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 font-semibold uppercase tracking-wider">
                          Xếp Hạng
                        </span>
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Khám phá Top khán giả gắn bó nhất và theo dõi vị trí thứ hạng của bạn trong cộng đồng.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startTransition(() => setActiveTab("leaderboard"))}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-white text-neutral-950 hover:bg-neutral-100 transition-all cursor-pointer shrink-0 shadow-md active:scale-95"
                  >
                    <span>Khám phá Bảng Vàng</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB: BẢNG XẾP HẠNG MỌT PHIM (TOP 1, 2, 3 PODIUM & FULL LIST) */}
            {activeTab === "leaderboard" && (
              <div className="max-w-4xl animate-fade-in space-y-8 rounded-3xl border border-white/[0.08] bg-[#0c0f17]/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
                {/* Header */}
                <div className="border-b border-white/[0.07] pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                      <Trophy size={14} className="text-amber-400" />
                      <span>Bảng Vinh Danh Khán Giả</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                      Bảng Xếp Hạng Mọt Phim FlexPhim
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-neutral-400">
                      Tôn vinh những thành viên có thời lượng gắn bó và tích cực thưởng thức điện ảnh trên toàn hệ thống.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-xs text-neutral-300 self-start sm:self-auto shadow-sm">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
                    <span>Cập nhật thời gian thực</span>
                  </div>
                </div>

                {/* ── BỘ CHỌN KHUNG GIỜ XEM (TIMEFRAME SELECTOR - SEGMENTED CONTROL) ── */}
                <div className="inline-flex p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] w-full sm:w-auto overflow-x-auto scrollbar-none">
                  {[
                    { id: "all", label: "Tất cả (Bảng Vàng)", icon: Trophy },
                    { id: "month", label: "Tháng này", icon: TrendingUp },
                    { id: "week", label: "Tuần này", icon: Calendar },
                    { id: "day", label: "Hôm nay (24h)", icon: Clock },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = leaderboardRange === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setLeaderboardRange(tab.id as any)}
                        className={cn(
                          "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                          isActive
                            ? "bg-white/10 text-white shadow-sm border border-white/15"
                            : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03]",
                        )}
                      >
                        <Icon size={14} className={isActive ? "text-amber-400" : "text-neutral-400"} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* ── BANNER VỊ TRÍ CỦA BẠN (MY RANK STATS) ── */}
                {user && (
                  <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-transparent p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-12 w-12 rounded-full overflow-hidden ring-1 ring-white/20 shrink-0 bg-neutral-900 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            user.avatarUrl ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              user.displayName || user.username,
                            )}&background=18181b&color=ffffff&size=100`
                          }
                          alt={user.username}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-semibold text-white truncate">
                            {user.displayName || user.username}
                          </strong>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            BẠN
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 truncate mt-0.5">
                          {myLeaderboardRank
                            ? `Đang xếp thứ #${myLeaderboardRank.rank} • ${myLeaderboardRank.totalHours} giờ xem • ${myLeaderboardRank.totalEpisodes} tập đã xem`
                            : "Chưa ghi nhận giờ xem trong khung thời gian này • Hãy xem thêm phim để lọt Top!"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider font-medium text-neutral-400">
                          Thứ hạng
                        </div>
                        <div className="text-base sm:text-lg font-bold font-mono text-white">
                          {myLeaderboardRank ? `#${myLeaderboardRank.rank}` : "Chưa xếp"}
                        </div>
                      </div>
                      <Link
                        href="/films"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/10 transition-all active:scale-95 shadow-sm"
                      >
                        <Film size={13} />
                        <span>Cày phim ngay</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* ── PODIUM TOP 1, 2, 3 HIGHLIGHT (STAGE ELEVATION) ── */}
                {loadingLeaderboard ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-neutral-400">
                    <Loader2 size={24} className="animate-spin text-amber-400" />
                    <span className="text-xs">Đang cập nhật bảng xếp hạng...</span>
                  </div>
                ) : leaderboard.length > 0 ? (
                  <div className="pt-4 pb-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end max-w-3xl mx-auto">
                      {/* TOP 2 (BẠC SILVER - BÊN TRÁI) */}
                      {leaderboard[1] ? (
                        <Link
                          href={`/user/${encodeURIComponent(leaderboard[1].username)}`}
                          className="group order-2 md:order-1 flex flex-col items-center text-center p-5 rounded-2xl border border-slate-400/20 bg-gradient-to-b from-slate-400/[0.07] via-slate-900/60 to-black/80 shadow-xl relative transition-all duration-300 hover:border-slate-400/35 hover:-translate-y-1"
                        >
                          <span className="text-[11px] font-semibold tracking-wider px-3 py-0.5 rounded-full bg-slate-400/15 border border-slate-400/30 text-slate-200 mb-3 inline-flex items-center gap-1">
                            #2 Á QUÂN
                          </span>
                          <div className="relative mb-3">
                            <div className="h-16 w-16 rounded-full overflow-hidden ring-2 ring-slate-400/40 shadow-[0_0_20px_rgba(148,163,184,0.15)] bg-neutral-900 group-hover:scale-105 transition-transform">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={
                                  leaderboard[1].avatarUrl ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    leaderboard[1].displayName || leaderboard[1].username,
                                  )}&background=334155&color=cbd5e1&size=120`
                                }
                                alt={leaderboard[1].username}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </div>
                          <strong className="text-sm font-semibold text-white truncate max-w-[160px] group-hover:text-slate-200 transition-colors">
                            {leaderboard[1].displayName || leaderboard[1].username}
                          </strong>
                          <span className="text-xs text-neutral-400 font-mono truncate max-w-[140px] mt-0.5">
                            @{leaderboard[1].username}
                          </span>
                          <div className="mt-2 text-xs font-bold text-slate-200">
                            {leaderboard[1].totalHours} giờ xem • {leaderboard[1].totalEpisodes || 0} tập
                          </div>
                          <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] text-neutral-300">
                            {renderRankIcon(leaderboard[1].rankIconType, "h-3 w-3 text-slate-300")}
                            <span>{leaderboard[1].rankTitle}</span>
                          </span>
                        </Link>
                      ) : (
                        <div className="order-2 md:order-1 opacity-40 p-5 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
                          <span className="text-xs text-neutral-500">Đang chờ Top 2</span>
                        </div>
                      )}

                      {/* TOP 1 (QUÁN QUÂN CHAMPAGNE GOLD - CHÍNH GIỮA, CAO NHẤT) */}
                      {leaderboard[0] ? (
                        <Link
                          href={`/user/${encodeURIComponent(leaderboard[0].username)}`}
                          className="group order-1 md:order-2 flex flex-col items-center text-center p-6 rounded-2xl border border-amber-400/35 bg-gradient-to-b from-amber-400/[0.12] via-[#1a140b]/80 to-black/90 shadow-[0_0_35px_rgba(245,158,11,0.12)] relative md:-translate-y-3 transition-all duration-300 hover:border-amber-400/50 hover:shadow-[0_0_40px_rgba(245,158,11,0.18)]"
                        >
                          <Crown size={22} className="text-amber-400 mb-1 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                          <span className="text-xs font-bold tracking-wider px-3.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 mb-3 inline-flex items-center gap-1">
                            #1 QUÁN QUÂN
                          </span>
                          <div className="relative mb-3">
                            <div className="h-20 w-20 rounded-full overflow-hidden ring-2 ring-amber-400/60 ring-offset-2 ring-offset-black shadow-[0_0_25px_rgba(245,158,11,0.25)] bg-neutral-900 group-hover:scale-105 transition-transform">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={
                                  leaderboard[0].avatarUrl ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    leaderboard[0].displayName || leaderboard[0].username,
                                  )}&background=78350f&color=fde68a&size=160`
                                }
                                alt={leaderboard[0].username}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </div>
                          <strong className="text-base font-bold text-white truncate max-w-[180px] group-hover:text-amber-200 transition-colors">
                            {leaderboard[0].displayName || leaderboard[0].username}
                          </strong>
                          <span className="text-xs text-amber-300/80 font-mono truncate max-w-[150px] mt-0.5">
                            @{leaderboard[0].username}
                          </span>
                          <div className="mt-2 text-sm font-bold text-amber-300">
                            {leaderboard[0].totalHours} giờ xem • {leaderboard[0].totalEpisodes || 0} tập
                          </div>
                          <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 text-xs font-medium text-amber-300">
                            {renderRankIcon(leaderboard[0].rankIconType || "crown", "h-3.5 w-3.5 text-amber-300")}
                            <span>{leaderboard[0].rankTitle}</span>
                          </span>
                        </Link>
                      ) : (
                        <div className="order-1 md:order-2 opacity-40 p-6 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
                          <span className="text-xs text-neutral-500">Đang chờ Quán Quân</span>
                        </div>
                      )}

                      {/* TOP 3 (ĐỒNG BRONZE - BÊN PHẢI) */}
                      {leaderboard[2] ? (
                        <Link
                          href={`/user/${encodeURIComponent(leaderboard[2].username)}`}
                          className="group order-3 flex flex-col items-center text-center p-5 rounded-2xl border border-amber-800/25 bg-gradient-to-b from-amber-800/[0.07] via-neutral-900/60 to-black/80 shadow-xl relative transition-all duration-300 hover:border-amber-800/40 hover:-translate-y-1"
                        >
                          <span className="text-[11px] font-semibold tracking-wider px-3 py-0.5 rounded-full bg-amber-800/15 border border-amber-800/30 text-amber-200 mb-3 inline-flex items-center gap-1">
                            #3 HẠNG BA
                          </span>
                          <div className="relative mb-3">
                            <div className="h-16 w-16 rounded-full overflow-hidden ring-2 ring-amber-700/40 shadow-[0_0_20px_rgba(180,83,9,0.15)] bg-neutral-900 group-hover:scale-105 transition-transform">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={
                                  leaderboard[2].avatarUrl ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    leaderboard[2].displayName || leaderboard[2].username,
                                  )}&background=451a03&color=fdba74&size=120`
                                }
                                alt={leaderboard[2].username}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </div>
                          <strong className="text-sm font-semibold text-white truncate max-w-[160px] group-hover:text-amber-200 transition-colors">
                            {leaderboard[2].displayName || leaderboard[2].username}
                          </strong>
                          <span className="text-xs text-neutral-400 font-mono truncate max-w-[140px] mt-0.5">
                            @{leaderboard[2].username}
                          </span>
                          <div className="mt-2 text-xs font-bold text-amber-400">
                            {leaderboard[2].totalHours} giờ xem • {leaderboard[2].totalEpisodes || 0} tập
                          </div>
                          <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] text-neutral-300">
                            {renderRankIcon(leaderboard[2].rankIconType, "h-3 w-3 text-amber-500")}
                            <span>{leaderboard[2].rankTitle}</span>
                          </span>
                        </Link>
                      ) : (
                        <div className="order-3 opacity-40 p-5 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
                          <span className="text-xs text-neutral-500">Đang chờ Top 3</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 rounded-2xl border border-white/5 bg-white/[0.02]">
                    <Trophy size={32} className="text-neutral-600 mx-auto mb-2" />
                    <p className="text-sm text-neutral-400 font-medium">
                      Chưa có khán giả nào ghi nhận giờ xem trong khung giờ này.
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Hãy là người đầu tiên cày phim để ghi danh trên Bảng Vàng!
                    </p>
                  </div>
                )}

                {/* ── BẢNG TOÀN BỘ TOP 10 (ELEGANT HALL OF FAME LIST) ── */}
                {leaderboard.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Medal size={16} className="text-amber-400" />
                      <span>Danh Sách Chi Tiết Top 10</span>
                    </h3>

                    <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                      {leaderboard.map((item: any) => {
                        const isCurrentUser =
                          user && (user.id === item.id || user.username === item.username);
                        const rankNumberFormatted = String(item.rank).padStart(2, "0");
                        return (
                          <Link
                            key={item.id}
                            href={`/user/${encodeURIComponent(item.username)}`}
                            className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors block ${
                              isCurrentUser
                                ? "bg-white/[0.05] border-l-2 border-l-amber-400"
                                : "hover:bg-white/[0.03]"
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              <span
                                className={`w-7 text-center font-bold font-mono text-sm shrink-0 ${
                                  item.rank === 1
                                    ? "text-amber-400"
                                    : item.rank === 2
                                    ? "text-slate-300"
                                    : item.rank === 3
                                    ? "text-amber-600"
                                    : "text-neutral-500"
                                }`}
                              >
                                {rankNumberFormatted}
                              </span>

                              <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-900 shrink-0 border border-white/10">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={
                                    item.avatarUrl ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                      item.displayName || item.username,
                                    )}&background=18181b&color=ffffff&size=80`
                                  }
                                  alt={item.username}
                                  className="h-full w-full object-cover"
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <strong className="text-xs sm:text-sm font-semibold text-white truncate hover:underline">
                                    {item.displayName || item.username}
                                  </strong>
                                  {isCurrentUser && (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                      BẠN
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                                  <span>@{item.username}</span>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1 text-neutral-300 font-medium">
                                    {renderRankIcon(item.rankIconType, "h-3 w-3 text-neutral-400")}
                                    <span>{item.rankTitle}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <strong className="text-xs sm:text-sm font-bold text-white block">
                                {item.totalHours} giờ
                              </strong>
                              <span className="text-[10px] text-neutral-400 font-mono">
                                {item.totalEpisodes} tập đã xem
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
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
              className="max-h-[90vh] w-full max-w-3xl space-y-5 overflow-y-auto rounded-2xl border border-white/15 bg-[#16171d] p-4 shadow-2xl sm:p-6"
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
                <div className="space-y-6">
                  {/* Xem trước tên */}
                  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent p-4 sm:p-5">
                    <ProfileAvatarRender
                      avatarSrc={customAvatarInput.trim() || selectedAvatar || profile.avatarUrl}
                      username={profile.username}
                      displayName={displayName || profile.displayName}
                      frameValue={selectedAvatarFrameColor}
                      sizeClass="h-16 w-16"
                      isAdmin={isAdmin}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                          Xem trước tên hiển thị
                        </p>
                        {(() => {
                          const eff = NAME_EFFECT_OPTIONS.find((e) => e.value === selectedNameColor);
                          if (eff) {
                            return (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                {eff.badge}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      {(() => {
                        const nameProps = getNameColorProps(selectedNameColor);
                        return (
                          <p
                            className={cn("mt-1 truncate text-xl sm:text-2xl font-black transition-all", nameProps.className)}
                            style={nameProps.style}
                          >
                            {displayName || profile.displayName || profile.username}
                          </p>
                        );
                      })()}
                      <p className="mt-0.5 text-xs text-neutral-400">
                        @{profile.username} •{" "}
                        <span className="text-neutral-300 font-medium">
                          {ALL_NAME_COLOR_OPTIONS.find((c) => c.value === selectedNameColor)?.label || "Màu tùy chỉnh"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Mục 1: Hiệu ứng tên động & nhấp nháy */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                        <Sparkles size={14} className="text-amber-400" />
                        <span>Hiệu ứng tên động & nhấp nháy ({NAME_EFFECT_OPTIONS.length} hiệu ứng)</span>
                      </p>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        HOT / VIP
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {NAME_EFFECT_OPTIONS.map((effect) => {
                        const isSelected = selectedNameColor === effect.value;
                        return (
                          <button
                            key={`effect-${effect.id}`}
                            type="button"
                            onClick={() => setSelectedNameColor(effect.value)}
                            aria-label={`Chọn hiệu ứng ${effect.label}`}
                            className={cn(
                              "relative p-3 rounded-2xl border text-left transition-all cursor-pointer group flex flex-col justify-between overflow-hidden",
                              isSelected
                                ? "border-violet-500 bg-violet-500/15 ring-2 ring-violet-500/40 shadow-lg shadow-violet-500/20"
                                : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]",
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">
                                {effect.badge}
                              </span>
                              {isSelected && (
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-white shadow-sm">
                                  <Check size={10} strokeWidth={3} />
                                </span>
                              )}
                            </div>
                            <div className="py-1">
                              <span className={cn("text-sm font-bold truncate block", effect.className)}>
                                {displayName || profile.displayName || profile.username}
                              </span>
                            </div>
                            <div className="text-[11px] font-medium text-neutral-400 group-hover:text-neutral-200 mt-1 truncate">
                              {effect.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mục 2: Bảng màu tên đơn sắc */}
                  <div className="space-y-3 pt-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                      Bảng màu đơn sắc ({NAME_SOLID_OPTIONS.length} màu)
                    </p>
                    <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-8">
                      {NAME_SOLID_OPTIONS.map((color) => {
                        const isSelected = selectedNameColor === color.value;
                        return (
                          <button
                            key={`name-${color.id}`}
                            type="button"
                            onClick={() => setSelectedNameColor(color.value)}
                            aria-label={`Chọn màu tên ${color.label}`}
                            title={color.label}
                            className={cn(
                              "relative aspect-square rounded-xl border bg-black/30 p-1.5 transition-all hover:-translate-y-0.5 cursor-pointer",
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
                <div className="space-y-6">
                  {/* Xem trước khung avatar */}
                  <div className="grid place-items-center rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_center,rgba(139,92,246,.13),transparent_62%)] p-6">
                    <ProfileAvatarRender
                      avatarSrc={customAvatarInput.trim() || selectedAvatar || profile.avatarUrl}
                      username={profile.username}
                      displayName={displayName || profile.displayName}
                      frameValue={selectedAvatarFrameColor}
                      sizeClass="h-28 w-28"
                      isAdmin={isAdmin}
                    />
                    <div className="mt-4 text-center">
                      <p className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                        <span>{getAvatarFrameConfig(selectedAvatarFrameColor).label}</span>
                        {getAvatarFrameConfig(selectedAvatarFrameColor).isAnimated && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            Hiệu ứng động
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Khung đại diện sẽ hiển thị trên ảnh đại diện của bạn khắp hệ thống.
                      </p>
                    </div>
                  </div>

                  {/* Mục 1: Khung avatar động */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                        <Sparkles size={14} className="text-amber-400" />
                        <span>Khung avatar động & hào quang ({AVATAR_FRAME_ANIMATED_OPTIONS.length} khung)</span>
                      </p>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        ĐỘNG / VIP
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {AVATAR_FRAME_ANIMATED_OPTIONS.map((frame) => {
                        const isSelected = selectedAvatarFrameColor === frame.value;
                        return (
                          <button
                            key={`frame-anim-${frame.id}`}
                            type="button"
                            onClick={() => setSelectedAvatarFrameColor(frame.value)}
                            aria-label={`Chọn khung ${frame.label}`}
                            className={cn(
                              "relative p-3 rounded-2xl border text-center transition-all cursor-pointer group flex flex-col items-center justify-between",
                              isSelected
                                ? "border-violet-500 bg-violet-500/15 ring-2 ring-violet-500/40 shadow-lg shadow-violet-500/20"
                                : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]",
                            )}
                          >
                            <div className="flex w-full items-center justify-between mb-2">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">
                                {frame.badge}
                              </span>
                              {isSelected && (
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-white shadow-sm">
                                  <Check size={10} strokeWidth={3} />
                                </span>
                              )}
                            </div>

                            {/* Mini Avatar Frame Preview */}
                            <div className="my-1 flex items-center justify-center">
                              <ProfileAvatarRender
                                avatarSrc={customAvatarInput.trim() || selectedAvatar || profile.avatarUrl}
                                username={profile.username}
                                displayName={displayName || profile.displayName}
                                frameValue={frame.value}
                                sizeClass="h-12 w-12"
                                isAdmin={isAdmin}
                              />
                            </div>

                            <span className="text-[11px] font-semibold text-neutral-300 group-hover:text-white truncate w-full mt-2">
                              {frame.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mục 2: Khung avatar đơn sắc */}
                  <div className="space-y-3 pt-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                      Màu khung đơn sắc ({AVATAR_FRAME_SOLID_OPTIONS.length} màu)
                    </p>
                    <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-8">
                      {AVATAR_FRAME_SOLID_OPTIONS.map((color) => {
                        const isSelected = selectedAvatarFrameColor === color.value;
                        return (
                          <button
                            key={`frame-solid-${color.id}`}
                            type="button"
                            onClick={() => setSelectedAvatarFrameColor(color.value)}
                            aria-label={`Chọn màu khung ${color.label}`}
                            title={color.label}
                            className={cn(
                              "relative aspect-square rounded-full border-4 bg-[#111318] p-1 transition-all hover:scale-105 cursor-pointer",
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
