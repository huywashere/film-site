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
        .register("/sw.js", { updateViaCache: "none" })
        .then(async (reg) => {
          await reg.update();
        })
        .catch((err) => {
          console.error("🔴 PWA Service Worker registration failed:", err);
        });
    }
  }, []);

  return null;
}
