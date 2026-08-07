"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Tv,
  Film as FilmIcon,
  Sparkles,
  Grid3x3,
  Hash,
  Users,
  BookmarkCheck,
  BookOpen,
  History,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GENRES_LIST } from "./Navbar";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SIDEBAR_MAIN_ITEMS = [
  { title: "Trang chủ", href: "/", icon: Home },
  { title: "Phim Hàn", href: "/country/han-quoc", icon: Tv },
  { title: "Phim Trung", href: "/country/trung-quoc", icon: Tv },
  { title: "Duyệt Tìm", href: "/films", icon: Grid3x3 },
  { title: "Chủ đề", href: "/genres", icon: Hash },
  { title: "Xem Chung", href: "/watch-party", icon: Users },
  { title: "Xem sau", href: "/watchlist", icon: BookmarkCheck },
  { title: "Thư viện", href: "/library", icon: BookOpen },
  { title: "Lịch sử", href: "/history", icon: History },
];

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [showGenres, setShowGenres] = useState(false);

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title],
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-neutral-950/98 backdrop-blur-xl border-r border-white/10 flex-col z-50 overflow-y-auto scrollbar-thin lg:hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-3"
            onClick={onClose}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cinephim-logo.png"
              alt="CinePhim Logo"
              className="h-8 sm:h-9 w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/logo.png";
              }}
            />
          </Link>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} className="text-neutral-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {SIDEBAR_MAIN_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-neutral-300 hover:bg-white/5 hover:text-white",
                )}
                onClick={onClose}
              >
                <item.icon
                  size={22}
                  className={cn(
                    isActive ? "text-white" : "text-neutral-400",
                  )}
                  strokeWidth={2}
                />
                <span>{item.title}</span>
              </Link>
            );
          })}

          {/* Genres */}
          <div className="pt-4 mt-4 border-t border-white/10">
            <button
              onClick={() => setShowGenres(!showGenres)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold text-neutral-300 hover:bg-white/5 hover:text-white transition-all"
            >
              <div className="flex items-center space-x-3">
                <Sparkles
                  size={20}
                  className="text-neutral-400"
                  strokeWidth={2}
                />
                <span>Thể loại</span>
              </div>
              <ChevronDown
                size={16}
                className={cn(
                  "transition-transform text-neutral-500",
                  showGenres ? "rotate-180" : "",
                )}
              />
            </button>

            {showGenres && (
              <div className="mt-2 ml-10 space-y-1 max-h-64 overflow-y-auto scrollbar-thin">
                {GENRES_LIST.slice(0, 12).map((genre) => (
                  <Link
                    key={genre.slug}
                    href={`/genre/${genre.slug}`}
                    className={cn(
                      "block px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
                      pathname === `/genre/${genre.slug}`
                        ? "bg-white/10 text-white"
                        : "text-neutral-400 hover:bg-white/5 hover:text-white",
                    )}
                    onClick={onClose}
                  >
                    {genre.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}
