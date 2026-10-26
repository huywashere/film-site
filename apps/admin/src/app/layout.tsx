"use client";

import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  IconAlertTriangle,
  IconApps,
  IconBell,
  IconBellCheck,
  IconBroadcast,
  IconChartHistogram,
  IconChevronDown,
  IconChevronRight,
  IconExternalLink,
  IconFingerprint,
  IconHistory,
  IconLanguage,
  IconLayoutDashboard,
  IconMaximize,
  IconMenu2,
  IconMessageCircle,
  IconMinimize,
  IconMoon,
  IconMovie,
  IconPalette,
  IconSearch,
  IconSettings,
  IconSettings2,
  IconShieldCheck,
  IconSun,
  IconUser,
  IconUsers,
  IconX,
  IconDatabase,
  IconChartBar,
  IconTopologyStar3,
  IconWorldDownload,
  IconLogout,
  IconSpeakerphone,
  IconCamera,
  IconCameraOff,
  IconSparkles,
  IconLayoutSidebar,
  IconActivity,
  IconPlayerPlay,
  IconBadgeAd,
  IconRefresh,
} from "@tabler/icons-react";
import { adminFetch } from "@/lib/admin-api";
import { AdminDevToolsGuard } from "@/components/security/AdminDevToolsGuard";
import { AdminAntiScreenshot } from "@/components/security/AdminAntiScreenshot";
import { AdminSessionSync } from "@/components/security/AdminSessionSync";
import { endAdminSession } from "@/lib/admin-session-client";

import { IBM_Plex_Sans, Plus_Jakarta_Sans } from "next/font/google";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-admin-sans",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-admin-display",
});

type Locale = "vi" | "en";
type Skin = "flat" | "galaxy" | "matrix";
type TopbarMenu = "apps" | "notifications" | "palette" | "profile" | null;
type LocalizedText = { vi: string; en: string };
type AdminNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  link?: string;
  createdAt: string;
  readAt?: string;
};
type AdminProfile = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: string;
  twoFactorEnabled: boolean;
  permissions?: string[];
};
const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị viên",
  MODERATOR: "Kiểm duyệt viên",
  CONTENT_EDITOR: "Biên tập nội dung",
  OPERATIONS: "Vận hành hệ thống",
  ANALYST: "Phân tích dữ liệu",
  USER: "Người dùng",
};
const roleLabel = (role?: string) =>
  ROLE_LABELS[role || "ADMIN"] || role || "Quản trị viên";

