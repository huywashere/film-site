import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  NOTIFICATION_READ_STORAGE_KEY,
  isNotificationRead,
  parseNotificationReadState,
  persistNotificationReadIds,
  persistNotificationsReadThrough,
  readNotificationReadState,
} from './notification-read-state.ts';

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

test('invalid notification state safely falls back to empty lists', () => {
  assert.deepEqual(parseNotificationReadState('not-json'), {
    system: [],
    series: [],
    single: [],
    readThrough: { system: 0, series: 0, single: 0 },
  });
});

test('read notification IDs persist for signed-out browser visitors', () => {
  const storage = createStorage();

  persistNotificationReadIds(storage, 'system', ['sys-1', 'sys-2']);
  persistNotificationReadIds(storage, 'series', ['series-a', 'series-a']);

  assert.deepEqual(readNotificationReadState(storage), {
    system: ['sys-1', 'sys-2'],
    series: ['series-a'],
    single: [],
    readThrough: { system: 0, series: 0, single: 0 },
  });
});

test('legacy movie read state migrates to both movie channels', () => {
  const parsed = parseNotificationReadState(
    JSON.stringify({
      system: ['welcome'],
      movies: ['legacy-movie'],
      readThrough: { movies: 1234 },
    }),
  );

  assert.deepEqual(parsed, {
    system: ['welcome'],
    series: ['legacy-movie'],
    single: ['legacy-movie'],
    readThrough: { system: 0, series: 1234, single: 1234 },
  });
});

test('mark all read watermark prevents old guest notifications from returning', () => {
  const storage = createStorage();
  persistNotificationsReadThrough(storage, 'single', 2_000);
  const state = readNotificationReadState(storage);

  assert.equal(isNotificationRead(state, 'single', 'old-movie', new Date(1_000)), true);
  assert.equal(isNotificationRead(state, 'single', 'new-movie', new Date(3_000)), false);
});

test('navbar separates series and single updates and includes first-party uploads', () => {
  const navbar = readFileSync('src/components/layout/Navbar.tsx', 'utf8');
  const api = readFileSync('src/lib/api.ts', 'utf8');

  assert.match(navbar, /\["series", "Phim Bộ", unreadSeries\]/);
  assert.match(navbar, /\["single", "Phim Lẻ", unreadSingle\]/);
  assert.match(navbar, /publishedMovieApi\.getLatest\(channel, 16\)/);
  assert.match(api, /\/movies\/published\?type=/);
  assert.doesNotMatch(
    navbar,
    /Chế độ Rạp Phim Mở Rộng|Phòng Xem Chung \(Watch Party\)/,
  );
});
