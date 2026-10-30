"use client";
import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      const register = () => {
        navigator.serviceWorker
          .register("/sw.js", { updateViaCache: "none" })
          .catch((err) => {
            console.error("🔴 PWA Service Worker registration failed:", err);
          });
      };

      if (document.readyState === "complete") {
        register();
      } else {
        window.addEventListener("load", register, { once: true });
        return () => window.removeEventListener("load", register);
      }
    }
  }, []);

  return null;
}
