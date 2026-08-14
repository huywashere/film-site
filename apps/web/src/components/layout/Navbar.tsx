"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import NextImage from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MobileSidebar } from "./MobileSidebar";

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
  { href: "/actors", label: "Diễn Viên" },
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
  { label: "Anh", slug: "anh", code: "gb" },
  { label: "Ba Lan", slug: "ba-lan", code: "pl" },
  { label: "Brazil", slug: "brazil", code: "br" },
  { label: "Bồ Đào Nha", slug: "bo-dao-nha", code: "pt" },
  { label: "Canada", slug: "canada", code: "ca" },
  { label: "Châu Phi", slug: "chau-phi", code: "za" },
  { label: "Hà Lan", slug: "ha-lan", code: "nl" },
  { label: "Hàn Quốc", slug: "han-quoc", code: "kr" },
  { label: "Hồng Kông", slug: "hong-kong", code: "hk" },
  { label: "Indonesia", slug: "indonesia", code: "id" },
  { label: "Malaysia", slug: "malaysia", code: "my" },
  { label: "Mexico", slug: "mexico", code: "mx" },
  { label: "Na Uy", slug: "na-uy", code: "no" },
  { label: "Nam Phi", slug: "nam-phi", code: "za" },
  { label: "Nga", slug: "nga", code: "ru" },
  { label: "Nhật Bản", slug: "nhat-ban", code: "jp" },
  { label: "Philippines", slug: "philippines", code: "ph" },
  { label: "Pháp", slug: "phap", code: "fr" },
  { label: "Quốc Gia Khác", slug: "quoc-gia-khac", code: "un" },
  { label: "Thái Lan", slug: "thai-lan", code: "th" },
  { label: "Thổ Nhĩ Kỳ", slug: "tho-nhi-ky", code: "tr" },
  { label: "Thụy Sĩ", slug: "thuy-si", code: "ch" },
  { label: "Thụy Điển", slug: "thuy-dien", code: "se" },
  { label: "Trung Quốc", slug: "trung-quoc", code: "cn" },
  { label: "Tây Ban Nha", slug: "tay-ban-nha", code: "es" },
  { label: "UAE", slug: "uae", code: "ae" },
  { label: "Ukraina", slug: "ukraina", code: "ua" },
  { label: "Việt Nam", slug: "viet-nam", code: "vn" },
  { label: "Âu Mỹ", slug: "au-my", code: "us" },
  { label: "Úc", slug: "uc", code: "au" },
  { label: "Ý", slug: "y", code: "it" },
  { label: "Đan Mạch", slug: "dan-mach", code: "dk" },
  { label: "Đài Loan", slug: "dai-loan", code: "tw" },
  { label: "Đức", slug: "duc", code: "de" },
  { label: "Ả Rập Xê Út", slug: "a-rap-xe-ut", code: "sa" },
  { label: "Ấn Độ", slug: "an-do", code: "in" },
];

export function getCountryEmoji(code?: string): string {
  if (!code || code === "un") return "🌐";
  const upper = code.toUpperCase();
  if (upper.length !== 2) return "🌐";
  const codePoints = [...upper].map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function CountryFlagImage({
  code,
  label,
  className = "w-5 h-3.5 object-cover rounded-[3px] border border-white/20 shrink-0 shadow-sm",
}: {
  code: string;
  label: string;
  className?: string;
}) {
  const emoji = getCountryEmoji(code);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center leading-none",
        className,
      )}
      role="img"
      aria-label={label}
    >
      {emoji}
    </span>
  );
}

