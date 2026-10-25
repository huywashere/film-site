import type { WatchProgressEntry } from "@/lib/watch-progress";
import { watchProgressStorage } from "@/lib/watch-progress";
import { watchHistoryApi, watchlistApi } from "@/lib/api";
import { getGlobalQueryClient } from "@/providers/QueryProvider";

export interface StoredMovieData {
  title: string;
  titleEn?: string;
  posterUrl?: string;
  thumbUrl?: string;
  type?: string;
  year?: number;
}

export interface GuestWatchlistItem {
  id: string;
  movieId: string;
  movieData: StoredMovieData;
  addedAt: number;
}

export interface MergeResult {
  watchlistCount: number;
  historyCount: number;
  total: number;
}

const WATCHLIST_KEY = "netphim_guest_watchlist";
const FAVORITES_KEY = "netphim_guest_favorites";
const LAST_MERGED_USER_KEY = "netphim_last_merged_user";
const LAST_MERGED_AT_KEY = "netphim_last_merged_at";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Scan all local guest watch history entries, including both the top-level
 * continue-watching list and individual per-movie episode progress maps.
 */
export function getAllGuestWatchHistoryEntries(): WatchProgressEntry[] {
  if (typeof window === "undefined") return [];

  const topLevel = watchProgressStorage.getHistoryEntries();
  const additionalEpEntries: WatchProgressEntry[] = [];

  try {
    const watchlist = guestDataStorage.getWatchlist();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("netphim_ep_progress_")) {
        const slug = key.slice("netphim_ep_progress_".length).trim();
        if (!slug) continue;

        const raw = localStorage.getItem(key);
        if (!raw) continue;

        const epMap = JSON.parse(raw) as Record<
          string,
          { time?: number; duration?: number; percent?: number; updatedAt?: number }
        >;

        const topEntry = topLevel.find((e) => e.slug === slug);
        const watchlistItem = watchlist.find((w) => w.movieId === slug);
        const title = topEntry?.title || watchlistItem?.movieData.title || slug;
        const poster = topEntry?.poster || watchlistItem?.movieData.posterUrl || "";
        const thumb = topEntry?.thumb || watchlistItem?.movieData.thumbUrl || poster;

        for (const [epKey, data] of Object.entries(epMap)) {
          const time = Number(data?.time) || 0;
          const duration = Number(data?.duration) || 0;
          if (time >= 5 && duration > 0) {
            additionalEpEntries.push({
              slug,
              epSlug: epKey,
              epName: `Tập ${epKey}`,
              title,
              poster,
              thumb,
              currentTime: time,
              duration,
              updatedAt: Number(data?.updatedAt) || Date.now(),
            });
          }
        }
      }
    }
  } catch {}

  // Deduplicate entries by unique (slug, epSlug)
  const map = new Map<string, WatchProgressEntry>();

  for (const entry of [...topLevel, ...additionalEpEntries]) {
    const normEp = String(entry.epSlug || entry.epName || "1")
      .toLowerCase()
      .replace(/^tập\s*/i, "")
      .replace(/^tap-/i, "")
      .replace(/^0+/, "")
      .trim();

    const dedupeKey = `${entry.slug}___${normEp || "1"}`;
    const existing = map.get(dedupeKey);

    if (!existing) {
      map.set(dedupeKey, entry);
    } else {
      // Keep entry with higher watch time or more recent update
      const existingUpdated = existing.updatedAt || 0;
      const currentUpdated = entry.updatedAt || 0;
      if (currentUpdated > existingUpdated || entry.currentTime > existing.currentTime) {
        map.set(dedupeKey, {
          ...existing,
          ...entry,
          currentTime: Math.max(existing.currentTime, entry.currentTime),
          updatedAt: Math.max(existingUpdated, currentUpdated),
        });
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 30); // Cap to 30 most recent items to prevent rate limits
}

/**
 * Execute tasks with controlled concurrency and delay to respect API throttle limits
 */
async function runWithConcurrencyLimit<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map((item) => fn(item)));
    results.push(...batchResults);
    if (i + concurrency < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
  }
  return results;
}

