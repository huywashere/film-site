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
import { Pagination } from "@/components/film/Pagination";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/ToastProvider";
import { guestDataStorage } from "@/lib/user-data";
import { watchProgressStorage } from "@/lib/watch-progress";
import { cardFont } from "@/lib/fonts";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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
    queryFn: async () => {
      try {
        const res = await watchHistoryApi.getHistory(page, 24);
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => watchHistoryApi.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-history"] });
    },
  });

  // Clear all mutation
  const clearAllMutation = useMutation({
    mutationFn: () => watchHistoryApi.clearAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-history"] });
    },
  });

  const rawHistoryItems: HistoryItem[] = user
    ? Array.isArray(historyData?.items)
      ? historyData.items
      : Array.isArray(historyData)
        ? historyData
        : []
    : guestHistory;

  const historyItems = rawHistoryItems.filter((item) => !removedIds.includes(item.id));
  const total = historyItems.length;
  const totalPages = user ? historyData?.totalPages || 1 : 1;

  const handleDelete = (id: string) => {
    // ⚡ INSTANT OPTIMISTIC UI REMOVAL (0ms delay)
    setRemovedIds((prev) => [...prev, id]);
    toast("Đã xóa khỏi lịch sử", "success");

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
      return;
    }

    deleteMutation.mutate(id, {
      onError: () => {
        setRemovedIds((prev) => prev.filter((item) => item !== id));
        toast("Không thể xóa lúc này", "error");
      },
    });
  };

  const handleClearAll = () => {
    setShowClearConfirm(false);
    const allIds = rawHistoryItems.map((item) => item.id);
    setRemovedIds((prev) => [...new Set([...prev, ...allIds])]);
    toast("Đã xóa toàn bộ lịch sử", "success");

    if (user) {
      clearAllMutation.mutate(undefined, {
        onError: () => {
          setRemovedIds([]);
          toast("Không thể xóa toàn bộ lịch sử", "error");
        },
      });
    } else {
      watchProgressStorage.clearAll();
      setGuestHistory([]);
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
    <div
      className={`${cardFont.className} min-h-screen bg-background pb-16 pt-16 lg:ml-20`}
    >
      {/* Header */}
      <div className="relative z-10 border-b border-white/10 bg-background">
        <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-8 md:py-6">
          {/* Header (Centered) */}
          <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-2 gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              Lịch Sử Xem
            </h1>
            <p className="text-sm text-neutral-400 normal-case font-normal tracking-normal">
              {total} phim đã xem{" "}
              {user ? "trong tài khoản" : "trên thiết bị này"}
            </p>

            {/* Clear All Button */}
            {historyItems.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={clearAllMutation.isPending}
                className="mt-1 flex items-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-semibold text-xs transition-colors border border-red-500/20 disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>Xóa tất cả lịch sử</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-0 mx-auto max-w-[1600px] px-4 py-6 md:px-8 md:py-8">
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
                            unoptimized
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
                            unoptimized
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
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
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

      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent
          className={`${cardFont.className} w-[calc(100%-2rem)] max-w-[390px] gap-0 rounded-2xl border border-white/10 bg-[#181818] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)]`}
        >
          <div className="p-5 sm:p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-neutral-300">
              <Trash2 size={18} />
            </div>
            <DialogHeader className="space-y-2 pr-6 text-left">
              <DialogTitle className="text-base font-bold tracking-tight text-white">
                Xóa toàn bộ lịch sử?
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-5 text-neutral-400">
                Tiến độ của {total} phim trên thiết bị này sẽ bị xóa và không
                thể khôi phục.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-white/[0.07] px-5 py-4">
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-xs font-semibold text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Hủy
              </button>
            </DialogClose>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={clearAllMutation.isPending}
              className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Xóa lịch sử
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
