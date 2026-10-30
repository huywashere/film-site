"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Search,
  Film,
  Bookmark,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  Menu,
  X,
  Star,
  Sun,
  Moon,
  List,
  Play,
  Languages,
  Loader2,
  Bell,
  Settings,
  History,
  MonitorSmartphone,
  MessageSquare,
  Shuffle,
  Users,
  UserCheck,
  CalendarDays,
  Tv,
  SlidersHorizontal,
  Flame,
  Globe,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useTranslation } from "@/store/langStore";
import { useThemeStore } from "@/store/themeStore";
import { api, movieApi, publishedMovieApi, systemNotificationApi } from "@/lib/api";
import { fetchBilingualFilms } from "@/lib/bilingual-catalog";
import { resolveImageUrl } from "@/components/film/FilmCard";
import { cn } from "@/lib/utils";
import { cardFont, logoFont } from "@/lib/fonts";
import {
  NOTIFICATION_READ_STORAGE_KEY,
  isNotificationRead,
  persistNotificationReadIds,
  persistNotificationsReadThrough,
  readNotificationReadState,
} from "@/lib/notification-read-state";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useReliableNavigation } from "@/hooks/useReliableNavigation";
import { getNameColorProps, getAvatarFrameConfig } from "@/lib/profile-appearance";

const InteractiveAdminMascot = dynamic(
  () =>
    import("@/components/mascot/InteractiveAdminMascot").then(
      (mod) => mod.InteractiveAdminMascot,
    ),
  { ssr: false },
);

const MobileSidebar = dynamic(
  () => import("./MobileSidebar").then((mod) => mod.MobileSidebar),
  {
    ssr: false,
  },
);

// Lazy-load SpotlightSearchModal to avoid server-side issues
const SpotlightSearchModal = dynamic(
  () =>
    import("@/components/search/SpotlightSearchModal").then(
      (mod) => mod.SpotlightSearchModal,
    ),
  { ssr: false },
);

const WELCOME_NOTIFICATION_ID = "welcome-flexphim-v1";
const WELCOME_NOTIFICATION_TITLE = "Chào mừng bạn đến với FlexPhim";

type MovieNotificationChannel = "series" | "single";

type NavbarMovieNotification = {
  id: string;
  name: string;
  episode: string;
  poster?: string;
  message: string;
  time: string;
  slug?: string;
  publishedAt?: string | null;
  read: boolean;
};

const EMPTY_NAVBAR_NOTIFICATION_ITEMS: any[] = [];

