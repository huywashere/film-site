export interface WatchProgressEntry {
  slug: string;
  epSlug: string;
  epName: string;
  title: string;
  poster: string;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

const STORAGE_KEY = "cineverse_continue_watching";

export const watchProgressStorage = {
  getEntries: (): WatchProgressEntry[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: WatchProgressEntry[] = JSON.parse(raw);
      // Filter out invalid items or completed items (>95% watched)
      return parsed
        .filter(
          (item) =>
            item.duration > 0 && item.currentTime / item.duration < 0.95,
        )
        .sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  },

  saveProgress: (entry: Omit<WatchProgressEntry, "updatedAt">) => {
    if (typeof window === "undefined") return;
    try {
      const entries = watchProgressStorage.getEntries();
      const existingIndex = entries.findIndex(
        (e) => e.slug === entry.slug && e.epSlug === entry.epSlug,
      );

      const newEntry: WatchProgressEntry = {
        ...entry,
        updatedAt: Date.now(),
      };

      if (existingIndex >= 0) {
        entries[existingIndex] = newEntry;
      } else {
        entries.unshift(newEntry);
      }

      // Limit to 20 recent items
      const trimmed = entries.slice(0, 20);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
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
