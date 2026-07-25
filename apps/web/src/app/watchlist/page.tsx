"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, ChevronLeft, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { watchlistApi } from "@/lib/api";
import { FilmCard } from "@/components/film/FilmCard";

export default function WatchlistPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  // Fetch watchlist data - must be called unconditionally (Rules of Hooks)
  const { data: watchlistData, isLoading } = useQuery({
    queryKey: ["watchlist", user?.id],
    queryFn: () => watchlistApi.get(1).then((r) => r.data),
    enabled: !!user, // Only fetch when user is logged in
  });

  // Redirect if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Bookmark size={64} className="mx-auto mb-4 text-neutral-600" />
          <h1 className="text-2xl font-bold text-white mb-2">
            Đăng nhập để xem danh sách
          </h1>
          <p className="text-neutral-400 mb-6">
            Bạn cần đăng nhập để truy cập danh sách xem sau
          </p>
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full font-semibold transition-colors"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  const watchlistItems = watchlistData?.items || [];

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
                {watchlistItems.length} phim đã lưu
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {watchlistItems.map((item: any) => (
              <FilmCard
                key={item.id}
                film={{
                  slug: item.movieId,
                  name: item.movieData?.title || "Untitled",
                  poster_url: item.movieData?.thumbUrl,
                  type: item.movieData?.type,
                  year: item.movieData?.year,
                }}
                showActions={true}
              />
            ))}
          </div>
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
