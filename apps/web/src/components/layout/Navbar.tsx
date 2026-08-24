"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import NextImage from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useTranslation } from "@/store/langStore";
import { useThemeStore } from "@/store/themeStore";
import { movieApi } from "@/lib/api";
import { resolveImageUrl } from "@/components/film/FilmCard";
import { cn } from "@/lib/utils";
import { cardFont } from "@/lib/fonts";
import {
  NOTIFICATION_READ_STORAGE_KEY,
  persistNotificationReadIds,
  readNotificationReadState,
} from "@/lib/notification-read-state";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const MobileSidebar = dynamic(
  () => import("./MobileSidebar").then((mod) => mod.MobileSidebar),
  { ssr: false },
);

// Lazy-load SpotlightSearchModal to avoid server-side issues
const SpotlightSearchModal = dynamic(
  () =>
    import("@/components/search/SpotlightSearchModal").then(
      (mod) => mod.SpotlightSearchModal,
    ),
  { ssr: false },
);

const NAV_LINKS = [
  { href: "/films/series", key: "nav.series" },
  { href: "/films/single", key: "nav.single" },
  { href: "/films/anime", key: "nav.anime" },
  { href: "/actors", key: "nav.actors", label: "Diễn Viên" },
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

export const COUNTRIES_LIST = [
  { label: "Âu Mỹ", slug: "au-my", code: "us" },
  { label: "Hàn Quốc", slug: "han-quoc", code: "kr" },
  { label: "Trung Quốc", slug: "trung-quoc", code: "cn" },
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

const COUNTRY_EMOJIS: Record<string, string> = {
  gb: "🇬🇧",
  pl: "🇵🇱",
  br: "🇧🇷",
  pt: "🇵🇹",
  ca: "🇨🇦",
  za: "🇿🇦",
  nl: "🇳🇱",
  kr: "🇰🇷",
  hk: "🇭🇰",
  id: "🇮🇩",
  my: "🇲🇾",
  mx: "🇲🇽",
  no: "🇳🇴",
  ru: "🇷🇺",
  jp: "🇯🇵",
  ph: "🇵🇭",
  fr: "🇫🇷",
  un: "🌐",
  th: "🇹🇭",
  tr: "🇹🇷",
  ch: "🇨🇭",
  se: "🇸🇪",
  cn: "🇨🇳",
  es: "🇪🇸",
  ae: "🇦🇪",
  ua: "🇺🇦",
  vn: "🇻🇳",
  us: "🇺🇸",
  au: "🇦🇺",
  it: "🇮🇹",
  dk: "🇩🇰",
  tw: "🇹🇼",
  de: "🇩🇪",
  sa: "🇸🇦",
  in: "🇮🇳",
};

export function CountryFlagImage({
  code,
  label,
  className = "w-5 h-3.5 object-cover rounded-[3px] border border-white/20 shrink-0 shadow-sm",
}: {
  code: string;
  label: string;
  className?: string;
}) {
  const flagCode = code?.toLowerCase();
  const candidates = useMemo(() => {
    if (!flagCode || flagCode === "un") return [];
    return [
      `https://flagcdn.com/w40/${flagCode}.png`,
      `https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${flagCode}.svg`,
      `https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3/${flagCode}.svg`,
    ];
  }, [flagCode]);

  const [srcIndex, setSrcIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(false);

  useEffect(() => {
    setSrcIndex(0);
    setAllFailed(false);
  }, [flagCode]);

  if (!flagCode || flagCode === "un" || allFailed || candidates.length === 0) {
    const emoji = flagCode ? COUNTRY_EMOJIS[flagCode] || "🌐" : "🌐";
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center text-sm leading-none shrink-0 select-none",
          className,
        )}
        role="img"
        aria-label={label}
      >
        {emoji}
      </span>
    );
  }

  const currentSrc = candidates[srcIndex];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={`${flagCode}-${srcIndex}`}
      src={currentSrc}
      alt={label}
      width={20}
      height={14}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      className={cn(
        "w-5 h-3.5 object-cover rounded-[3px] border border-white/20 shrink-0 shadow-sm",
        className,
      )}
      onError={() => {
        if (srcIndex < candidates.length - 1) {
          setSrcIndex((prev) => prev + 1);
        } else {
          setAllFailed(true);
        }
      }}
      loading="lazy"
      decoding="async"
    />
  );
}

