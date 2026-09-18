"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bookmark,
  Clapperboard,
  History,
  Home,
  LayoutDashboard,
  User,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import { cn } from "@/lib/utils";
import { cardFont } from "@/lib/fonts";

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const reduceMotion = useReducedMotion();

  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  const isProfileRoute =
    pathname === "/user" ||
    pathname.startsWith("/user/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/");

  const isGenresRoute =
    pathname === "/genres" ||
    pathname.startsWith("/genre/");

  const isFilmsRoute =
    (pathname === "/films" ||
      pathname.startsWith("/films/") ||
      pathname.startsWith("/film/") ||
      pathname.startsWith("/watch/")) &&
    !isGenresRoute;

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      label: "Duyệt phim",
      href: "/films",
      icon: Clapperboard,
      isActive: isFilmsRoute,
    },
    {
      label: "Chủ đề",
      href: "/genres",
      icon: LayoutDashboard,
      isActive: isGenresRoute,
    },
    {
      label: "Tủ phim",
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

  const warmProfileRoute = () => {
    if (user?.username) {
      try {
        router.prefetch(`/user/${encodeURIComponent(user.username)}`);
      } catch {}
    }
  };

  return (
    <nav
      aria-label="Điều hướng nhanh di động"
      className={cn(
        cardFont.className,
        "fixed bottom-3 inset-x-0 z-50 flex items-center justify-center px-3 pointer-events-none lg:hidden",
        "pb-[max(0.4rem,env(safe-area-inset-bottom,0px))]",
      )}
    >
      {/* ── Outer Floating Dock Wrapper ── */}
      <div className="relative pointer-events-auto flex items-center gap-1.5 sm:gap-2">
        {/* ── Main Glassmorphism Pill Bar (Apple iOS Frosted Glass) ── */}
        <div className="relative flex items-center gap-0.5 sm:gap-1 rounded-full border border-white/20 bg-neutral-900/60 p-1 sm:p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-2xl">
          {/* Specular top hairline reflection */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-5 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/35 to-transparent"
          />

          {/* Nav Items (Active expands to [Icon] Label, Inactive shows Icon only) */}
          {navItems.map((item) => {
            const Icon = item.icon;
            const warmRoute = () => {
              try {
                router.prefetch(item.href);
              } catch {}
            };

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onTouchStart={warmRoute}
                onPointerDown={warmRoute}
                aria-current={item.isActive ? "page" : undefined}
                onClick={() => router.push(item.href)}
                className="group relative flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95 transition-transform"
              >
                {/* Active Pill Capsule Gliding Highlight */}
                {item.isActive && (
                  <motion.div
                    layoutId="mobile-nav-pill-active"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 450, damping: 35 }
                    }
                    className="absolute inset-0 rounded-full bg-white shadow-[0_2px_12px_rgba(255,255,255,0.25)]"
                  />
                )}

                {/* Icon and Animated Label */}
                <motion.div
                  layout
                  className={cn(
                    "relative z-10 flex items-center gap-1.5 transition-colors duration-200 select-none",
                    item.isActive
                      ? "text-black font-black px-2.5 sm:px-3 py-1.5"
                      : "text-neutral-400 hover:text-white p-1.5 sm:p-2",
                  )}
                >
                  <Icon size={18} strokeWidth={item.isActive ? 2.5 : 1.8} />
                  {item.isActive && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-[11.5px] font-black tracking-tight whitespace-nowrap overflow-hidden pr-0.5"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* ── Circular Floating Login / Profile Action Button (Purple iOS FAB) ── */}
        {user ? (
          <Link
            href={`/user/${encodeURIComponent(user.username)}`}
            prefetch={false}
            onTouchStart={warmProfileRoute}
            onPointerDown={warmProfileRoute}
            onClick={() => router.push(`/user/${encodeURIComponent(user.username)}`)}
            title={user.displayName || user.username}
            aria-label={`Trang cá nhân ${user.displayName || user.username}`}
            className={cn(
              "relative flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-purple-400/90 shadow-[0_8px_25px_rgba(147,51,234,0.5),inset_0_1px_1px_rgba(255,255,255,0.35)] bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-500 overflow-hidden active:scale-90 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400",
              isProfileRoute && "ring-2 ring-white ring-offset-2 ring-offset-black",
            )}
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=8b5cf6&color=ffffff&size=64`;
                }}
              />
            ) : (
              <span className="text-white font-black text-xs">
                {(user.displayName || user.username || "U")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            )}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => useAuthModalStore.getState().openModal("login")}
            title="Đăng nhập"
            aria-label="Đăng nhập"
            className="relative flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border border-purple-400/40 text-white shadow-[0_8px_25px_rgba(147,51,234,0.5),inset_0_1px_1px_rgba(255,255,255,0.35)] bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-500 hover:from-purple-600 hover:to-indigo-400 active:scale-90 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <User size={20} strokeWidth={2.2} className="text-white" />
          </button>
        )}
      </div>
    </nav>
  );
}
