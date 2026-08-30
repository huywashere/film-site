"use client";

import { useEffect } from "react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

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

      // A public visitor has no session marker, so probing /auth/me can only
      // produce a 401 followed by a pointless refresh request. Firebase still
      // gets a chance to restore its own identity through the idle observer.
      const hasSessionMarker = document.cookie
        .split(";")
        .some((cookie) => cookie.trim() === "netphim-auth=true");
      if (!hasSessionMarker && !useAuthStore.getState().user) return;

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
    return () => {
      active = false;
    };
  }, []);

  return null;
}
