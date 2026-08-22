"use client";

import { useEffect } from "react";

const RICKROLL_URL =
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1";

/**
 * Enterprise Client-Side Anti-DevTools & Anti-Tamper Security Guard
 * Exclusively protecting the private Admin CMS Dashboard.
 *
 * Automatically redirects anyone attempting to open DevTools, inspect,
 * or bypass security to the Rickroll YouTube video.
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

    // 1. Immediate Window Dimensions Check (Catches DevTools already docked before page load)
    const checkDimensions = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        triggerProtection();
      }
    };
    checkDimensions();

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

    // 3. Right-Click & Auxiliary Context Menu Interception
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      return false;
    };

    // 4. Web Worker Independent Thread Heartbeat (Detects if main thread is paused in debugger)
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
          }, 150);
        `,
        ],
        { type: "application/javascript" },
      );
      const workerUrl = URL.createObjectURL(workerBlob);
      worker = new Worker(workerUrl);
      let lastHeartbeat = Date.now();

      worker.onmessage = () => {
        const now = Date.now();
        if (now - lastHeartbeat > 450) {
          // Main thread was paused by DevTools debugger!
          triggerProtection();
        }
        lastHeartbeat = now;
      };
    } catch {
      // Ignore worker creation errors
    }

    // 5. Debugger Timing Loop (Catches DevTools opened via 3-dots menu or external attach)
    let debuggerInterval: NodeJS.Timeout | null = null;
    try {
      debuggerInterval = setInterval(() => {
        const start = performance.now();
        // eslint-disable-next-line no-debugger
        Function("debugger")();
        const end = performance.now();
        if (end - start > 80) {
          triggerProtection();
        }
      }, 500);
    } catch {
      // Ignore debugger eval errors
    }

    // 6. Console Object Getter & Regex Trap (Triggers when DevTools console formats output)
    let consoleInterval: NodeJS.Timeout | null = null;
    try {
      const detector = new Image();
      Object.defineProperty(detector, "id", {
        get: () => {
          triggerProtection();
          return "";
        },
      });
      const regex = /./;
      regex.toString = () => {
        triggerProtection();
        return "";
      };

      consoleInterval = setInterval(() => {
        // eslint-disable-next-line no-console
        console.log(detector);
        // eslint-disable-next-line no-console
        console.log(regex);
        // eslint-disable-next-line no-console
        console.clear();
      }, 800);
    } catch {
      // Ignore getter trap errors
    }

    // Register all event listeners with capture phase for highest priority
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyDown, true);
    window.addEventListener("contextmenu", handleContextMenu, true);
    window.addEventListener("resize", checkDimensions, { passive: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyDown, true);
      window.removeEventListener("contextmenu", handleContextMenu, true);
      window.removeEventListener("resize", checkDimensions);

      if (worker) worker.terminate();
      if (debuggerInterval) clearInterval(debuggerInterval);
      if (consoleInterval) clearInterval(consoleInterval);
    };
  }, []);

  return null;
}