const NAV_GROUPS: Array<{
  label: LocalizedText;
  items: Array<{
    href: string;
    label: LocalizedText;
    icon: typeof IconLayoutDashboard;
    badge?: string;
    permission?: string;
  }>;
}> = [
  {
    label: { vi: "CHÍNH", en: "MAIN" },
    items: [
      {
        href: "/",
        label: { vi: "Tổng quan", en: "Dashboard" },
        icon: IconLayoutDashboard,
      },
    ],
  },
  {
    label: { vi: "QUẢN LÝ", en: "MANAGEMENT" },
    items: [
      {
        href: "/movies",
        label: { vi: "Thư viện phim", en: "Movie Library" },
        icon: IconMovie,
      },
      {
        href: "/hero-banner",
        label: { vi: "Hero Banner Studio", en: "Hero Banner Studio" },
        icon: IconSparkles,
        badge: "HOT",
      },
      {
        href: "/crawler",
        label: { vi: "Tools Cào phim & Ingest", en: "Crawler Center" },
        icon: IconWorldDownload,
        permission: "movies.write",
      },
      {
        href: "/catalog",
        label: { vi: "Dữ liệu & đồng bộ", en: "Catalog Operations" },
        icon: IconRefresh,
        permission: "movies.write",
      },
      {
        href: "/playback",
        label: { vi: "Vận hành player", en: "Playback Operations" },
        icon: IconPlayerPlay,
      },
      {
        href: "/users",
        label: { vi: "Người dùng", en: "Users" },
        icon: IconUsers,
      },
      {
        href: "/reports",
        label: { vi: "Báo cáo sự cố", en: "Issue Reports" },
        icon: IconAlertTriangle,
        badge: "Mới",
      },
      {
        href: "/reviews",
        label: { vi: "Bình luận", en: "Reviews" },
        icon: IconMessageCircle,
      },
      {
        href: "/notifications",
        label: { vi: "Thông báo hệ thống", en: "System Broadcasts" },
        icon: IconSpeakerphone,
      },
      {
        href: "/watch-party",
        label: { vi: "Phòng xem chung", en: "Watch Party" },
        icon: IconBroadcast,
      },
    ],
  },
  {
    label: { vi: "HỆ THỐNG", en: "SYSTEM" },
    items: [
      {
        href: "/audit",
        label: { vi: "Nhật ký audit", en: "Audit Logs" },
        icon: IconFingerprint,
      },
      {
        href: "/analytics",
        label: { vi: "Analytics nâng cao", en: "Advanced Analytics" },
        icon: IconChartBar,
        permission: "analytics.read",
      },
      {
        href: "/operations",
        label: { vi: "Backup & vận hành", en: "Backup & Operations" },
        icon: IconDatabase,
        permission: "backups.manage",
      },
      {
        href: "/configuration",
        label: { vi: "Cấu hình", en: "Configuration" },
        icon: IconSettings2,
      },
      {
        href: "/configuration/ads",
        label: { vi: "Vị trí quảng cáo", en: "Ads Management" },
        icon: IconBadgeAd,
      },
      {
        href: "/system",
        label: { vi: "Bảo mật & hệ thống", en: "Security & Health" },
        icon: IconShieldCheck,
      },
    ],
  },
];