const LISTS_CATALOG = [
  {
    label: "Phim Mới",
    labelEn: "New Releases",
    href: "/search?sort=modified.time%20desc",
  },
  { label: "Phim Bộ", labelEn: "TV Series", href: "/films/series" },
  { label: "Phim Lẻ", labelEn: "Feature Films", href: "/films/single" },
  { label: "Hoạt Hình", labelEn: "Anime / Animation", href: "/films/anime" },
  {
    label: "Phim Vietsub",
    labelEn: "Subtitled Movies",
    href: "/search?q=vietsub",
  },
  {
    label: "Phim Thuyết Minh",
    labelEn: "Dubbed Movies",
    href: "/search?q=thuyet%20minh",
  },
  {
    label: "Phim Lồng Tiếng",
    labelEn: "Voiceover Movies",
    href: "/search?q=long%20tieng",
  },
  {
    label: "Phim Bộ Đang Chiếu",
    labelEn: "Ongoing Series",
    href: "/search?status=ongoing",
  },
  {
    label: "Phim Bộ Đã Hoàn Thành",
    labelEn: "Completed Series",
    href: "/search?status=completed",
  },
  { label: "Subteam", labelEn: "Subteam Releases", href: "/search?q=subteam" },
  {
    label: "Phim Chiếu Rạp",
    labelEn: "Theatrical Releases",
    href: "/search?q=chieu%20rap",
  },
];

function AnimatedNavbarLogo() {
  return (
    <Link
      href="/"
      aria-label="NetPhim - Trang chủ"
      className="group flex select-none items-center space-x-2.5"
    >
      <div className="relative flex cursor-pointer items-center justify-center active:scale-95">
        <NextImage
          src="/cinephim-logo.png"
          alt="NetPhim Logo"
          width={36}
          height={36}
          priority
          className="navbar-logo-reveal relative z-10 h-8 w-8 object-contain sm:h-9 sm:w-9"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/logo.png";
          }}
        />
      </div>

      <div className="navbar-logo-reveal navbar-logo-reveal--wordmark relative overflow-hidden">
        <span className="block font-sans text-xl font-black tracking-tight text-white transition-opacity duration-200 group-hover:opacity-80 sm:text-2xl">
          Net<span className="text-violet-400">Phim</span>
        </span>
      </div>
    </Link>
  );
}

