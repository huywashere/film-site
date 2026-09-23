export const NOTIFICATION_READ_STORAGE_KEY = 'netphim_notification_read_state_v1';

const MAX_STORED_IDS_PER_CHANNEL = 300;

export type NotificationReadChannel = 'system' | 'series' | 'single';

export type NotificationReadState = {
  system: string[];
  series: string[];
  single: string[];
  readThrough: Record<NotificationReadChannel, number>;
};

type NotificationStorage = Pick<Storage, 'getItem' | 'setItem'>;

const EMPTY_STATE: NotificationReadState = {
  system: [],
  series: [],
  single: [],
  readThrough: {
    system: 0,
    series: 0,
    single: 0,
  },
};

type LegacyNotificationReadState = Partial<NotificationReadState> & {
  movies?: unknown;
  readThrough?: Partial<Record<NotificationReadChannel | 'movies', unknown>>;
};

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean))).slice(
    -MAX_STORED_IDS_PER_CHANNEL,
  );
}

function normalizeTimestamp(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export function parseNotificationReadState(rawValue: string | null): NotificationReadState {
  if (!rawValue) return { ...EMPTY_STATE };

  try {
    const parsed = JSON.parse(rawValue) as LegacyNotificationReadState;
    const legacyMovieIds = normalizeIds(parsed.movies);
    const legacyMovieReadThrough = normalizeTimestamp(parsed.readThrough?.movies);
    return {
      system: normalizeIds(parsed.system),
      series: normalizeIds(parsed.series ?? legacyMovieIds),
      single: normalizeIds(parsed.single ?? legacyMovieIds),
      readThrough: {
        system: normalizeTimestamp(parsed.readThrough?.system),
        series: normalizeTimestamp(parsed.readThrough?.series) || legacyMovieReadThrough,
        single: normalizeTimestamp(parsed.readThrough?.single) || legacyMovieReadThrough,
      },
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

export function readNotificationReadState(storage: NotificationStorage): NotificationReadState {
  try {
    return parseNotificationReadState(storage.getItem(NOTIFICATION_READ_STORAGE_KEY));
  } catch {
    return { ...EMPTY_STATE };
  }
}

export function persistNotificationReadIds(
  storage: NotificationStorage,
  channel: NotificationReadChannel,
  ids: Array<string | number>,
): NotificationReadState {
  const current = readNotificationReadState(storage);
  const next = {
    ...current,
    [channel]: normalizeIds([...current[channel], ...ids]),
  };

  try {
    storage.setItem(NOTIFICATION_READ_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Browsers can deny storage in private/restricted contexts. Reading the
    // notification still works for the current React session in that case.
  }

  return next;
}

export function persistNotificationsReadThrough(
  storage: NotificationStorage,
  channel: NotificationReadChannel,
  timestamp = Date.now(),
): NotificationReadState {
  const current = readNotificationReadState(storage);
  const next = {
    ...current,
    readThrough: {
      ...current.readThrough,
      [channel]: Math.max(current.readThrough[channel], normalizeTimestamp(timestamp)),
    },
  };

  try {
    storage.setItem(NOTIFICATION_READ_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Keep the current React state usable when storage is unavailable.
  }

  return next;
}

export function isNotificationRead(
  state: NotificationReadState,
  channel: NotificationReadChannel,
  id: string | number,
  publishedAt?: string | number | Date | null,
) {
  if (state[channel].includes(String(id))) return true;
  if (!publishedAt || state.readThrough[channel] <= 0) return false;

  const timestamp =
    publishedAt instanceof Date
      ? publishedAt.getTime()
      : typeof publishedAt === 'number'
        ? publishedAt
        : new Date(publishedAt).getTime();
  return Number.isFinite(timestamp) && timestamp <= state.readThrough[channel];
}
