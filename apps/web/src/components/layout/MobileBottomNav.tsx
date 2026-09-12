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
    : { type: "spring" as const, stiffness: 420, damping: 32, mass: 0.75 };

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
        "mobile-bottom-nav-surface fixed bottom-0 inset-x-0 z-50 select-none lg:hidden",
        "pb-[max(0.6rem,env(safe-area-inset-bottom,0px))] pt-1.5 px-3",
      )}
    >
      {/* Specular hairline top glow - Apple TV / Disney+ aesthetic */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.18] to-transparent"
      />

      <div className="mx-auto grid h-[52px] max-w-md grid-cols-5 items-stretch gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              aria-current={item.isActive ? "page" : undefined}
              className={cn(
                "group relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl py-1 text-[9.5px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95",
                item.isActive
                  ? "text-white"
                  : "text-neutral-400 hover:text-neutral-200",
              )}
            >
              {/* Apple TV / VisionOS Sliding Active Frosted Pill */}
              {item.isActive && (
                <motion.span
                  layoutId="mobile-nav-active-pill"
                  transition={dockTransition}
                  className="pointer-events-none absolute inset-x-1 inset-y-0.5 rounded-2xl border border-white/[0.08] bg-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
                />
              )}

              {/* Ambient micro-glow behind active icon */}
              {item.isActive && (
                <motion.span
                  layoutId="mobile-nav-active-glow"
                  transition={dockTransition}
                  className="pointer-events-none absolute top-1.5 h-6 w-10 rounded-full bg-violet-500/20 blur-md"
                />
              )}

              <motion.span
                animate={item.isActive ? { y: -0.5, scale: 1.05 } : { y: 0, scale: 1 }}
                transition={dockTransition}
                className={cn(
                  "relative z-10 flex items-center justify-center transition-colors duration-200",
                  item.isActive
                    ? "text-[#b8a3ff]"
                    : "text-neutral-400 group-hover:text-neutral-200",
                )}
              >
                <Icon size={19} strokeWidth={item.isActive ? 2.3 : 1.8} />
              </motion.span>

              <span
                className={cn(
                  "relative z-10 block w-full truncate px-0.5 text-center text-[9.5px] leading-tight tracking-tight transition-colors duration-200",
                  item.isActive
                    ? "font-bold text-white"
                    : "font-medium text-neutral-400 group-hover:text-neutral-200",
                )}
              >
                {item.label}
              </span>

              {/* Luminous Jewel Dot Indicator */}
              {item.isActive ? (
                <motion.span
                  layoutId="mobile-nav-active-dot"
                  transition={dockTransition}
                  className="relative z-10 h-1 w-1 rounded-full bg-[#a78bfa] shadow-[0_0_6px_#a78bfa]"
                />
              ) : (
                <span className="h-1 w-1 opacity-0" aria-hidden="true" />
              )}
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
              "group relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl py-1 text-[9.5px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95",
              isProfileRoute
                ? "text-white"
                : "text-neutral-400 hover:text-neutral-200",
            )}
          >
            {isProfileRoute && (
              <motion.span
                layoutId="mobile-nav-active-pill"
                transition={dockTransition}
                className="pointer-events-none absolute inset-x-1 inset-y-0.5 rounded-2xl border border-white/[0.08] bg-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
              />
            )}

            {isProfileRoute && (
              <motion.span
                layoutId="mobile-nav-active-glow"
                transition={dockTransition}
                className="pointer-events-none absolute top-1.5 h-6 w-10 rounded-full bg-violet-500/20 blur-md"
              />
            )}

            <motion.span
              animate={isProfileRoute ? { y: -0.5, scale: 1.05 } : { y: 0, scale: 1 }}
              transition={dockTransition}
              className="relative z-10 flex items-center justify-center"
            >
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.displayName || user.username}
                  referrerPolicy="no-referrer"
                  className={cn(
                    "h-[19px] w-[19px] rounded-full object-cover transition-all duration-200",
                    isProfileRoute
                      ? "ring-2 ring-[#b8a3ff] shadow-[0_0_8px_rgba(184,163,255,0.6)]"
                      : "ring-1 ring-white/20",
                  )}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=8b5cf6&color=ffffff&size=64`;
                  }}
                />
              ) : (
                <div
                  className={cn(
                    "flex h-[19px] w-[19px] items-center justify-center rounded-full text-[8px] font-black transition-all duration-200",
                    isProfileRoute
                      ? "bg-violet-600 text-white ring-2 ring-[#b8a3ff] shadow-[0_0_8px_rgba(184,163,255,0.6)]"
                      : "bg-neutral-800 text-neutral-300 ring-1 ring-white/20",
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
                "relative z-10 block w-full truncate px-0.5 text-center text-[9.5px] leading-tight tracking-tight transition-colors duration-200",
                isProfileRoute
                  ? "font-bold text-white"
                  : "font-medium text-neutral-400 group-hover:text-neutral-200",
              )}
            >
              Cá nhân
            </span>

            {isProfileRoute ? (
              <motion.span
                layoutId="mobile-nav-active-dot"
                transition={dockTransition}
                className="relative z-10 h-1 w-1 rounded-full bg-[#a78bfa] shadow-[0_0_6px_#a78bfa]"
              />
            ) : (
              <span className="h-1 w-1 opacity-0" aria-hidden="true" />
            )}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => useAuthModalStore.getState().openModal("login")}
            title="Đăng nhập"
            className="group relative flex min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl py-1 text-[9.5px] font-semibold text-neutral-400 transition-colors hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95"
          >
            <span className="relative z-10 flex items-center justify-center text-neutral-400 transition-colors duration-200 group-hover:text-neutral-200">
              <User size={19} strokeWidth={1.8} />
            </span>
            <span className="relative z-10 block w-full truncate px-0.5 text-center text-[9.5px] font-medium leading-tight tracking-tight text-neutral-400 group-hover:text-neutral-200">
              Đăng nhập
            </span>
            <span className="h-1 w-1 opacity-0" aria-hidden="true" />
          </button>
        )}
      </div>
    </nav>
  );
}

