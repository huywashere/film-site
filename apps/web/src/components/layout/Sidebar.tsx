"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Tv,
  Film as FilmIcon,
  Grid3x3,
  Hash,
  Users,
  BookOpen,
  History,
  Bookmark,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Compact Sidebar Navigation Items (như Onflix) ────────────
const SIDEBAR_ITEMS = [
  {
    title: "Trang chủ",
    href: "/",
    icon: Home,
  },
  {
    title: "Phim Hàn",
    href: "/country/han-quoc",
    icon: Tv,
  },
  {
    title: "Phim Trung",
    href: "/country/trung-quoc",
    icon: Tv,
  },
  {
    title: "Duyệt Tìm",
    href: "/films",
    icon: Grid3x3,
  },
  {
    title: "Chủ đề",
    href: "/genres",
    icon: Hash,
  },
  {
    title: "Xem sau",
    href: "/watchlist",
    icon: Bookmark,
  },
  {
    title: "Xem Chung",
    href: "/watch-party",
    icon: Users,
  },
  {
    title: "Thư viện",
    href: "/library",
    icon: BookOpen,
  },
  {
    title: "Lịch sử",
    href: "/history",
    icon: History,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside 
      className="sidebar-transparent hidden lg:flex fixed left-0 top-16 bottom-0 w-20 flex-col items-center z-40 py-6 overflow-y-auto scrollbar-hide" 
      style={{ 
        background: 'transparent',
        backgroundColor: 'transparent',
        backdropFilter: 'none',
        boxShadow: 'none'
      }}
    >
      {/* Navigation Items */}
      <nav className="flex flex-col items-center space-y-2 w-full px-2">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full py-3 px-2 rounded-xl text-[10px] font-semibold transition-all group relative",
                isActive
                  ? "text-blue-400"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
              title={item.title}
            >
              {/* Active Indicator Bar (bên trái) */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full shadow-lg shadow-blue-500/50" />
              )}
              
              {/* Icon */}
              <item.icon
                size={22}
                className={cn(
                  "mb-1.5 transition-colors",
                  isActive ? "text-blue-400" : "text-neutral-400 group-hover:text-white"
                )}
                strokeWidth={2}
              />
              
              {/* Label */}
              <span className={cn(
                "text-center leading-tight font-semibold",
                isActive ? "text-blue-400" : "text-neutral-400 group-hover:text-white"
              )}>
                {item.title}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
