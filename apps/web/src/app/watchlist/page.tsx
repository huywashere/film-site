"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Bookmark, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import { watchlistApi } from "@/lib/api";
import { FilmCard } from "@/components/film/FilmCard";
import { Pagination } from "@/components/film/Pagination";
import type { WatchlistItem } from "@/types/movie";
import { guestDataStorage, type GuestWatchlistItem } from "@/lib/user-data";
import { cardFont } from "@/lib/fonts";
import { useReliableNavigation } from "@/hooks/useReliableNavigation";
import { VerticalTabsHeroBanner } from "@/components/layout/VerticalTabsHeroBanner";
import { cn } from "@/lib/utils";

export default function WatchlistPage() {
  const router = useReliableNavigation();
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);

  // Unauthenticated guard: Tủ phim requires login
  if (!user) {
    return (
      <div
        className={cn(cardFont.className, "min-h-[calc(100dvh+5rem)] sm:min-h-[calc(100dvh+6rem)] flex flex-col bg-[#0a0b10] text-white pb-24 sm:pb-28 -mt-20 sm:-mt-24 select-none")}
      >
        <VerticalTabsHeroBanner
          title="Tủ Phim Của Tôi"
          description="Đăng nhập để xem danh sách phim đã lưu và đồng bộ trên mọi thiết bị."
          imageSrc="/img-backtop/tab-watchlist.webp"
          objectPosition="center 4%"
          contentClassName="pb-8 sm:pb-10 md:pb-12"
        />

        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24 relative z-20">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-purple-500/10 border border-purple-400/20 flex items-center justify-center mb-4 shadow-[0_0_24px_rgba(168,85,247,0.12)]">
            <Bookmark size={28} className="text-purple-300" />
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#d8b4fe] tracking-tight">
            Đăng nhập để sử dụng Tủ Phim
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-purple-200/70 max-w-sm leading-relaxed">
            Tính năng Tủ Phim giúp bạn lưu trữ danh sách phim yêu thích vĩnh viễn và đồng bộ trên mọi thiết bị.
          </p>
          <button
            type="button"
            onClick={() => useAuthModalStore.getState().openModal("login")}
            className="mt-6 rounded-full bg-white hover:bg-neutral-100 text-black px-8 py-3 text-xs sm:text-sm font-extrabold transition-all duration-200 cursor-pointer shadow-lg hover:scale-105 active:scale-95"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }
  const [guestItems, setGuestItems] = useState<GuestWatchlistItem[]>([]);
  const [removedSlugs, setRemovedSlugs] = useState<string[]>([]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    setGuestItems(guestDataStorage.getWatchlist());

    const handleWatchlistChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.movieId) {
        const movieId = String(detail.movieId);
        setGuestItems(guestDataStorage.getWatchlist());
        setRemovedSlugs((prev) =>
          detail.action === "remove"
            ? [...new Set([...prev, movieId])]
            : prev.filter((slug) => slug !== movieId),
        );
      }
    };

    window.addEventListener(
      "netphim_watchlist_changed",
      handleWatchlistChanged,
    );
    return () => {
      window.removeEventListener(
        "netphim_watchlist_changed",
        handleWatchlistChanged,
      );
    };
  }, []);

  // Fetch watchlist data - must be called unconditionally (Rules of Hooks)
  const { data: watchlistData, isLoading } = useQuery({
    queryKey: ["watchlist", user?.id, page],
    queryFn: async () => {
      try {
        const res = await watchlistApi.get(page);
        const data = res?.data;
        if (Array.isArray(data)) {
          return { items: data, total: data.length, totalPages: 1 };
        }
        return {
          items: data?.items || [],
          total: data?.total || 0,
          totalPages: data?.totalPages || 1,
        };
      } catch (_err) {
        return { items: [], total: 0, totalPages: 1 };
      }
    },
    enabled: !!user, // Only fetch when user is logged in
  });

  const rawWatchlistItems: Array<WatchlistItem | GuestWatchlistItem> = user
    ? Array.isArray(watchlistData?.items)
      ? watchlistData.items
      : Array.isArray(watchlistData)
        ? watchlistData
        : []
    : guestItems;

  const watchlistItems = useMemo(() => {
    return rawWatchlistItems.filter(
      (item) => !removedSlugs.includes(item.movieId),
    );
  }, [rawWatchlistItems, removedSlugs]);

  const total = rawWatchlistItems.filter(
    (item) => !removedSlugs.includes(item.movieId),
  ).length;
  const totalPages = user ? watchlistData?.totalPages || 1 : 1;

  return (
    <div
      className={cn(cardFont.className, "min-h-[calc(100dvh+5rem)] sm:min-h-[calc(100dvh+6rem)] flex flex-col bg-[#0a0b10] text-white pb-24 sm:pb-28 -mt-20 sm:-mt-24 select-none")}
    >
      {/* ── Top Hero Banner (Supergirl with Full Face Visibility & Integrated Controls) ── */}
      <VerticalTabsHeroBanner
        title="Xem Sau & Bộ Sưu Tập"
        description={
          total > 0
            ? `${total} bộ phim đã lưu ${user ? 'trong tài khoản FlexPhim' : 'trên thiết bị này'} • Tự động ghi nhớ tiến trình phát`
            : "Lưu lại các bộ phim yêu thích để thưởng thức trọn vẹn bất cứ lúc nào."
        }
        imageSrc="/img-backtop/tab-watchlist.webp"
        objectPosition="center 4%"
        contentClassName="pb-8 sm:pb-10 md:pb-12"
      />

      {/* Content */}
      <div className="flex-1 relative z-20 w-full px-3.5 sm:px-6 md:pl-20 lg:pl-24 pr-3.5 sm:pr-6 md:pr-10 -mt-6 sm:-mt-8 md:-mt-10 lg:-mt-12 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader2 size={40} className="animate-spin text-sky-400" />
          </div>
        ) : watchlistItems.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-5 cv-grid-auto">
              {watchlistItems.map((item) => {
                const movie = "movie" in item ? item.movie : undefined;
                return (
                  <FilmCard
                    key={item.id}
                    film={{
                      slug: item.movieId,
                      name: movie?.title || item.movieData?.title || "Untitled",
                      origin_name: movie?.titleEn || item.movieData?.titleEn,
                      poster_url:
                        movie?.posterUrl ||
                        movie?.thumbUrl ||
                        item.movieData?.posterUrl ||
                        item.movieData?.thumbUrl,
                      type: movie?.type || item.movieData?.type,
                      year: movie?.year || item.movieData?.year,
                    }}
                    showActions
                  />
                );
              })}
            </div>
            {user && totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 sm:py-14 my-auto">
            <Bookmark size={48} className="mx-auto mb-3.5 text-purple-400/40" />
            <p className="text-base sm:text-lg font-bold text-purple-200/90">
              Chưa có phim nào trong danh sách
            </p>
            <p className="text-xs sm:text-sm text-purple-200/60 mt-1.5">
              Thêm phim bạn muốn xem sau vào đây
            </p>
            <Link
              href="/"
              className="inline-block mt-5 bg-white hover:bg-neutral-100 text-black px-6 py-2.5 rounded-full text-xs sm:text-sm font-extrabold transition-all shadow-md active:scale-95"
            >
              Khám phá phim
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