function notificationMovieItems(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function movieNotificationTimestamp(item: any) {
  const value =
    item?.modified?.time ||
    item?.updatedAt ||
    item?.createdAt ||
    item?.publishedAt;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

async function loadMovieNotificationFeed(channel: MovieNotificationChannel) {
  const [sourceResult, uploadedResult] = await Promise.allSettled([
    channel === "series" ? movieApi.getSeries(1) : movieApi.getSingle(1),
    publishedMovieApi.getLatest(channel, 16),
  ]);
  const sourceItems =
    sourceResult.status === "fulfilled"
      ? notificationMovieItems(sourceResult.value.data)
      : [];
  const uploadedItems =
    uploadedResult.status === "fulfilled"
      ? notificationMovieItems(uploadedResult.value)
      : [];

  const unique = new Map<string, any>();
  [...uploadedItems, ...sourceItems].forEach((item) => {
    const key = String(item?.slug || item?._id || item?.id || "").trim();
    if (!key) return;
    const current = unique.get(key);
    if (
      !current ||
      movieNotificationTimestamp(item) > movieNotificationTimestamp(current)
    ) {
      unique.set(key, item);
    }
  });

  return [...unique.values()]
    .sort(
      (a, b) => movieNotificationTimestamp(b) - movieNotificationTimestamp(a),
    )
    .slice(0, 12);
}

const NAV_LINKS = [
  { href: "/films/series", key: "nav.series", label: "Phim Bộ" },
  { href: "/films/single", key: "nav.single", label: "Phim Lẻ" },
  { href: "/song-ngu", key: "nav.bilingual", label: "Song Ngữ" },
];

export const GENRES_LIST = [
  { label: "Bí Ẩn", slug: "bi-an" },
  { label: "Chiến Tranh", slug: "chien-tranh" },
  { label: "Chính Kịch", slug: "chinh-kich" },
  { label: "Cổ Trang", slug: "co-trang" },
  { label: "Gia Đình", slug: "gia-dinh" },
  { label: "Hài Hước", slug: "hai-huoc" },
  { label: "Hành Động", slug: "hanh-dong" },
  { label: "Hình Sự", slug: "hinh-su" },
  { label: "Học Đường", slug: "hoc-duong" },
  { label: "Khoa Học", slug: "khoa-hoc" },
  { label: "Kinh Dị", slug: "kinh-di" },
  { label: "Kinh Điển", slug: "kinh-dien" },
  { label: "Lịch Sử", slug: "lich-su" },
  { label: "Miền Tây", slug: "mien-tay" },
  { label: "Phim 18+", slug: "phim-18" },
  { label: "Phim Ngắn", slug: "phim-ngan" },
  { label: "Phiêu Lưu", slug: "phieu-luu" },
  { label: "Thần Thoại", slug: "than-thoai" },
  { label: "Thể Thao", slug: "the-thao" },
  { label: "Trẻ Em", slug: "tre-em" },
  { label: "Tài Liệu", slug: "tai-lieu" },
  { label: "Tâm Lý", slug: "tam-ly" },
  { label: "Tình Cảm", slug: "tinh-cam" },
  { label: "Viễn Tưởng", slug: "vien-tuong" },
  { label: "Võ Thuật", slug: "vo-thuat" },
  { label: "Âm Nhạc", slug: "am-nhac" },
];

export interface CountryItem {
  label: string;
  slug: string;
  code: string;
  isHot?: boolean;
}

export const COUNTRIES_LIST: CountryItem[] = [
  { label: "Âu Mỹ", slug: "au-my", code: "us", isHot: true },
  { label: "Hàn Quốc", slug: "han-quoc", code: "kr", isHot: true },
  { label: "Trung Quốc", slug: "trung-quoc", code: "cn", isHot: true },
  { label: "Nhật Bản", slug: "nhat-ban", code: "jp" },
  { label: "Thái Lan", slug: "thai-lan", code: "th" },
  { label: "Việt Nam", slug: "viet-nam", code: "vn" },
  { label: "Hồng Kông", slug: "hong-kong", code: "hk" },
  { label: "Đài Loan", slug: "dai-loan", code: "tw" },
  { label: "Ấn Độ", slug: "an-do", code: "in" },
  { label: "Anh", slug: "anh", code: "gb" },
  { label: "Pháp", slug: "phap", code: "fr" },
  { label: "Đức", slug: "duc", code: "de" },
  { label: "Tây Ban Nha", slug: "tay-ban-nha", code: "es" },
  { label: "Ý", slug: "y", code: "it" },
  { label: "Canada", slug: "canada", code: "ca" },
  { label: "Úc", slug: "uc", code: "au" },
  { label: "Nga", slug: "nga", code: "ru" },
  { label: "Indonesia", slug: "indonesia", code: "id" },
  { label: "Philippines", slug: "philippines", code: "ph" },
  { label: "Malaysia", slug: "malaysia", code: "my" },
  { label: "Ba Lan", slug: "ba-lan", code: "pl" },
  { label: "Brazil", slug: "brazil", code: "br" },
  { label: "Bồ Đào Nha", slug: "bo-dao-nha", code: "pt" },
  { label: "Mexico", slug: "mexico", code: "mx" },
  { label: "Thổ Nhĩ Kỳ", slug: "tho-nhi-ky", code: "tr" },
  { label: "Hà Lan", slug: "ha-lan", code: "nl" },
  { label: "Na Uy", slug: "na-uy", code: "no" },
  { label: "Thụy Điển", slug: "thuy-dien", code: "se" },
  { label: "Thụy Sĩ", slug: "thuy-si", code: "ch" },
  { label: "Đan Mạch", slug: "dan-mach", code: "dk" },
  { label: "UAE", slug: "uae", code: "ae" },
  { label: "Ả Rập Xê Út", slug: "a-rap-xe-ut", code: "sa" },
  { label: "Nam Phi", slug: "nam-phi", code: "za" },
  { label: "Châu Phi", slug: "chau-phi", code: "za" },
  { label: "Ukraina", slug: "ukraina", code: "ua" },
  { label: "Quốc Gia Khác", slug: "quoc-gia-khac", code: "un" },
];

export function CountryFlagImage({
  code,
  label,
  className = "w-5 h-3.5 object-cover rounded-[2.5px] border border-white/20 shrink-0 shadow-sm",
}: {
  code: string;
  label: string;
  className?: string;
}) {
  const flagCode = code?.trim().toLowerCase();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [flagCode]);

  if (!flagCode || flagCode === "un" || hasError) {
    return (
      <span
        className={cn(
          "inline-flex w-5 h-3.5 shrink-0 items-center justify-center rounded-[2.5px] bg-white/5 border border-white/15",
          className,
        )}
        title={label}
        aria-label={label}
      >
        <Globe className="w-3 h-3 text-sky-400 shrink-0" aria-hidden="true" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${flagCode}.png`}
      srcSet={`https://flagcdn.com/w80/${flagCode}.png 2x`}
      alt={label}
      width={20}
      height={14}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
      className={cn(
        "w-5 h-3.5 object-cover rounded-[2.5px] border border-white/20 shadow-sm shrink-0 select-none",
        className,
      )}
    />
  );
}

const MORE_NAV_ITEMS = [
  {
    href: "/comments",
    key: "nav.comments",
    label: "Bình luận",
    labelEn: "Comments",
    icon: MessageSquare,
  },
  {
    href: "/random",
    key: "nav.randomMovie",
    label: "Phim ngẫu nhiên",
    labelEn: "Random Movie",
    icon: Shuffle,
  },
  {
    href: "/watch-party",
    key: "nav.watchParty",
    label: "Xem Chung",
    labelEn: "Watch Party",
    icon: Users,
  },
  {
    href: "/actors",
    key: "nav.actors",
    label: "Diễn viên",
    labelEn: "Actors",
    icon: UserCheck,
  },
  {
    href: "/schedule",
    key: "nav.schedule",
    label: "Lịch chiếu",
    labelEn: "Schedule",
    icon: CalendarDays,
  },
  {
    href: "/films/tv-shows",
    key: "nav.tvshows",
    label: "TV Shows",
    labelEn: "TV Shows",
    icon: Tv,
  },
  {
    href: "/films",
    key: "nav.yearFilter",
    label: "Bộ lọc theo năm",
    labelEn: "Filter by Year",
    icon: SlidersHorizontal,
  },
];

function AnimatedNavbarLogo({ onPrefetch }: { onPrefetch?: () => void }) {
  return (
    <Link
      href="/"
      prefetch
      onMouseEnter={onPrefetch}
      onPointerDown={onPrefetch}
      onTouchStart={onPrefetch}
      aria-label="FlexPhim - Trang chủ"
      className="group flex select-none items-center space-x-2.5"
    >
      <div className="relative flex cursor-pointer items-center justify-center active:scale-95 transition-transform duration-200">
        <NextImage
          src="/flexphim-logo.svg"
          alt="FlexPhim Logo"
          width={38}
          height={38}
          priority
          unoptimized
          className="navbar-logo-reveal relative z-10 h-9 w-9 object-contain drop-shadow-[0_0_12px_rgba(168,85,247,0.4)] transition-transform duration-300 group-hover:scale-105 sm:h-9 sm:w-9"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/flexphim-logo.png";
          }}
        />
      </div>

      <div className="navbar-logo-reveal navbar-logo-reveal--wordmark relative overflow-hidden">
        <span
          className={cn(
            logoFont.className,
            "block text-[25px] font-bold uppercase tracking-[-0.01em] text-white select-none transition-all duration-300 group-hover:brightness-110 sm:text-[28px] leading-none",
          )}
        >
          Flex
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(168,85,247,0.45)]">
            Phim
          </span>
        </span>
      </div>
    </Link>
  );
}

