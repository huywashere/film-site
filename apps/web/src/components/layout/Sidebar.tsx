"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Tv,
  Flame,
  Popcorn,
  BookmarkCheck,
  Library,
  History,
  Star,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

function TelegramIcon({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .54-1.43.53-.47-.01-1.37-.26-2.04-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.74 6.66-2.89 8.01-3.46 3.81-1.6 4.6-1.88 5.12-1.89.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.16-.04.31z" />
    </svg>
  );
}

const SIDEBAR_ITEMS = [
  { title: "Trang chủ", href: "/", icon: Home },
  { title: "Duyệt Phim", href: "/films", icon: Tv },
  { title: "Thế Giới Phim", href: "/genres", icon: Flame },
  { title: "Phim Hot", href: "/country/han-quoc", icon: Star },
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
          "hidden lg:flex fixed left-0 top-16 bottom-0 z-40 flex-col items-center justify-center transition-all duration-300 ease-in-out pointer-events-none",
          isVisible && !collapsed
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-full",
        )}
        style={{ width: W }}
      >
        <div className="flex flex-col items-center justify-center py-4 px-1.5 bg-neutral-950/85 backdrop-blur-xl border border-l-0 border-white/10 rounded-r-2xl shadow-2xl pointer-events-auto gap-3.5 my-auto">
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
                  <motion.span
                    layoutId="sidebar-active-bar"
                    className="absolute -left-1.5 top-1/2 -translate-y-1/2 rounded-r-full bg-white z-20"
                    style={{ width: 3, height: 18 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Active Background Pill */}
                {isActive ? (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 rounded-xl bg-white/10 z-0"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                ) : (
                  <span className="absolute inset-0 rounded-xl bg-transparent group-hover:bg-white/[0.06] transition-colors z-0" />
                )}

                {/* Icon */}
                <Icon
                  size={20}
                  className={cn(
                    "relative z-10 transition-transform group-hover:scale-110",
                    item.isSpecial && !isActive && "text-[#229ED9] group-hover:text-[#38bdf8]",
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
          className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-40 p-2.5 bg-neutral-950/90 border border-l-0 border-white/20 rounded-r-xl text-white/60 hover:text-white hover:bg-neutral-900 transition-all duration-200 shadow-2xl cursor-pointer hover:scale-110 hover:pr-3.5"
        >
          <ChevronRight size={20} strokeWidth={2.2} />
        </button>
      )}
    </>
  );
}
