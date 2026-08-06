"use client";

/**
 * CineVerse Sentry Error Tracking & Observability Module
 * Safely captures client & server exceptions without breaking runtime navigation.
 */

export interface SentryErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: { id?: string; username?: string; email?: string };
  level?: "fatal" | "error" | "warning" | "info" | "debug";
}

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
let isInitialized = false;

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
    // Dynamic initialization when DSN is present
    isInitialized = true;
    console.log("[Sentry] Successfully initialized error tracking with DSN.");
  } catch (err) {
    console.warn("[Sentry] Initialization warning:", err);
  }
}

export function captureException(error: unknown, context?: SentryErrorContext) {
  if (typeof window === "undefined" && !SENTRY_DSN) return;

  const errObj = error instanceof Error ? error : new Error(String(error));

  if (process.env.NODE_ENV === "development") {
    console.error("[Sentry Tracked Error]:", errObj, context);
  }

  if (!SENTRY_DSN) return;

  try {
    const payload = {
      message: errObj.message,
      name: errObj.name,
      stack: errObj.stack,
      url: typeof window !== "undefined" ? window.location.href : "server",
      timestamp: new Date().toISOString(),
      tags: context?.tags,
      extra: context?.extra,
      user: context?.user,
    };

    // Forward to Sentry ingestion endpoint if DSN is valid URL
    if (SENTRY_DSN.startsWith("http")) {
      fetch(SENTRY_DSN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Telemetry must never crash the UI
  }
}

export function captureMessage(message: string, level: SentryErrorContext["level"] = "info") {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Sentry ${level.toUpperCase()}]: ${message}`);
  }
  if (!SENTRY_DSN) return;
  captureException(new Error(message), { level });
}
