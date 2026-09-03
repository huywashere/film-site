"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Popcorn,
  Layers,
  History,
  Clapperboard,
  Drama,
  LayoutGrid,
  TvMinimalPlay,
  MonitorPlay,
  CalendarDays,
  Languages,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cardFont } from "@/lib/fonts";
import { movieApi } from "@/lib/api";
import { tmdbApi, type TmdbDiscoverOptions } from "@/lib/tmdb";

function TelegramIcon({
  className,
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M9.78 18.65l.28-4.2 7.64-6.88c.34-.31-.07-.48-.52-.19l-9.45 5.95-4.07-1.27c-.89-.28-.91-.88.19-1.31L19.8 4.63c.74-.28 1.39.18 1.15 1.31l-2.7 12.72c-.2 1-.79 1.25-1.6.78l-4.52-3.33-2.18 2.1c-.24.24-.44.44-.9.44z" />
    </svg>
  );
}

const SIDEBAR_ITEMS = [
  { title: "Trang chủ", href: "/", icon: Home },
  { title: "Duyệt Tìm", href: "/genres", icon: LayoutGrid },
  { title: "Xem Chung", href: "/watch-party", icon: Popcorn },
  { title: "Bộ Sưu Tập", href: "/watchlist", icon: Layers },
  { title: "Lịch Sử", href: "/history", icon: History },
  {
    title: "Kênh Telegram",
    href: "https://t.me/cinephim_official",
    isExternal: true,
    icon: TelegramIcon,
    isSpecial: true,
  },
];

const W = 60; // Slim width in px

