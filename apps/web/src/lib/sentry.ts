"use client";

/**
 * FlexPhim Sentry Error Tracking & Observability Module
 * Safely captures client & server exceptions without breaking runtime navigation.
 */

export interface SentryErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: { id?: string; username?: string; email?: string };
  level?: "fatal" | "error" | "warning" | "info" | "debug";
}

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
let isInitialized = false;

function getSentryStoreUrl(dsn?: string): string | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\//, "");
    if (!publicKey || !projectId) return null;
    return `${url.protocol}//${url.host}/api/${projectId}/store/?sentry_version=7&sentry_key=${publicKey}`;
  } catch {
    return null;
  }
}

export function initSentry() {
  if (isInitialized) return;
  if (!SENTRY_DSN) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Sentry] NEXT_PUBLIC_SENTRY_DSN not configured. Running in mock telemetry mode.");
    }
    isInitialized = true;
    return;
  }

  try {
    isInitialized = true;
    if (process.env.NODE_ENV === "development") {
      console.log("[Sentry] Successfully initialized error tracking with DSN.");
    }
  } catch (err) {
    console.warn("[Sentry] Initialization warning:", err);
  }
}

export function captureException(error: unknown, context?: SentryErrorContext) {
  const errObj = error instanceof Error ? error : new Error(String(error));

  if (process.env.NODE_ENV === "development") {
    console.error("[Sentry Tracked Error]:", errObj, context);
  }

  const storeUrl = getSentryStoreUrl(SENTRY_DSN);
  if (!storeUrl) return;

  try {
    const payload = {
      event_id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
      platform: "javascript",
      sdk: { name: "netphim.sentry", version: "1.0.0" },
      exception: {
        values: [
          {
            type: errObj.name || "Error",
            value: errObj.message,
            stacktrace: errObj.stack
              ? {
                  frames: errObj.stack.split("\n").map((line) => ({
                    filename: line.trim(),
                  })),
                }
              : undefined,
          },
        ],
      },
      tags: context?.tags,
      extra: context?.extra,
      user: context?.user,
    };

    fetch(storeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Telemetry must never crash the UI
  }
}

export function captureMessage(message: string, level: SentryErrorContext["level"] = "info") {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Sentry ${level.toUpperCase()}]: ${message}`);
  }
  captureException(new Error(message), { level });
}
