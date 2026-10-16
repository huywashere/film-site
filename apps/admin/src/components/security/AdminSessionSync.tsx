"use client";

import { useEffect } from "react";

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const SESSION_START_KEY = "netphim_admin_session_start";

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

    // Initialize or read session epoch
    const now = Date.now();
    let sessionStart = Number(localStorage.getItem(SESSION_START_KEY));
    if (!sessionStart || isNaN(sessionStart) || sessionStart > now) {
      sessionStart = now;
      localStorage.setItem(SESSION_START_KEY, String(now));
    }

    const checkSessionExpiry = async () => {
      const current = Date.now();
      const start = Number(localStorage.getItem(SESSION_START_KEY)) || sessionStart;
      if (current - start >= SESSION_MAX_AGE_MS) {
        // 24h exceeded -> Log out
        try {
          localStorage.removeItem(SESSION_START_KEY);
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
        } finally {
          window.location.assign("/login?session_expired=1");
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
      if (e.key === SESSION_START_KEY && !e.newValue) {
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
