import type { WatchProgressEntry } from "@/lib/watch-progress";
import { watchProgressStorage } from "@/lib/watch-progress";
import { watchHistoryApi, watchlistApi } from "@/lib/api";

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

const WATCHLIST_KEY = "netphim_guest_watchlist";
const FAVORITES_KEY = "netphim_guest_favorites";

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
    return watchProgressStorage.getHistoryEntries();
  },

  hasData() {
    return this.getWatchlist().length > 0 || this.getHistory().length > 0;
  },

  clear() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(WATCHLIST_KEY);
    watchProgressStorage.clearAll();
  },
};

/**
 * Server upserts make this retry-safe: local data remains untouched until every
 * write succeeds, so a temporary API outage cannot discard a guest's progress.
 */
export async function mergeGuestDataIntoAccount() {
  const watchlist = guestDataStorage.getWatchlist();
  const history = guestDataStorage.getHistory();

  const results = await Promise.allSettled([
    ...watchlist.map((item) => watchlistApi.add(item.movieId, item.movieData)),
    ...history.map((item) =>
      watchHistoryApi.upsert({
        movieId: item.slug,
        episode: item.epSlug,
        progress: item.currentTime,
        duration: item.duration,
        movieTitle: item.title,
        movieThumb: item.poster,
      }),
    ),
  ]);

  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length) {
    throw new Error("Không thể đồng bộ toàn bộ dữ liệu lúc này");
  }

  guestDataStorage.clear();
  return { watchlist: watchlist.length, history: history.length };
}
