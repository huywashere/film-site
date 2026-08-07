"use client";

import { useEffect } from "react";

/**
 * CineVerse Advanced Anti-DevTools & Anti-Debugging Guard
 * Protects client-side source code, prevents inspect element, right-click, and debugger analysis.
 */
export function AntiDevTools() {
  useEffect(() => {
    // Only enforce anti-devtools in production mode
    if (process.env.NODE_ENV !== "production") return;

    // 1. Clear Console Logs to prevent data leaks
    const noop = () => {};
    window.console.log = noop;
    window.console.info = noop;
    window.console.debug = noop;
    window.console.warn = noop;

    // 2. Disable Right-Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 3. Disable Keyboard Shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) ||
        (e.ctrlKey && (e.key === "U" || e.key === "u" || e.key === "S" || e.key === "s"))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // 4. Debugger Loop Trap (Freezes DevTools if forced open)
    const intervalId = setInterval(() => {
      const startTime = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const endTime = performance.now();
      // If execution was paused by DevTools debugger (>100ms delay)
      if (endTime - startTime > 100) {
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }
    }, 1000);

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      clearInterval(intervalId);
    };
  }, []);

  return null;
}