const LISTS_CATALOG = [
  { label: "Bộ Sưu Tập Phim", href: "/lists" },
  { label: "Phim Mới", href: "/search?sort=modified.time%20desc" },
  { label: "Phim Bộ", href: "/films/series" },
  { label: "Phim Lẻ", href: "/films/single" },
  { label: "Shows", href: "/films/tvshows" },
  { label: "Hoạt Hình", href: "/films/anime" },
  { label: "Phim Vietsub", href: "/search?q=vietsub" },
  { label: "Phim Thuyết Minh", href: "/search?q=thuyet%20minh" },
  { label: "Phim Lồng Tiếng", href: "/search?q=long%20tieng" },
  { label: "Phim Bộ Đang Chiếu", href: "/search?status=ongoing" },
  { label: "Phim Bộ Đã Hoàn Thành", href: "/search?status=completed" },
  { label: "Subteam", href: "/search?q=subteam" },
  { label: "Phim Chiếu Rạp", href: "/search?q=chieu%20rap" },
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
        <span className="block font-sans text-xl font-black lowercase tracking-tight text-white transition-opacity duration-200 group-hover:opacity-80 sm:text-2xl">
          net<span className="text-violet-400">phim</span>
        </span>
      </div>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

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

  // Notifications State & References (Live Auto-Fetched from Third-Party APIs)
  const [notifications, setNotifications] = useState<
    Array<{
      id: string | number;
      message: string;
      time: string;
      slug?: string;
      read: boolean;
    }>
  >([
    {
      id: "default-1",
      message: "Hệ thống tự động đồng bộ phim mới nhất từ các nhà cung cấp.",
      time: "Hệ thống",
      read: false,
    },
  ]);

  // Fetch live updated movies from providers every 5 minutes to generate real notifications
  const { data: latestNotificationRes } = useQuery({
    queryKey: ["navbar-latest-notifications"],
    queryFn: () => movieApi.getLatest(1).then((r) => r.data),
    staleTime: 1000 * 60 * 5,
    enabled: notificationsOpen,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const rawItems =
      latestNotificationRes?.items || latestNotificationRes?.data?.items || [];
    if (rawItems.length > 0) {
      const liveItems = rawItems.slice(0, 5).map((item: any, idx: number) => ({
        id: item.slug || `live-${idx}`,
        message: `Phim "${item.name}" vừa cập nhật (${item.episode_current || item.quality || "Tập mới"})`,
        time: "Vừa cập nhật",
        slug: item.slug,
        read: false,
      }));
      setNotifications(liveItems);
    }
  }, [latestNotificationRes]);

  const { newMovieNotifications, commentNotifications } = useSettingsStore();

  const activeNotifications = notifications.filter((n) => {
    if ((n as any).type === "comment" && !commentNotifications) return false;
    if ((n as any).type !== "comment" && !newMovieNotifications) return false;
    return true;
  });

  const unreadCount = activeNotifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string | number, slug?: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    if (slug) {
      router.push(`/film/${slug}`);
    }
  };

  // Keep the header transparent at the top and introduce glass only after scroll.
  useEffect(() => {
    let frameId: number | null = null;
    const update = () => {
      frameId = null;
      setScrolled(window.scrollY > 30);
    };
    const onScroll = () => {
      if (frameId === null) frameId = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Global Ctrl/Cmd+K shortcut to open Spotlight search from anywhere
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

          {/* Center Block: Desktop Navigation Links (Absolute 100% Centered in Header) */}
          <nav className="hidden lg:flex items-center justify-center space-x-4 xl:space-x-6 text-sm font-medium text-neutral-200 absolute left-1/2 -translate-x-1/2 z-10">
            {/* Thể Loại Dropdown */}
            <div className="relative group py-5">
              <button className="flex items-center space-x-1 text-neutral-200 hover:text-white transition-colors focus:outline-none font-semibold">
                <span>{t("nav.genres")}</span>
                <ChevronDown
                  size={14}
                  className="transition-transform duration-200 group-hover:rotate-180 text-neutral-300"
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
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Quốc Gia Dropdown */}
            <div className="relative group py-5">
              <button className="flex items-center space-x-1 text-neutral-200 hover:text-white transition-colors focus:outline-none font-semibold">
                <span>{t("nav.country")}</span>
                <ChevronDown
                  size={14}
                  className="transition-transform duration-200 group-hover:rotate-180 text-neutral-300"
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
                      label={item.label}
                      className="w-5 h-3.5 object-cover rounded-[3px] border border-white/20 shrink-0 group-hover/flag:scale-110 transition-transform shadow-sm"
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Danh Sách Dropdown */}
            <div className="relative group py-5">
              <button className="flex items-center space-x-1 text-neutral-200 hover:text-white transition-colors focus:outline-none font-semibold">
                <span>{t("nav.list")}</span>
                <ChevronDown
                  size={14}
                  className="transition-transform duration-200 group-hover:rotate-180 text-neutral-300"
                />
              </button>
              <div className="absolute top-[85%] left-1/2 -translate-x-1/2 mt-0 w-[500px] p-4 bg-[#090c15]/65 backdrop-blur-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.6)] rounded-2xl ring-1 ring-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 grid grid-cols-3 gap-y-1.5 gap-x-2 z-50">
                {LISTS_CATALOG.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onMouseEnter={() => router.prefetch(item.href)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/15 hover:backdrop-blur-md hover:translate-x-1 transition-all duration-200 block truncate"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "hover:text-white transition-colors font-semibold",
                  pathname === link.href
                    ? "text-white font-black"
                    : "text-neutral-200",
                )}
              >
                {link.label || t(link.key!)}
              </Link>
            ))}
          </nav>

          {/* Right Block: Search & Actions & Profile */}
          <div className="flex shrink-0 items-center justify-end space-x-1 sm:space-x-3">
            {/* ── Search Pill Button — desktop ── */}
            <button
              id="navbar-search-btn"
              onClick={() => setIsSpotlightOpen(true)}
              aria-label="Tìm kiếm phim"
              title="Tìm kiếm (Ctrl + K)"
              className={`${cardFont.className} group hidden min-w-[200px] cursor-pointer items-center gap-2.5 rounded-full border border-white/10 bg-[#111317]/90 py-2 pl-3.5 pr-3 text-xs transition-colors duration-200 hover:border-white/25 hover:bg-[#181b20] sm:flex lg:min-w-[260px]`}
            >
              <Search
                size={14}
                className="text-neutral-400 group-hover:text-white transition-colors flex-shrink-0"
              />
              <span className="flex-1 text-left font-medium text-neutral-400 group-hover:text-neutral-200 transition-colors">
                Tìm kiếm phim, diễn viên...
              </span>
              <kbd className="flex items-center gap-0.5 bg-white/[0.06] border border-white/10 rounded-md px-1.5 py-0.5 text-[10px] font-mono text-neutral-500 group-hover:text-neutral-400 flex-shrink-0">
                <span className="text-[11px]">⌘</span>K
              </kbd>
            </button>
            {/* Mobile search icon only */}
            <button
              onClick={() => setIsSpotlightOpen(true)}
              aria-label="Tìm kiếm"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 hover:bg-white/[0.06] hover:text-white transition-colors sm:hidden"
            >
              <Search size={20} />
            </button>

            {/* Profile / Actions */}
            <div className="flex items-center space-x-1 sm:space-x-3">
              {/* Notifications Bell Dropdown (Visible next to Avatar/User button) */}
              <DropdownMenu modal={false} onOpenChange={setNotificationsOpen}>
                <DropdownMenuTrigger className="relative flex h-10 w-10 items-center justify-center rounded-xl text-neutral-300 hover:bg-white/[0.06] hover:text-white transition-colors focus:outline-none cursor-pointer">
                  <Bell size={20} className="stroke-[2.2]" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-white" />
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  alignOffset={-12}
                  sideOffset={8}
                  collisionPadding={{ right: 12, left: 12 }}
                  onWheel={(e) => e.stopPropagation()}
                  className={`${cardFont.className} pointer-events-auto z-50 w-[calc(100vw-24px)] max-w-[360px] rounded-2xl border border-white/10 bg-[#15171b] p-3.5 text-xs text-neutral-300 shadow-[0_22px_55px_rgba(0,0,0,0.42)] sm:w-88`}
                >
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/10 mb-1.5">
                    <span className="font-bold text-white text-sm">
                      Thông báo
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[10px] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      >
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                  <div
                    onWheel={(e) => e.stopPropagation()}
                    className="max-h-[60vh] sm:max-h-72 overflow-y-auto overscroll-contain touch-pan-y space-y-1.5 pr-1 scrollbar-thin pointer-events-auto"
                  >
                    {activeNotifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-neutral-500">
                        Chưa có thông báo nào (hoặc đã tắt trong Cài Đặt)
                      </div>
                    ) : (
                      activeNotifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id, n.slug)}
                          className={cn(
                            "p-2.5 rounded-xl text-[11px] cursor-pointer hover:bg-white/15 hover:backdrop-blur-md transition-all flex items-start space-x-2.5 border border-white/5",
                            n.read
                              ? "opacity-60 bg-white/[0.02]"
                              : "bg-white/[0.06] shadow-sm",
                          )}
                        >
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full mt-1 flex-shrink-0 shadow",
                              n.read
                                ? "bg-neutral-600"
                                : "bg-red-500 shadow-red-500/50",
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white leading-snug break-words font-medium">
                              {n.message}
                            </p>
                            <span className="text-[9px] text-neutral-400 font-semibold block mt-0.5">
                              {n.time}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {user ? (
                /* YouTube-style Profile menu dropdown */
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger className="flex items-center space-x-1 focus:outline-none cursor-pointer group">
                    {user.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={user.avatarUrl}
                        alt={user.displayName || user.username}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover border border-white/20 group-hover:border-emerald-400 transition-all shadow-md"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=10b981&color=ffffff&size=64`;
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-xs flex items-center justify-center shadow-md group-hover:border-emerald-400 transition-colors">
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
                      "w-72 -translate-x-6 sm:-translate-x-8 p-2.5 bg-[#090c15]/75 backdrop-blur-3xl border border-white/15 text-neutral-200 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.7)] z-50 divide-y divide-white/10 ring-1 ring-white/10",
                      cardFont.className,
                    )}
                  >
                    {/* Top User Profile Header */}
                    <div className="p-2 flex items-center space-x-3 pb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          user.avatarUrl ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=10b981&color=ffffff&size=80`
                        }
                        alt={user.displayName || user.username}
                        referrerPolicy="no-referrer"
                        className="h-10 w-10 rounded-full object-cover border border-white/20 shadow-md shrink-0"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=10b981&color=ffffff&size=80`;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-white truncate">
                          {user.displayName || user.username}
                        </p>
                        <p className="text-xs text-neutral-400 truncate">
                          @{user.username}
                        </p>
                      </div>
                    </div>

                    {/* Section 1: Main Quick Access Shortcuts */}
                    <div className="py-1.5 space-y-0.5">
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(
                            user.username
                              ? `/user/${encodeURIComponent(user.username)}`
                              : "/user",
                          )
                        }
                        className="hover:bg-white/15 hover:backdrop-blur-md hover:text-white transition-all rounded-xl cursor-pointer flex items-center py-2.5 px-3 text-xs font-semibold"
                      >
                        <User size={16} className="mr-3 text-neutral-300" />
                        <span>Trang cá nhân</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/settings")}
                        className="hover:bg-white/15 hover:backdrop-blur-md hover:text-white transition-all rounded-xl cursor-pointer flex items-center py-2.5 px-3 text-xs font-semibold"
                      >
                        <Settings size={16} className="mr-3 text-neutral-300" />
                        <span>Cài đặt</span>
                      </DropdownMenuItem>
                    </div>

                    {/* Section 2: Preferences & Settings */}
                    <div className="py-1.5 space-y-0.5">
                      <DropdownMenuItem
                        onClick={toggleTheme}
                        className="hover:bg-white/15 hover:backdrop-blur-md hover:text-white transition-all rounded-xl cursor-pointer flex items-center justify-between py-2.5 px-3 text-xs font-semibold"
                      >
                        <div className="flex items-center">
                          {mounted && theme === "light" ? (
                            <Moon size={16} className="mr-3 text-neutral-400" />
                          ) : (
                            <Sun size={16} className="mr-3 text-neutral-400" />
                          )}
                          <span>
                            Giao diện: {theme === "light" ? "Sáng" : "Tối"}
                          </span>
                        </div>
                        <ChevronRight size={14} className="text-neutral-500" />
                      </DropdownMenuItem>

                      {/* Language Switcher Modal Item */}
                      <DropdownMenuItem
                        onClick={() => setLang(lang === "vi" ? "en" : "vi")}
                        className="hover:bg-white/15 hover:backdrop-blur-md hover:text-white transition-all rounded-xl cursor-pointer flex items-center justify-between py-2.5 px-3 text-xs font-semibold"
                      >
                        <div className="flex items-center">
                          <Languages
                            size={16}
                            className="mr-3 text-neutral-400"
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
                        <ChevronRight size={14} className="text-neutral-500" />
                      </DropdownMenuItem>
                    </div>

                    {/* Section 3: Logout Session */}
                    <div className="pt-1.5">
                      <DropdownMenuItem
                        onClick={() => {
                          logout();
                          router.push("/");
                        }}
                        className="hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-xl cursor-pointer flex items-center py-2.5 px-3 text-xs font-bold"
                      >
                        <LogOut size={16} className="mr-3 text-red-400" />
                        <span>Đăng xuất</span>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                /* Desktop Guest Login User Icon Button (Navigates to /login) */
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
