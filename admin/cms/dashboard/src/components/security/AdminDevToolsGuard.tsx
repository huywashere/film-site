"use client";

import { useEffect } from "react";

const REDIRECT_TARGET = "/";

/**
 * Enterprise Client-Side Anti-DevTools & Anti-Tamper Security Guard
 * Exclusively protecting the private Admin CMS Dashboard.
 *
 * Blocks:
 * 1. F12, Ctrl+Shift+I/J/C/K/E/S, Cmd+Option+I/J/C/U, Ctrl+U (View Source), Ctrl+S (Save), Shift+F10 (Context Menu Key)
 * 2. Right-click context menu & auxiliary click inspector triggers
 * 3. DevTools opening via browser menu (3-dots) using Debugger Timing Trap + Console Getter Trap
 * 4. DevTools docking via Window Outer/Inner Dimension Delta analysis
 * 5. Neutralizes and freezes console logging APIs to prevent memory inspection
 */
export function AdminDevToolsGuard() {
  useEffect(() => {
    let triggered = false;

    const triggerProtection = () => {
      if (triggered) return;
      triggered = true;

      // Clear DOM immediately so no admin data, state, or DOM nodes can be inspected
      try {
        if (document.body) {
          document.body.innerHTML =
            "<div style='display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#ef4444;font-family:sans-serif;font-weight:bold;font-size:18px;'>Quyền truy cập bị từ chối / Access Denied</div>";
        }
      } catch {
        // Ignore DOM wipe errors
      }

      // Redirect away from admin dashboard
      window.location.replace(REDIRECT_TARGET);
    };

    // 1. Neutralize all console logging methods
    try {
      const noop = () => {};
      const methods = [
        "log",
        "debug",
        "info",
        "warn",
        "error",
        "table",
        "trace",
        "dir",
        "dirxml",
        "group",
        "groupEnd",
        "time",
        "timeEnd",
        "assert",
        "profile",
      ] as const;

      methods.forEach((method) => {
        if (typeof window.console[method] === "function") {
          window.console[method] = noop;
        }
      });
    } catch {
      // Ignore console override errors
    }

    // 2. Comprehensive Keyboard Shortcuts Blocker (Capture & Bubbling phase)
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

    // 3. Right-Click & Auxiliary Context Menu Interception
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      return false;
    };

    // 4. Debugger Timing Loop (Catches DevTools opened via 3-dots menu or external attach)
    let debuggerInterval: NodeJS.Timeout | null = null;
    try {
      debuggerInterval = setInterval(() => {
        const start = performance.now();
        // Evaluating debugger statement causes measurable delay when DevTools is active
        // eslint-disable-next-line no-debugger
        Function("debugger")();
        const end = performance.now();
        if (end - start > 100) {
          triggerProtection();
        }
      }, 800);
    } catch {
      // Ignore debugger eval errors
    }

    // 5. Console Object Getter Trap (Triggers when DevTools console formats output)
    let consoleInterval: NodeJS.Timeout | null = null;
    try {
      const detector = new Image();
      Object.defineProperty(detector, "id", {
        get: () => {
          triggerProtection();
          return "protected";
        },
      });

      consoleInterval = setInterval(() => {
        // eslint-disable-next-line no-console
        console.log(detector);
        // eslint-disable-next-line no-console
        console.clear();
      }, 1500);
    } catch {
      // Ignore getter trap errors
    }

    // 6. Docked Window Dimensions Delta Detection
    const handleResize = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        triggerProtection();
      }
    };

    // Register all event listeners with capture phase for highest priority
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyDown, true);
    window.addEventListener("contextmenu", handleContextMenu, true);
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyDown, true);
      window.removeEventListener("contextmenu", handleContextMenu, true);
      window.removeEventListener("resize", handleResize);

      if (debuggerInterval) clearInterval(debuggerInterval);
      if (consoleInterval) clearInterval(consoleInterval);
    };
  }, []);

  return null;
}
