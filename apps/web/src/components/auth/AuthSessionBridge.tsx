"use client";

import { useEffect } from "react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

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
        } catch (error) {
          // Consult the current store instead of the pre-request snapshot. A
          // login can finish while this bootstrap request is still pending.
          const status = (error as { response?: { status?: number } })?.response
            ?.status;
          const currentUser = useAuthStore.getState().user;
          if (
            active &&
            !currentUser &&
            (status === 401 || status === 403)
          ) {
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
