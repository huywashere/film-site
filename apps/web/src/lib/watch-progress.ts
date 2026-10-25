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

      // Dedicated per-movie episode progress map (Netflix-style persistent progress for all episodes)
      try {
        const movieProgressKey = `netphim_ep_progress_${entry.slug}`;
        const movieRaw = localStorage.getItem(movieProgressKey);
        const movieMap: Record<string, { time: number; duration: number; percent: number; updatedAt: number }> =
          movieRaw ? JSON.parse(movieRaw) : {};
        const percent =
          entry.duration > 0
            ? Math.min(100, Math.round((entry.currentTime / entry.duration) * 100))
            : 0;
        const epKey = String(entry.epSlug || entry.epName || '')
          .toLowerCase()
          .replace(/^tập\s*/i, '')
          .replace(/^tap-/i, '')
          .replace(/^0+/, '')
          .trim();

        if (epKey) {
          movieMap[epKey] = {
            time: entry.currentTime,
            duration: entry.duration,
            percent,
            updatedAt: Date.now(),
          };
        }
        if (entry.epSlug) {
          movieMap[entry.epSlug] = {
            time: entry.currentTime,
            duration: entry.duration,
            percent,
            updatedAt: Date.now(),
          };
        }
        localStorage.setItem(movieProgressKey, JSON.stringify(movieMap));
      } catch {}

      // Dispatch event for real-time UI updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('netphim_episode_progress_changed', {
            detail: {
              slug: entry.slug,
              epSlug: entry.epSlug,
              currentTime: entry.currentTime,
              duration: entry.duration,
            },
          }),
        );
      }

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

  getMovieEpisodeProgressMap: (movieSlug: string): Record<string, number> => {
    if (typeof window === "undefined" || !movieSlug) return {};
    const map: Record<string, number> = {};
    try {
      // 1. Check dedicated per-movie store
      const movieProgressKey = `netphim_ep_progress_${movieSlug}`;
      const movieRaw = localStorage.getItem(movieProgressKey);
      if (movieRaw) {
        const movieData = JSON.parse(movieRaw) as Record<
          string,
          { percent?: number; time?: number; duration?: number }
        >;
        for (const [k, v] of Object.entries(movieData as any)) {
          if (typeof v === 'number') {
            map[k] = Math.min(100, Math.max(0, Math.round(v)));
          } else if (typeof (v as any)?.percent === 'number') {
            map[k] = (v as any).percent;
          } else if ((v as any)?.duration && (v as any).duration > 0 && typeof (v as any).time === 'number') {
            map[k] = Math.min(100, Math.round(((v as any).time / (v as any).duration) * 100));
          }
        }
      }

      // 2. Also merge with global history entries (for backwards compatibility)
      const globalEntries = watchProgressStorage
        .getHistoryEntries()
        .filter((e) => e.slug === movieSlug);
      for (const entry of globalEntries) {
        if (entry.duration > 0 && entry.currentTime > 0) {
          const percent = Math.min(
            100,
            Math.round((entry.currentTime / entry.duration) * 100),
          );
          const epKey = String(entry.epSlug || entry.epName || '')
            .toLowerCase()
            .replace(/^tập\s*/i, '')
            .replace(/^tap-/i, '')
            .replace(/^0+/, '')
            .trim();
          if (epKey) map[epKey] = Math.max(map[epKey] || 0, percent);
          if (entry.epSlug) map[entry.epSlug] = Math.max(map[entry.epSlug] || 0, percent);
        }
      }
    } catch {}
    return map;
  },

  removeEntry: (slug: string, epSlug?: string) => {
    if (typeof window === "undefined") return;
    try {
      // 1. Remove from top-level continue watching list
      let entries = watchProgressStorage.getHistoryEntries();
      const normTargetEp = epSlug
        ? String(epSlug)
            .toLowerCase()
            .replace(/^tập\s*/i, "")
            .replace(/^tap-/i, "")
            .replace(/^0+/, "")
            .trim()
        : null;

      if (normTargetEp) {
        entries = entries.filter((e) => {
          if (e.slug !== slug) return true;
          const eNorm = String(e.epSlug || e.epName || "")
            .toLowerCase()
            .replace(/^tập\s*/i, "")
            .replace(/^tap-/i, "")
            .replace(/^0+/, "")
            .trim();
          return eNorm !== normTargetEp && e.epSlug !== epSlug;
        });
      } else {
        entries = entries.filter((e) => e.slug !== slug);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

      // 2. Remove from dedicated per-movie progress store
      const movieProgressKey = `netphim_ep_progress_${slug}`;
      const movieRaw = localStorage.getItem(movieProgressKey);
      if (movieRaw) {
        if (!normTargetEp) {
          localStorage.removeItem(movieProgressKey);
        } else {
          try {
            const movieMap = JSON.parse(movieRaw) as Record<string, unknown>;
            delete movieMap[epSlug!];
            delete movieMap[normTargetEp];
            delete movieMap[`tap-${normTargetEp}`];
            delete movieMap[`tap-${normTargetEp.padStart(2, "0")}`];
            delete movieMap[normTargetEp.padStart(2, "0")];

            if (Object.keys(movieMap).length === 0) {
              localStorage.removeItem(movieProgressKey);
            } else {
              localStorage.setItem(movieProgressKey, JSON.stringify(movieMap));
            }
          } catch {
            localStorage.removeItem(movieProgressKey);
          }
        }
      }

      // 3. Remove from watched episodes set
      const watchedEpsKey = `netphim_watched_eps_${slug}`;
      const watchedRaw = localStorage.getItem(watchedEpsKey);
      if (watchedRaw) {
        if (!normTargetEp) {
          localStorage.removeItem(watchedEpsKey);
        } else {
          try {
            const list = JSON.parse(watchedRaw);
            if (Array.isArray(list)) {
              const updated = list.filter(
                (ep) => String(ep) !== epSlug && String(ep) !== normTargetEp,
              );
              if (updated.length === 0) {
                localStorage.removeItem(watchedEpsKey);
              } else {
                localStorage.setItem(watchedEpsKey, JSON.stringify(updated));
              }
            }
          } catch {
            localStorage.removeItem(watchedEpsKey);
          }
        }
      }
    } catch (e) {
      console.error("Failed to remove watch progress entry:", e);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("netphim_episode_progress_changed", {
          detail: { slug, epSlug, currentTime: 0, duration: 0 },
        }),
      );
    }
  },

  clearAll: () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("netphim_ep_progress_") ||
            key.startsWith("netphim_watched_eps_"))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.error("Failed to clear watch progress:", e);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("netphim_history_cleared"));
      window.dispatchEvent(
        new CustomEvent("netphim_episode_progress_changed", {
          detail: { slug: "", epSlug: "", currentTime: 0, duration: 0 },
        }),
      );
    }
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
