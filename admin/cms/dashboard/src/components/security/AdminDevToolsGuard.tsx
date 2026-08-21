"use client";

import { useEffect } from "react";

const DEVTOOLS_REDIRECT_URL =
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1";

/**
 * Client-side deterrent for the private administration interface.
 *
 * This intentionally lives in the Admin application instead of the public web
 * application. It blocks common DevTools shortcuts without relying on viewport
 * size heuristics, which also misidentify browser chrome and side panels.
 */
export function AdminDevToolsGuard() {
  useEffect(() => {
    let redirecting = false;

    const redirectAway = () => {
      if (redirecting) return;
      redirecting = true;
      window.location.replace(DEVTOOLS_REDIRECT_URL);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const commandKey = event.ctrlKey || event.metaKey;
      const chromeShortcut =
        commandKey && event.shiftKey && ["i", "j", "c", "k"].includes(key);
      const macShortcut =
        event.metaKey && event.altKey && ["i", "j", "c"].includes(key);
      const viewSourceShortcut = commandKey && key === "u";

      if (
        key === "f12" ||
        chromeShortcut ||
        macShortcut ||
        viewSourceShortcut
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        redirectAway();
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("contextmenu", handleContextMenu, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("contextmenu", handleContextMenu, true);
    };
  }, []);

  return null;
}
