"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Popcorn,
  Layers,
  History,
  Clapperboard,
  Drama,
  LayoutGrid,
  TvMinimalPlay,
  MonitorPlay,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { cardFont } from "@/lib/fonts";

function TelegramIcon({
  className,
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M9.78 18.65l.28-4.2 7.64-6.88c.34-.31-.07-.48-.52-.19l-9.45 5.95-4.07-1.27c-.89-.28-.91-.88.19-1.31L19.8 4.63c.74-.28 1.39.18 1.15 1.31l-2.7 12.72c-.2 1-.79 1.25-1.6.78l-4.52-3.33-2.18 2.1c-.24.24-.44.44-.9.44z" />
    </svg>
  );
}

const SIDEBAR_ITEMS = [
  { title: "Trang chủ", href: "/", icon: Home },
  { title: "Phim Hàn", href: "/country/han-quoc", icon: TvMinimalPlay },
  { title: "Phim Trung", href: "/country/trung-quoc", icon: MonitorPlay },
  { title: "Thế Giới Phim", href: "/genres", icon: LayoutGrid },
  { title: "Xem Chung", href: "/watch-party", icon: Popcorn },
  { title: "Bộ Sưu Tập", href: "/watchlist", icon: Layers },
  { title: "Lịch Sử", href: "/history", icon: History },
  {
    title: "Kênh Telegram",
    href: "https://t.me/cinephim_official",
    isExternal: true,
    icon: TelegramIcon,
    isSpecial: true,
  },
];

const W = 60; // Slim width in px

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [scrolledPastBanner, setScrolledPastBanner] = useState(false);
  const homeThresholdRef = useRef<HTMLDivElement>(null);

  const isHomePage = pathname === "/";
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isUserPage =
    pathname.startsWith("/user") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings");

  useEffect(() => {
    try {
      const v = localStorage.getItem("sidebar-collapsed");
      if (v !== null) setCollapsed(v === "true");
    } catch (_e) {
      // ignore localStorage errors
    }
  }, []);

  useEffect(() => {
    if (!isHomePage) {
      setScrolledPastBanner(true);
      return;
    }

    setScrolledPastBanner(false);
    const threshold = homeThresholdRef.current;
    if (!threshold) return;

    const observer = new IntersectionObserver(([entry]) => {
      setScrolledPastBanner(!entry.isIntersecting);
    });
    observer.observe(threshold);
    return () => observer.disconnect();
  }, [isHomePage]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("sidebar-collapsed", String(next));
    } catch (_e) {
      // ignore localStorage errors
    }
  };

  const handleMouseEnter = (href: string) => {
    if (href.startsWith("http")) return;
    try {
      router.prefetch(href);
    } catch (_e) {
      // ignore prefetch errors
    }
  };

  const isVisible = !isHomePage || scrolledPastBanner;

  if (isAuthPage || isUserPage) return null;

  return (
    <>
      {isHomePage && (
        <div
          ref={homeThresholdRef}
          aria-hidden="true"
          className="absolute left-0 top-[350px] h-px w-px pointer-events-none"
        />
      )}

      {/* ── VERTICALLY CENTERED SLIM SIDEBAR ── */}
      <aside
        className={cn(
          cardFont.className,
          "hidden lg:flex fixed left-0 top-16 bottom-0 z-40 flex-col items-center justify-center transition-all duration-300 ease-in-out pointer-events-none",
          isVisible && !collapsed
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-full",
        )}
        style={{ width: W }}
      >
        <div className="flex flex-col items-center justify-center py-4 px-1.5 bg-transparent pointer-events-auto gap-3.5 my-auto">
          {/* Top Collapse Button (Mũi tên thu gọn) */}
          <button
            onClick={toggle}
            aria-label="Thu gọn thanh điều hướng"
            title="Thu gọn menu"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer mb-0.5"
          >
            <ChevronLeft size={20} strokeWidth={2.2} />
          </button>

          {/* Navigation Icon List */}
          {SIDEBAR_ITEMS.map((item) => {
            const isActive =
              !item.isExternal &&
              (pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href)));

            const Icon = item.icon;

            const content = (
              <>
                {/* Active Indicator Bar */}
                {isActive && (
                  <span
                    className="absolute -left-1.5 top-1/2 -translate-y-1/2 rounded-r-full bg-white z-20"
                    style={{ width: 3, height: 18 }}
                  />
                )}

                {/* Active Background Pill */}
                {isActive ? (
                  <span className="absolute inset-0 rounded-xl bg-white/10 z-0" />
                ) : (
                  <span className="absolute inset-0 rounded-xl bg-transparent group-hover:bg-white/[0.06] transition-colors z-0" />
                )}

                {/* Icon */}
                <Icon
                  size={20}
                  className={cn(
                    "relative z-10 transition-transform group-hover:scale-110",
                    item.isSpecial &&
                    !isActive &&
                    "text-[#229ED9] group-hover:text-[#38bdf8]",
                  )}
                />

                {/* Floating Tooltip on Hover */}
                <span className="absolute left-full ml-3.5 px-3 py-1.5 rounded-xl bg-neutral-950 border border-white/15 text-xs font-bold text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 shadow-2xl z-30 translate-x-1 group-hover:translate-x-0">
                  {item.title}
                </span>
              </>
            );

            if (item.isExternal) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group cursor-pointer text-white/40 hover:text-white",
                  )}
                >
                  {content}
                </a>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onMouseEnter={() => handleMouseEnter(item.href)}
                className={cn(
                  "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group cursor-pointer",
                  isActive
                    ? "text-white font-bold"
                    : "text-white/40 hover:text-white",
                )}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </aside>

      {/* ── EDGE RE-OPEN BUTTON WHEN COLLAPSED ── */}
      {collapsed && isVisible && (
        <button
          onClick={toggle}
          aria-label="Mở thanh điều hướng"
          title="Mở rộng menu"
          className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-40 p-2.5 bg-transparent text-white/60 hover:text-white transition-all duration-200 cursor-pointer hover:scale-110"
        >
          <ChevronRight size={20} strokeWidth={2.2} />
        </button>
      )}
    </>
  );
}
