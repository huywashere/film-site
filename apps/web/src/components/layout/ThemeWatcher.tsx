"use client";
import { useEffect } from "react";
import { useThemeStore } from "@/store/themeStore";

export function ThemeWatcher() {
  const { theme } = useThemeStore();

  useEffect(() => {
    // Prevent browser extensions (e.g. MetaMask, Web3 wallets, inpage.js) from triggering Next.js error overlays
    const isExtensionError = (
      msg: string,
      stack: string,
      filename?: string,
    ) => {
      const target = `${msg} ${stack} ${filename || ""}`.toLowerCase();
      return (
        target.includes("metamask") ||
        target.includes("ethereum") ||
        target.includes("failed to connect") ||
        target.includes("inpage.js") ||
        target.includes("chrome-extension://") ||
        target.includes("moz-extension://") ||
        target.includes("extension")
      );
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = String(event.reason?.message || event.reason || "");
      const stack = String(event.reason?.stack || "");
      if (isExtensionError(reason, stack)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleError = (event: ErrorEvent) => {
      const msg = String(event.message || "");
      const stack = String(event.error?.stack || "");
      const filename = String(event.filename || "");
      if (isExtensionError(msg, stack, filename)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("unhandledrejection", handleRejection, true);
    window.addEventListener("error", handleError, true);

    return () => {
      window.removeEventListener("unhandledrejection", handleRejection, true);
      window.removeEventListener("error", handleError, true);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      if (theme === "light") {
        root.setAttribute("data-theme", "light");
        root.classList.add("light");
        root.classList.remove("dark");
      } else {
        root.setAttribute("data-theme", "dark");
        root.classList.add("dark");
        root.classList.remove("light");
      }
    }
  }, [theme]);

  return null;
}
