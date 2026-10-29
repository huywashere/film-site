'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Popcorn,
  Layers,
  History,
  Clapperboard,
  Drama,
  LayoutDashboard,
  SlidersHorizontal,
  TvMinimalPlay,
  MonitorPlay,
  CalendarDays,
  Languages,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cardFont } from '@/lib/fonts';
import { movieApi } from '@/lib/api';
import { tmdbApi, type TmdbDiscoverOptions } from '@/lib/tmdb';

function TelegramIcon({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M9.78 18.65l.28-4.2 7.64-6.88c.34-.31-.07-.48-.52-.19l-9.45 5.95-4.07-1.27c-.89-.28-.91-.88.19-1.31L19.8 4.63c.74-.28 1.39.18 1.15 1.31l-2.7 12.72c-.2 1-.79 1.25-1.6.78l-4.52-3.33-2.18 2.1c-.24.24-.44.44-.9.44z" />
    </svg>
  );
}

const SIDEBAR_ITEMS = [
  { title: 'Trang chủ', href: '/', icon: Home },
  { title: 'Duyệt Tìm', href: '/films', icon: SlidersHorizontal },
  { title: 'Chủ Đề', href: '/genres', icon: LayoutDashboard },
  { title: 'Xem Chung', href: '/watch-party', icon: Popcorn },
  { title: 'Bộ Sưu Tập', href: '/watchlist', icon: Layers },
  { title: 'Lịch Sử', href: '/history', icon: History },
  {
    title: 'Nhóm Telegram',
    href: 'https://t.me/+ijCR1KCdx2E0ZTA9',
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
    slug: 'hanh-dong',
    discover: { with_genres: '28', sort_by: 'popularity.desc' },
  },
  {
    slug: 'vien-tuong',
    discover: { with_genres: '878', sort_by: 'popularity.desc' },
  },
  {
    slug: 'kinh-di',
    discover: { with_genres: '27', sort_by: 'popularity.desc' },
  },
  {
    slug: 'tinh-cam',
    discover: { with_genres: '10749', sort_by: 'popularity.desc' },
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [optimisticPath, setOptimisticPath] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticPath(null);
  }, [pathname]);
  const [collapsed, setCollapsed] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const warmedRoutesRef = useRef(new Set<string>());

  const isHomePage = pathname === '/';
  const isFilmDetailPage = pathname.startsWith('/film/');
  const isWatchPage = pathname.startsWith('/watch/');
  const isGenresPage = pathname === '/genres';
  const isUniversePage = pathname.startsWith('/universe/');
  const isGenrePage = pathname.startsWith('/genre/');
  const isCountryPage = pathname.startsWith('/country/');
  const isFilmsPage = pathname === '/films' || pathname.startsWith('/films/');
  const isUserActivityPage =
    pathname === '/watch-party' ||
    pathname.startsWith('/watch-party/') ||
    pathname === '/history' ||
    pathname.startsWith('/history/') ||
    pathname === '/watchlist' ||
    pathname.startsWith('/watchlist/') ||
    pathname === '/library' ||
    pathname.startsWith('/library/');

  // All theme/universe/country/catalogue pages hide the rail on top of the
  // hero banner, and reveal it smoothly when scrolling into body content.
  // Watch and film detail pages keep the sidebar always pinned.
  const isPinnedPage =
    isFilmDetailPage ||
    isWatchPage ||
    isUserActivityPage ||
    isGenresPage ||
    isFilmsPage ||
    optimisticPath === '/genres' ||
    optimisticPath === '/films' ||
    Boolean(optimisticPath?.startsWith('/films/'));
  const isAlwaysPinnedPage = isPinnedPage;
  const isHeroBannerPage = isHomePage || isCountryPage || isGenrePage || isUniversePage;
  const shouldShowSidebar = isPinnedPage || isHeroBannerPage;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isHeroBannerPage) {
      setScrolledPastHero(false);
      return;
    }

    let ticking = false;
    let lastState: boolean | null = null;

    const checkVisibility = () => {
      const hero = document.querySelector<HTMLElement>('[data-hero-banner="true"]');
      const threshold = hero ? Math.max(0, hero.offsetHeight - 80) : 380;
      const pastHero = window.scrollY >= threshold;
      if (pastHero !== lastState) {
        lastState = pastHero;
        setScrolledPastHero(pastHero);
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(checkVisibility);
      }
    };

    checkVisibility();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [isHeroBannerPage, pathname]);

  useEffect(() => {
    try {
      const v = localStorage.getItem('sidebar-collapsed');
      if (v !== null) setCollapsed(v === 'true');
    } catch (_e) {
      // ignore localStorage errors
    }
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem('sidebar-collapsed', String(next));
    } catch (_e) {
      // ignore localStorage errors
    }
  };

  const warmRoute = useCallback(
    (href: string) => {
      if (href.startsWith('http')) return;
      try {
        router.prefetch(href);
      } catch {}
      if (warmedRoutesRef.current.has(href)) return;
      warmedRoutesRef.current.add(href);

      if (href === '/genres') {
        try {
          router.prefetch('/genres');
        } catch {}
      }
      if (href === '/films') {
        void queryClient.prefetchQuery({
          queryKey: ['browse-films-v2', '', 'all', 'all', '', '', '', 'all', 'all', 'modified.time', 1],
          queryFn: () => movieApi.getLatest(1).then((r) => r?.data?.data || r?.data || { items: [] }),
          staleTime: 15 * 60 * 1000,
        });
      }

      if (href === '/') {
        void queryClient.prefetchQuery({
          queryKey: ['home-feed-v1', 24],
          queryFn: () => movieApi.getHomeFeed(24).then((response) => response.data),
          staleTime: 5 * 60 * 1000,
          gcTime: 60 * 60 * 1000,
        });
      }

      if (href === '/films/series') {
        void queryClient.prefetchQuery({
          queryKey: ['films-type', 'series', 1],
          queryFn: () => movieApi.getSeries(1).then((r) => r.data),
          staleTime: 15 * 60 * 1000,
        });
      }

      if (href === '/films/single') {
        void queryClient.prefetchQuery({
          queryKey: ['films-type', 'single', 1],
          queryFn: () => movieApi.getSingle(1).then((r) => r.data),
          staleTime: 15 * 60 * 1000,
        });
      }

      if (href === '/films/anime') {
        void queryClient.prefetchQuery({
          queryKey: ['films-type', 'anime', 1],
          queryFn: () => movieApi.getByCountryFast('nhat-ban', 1).then((r) => r.data),
          staleTime: 15 * 60 * 1000,
        });
        void queryClient.prefetchQuery({
          queryKey: ['anime-japan-page-2'],
          queryFn: () => movieApi.getByCountryFast('nhat-ban', 2).then((r) => r.data),
          staleTime: 1000 * 60 * 60,
        });
      }

      if (href === '/films/tvshows' || href === '/films/shows') {
        void queryClient.prefetchQuery({
          queryKey: ['films-type', 'tvshows', 1],
          queryFn: () => movieApi.getTvShows(1).then((r) => r.data),
          staleTime: 15 * 60 * 1000,
        });
        void queryClient.prefetchQuery({
          queryKey: ['films-type', 'shows', 1],
          queryFn: () => movieApi.getTvShows(1).then((r) => r.data),
          staleTime: 15 * 60 * 1000,
        });
      }

      const countrySlug = href.match(/^\/country\/([^/?]+)/)?.[1];
      if (countrySlug) {
        void queryClient.prefetchQuery({
          queryKey: ['country-fast', countrySlug, 1, ''],
          queryFn: () =>
            movieApi.getByCountryFast(countrySlug, 1).then((response) => response.data),
          staleTime: 1000 * 60 * 60,
          gcTime: 1000 * 60 * 60 * 24,
        });
      }

      if (href === '/watch-party' && typeof window !== 'undefined') {
        const img = new window.Image();
        img.src = '/img-backtop/tab-watch-party.webp';
      }

      if (href === '/genres') {
        for (const topic of MOVIE_WORLD_PREFETCH) {
          void queryClient.prefetchQuery({
            queryKey: ['movie-world-topic', topic.slug, topic.discover],
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

  // Idle pre-warm primary tabs and data after mount for instant zero-latency clicks
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      const topRoutes = ['/', '/films', '/genres', '/films/series', '/films/single', '/watchlist', '/history'];
      topRoutes.forEach((route) => {
        try {
          router.prefetch(route);
        } catch {}
      });

      // Warm data for primary destinations
      warmRoute('/films');
      warmRoute('/films/series');
      warmRoute('/films/single');
    }, 800);
    return () => clearTimeout(timer);
  }, [mounted, router, warmRoute]);

  // Home reveals the rail after the hero; every other supported page is immediate.
  // Vercel's static prerender can expose a null pathname while the browser
  // immediately sees the real route. Rendering only after mount keeps the
  // server and first client tree identical and prevents hydration error #418.
  if (!mounted || !shouldShowSidebar) return null;

  const isVisible = isAlwaysPinnedPage || (isHeroBannerPage && scrolledPastHero);

  return (
    <>
      {/* ── VERTICALLY CENTERED SLIM SIDEBAR ── */}
      <aside
        data-desktop-sidebar="true"
        className={cn(
          cardFont.className,
          'hidden lg:flex fixed left-0 top-[68px] sm:top-[72px] md:top-16 bottom-0 z-[60] flex-col items-center justify-center transition-all duration-300 ease-in-out pointer-events-none',
          isVisible && !collapsed ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full',
        )}
        style={{ width: W }}
      >
        <div className="flex flex-col items-center justify-center py-4 px-1.5 bg-transparent pointer-events-auto gap-3.5 my-auto">
          {/* Top Collapse Button (Mũi tên thu gọn) */}
          <button
            onClick={toggle}
            aria-label="Thu gọn thanh điều hướng"
            title="Thu gọn menu"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/50 hover:text-violet-300 hover:bg-violet-500/15 transition-all cursor-pointer mb-0.5"
          >
            <ChevronLeft size={20} strokeWidth={2.2} />
          </button>

          {/* Navigation Icon List */}
          {SIDEBAR_ITEMS.map((item) => {
            const effectivePath = optimisticPath || pathname;
            const isEffectiveGenre =
              effectivePath === '/genres' ||
              effectivePath.startsWith('/genre/') ||
              effectivePath.startsWith('/country/') ||
              effectivePath.startsWith('/universe/');
            const isActive =
              !item.isExternal &&
              (item.href === '/genres'
                ? isGenrePage || isCountryPage || isUniversePage || isEffectiveGenre
                : effectivePath === item.href || (item.href !== '/' && effectivePath.startsWith(item.href)));

            const Icon = item.icon;
            const isBilingual = Boolean((item as any).isBilingual);

            const content = (
              <>
                {/* Active Indicator Bar */}
                {isActive && (
                  <span
                    className={cn(
                      'absolute -left-1.5 top-1/2 -translate-y-1/2 rounded-r-full z-20',
                      isBilingual
                        ? 'bg-gradient-to-b from-cyan-400 to-violet-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                        : 'bg-violet-400',
                    )}
                    style={{ width: 3, height: 20 }}
                  />
                )}

                {/* Active/Default Background Pill */}
                {isBilingual ? (
                  <span
                    className={cn(
                      'absolute inset-0 rounded-xl transition-all duration-300 z-0',
                      isActive
                        ? 'bg-gradient-to-br from-cyan-500 via-violet-600 to-blue-500'
                        : 'bg-gradient-to-br from-cyan-500/20 via-violet-600/15 to-blue-500/15 border border-cyan-400/30 group-hover:border-cyan-400/80',
                    )}
                  />
                ) : isActive ? (
                  <span className="absolute inset-0 rounded-xl bg-violet-600 z-0 shadow-sm" />
                ) : (
                  <span className="absolute inset-0 rounded-xl bg-transparent group-hover:bg-violet-500/15 transition-colors z-0" />
                )}

                {/* Icon */}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.2 : 2}
                  className={cn(
                    'relative z-10 transition-transform group-hover:scale-110',
                    isBilingual
                      ? 'text-white group-hover:text-cyan-100'
                      : isActive
                        ? 'text-white'
                        : item.isSpecial && !isActive
                          ? 'text-[#229ED9] group-hover:text-[#38bdf8]'
                          : 'group-hover:text-violet-200',
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
                      Phụ đề kép Anh - Việt • Luyện nghe chuẩn FHD
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
                    'relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group cursor-pointer text-white/40 hover:text-white',
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
                prefetch
                aria-label={item.title}
                aria-current={isActive ? 'page' : undefined}
                title={item.title}
                onMouseEnter={() => warmRoute(item.href)}
                onFocus={() => warmRoute(item.href)}
                onTouchStart={() => warmRoute(item.href)}
                onPointerDown={() => warmRoute(item.href)}
                onClick={() => setOptimisticPath(item.href)}
                className={cn(
                  'relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group cursor-pointer',
                  isActive
                    ? 'text-white font-bold'
                    : isBilingual
                      ? 'text-cyan-300 hover:text-white'
                      : 'text-white/40 hover:text-white',
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
          className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-[60] p-2.5 bg-transparent text-white/60 hover:text-violet-300 hover:bg-violet-500/15 rounded-r-xl transition-all duration-200 cursor-pointer hover:scale-110"
        >
          <ChevronRight size={20} strokeWidth={2.2} />
        </button>
      )}
    </>
  );
}
