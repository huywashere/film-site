export const NOTIFICATION_READ_STORAGE_KEY =
  "netphim_notification_read_state_v1";

const MAX_STORED_IDS_PER_CHANNEL = 300;

export type NotificationReadChannel = "system" | "movies";

export type NotificationReadState = {
  system: string[];
  movies: string[];
};

type NotificationStorage = Pick<Storage, "getItem" | "setItem">;

const EMPTY_STATE: NotificationReadState = {
  system: [],
  movies: [],
};

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  ).slice(-MAX_STORED_IDS_PER_CHANNEL);
}

export function parseNotificationReadState(
  rawValue: string | null,
): NotificationReadState {
  if (!rawValue) return { ...EMPTY_STATE };

  try {
    const parsed = JSON.parse(rawValue) as Partial<NotificationReadState>;
    return {
      system: normalizeIds(parsed.system),
      movies: normalizeIds(parsed.movies),
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

export function readNotificationReadState(
  storage: NotificationStorage,
): NotificationReadState {
  try {
    return parseNotificationReadState(
      storage.getItem(NOTIFICATION_READ_STORAGE_KEY),
    );
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