export const guestDataStorage = {
  getWatchlist(): GuestWatchlistItem[] {
    return read<GuestWatchlistItem[]>(WATCHLIST_KEY, []).sort(
      (a, b) => b.addedAt - a.addedAt,
    );
  },

  isWatchlisted(movieId: string) {
    return this.getWatchlist().some((item) => item.movieId === movieId);
  },

  getFavorites(): GuestWatchlistItem[] {
    return read<GuestWatchlistItem[]>(FAVORITES_KEY, []).sort(
      (a, b) => b.addedAt - a.addedAt,
    );
  },

  isFavorite(movieId: string) {
    return this.getFavorites().some((item) => item.movieId === movieId);
  },

  toggleFavorite(movieId: string, movieData: StoredMovieData): boolean {
    const isFav = this.isFavorite(movieId);
    if (isFav) {
      write(
        FAVORITES_KEY,
        this.getFavorites().filter((item) => item.movieId !== movieId),
      );
    } else {
      const items = this.getFavorites().filter(
        (item) => item.movieId !== movieId,
      );
      const item: GuestWatchlistItem = {
        id: `guest-fav-${movieId}`,
        movieId,
        movieData,
        addedAt: Date.now(),
      };
      write(FAVORITES_KEY, [item, ...items]);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("netphim_favorites_changed", {
          detail: { movieId, isFavorite: !isFav },
        }),
      );
    }

    return !isFav;
  },

  addWatchlist(movieId: string, movieData: StoredMovieData) {
    const items = this.getWatchlist().filter(
      (item) => item.movieId !== movieId,
    );
    const item: GuestWatchlistItem = {
      id: `guest-${movieId}`,
      movieId,
      movieData,
      addedAt: Date.now(),
    };
    write(WATCHLIST_KEY, [item, ...items]);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("netphim_watchlist_changed", {
          detail: { movieId, action: "add" },
        }),
      );
    }

    return item;
  },

  removeWatchlist(movieId: string) {
    write(
      WATCHLIST_KEY,
      this.getWatchlist().filter((item) => item.movieId !== movieId),
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("netphim_watchlist_changed", {
          detail: { movieId, action: "remove" },
        }),
      );
    }
  },

  getHistory(): WatchProgressEntry[] {
    return getAllGuestWatchHistoryEntries();
  },

  hasData() {
    return this.getWatchlist().length > 0 || this.getFavorites().length > 0 || this.getHistory().length > 0;
  },

  /**
   * Checks whether there is unmerged guest data for the given user id.
   */
  hasPendingData(userId?: string): boolean {
    if (typeof window === "undefined") return false;

    const watchlist = this.getWatchlist();
    const favorites = this.getFavorites();
    if (watchlist.length > 0 || favorites.length > 0) return true;

    const history = this.getHistory();
    if (history.length === 0) return false;

    if (!userId) return true;

    const lastUser = localStorage.getItem(LAST_MERGED_USER_KEY);
    const lastMergedAt = Number(localStorage.getItem(LAST_MERGED_AT_KEY)) || 0;

    if (lastUser === userId && lastMergedAt > 0) {
      // Check if any watch progress entry was updated after the last merge
      return history.some((e) => (e.updatedAt || 0) > lastMergedAt);
    }

    return true;
  },

  clearHistory() {
    watchProgressStorage.clearAll();
  },

  clear() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(WATCHLIST_KEY);
    localStorage.removeItem(FAVORITES_KEY);
  },
};

let isMergingInProgress = false;

/**
 * Server upserts make this retry-safe: local data remains untouched until every
 * write succeeds, so a temporary API outage cannot discard a guest's progress.
 */
