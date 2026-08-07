import { captureMessage } from "@/lib/sentry";

export type TelemetryLevel = "info" | "warning" | "error";

type TelemetryProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

const MAX_PROPERTIES = 12;
let lastTelemetryTime = 0;
const TELEMETRY_DEBOUNCE_MS = 3000;

function cleanProperties(properties: TelemetryProperties = {}) {
  return Object.fromEntries(
    Object.entries(properties)
      .slice(0, MAX_PROPERTIES)
      .map(([key, value]) => [
        key.slice(0, 48),
        typeof value === "string" ? value.slice(0, 180) : value,
      ]),
  );
}

/**
 * Reports anonymous client-side operational events.
 * Debounced to prevent infinite loops when rate-limited.
 */
export function recordTelemetry(
  name: string,
  properties: TelemetryProperties = {},
  level: TelemetryLevel = "info",
) {
  if (typeof window === "undefined") return;

  // Rate limit client telemetry calls to 1 every 3 seconds max
  const now = Date.now();
  if (now - lastTelemetryTime < TELEMETRY_DEBOUNCE_MS) {
    return;
  }
  lastTelemetryTime = now;

  if (level === "error") {
    captureMessage(`[Telemetry Error] ${name}`, "error");
  }

  const payload = JSON.stringify({
    name: name.slice(0, 96),
    level,
    route: window.location.pathname.slice(0, 180),
    properties: cleanProperties(properties),
    timestamp: new Date().toISOString(),
  });
  const rawBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1").replace(/\/+$/, "");
  const baseUrl = rawBase.endsWith("/api/v1") ? rawBase : rawBase.endsWith("/api") ? `${rawBase}/v1` : `${rawBase}/api/v1`;
  const endpoint = `${baseUrl}/telemetry/client`;

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        endpoint,
        new Blob([payload], { type: "text/plain" }),
      );
      return;
    }
    void fetch(endpoint, {
      method: "POST",
      body: payload,
      headers: { "content-type": "application/json" },
      credentials: "omit",
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Observability must never affect playback or navigation.
  }
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown client error";
}