const MOVIE_WORLD_PREFETCH: Array<{
  slug: string;
  discover: TmdbDiscoverOptions;
}> = [
  {
    slug: "hanh-dong",
    discover: { with_genres: "28", sort_by: "popularity.desc" },
  },
  {
    slug: "vien-tuong",
    discover: { with_genres: "878", sort_by: "popularity.desc" },
  },
  {
    slug: "kinh-di",
    discover: { with_genres: "27", sort_by: "popularity.desc" },
  },
  {
    slug: "tinh-cam",
    discover: { with_genres: "10749", sort_by: "popularity.desc" },
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const warmedRoutesRef = useRef(new Set<string>());

  const isHomePage = pathname === "/";
  const isFilmDetailPage = pathname.startsWith("/film/");
  const isWatchPage = pathname.startsWith("/watch/");
  const isGenrePage = pathname.startsWith("/genre/") || pathname === "/genres";
  const isCountryPage = pathname.startsWith("/country/");
  const isFilmsPage = pathname.startsWith("/films/");
  const isBrowsePage = isHomePage || isGenrePage || isCountryPage || isFilmsPage;

  const shouldShowSidebar = isFilmDetailPage || isWatchPage || isBrowsePage;

  const [scrolledPastBanner, setScrolledPastBanner] = useState(false);

  useEffect(() => {
    if (!isBrowsePage) return;

    const handleScroll = () => {
      // Khi lướt đến phần body (qua Hero Banner khoảng 350-400px hoặc 40% viewport)
      const threshold =
        typeof window !== "undefined"
          ? Math.min(window.innerHeight * 0.4, 380)
          : 350;
      setScrolledPastBanner(window.scrollY > threshold);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isBrowsePage, pathname]);

  useEffect(() => {
    try {
      const v = localStorage.getItem("sidebar-collapsed");
      if (v !== null) setCollapsed(v === "true");
    } catch (_e) {
      // ignore localStorage errors
    }
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("sidebar-collapsed", String(next));
    } catch (_e) {
      // ignore localStorage errors
    }
  };

  const warmRoute = useCallback(
    (href: string) => {
      if (href.startsWith("http")) return;
      try {
        router.prefetch(href);
      } catch (_e) {
        // ignore prefetch errors
      }

      if (warmedRoutesRef.current.has(href)) return;
      warmedRoutesRef.current.add(href);

      const countrySlug = href.match(/^\/country\/([^/?]+)/)?.[1];
      if (countrySlug) {
        void queryClient.prefetchQuery({
          queryKey: ["country-fast", countrySlug, 1, ""],
          queryFn: () =>
            movieApi
              .getByCountryFast(countrySlug, 1)
              .then((response) => response.data),
          staleTime: 1000 * 60 * 60,
          gcTime: 1000 * 60 * 60 * 24,
        });
      }

      if (href === "/watch-party" && typeof window !== "undefined") {
        const img = new window.Image();
        img.src = "/images/cinema-hall-with-red-seat-wide-white-screen.webp";
      }

      if (href === "/genres") {
        for (const topic of MOVIE_WORLD_PREFETCH) {
          void queryClient.prefetchQuery({
            queryKey: ["movie-world-topic", topic.slug, topic.discover],
            queryFn: async () => {
              const response = await tmdbApi.discoverMovies(topic.discover);
              return response?.results || [];
            },
            staleTime: 1000 * 60 * 60,
            gcTime: 1000 * 60 * 60 * 6,
          });
        }
      }
    },
    [queryClient, router],
  );

  // Thanh tab dọc hiển thị luôn ở trang xem phim & giới thiệu phim; ở trang chủ thì khi lướt tới phần body mới hiện
  if (!shouldShowSidebar) return null;

  const isVisible = isFilmDetailPage || isWatchPage ? true : scrolledPastBanner;

  return (
    <>

      {/* ── VERTICALLY CENTERED SLIM SIDEBAR ── */}
      <aside
        className={cn(
          cardFont.className,
          "hidden lg:flex fixed left-0 top-16 bottom-0 z-40 flex-col items-center justify-center transition-all duration-300 ease-in-out pointer-events-none",
          isVisible && !collapsed
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-full",
        )}
        style={{ width: W }}
      >
        <div className="flex flex-col items-center justify-center py-4 px-1.5 bg-transparent pointer-events-auto gap-3.5 my-auto">
          {/* Top Collapse Button (Mũi tên thu gọn) */}
          <button
            onClick={toggle}
            aria-label="Thu gọn thanh điều hướng"
            title="Thu gọn menu"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer mb-0.5"
          >
            <ChevronLeft size={20} strokeWidth={2.2} />
          </button>

          {/* Navigation Icon List */}
          {SIDEBAR_ITEMS.map((item) => {
            const isActive =
              !item.isExternal &&
              (pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href)));

            const Icon = item.icon;
            const isBilingual = Boolean((item as any).isBilingual);

            const content = (
              <>
                {/* Active Indicator Bar */}
                {isActive && (
                  <span
                    className={cn(
                      "absolute -left-1.5 top-1/2 -translate-y-1/2 rounded-r-full z-20",
                      isBilingual
                        ? "bg-gradient-to-b from-cyan-400 to-violet-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                        : "bg-white",
                    )}
                    style={{ width: 3, height: 20 }}
                  />
                )}

                {/* Active/Default Background Pill */}
                {isBilingual ? (
                  <span
                    className={cn(
                      "absolute inset-0 rounded-xl transition-all duration-300 z-0",
                      isActive
                        ? "bg-gradient-to-br from-cyan-500/35 via-violet-600/30 to-blue-500/30 border border-cyan-400/70 shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                        : "bg-gradient-to-br from-cyan-500/20 via-violet-600/15 to-blue-500/15 border border-cyan-400/30 group-hover:border-cyan-400/80 group-hover:shadow-[0_0_16px_rgba(6,182,212,0.4)]",
                    )}
                  />
                ) : isActive ? (
                  <span className="absolute inset-0 rounded-xl bg-white/10 z-0" />
                ) : (
                  <span className="absolute inset-0 rounded-xl bg-transparent group-hover:bg-white/[0.06] transition-colors z-0" />
                )}

                {/* Icon */}
                <Icon
                  size={20}
                  className={cn(
                    "relative z-10 transition-transform group-hover:scale-110",
                    isBilingual
                      ? "text-cyan-300 group-hover:text-cyan-100 drop-shadow-[0_0_8px_rgba(6,182,212,0.7)]"
                      : item.isSpecial && !isActive
                        ? "text-[#229ED9] group-hover:text-[#38bdf8]"
                        : "",
                  )}
                />

                {/* Neon Dot for Bilingual tab */}
                {isBilingual && (
                  <span className="absolute -top-1 -right-1 z-20 flex h-3 w-3 items-center justify-center pointer-events-none">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                  </span>
                )}

                {/* Floating Tooltip on Hover */}
                {isBilingual ? (
                  <div className="absolute left-full ml-3.5 px-3.5 py-2 rounded-2xl bg-neutral-950/95 border border-cyan-400/50 text-left whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.3)] z-30 translate-x-1 group-hover:translate-x-0 backdrop-blur-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white flex items-center gap-1.5">
                        <Sparkles size={13} className="text-cyan-400" />
                        Phim Song Ngữ
                      </span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 text-black shadow-sm">
                        DUAL SUB
                      </span>
                    </div>
                    <p className="text-[10px] text-cyan-200/90 mt-0.5 font-medium">
                      Phụ đề kép Anh - Việt • Luyện nghe 4K
                    </p>
                  </div>
                ) : (
                  <span className="absolute left-full ml-3.5 px-3 py-1.5 rounded-xl bg-neutral-950 border border-white/15 text-xs font-bold text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 shadow-2xl z-30 translate-x-1 group-hover:translate-x-0">
                    {item.title}
                  </span>
                )}
              </>
            );

            if (item.isExternal) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.title}
                  title={item.title}
                  className={cn(
                    "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group cursor-pointer text-white/40 hover:text-white",
                  )}
                >
                  {content}
                </a>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                aria-label={item.title}
                title={item.title}
                onMouseEnter={() => warmRoute(item.href)}
                onFocus={() => warmRoute(item.href)}
                onTouchStart={() => warmRoute(item.href)}
                className={cn(
                  "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group cursor-pointer",
                  isActive
                    ? "text-white font-bold"
                    : isBilingual
                      ? "text-cyan-300 hover:text-white"
                      : "text-white/40 hover:text-white",
                )}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </aside>

      {/* ── EDGE RE-OPEN BUTTON WHEN COLLAPSED ── */}
      {collapsed && isVisible && (
        <button
          onClick={toggle}
          aria-label="Mở thanh điều hướng"
          title="Mở rộng menu"
          className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-40 p-2.5 bg-transparent text-white/60 hover:text-white transition-all duration-200 cursor-pointer hover:scale-110"
        >
          <ChevronRight size={20} strokeWidth={2.2} />
        </button>
      )}
    </>
  );
}
