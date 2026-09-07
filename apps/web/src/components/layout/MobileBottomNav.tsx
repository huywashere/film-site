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
      isActive:
        pathname === "/genres" ||
        pathname.startsWith("/genre/") ||
        pathname === "/films" ||
        pathname.startsWith("/films/") ||
        pathname.startsWith("/film/") ||
        pathname.startsWith("/watch/") ||
        pathname === "/search",
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
        "mobile-bottom-nav-surface fixed bottom-[max(0.65rem,env(safe-area-inset-bottom,0px))] left-4 right-4 z-50 overflow-visible rounded-[14px] px-2 shadow-[0_12px_34px_rgba(0,0,0,0.68)] transition-[transform,opacity] duration-300 ease-out will-change-transform lg:hidden",
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
                "relative flex h-full min-w-0 flex-col items-center justify-center text-[10px] font-semibold transition-colors active:scale-[0.96]",
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
                    className="absolute -top-7 h-[3.25rem] w-[3.25rem] rounded-full border-2 border-neutral-300 bg-white shadow-[0_7px_18px_rgba(0,0,0,0.32)]"
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
              {item.isActive && (
                <motion.span
                  initial={reduceMotion ? false : { opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-0.5 max-w-full truncate px-0.5 tracking-tight text-white"
                >
                  {item.label}
                </motion.span>
              )}
            </Link>
          );
        })}

        {/* User Account / Login Tab */}
        {user ? (
          <Link
            href={`/user/${encodeURIComponent(user.username)}`}
            className={cn(
              "relative flex h-full min-w-0 flex-col items-center justify-center text-[10px] font-semibold transition-colors active:scale-[0.96]",
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
                  className="absolute -top-7 h-[3.25rem] w-[3.25rem] rounded-full border-2 border-neutral-300 bg-white shadow-[0_7px_18px_rgba(0,0,0,0.32)]"
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
            {isProfileRoute && (
              <motion.span
                initial={reduceMotion ? false : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 max-w-full truncate px-0.5 tracking-tight text-white"
              >
                Cá nhân
              </motion.span>
            )}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => useAuthModalStore.getState().openModal("login")}
            aria-label="Đăng nhập"
            title="Đăng nhập"
            className="flex h-full min-w-0 cursor-pointer items-center justify-center text-neutral-200 transition-[color,transform] hover:text-white active:scale-[0.96]"
          >
            <User size={20} strokeWidth={2.1} />
          </button>
        )}
      </div>
    </nav>
  );
}
