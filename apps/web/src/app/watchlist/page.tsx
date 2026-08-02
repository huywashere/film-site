"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { watchlistApi } from "@/lib/api";
import { FilmCard } from "@/components/film/FilmCard";
import type { WatchlistItem } from "@/types/movie";
import { guestDataStorage, type GuestWatchlistItem } from "@/lib/user-data";

export default function WatchlistPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [guestItems, setGuestItems] = useState<GuestWatchlistItem[]>([]);

  useEffect(() => {
    setGuestItems(guestDataStorage.getWatchlist());
  }, []);

  // Fetch watchlist data - must be called unconditionally (Rules of Hooks)
  const { data: watchlistData, isLoading } = useQuery({
    queryKey: ["watchlist", user?.id, page],
    queryFn: () => watchlistApi.get(page).then((r) => r.data),
    enabled: !!user, // Only fetch when user is logged in
  });

  const watchlistItems: Array<WatchlistItem | GuestWatchlistItem> = user
    ? watchlistData?.items || []
    : guestItems;
  const total = user ? watchlistData?.total || 0 : guestItems.length;
  const totalPages = user ? watchlistData?.totalPages || 1 : 1;

  return (
    <div className="min-h-screen bg-background pt-20 pb-16 lg:ml-20">
      {/* Header */}
      <div className="border-b border-white/10 bg-transparent sticky top-16 z-30">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
          {/* Back Button & Title */}
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronLeft size={24} className="text-neutral-400" />
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">
                Xem sau
              </h1>
              <p className="text-sm text-neutral-400 mt-1 normal-case font-normal tracking-normal">
                {total} phim đã lưu{" "}
                {user ? "trong tài khoản" : "trên thiết bị này"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={40} className="animate-spin text-blue-500" />
          </div>
        ) : watchlistItems.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
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
              <div className="mt-10 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-neutral-400">
                  Trang {page}/{totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page === totalPages}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <Bookmark size={64} className="mx-auto mb-4 text-neutral-700" />
            <p className="text-xl font-semibold text-neutral-400">
              Chưa có phim nào trong danh sách
            </p>
            <p className="text-sm text-neutral-500 mt-2">
              Thêm phim bạn muốn xem sau vào đây
            </p>
            <Link
              href="/"
              className="inline-block mt-6 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-full font-semibold transition-colors"
            >
              Khám phá phim
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
