export interface WatchProgressEntry {
  slug: string;
  epSlug: string;
  epName: string;
  title: string;
  poster: string;
  thumb?: string;
  originName?: string;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

const STORAGE_KEY = "netphim_continue_watching";
let lastSyncTimestamp = 0;

export const watchProgressStorage = {
  getHistoryEntries: (): WatchProgressEntry[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return (JSON.parse(raw) as WatchProgressEntry[]).sort(
        (a, b) => b.updatedAt - a.updatedAt,
      );
    } catch {
      return [];
    }
  },

  getEntries: (): WatchProgressEntry[] => {
    return (
      watchProgressStorage
        .getHistoryEntries()
        // Filter out invalid items or completed items (>95% watched)
        .filter(
          (item) =>
            item.duration > 0 && item.currentTime / item.duration < 0.95,
        )
        .sort((a, b) => b.updatedAt - a.updatedAt)
    );
  },

  saveProgress: (entry: Omit<WatchProgressEntry, "updatedAt">) => {
    if (typeof window === "undefined") return;
    try {
      const entries = watchProgressStorage.getHistoryEntries();
      const existingIndex = entries.findIndex(
        (e) => e.slug === entry.slug && e.epSlug === entry.epSlug,
      );
      const existing = existingIndex >= 0 ? entries[existingIndex] : undefined;

      const safePoster = entry.poster?.trim() || existing?.poster?.trim() || "";
      const safeThumb = entry.thumb?.trim() || existing?.thumb?.trim() || safePoster || "";
      const safeOriginName = entry.originName?.trim() || existing?.originName?.trim() || undefined;

      const newEntry: WatchProgressEntry = {
        ...existing,
        ...entry,
        poster: safePoster || safeThumb,
        thumb: safeThumb || safePoster,
        originName: safeOriginName,
        updatedAt: Date.now(),
      };

      if (existingIndex >= 0) {
        entries[existingIndex] = newEntry;
      } else {
        entries.unshift(newEntry);
      }

      // Limit to 30 recent items
      const trimmed = entries.slice(0, 30);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

      // Async sync to DB backend (throttled: at most once every 5 seconds)
      const now = Date.now();
      if (now - lastSyncTimestamp > 5000) {
        lastSyncTimestamp = now;
        import("@/lib/api").then(({ api }) => {
          api.put("/users/me/watch-history", {
            movieId: entry.slug,
            movieTitle: entry.title,
            movieThumb: newEntry.thumb || newEntry.poster,
            moviePoster: newEntry.poster || newEntry.thumb,
            episode: entry.epSlug || "1",
            progress: entry.currentTime,
            duration: entry.duration,
          }).catch(() => {});
        }).catch(() => {});
      }
    } catch (e) {
      console.error("Failed to save watch progress:", e);
    }
  },

  removeEntry: (slug: string, epSlug?: string) => {
    if (typeof window === "undefined") return;
    try {
      let entries = watchProgressStorage.getEntries();
      if (epSlug) {
        entries = entries.filter(
          (e) => !(e.slug === slug && e.epSlug === epSlug),
        );
      } else {
        entries = entries.filter((e) => e.slug !== slug);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.error("Failed to remove watch progress entry:", e);
    }
  },

  clearAll: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  },
};

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