function LanguageSwitcher() {
  const { lang, setLang } = useTranslation();

  return (
    <div className="flex items-center bg-white/[0.06] border border-white/10 p-0.5 rounded-full text-[11px] font-bold shrink-0">
      <button
        type="button"
        onClick={() => setLang("vi")}
        className={cn(
          "flex items-center gap-1 px-2 py-0.5 rounded-full transition-all cursor-pointer",
          lang === "vi"
            ? "bg-white text-black font-extrabold shadow-sm"
            : "text-neutral-400 hover:text-white",
        )}
        aria-label="Tiếng Việt"
        title="Tiếng Việt"
      >
        <span>🇻🇳</span>
        <span className="hidden sm:inline text-[10px]">VI</span>
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={cn(
          "flex items-center gap-1 px-2 py-0.5 rounded-full transition-all cursor-pointer",
          lang === "en"
            ? "bg-white text-black font-extrabold shadow-sm"
            : "text-neutral-400 hover:text-white",
        )}
        aria-label="English"
        title="English"
      >
        <span>🇬🇧</span>
        <span className="hidden sm:inline text-[10px]">EN</span>
      </button>
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

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
      router.prefetch(href);
      if (href === "/films/series") {
        void queryClient.prefetchQuery({
          queryKey: ["films-type", "series", 1],
          queryFn: () => movieApi.getSeries(1).then((r) => r.data),
          staleTime: 15 * 60 * 1000,
        });
      } else if (href === "/films/single") {
        void queryClient.prefetchQuery({
          queryKey: ["films-type", "single", 1],
          queryFn: () => movieApi.getSingle(1).then((r) => r.data),
          staleTime: 15 * 60 * 1000,
        });
      } else if (href === "/films/anime") {
        void queryClient.prefetchQuery({
          queryKey: ["films-type", "anime", 1],
          queryFn: () => movieApi.getAnime(1).then((r) => r.data),
          staleTime: 15 * 60 * 1000,
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
      }
    },
    [queryClient, router],
  );

  const [notifTab, setNotifTab] = useState<"system" | "movies">("system");

  const [systemNotifications, setSystemNotifications] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
      time: string;
      tag?: string;
      read: boolean;
      link?: string;
    }>
  >([
    {
      id: "sys-1",
      title: "Chào mừng bạn đến với NetPhim",
      message:
        "Xem phim chuẩn 4K siêu nét, tự động lọc sạch quảng cáo nhà cái từ gốc M3U8.",
      time: "Hôm nay",
      tag: "Hệ thống",
      read: false,
    },
    {
      id: "sys-2",
      title: "Chế độ Rạp Phim Mở Rộng",
      message:
        "Tính năng mở rộng khung hình cực đại (bấm nút 'Rạp phim' hoặc phím tắt 'T').",
      time: "Mới",
      tag: "Tính năng",
      read: false,
    },
    {
      id: "sys-3",
      title: "Phòng Xem Chung (Watch Party)",
      message:
        "Tạo phòng xem cùng bạn bè, đồng bộ tua phim và trò chuyện trực tiếp mượt mà.",
      time: "Cộng đồng",
      tag: "Watch Party",
      read: false,
    },
    {
      id: "sys-4",
      title: "Bộ Lọc Luồng Tự Động",
      message:
        "Hệ thống tự động định tuyến máy chủ m3u8 tối ưu nhất cho từng tập phim.",
      time: "Tối ưu",
      tag: "Hệ thống",
      read: false,
    },
  ]);

  const [movieNotifications, setMovieNotifications] = useState<
    Array<{
      id: string | number;
      name?: string;
      episode?: string;
      poster?: string;
      message: string;
      time: string;
      slug?: string;
      read: boolean;
    }>
  >([]);

  const { data: latestNotificationRes } = useQuery({
    queryKey: ["navbar-latest-notifications"],
    queryFn: () => movieApi.getLatest(1).then((r) => r.data),
    staleTime: 1000 * 60 * 5,
    enabled: notificationsOpen,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const syncStoredReadState = () => {
      const stored = readNotificationReadState(window.localStorage);
      const systemIds = new Set(stored.system);
      const movieIds = new Set(stored.movies);

      setSystemNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read: systemIds.has(String(notification.id)),
        })),
      );
      setMovieNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read: movieIds.has(String(notification.id)),
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
    const rawItems =
      latestNotificationRes?.items || latestNotificationRes?.data?.items || [];
    if (rawItems.length > 0) {
      const readMovieIds = new Set(
        readNotificationReadState(window.localStorage).movies,
      );
      const liveItems = rawItems.slice(0, 8).map((item: any, idx: number) => {
        const id = item.slug || `live-${idx}`;
        return {
          id,
          name: item.name || "Phim mới cập nhật",
          episode: item.episode_current || item.quality || "Tập mới",
          poster: item.poster_url || item.thumb_url,
          message: `Phim "${item.name}" vừa cập nhật (${item.episode_current || item.quality || "Tập mới"})`,
          time: "Vừa cập nhật",
          slug: item.slug,
          read: readMovieIds.has(String(id)),
        };
      });
      setMovieNotifications(liveItems);
    }
  }, [latestNotificationRes]);

  const { newMovieNotifications, commentNotifications } = useSettingsStore();

  const unreadSystem = systemNotifications.filter((n) => !n.read).length;
  const unreadMovies = movieNotifications.filter((n) => !n.read).length;
  const unreadCount = unreadSystem + unreadMovies;

  const markAllRead = () => {
    setSystemNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true })),
    );
    setMovieNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true })),
    );
    persistNotificationReadIds(
      window.localStorage,
      "system",
      systemNotifications.map((notification) => notification.id),
    );
    persistNotificationReadIds(
      window.localStorage,
      "movies",
      movieNotifications.map((notification) => notification.id),
    );
  };

  const markSystemAsRead = (id: string) => {
    setSystemNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
    persistNotificationReadIds(window.localStorage, "system", [id]);
  };

  const markMovieAsRead = (id: string | number, slug?: string) => {
    setMovieNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
    persistNotificationReadIds(window.localStorage, "movies", [id]);
    if (slug) {
      router.push(`/film/${slug}`);
    }
  };

  useEffect(() => {
    let frameId: number | null = null;
    const onScroll = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > 20);
        frameId = null;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
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
        data-site-header="true"
        data-scrolled={scrolled ? "true" : "false"}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 h-16 flex items-center border-b [font-family:var(--font-manrope)] transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300",
          scrolled
            ? "border-white/[0.08] bg-[#0b0d12]/80 shadow-[0_12px_34px_rgba(0,0,0,0.22)] backdrop-blur-xl backdrop-saturate-150"
            : "border-transparent bg-transparent shadow-none backdrop-blur-none",
        )}
      >
        <div className="w-full px-4 md:px-8 flex items-center justify-between gap-3 md:gap-6 relative">
          <div className="flex items-center shrink-0">
            <AnimatedNavbarLogo />
          </div>

          <nav className="hidden lg:flex items-center justify-center space-x-1.5 xl:space-x-2 text-sm font-semibold text-neutral-200 absolute left-1/2 -translate-x-1/2 z-10">
            <div className="relative group py-5">
              <button className="flex items-center space-x-1 text-sm font-semibold text-neutral-300 hover:text-white transition-colors focus:outline-none px-3 py-1.5">
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
                    onMouseEnter={() => router.prefetch(`/genre/${item.slug}`)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/15 hover:backdrop-blur-md hover:translate-x-1 transition-all duration-200 block truncate"
                  >
                    {t(`genres_list.${item.slug}`, item.label)}
                  </Link>
                ))}
              </div>
            </div>

            <div className="relative group py-5">
              <button className="flex items-center space-x-1 text-sm font-semibold text-neutral-300 hover:text-white transition-colors focus:outline-none px-3 py-1.5">
                <span>{t("nav.country")}</span>
                <ChevronDown
                  size={14}
                  className="transition-transform duration-200 group-hover:rotate-180 text-neutral-400"
                />
              </button>
              <div className="absolute top-[85%] left-1/2 -translate-x-1/2 mt-0 w-[640px] p-4 bg-[#090c15]/65 backdrop-blur-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.6)] rounded-2xl ring-1 ring-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 grid grid-cols-4 gap-y-1.5 gap-x-2 z-50 max-h-[75vh] overflow-y-auto scrollbar-thin">
                {COUNTRIES_LIST.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/country/${item.slug}`}
                    onMouseEnter={() =>
                      router.prefetch(`/country/${item.slug}`)
                    }
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/15 hover:backdrop-blur-md hover:translate-x-1 transition-all duration-200 flex items-center gap-2.5 truncate group/flag"
                  >
                    <CountryFlagImage
                      code={item.code}
                      label={t(`countries_list.${item.slug}`, item.label)}
                      className="w-5 h-3.5 object-cover rounded-[3px] border border-white/20 shrink-0 group-hover/flag:scale-110 transition-transform shadow-sm"
                    />
                    <span className="truncate">
                      {t(`countries_list.${item.slug}`, item.label)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="relative group py-5">
              <button className="flex items-center space-x-1 text-sm font-semibold text-neutral-300 hover:text-white transition-colors focus:outline-none px-3 py-1.5">
                <span>{t("nav.list")}</span>
                <ChevronDown
                  size={14}
                  className="transition-transform duration-200 group-hover:rotate-180 text-neutral-400"
                />
              </button>
              <div className="absolute top-[85%] left-1/2 -translate-x-1/2 mt-0 w-[500px] p-4 bg-[#090c15]/65 backdrop-blur-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.6)] rounded-2xl ring-1 ring-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 grid grid-cols-3 gap-y-1.5 gap-x-2 z-50">
                {LISTS_CATALOG.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onMouseEnter={() => router.prefetch(item.href)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/15 hover:backdrop-blur-md hover:translate-x-1 transition-all duration-200 block truncate"
                  >
                    {lang === "en" ? item.labelEn || item.label : item.label}
                  </Link>
                ))}
              </div>
            </div>

            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onMouseEnter={() => prefetchNav(link.href)}
                  onTouchStart={() => prefetchNav(link.href)}
                  className={cn(
                    "relative px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all duration-150 select-none",
                    isActive
                      ? "text-white font-bold"
                      : "text-neutral-300 hover:text-white hover:bg-white/[0.05]",
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="navbarActivePill"
                      className="absolute inset-0 rounded-full bg-white/10 border border-white/20 shadow-sm backdrop-blur-md -z-10"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                        mass: 0.8,
                      }}
                    />
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
              className={`${cardFont.className} group hidden min-w-[200px] cursor-pointer items-center gap-2.5 rounded-full border border-white/10 bg-[#111317]/90 py-2 pl-3.5 pr-3 text-xs transition-colors duration-200 hover:border-white/25 hover:bg-[#181b20] sm:flex lg:min-w-[240px]`}
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
              className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 hover:bg-white/[0.06] hover:text-white transition-colors sm:hidden"
            >
              <Search size={20} />
            </button>

            <div className="flex items-center space-x-1 sm:space-x-2">
              <DropdownMenu modal={false} onOpenChange={setNotificationsOpen}>
                <DropdownMenuTrigger
                  aria-label={lang === "en" ? "Notifications" : "Thông báo"}
                  className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-neutral-300 hover:bg-white/[0.06] hover:text-white transition-colors focus:outline-none cursor-pointer"
                >
                  <Bell size={19} className="stroke-[2.2]" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 shadow-sm" />
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

                  {/* Clean Monochrome Segmented Tabs */}
                  <div className="grid grid-cols-2 p-1 bg-black/50 rounded-xl border border-white/[0.08] gap-1 mb-3.5">
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

                    <button
                      type="button"
                      onClick={() => setNotifTab("movies")}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none",
                        notifTab === "movies"
                          ? "bg-neutral-800 text-white font-bold shadow-sm"
                          : "text-neutral-400 hover:text-white",
                      )}
                    >
                      <span>Phim mới</span>
                      {movieNotifications.length > 0 && (
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                            notifTab === "movies"
                              ? "bg-neutral-700 text-white"
                              : "bg-neutral-800 text-neutral-400",
                          )}
                        >
                          {movieNotifications.length}
                        </span>
                      )}
                    </button>
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
                            onClick={() => markSystemAsRead(n.id)}
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
                    ) : movieNotifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-neutral-500">
                        {lang === "en"
                          ? "No new movie updates"
                          : "Chưa có thông báo phim mới"}
                      </div>
                    ) : (
                      movieNotifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markMovieAsRead(n.id, n.slug)}
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

              {user ? (
                <div className="hidden lg:block">
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger className="flex items-center space-x-1 focus:outline-none cursor-pointer group">
                      {user.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName || user.username}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover border border-white/20 group-hover:border-violet-400 transition-all shadow-md"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=8b5cf6&color=ffffff&size=64`;
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-300 font-bold text-xs flex items-center justify-center shadow-md group-hover:border-violet-400 transition-colors">
                          {(user.displayName || user.username || "U")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
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
                        <img
                          src={
                            user.avatarUrl ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=8b5cf6&color=ffffff&size=80`
                          }
                          alt={user.displayName || user.username}
                          referrerPolicy="no-referrer"
                          className="h-8 w-8 rounded-full object-cover border border-white/20 shadow-md shrink-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=8b5cf6&color=ffffff&size=80`;
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-white truncate">
                            {user.displayName || user.username}
                          </p>
                          <p className="text-[11px] text-neutral-400 truncate">
                            @{user.username}
                          </p>
                        </div>
                      </div>

                      <div className="py-1 space-y-0.5">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              user.username
                                ? `/user/${encodeURIComponent(user.username)}`
                                : "/user",
                            )
                          }
                          className="hover:bg-white/12 hover:backdrop-blur-md hover:text-white transition-all rounded-lg cursor-pointer flex items-center py-1.5 px-2.5 text-xs font-medium"
                        >
                          <User
                            size={14}
                            className="mr-2 text-neutral-300 shrink-0"
                          />
                          <span>{t("nav.profile")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push("/watchlist")}
                          className="hover:bg-white/12 hover:backdrop-blur-md hover:text-white transition-all rounded-lg cursor-pointer flex items-center py-1.5 px-2.5 text-xs font-medium"
                        >
                          <Bookmark
                            size={14}
                            className="mr-2 text-neutral-300 shrink-0"
                          />
                          <span>{t("nav.watchlist")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push("/history")}
                          className="hover:bg-white/12 hover:backdrop-blur-md hover:text-white transition-all rounded-lg cursor-pointer flex items-center py-1.5 px-2.5 text-xs font-medium"
                        >
                          <History
                            size={14}
                            className="mr-2 text-neutral-300 shrink-0"
                          />
                          <span>{t("nav.history")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push("/settings")}
                          className="hover:bg-white/12 hover:backdrop-blur-md hover:text-white transition-all rounded-lg cursor-pointer flex items-center py-1.5 px-2.5 text-xs font-medium"
                        >
                          <Settings
                            size={14}
                            className="mr-2 text-neutral-300 shrink-0"
                          />
                          <span>Cài đặt</span>
                        </DropdownMenuItem>
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
                            router.push("/");
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
              ) : (
                /* Desktop Guest Login User Icon Button (Navigates to dedicated /login page) */
                <Link
                  href="/login"
                  aria-label="Đăng nhập"
                  title="Đăng nhập"
                  className="hidden lg:flex items-center justify-center p-1.5 text-neutral-300 hover:text-white transition-colors cursor-pointer active:scale-95"
                >
                  <User size={20} className="stroke-[2.2]" />
                </Link>
              )}
            </div>

            {/* Mobile menu trigger */}
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-300 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer active:scale-95 lg:hidden"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Mở menu"
            >
              <Menu size={22} className="stroke-[2.2]" />
            </button>
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
