"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Home,
  Tv,
  Film as FilmIcon,
  Sparkles,
  Users,
  BookmarkCheck,
  BookOpen,
  History,
  ChevronDown,
  X,
  User,
  LogOut,
  Clapperboard,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { GENRES_LIST, COUNTRIES_LIST, CountryFlagImage } from "./Navbar";
import { cardFont } from "@/lib/fonts";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SIDEBAR_MAIN_ITEMS = [
  { title: "Trang chủ", href: "/", icon: Home },
  { title: "Phim Bộ", href: "/films/series", icon: Tv },
  { title: "Phim Lẻ", href: "/films/single", icon: FilmIcon },
  { title: "Hoạt Hình", href: "/films/anime", icon: Clapperboard },
  { title: "Xem Chung", href: "/watch-party", icon: Users },
  { title: "Diễn Viên", href: "/actors", icon: User },
];

const SIDEBAR_PERSONAL_ITEMS = [
  { title: "Tủ phim", href: "/watchlist", icon: BookmarkCheck },
  { title: "Thư viện", href: "/library", icon: BookOpen },
  { title: "Lịch sử xem", href: "/history", icon: History },
];

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [showGenres, setShowGenres] = useState(false);
  const [showCountries, setShowCountries] = useState(false);

  // Lock background body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Minimalist Black & White Sheet Drawer */}
      <aside className={`${cardFont.className} fixed left-0 top-0 bottom-0 h-[100dvh] w-[88vw] max-w-[320px] bg-[#0a0c10] border-r border-white/10 z-[65] overflow-y-auto overscroll-contain touch-pan-y scrollbar-none lg:hidden shadow-[0_0_40px_rgba(0,0,0,0.9)] animate-in slide-in-from-left duration-250`}>
        {/* Sticky Header */}
        <div className="sticky top-0 bg-[#0a0c10]/95 backdrop-blur-xl px-5 py-4 border-b border-white/10 flex items-center justify-between z-20">
          <Link
            href="/"
            className="flex items-center space-x-2"
            onClick={onClose}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cinephim-logo.png"
              alt="NetPhim Logo"
              className="h-7 w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/logo.png";
              }}
            />
            <span className="text-white text-lg font-black tracking-tight font-sans">
              Net<span className="text-violet-400">Phim</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors active:scale-95 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Profile Card (Visible when logged in) */}
        {user && (
          <div className="p-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    user.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=10b981&color=ffffff&size=80`
                  }
                  alt={user.displayName || user.username}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-md shrink-0"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=10b981&color=ffffff&size=80`;
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-xs text-white truncate">
                    {user.displayName || user.username}
                  </p>
                  <p className="text-[11px] text-neutral-400 truncate">
                    @{user.username}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <Link
                  href={`/user/${encodeURIComponent(user.username)}`}
                  className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold text-white hover:bg-white/20 transition-all text-center active:scale-95"
                  onClick={onClose}
                >
                  <User size={13} />
                  <span>Cá nhân</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-neutral-300 hover:bg-white/10 hover:text-white transition-all text-center active:scale-95 cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Thoát</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Navigation List */}
        <nav className="px-3 py-4 space-y-5 pb-36">
          {/* Main Navigation Group */}
          <div>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Khám phá
            </p>
            <div className="space-y-1">
              {SIDEBAR_MAIN_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className={cn(
                      "flex min-h-11 items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all",
                      isActive
                        ? "bg-white/10 border border-white/15 text-white font-bold shadow-sm"
                        : "text-neutral-300 hover:bg-white/5 hover:text-white",
                    )}
                    onClick={onClose}
                  >
                    <item.icon
                      size={17}
                      className={cn(
                        isActive ? "text-white" : "text-neutral-400",
                      )}
                      strokeWidth={2}
                    />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Personal Group */}
          <div>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Thư viện cá nhân
            </p>
            <div className="space-y-1">
              {SIDEBAR_PERSONAL_ITEMS.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className={cn(
                      "flex min-h-11 items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all",
                      isActive
                        ? "bg-white/10 border border-white/15 text-white font-bold shadow-sm"
                        : "text-neutral-300 hover:bg-white/5 hover:text-white",
                    )}
                    onClick={onClose}
                  >
                    <item.icon
                      size={17}
                      className={cn(
                        isActive ? "text-white" : "text-neutral-400",
                      )}
                      strokeWidth={2}
                    />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Genres Collapsible Grid */}
          <div>
            <button
              type="button"
              onClick={() => setShowGenres(!showGenres)}
              className="flex min-h-11 w-full items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-neutral-300 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <Sparkles size={17} className="text-neutral-400" />
                <span>Thể loại phim</span>
              </div>
              <ChevronDown
                size={15}
                className={cn(
                  "transition-transform duration-200 text-neutral-500",
                  showGenres && "rotate-180 text-white",
                )}
              />
            </button>

            {showGenres && (
              <div className="mt-2 grid grid-cols-2 gap-1.5 px-1 pt-1 animate-in fade-in duration-200">
                {GENRES_LIST.map((genre) => (
                  <Link
                    key={genre.slug}
                    href={`/genre/${genre.slug}`}
                    className={cn(
                      "px-3 py-2 rounded-lg text-[11px] font-medium transition-all truncate border",
                      pathname === `/genre/${genre.slug}`
                        ? "bg-white/15 border-white/30 text-white font-bold"
                        : "border-white/5 bg-white/[0.02] text-neutral-400 hover:text-white hover:bg-white/10",
                    )}
                    onClick={onClose}
                  >
                    {genre.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Countries Collapsible Grid */}
          <div>
            <button
              type="button"
              onClick={() => setShowCountries(!showCountries)}
              className="flex min-h-11 w-full items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-neutral-300 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <Globe size={17} className="text-neutral-400" />
                <span>Quốc gia</span>
              </div>
              <ChevronDown
                size={15}
                className={cn(
                  "transition-transform duration-200 text-neutral-500",
                  showCountries && "rotate-180 text-white",
                )}
              />
            </button>

            {showCountries && (
              <div className="mt-2 grid grid-cols-2 gap-1.5 px-1 pt-1 animate-in fade-in duration-200">
                {COUNTRIES_LIST.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/country/${c.slug}`}
                    className={cn(
                      "flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border truncate",
                      pathname === `/country/${c.slug}`
                        ? "bg-white/15 border-white/30 text-white font-bold"
                        : "border-white/5 bg-white/[0.02] text-neutral-400 hover:text-white hover:bg-white/10",
                    )}
                    onClick={onClose}
                  >
                    <CountryFlagImage
                      code={c.code}
                      label={c.label}
                      className="w-4 h-3 object-cover rounded-[2px] shrink-0"
                    />
                    <span className="truncate">{c.label}</span>
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
