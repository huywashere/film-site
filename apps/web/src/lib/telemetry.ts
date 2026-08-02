export type TelemetryLevel = "info" | "warning" | "error";

type TelemetryProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

const MAX_PROPERTIES = 12;

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
 * Reports anonymous client-side operational events. The request intentionally
 * bypasses the shared Axios client so telemetry can never recursively report
 * its own failures.
 */
export function recordTelemetry(
  name: string,
  properties: TelemetryProperties = {},
  level: TelemetryLevel = "info",
) {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    name: name.slice(0, 96),
    level,
    route: window.location.pathname.slice(0, 180),
    properties: cleanProperties(properties),
    timestamp: new Date().toISOString(),
  });
  const endpoint = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"}/telemetry/client`;

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        endpoint,
        new Blob([payload], { type: "application/json" }),
      );
      return;
    }
    void fetch(endpoint, {
      method: "POST",
      body: payload,
      headers: { "content-type": "application/json" },
      credentials: "omit",
      keepalive: true,
    });
  } catch {
    // Observability must never affect playback or navigation.
  }
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown client error";
}