const ACCENT_OPTIONS = [
  { id: "blue", label: "Xanh biển", color: "#2878ee", strong: "#236dc9" },
  { id: "violet", label: "Tím", color: "#7b70ef", strong: "#695fcb" },
  { id: "teal", label: "Xanh ngọc", color: "#02a98d", strong: "#028a74" },
  { id: "rose", label: "Hồng", color: "#f7577e", strong: "#dc4168" },
  { id: "amber", label: "Hổ phách", color: "#eaa638", strong: "#c9871e" },
];

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [locale, setLocale] = useState<Locale>("vi");
  const [skin, setSkin] = useState<Skin>("matrix");
  const [openMenu, setOpenMenu] = useState<TopbarMenu>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [accent, setAccent] = useState("blue");
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [screenshotProtectionEnabled, setScreenshotProtectionEnabled] =
    useState(true);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setScreenshotProtectionEnabled(
      localStorage.getItem("netphim-admin-screenshot-protection") !== "off",
    );
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const result = await adminFetch<{
        items: AdminNotification[];
        unread: number;
      }>("notifications?limit=8");
      setNotifications(result.items);
      setNotificationCount(result.unread);
    } catch {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const loadAdminProfile = useCallback(async () => {
    try {
      setAdminProfile(await adminFetch<AdminProfile>("me"));
    } catch {
      setAdminProfile(null);
    }
  }, []);

  useEffect(() => {
    if (pathname === "/login") return;
    setDarkMode(document.documentElement.dataset.adminTheme === "dark");

    // Detect skin from URL query param ?flat, ?galaxy, ?matrix or localStorage
    let nextSkin: Skin = "matrix";
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("flat")) nextSkin = "flat";
    else if (searchParams.has("galaxy")) nextSkin = "galaxy";
    else if (searchParams.has("matrix")) nextSkin = "matrix";
    else {
      const storedSkin = localStorage.getItem("netphim-admin-skin");
      if (storedSkin === "flat" || storedSkin === "galaxy" || storedSkin === "matrix") {
        nextSkin = storedSkin;
      }
    }
    document.documentElement.dataset.adminSkin = nextSkin;
    setSkin(nextSkin);

    const storedLocale = localStorage.getItem("netphim-admin-locale");
    const nextLocale: Locale = storedLocale === "en" ? "en" : "vi";
    setLocale(nextLocale);
    document.documentElement.lang = nextLocale;
    const storedAccent =
      localStorage.getItem("netphim-admin-accent") || "blue";
    const accentOption =
      ACCENT_OPTIONS.find((item) => item.id === storedAccent) ||
      ACCENT_OPTIONS[0];
    document.documentElement.style.setProperty(
      "--admin-brand",
      accentOption.color,
    );
    document.documentElement.style.setProperty(
      "--admin-brand-strong",
      accentOption.strong,
    );
    setAccent(accentOption.id);
    const onFullscreen = () =>
      setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    void loadNotifications();
    void loadAdminProfile();
    const notificationTimer = window.setInterval(
      () => void loadNotifications(),
      60_000,
    );
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.clearInterval(notificationTimer);
    };
  }, [loadAdminProfile, loadNotifications]);

  useEffect(() => {
    setMobileNavigationOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  const markNotificationRead = async (item: AdminNotification) => {
    if (!item.readAt) {
      await adminFetch(`notifications/${item.id}/read`, {
        method: "PATCH",
      }).catch(() => undefined);
    }
    setOpenMenu(null);
    router.push(item.link || "/reports");
    void loadNotifications();
  };

  const markAllNotificationsRead = async () => {
    await adminFetch("notifications/read-all", { method: "PATCH" });
    await loadNotifications();
  };

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      )
        setOpenMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = darkMode ? "light" : "dark";
    document.documentElement.dataset.adminTheme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem("netphim-admin-theme", nextTheme);
    setDarkMode(nextTheme === "dark");
  };

  const toggleMenu = (menu: Exclude<TopbarMenu, null>) => {
    setOpenMenu((current) => (current === menu ? null : menu));
    if (menu === "notifications") void loadNotifications();
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setFullscreen(false);
    }
  };

  const chooseSkin = (nextSkin: Skin) => {
    document.documentElement.dataset.adminSkin = nextSkin;
    localStorage.setItem("netphim-admin-skin", nextSkin);
    setSkin(nextSkin);
  };

  const chooseAccent = (id: string) => {
    const option =
      ACCENT_OPTIONS.find((item) => item.id === id) || ACCENT_OPTIONS[0];
    document.documentElement.style.setProperty("--admin-brand", option.color);
    document.documentElement.style.setProperty(
      "--admin-brand-strong",
      option.strong,
    );
    localStorage.setItem("netphim-admin-accent", option.id);
    setAccent(option.id);
  };

  const chooseLocale = (nextLocale: Locale) => {
    localStorage.setItem("netphim-admin-locale", nextLocale);
    document.documentElement.lang = nextLocale;
    setLocale(nextLocale);
    setOpenMenu(null);
  };

  const toggleScreenshotProtection = () => {
    setScreenshotProtectionEnabled((current) => {
      const next = !current;
      localStorage.setItem(
        "netphim-admin-screenshot-protection",
        next ? "on" : "off",
      );
      return next;
    });
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    router.push(
      query ? `/movies?search=${encodeURIComponent(query)}` : "/movies",
    );
    setMobileNavigationOpen(false);
    setOpenMenu(null);
  };

  const adminName = adminProfile?.displayName || "Admin FlexPhim";
  const adminInitials =
    adminName
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "AD";

  if (pathname === "/login") {
    return (
      <html lang="vi" suppressHydrationWarning>
        <head>
          <title>Đăng nhập quản trị FlexPhim</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/flexphim-logo.svg" type="image/svg+xml" />
          <link rel="alternate icon" href="/flexphim-logo.png" type="image/png" />
        </head>
        <body className={`${ibmPlexSans.variable} ${plusJakartaSans.variable}`}>
          <AdminDevToolsGuard />
          <AdminAntiScreenshot enabled={screenshotProtectionEnabled} />
          {children}
        </body>
      </html>
    );
  }

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <title>Quản trị FlexPhim</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#263244" />
        <link rel="icon" href="/flexphim-logo.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/flexphim-logo.svg" />
        <link rel="alternate icon" href="/flexphim-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/flexphim-logo.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var oldPrefix=['cine','verse'].join(''),newPrefix='netphim',keys=[];for(var i=0;i<localStorage.length;i++){var key=localStorage.key(i);if(key&&key.indexOf(oldPrefix)===0)keys.push(key)}keys.forEach(function(key){var next=newPrefix+key.slice(oldPrefix.length);if(localStorage.getItem(next)===null)localStorage.setItem(next,localStorage.getItem(key));localStorage.removeItem(key)});var saved=localStorage.getItem('netphim-admin-theme');var theme=saved||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.adminTheme=theme;document.documentElement.style.colorScheme=theme;var sp=new URLSearchParams(window.location.search);var skin='matrix';if(sp.has('flat'))skin='flat';else if(sp.has('galaxy'))skin='galaxy';else if(sp.has('matrix'))skin='matrix';else{var sk=localStorage.getItem('netphim-admin-skin');if(sk==='flat'||sk==='galaxy'||sk==='matrix')skin=sk;}document.documentElement.dataset.adminSkin=skin;var locale=localStorage.getItem('netphim-admin-locale')||'vi';document.documentElement.lang=locale;var accents={blue:['#2878ee','#236dc9'],violet:['#7b70ef','#695fcb'],teal:['#02a98d','#028a74'],rose:['#f7577e','#dc4168'],amber:['#eaa638','#c9871e']};var accent=accents[localStorage.getItem('netphim-admin-accent')]||accents.blue;document.documentElement.style.setProperty('--admin-brand',accent[0]);document.documentElement.style.setProperty('--admin-brand-strong',accent[1])}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${ibmPlexSans.variable} ${plusJakartaSans.variable}`}>
        <AdminDevToolsGuard />
        <AdminSessionSync />
        <AdminAntiScreenshot enabled={screenshotProtectionEnabled} />
        <div className="admin-shell min-h-screen bg-[var(--admin-canvas)] lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside
            className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileNavigationOpen ? "translate-x-0" : "-translate-x-full"}`}
            aria-label="Điều hướng quản trị"
          >
            <div className="flex h-16 items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800/80">
              <Link
                href="/"
                className="group flex select-none items-center gap-2.5 transition-opacity hover:opacity-95"
                onClick={() => setMobileNavigationOpen(false)}
                title="Quản trị FlexPhim"
              >
                <div className="relative flex items-center justify-center">
                  <Image
                    src="/flexphim-logo.svg"
                    alt="FlexPhim Logo"
                    width={32}
                    height={32}
                    priority
                    unoptimized
                    className="h-8 w-8 object-contain drop-shadow-[0_0_10px_rgba(168,85,247,0.4)] transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/flexphim-logo.png";
                    }}
                  />
                </div>
                <div className="flex items-center">
                  <span className="text-[19px] font-extrabold uppercase tracking-tight text-slate-900 dark:text-white transition-colors">
                    Flex
                    <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 dark:from-violet-400 dark:via-fuchsia-400 dark:to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(168,85,247,0.35)]">
                      Phim
                    </span>
                  </span>
                  <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                    Admin
                  </span>
                </div>
              </Link>
              <button
                className="admin-topbar-button !text-slate-400 lg:hidden"
                onClick={() => setMobileNavigationOpen(false)}
                aria-label="Đóng menu"
              >
                <IconX size={18} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
              {NAV_GROUPS.map((group) => (
                <div key={group.label.en}>
                  <p className="mb-2 px-3 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                    {group.label[locale]}
                  </p>
                  <div className="space-y-1">
                    {group.items
                      .filter(
                        (item) =>
                          !item.permission ||
                          !adminProfile ||
                          adminProfile.permissions?.includes("*") ||
                          adminProfile.permissions?.includes(item.permission),
                      )
                      .map(({ href, label, icon: Icon, badge }) => {
                      const active = pathname === href;
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMobileNavigationOpen(false)}
                          className={`group flex h-10 items-center gap-3 rounded-lg px-3.5 text-[13px] font-medium transition-all duration-200 ease-in-out ${
                            active
                              ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs translate-x-1"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white hover:translate-x-1"
                          }`}
                        >
                          <Icon
                            size={18}
                            stroke={1.8}
                            className={
                              active
                                ? "text-white dark:text-black"
                                : "text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors"
                            }
                          />
                          <span>{label[locale]}</span>
                          {badge && (
                            <span
                              className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                active
                                  ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                                  : "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60"
                              }`}
                            >
                              {badge}
                            </span>
                          )}
                          {!badge && href !== "/" && (
                            <IconChevronRight
                              size={13}
                              className={`ml-auto transition-transform ${active ? "opacity-90" : "opacity-30 group-hover:opacity-70 group-hover:translate-x-0.5"}`}
                            />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Admin User Profile Bottom Strip */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 p-3">
              <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="relative">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 dark:bg-white text-[12px] font-bold text-white dark:text-black shadow-xs">
                    {adminInitials}
                  </span>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                </div>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                    {adminName}
                  </strong>
                  <small className="block truncate text-[11px] text-slate-400">
                    {roleLabel(adminProfile?.role)}
                  </small>
                </div>
                <a
                  href="http://localhost:3000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  title="Mở FlexPhim"
                >
                  <IconExternalLink size={16} />
                </a>
              </div>
            </div>
          </aside>

          {mobileNavigationOpen && (
            <button
              aria-label="Đóng menu"
              className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden"
              onClick={() => setMobileNavigationOpen(false)}
            />
          )}

          <div className="admin-workspace min-w-0 overflow-hidden bg-[var(--admin-canvas)]">
            <header
              ref={headerRef}
              className="admin-topbar sticky top-0 z-20 h-16 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md"
            >
              <div className="flex h-full items-center gap-3 px-4 sm:px-6">
                <button
                  className="admin-topbar-button"
                  onClick={() => setMobileNavigationOpen(!mobileNavigationOpen)}
                  aria-label="Thu gọn hoặc mở menu"
                >
                  <IconLayoutSidebar size={18} />
                </button>

                <form
                  onSubmit={submitSearch}
                  className="relative hidden w-64 sm:block"
                >
                  <IconSearch
                    size={16}
                    stroke={1.8}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/40 pl-9 pr-14 text-[12.5px] text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400 focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-slate-900 transition-all"
                    placeholder="Search..."
                    aria-label="Tìm phim"
                  />
                  <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                    Ctrl K
                  </kbd>
                </form>

                <div className="ml-auto flex items-center gap-2">
                  {/* 1. Dark Mode Toggle */}
                  <button
                    onClick={toggleTheme}
                    className="admin-topbar-button"
                    aria-label={
                      darkMode
                        ? "Chuyển sang giao diện sáng"
                        : "Chuyển sang giao diện tối"
                    }
                    aria-pressed={darkMode}
                    title={darkMode ? "Giao diện sáng" : "Giao diện tối"}
                  >
                    {darkMode ? <IconSun size={17} /> : <IconMoon size={17} />}
                  </button>

                  {/* 2. Language Switcher */}
                  <button
                    onClick={() => chooseLocale(locale === "vi" ? "en" : "vi")}
                    className="admin-topbar-button"
                    aria-label={locale === "vi" ? "Đổi ngôn ngữ" : "Switch language"}
                    title={
                      locale === "vi"
                        ? "Đang chọn Tiếng Việt (Bấm để đổi sang English)"
                        : "English selected (Click to switch to Vietnamese)"
                    }
                  >
                    <IconLanguage size={17} stroke={1.8} />
                  </button>

                  {/* 3. System Operations / Vận hành hệ thống */}
                  <Link
                    href="/operations"
                    className="admin-topbar-button relative"
                    title={
                      locale === "vi"
                        ? "Tác vụ & Vận hành hệ thống"
                        : "Operations & Tasks"
                    }
                  >
                    <IconActivity size={17} stroke={1.8} />
                  </Link>

                  {/* 4. Notification Bell with status dot */}
                  <button
                    onClick={() => toggleMenu("notifications")}
                    className="admin-topbar-button relative"
                    aria-label={locale === "vi" ? "Thông báo" : "Notifications"}
                    aria-expanded={openMenu === "notifications"}
                    title={locale === "vi" ? "Thông báo hệ thống" : "Notifications"}
                  >
                    <IconBell size={17} stroke={1.8} />
                    {notificationCount > 0 && (
                      <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </button>

                  {/* 5. Reviews / Bình luận & Phản hồi */}
                  <Link
                    href="/reviews"
                    className="admin-topbar-button"
                    title={
                      locale === "vi"
                        ? "Bình luận & Phản hồi"
                        : "Reviews & Feedback"
                    }
                  >
                    <IconMessageCircle size={17} stroke={1.8} />
                  </Link>

                  {/* 6. User Profile Avatar with Online Status Dot */}
                  <button
                    onClick={() => toggleMenu("profile")}
                    className="relative ml-1 flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-slate-200 dark:hover:ring-slate-700 transition-all cursor-pointer"
                    aria-label={
                      locale === "vi" ? "Menu tài khoản" : "Account menu"
                    }
                    aria-expanded={openMenu === "profile"}
                  >
                    <span className="relative grid h-8 w-8 place-items-center rounded-full bg-gradient-to-tr from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 text-white dark:text-black font-extrabold text-[12px] shadow-xs">
                      {adminInitials}
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                    </span>
                  </button>
                </div>

                {openMenu && (
                  <div
                    className="admin-popover absolute right-3 top-[58px] z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden"
                    role="dialog"
                    aria-label="Menu thanh công cụ"
                  >
                    {openMenu === "apps" && (
                      <>
                        <PopoverHeader
                          title={
                            locale === "vi"
                              ? "Ứng dụng quản trị"
                              : "Admin applications"
                          }
                          subtitle={
                            locale === "vi"
                              ? "Đi nhanh tới khu vực vận hành"
                              : "Jump to an operation area"
                          }
                        />
                        <div className="grid grid-cols-3 gap-2 p-3">
                          {NAV_GROUPS.flatMap((group) => group.items).map(
                            ({ href, label, icon: Icon }) => (
                              <Link
                                key={href}
                                href={href}
                                onClick={() => setOpenMenu(null)}
                                className="admin-app-tile"
                              >
                                <span className="admin-app-icon">
                                  <Icon size={19} stroke={1.7} />
                                </span>
                                <span>{label[locale]}</span>
                              </Link>
                            ),
                          )}
                        </div>
                      </>
                    )}

                    {openMenu === "notifications" && (
                      <>
                        <PopoverHeader
                          title={
                            locale === "vi" ? "Thông báo" : "Notifications"
                          }
                          subtitle={
                            locale === "vi"
                              ? `${notificationCount} thông báo chưa đọc`
                              : `${notificationCount} unread notifications`
                          }
                        />
                        <div className="max-h-[360px] overflow-y-auto">
                          {notificationsLoading && !notifications.length ? (
                            <p className="p-6 text-center text-[11px] text-[var(--admin-muted)]">
                              {locale === "vi"
                                ? "Đang tải thông báo..."
                                : "Loading notifications..."}
                            </p>
                          ) : (
                            notifications.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => void markNotificationRead(item)}
                                className={`admin-notification-item w-full text-left ${item.readAt ? "opacity-65" : ""}`}
                              >
                                <span
                                  className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${item.severity === "critical" ? "bg-rose-50 text-rose-600" : item.severity === "success" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}
                                >
                                  <IconAlertTriangle size={16} />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <strong className="block truncate text-[11px] text-[var(--admin-ink)]">
                                    {item.title}
                                  </strong>
                                  <small className="mt-0.5 line-clamp-2 block text-[10px] leading-4 text-[var(--admin-muted)]">
                                    {item.message}
                                  </small>
                                  <time className="mt-1 block text-[9px] text-[var(--admin-muted)]">
                                    {new Date(item.createdAt).toLocaleString(
                                      locale === "vi" ? "vi-VN" : "en-US",
                                    )}
                                  </time>
                                </span>
                                {!item.readAt && (
                                  <span
                                    className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--admin-brand)]"
                                    aria-label={
                                      locale === "vi" ? "Chưa đọc" : "Unread"
                                    }
                                  />
                                )}
                              </button>
                            ))
                          )}
                          {!notificationsLoading && !notifications.length && (
                            <p className="p-7 text-center text-[11px] text-[var(--admin-muted)]">
                              {locale === "vi"
                                ? "Chưa có thông báo."
                                : "No notifications."}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => void markAllNotificationsRead()}
                          disabled={!notificationCount}
                          className="admin-popover-footer w-full disabled:opacity-45"
                        >
                          <IconBellCheck size={14} />
                          {locale === "vi"
                            ? "Đánh dấu tất cả đã đọc"
                            : "Mark all as read"}
                        </button>
                      </>
                    )}

                    {openMenu === "palette" && (
                      <>
                        <PopoverHeader
                          title={
                            locale === "vi" ? "Màu giao diện" : "Theme color"
                          }
                          subtitle={
                            locale === "vi"
                              ? "Chọn màu nhấn cho trang quản trị"
                              : "Choose a control-room accent"
                          }
                        />
                        <div className="p-4">
                          <div className="grid grid-cols-5 gap-3">
                            {ACCENT_OPTIONS.map((option) => (
                              <button
                                key={option.id}
                                onClick={() => chooseAccent(option.id)}
                                className={`group grid place-items-center rounded-md border p-2 ${accent === option.id ? "border-[var(--admin-brand)] bg-[var(--admin-surface-muted)]" : "border-[var(--admin-line)]"}`}
                                title={option.label}
                                aria-label={option.label}
                                aria-pressed={accent === option.id}
                              >
                                <span
                                  className="grid h-8 w-8 place-items-center rounded-full text-white"
                                  style={{ background: option.color }}
                                >
                                  {accent === option.id && (
                                    <span className="h-2 w-2 rounded-full bg-white" />
                                  )}
                                </span>
                              </button>
                            ))}
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                if (darkMode) toggleTheme();
                              }}
                              className={`admin-theme-choice ${!darkMode ? "is-active" : ""}`}
                            >
                              <IconSun size={16} />
                              Sáng
                            </button>
                            <button
                              onClick={() => {
                                if (!darkMode) toggleTheme();
                              }}
                              className={`admin-theme-choice ${darkMode ? "is-active" : ""}`}
                            >
                              <IconMoon size={16} />
                              Tối
                            </button>
                          </div>

                          <div className="mt-4 border-t border-[var(--admin-line)] pt-3">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                              {locale === "vi" ? "Giao diện Paces Theme" : "Paces Theme Skin"}
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => chooseSkin("flat")}
                                className={`admin-theme-choice !h-9 text-[11px] ${skin === "flat" ? "is-active" : ""}`}
                              >
                                Flat
                              </button>
                              <button
                                type="button"
                                onClick={() => chooseSkin("galaxy")}
                                className={`admin-theme-choice !h-9 text-[11px] ${skin === "galaxy" ? "is-active" : ""}`}
                              >
                                Galaxy
                              </button>
                              <button
                                type="button"
                                onClick={() => chooseSkin("matrix")}
                                className={`admin-theme-choice !h-9 text-[11px] ${skin === "matrix" ? "is-active" : ""}`}
                              >
                                Matrix
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {openMenu === "profile" && (
                      <>
                        <div className="flex items-center gap-3 border-b border-[var(--admin-line)] p-4">
                          <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#f9bf59] to-[#f7577e] text-[12px] font-extrabold text-white">
                            {adminInitials}
                          </span>
                          <span className="min-w-0">
                            <strong className="block truncate text-[12px] text-[var(--admin-ink)]">
                              {adminName}
                            </strong>
                            <small className="block truncate text-[10px] text-[var(--admin-muted)]">
                              {adminProfile?.email || "Đang xác thực..."}
                            </small>
                          </span>
                        </div>
                        <div className="p-2">
                          <ProfileLink
                            href="/users"
                            icon={IconUser}
                            label={
                              locale === "vi"
                                ? "Tài khoản quản trị"
                                : "Admin account"
                            }
                            close={() => setOpenMenu(null)}
                          />
                          <ProfileLink
                            href="/configuration"
                            icon={IconSettings2}
                            label={
                              locale === "vi"
                                ? "Cấu hình hệ thống"
                                : "System configuration"
                            }
                            close={() => setOpenMenu(null)}
                          />
                          <ProfileLink
                            href="/audit"
                            icon={IconHistory}
                            label={
                              locale === "vi"
                                ? "Lịch sử thao tác"
                                : "Activity history"
                            }
                            close={() => setOpenMenu(null)}
                          />
                          <button
                            type="button"
                            onClick={toggleScreenshotProtection}
                            className="admin-profile-link w-full"
                            aria-pressed={screenshotProtectionEnabled}
                          >
                            {screenshotProtectionEnabled ? (
                              <IconCameraOff size={17} />
                            ) : (
                              <IconCamera size={17} />
                            )}
                            <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                              <span>
                                {locale === "vi"
                                  ? "Chống chụp màn hình"
                                  : "Screenshot protection"}
                              </span>
                              <small className="text-[9px] font-bold uppercase text-[var(--admin-muted)]">
                                {screenshotProtectionEnabled
                                  ? locale === "vi"
                                    ? "Bật"
                                    : "On"
                                  : locale === "vi"
                                    ? "Tắt"
                                    : "Off"}
                              </small>
                            </span>
                          </button>
                          <a
                            href="http://localhost:3000"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-profile-link"
                          >
                            <IconExternalLink size={17} />
                            {locale === "vi" ? "Mở FlexPhim" : "Open FlexPhim"}
                          </a>
                          <button
                            type="button"
                            onClick={async () => {
                              endAdminSession();
                              await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
                              window.location.assign("/login");
                            }}
                            className="admin-profile-link w-full"
                          >
                            <IconLogout size={17} />
                            {locale === "vi" ? "Đăng xuất" : "Sign out"}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 border-t border-[var(--admin-line)] p-3 lg:hidden">
                          <button
                            onClick={() => chooseLocale("vi")}
                            className="admin-theme-choice"
                          >
                            VI
                          </button>
                          <button
                            onClick={() => chooseLocale("en")}
                            className="admin-theme-choice"
                          >
                            EN
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </header>

            <main className="mx-auto max-w-[1680px] px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}

function PopoverHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="admin-popover-header">
      <strong>{title}</strong>
      <small>{subtitle}</small>
    </div>
  );
}

type MenuIcon = typeof IconUser;

function ProfileLink({
  href,
  icon: Icon,
  label,
  close,
}: {
  href: string;
  icon: MenuIcon;
  label: string;
  close: () => void;
}) {
  return (
    <Link href={href} onClick={close} className="admin-profile-link">
      <Icon size={17} stroke={1.7} />
      {label}
    </Link>
  );
}
