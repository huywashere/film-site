"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Menu,
  Home,
  Tv,
  Flame,
  Popcorn,
  BookmarkCheck,
  Library,
  History,
  Zap,
  Star,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

const SIDEBAR_ITEMS = [
  { title: "Trang chủ", href: "/", icon: Home },
  { title: "Duyệt Phim", href: "/films", icon: Tv },
  { title: "Thế Giới Phim", href: "/genres", icon: Flame },
  { title: "Phim Hot", href: "/country/han-quoc", icon: Star },
  { title: "Xem Chung", href: "/watch-party", icon: Popcorn },
  { title: "Bộ Sưu Tập", href: "/watchlist", icon: Layers },
  { title: "Lịch Sử", href: "/history", icon: History },
  { title: "CineVIP 4K", href: "/vip", icon: Zap, isSpecial: true },
];

const W = 64; // Slim reference width in px

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
      
      {/* ── ULTRA-CLEAN SLIM VERTICAL SIDEBAR ── */}
      <aside
        className={cn(
          "hidden lg:block fixed left-0 top-16 bottom-0 z-40 overflow-visible transition-all duration-500 ease-out",
          isVisible
            ? "opacity-100 translate-x-0 pointer-events-auto"
            : "opacity-0 -translate-x-6 pointer-events-none",
        )}
        style={{
          width: collapsed ? 0 : W,
          background: "none",
          backgroundColor: "transparent",
        }}
      >
        <nav
          className="flex flex-col items-center justify-start py-6 gap-5 scrollbar-hide h-full pointer-events-auto"
          style={{ width: W }}
        >
          {/* Top Hamburger Menu Icon */}
          <button
            onClick={toggle}
            aria-label="Toggle navigation menu"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer mb-2"
          >
            <Menu size={20} strokeWidth={2} />
          </button>

          {/* Navigation Icon List */}
          {SIDEBAR_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onMouseEnter={() => handleMouseEnter(item.href)}
                className={cn(
                  "relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group cursor-pointer",
                  isActive
                    ? "text-white font-bold"
                    : item.isSpecial
                      ? "text-amber-400 hover:text-amber-300"
                      : "text-white/40 hover:text-white",
                )}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-bar"
                    className="absolute -left-1 top-1/2 -translate-y-1/2 rounded-r-full bg-white z-20"
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
                  strokeWidth={isActive ? 2.2 : 1.75}
                  className={cn(
                    "relative z-10 transition-transform group-hover:scale-110",
                    item.isSpecial && !isActive && "fill-amber-400/20",
                  )}
                />

                {/* Floating Tooltip on Hover */}
                <span className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-neutral-950 border border-white/15 text-xs font-bold text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 shadow-2xl z-30 translate-x-1 group-hover:translate-x-0">
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
