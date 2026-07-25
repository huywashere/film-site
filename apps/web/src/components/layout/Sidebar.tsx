"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Tv,
  Grid3x3,
  Hash,
  Users,
  BookOpen,
  History,
  Bookmark,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const SIDEBAR_ITEMS = [
  { title: "Trang chủ", href: "/", icon: Home },
  { title: "Phim Hàn", href: "/country/han-quoc", icon: Tv },
  { title: "Phim Trung", href: "/country/trung-quoc", icon: Tv },
  { title: "Duyệt Tìm", href: "/films", icon: Grid3x3 },
  { title: "Chủ đề", href: "/genres", icon: Hash },
  { title: "Xem sau", href: "/watchlist", icon: Bookmark },
  { title: "Xem Chung", href: "/watch-party", icon: Users },
  { title: "Thư viện", href: "/library", icon: BookOpen },
  { title: "Lịch sử", href: "/history", icon: History },
];

const W = 72; // sidebar width in px

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("sidebar-collapsed");
      if (v !== null) setCollapsed(v === "true");
    } catch {}
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("sidebar-collapsed", String(next));
    } catch {}
  };

  return (
    <>
      {/* ── SIDEBAR — fixed, truly transparent, floats over content ── */}
      <aside
        className="hidden lg:block fixed left-0 top-16 bottom-0 z-40 overflow-hidden pointer-events-none"
        style={{
          width: collapsed ? 0 : W,
          transition: "width 0.25s ease",
          background: "none",
          backgroundColor: "transparent",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          boxShadow: "none",
          border: "none",
        }}
      >
        <nav
          className="flex flex-col items-center justify-center gap-0.5 scrollbar-hide h-full pointer-events-auto"
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
                title={item.title}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-xl py-2.5 transition-all duration-150 group",
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
                  size={20}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  className="relative z-10"
                />
                <span className="relative z-10 text-[9.5px] font-medium leading-none text-center mt-[3px]">
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ── TOGGLE — thin vertical tab, glued to right edge of sidebar ── */}
      <button
        onClick={toggle}
        aria-label={collapsed ? "Mở menu" : "Đóng menu"}
        className="hidden lg:flex fixed z-50 items-center justify-center rounded-r-md transition-all duration-200 text-white/30 hover:text-white/80"
        style={{
          top: "50vh",
          transform: "translateY(-50%)",
          left: collapsed ? 0 : W,
          width: 14,
          height: 44,
          transition: "left 0.25s ease",
          background: "transparent",
          backgroundColor: "transparent",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          border: "none",
        }}
      >
        {collapsed ? (
          <ChevronRight size={9} strokeWidth={2.5} />
        ) : (
          <ChevronLeft size={9} strokeWidth={2.5} />
        )}
      </button>
    </>
  );
}
