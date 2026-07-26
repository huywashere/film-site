"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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
import { useTranslation } from "@/store/langStore";
import { useThemeStore } from "@/store/themeStore";
import { movieApi } from "@/lib/api";
import { resolveImageUrl } from "@/components/film/FilmCard";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MobileSidebar } from "./MobileSidebar";
import { AnimatePresence } from "framer-motion";

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
  { label: "Anh", slug: "anh" },
  { label: "Ba Lan", slug: "ba-lan" },
  { label: "Brazil", slug: "brazil" },
  { label: "Bồ Đào Nha", slug: "bo-dao-nha" },
  { label: "Canada", slug: "canada" },
  { label: "Châu Phi", slug: "chau-phi" },
  { label: "Hà Lan", slug: "ha-lan" },
  { label: "Hàn Quốc", slug: "han-quoc" },
  { label: "Hồng Kông", slug: "hong-kong" },
  { label: "Indonesia", slug: "indonesia" },
  { label: "Malaysia", slug: "malaysia" },
  { label: "Mexico", slug: "mexico" },
  { label: "Na Uy", slug: "na-uy" },
  { label: "Nam Phi", slug: "nam-phi" },
  { label: "Nga", slug: "nga" },
  { label: "Nhật Bản", slug: "nhat-ban" },
  { label: "Philippines", slug: "philippines" },
  { label: "Pháp", slug: "phap" },
  { label: "Quốc Gia Khác", slug: "quoc-gia-khac" },
  { label: "Thái Lan", slug: "thai-lan" },
  { label: "Thổ Nhĩ Kỳ", slug: "tho-nhi-ky" },
  { label: "Thụy Sĩ", slug: "thuy-si" },
  { label: "Thụy Điển", slug: "thuy-dien" },
  { label: "Trung Quốc", slug: "trung-quoc" },
  { label: "Tây Ban Nha", slug: "tay-ban-nha" },
  { label: "UAE", slug: "uae" },
  { label: "Ukraina", slug: "ukraina" },
  { label: "Việt Nam", slug: "viet-nam" },
  { label: "Âu Mỹ", slug: "au-my" },
  { label: "Úc", slug: "uc" },
  { label: "Ý", slug: "y" },
  { label: "Đan Mạch", slug: "dan-mach" },
  { label: "Đài Loan", slug: "dai-loan" },
  { label: "Đức", slug: "duc" },
  { label: "Ả Rập Xê Út", slug: "a-rap-xe-ut" },
  { label: "Ấn Độ", slug: "an-do" },
];

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
    refetchInterval: 1000 * 60 * 5, // Auto-check for new updates every 5 minutes
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

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  // Scroll detection to update header background
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-16 flex items-center",
          scrolled
            ? "bg-background/95 shadow-md backdrop-blur-md"
            : "bg-gradient-to-b from-background/80 via-background/20 to-transparent",
        )}
      >
        <div className="w-full px-4 md:px-8 flex items-center justify-between gap-3 md:gap-6 relative">
          {/* Left Block: Logo (shrink-0 ensures it NEVER gets overlapped) */}
          <div className="flex items-center shrink-0">
            <Link href="/" className="flex items-center space-x-1.5 group">
              <span
                className="text-foreground text-xl sm:text-2xl font-black tracking-tighter lowercase"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  letterSpacing: "-0.02em",
                }}
              >
                cineverse
              </span>
            </Link>
          </div>

          {/* Center Block: Desktop Navigation Links (Absolute 100% Centered in Header) */}
          <nav className="hidden lg:flex items-center justify-center space-x-4 xl:space-x-6 text-sm font-medium text-neutral-600 dark:text-neutral-300 absolute left-1/2 -translate-x-1/2 z-10">
            {/* Thể Loại Dropdown */}
            <div className="relative group py-5">
              <button className="flex items-center space-x-1 hover:text-neutral-900 dark:hover:text-white transition-colors focus:outline-none font-semibold">
                <span>{t("nav.genres")}</span>
                <ChevronDown
                  size={14}
                  className="transition-transform duration-200 group-hover:rotate-180"
                />
              </button>
              <div className="absolute top-[85%] left-1/2 -translate-x-1/2 mt-0 w-[520px] p-4 bg-[#090c15]/65 backdrop-blur-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.6)] rounded-2xl ring-1 ring-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 grid grid-cols-3 gap-y-1.5 gap-x-2 z-50">
                {GENRES_LIST.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/genre/${item.slug}`}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/15 hover:backdrop-blur-md hover:translate-x-1 transition-all duration-200 block truncate"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Quốc Gia Dropdown */}
            <div className="relative group py-5">
              <button className="flex items-center space-x-1 hover:text-neutral-900 dark:hover:text-white transition-colors focus:outline-none font-semibold">
                <span>{t("nav.country")}</span>
                <ChevronDown
                  size={14}
                  className="transition-transform duration-200 group-hover:rotate-180"
                />
              </button>
              <div className="absolute top-[85%] left-1/2 -translate-x-1/2 mt-0 w-[640px] p-4 bg-[#090c15]/65 backdrop-blur-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.6)] rounded-2xl ring-1 ring-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 grid grid-cols-4 gap-y-1.5 gap-x-2 z-50 max-h-[75vh] overflow-y-auto scrollbar-thin">
                {COUNTRIES_LIST.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/country/${item.slug}`}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/15 hover:backdrop-blur-md hover:translate-x-1 transition-all duration-200 block truncate"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Danh Sách Dropdown */}
            <div className="relative group py-5">
              <button className="flex items-center space-x-1 hover:text-neutral-900 dark:hover:text-white transition-colors focus:outline-none font-semibold">
                <span>{t("nav.list")}</span>
                <ChevronDown
                  size={14}
                  className="transition-transform duration-200 group-hover:rotate-180"
                />
              </button>
              <div className="absolute top-[85%] left-1/2 -translate-x-1/2 mt-0 w-[500px] p-4 bg-[#090c15]/65 backdrop-blur-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.6)] rounded-2xl ring-1 ring-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 grid grid-cols-3 gap-y-1.5 gap-x-2 z-50">
                {LISTS_CATALOG.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
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
                  "hover:text-neutral-900 dark:hover:text-white transition-colors font-semibold",
                  pathname === link.href
                    ? "text-neutral-900 dark:text-white font-black"
                    : "text-neutral-600 dark:text-neutral-300",
                )}
              >
                {link.label || t(link.key!)}
              </Link>
            ))}
          </nav>

          {/* Right Block: Search & Actions & Profile */}
          <div className="flex items-center justify-end space-x-2 sm:space-x-3 shrink-0">
            {/* ── Search Pill Button — desktop ── */}
            <button
              id="navbar-search-btn"
              onClick={() => setIsSpotlightOpen(true)}
              aria-label="Tìm kiếm phim"
              title="Tìm kiếm (Ctrl + K)"
              className="hidden sm:flex items-center gap-2.5 bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/25 rounded-full pl-3.5 pr-3 py-2 text-xs transition-all duration-200 cursor-pointer group min-w-[200px] lg:min-w-[260px] backdrop-blur-sm"
            >
              <Search size={14} className="text-neutral-400 group-hover:text-white transition-colors flex-shrink-0" />
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
              className="sm:hidden p-1.5 text-neutral-400 hover:text-white transition-colors"
            >
              <Search size={20} />
            </button>

            {/* Profile / Actions */}
            <div className="flex items-center space-x-3">
              {/* Notifications Bell Dropdown (Visible next to Avatar/User button) */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger className="relative p-1.5 text-neutral-300 hover:text-white transition-colors focus:outline-none cursor-pointer">
                  <Bell size={20} className="stroke-[2.2]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  alignOffset={-32}
                  sideOffset={10}
                  collisionPadding={{ right: 32 }}
                  className="w-80 sm:w-88 -translate-x-6 sm:-translate-x-8 p-2 bg-[#14181c] border border-[#2c3440] text-neutral-300 text-xs shadow-2xl z-50 rounded-2xl"
                >
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/10 mb-1">
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
                  <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-thin">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id, n.slug)}
                        className={cn(
                          "p-2.5 rounded-xl text-[11px] cursor-pointer hover:bg-white/5 transition-all flex items-start space-x-2.5",
                          n.read ? "opacity-60" : "bg-white/[0.03]",
                        )}
                      >
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full mt-1 flex-shrink-0",
                            n.read ? "bg-neutral-600" : "bg-red-500",
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white leading-snug break-words">
                            {n.message}
                          </p>
                          <span className="text-[9px] text-neutral-400 font-semibold block mt-0.5">
                            {n.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {user ? (
                /* YouTube-style Profile menu dropdown */
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger className="flex items-center space-x-1 focus:outline-none cursor-pointer group">
                    <img
                      src={
                        user.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${user.username}&background=2c3440&color=ffffff&size=36`
                      }
                      alt={user.displayName || user.username}
                      className="w-8 h-8 rounded-full object-cover border border-white/20 group-hover:border-white transition-all shadow-md"
                    />
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
                    className="w-72 -translate-x-6 sm:-translate-x-8 p-2 bg-[#1f2328] border border-white/15 text-neutral-200 rounded-2xl shadow-2xl z-50 divide-y divide-white/10"
                  >
                    {/* Top User Profile Header */}
                    <div className="p-2 flex items-center space-x-3 pb-3">
                      <img
                        src={
                          user.avatarUrl ||
                          `https://ui-avatars.com/api/?name=${user.username}&background=2c3440&color=ffffff&size=40`
                        }
                        alt={user.displayName || user.username}
                        className="w-10 h-10 rounded-full object-cover border border-white/20 shadow"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-white truncate">
                          {user.displayName || user.username}
                        </p>
                        <p className="text-xs text-neutral-400 truncate">
                          @{user.username}
                        </p>
                        <button
                          onClick={() =>
                            router.push(
                              `/profile/${encodeURIComponent(user.username)}`,
                            )
                          }
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold hover:underline mt-0.5 block cursor-pointer"
                        >
                          Xem trang cá nhân
                        </button>
                      </div>
                    </div>

                    {/* Section 1: Main Features */}
                    <div className="py-1.5 space-y-0.5">
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(
                            `/profile/${encodeURIComponent(user.username)}`,
                          )
                        }
                        className="hover:bg-white/10 hover:text-white rounded-xl cursor-pointer flex items-center py-2.5 px-3 text-xs font-semibold"
                      >
                        <User size={16} className="mr-3 text-neutral-400" />
                        <span>Tài khoản CineVerse</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/watchlist")}
                        className="hover:bg-white/10 hover:text-white rounded-xl cursor-pointer flex items-center py-2.5 px-3 text-xs font-semibold"
                      >
                        <Bookmark size={16} className="mr-3 text-neutral-400" />
                        <span>Danh sách xem (Watchlist)</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/lists")}
                        className="hover:bg-white/10 hover:text-white rounded-xl cursor-pointer flex items-center py-2.5 px-3 text-xs font-semibold"
                      >
                        <List size={16} className="mr-3 text-neutral-400" />
                        <span>Bộ sưu tập phim (Collections)</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/reviews")}
                        className="hover:bg-white/10 hover:text-white rounded-xl cursor-pointer flex items-center py-2.5 px-3 text-xs font-semibold"
                      >
                        <Star size={16} className="mr-3 text-neutral-400" />
                        <span>Đánh giá của tôi</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/history")}
                        className="hover:bg-white/10 hover:text-white rounded-xl cursor-pointer flex items-center py-2.5 px-3 text-xs font-semibold"
                      >
                        <History size={16} className="mr-3 text-neutral-400" />
                        <span>Lịch sử xem phim</span>
                      </DropdownMenuItem>
                    </div>

                    {/* Section 2: Preferences & Settings */}
                    <div className="py-1.5 space-y-0.5">
                      <DropdownMenuItem
                        onClick={toggleTheme}
                        className="hover:bg-white/10 hover:text-white rounded-xl cursor-pointer flex items-center justify-between py-2.5 px-3 text-xs font-semibold"
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
                        className="hover:bg-white/10 hover:text-white rounded-xl cursor-pointer flex items-center justify-between py-2.5 px-3 text-xs font-semibold"
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

                      <DropdownMenuItem
                        onClick={() => router.push("/settings/security")}
                        className="hover:bg-white/10 hover:text-white rounded-xl cursor-pointer flex items-center justify-between py-2.5 px-3 text-xs font-semibold"
                      >
                        <div className="flex items-center">
                          <Settings
                            size={16}
                            className="mr-3 text-neutral-400"
                          />
                          <span>Cài đặt tài khoản</span>
                        </div>
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
                /* Minimalist Sleek User Icon Button with Glassmorphism */
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  aria-label="Đăng nhập tài khoản"
                  title="Đăng nhập / Tài khoản thành viên"
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/15 text-neutral-300 hover:text-white hover:border-white/40 hover:bg-white/[0.12] transition-all duration-300 shadow-lg shadow-black/40 active:scale-95 cursor-pointer"
                >
                  <User size={16} />
                </button>
              )}
            </div>

            {/* Mobile menu trigger */}
            <button
              className="lg:hidden text-neutral-300 hover:text-white transition-colors p-1"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background pt-20 flex flex-col p-6 space-y-4 text-neutral-300 text-base font-semibold animate-in fade-in slide-in-from-top-4 duration-300 overflow-y-auto">
          <Link
            href="/films/series"
            className="py-2 border-b border-border"
            onClick={() => setMobileMenuOpen(false)}
          >
            Phim Bộ
          </Link>
          <Link
            href="/films/single"
            className="py-2 border-b border-border"
            onClick={() => setMobileMenuOpen(false)}
          >
            Phim Lẻ
          </Link>
          <Link
            href="/films/anime"
            className="py-2 border-b border-border"
            onClick={() => setMobileMenuOpen(false)}
          >
            Hoạt Hình
          </Link>
          <Link
            href="/watchlist"
            className="py-2 border-b border-border"
            onClick={() => setMobileMenuOpen(false)}
          >
            Watchlist
          </Link>
          {!user && (
            <div className="flex flex-col space-y-3 pt-6">
              <Link
                href="/login"
                className="w-full text-center py-2.5 rounded border border-white/10 hover:bg-white/5 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="w-full text-center py-2.5 rounded bg-[#E50914] text-white hover:bg-[#C11119] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Spotlight Search Modal — single unified search UI ── */}
      <AnimatePresence>
        {isSpotlightOpen && (
          <SpotlightSearchModal
            isOpen={isSpotlightOpen}
            onClose={() => setIsSpotlightOpen(false)}
            suggestions={[]}
          />
        )}
      </AnimatePresence>
    </>
  );
}
