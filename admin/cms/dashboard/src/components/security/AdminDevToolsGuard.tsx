"use client";

import { useEffect } from "react";

const RICKROLL_URL =
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1";

/**
 * Enterprise Client-Side Anti-DevTools & Anti-Tamper Security Guard
 * Exclusively protecting the private Admin CMS Dashboard.
 *
 * Triggers ONLY when DevTools is actually opened / shortcuts pressed,
 * with ZERO false positives when switching or leaving tabs.
 */
export function AdminDevToolsGuard() {
  useEffect(() => {
    let triggered = false;

    const triggerProtection = () => {
      // Never trigger if tab is not focused/visible to avoid background throttling false-positives
      if (document.hidden) return;
      if (triggered) return;
      triggered = true;

      // Clear DOM immediately so no admin data or code can be viewed
      try {
        if (document.body) {
          document.body.innerHTML = "";
        }
      } catch {
        // Ignore DOM wipe errors
      }

      // Redirect immediately to Rickroll video
      window.location.replace(RICKROLL_URL);
    };

    // 1. Comprehensive Keyboard Shortcuts Blocker (F12, Ctrl+Shift+I/J/C, etc.)
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = (event.key || "").toLowerCase();
      const code = (event.code || "").toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const alt = event.altKey;

      // F12 key
      if (key === "f12" || code === "f12") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        triggerProtection();
        return false;
      }

      // Ctrl + Shift + (I, J, C, K, E, S) - Chrome / Firefox / Edge DevTools
      if (ctrl && shift && ["i", "j", "c", "k", "e", "s"].includes(key)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        triggerProtection();
        return false;
      }

      // Mac Cmd + Option + (I, J, C, U) - Safari / Chrome Mac DevTools
      if (ctrl && alt && ["i", "j", "c", "u"].includes(key)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        triggerProtection();
        return false;
      }

      // Ctrl + U (View Page Source)
      if (ctrl && (key === "u" || code === "keyu") && !shift && !alt) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        triggerProtection();
        return false;
      }

      // Ctrl + S (Save Page HTML source)
      if (ctrl && (key === "s" || code === "keys") && !shift && !alt) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        triggerProtection();
        return false;
      }

      // Shift + F10 or Context Menu key
      if ((shift && key === "f10") || key === "contextmenu") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    };

    // 2. Right-Click & Auxiliary Context Menu Interception
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      return false;
    };

    // 3. Console Inspection Detector (Only triggers when DevTools formats output in an active tab)
    let consoleInterval: NodeJS.Timeout | null = null;
    try {
      const detector = /./;
      detector.toString = () => {
        if (!document.hidden && document.hasFocus()) {
          triggerProtection();
        }
        return "";
      };

      consoleInterval = setInterval(() => {
        // Skip check entirely if tab is in background / switching
        if (document.hidden || !document.hasFocus()) return;
        // eslint-disable-next-line no-console
        console.log(detector);
        // eslint-disable-next-line no-console
        console.clear();
      }, 1000);
    } catch {
      // Ignore console trap setup errors
    }

    // Register all event listeners with capture phase for highest priority
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyDown, true);
    window.addEventListener("contextmenu", handleContextMenu, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyDown, true);
      window.removeEventListener("contextmenu", handleContextMenu, true);

      if (consoleInterval) clearInterval(consoleInterval);
    };
  }, []);

  return null;
}
