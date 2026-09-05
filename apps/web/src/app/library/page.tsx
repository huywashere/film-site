"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  BookmarkCheck,
  Clock3,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Play,
  Star,
  Trash2,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import { reviewsApi, watchHistoryApi, watchlistApi } from "@/lib/api";
import { FilmCard, resolveImageUrl } from "@/components/film/FilmCard";
import { Pagination } from "@/components/film/Pagination";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/ToastProvider";
import type { WatchHistoryItem, WatchlistItem } from "@/types/movie";

const LIBRARY_TABS = [
  { id: "saved", label: "Đã lưu", icon: BookmarkCheck },
  { id: "continue", label: "Tiếp tục xem", icon: Clock3 },
  { id: "reviews", label: "Bài đánh giá", icon: FileText },
] as const;

type LibraryTab = (typeof LIBRARY_TABS)[number]["id"];

export default function LibraryPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<LibraryTab>("saved");
  const [savedPage, setSavedPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const { data: watchlistData, isLoading: watchlistLoading } = useQuery({
    queryKey: ["watchlist", user?.id, savedPage],
    queryFn: () =>
      watchlistApi.get(savedPage).then((response) => response.data),
    enabled: Boolean(user),
  });
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["watch-history", user?.id, historyPage],
    queryFn: () =>
      watchHistoryApi
        .getHistory(historyPage, 24)
        .then((response) => response.data),
    enabled: Boolean(user),
  });
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["my-reviews", user?.id],
    queryFn: () => reviewsApi.getMine(1).then((response) => response.data),
    enabled: Boolean(user),
  });
  const deleteReview = useMutation({
    mutationFn: (id: string) => reviewsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      toast("Đã xóa bài đánh giá", "success");
    },
    onError: () => toast("Không thể xóa bài đánh giá", "error"),
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background px-4 pb-16 pt-24">
        <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
          <BookOpen size={64} className="mb-4 text-neutral-600" />
          <h1 className="text-2xl font-bold text-white">
            Đăng nhập để xem thư viện
          </h1>
          <p className="mt-2 text-neutral-400">
            Lưu phim, tiếp tục xem và quản lý các đánh giá của bạn.
          </p>
          <button
            type="button"
            onClick={() => useAuthModalStore.getState().openModal("login")}
            className="mt-6 rounded-full bg-violet-600 hover:bg-violet-500 px-8 py-3 font-semibold text-white transition-colors cursor-pointer shadow-lg shadow-violet-600/25"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  const savedItems: WatchlistItem[] = watchlistData?.items ?? [];
  const historyItems: WatchHistoryItem[] = historyData?.items ?? [];
  const reviews = reviewsData?.reviews ?? [];
  const isLoading =
    (activeTab === "saved" && watchlistLoading) ||
    (activeTab === "continue" && historyLoading) ||
    (activeTab === "reviews" && reviewsLoading);
  const activePage = activeTab === "saved" ? savedPage : historyPage;
  const activeTotalPages =
    activeTab === "saved"
      ? watchlistData?.totalPages || 1
      : historyData?.totalPages || 1;
  const setActivePage = activeTab === "saved" ? setSavedPage : setHistoryPage;

  return (
    <div className="min-h-screen bg-background pb-16 pt-20 lg:ml-20">
      <header className="sticky top-16 z-30 border-b border-white/10 bg-[#141414]/95 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8">
          <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
            Thư viện của bạn
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Những nội dung gắn với tài khoản của bạn.
          </p>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {LIBRARY_TABS.map((tab) => {
              const Icon = tab.icon;
              const count =
                tab.id === "saved"
                  ? savedItems.length
                  : tab.id === "continue"
                    ? historyItems.length
                    : reviews.length;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                    activeTab === tab.id
                      ? "bg-blue-500 text-white"
                      : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon size={17} />
                  {tab.label}
                  <span className="rounded-md bg-black/15 px-1.5 py-0.5 text-xs">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-blue-500" size={38} />
          </div>
        ) : activeTab === "saved" ? (
          savedItems.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 xl:grid-cols-6">
              {savedItems.map((item) => (
                <FilmCard
                  key={item.id}
                  showActions
                  film={{
                    slug: item.movieId,
                    name:
                      item.movie?.title ??
                      item.movieData?.title ??
                      "Chưa có tiêu đề",
                    origin_name: item.movie?.titleEn,
                    poster_url:
                      item.movie?.posterUrl ?? item.movieData?.posterUrl,
                    thumb_url: item.movie?.thumbUrl ?? item.movieData?.thumbUrl,
                    type: item.movie?.type ?? item.movieData?.type,
                    year: item.movie?.year ?? item.movieData?.year,
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BookmarkCheck}
              text="Bạn chưa lưu phim nào."
              actionHref="/films"
              actionLabel="Khám phá phim"
            />
          )
        ) : activeTab === "continue" ? (
          historyItems.length ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {historyItems.map((item) => {
                const percent =
                  item.duration > 0
                    ? Math.min(
                        100,
                        Math.round((item.progress / item.duration) * 100),
                      )
                    : 0;
                return (
                  <Link
                    key={item.id}
                    href={`/watch/${item.movieId}`}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
                  >
                    <div className="flex min-h-32">
                      <div className="relative w-28 shrink-0 bg-neutral-900 sm:w-36">
                        {item.movieThumb ? (
                          <img
                            src={resolveImageUrl(item.movieThumb) || ""}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Play className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-neutral-500" />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center p-4">
                        <p className="truncate font-bold text-white">
                          {item.movieTitle}
                        </p>
                        <p className="mt-1 text-sm text-neutral-400">
                          {item.episode ? `Tập ${item.episode} · ` : ""}
                          {percent}% đã xem
                        </p>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Clock3}
              text="Chưa có nội dung đang xem dở."
              actionHref="/films"
              actionLabel="Xem phim ngay"
            />
          )
        ) : reviews.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {reviews.map((review: any) => (
              <article
                key={review.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/film/${review.movieId}`}
                      className="font-bold text-white hover:text-blue-300"
                    >
                      {review.movie?.title ?? review.movieId}
                    </Link>
                    {review.rating && (
                      <div className="mt-1 flex items-center gap-1 text-sm text-amber-300">
                        <Star size={14} fill="currentColor" /> {review.rating}/5
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteReview.mutate(review.id)}
                    disabled={deleteReview.isPending}
                    className="rounded-lg p-2 text-neutral-400 hover:bg-red-500/10 hover:text-red-300"
                    aria-label="Xóa bài đánh giá"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-neutral-300">
                  {review.content}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            text="Bạn chưa viết bài đánh giá nào."
            actionHref="/films"
            actionLabel="Tìm phim để đánh giá"
          />
        )}
        {activeTab !== "reviews" && activeTotalPages > 1 && (
          <Pagination
            currentPage={activePage}
            totalPages={activeTotalPages}
            onPageChange={setActivePage}
          />
        )}
      </main>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  text,
  actionHref,
  actionLabel,
}: {
  icon: typeof BookOpen;
  text: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="py-24 text-center">
      <Icon size={56} className="mx-auto text-neutral-700" />
      <p className="mt-4 text-lg font-semibold text-neutral-300">{text}</p>
      <Link
        href={actionHref}
        className="mt-6 inline-flex rounded-full bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
