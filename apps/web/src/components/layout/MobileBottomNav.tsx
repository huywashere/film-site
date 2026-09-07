"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bookmark, History, Home, LayoutGrid, User } from "lucide-react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import { cn } from "@/lib/utils";
import { cardFont } from "@/lib/fonts";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [isHidden, setIsHidden] = useState(false);
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (currentScrollY) => {
    const delta = currentScrollY - (scrollY.getPrevious() ?? currentScrollY);
    if (Math.abs(delta) < 6) return;
    setIsHidden(currentScrollY > 70 && delta > 0);
  });

  const isProfileRoute =
    pathname === "/user" ||
    pathname.startsWith("/user/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/");

  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  const navItems = [
    {
      label: "Trang chủ",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      label: "Duyệt phim",
      href: "/genres",
      icon: LayoutGrid,
      isActive: pathname === "/genres" || pathname.startsWith("/genre/"),
    },
    {
      label: "Lưu phim",
      href: "/watchlist",
      icon: Bookmark,
      isActive: pathname === "/watchlist",
    },
    {
      label: "Lịch sử",
      href: "/history",
      icon: History,
      isActive: pathname === "/history",
    },
  ];

  return (
    <nav
      aria-label="Điều hướng nhanh"
      className={cn(
        cardFont.className,
        "mobile-bottom-nav-surface fixed bottom-[max(0.65rem,env(safe-area-inset-bottom,0px))] left-3 right-3 z-50 overflow-visible rounded-[1.35rem] px-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.95)] transition-[transform,opacity] duration-300 ease-out will-change-transform lg:hidden",
        reduceMotion && "duration-0",
        isHidden
          ? "pointer-events-none translate-y-[calc(100%+2rem)] opacity-0"
          : "translate-y-0 opacity-100",
      )}
    >
      <div className="grid h-[3.75rem] grid-cols-5 items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              aria-current={item.isActive ? "page" : undefined}
              className={cn(
                "relative flex h-full min-w-0 flex-col items-center justify-center py-1 text-[10px] font-semibold transition-colors active:scale-[0.96]",
                item.isActive
                  ? "font-extrabold text-white"
                  : "text-neutral-300 hover:text-white",
              )}
            >
              <span className="relative flex h-7 w-full items-center justify-center">
                {item.isActive && (
                  <motion.span
                    layoutId="mobile-nav-active"
                    transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 430, damping: 32 }}
                    className="absolute -top-7 h-14 w-14 rounded-full border border-black/10 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.42)] ring-[6px] ring-[#090b10]"
                  />
                )}
                <Icon
                  size={20}
                  strokeWidth={2.1}
                  className={cn(
                    "relative z-10 transition-[color,transform] duration-300",
                    item.isActive ? "-translate-y-7 text-[#11131a]" : "text-neutral-200",
                  )}
                />
              </span>
              <span className="mt-0.5 max-w-full truncate px-0.5 tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* User Account / Login Tab */}
        {user ? (
          <Link
            href={`/user/${encodeURIComponent(user.username)}`}
            className={cn(
              "relative flex h-full min-w-0 flex-col items-center justify-center py-1 text-[10px] font-semibold transition-colors active:scale-[0.96]",
              isProfileRoute
                ? "font-extrabold text-white"
                : "text-neutral-300 hover:text-white",
            )}
          >
            <span className="relative flex h-7 w-full items-center justify-center">
              {isProfileRoute && (
                <motion.span
                  layoutId="mobile-nav-active"
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 430, damping: 32 }}
                  className="absolute -top-7 h-14 w-14 rounded-full border border-black/10 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.42)] ring-[6px] ring-[#090b10]"
                />
              )}
              {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                referrerPolicy="no-referrer"
                className={cn(
                  "relative z-10 h-5 w-5 rounded-full border border-white/20 object-cover transition-transform duration-300",
                  isProfileRoute && "-translate-y-7 scale-110 border-black/20",
                )}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=8b5cf6&color=ffffff&size=64`;
                }}
              />
            ) : (
              <div
                className={cn(
                  "relative z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white/30 bg-neutral-800 text-[9px] font-black text-white transition-transform duration-300",
                  isProfileRoute && "-translate-y-7 scale-110 border-black/20 bg-white text-black",
                )}
              >
                {(user.displayName || user.username || "U")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
            </span>
            <span className="mt-1 max-w-full truncate px-0.5 tracking-tight">
              Cá nhân
            </span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => useAuthModalStore.getState().openModal("login")}
            className="flex h-full min-w-0 cursor-pointer flex-col items-center justify-center py-1 text-[10px] font-semibold text-neutral-300 transition-[color,transform] hover:text-white active:scale-[0.96]"
          >
            <User size={19} />
            <span className="mt-1 max-w-full truncate px-0.5 tracking-tight">
              Đăng nhập
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}
