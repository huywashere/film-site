"use client";

import { useEffect } from "react";
import { onIdTokenChanged, firebaseAuth } from "@/lib/firebase";
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
          if (active) store.setUser(data);
          return;
        } catch {
          const firebaseUser = firebaseAuth.currentUser;
          if (!firebaseUser) {
            if (active) store.setUser(null);
            return;
          }

          try {
            const user = await establishFirebaseSession(firebaseUser);
            if (active) store.setUser(user);
          } catch (error) {
            // Do not retain a local-only identity. The next token event or
            // page load can retry, while the UI correctly remains signed out.
            if (active) store.setUser(null);
            recordTelemetry("auth.firebase_session_sync_failed", {
              reason: error instanceof Error ? error.message : "unknown",
            }, "warning");
          }
        }
      })().finally(() => {
        restoreInFlight = null;
      });

      return restoreInFlight;
    };

    void restore();
    const unsubscribe = onIdTokenChanged(firebaseAuth, () => {
      void restore();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return null;
}
