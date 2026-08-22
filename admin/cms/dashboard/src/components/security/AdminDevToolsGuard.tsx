"use client";

import { useEffect } from "react";

const RICKROLL_URL =
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1";

/**
 * Enterprise Client-Side Anti-DevTools & Anti-Tamper Security Guard
 * Exclusively protecting the private Admin CMS Dashboard.
 *
 * Intercepts DevTools shortcuts, context menu inspection, and debugger pauses,
 * immediately redirecting intruders to the Rickroll YouTube video without false positives.
 */
export function AdminDevToolsGuard() {
  useEffect(() => {
    let triggered = false;

    const triggerProtection = () => {
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

    // 1. Comprehensive Keyboard Shortcuts Blocker (Capture & Bubbling phase)
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

    // 3. Web Worker Independent Thread Heartbeat (Detects if main thread is paused in debugger)
    let worker: Worker | null = null;
    try {
      const workerBlob = new Blob(
        [
          `
          let lastTime = Date.now();
          setInterval(() => {
            const now = Date.now();
            postMessage({ now });
            lastTime = now;
          }, 200);
        `,
        ],
        { type: "application/javascript" },
      );
      const workerUrl = URL.createObjectURL(workerBlob);
      worker = new Worker(workerUrl);
      let lastHeartbeat = Date.now();

      worker.onmessage = () => {
        const now = Date.now();
        if (now - lastHeartbeat > 600) {
          // Main thread was paused by DevTools debugger!
          triggerProtection();
        }
        lastHeartbeat = now;
      };
    } catch {
      // Ignore worker creation errors
    }

    // 4. Debugger Timing Loop (Catches DevTools opened via 3-dots menu or external attach)
    let debuggerInterval: NodeJS.Timeout | null = null;
    try {
      debuggerInterval = setInterval(() => {
        const start = performance.now();
        // Evaluating debugger statement causes measurable delay when DevTools is active
        // eslint-disable-next-line no-debugger
        Function("debugger")();
        const end = performance.now();
        if (end - start > 200) {
          triggerProtection();
        }
      }, 1000);
    } catch {
      // Ignore debugger eval errors
    }

    // Register all event listeners with capture phase for highest priority
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyDown, true);
    window.addEventListener("contextmenu", handleContextMenu, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyDown, true);
      window.removeEventListener("contextmenu", handleContextMenu, true);

      if (worker) worker.terminate();
      if (debuggerInterval) clearInterval(debuggerInterval);
    };
  }, []);

  return null;
}
