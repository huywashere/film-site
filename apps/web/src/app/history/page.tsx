'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  History as HistoryIcon,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  X,
  Play,
  Trash2,
  Loader2,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { movieApi, watchHistoryApi } from '@/lib/api';
import type { FilmItem } from '@/components/film/FilmCard';
import { TmdbArtwork } from '@/components/film/TmdbArtwork';
import { Pagination } from '@/components/film/Pagination';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastProvider';
import { guestDataStorage } from '@/lib/user-data';
import { watchProgressStorage } from '@/lib/watch-progress';
import { cardFont } from '@/lib/fonts';
import { formatEpisodeLabel } from '@/lib/player-source-routing';
import { useReliableNavigation } from '@/hooks/useReliableNavigation';
import { VerticalTabsHeroBanner } from '@/components/layout/VerticalTabsHeroBanner';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface HistoryItem {
  id: string;
  movieId: string;
  movieTitle: string;
  movieThumb?: string;
  moviePoster?: string;
  episode?: string;
  progress: number;
  duration: number;
  updatedAt: string;
}

export default function HistoryPage() {
  const { user } = useAuthStore();
  const router = useReliableNavigation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [guestHistory, setGuestHistory] = useState<HistoryItem[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const loadGuestHistory = () => {
      setGuestHistory(
        guestDataStorage.getHistory().map((item) => ({
          id: `guest-${item.slug}-${item.epSlug}`,
          movieId: item.slug,
          movieTitle: item.title,
          movieThumb: item.thumb || item.poster,
          moviePoster: item.poster || item.thumb,
          episode: item.epSlug,
          progress: item.currentTime,
          duration: item.duration,
          updatedAt: new Date(item.updatedAt).toISOString(),
        })),
      );
    };

    loadGuestHistory();

    window.addEventListener('netphim_history_cleared', loadGuestHistory);
    window.addEventListener('netphim_episode_progress_changed', loadGuestHistory);
    return () => {
      window.removeEventListener('netphim_history_cleared', loadGuestHistory);
      window.removeEventListener('netphim_episode_progress_changed', loadGuestHistory);
    };
  }, []);

  // Fetch history - must be called unconditionally (Rules of Hooks)
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['watch-history', user?.id, page],
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

  // Reconcile legacy history thumbnails with the current canonical catalogue
  // in one cached request. This avoids one detail request per card while
  // repairing images that were saved before source deduplication was fixed.
  const { data: artworkFeed } = useQuery({
    queryKey: ['home-feed-v1', 64],
    queryFn: () => movieApi.getHomeFeed(64).then((response) => response.data),
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const artworkBySlug = useMemo(() => {
    const map = new Map<string, FilmItem>();
    for (const films of Object.values(artworkFeed?.sections || {})) {
      for (const film of films as FilmItem[]) {
        if (film.slug) map.set(film.slug, film);
        for (const sourceSlug of Object.values(film._sourceSlugs || {})) {
          if (sourceSlug) map.set(sourceSlug, film);
        }
      }
    }
    return map;
  }, [artworkFeed?.sections]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => watchHistoryApi.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watch-history'] });
    },
  });

  // Clear all mutation
  const clearAllMutation = useMutation({
    mutationFn: () => watchHistoryApi.clearAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watch-history'] });
    },
  });

  const rawHistoryItems: HistoryItem[] = user
    ? Array.isArray(historyData?.items)
      ? historyData.items
      : Array.isArray(historyData)
        ? historyData
        : []
    : guestHistory;

  const [filterMode, setFilterMode] = useState<'all' | 'in_progress' | 'completed'>('all');

  const historyItems = useMemo(() => {
    const unremoved = rawHistoryItems.filter((item) => !removedIds.includes(item.id));
    if (filterMode === 'all') return unremoved;
    return unremoved.filter((item) => {
      const percent = item.duration > 0 ? (item.progress / item.duration) * 100 : 0;
      if (filterMode === 'completed') return percent >= 90;
      return percent < 90;
    });
  }, [rawHistoryItems, removedIds, filterMode]);

  const total = rawHistoryItems.filter((item) => !removedIds.includes(item.id)).length;
  const totalPages = user ? historyData?.totalPages || 1 : 1;

  const HISTORY_TABS = [
    { id: 'all' as const, label: `Tất Cả (${total})` },
    { id: 'in_progress' as const, label: 'Đang Xem Dở' },
    { id: 'completed' as const, label: 'Đã Xem Xong' },
  ];

  const handleDelete = (id: string) => {
    // ⚡ INSTANT OPTIMISTIC UI REMOVAL (0ms delay)
    setRemovedIds((prev) => [...prev, id]);
    toast('Đã xóa khỏi lịch sử', 'success');

    // Always clean up from local device progress
    const item = rawHistoryItems.find((entry) => entry.id === id);
    if (item) {
      watchProgressStorage.removeEntry(item.movieId, item.episode);
    }

    if (!user) {
      setGuestHistory((entries) => entries.filter((entry) => entry.id !== id));
      return;
    }

    deleteMutation.mutate(id, {
      onError: () => {
        setRemovedIds((prev) => prev.filter((item) => item !== id));
        toast('Không thể xóa lúc này', 'error');
      },
    });
  };

  const handleClearAll = () => {
    setShowClearConfirm(false);
    const allIds = rawHistoryItems.map((item) => item.id);
    setRemovedIds((prev) => [...new Set([...prev, ...allIds])]);
    toast('Đã xóa toàn bộ lịch sử', 'success');

    // Always clear local device storage completely
    watchProgressStorage.clearAll();
    guestDataStorage.clear();
    setGuestHistory([]);

    if (user) {
      clearAllMutation.mutate(undefined, {
        onError: () => {
          setRemovedIds([]);
          toast('Không thể xóa toàn bộ lịch sử', 'error');
        },
      });
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
    <div className={cn(cardFont.className, "min-h-[calc(100dvh+5rem)] sm:min-h-[calc(100dvh+6rem)] flex flex-col bg-[#0a0b10] text-white pb-24 sm:pb-28 -mt-20 sm:-mt-24 select-none")}>
      {/* ── Top Hero Banner (Fury Movie with Full Face Visibility & Integrated Controls) ── */}
      <VerticalTabsHeroBanner
        title="Lịch Sử Xem Phim"
        description={
          total > 0
            ? `${total} bộ phim đã xem ${user ? 'trong tài khoản FlexPhim' : 'trên thiết bị này'} • Tự động ghi nhớ từng giây và từng tập`
            : "Theo dõi và tiếp tục thưởng thức các bộ phim bạn đã xem gần đây."
        }
        imageSrc="/img-backtop/tab-history.webp"
        blurDataURL="data:image/webp;base64,UklGRv4AAABXRUJQVlA4IPIAAADwBQCdASogABIAPu1iqU2ppaOiMAgBMB2JZQAIEDiBcIDVyHA8Q3aJHJd9BQaF9Frur+iQmLdVgAD+5/9Bba2d4cvkC8K6880zmOmQvSRuzSZvwqlZHcMvg2c+Oijineh+pe5bdeZRfQsKilyX4EdQQ5wJ57kPSwYJEYX85kq/TtiWrCR+qiL+Xq6ESZtRYsWpy6mxqwTvtdh0wJwt46qVD9Y/Nz6kPuimHEuNVR5gqNikr0AGLIYIYyi9cStwZsowiV0tr2SrXsWiox8X3VnLGycsVnWrY7Z6wd//OVl6LVWMQeP1OlGSDiHO4gN5WUgAAA=="
        objectPosition="center 4%"
        contentClassName="pb-6 sm:pb-8 md:pb-10"
      >
        {/* Filter Tabs matching reference UI & Clear Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
            {HISTORY_TABS.map((tab) => {
              const isActive = filterMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={cn(
                    'relative px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer select-none active:scale-95',
                    isActive
                      ? 'text-white bg-white/15 border border-white/20 shadow-sm font-bold'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent',
                  )}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {total > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={clearAllMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={13} />
              <span>Xóa tất cả lịch sử</span>
            </button>
          )}
        </div>
      </VerticalTabsHeroBanner>

      {/* Content */}
      <div className="flex-1 relative z-20 w-full px-3.5 sm:px-6 md:pl-20 lg:pl-24 pr-3.5 sm:pr-6 md:pr-10 pt-2 sm:pt-3 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 size={40} className="animate-spin text-blue-500" />
          </div>
        ) : historyItems.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {historyItems.map((item) => {
                const progress = formatProgress(item.progress, item.duration);
                const catalogFilm = artworkBySlug.get(item.movieId);
                const historyFilm: FilmItem = {
                  ...catalogFilm,
                  slug: item.movieId,
                  name: catalogFilm?.name || item.movieTitle,
                  title: catalogFilm?.title || item.movieTitle,
                  thumb_url:
                    catalogFilm?.thumb_url ||
                    item.movieThumb ||
                    item.moviePoster ||
                    catalogFilm?.poster_url,
                  poster_url:
                    catalogFilm?.poster_url ||
                    item.moviePoster ||
                    item.movieThumb ||
                    catalogFilm?.thumb_url,
                };

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
                        <Loader2 size={16} className="animate-spin text-white" />
                      ) : (
                        <X size={16} className="text-white" />
                      )}
                    </button>

                    <Link
                      href={`/watch/${item.movieId}${
                        item.episode ? `?ep=${encodeURIComponent(item.episode)}` : ''
                      }`}
                      className="flex"
                    >
                      {/* Thumbnail */}
                      <div className="relative w-40 md:w-48 flex-shrink-0">
                        <TmdbArtwork
                          film={historyFilm}
                          kind="poster"
                          alt={item.movieTitle}
                          className="absolute inset-0 h-full w-full"
                          allowTitleLookup
                        />

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
                            <Play size={20} fill="black" className="text-black ml-1" />
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
                              {formatEpisodeLabel(item.episode)}
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
                            <span className="text-white font-semibold">{progress}%</span>
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
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 sm:py-14 my-auto">
            <HistoryIcon size={48} className="mx-auto mb-3.5 text-neutral-500" />
            <p className="text-base sm:text-lg font-bold text-white">Chưa có lịch sử xem phim</p>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1.5">
              Bắt đầu xem phim để theo dõi tiến độ tại đây
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
                Tiến độ của {total} phim trên thiết bị này sẽ bị xóa và không thể khôi phục.
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