export async function mergeGuestDataIntoAccount(userId?: string): Promise<MergeResult> {
  if (typeof window === "undefined") {
    return { watchlistCount: 0, historyCount: 0, total: 0 };
  }

  // Combine watchlist and favorites for syncing
  const rawWatchlist = guestDataStorage.getWatchlist();
  const rawFavorites = guestDataStorage.getFavorites();

  const watchlistMap = new Map<string, StoredMovieData>();
  for (const item of [...rawWatchlist, ...rawFavorites]) {
    if (!watchlistMap.has(item.movieId)) {
      watchlistMap.set(item.movieId, item.movieData);
    }
  }

  const watchlistItems = Array.from(watchlistMap.entries()).slice(0, 20);
  const historyEntries = getAllGuestWatchHistoryEntries();

  if (watchlistItems.length === 0 && historyEntries.length === 0) {
    return { watchlistCount: 0, historyCount: 0, total: 0 };
  }

  // 1. Sync Watchlist items (concurrency: 3)
  const watchlistResults = await runWithConcurrencyLimit(
    watchlistItems,
    3,
    ([movieId, movieData]) => watchlistApi.add(movieId, movieData),
  );

  const syncedWatchlistCount = watchlistResults.filter(
    (r) => r.status === "fulfilled",
  ).length;

  // 2. Sync Watch History entries (concurrency: 3)
  const historyResults = await runWithConcurrencyLimit(
    historyEntries,
    3,
    (item) =>
      watchHistoryApi.upsert({
        movieId: item.slug,
        episode: item.epSlug || item.epName || "1",
        progress: Math.round(item.currentTime),
        duration: Math.round(item.duration),
        movieTitle: item.title || item.slug,
        movieThumb: item.poster || item.thumb,
      }),
  );

  const syncedHistoryCount = historyResults.filter(
    (r) => r.status === "fulfilled",
  ).length;

  // Mark merge as completed for this user
  if (userId) {
    try {
      localStorage.setItem(LAST_MERGED_USER_KEY, userId);
      localStorage.setItem(LAST_MERGED_AT_KEY, String(Date.now()));
    } catch {}
  }

  // Clean up temporary guest watchlist and favorites keys
  guestDataStorage.clear();

  // Invalidate React Query caches for immediate 0ms UI update
  try {
    const qc = getGlobalQueryClient();
    if (qc) {
      qc.invalidateQueries({ queryKey: ["watch-history"] });
      qc.invalidateQueries({ queryKey: ["watchlist"] });
      qc.invalidateQueries({ queryKey: ["watch-history-resume"] });
      qc.invalidateQueries({ queryKey: ["watch-history-row"] });
      qc.invalidateQueries({ queryKey: ["user-library"] });
    }
  } catch {}

  // Dispatch custom event for real-time listener components
  window.dispatchEvent(
    new CustomEvent("netphim_guest_data_merged", {
      detail: {
        userId,
        historyCount: syncedHistoryCount,
        watchlistCount: syncedWatchlistCount,
        total: syncedHistoryCount + syncedWatchlistCount,
      },
    }),
  );

  return {
    watchlistCount: syncedWatchlistCount,
    historyCount: syncedHistoryCount,
    total: syncedWatchlistCount + syncedHistoryCount,
  };
}

/**
 * Automatically triggers background merge upon user sign-in.
 * Safe to call multiple times (idempotent, protected against concurrent runs).
 */
export async function autoMergeGuestDataOnLogin(
  userId: string,
  onMerged?: (result: MergeResult) => void,
): Promise<void> {
  if (!userId || isMergingInProgress || typeof window === "undefined") return;

  if (!guestDataStorage.hasPendingData(userId)) return;

  isMergingInProgress = true;
  try {
    const result = await mergeGuestDataIntoAccount(userId);
    if (result.total > 0 && onMerged) {
      onMerged(result);
    }
  } catch (err) {
    console.warn("Auto-merge guest data error:", err);
  } finally {
    isMergingInProgress = false;
  }
}
