"use client";
import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log(
            "🟢 PWA Service Worker registered with scope:",
            reg.scope,
          );
        })
        .catch((err) => {
          console.error("🔴 PWA Service Worker registration failed:", err);
        });
    }
  }, []);

  return null;
}
