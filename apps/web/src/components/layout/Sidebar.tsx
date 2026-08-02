"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Heart,
  Film,
  Clapperboard,
  Sparkles,
  BookmarkCheck,
  Popcorn,
  Library,
  History,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

const SIDEBAR_ITEMS = [
  { title: "Trang chủ", href: "/", icon: Home },
  { title: "Phim Hàn", href: "/country/han-quoc", icon: Heart },
  { title: "Phim Trung", href: "/country/trung-quoc", icon: Film },
  { title: "Duyệt Tìm", href: "/films", icon: Clapperboard },
  { title: "Chủ đề", href: "/genres", icon: Sparkles },
  { title: "Xem sau", href: "/watchlist", icon: BookmarkCheck },
  { title: "Xem Chung", href: "/watch-party", icon: Popcorn },
  { title: "Thư viện", href: "/library", icon: Library },
  { title: "Lịch sử", href: "/history", icon: History },
];

const W = 72; // sidebar width in px

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [scrolledPastBanner, setScrolledPastBanner] = useState(false);
  const homeThresholdRef = useRef<HTMLDivElement>(null);

  const isHomePage = pathname === "/";
  const isAuthPage = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    try {
      const v = localStorage.getItem("sidebar-collapsed");
      if (v !== null) setCollapsed(v === "true");
    } catch (_e) {
      // ignore localStorage errors
    }
  }, []);

  // Only the home hero hides this navigation. All other pages keep it fixed.
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

  const isVisible = !isHomePage || scrolledPastBanner;

  if (isAuthPage) return null;

  return (
    <>
      {isHomePage && (
        <div
          ref={homeThresholdRef}
          aria-hidden="true"
          className="absolute left-0 top-[350px] h-px w-px pointer-events-none"
        />
      )}
      {/* ── SIDEBAR — fixed, truly transparent, floats over content when scrolled past banner ── */}
      <aside
        className={cn(
          "hidden lg:block fixed left-0 top-16 bottom-0 z-40 overflow-hidden transition-all duration-500 ease-out",
          isVisible
            ? "opacity-100 translate-x-0 pointer-events-auto"
            : "opacity-0 -translate-x-6 pointer-events-none",
        )}
        style={{
          width: collapsed ? 0 : W,
          background: "none",
          backgroundColor: "transparent",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          boxShadow: "none",
          border: "none",
        }}
      >
        <nav
          className="flex flex-col items-center justify-center gap-2 scrollbar-hide h-full pointer-events-auto"
          style={{ width: W }}
        >
          {SIDEBAR_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                title={item.title}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-xl py-3.5 transition-all duration-150 group",
                  isActive ? "text-white" : "text-white/40 hover:text-white/80",
                )}
                style={{ width: W - 12 }}
              >
                {/* Active: blue vertical bar centred on the item */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-blue-500"
                    style={{ width: 3, height: 20 }}
                  />
                )}

                {/* Hover background pill */}
                <span
                  className={cn(
                    "absolute inset-0 rounded-xl transition-all duration-150",
                    isActive
                      ? "bg-blue-500/10"
                      : "bg-transparent group-hover:bg-white/[0.04]",
                  )}
                />

                <item.icon
                  size={21}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  className="relative z-10"
                />
                <span className="relative z-10 text-[10px] font-medium leading-none text-center mt-[5px]">
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ── TOGGLE — Visible glassy circle button for collapsing/expanding sidebar ── */}
      <button
        onClick={toggle}
        aria-label={collapsed ? "Mở menu" : "Đóng menu"}
        title={
          collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"
        }
        className={cn(
          "hidden lg:flex fixed z-50 items-center justify-center cursor-pointer active:scale-90 group transition-all duration-300",
          "w-8 h-8 rounded-full bg-[#12141c]/90 text-white/90 hover:text-white border border-white/20 hover:border-white/40 shadow-xl backdrop-blur-md hover:bg-white/20",
          isVisible
            ? "opacity-90 hover:opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-75 pointer-events-none",
        )}
        style={{
          top: "135px",
          left: collapsed ? "14px" : `${W - 14}px`,
          transition:
            "left 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out, transform 0.3s ease-out, background-color 0.2s ease, border-color 0.2s ease",
        }}
      >
        <span
          className={cn(
            "transition-transform duration-300 flex items-center justify-center text-white/90 group-hover:text-white",
            collapsed ? "rotate-180" : "rotate-0",
          )}
        >
          <ChevronLeft size={16} strokeWidth={2.2} />
        </span>
      </button>
    </>
  );
}
