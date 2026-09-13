import test from "node:test";
import assert from "node:assert/strict";

// Mock minimal browser storage & window for node test environment
class MockLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  get length(): number {
    return this.store.size;
  }
}

const mockStorage = new MockLocalStorage();
(globalThis as any).localStorage = mockStorage;
(globalThis as any).window = {
  dispatchEvent: () => true,
};
(globalThis as any).CustomEvent = class CustomEvent {
  type: string;
  detail: any;
  constructor(type: string, init?: { detail?: any }) {
    this.type = type;
    this.detail = init?.detail;
  }
};

test("getAllGuestWatchHistoryEntries merges continue-watching and per-movie episode maps", async () => {
  mockStorage.clear();

  // 1. Top-level continue watching list
  const continueWatching = [
    {
      slug: "vincenzo",
      epSlug: "tap-01",
      epName: "Tập 1",
      title: "Vincenzo",
      poster: "https://image.tmdb.org/t/p/w500/vincenzo.jpg",
      thumb: "https://image.tmdb.org/t/p/w500/vincenzo-thumb.jpg",
      currentTime: 1200,
      duration: 3600,
      updatedAt: 1000,
    },
  ];
  mockStorage.setItem("netphim_continue_watching", JSON.stringify(continueWatching));

  // 2. Per-movie episode progress map (user watched episode 2 & 3 as guest)
  const episodeMap = {
    "tap-02": {
      time: 900,
      duration: 3600,
      percent: 25,
      updatedAt: 2000,
    },
    "tap-03": {
      time: 2500,
      duration: 3600,
      percent: 70,
      updatedAt: 3000,
    },
  };
  mockStorage.setItem("netphim_ep_progress_vincenzo", JSON.stringify(episodeMap));

  const { getAllGuestWatchHistoryEntries } = await import("./user-data.js");
  const entries = getAllGuestWatchHistoryEntries();

  // Should contain 3 distinct episodes
  assert.equal(entries.length, 3);

  // Ordered by updatedAt descending (tap-03, tap-02, tap-01)
  assert.equal(entries[0].epSlug, "tap-03");
  assert.equal(entries[0].currentTime, 2500);
  assert.equal(entries[1].epSlug, "tap-02");
  assert.equal(entries[2].epSlug, "tap-01");
});

test("getAllGuestWatchHistoryEntries deduplicates identical episodes taking the most recent progress", async () => {
  mockStorage.clear();

  // Continue watching has older progress
  mockStorage.setItem(
    "netphim_continue_watching",
    JSON.stringify([
      {
        slug: "naruto",
        epSlug: "1",
        epName: "Tập 1",
        title: "Naruto",
        currentTime: 300,
        duration: 1200,
        updatedAt: 1000,
      },
    ]),
  );

  // Per-movie map has newer progress for the same episode
  mockStorage.setItem(
    "netphim_ep_progress_naruto",
    JSON.stringify({
      "1": {
        time: 800,
        duration: 1200,
        percent: 66,
        updatedAt: 2500,
      },
    }),
  );

  const { getAllGuestWatchHistoryEntries } = await import("./user-data.js");
  const entries = getAllGuestWatchHistoryEntries();

  assert.equal(entries.length, 1);
  assert.equal(entries[0].slug, "naruto");
  assert.equal(entries[0].currentTime, 800);
  assert.equal(entries[0].updatedAt, 2500);
});

test("guestDataStorage.hasPendingData tracks sync state per user", async () => {
  mockStorage.clear();

  const { guestDataStorage } = await import("./user-data.js");

  // No data
  assert.equal(guestDataStorage.hasPendingData("user-123"), false);

  // Add guest watchlist
  guestDataStorage.addWatchlist("movie-abc", { title: "Movie ABC" });
  assert.equal(guestDataStorage.hasPendingData("user-123"), true);

  // Clear guest watchlist
  guestDataStorage.clear();
  assert.equal(guestDataStorage.hasPendingData("user-123"), false);

  // Add guest history
  mockStorage.setItem(
    "netphim_continue_watching",
    JSON.stringify([
      {
        slug: "movie-xyz",
        epSlug: "1",
        currentTime: 50,
        duration: 100,
        updatedAt: 5000,
      },
    ]),
  );
  assert.equal(guestDataStorage.hasPendingData("user-123"), true);

  // Simulate user-123 already merged at timestamp 6000
  mockStorage.setItem("netphim_last_merged_user", "user-123");
  mockStorage.setItem("netphim_last_merged_at", "6000");

  // Nothing newer than 6000 -> false
  assert.equal(guestDataStorage.hasPendingData("user-123"), false);

  // Another user logs in -> true
  assert.equal(guestDataStorage.hasPendingData("user-456"), true);

  // User-123 watches another video at timestamp 7000 -> true
  mockStorage.setItem(
    "netphim_continue_watching",
    JSON.stringify([
      {
        slug: "movie-xyz",
        epSlug: "2",
        currentTime: 100,
        duration: 200,
        updatedAt: 7000,
      },
    ]),
  );
  assert.equal(guestDataStorage.hasPendingData("user-123"), true);
});
