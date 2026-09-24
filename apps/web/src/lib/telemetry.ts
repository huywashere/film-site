import { captureMessage } from '@/lib/sentry';

export type TelemetryLevel = 'info' | 'warning' | 'error';

type TelemetryProperties = Record<string, string | number | boolean | null | undefined>;

const MAX_PROPERTIES = 12;
const MAX_BATCH_SIZE = 20;
const FLUSH_DELAY_MS = 1_000;

type QueuedTelemetry = {
  name: string;
  level: TelemetryLevel;
  route: string;
  properties: ReturnType<typeof cleanProperties>;
  timestamp: string;
};

const telemetryQueue: QueuedTelemetry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushInFlight = false;

function cleanProperties(properties: TelemetryProperties = {}) {
  return Object.fromEntries(
    Object.entries(properties)
      .slice(0, MAX_PROPERTIES)
      .map(([key, value]) => [
        key.slice(0, 48),
        typeof value === 'string' ? value.slice(0, 180) : value,
      ]),
  );
}

function telemetryEndpoint() {
  const fallbackBase =
    process.env.NODE_ENV === 'production' ? '/api/v1' : 'http://localhost:3001/api/v1';
  // Browser telemetry must remain first-party in production. Sending directly
  // to a Railway/API origin makes every page depend on that origin's CORS
  // policy, while the existing Next proxy already forwards `/api/v1` safely.
  const rawBase = (
    process.env.NODE_ENV === 'production'
      ? fallbackBase
      : process.env.NEXT_PUBLIC_API_URL || fallbackBase
  ).replace(/\/+$/, '');
  const baseUrl =
    rawBase === '/api/v1' || rawBase.endsWith('/api/v1')
      ? rawBase
      : rawBase.endsWith('/api')
        ? `${rawBase}/v1`
        : `${rawBase}/api/v1`;
  return `${baseUrl}/telemetry/client/batch`;
}

function scheduleFlush(delay = FLUSH_DELAY_MS) {
  if (flushTimer !== null || flushInFlight) return;
  flushTimer = globalThis.setTimeout(() => {
    flushTimer = null;
    flushTelemetry();
  }, delay);
}

function flushTelemetry() {
  if (flushInFlight || telemetryQueue.length === 0) return;
  flushInFlight = true;
  const events = telemetryQueue.splice(0, MAX_BATCH_SIZE);

  void fetch(telemetryEndpoint(), {
    method: 'POST',
    body: JSON.stringify({ events }),
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    keepalive: true,
  })
    .catch(() => {
      // Telemetry is best-effort; never retry indefinitely during an outage.
    })
    .finally(() => {
      flushInFlight = false;
      if (telemetryQueue.length > 0) scheduleFlush();
    });
}

/** Reports anonymous client-side operational events in small request batches. */
export function recordTelemetry(
  name: string,
  properties: TelemetryProperties = {},
  level: TelemetryLevel = 'info',
) {
  if (typeof window === 'undefined') return;

  if (level === 'error') {
    captureMessage(`[Telemetry Error] ${name}`, 'error');
  }

  telemetryQueue.push({
    name: name.slice(0, 96),
    level,
    route: window.location.pathname.slice(0, 180),
    properties: cleanProperties(properties),
    timestamp: new Date().toISOString(),
  });
  if (telemetryQueue.length > MAX_BATCH_SIZE * 2) telemetryQueue.shift();

  if (level === 'info') scheduleFlush();
  else {
    if (flushTimer !== null) globalThis.clearTimeout(flushTimer);
    flushTimer = null;
    flushTelemetry();
  }
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown client error';
}
