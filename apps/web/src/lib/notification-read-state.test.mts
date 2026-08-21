import assert from "node:assert/strict";
import test from "node:test";

import {
  NOTIFICATION_READ_STORAGE_KEY,
  parseNotificationReadState,
  persistNotificationReadIds,
  readNotificationReadState,
} from "./notification-read-state.ts";

function createStorage(initialValue?: string) {
  const values = new Map<string, string>();
  if (initialValue) values.set(NOTIFICATION_READ_STORAGE_KEY, initialValue);

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

test("invalid notification state safely falls back to empty lists", () => {
  assert.deepEqual(parseNotificationReadState("not-json"), {
    system: [],
    movies: [],
  });
});

test("read notification IDs persist for signed-out browser visitors", () => {
  const storage = createStorage();

  persistNotificationReadIds(storage, "system", ["sys-1", "sys-2"]);
  persistNotificationReadIds(storage, "movies", ["movie-a", "movie-a"]);

  assert.deepEqual(readNotificationReadState(storage), {
    system: ["sys-1", "sys-2"],
    movies: ["movie-a"],
  });
});
