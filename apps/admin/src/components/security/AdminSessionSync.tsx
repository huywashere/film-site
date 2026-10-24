"use client";

import { useEffect } from "react";
import {
  ADMIN_SESSION_EPOCH_KEY,
  beginAdminSession,
  currentAdminSessionEpoch,
  endAdminSession,
} from "@/lib/admin-session-client";

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Enterprise Admin Session Synchronizer & 24h Hard Timeout Guard
 * - Tracks session issuance and enforces automatic logout after 24 hours.
 * - Synchronizes across multiple browser tabs via storage events.
 * - Gracefully terminates session and redirects to /login?session_expired=1.
 */
export function AdminSessionSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname === "/login") return;

    const search = new URLSearchParams(window.location.search);
    if (search.get("admin_session") === "renewed") {
      beginAdminSession();
      search.delete("admin_session");
      const nextUrl = `${window.location.pathname}${search.size ? `?${search}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", nextUrl);
    }

    let sessionEpoch = currentAdminSessionEpoch() || beginAdminSession();
    const initialStartedAt = Number(sessionEpoch.split(":", 1)[0]);
    if (!Number.isFinite(initialStartedAt) || initialStartedAt > Date.now()) {
      sessionEpoch = beginAdminSession();
    }

    const checkSessionExpiry = async () => {
      const current = Date.now();
      const activeEpoch = currentAdminSessionEpoch();
      if (activeEpoch && activeEpoch !== sessionEpoch) sessionEpoch = activeEpoch;
      const start = Number(sessionEpoch.split(":", 1)[0]);
      if (current - start >= SESSION_MAX_AGE_MS) {
        if (currentAdminSessionEpoch() !== sessionEpoch) return;
        try {
          endAdminSession();
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
        } finally {
          if (!currentAdminSessionEpoch()) {
            window.location.assign("/login?session_expired=1");
          }
        }
      }
    };

    // Check immediately on mount and tab focus
    void checkSessionExpiry();

    const intervalId = window.setInterval(checkSessionExpiry, 30_000); // Check every 30s
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkSessionExpiry();
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === ADMIN_SESSION_EPOCH_KEY && !e.newValue) {
        // Another tab logged out
        window.location.assign("/login?session_expired=1");
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("storage", onStorage);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
