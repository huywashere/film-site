"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, History, Home, LayoutGrid, User } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { cardFont } from "@/lib/fonts";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [isHidden, setIsHidden] = useState(false);
  const previousScrollY = useRef(0);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - previousScrollY.current;
        // Ignore tiny scroll jitter so the dock never flickers while reading.
        if (Math.abs(delta) < 10) return;
        setIsHidden(currentScrollY > 96 && delta > 0);
        previousScrollY.current = currentScrollY;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const isProfileRoute =
    pathname === "/user" ||
    pathname.startsWith("/user/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/");

  if (pathname === "/login" || pathname === "/register" || isProfileRoute) {
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
      label: "Lịch sử",
      href: "/history",
      icon: History,
      isActive: pathname === "/history",
    },
    {
      label: "Lịch chiếu",
      href: "/schedule",
      icon: CalendarDays,
      isActive: pathname === "/schedule",
    },
  ];

  return (
    <nav
      aria-label="Điều hướng nhanh"
      className={cn(
        cardFont.className,
        "mobile-bottom-nav-surface fixed bottom-[max(0.55rem,env(safe-area-inset-bottom))] left-2.5 right-2.5 z-40 overflow-hidden rounded-[1.65rem] px-1.5 py-1.5 transition-[transform,opacity] duration-300 ease-out will-change-transform lg:hidden",
        isHidden
          ? "pointer-events-none translate-y-[calc(100%+1.25rem)] opacity-0"
          : "translate-y-0 opacity-100",
      )}
    >
      <div className="grid h-[3.6rem] grid-cols-5 items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              aria-current={item.isActive ? "page" : undefined}
              className={cn(
                "relative flex h-full min-w-0 flex-col items-center justify-center rounded-[1.1rem] py-1 text-[10px] font-semibold transition-[color,background-color,transform] active:scale-[0.96]",
                item.isActive
                  ? "bg-white/[0.08] text-white font-extrabold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] after:absolute after:bottom-0.5 after:h-0.5 after:w-4 after:rounded-full after:bg-violet-400"
                  : "text-neutral-400 hover:text-neutral-200",
              )}
            >
              <Icon
                size={20}
                className={cn(
                  "transition-transform duration-200",
                  item.isActive && "scale-110 text-white",
                )}
              />
              <span className="mt-1 max-w-full truncate px-0.5 tracking-tight">
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
              "relative flex h-full min-w-0 flex-col items-center justify-center rounded-[1.1rem] py-1 text-[10px] font-semibold transition-[color,background-color,transform] active:scale-[0.96]",
              pathname.startsWith("/user/") || pathname.startsWith("/profile/")
                ? "bg-white/[0.08] text-white font-extrabold after:absolute after:bottom-0.5 after:h-0.5 after:w-4 after:rounded-full after:bg-violet-400"
                : "text-neutral-400 hover:text-neutral-200",
            )}
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                referrerPolicy="no-referrer"
                className={cn(
                  "h-5 w-5 rounded-full border border-white/20 object-cover transition-transform",
                  (pathname.startsWith("/user/") ||
                    pathname.startsWith("/profile/")) &&
                    "scale-110 border-white ring-2 ring-violet-400/50",
                )}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=8b5cf6&color=ffffff&size=64`;
                }}
              />
            ) : (
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border border-violet-400/40 bg-violet-600/30 text-[9px] font-black text-violet-200 transition-transform",
                  (pathname.startsWith("/user/") ||
                    pathname.startsWith("/profile/")) &&
                    "scale-110 border-white ring-2 ring-violet-400/50",
                )}
              >
                {(user.displayName || user.username || "U")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
            <span className="mt-1 max-w-full truncate px-0.5 tracking-tight">
              Cá nhân
            </span>
          </Link>
        ) : (
          <Link
            href="/login"
            className={cn(
              "flex h-full min-w-0 flex-col items-center justify-center rounded-[1.1rem] py-1 text-[10px] font-semibold text-neutral-400 transition-[color,background-color,transform] hover:text-white active:scale-[0.96]",
              (pathname === "/login" || pathname === "/register") &&
                "bg-white/10 text-white font-extrabold",
            )}
          >
            <User size={20} />
            <span className="mt-1 max-w-full truncate px-0.5 tracking-tight">
              Đăng nhập
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
}
