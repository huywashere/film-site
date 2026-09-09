"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, History, Home, LayoutGrid, User } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import { cn } from "@/lib/utils";
import { cardFont } from "@/lib/fonts";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const reduceMotion = useReducedMotion();
  const dockTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 30, mass: 0.72 };

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
        "mobile-bottom-nav-surface fixed bottom-[max(0.45rem,env(safe-area-inset-bottom,0px))] left-1/2 z-50 w-[calc(100%-2.75rem)] max-w-[25rem] -translate-x-1/2 overflow-hidden rounded-[13px] px-1 lg:hidden",
      )}
    >
      <div className="grid h-[52px] grid-cols-5 items-stretch">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              aria-current={item.isActive ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[9px] px-0.5 text-[8.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70 active:scale-[0.97]",
                item.isActive
                  ? "font-bold text-white"
                  : "text-neutral-400 hover:text-neutral-100",
              )}
            >
              {item.isActive && (
                <motion.span
                  layoutId="mobile-nav-active-indicator"
                  transition={dockTransition}
                  className="mobile-nav-active-indicator"
                />
              )}
              <motion.span
                animate={item.isActive ? { y: -1, scale: 1.04 } : { y: 0, scale: 1 }}
                transition={dockTransition}
                className={cn(
                  "relative z-10 flex h-[22px] w-8 items-center justify-center rounded-[7px] transition-[background-color,color] duration-200",
                  item.isActive
                    ? "bg-white/[0.09] text-[#b8a3ff]"
                    : "text-neutral-300",
                )}
              >
                <Icon size={17} strokeWidth={item.isActive ? 2.3 : 2} />
              </motion.span>
              <span
                className={cn(
                  "relative z-10 block w-full truncate px-0.5 text-center leading-none tracking-[-0.01em]",
                  item.isActive ? "text-white" : "text-neutral-400",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* User Account / Login Tab */}
        {user ? (
          <Link
            href={`/user/${encodeURIComponent(user.username)}`}
            aria-current={isProfileRoute ? "page" : undefined}
            aria-label="Trang cá nhân"
            className={cn(
              "relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[9px] px-0.5 text-[8.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70 active:scale-[0.97]",
              isProfileRoute
                ? "font-bold text-white"
                : "text-neutral-400 hover:text-neutral-100",
            )}
          >
            {isProfileRoute && (
              <motion.span
                layoutId="mobile-nav-active-indicator"
                transition={dockTransition}
                className="mobile-nav-active-indicator"
              />
            )}
            <motion.span
              animate={isProfileRoute ? { y: -1, scale: 1.04 } : { y: 0, scale: 1 }}
              transition={dockTransition}
              className={cn(
                "relative z-10 flex h-[22px] w-8 items-center justify-center rounded-[7px] transition-[background-color,color] duration-200",
                isProfileRoute ? "bg-white/[0.09]" : "",
              )}
            >
              {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                referrerPolicy="no-referrer"
                className={cn(
                  "h-[17px] w-[17px] rounded-full border object-cover transition-colors duration-200",
                  isProfileRoute ? "border-[#b8a3ff]" : "border-white/20",
                )}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=8b5cf6&color=ffffff&size=64`;
                }}
              />
            ) : (
              <div
                className={cn(
                  "flex h-[17px] w-[17px] items-center justify-center rounded-full border bg-neutral-800 text-[7.5px] font-black transition-colors duration-200",
                  isProfileRoute
                    ? "border-[#b8a3ff] text-[#d4c8ff]"
                    : "border-white/20 text-neutral-300",
                )}
              >
                {(user.displayName || user.username || "U")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
            </motion.span>
            <span
              className={cn(
                "relative z-10 block w-full truncate px-0.5 text-center leading-none tracking-[-0.01em]",
                isProfileRoute ? "text-white" : "text-neutral-400",
              )}
            >
              Cá nhân
            </span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => useAuthModalStore.getState().openModal("login")}
            title="Đăng nhập"
            className="relative flex min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[9px] px-0.5 text-neutral-400 transition-[color,transform] hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70 active:scale-[0.97]"
          >
            <span className="flex h-[22px] w-8 items-center justify-center rounded-[7px] text-neutral-300">
              <User size={17} strokeWidth={2} />
            </span>
            <span className="block w-full truncate px-0.5 text-center text-[8.5px] font-semibold leading-none">
              Đăng nhập
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}
