"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  History as HistoryIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Trash2,
  Loader2,
  Clock,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { watchHistoryApi } from "@/lib/api";
import { resolveImageUrl } from "@/components/film/FilmCard";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/ToastProvider";
import { guestDataStorage } from "@/lib/user-data";
import { watchProgressStorage } from "@/lib/watch-progress";

interface HistoryItem {
  id: string;
  movieId: string;
  movieTitle: string;
  movieThumb?: string;
  episode?: string;
  progress: number;
  duration: number;
  updatedAt: string;
}

export default function HistoryPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [guestHistory, setGuestHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setGuestHistory(
      guestDataStorage.getHistory().map((item) => ({
        id: `guest-${item.slug}-${item.epSlug}`,
        movieId: item.slug,
        movieTitle: item.title,
        movieThumb: item.poster,
        episode: item.epSlug,
        progress: item.currentTime,
        duration: item.duration,
        updatedAt: new Date(item.updatedAt).toISOString(),
      })),
    );
  }, []);

  // Fetch history - must be called unconditionally (Rules of Hooks)
  const { data: historyData, isLoading } = useQuery({
    queryKey: ["watch-history", user?.id, page],
    queryFn: () => watchHistoryApi.getHistory(page, 24).then((r) => r.data),
    enabled: !!user, // Only fetch when user is logged in
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => watchHistoryApi.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-history"] });
      toast("Đã xóa khỏi lịch sử", "success");
    },
    onError: () => {
      toast("Không thể xóa", "error");
    },
  });

  // Clear all mutation
  const clearAllMutation = useMutation({
    mutationFn: () => watchHistoryApi.clearAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-history"] });
      toast("Đã xóa toàn bộ lịch sử", "success");
    },
  });

  const historyItems: HistoryItem[] = user
    ? historyData?.items || []
    : guestHistory;
  const total = user ? historyData?.total || 0 : guestHistory.length;
  const totalPages = user ? historyData?.totalPages || 1 : 1;

  const handleDelete = (id: string) => {
    setDeletingId(id);
    if (!user) {
      const item = guestHistory.find((entry) => entry.id === id);
      if (item) {
        const entry = guestDataStorage
          .getHistory()
          .find(
            (candidate) =>
              candidate.slug === item.movieId &&
              candidate.epSlug === item.episode,
          );
        if (entry) {
          watchProgressStorage.removeEntry(entry.slug, entry.epSlug);
        }
      }
      setGuestHistory((entries) => entries.filter((entry) => entry.id !== id));
      setDeletingId(null);
      toast("Đã xóa khỏi lịch sử", "success");
      return;
    }
    deleteMutation.mutate(id);
  };

  const handleClearAll = () => {
    if (confirm("Bạn có chắc muốn xóa toàn bộ lịch sử xem?")) {
      if (user) clearAllMutation.mutate();
      else {
        watchProgressStorage.clearAll();
        setGuestHistory([]);
      }
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  };

  // Format progress
  const formatProgress = (progress: number, duration: number) => {
    const percent = duration > 0 ? (progress / duration) * 100 : 0;
    return Math.min(Math.round(percent), 100);
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-16 lg:ml-20">
      {/* Header */}
      <div className="border-b border-white/10 bg-transparent sticky top-16 z-30">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
          {/* Back Button & Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ChevronLeft size={24} className="text-neutral-400" />
              </button>
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">
                  Lịch sử xem
                </h1>
                <p className="text-sm text-neutral-400 mt-1 normal-case font-normal tracking-normal">
                  {total} phim đã xem{" "}
                  {user ? "trong tài khoản" : "trên thiết bị này"}
                </p>
              </div>
            </div>

            {/* Clear All Button */}
            {historyItems.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={clearAllMutation.isPending}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Xóa tất cả</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={40} className="animate-spin text-blue-500" />
          </div>
        ) : historyItems.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {historyItems.map((item) => {
                const progress = formatProgress(item.progress, item.duration);
                const posterUrl = resolveImageUrl(item.movieThumb);

                return (
                  <div
                    key={item.id}
                    className="group bg-white/5 hover:bg-white/10 rounded-2xl overflow-hidden transition-all border border-white/10 hover:border-white/20 relative"
                  >
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="absolute top-3 right-3 z-10 p-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full transition-all opacity-0 group-hover:opacity-100"
                    >
                      {deletingId === item.id ? (
                        <Loader2
                          size={16}
                          className="animate-spin text-white"
                        />
                      ) : (
                        <X size={16} className="text-white" />
                      )}
                    </button>

                    <Link href={`/watch/${item.movieId}`} className="flex">
                      {/* Thumbnail */}
                      <div className="relative w-40 md:w-48 flex-shrink-0">
                        {posterUrl ? (
                          <Image
                            src={posterUrl}
                            alt={item.movieTitle}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                            <Play size={32} className="text-neutral-600" />
                          </div>
                        )}

                        {/* Progress Bar Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        {/* Play Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                            <Play
                              size={20}
                              fill="black"
                              className="text-black ml-1"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 p-4 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-white text-sm md:text-base line-clamp-2 mb-2">
                            {item.movieTitle}
                          </h3>

                          {item.episode && (
                            <p className="text-xs text-blue-400 font-semibold mb-2">
                              {item.episode}
                            </p>
                          )}

                          <div className="flex items-center space-x-2 text-xs text-neutral-400">
                            <Clock size={14} />
                            <span>{formatTimeAgo(item.updatedAt)}</span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-neutral-400">Đã xem</span>
                            <span className="text-white font-semibold">
                              {progress}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
            {user && totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={page === 1}
                  className="rounded-xl border border-white/15 p-2 text-white disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-neutral-400">
                  Trang {page}/{totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                  disabled={page === totalPages}
                  className="rounded-xl border border-white/15 p-2 text-white disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <HistoryIcon size={64} className="mx-auto mb-4 text-neutral-700" />
            <p className="text-xl font-semibold text-neutral-400">
              Chưa có lịch sử xem phim
            </p>
            <p className="text-sm text-neutral-500 mt-2">
              Bắt đầu xem phim để theo dõi tiến độ tại đây
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
