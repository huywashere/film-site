"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Home, LayoutGrid, History, Bookmark, User } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [isHidden, setIsHidden] = useState(false);
  const previousScrollY = useRef(0);
  const frameId = useRef<number | null>(null);

  useEffect(() => {
    previousScrollY.current = window.scrollY;

    const updateVisibility = () => {
      frameId.current = null;
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - previousScrollY.current;

      // Ignore tiny scroll jitter so the dock never flickers while reading.
      if (Math.abs(delta) < 10) return;

      setIsHidden(currentScrollY > 96 && delta > 0);
      previousScrollY.current = currentScrollY;
    };

    const onScroll = () => {
      if (frameId.current === null) {
        frameId.current = window.requestAnimationFrame(updateVisibility);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frameId.current !== null) window.cancelAnimationFrame(frameId.current);
    };
  }, []);

  if (pathname === "/login" || pathname === "/register") return null;

  const navItems = [
    {
      label: "Trang chủ",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      label: "Chủ đề",
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
      label: "Đã lưu",
      href: "/watchlist",
      icon: Bookmark,
      isActive: pathname === "/watchlist",
    },
  ];

  return (
    <nav
      aria-label="Điều hướng nhanh"
      className={cn(
        "fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-40 lg:hidden rounded-2xl border border-white/[0.16] bg-[#101419]/78 px-1 py-1 shadow-[0_12px_34px_rgba(0,0,0,0.32)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[#101419]/58 transition-[transform,opacity] duration-300 ease-out will-change-transform",
        isHidden
          ? "pointer-events-none translate-y-[calc(100%+1.25rem)] opacity-0"
          : "translate-y-0 opacity-100",
      )}
    >
      <div className="flex h-12 items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 rounded-xl text-[10px] font-semibold transition-[color,background-color,transform] active:scale-[0.96] relative",
                item.isActive
                  ? "bg-white/10 text-white font-extrabold"
                  : "text-neutral-400 hover:text-neutral-200",
              )}
            >
              <Icon
                size={18}
                className={cn(
                  "transition-transform duration-200",
                  item.isActive && "scale-110 text-white",
                )}
              />
              <span className="mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* User Account / Login Tab */}
        {user ? (
          <Link
            href={`/user/${encodeURIComponent(user.username)}`}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 rounded-xl text-[10px] font-semibold transition-[color,background-color,transform] active:scale-[0.96] relative",
              pathname.startsWith("/user/") || pathname.startsWith("/profile/")
                ? "bg-white/10 text-white font-extrabold"
                : "text-neutral-400 hover:text-neutral-200",
            )}
          >
            <img
              src={
                user.avatarUrl ||
                `https://ui-avatars.com/api/?name=${user.username}&background=2c3440&color=ffffff&size=24`
              }
              alt={user.username}
              className={cn(
                "w-4 h-4 rounded-full object-cover border border-white/20 transition-transform",
                (pathname.startsWith("/user/") || pathname.startsWith("/profile/")) &&
                  "scale-110 border-white ring-2 ring-white/30",
              )}
            />
            <span className="mt-0.5 tracking-tight">Cá nhân</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 rounded-xl text-[10px] font-semibold text-neutral-400 hover:text-white transition-[color,background-color,transform] active:scale-[0.96]",
              (pathname === "/login" || pathname === "/register") &&
                "bg-white/10 text-white font-extrabold",
            )}
          >
            <User size={18} />
            <span className="mt-0.5 tracking-tight">Đăng nhập</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