function LanguageSwitcher() {
  const { lang, setLang } = useTranslation();

  return (
    <div className="flex items-center bg-white/[0.06] border border-white/10 p-0.5 rounded-full text-[10px] font-bold shrink-0">
      <button
        type="button"
        onClick={() => setLang("vi")}
        className={cn(
          "px-2.5 py-0.5 rounded-full transition-all cursor-pointer",
          lang === "vi"
            ? "bg-white text-black font-extrabold shadow-sm"
            : "text-neutral-400 hover:text-white",
        )}
        aria-label="Tiếng Việt"
        title="Tiếng Việt"
      >
        VI
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={cn(
          "px-2.5 py-0.5 rounded-full transition-all cursor-pointer",
          lang === "en"
            ? "bg-white text-black font-extrabold shadow-sm"
            : "text-neutral-400 hover:text-white",
        )}
        aria-label="English"
        title="English"
      >
        EN
      </button>
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const navigation = useReliableNavigation();
  const queryClient = useQueryClient();

  const isMoreActive =
    pathname.startsWith("/watch-party") ||
    pathname.startsWith("/actors") ||
    pathname.startsWith("/schedule") ||
    pathname.startsWith("/films/tv-shows") ||
    pathname.startsWith("/films/shows");

  const { user, logout } = useAuthStore();
  const openAuthModal = useAuthModalStore((state) => state.openModal);
  const { t, lang, setLang, isTransitioning } = useTranslation();
  const { theme, toggleTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const prefetchNav = useCallback(
    (href: string) => {
      try {
        navigation.prefetch(href);
      } catch {}
      if (href === "/") {
        void queryClient.prefetchQuery({
          queryKey: ["home-feed-v1", 24],
          queryFn: () =>
            movieApi.getHomeFeed(24).then((response) => response.data),
          staleTime: 5 * 60 * 1000,
          gcTime: 60 * 60 * 1000,
        });
      } else if (href === "/films") {
        void queryClient.prefetchQuery({
          queryKey: ["browse-films-v2", "", "all", "all", "", "", "", "all", "all", "modified.time", 1],
          queryFn: () =>
            movieApi.getLatest(1).then((r) => r?.data?.data || r?.data || { items: [] }),
          staleTime: 15 * 60 * 1000,
        });
      } else if (href === "/films/series") {
        void queryClient.prefetchQuery({
          queryKey: ["films-type", "series", 1],
          queryFn: () => movieApi.getSeries(1).then((r) => r.data),
          staleTime: 15 * 60 * 1000,
        });
        if (typeof window !== "undefined") {
          [
            "/Folder-Background/Korea/ha-canh-noi-anh/cloy-bg.webp",
            "/Folder-Background/Korea/ha-canh-noi-anh/cloy-couple-chars.webp",
            "/Folder-Background/Korea/ha-canh-noi-anh/cloy-logo-hd.webp",
          ].forEach((src) => {
            const img = new window.Image();
            img.src = src;
          });
        }
      } else if (href === "/films/single") {
        void queryClient.prefetchQuery({
          queryKey: ["films-type", "single", 1],
          queryFn: () => movieApi.getSingle(1).then((r) => r.data),
          staleTime: 15 * 60 * 1000,
        });
        if (typeof window !== "undefined") {
          [
            "/Folder-Background/Marvel/dr-doom/avengers-glowing-mist-bg.webp",
            "/Folder-Background/Marvel/dr-doom/doom-char-clean.webp",
            "/Folder-Background/Marvel/dr-doom/avengers-doomsday-logo.webp",
          ].forEach((src) => {
            const img = new window.Image();
            img.src = src;
          });
        }
      } else if (href === "/song-ngu") {
        void queryClient.prefetchQuery({
          queryKey: ["bilingual-films-catalog", "all", "", "", 1],
          queryFn: () =>
            fetchBilingualFilms({ format: "all", genre: "", search: "", page: 1 }),
          staleTime: 15 * 60 * 1000,
        });
        if (typeof window !== "undefined") {
          [
            "/Folder-Background/China/tuoc-cot/tuoc-cot-bg.webp",
            "/Folder-Background/China/tuoc-cot/tuoc-cot-couple-chars.webp",
            "/Folder-Background/China/tuoc-cot/tuoc-cot-logo.webp",
          ].forEach((src) => {
            const img = new window.Image();
            img.src = src;
          });
        }
      } else if (href === "/films/anime") {
        void queryClient.prefetchQuery({
          queryKey: ["films-type", "anime", 1],
          queryFn: () =>
            movieApi.getByCountryFast("nhat-ban", 1).then((r) => r.data),
          staleTime: 15 * 60 * 1000,
        });
        void queryClient.prefetchQuery({
          queryKey: ["anime-japan-page-2"],
          queryFn: () =>
            movieApi.getByCountryFast("nhat-ban", 2).then((r) => r.data),
          staleTime: 1000 * 60 * 60,
        });
      } else if (href === "/schedule") {
        void queryClient.prefetchQuery({
          queryKey: ["schedule-ongoing-series"],
          queryFn: () => movieApi.getSeries(1).then((r) => r.data),
          staleTime: 15 * 60 * 1000,
        });
        void queryClient.prefetchQuery({
          queryKey: ["schedule-latest-releases"],
          queryFn: () => movieApi.getLatest(1).then((r) => r.data),
          staleTime: 15 * 60 * 1000,
        });
      } else if (href.startsWith("/user") || href === "/user") {
        const targetUsername = href.startsWith("/user/")
          ? decodeURIComponent(href.replace("/user/", "").split("?")[0])
          : user?.username;
        if (targetUsername && targetUsername !== "me") {
          void queryClient.prefetchQuery({
            queryKey: ["user-profile", targetUsername],
            queryFn: async () => {
              try {
                const res = await api.get(`/users/${encodeURIComponent(targetUsername)}`);
                return res.data;
              } catch {
                return null;
              }
            },
            staleTime: 5 * 60 * 1000,
          });
        }
      }
    },
    [queryClient, navigation, user?.username],
  );

  // Delay background route prefetching until browser is fully idle (after initial paint & hydration)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefetchIdle = () => {
      try {
        navigation.prefetch("/");
        navigation.prefetch("/films");
        navigation.prefetch("/genres");
        if (user?.username) {
          navigation.prefetch(`/user/${encodeURIComponent(user.username)}`);
        }
      } catch {}
      NAV_LINKS.forEach((link) => {
        try {
          navigation.prefetch(link.href);
        } catch {}
      });

      // Idle pre-warm primary 3 nav tabs so clicks are instantaneous
      void queryClient.prefetchQuery({
        queryKey: ["films-type", "series", 1],
        queryFn: () => movieApi.getSeries(1).then((r) => r.data),
        staleTime: 15 * 60 * 1000,
      });
      void queryClient.prefetchQuery({
        queryKey: ["films-type", "single", 1],
        queryFn: () => movieApi.getSingle(1).then((r) => r.data),
        staleTime: 15 * 60 * 1000,
      });
      void queryClient.prefetchQuery({
        queryKey: ["bilingual-films-catalog", "all", "", "", 1],
        queryFn: () =>
          fetchBilingualFilms({ format: "all", genre: "", search: "", page: 1 }),
        staleTime: 15 * 60 * 1000,
      });
    };

    if ("requestIdleCallback" in window) {
      const handle = (window as any).requestIdleCallback(prefetchIdle, {
        timeout: 2000,
      });
      return () => (window as any).cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(prefetchIdle, 1200);
      return () => clearTimeout(timer);
    }
  }, [navigation, user?.username]);

  const [notifTab, setNotifTab] = useState<"system" | MovieNotificationChannel>(
    "system",
  );

  const [systemNotifications, setSystemNotifications] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
      time: string;
      tag?: string;
      read: boolean;
      link?: string;
      publishedAt?: string | null;
    }>
  >([
    {
      id: WELCOME_NOTIFICATION_ID,
      title: WELCOME_NOTIFICATION_TITLE,
      message:
        "Xem phim chuẩn Full HD siêu nét, tự động lọc sạch quảng cáo nhà cái từ gốc M3U8.",
      time: "Hôm nay",
      tag: "Hệ thống",
      read: false,
      publishedAt: null,
    },
  ]);

  const [seriesNotifications, setSeriesNotifications] = useState<
    NavbarMovieNotification[]
  >([]);
  const [singleNotifications, setSingleNotifications] = useState<
    NavbarMovieNotification[]
  >([]);

  const { data: seriesNotificationItems = EMPTY_NAVBAR_NOTIFICATION_ITEMS } = useQuery({
    queryKey: ["navbar-latest-notifications", "series"],
    queryFn: () => loadMovieNotificationFeed("series"),
    staleTime: 1000 * 60 * 2,
    enabled: notificationsOpen,
    refetchOnWindowFocus: false,
  });

  const { data: singleNotificationItems = EMPTY_NAVBAR_NOTIFICATION_ITEMS } = useQuery({
    queryKey: ["navbar-latest-notifications", "single"],
    queryFn: () => loadMovieNotificationFeed("single"),
    staleTime: 1000 * 60 * 2,
    enabled: notificationsOpen,
    refetchOnWindowFocus: false,
  });

  const { data: dynamicSystemNotifs } = useQuery({
    queryKey: ["navbar-system-notifications"],
    queryFn: () => systemNotificationApi.getBroadcasts(),
    staleTime: 1000 * 60 * 3,
    enabled: notificationsOpen,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const syncStoredReadState = () => {
      const stored = readNotificationReadState(window.localStorage);

      setSystemNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read: isNotificationRead(
            stored,
            "system",
            notification.id,
            notification.publishedAt,
          ),
        })),
      );
      setSeriesNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read: isNotificationRead(
            stored,
            "series",
            notification.id,
            notification.publishedAt,
          ),
        })),
      );
      setSingleNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read: isNotificationRead(
            stored,
            "single",
            notification.id,
            notification.publishedAt,
          ),
        })),
      );
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === NOTIFICATION_READ_STORAGE_KEY) {
        syncStoredReadState();
      }
    };

    syncStoredReadState();
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const mapItems = (
      rawItems: any[],
      channel: MovieNotificationChannel,
    ): NavbarMovieNotification[] => {
      const stored = readNotificationReadState(window.localStorage);
      return rawItems.map((item: any, idx: number) => {
        const slug = String(item.slug || item._id || item.id || `movie-${idx}`);
        const episode = item.episode_current || item.quality || "Mới cập nhật";
        const publishedAt =
          item?.modified?.time ||
          item?.updatedAt ||
          item?.createdAt ||
          item?.publishedAt ||
          null;
        const updateKey = publishedAt || episode;
        const id = `${channel}:${slug}:${updateKey}`;
        return {
          id,
          name: item.name || "Phim mới cập nhật",
          episode,
          poster: item.poster_url || item.thumb_url,
          message: `Phim "${item.name}" vừa cập nhật (${episode})`,
          time: "Vừa cập nhật",
          slug,
          publishedAt,
          read: isNotificationRead(stored, channel, id, publishedAt),
        };
      });
    };

    setSeriesNotifications(mapItems(seriesNotificationItems, "series"));
    setSingleNotifications(mapItems(singleNotificationItems, "single"));
  }, [seriesNotificationItems, singleNotificationItems]);

  useEffect(() => {
    if (dynamicSystemNotifs && dynamicSystemNotifs.length > 0) {
      const stored = readNotificationReadState(window.localStorage);
      const items = dynamicSystemNotifs
        .filter((item) => item.title.trim() === WELCOME_NOTIFICATION_TITLE)
        .slice(0, 1)
        .map((item) => {
          let timeLabel = "Hôm nay";
          if (item.createdAt) {
            const diffMs = Date.now() - new Date(item.createdAt).getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            if (diffHours < 1) timeLabel = "Vừa xong";
            else if (diffHours < 24) timeLabel = `${diffHours} giờ trước`;
            else timeLabel = `${Math.floor(diffHours / 24)} ngày trước`;
          }
          return {
            id: WELCOME_NOTIFICATION_ID,
            title: item.title,
            message: item.message,
            time: timeLabel,
            tag: item.tag || "Hệ thống",
            link: item.link || undefined,
            publishedAt: item.createdAt,
            read: isNotificationRead(
              stored,
              "system",
              WELCOME_NOTIFICATION_ID,
              item.createdAt,
            ),
          };
        });
      if (items.length > 0) setSystemNotifications(items);
    }
  }, [dynamicSystemNotifs]);

  const { newMovieNotifications, commentNotifications } = useSettingsStore();

  const unreadSystem = systemNotifications.filter((n) => !n.read).length;
  const unreadSeries = seriesNotifications.filter((n) => !n.read).length;
  const unreadSingle = singleNotifications.filter((n) => !n.read).length;
  const unreadMovies = unreadSeries + unreadSingle;
  const unreadCount = unreadSystem + (newMovieNotifications ? unreadMovies : 0);

  const markAllRead = () => {
    setSystemNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true })),
    );
    setSeriesNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true })),
    );
    setSingleNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true })),
    );
    const now = Date.now();
    const channels = [
      ["system", systemNotifications],
      ["series", seriesNotifications],
      ["single", singleNotifications],
    ] as const;
    channels.forEach(([channel, notifications]) => {
      persistNotificationReadIds(
        window.localStorage,
        channel,
        notifications.map((notification) => notification.id),
      );
      persistNotificationsReadThrough(window.localStorage, channel, now);
    });
  };

  const markSystemAsRead = (id: string, link?: string) => {
    setSystemNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
    persistNotificationReadIds(window.localStorage, "system", [id]);
    if (link) {
      if (link.startsWith("http://") || link.startsWith("https://")) {
        window.open(link, "_blank", "noopener,noreferrer");
      } else {
        navigation.push(link);
      }
    }
  };

  const markMovieAsRead = (
    channel: MovieNotificationChannel,
    id: string,
    slug?: string,
  ) => {
    const setNotifications =
      channel === "series" ? setSeriesNotifications : setSingleNotifications;
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
    persistNotificationReadIds(window.localStorage, channel, [id]);
    if (slug) {
      navigation.push(`/film/${slug}`);
    }
  };

  useEffect(() => {
    let frameId: number | null = null;
    let lastScrolled = window.scrollY > 20;
    setScrolled(lastScrolled);

    const onScroll = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        const nextScrolled = window.scrollY > 20;
        if (nextScrolled !== lastScrolled) {
          lastScrolled = nextScrolled;
          setScrolled(nextScrolled);
        }
        frameId = null;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSpotlightOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header
        aria-label="Thanh điều hướng chính"
        data-site-header="true"
        data-scrolled={scrolled ? "true" : "false"}
        className="fixed top-0 left-0 right-0 z-50 h-[68px] sm:h-[72px] md:h-16 flex items-center [font-family:var(--font-manrope)] transform-gpu pt-[env(safe-area-inset-top,0px)]"
      >
        {/* Hardware-accelerated frosted glass background plate */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 border-b backdrop-blur-xl backdrop-saturate-150 transition-opacity duration-250",
            scrolled
              ? "border-white/[0.08] bg-[#0b0d12]/85 shadow-[0_12px_34px_rgba(0,0,0,0.25)] opacity-100"
              : "border-transparent bg-transparent shadow-none opacity-0",
          )}
        />
        <div className="w-full px-4 md:px-8 flex items-center justify-between gap-3 md:gap-6 relative">
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              className="-ml-1 flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white active:scale-90 touch-manipulation cursor-pointer select-none xl:hidden"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Mở menu"
            >
              <Menu size={23} className="stroke-[2.2]" />
            </button>
            <AnimatedNavbarLogo onPrefetch={() => prefetchNav("/")} />
          </div>

          <nav aria-label="Điều hướng chính" className="absolute left-1/2 z-10 hidden -translate-x-1/2 items-center justify-center whitespace-nowrap text-sm font-semibold text-neutral-200 xl:flex xl:space-x-0.5 min-[1700px]:space-x-2">
            <div className="relative group py-5">
              <button aria-label={t("nav.genres")} aria-haspopup="true" className="flex items-center space-x-1 whitespace-nowrap px-2.5 py-1.5 text-sm font-semibold text-neutral-300 transition-colors hover:text-white focus:outline-none min-[1700px]:px-3">
                <span>{t("nav.genres")}</span>
                <ChevronDown
                  size={14}
                  className="transition-transform duration-200 group-hover:rotate-180 text-neutral-400"
                />
              </button>
              <div className="absolute top-[85%] left-1/2 -translate-x-1/2 mt-0 w-[520px] p-4 bg-[#090c15]/65 backdrop-blur-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.6)] rounded-2xl ring-1 ring-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 grid grid-cols-3 gap-y-1.5 gap-x-2 z-50">
                {GENRES_LIST.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/genre/${item.slug}`}
                    prefetch={false}
                    onMouseEnter={() => prefetchNav(`/genre/${item.slug}`)}
                    onPointerDown={() => prefetchNav(`/genre/${item.slug}`)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/15 hover:backdrop-blur-md hover:translate-x-1 transition-all duration-200 block truncate"
                  >
                    {t(`genres_list.${item.slug}`, item.label)}
                  </Link>
                ))}
              </div>
            </div>

            <div className="relative group py-5">
              <button aria-label={t("nav.country")} aria-haspopup="true" className="flex items-center space-x-1 whitespace-nowrap px-2.5 py-1.5 text-sm font-semibold text-neutral-300 transition-colors hover:text-white focus:outline-none min-[1700px]:px-3">
                <span>{t("nav.country")}</span>
                <ChevronDown
                  size={14}
                  className="transition-transform duration-200 group-hover:rotate-180 text-neutral-400"
                />
              </button>
              <div className="absolute top-[85%] left-1/2 -translate-x-1/2 mt-0 w-[660px] p-4 bg-[#090c15]/85 backdrop-blur-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.6)] rounded-2xl ring-1 ring-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 grid grid-cols-4 gap-y-1.5 gap-x-2 z-50 max-h-[75vh] overflow-y-auto scrollbar-thin">
                {COUNTRIES_LIST.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/country/${item.slug}`}
                    prefetch={false}
                    onMouseEnter={() => prefetchNav(`/country/${item.slug}`)}
                    onPointerDown={() => prefetchNav(`/country/${item.slug}`)}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs font-semibold hover:translate-x-0.5 transition-all duration-200 flex items-center gap-2.5 truncate group/flag",
                      item.isHot
                        ? "text-amber-100/95 bg-amber-500/[0.08] border border-amber-500/25 hover:bg-amber-500/20 hover:border-amber-400/50 hover:text-white"
                        : "text-neutral-300 hover:text-white hover:bg-white/15 hover:backdrop-blur-md",
                    )}
                  >
                    <CountryFlagImage
                      code={item.code}
                      label={t(`countries_list.${item.slug}`, item.label)}
                      className="group-hover/flag:scale-110 transition-transform"
                    />
                    <span className="truncate flex-1">
                      {t(`countries_list.${item.slug}`, item.label)}
                    </span>
                    {item.isHot && (
                      <span
                        title={t("nav.most_viewed_country", "Nhiều người xem nhất")}
                        className="inline-flex items-center shrink-0 ml-auto"
                      >
                        <Flame
                          size={13}
                          className="text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.65)] group-hover/flag:scale-110 transition-transform"
                        />
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* Thêm Dropdown Menu */}
            <div className="relative group py-5">
              <button
                aria-label={t("nav.more", "Thêm")}
                aria-haspopup="true"
                className={cn(
                  "relative flex items-center space-x-1 whitespace-nowrap px-2.5 py-1.5 text-sm font-semibold transition-all duration-150 select-none min-[1700px]:px-3.5 rounded-full",
                  isMoreActive
                    ? "text-white font-bold"
                    : "text-neutral-300 hover:text-white hover:bg-white/[0.05]",
                )}
              >
                {isMoreActive && (
                  <div className="absolute inset-0 -z-10 rounded-full border border-white/20 bg-white/10 shadow-sm backdrop-blur-md motion-safe:animate-[route-in_150ms_ease-out]" />
                )}
                <span>{t("nav.more", "Thêm")}</span>
                <ChevronDown
                  size={14}
                  className="transition-transform duration-200 group-hover:rotate-180 text-neutral-400"
                />
              </button>

              <div className="absolute top-[85%] left-1/2 -translate-x-1/2 mt-0 w-[190px] p-1.5 bg-[#12141c]/95 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-2xl ring-1 ring-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 flex flex-col space-y-0.5">
                {MORE_NAV_ITEMS.map((item) => {
                  const isItemActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      onMouseEnter={() => prefetchNav(item.href)}
                      onPointerDown={() => prefetchNav(item.href)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 flex items-center gap-2.5 truncate",
                        isItemActive
                          ? "bg-white/15 text-white font-semibold"
                          : "text-neutral-300 hover:text-white hover:bg-white/10 hover:translate-x-0.5",
                      )}
                    >
                      {Icon && (
                        <Icon
                          size={15}
                          className={cn(
                            "shrink-0",
                            isItemActive ? "text-white" : "text-neutral-400",
                          )}
                        />
                      )}
                      <span className="truncate">
                        {item.key
                          ? t(item.key, lang === "en" ? item.labelEn : item.label)
                          : lang === "en"
                            ? item.labelEn
                            : item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch
                  onMouseEnter={() => prefetchNav(link.href)}
                  onTouchStart={() => prefetchNav(link.href)}
                  onPointerDown={() => prefetchNav(link.href)}
                  className={cn(
                    "relative whitespace-nowrap rounded-full px-2.5 py-1.5 text-sm font-semibold transition-all duration-150 select-none min-[1700px]:px-3.5",
                    isActive
                      ? "text-white font-bold"
                      : "text-neutral-300 hover:text-white hover:bg-white/[0.05]",
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 -z-10 rounded-full border border-white/20 bg-white/10 shadow-sm backdrop-blur-md motion-safe:animate-[route-in_150ms_ease-out]" />
                  )}
                  <span>
                    {link.key ? t(link.key, link.label || "") : link.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center justify-end space-x-1.5 sm:space-x-3">
            <button
              id="navbar-search-btn"
              onClick={() => setIsSpotlightOpen(true)}
              aria-label={t("nav.searchBtn")}
              title={`${t("nav.searchBtn")} (Ctrl + K)`}
              className={`${cardFont.className} group hidden min-w-[200px] cursor-pointer items-center gap-2.5 rounded-full border border-white/10 bg-[#111317]/90 py-2 pl-3.5 pr-3 text-xs transition-colors duration-200 hover:border-white/25 hover:bg-[#181b20] sm:flex xl:w-[180px] xl:min-w-[180px] min-[1700px]:w-auto min-[1700px]:min-w-[240px]`}
            >
              <Search
                size={14}
                className="text-neutral-400 group-hover:text-white transition-colors flex-shrink-0"
              />
              <span className="flex-1 text-left font-medium text-neutral-400 group-hover:text-neutral-200 transition-colors truncate">
                {t("nav.searchPlaceholder")}
              </span>
              <kbd className="flex items-center gap-0.5 bg-white/[0.06] border border-white/10 rounded-md px-1.5 py-0.5 text-[10px] font-mono text-neutral-500 group-hover:text-neutral-400 flex-shrink-0">
                <span className="text-[11px]">⌘</span>K
              </kbd>
            </button>
            <button
              onClick={() => setIsSpotlightOpen(true)}
              aria-label={t("nav.searchBtn")}
              className="flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-neutral-400 hover:bg-white/[0.06] hover:text-white transition-colors active:scale-90 touch-manipulation cursor-pointer select-none sm:hidden"
            >
              <Search size={21} />
            </button>

            <div className="flex items-center space-x-1 sm:space-x-2">
              <DropdownMenu modal={false} onOpenChange={setNotificationsOpen}>
                <DropdownMenuTrigger
                  aria-label={lang === "en" ? "Notifications" : "Thông báo"}
                  className="relative flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-neutral-300 hover:bg-white/[0.06] hover:text-white transition-colors focus:outline-none active:scale-90 touch-manipulation cursor-pointer select-none"
                >
                  <Bell size={21} className="stroke-[2.2]" />
                  {unreadCount > 0 && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 shadow-sm" />
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  alignOffset={-12}
                  sideOffset={8}
                  collisionPadding={{ right: 12, left: 12 }}
                  onWheel={(e) => e.stopPropagation()}
                  className={`${cardFont.className} pointer-events-auto z-50 w-[calc(100vw-24px)] max-w-[380px] sm:w-96 rounded-2xl border border-white/10 bg-[#121418] p-4 text-xs text-neutral-300 shadow-[0_20px_50px_rgba(0,0,0,0.6)]`}
                >
                  {/* Top Header */}
                  <div className="flex items-center justify-between px-1 mb-3">
                    <span className="font-bold text-white text-sm tracking-tight">
                      {lang === "en" ? "Notifications" : "Thông báo"}
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[11px] font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer select-none"
                      >
                        {lang === "en" ? "Mark all read" : "Đã đọc tất cả"}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/[0.08] bg-black/50 p-1 mb-3.5">
                    <button
                      type="button"
                      onClick={() => setNotifTab("system")}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none",
                        notifTab === "system"
                          ? "bg-neutral-800 text-white font-bold shadow-sm"
                          : "text-neutral-400 hover:text-white",
                      )}
                    >
                      <span>Hệ thống</span>
                      {unreadSystem > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                      )}
                    </button>

                    {(
                      [
                        ["series", "Phim Bộ", unreadSeries],
                        ["single", "Phim Lẻ", unreadSingle],
                      ] as const
                    ).map(([channel, label, unread]) => (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => setNotifTab(channel)}
                        className={cn(
                          "flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none",
                          notifTab === channel
                            ? "bg-neutral-800 text-white font-bold shadow-sm"
                            : "text-neutral-400 hover:text-white",
                        )}
                      >
                        <span>{label}</span>
                        {unread > 0 && (
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                              notifTab === channel
                                ? "bg-neutral-700 text-white"
                                : "bg-neutral-800 text-neutral-400",
                            )}
                          >
                            {unread}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Notification List Body */}
                  <div
                    onWheel={(e) => e.stopPropagation()}
                    className="max-h-[60vh] sm:max-h-80 overflow-y-auto overscroll-contain touch-pan-y space-y-2 pr-1 scrollbar-thin pointer-events-auto"
                  >
                    {notifTab === "system" ? (
                      systemNotifications.length === 0 ? (
                        <div className="p-8 text-center text-xs text-neutral-500">
                          Chưa có thông báo hệ thống nào
                        </div>
                      ) : (
                        systemNotifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => markSystemAsRead(n.id, n.link)}
                            className={cn(
                              "p-3 rounded-xl cursor-pointer transition-all border block",
                              n.read
                                ? "bg-[#14161a]/60 border-white/[0.04] opacity-60 hover:opacity-100 hover:bg-[#181b20]"
                                : "bg-[#181a20] border-white/[0.08] hover:bg-[#20232b] hover:border-white/15 shadow-sm",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {!n.read && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                                )}
                                <p className="text-white text-xs font-bold leading-snug truncate">
                                  {n.title}
                                </p>
                              </div>
                              {n.tag && (
                                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-medium border border-white/[0.06] shrink-0">
                                  {n.tag}
                                </span>
                              )}
                            </div>
                            <p className="text-neutral-400 text-[11.5px] leading-relaxed">
                              {n.message}
                            </p>
                            <span className="text-[10px] text-neutral-500 font-medium block mt-1.5">
                              {n.time}
                            </span>
                          </div>
                        ))
                      )
                    ) : (notifTab === "series"
                        ? seriesNotifications
                        : singleNotifications
                      ).length === 0 ? (
                      <div className="p-8 text-center text-xs text-neutral-500">
                        {lang === "en"
                          ? "No new movie updates"
                          : `Chưa có ${notifTab === "series" ? "phim bộ" : "phim lẻ"} mới cập nhật`}
                      </div>
                    ) : (
                      (notifTab === "series"
                        ? seriesNotifications
                        : singleNotifications
                      ).map((n) => (
                        <div
                          key={n.id}
                          onClick={() =>
                            markMovieAsRead(notifTab, n.id, n.slug)
                          }
                          className={cn(
                            "p-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-3 border",
                            n.read
                              ? "bg-[#14161a]/60 border-white/[0.04] opacity-60 hover:opacity-100 hover:bg-[#181b20]"
                              : "bg-[#181a20] border-white/[0.08] hover:bg-[#20232b] hover:border-white/15 shadow-sm",
                          )}
                        >
                          <div className="w-9 h-12 rounded-lg bg-neutral-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden relative shadow-sm">
                            {n.poster ? (
                              <img
                                src={resolveImageUrl(n.poster) || n.poster}
                                alt={n.name || "Movie"}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full bg-neutral-800" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-bold leading-snug truncate">
                              {n.name || n.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 font-semibold border border-white/[0.08]">
                                {n.episode || "Tập mới"}
                              </span>
                              <span className="text-[10px] text-neutral-500 font-medium">
                                {n.time}
                              </span>
                            </div>
                          </div>
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {user ? (() => {
                const navFrameConfig = getAvatarFrameConfig(user.avatarFrameColor);
                const navNameProps = getNameColorProps(user.nameColor);
                const isMascotAvatar = user.avatarUrl === "/avatars/admin-mascot-riso.png";
                const isTargetAdmin =
                  user.email?.toLowerCase() === "huywashere@gmail.com" ||
                  user.username?.toLowerCase() === "huywashere";

                const renderNavAvatar = (size = "w-8 h-8", imgSize = 64) => {
                  const avatarContent = isMascotAvatar ? (
                    <InteractiveAdminMascot size={32} className="w-full h-full" />
                  ) : user.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName || user.username}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=8b5cf6&color=ffffff&size=${imgSize}`;
                      }}
                    />
                  ) : isTargetAdmin ? (
                    <InteractiveAdminMascot size={32} className="w-full h-full" />
                  ) : (
                    <div className="w-full h-full bg-violet-500/20 text-violet-300 font-bold text-xs flex items-center justify-center">
                      {(user.displayName || user.username || "U").slice(0, 2).toUpperCase()}
                    </div>
                  );

                  if (navFrameConfig.isRainbowWrap) {
                    return (
                      <div className={cn("relative shrink-0 anim-frame-rainbow-wrap", size)}>
                        <div className="w-full h-full rounded-full overflow-hidden bg-neutral-900">
                          {avatarContent}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      className={cn(
                        "rounded-full overflow-hidden shrink-0 transition-all shadow-md bg-neutral-900",
                        size,
                        navFrameConfig.className || "border border-white/20 group-hover:border-violet-400",
                      )}
                      style={navFrameConfig.style}
                    >
                      {avatarContent}
                    </div>
                  );
                };

                return (
                  <div className="hidden lg:block">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger
                        aria-label={`Tài khoản của ${user.displayName || user.username}`}
                        className="flex items-center space-x-1.5 focus:outline-none cursor-pointer group"
                        onMouseEnter={() => {
                          if (user?.username) prefetchNav(`/user/${encodeURIComponent(user.username)}`);
                        }}
                        onPointerDown={() => {
                          if (user?.username) prefetchNav(`/user/${encodeURIComponent(user.username)}`);
                        }}
                      >
                        {renderNavAvatar("w-8 h-8", 64)}
                        <ChevronDown
                          size={13}
                          className="text-neutral-400 group-hover:text-white transition-colors"
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        alignOffset={-32}
                        sideOffset={10}
                        collisionPadding={{ right: 32 }}
                        className={cn(
                          "w-60 -translate-x-4 sm:-translate-x-6 p-1.5 bg-[#090c15]/85 backdrop-blur-3xl border border-white/15 text-neutral-200 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 divide-y divide-white/10 ring-1 ring-white/10",
                          cardFont.className,
                        )}
                      >
                        <div className="p-2 flex items-center space-x-2.5 pb-2">
                          {renderNavAvatar("w-9 h-9", 80)}
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "font-bold text-xs truncate transition-all",
                                navNameProps.className || "text-white",
                              )}
                              style={navNameProps.style}
                            >
                              {user.displayName || user.username}
                            </p>
                            <p className="text-[11px] text-neutral-400 truncate">
                              @{user.username}
                            </p>
                          </div>
                        </div>

                      <div className="py-1 space-y-0.5">
                        <Link
                          href={user.username ? `/user/${encodeURIComponent(user.username)}` : "/user"}
                          prefetch={false}
                          onMouseEnter={() => {
                            prefetchNav(user.username ? `/user/${encodeURIComponent(user.username)}` : "/user");
                          }}
                          onPointerDown={() => {
                            prefetchNav(user.username ? `/user/${encodeURIComponent(user.username)}` : "/user");
                          }}
                          className="hover:bg-white/12 hover:backdrop-blur-md hover:text-white transition-all rounded-lg cursor-pointer flex items-center py-1.5 px-2.5 text-xs font-medium"
                        >
                          <User
                            size={14}
                            className="mr-2 text-neutral-300 shrink-0"
                          />
                          <span>{t("nav.profile")}</span>
                        </Link>
                        <Link
                          href="/watchlist"
                          prefetch={false}
                          onMouseEnter={() => prefetchNav("/watchlist")}
                          onPointerDown={() => prefetchNav("/watchlist")}
                          className="hover:bg-white/12 hover:backdrop-blur-md hover:text-white transition-all rounded-lg cursor-pointer flex items-center py-1.5 px-2.5 text-xs font-medium"
                        >
                          <Bookmark
                            size={14}
                            className="mr-2 text-neutral-300 shrink-0"
                          />
                          <span>{t("nav.watchlist")}</span>
                        </Link>
                        <Link
                          href="/history"
                          prefetch={false}
                          onMouseEnter={() => prefetchNav("/history")}
                          onPointerDown={() => prefetchNav("/history")}
                          className="hover:bg-white/12 hover:backdrop-blur-md hover:text-white transition-all rounded-lg cursor-pointer flex items-center py-1.5 px-2.5 text-xs font-medium"
                        >
                          <History
                            size={14}
                            className="mr-2 text-neutral-300 shrink-0"
                          />
                          <span>{t("nav.history")}</span>
                        </Link>
                        <Link
                          href="/settings"
                          prefetch={false}
                          onMouseEnter={() => prefetchNav("/settings")}
                          onPointerDown={() => prefetchNav("/settings")}
                          className="hover:bg-white/12 hover:backdrop-blur-md hover:text-white transition-all rounded-lg cursor-pointer flex items-center py-1.5 px-2.5 text-xs font-medium"
                        >
                          <Settings
                            size={14}
                            className="mr-2 text-neutral-300 shrink-0"
                          />
                          <span>Cài đặt</span>
                        </Link>
                      </div>

                      {/* Section 2: Preferences & Settings */}
                      <div className="py-1 space-y-0.5">
                        <DropdownMenuItem
                          onClick={toggleTheme}
                          className="hover:bg-white/12 hover:backdrop-blur-md hover:text-white transition-all rounded-lg cursor-pointer flex items-center justify-between py-1.5 px-2.5 text-xs font-medium"
                        >
                          <div className="flex items-center">
                            {mounted && theme === "light" ? (
                              <Moon
                                size={14}
                                className="mr-2 text-neutral-400 shrink-0"
                              />
                            ) : (
                              <Sun
                                size={14}
                                className="mr-2 text-neutral-400 shrink-0"
                              />
                            )}
                            <span>
                              Giao diện: {theme === "light" ? "Sáng" : "Tối"}
                            </span>
                          </div>
                          <ChevronRight
                            size={12}
                            className="text-neutral-500 shrink-0"
                          />
                        </DropdownMenuItem>

                        {/* Language Switcher Modal Item */}
                        <DropdownMenuItem
                          onClick={() => setLang(lang === "vi" ? "en" : "vi")}
                          className="hover:bg-white/12 hover:backdrop-blur-md hover:text-white transition-all rounded-lg cursor-pointer flex items-center justify-between py-1.5 px-2.5 text-xs font-medium"
                        >
                          <div className="flex items-center">
                            <Languages
                              size={14}
                              className="mr-2 text-neutral-400 shrink-0"
                            />
                            <span>
                              Ngôn ngữ:{" "}
                              {lang === "vi"
                                ? "Tiếng Việt"
                                : lang === "en"
                                  ? "English"
                                  : lang.toUpperCase()}
                            </span>
                          </div>
                          <ChevronRight
                            size={12}
                            className="text-neutral-500 shrink-0"
                          />
                        </DropdownMenuItem>
                      </div>

                      {/* Section 3: Logout Session */}
                      <div className="pt-1">
                        <DropdownMenuItem
                          onClick={() => {
                            logout();
                            navigation.push("/");
                          }}
                          className="hover:bg-red-500/15 text-red-400 hover:text-red-300 rounded-lg cursor-pointer flex items-center py-1.5 px-2.5 text-xs font-semibold"
                        >
                          <LogOut
                            size={14}
                            className="mr-2 text-red-400 shrink-0"
                          />
                          <span>Đăng xuất</span>
                        </DropdownMenuItem>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })() : (
                /* Desktop Guest Login User Icon Button (Opens Unified Auth Modal) */
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  aria-label="Đăng nhập"
                  title="Đăng nhập"
                  className="hidden lg:flex items-center justify-center p-1.5 text-neutral-300 hover:text-white transition-colors cursor-pointer active:scale-95"
                >
                  <User size={20} className="stroke-[2.2]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modern High-End Mobile Drawer */}
      <MobileSidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* ── Spotlight Search Modal — single unified search UI ── */}
      {isSpotlightOpen && (
        <SpotlightSearchModal
          isOpen={isSpotlightOpen}
          onClose={() => setIsSpotlightOpen(false)}
          suggestions={[]}
        />
      )}
    </>
  );
}
