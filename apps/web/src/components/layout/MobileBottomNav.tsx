"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bookmark,
  CalendarDays,
  Clapperboard,
  History,
  Home,
  Languages,
  LayoutDashboard,
  Plus,
  Popcorn,
  User,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import { cn } from "@/lib/utils";
import { cardFont } from "@/lib/fonts";

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const reduceMotion = useReducedMotion();
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);

  // Close quick menu on route change
  useEffect(() => {
    setIsQuickMenuOpen(false);
  }, [pathname]);

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

  const quickActions = [
    {
      label: "Xem chung",
      href: "/watch-party",
      icon: Popcorn,
      description: "Phòng chiếu phim cùng bạn bè",
      iconColor: "bg-pink-500/20 text-pink-300 border border-pink-400/25",
    },
    {
      label: "Lịch chiếu phim",
      href: "/schedule",
      icon: CalendarDays,
      description: "Cập nhật tập mới theo ngày",
      iconColor: "bg-amber-500/20 text-amber-300 border border-amber-400/25",
    },
    {
      label: "Thuyết minh Song Ngữ",
      href: "/song-ngu",
      icon: Languages,
      description: "Luyện nghe qua phim với AI",
      iconColor: "bg-cyan-500/20 text-cyan-300 border border-cyan-400/25",
    },
  ];

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

          {/* User Account / Login Tab */}
          {user ? (
            <Link
              href={`/user/${encodeURIComponent(user.username)}`}
              prefetch={false}
              onTouchStart={() => {
                try {
                  router.prefetch(
                    `/user/${encodeURIComponent(user.username)}`,
                  );
                } catch {}
              }}
              onPointerDown={() => {
                try {
                  router.prefetch(
                    `/user/${encodeURIComponent(user.username)}`,
                  );
                } catch {}
              }}
              aria-current={isProfileRoute ? "page" : undefined}
              aria-label="Trang cá nhân"
              onClick={() => router.push(`/user/${encodeURIComponent(user.username)}`)}
              className="group relative flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95 transition-transform"
            >
              {isProfileRoute && (
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

              <motion.div
                layout
                className={cn(
                  "relative z-10 flex items-center gap-1.5 transition-colors duration-200 select-none",
                  isProfileRoute
                    ? "text-black font-black px-2.5 sm:px-3 py-1.5"
                    : "text-neutral-400 hover:text-white p-1.5 sm:p-2",
                )}
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName || user.username}
                    referrerPolicy="no-referrer"
                    className={cn(
                      "h-[18px] w-[18px] rounded-full object-cover",
                      isProfileRoute
                        ? "ring-1.5 ring-black"
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
                      "flex h-[18px] w-[18px] items-center justify-center rounded-full text-[8px] font-black",
                      isProfileRoute
                        ? "bg-black text-white"
                        : "bg-neutral-800 text-neutral-300 ring-1 ring-white/20",
                    )}
                  >
                    {(user.displayName || user.username || "U")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
                {isProfileRoute && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-[11.5px] font-black tracking-tight whitespace-nowrap overflow-hidden pr-0.5"
                  >
                    Tôi
                  </motion.span>
                )}
              </motion.div>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => useAuthModalStore.getState().openModal("login")}
              title="Đăng nhập"
              className="group relative flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95 transition-transform text-neutral-400 hover:text-white p-1.5 sm:p-2"
            >
              <User size={18} strokeWidth={1.8} />
            </button>
          )}
        </div>

        {/* ── Circular Floating Action Button (Purple iOS FAB) ── */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsQuickMenuOpen((prev) => !prev);
          }}
          aria-label="Thao tác nhanh"
          aria-expanded={isQuickMenuOpen}
          className={cn(
            "relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/25 text-white shadow-[0_8px_25px_rgba(124,58,237,0.45),inset_0_1px_1px_rgba(255,255,255,0.35)] active:scale-90 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
            isQuickMenuOpen
              ? "bg-violet-700 shadow-[0_4px_16px_rgba(109,40,217,0.6)]"
              : "bg-gradient-to-br from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500",
          )}
        >
          <Plus
            size={22}
            className={cn(
              "transition-transform duration-300 stroke-[2.6]",
              isQuickMenuOpen && "rotate-45",
            )}
          />
        </button>

        {/* ── Floating Quick Action Popup Menu (Apple iOS Glass Context Menu) ── */}
        <AnimatePresence>
          {isQuickMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsQuickMenuOpen(false);
                }}
              />

              {/* Popup Card */}
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.92 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-14 right-0 z-50 w-60 rounded-[24px] border border-white/20 bg-neutral-900/75 p-2 shadow-[0_24px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-2xl"
              >
                {/* Specular top hairline reflection */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"
                />

                <div className="px-3 py-2 mb-1 border-b border-white/10 flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-neutral-300 select-none antialiased">
                    Lối tắt nhanh
                  </span>
                </div>

                <div className="space-y-1">
                  {quickActions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <Link
                        key={action.href}
                        href={action.href}
                        prefetch={false}
                        onClick={() => setIsQuickMenuOpen(false)}
                        className="flex items-center gap-3 rounded-2xl p-2.5 transition-all hover:bg-white/10 active:bg-white/15"
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-sm",
                            action.iconColor || "bg-violet-500/20 text-violet-300 border-violet-400/25",
                          )}
                        >
                          <ActionIcon size={17} strokeWidth={2.2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-white line-clamp-1 tracking-tight antialiased">
                            {action.label}
                          </p>
                          <p className="text-[11px] text-neutral-400 line-clamp-1 antialiased">
                            {action.description}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
