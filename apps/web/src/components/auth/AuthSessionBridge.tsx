"use client";

import { useEffect } from "react";
import { authApi } from "@/lib/api";
import { establishFirebaseSession } from "@/lib/auth-session";
import { useAuthStore } from "@/store/authStore";
import { recordTelemetry } from "@/lib/telemetry";

/**
 * Restores exactly one server-authoritative session when the application
 * starts. A Firebase identity is exchanged only when the API cookie session
 * is missing or expired; it never creates a browser-only app login.
 */
export function AuthSessionBridge() {
  useEffect(() => {
    let active = true;
    let restoreInFlight: Promise<void> | null = null;

    const restore = async () => {
      if (restoreInFlight) return restoreInFlight;

      restoreInFlight = (async () => {
        const store = useAuthStore.getState();
        try {
          const { data } = await authApi.getMe();
          if (active && data && data.id) store.setUser(data);
          return;
        } catch {
          // Preserve existing authenticated user session if present
          if (active && !store.user) {
            store.setUser(null);
          }
        }
      })().finally(() => {
        restoreInFlight = null;
      });

      return restoreInFlight;
    };

    void restore();
    let unsubscribe: (() => void) | undefined;
    const startFirebaseObserver = () => {
      void import("@/lib/firebase").then(({ firebaseAuth, onIdTokenChanged }) => {
        if (!active || !firebaseAuth) return;
        unsubscribe = onIdTokenChanged(firebaseAuth, async (firebaseUser) => {
          if (!active || !firebaseUser || useAuthStore.getState().user) return;
          try {
            const user = await establishFirebaseSession(firebaseUser);
            if (active && user) useAuthStore.getState().setUser(user);
          } catch (error) {
            recordTelemetry(
              "auth.firebase_session_sync_failed",
              { reason: error instanceof Error ? error.message : "unknown" },
              "warning",
            );
          }
        });
      });
    };
    const supportsIdleCallback =
      typeof window.requestIdleCallback === "function";
    const idleId = supportsIdleCallback
      ? window.requestIdleCallback(startFirebaseObserver, { timeout: 2_500 })
      : undefined;
    const fallbackTimer = supportsIdleCallback
      ? undefined
      : globalThis.setTimeout(startFirebaseObserver, 1_500);

    return () => {
      active = false;
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (fallbackTimer !== undefined) globalThis.clearTimeout(fallbackTimer);
      unsubscribe?.();
    };
  }, []);

  return null;
}
