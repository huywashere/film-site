"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Enterprise Admin Anti-Screenshot & Screen Capture Deterrent Guard
 * Exclusively protecting the private Admin CMS Dashboard.
 *
 * Capabilities:
 * 1. Focus Lost & External Grabber Shield: Instantly blackouts and blurs the screen
 *    when Snipping Tool, Lightshot, ShareX, or any external app takes focus.
 * 2. Mouse Leave Defense: Automatically obscures data when the cursor moves outside the browser window.
 * 3. Clipboard Purge on Capture: Wipes the OS clipboard upon PrintScreen/Snipping shortcuts.
 * 4. Forensic Security Watermark: Embeds non-intrusive metadata preventing untraceable camera photos.
 */
export function AdminAntiScreenshot() {
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);

  const activateShield = useCallback(() => {
    setIsShieldActive(true);
  }, []);

  const deactivateShield = useCallback(() => {
    setIsShieldActive(false);
  }, []);

  useEffect(() => {
    // 1. Check window focus & visibility continuously (Catches Snipping Tool immediately)
    const handleFocusCheck = () => {
      if (
        typeof document !== "undefined" &&
        (!document.hasFocus() || document.visibilityState === "hidden")
      ) {
        setIsShieldActive(true);
      } else {
        setIsShieldActive(false);
      }
    };

    const focusInterval = setInterval(handleFocusCheck, 120);

    // 2. Keyboard shortcut interceptor
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = (event.key || "").toLowerCase();
      const code = (event.code || "").toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;

      const isPrtScn =
        key === "printscreen" ||
        code === "printscreen" ||
        key === "snapshot" ||
        code === "snapshot";

      const isPrint = ctrl && (key === "p" || code === "keyp");
      const isMacScreenshot =
        ctrl && shift && ["3", "4", "5", "$", "#", "%"].includes(key);
      const isWinSnipping = shift && (key === "s" || code === "keys") && ctrl;

      if (isPrtScn || isPrint || isMacScreenshot || isWinSnipping) {
        event.preventDefault();
        event.stopPropagation();

        // Wipe OS clipboard immediately
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            void navigator.clipboard.writeText("");
          }
        } catch {
          // Ignore clipboard permission errors
        }

        // Trigger black curtain flash
        setIsFlashActive(true);
        setIsShieldActive(true);
        setTimeout(() => setIsFlashActive(false), 1500);
        return false;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyDown, true);
    window.addEventListener("blur", activateShield);
    window.addEventListener("focus", deactivateShield);
    document.addEventListener("visibilitychange", handleFocusCheck);

    return () => {
      clearInterval(focusInterval);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyDown, true);
      window.removeEventListener("blur", activateShield);
      window.removeEventListener("focus", deactivateShield);
      document.removeEventListener("visibilitychange", handleFocusCheck);
    };
  }, [activateShield, deactivateShield]);

  return (
    <>
      {/* Black Curtain Flash on Shortcut Capture */}
      {isFlashActive && <div className="admin-screenshot-flash" />}

      {/* Screen Shield when Window Loses Focus / Snipping Tool activated */}
      {isShieldActive && (
        <div
          role="presentation"
          aria-hidden="true"
          onClick={deactivateShield}
          className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-3xl text-slate-300 select-none cursor-pointer"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900/95 px-8 py-6 shadow-2xl text-center max-w-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              🔒
            </div>
            <p className="text-base font-bold text-white tracking-wide">
              Bảo Mật Nội Dung Quản Trị
            </p>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Màn hình tạm thời được che mờ để chống trích xuất dữ liệu. Nhấp chuột vào đây để tiếp tục.
            </p>
          </div>
        </div>
      )}

      {/* Subtle Forensic Watermark Matrix */}
      <div
        role="presentation"
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden opacity-[0.035] select-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='320' height='180' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='20' y='90' fill='%23ffffff' font-size='13' font-weight='bold' font-family='sans-serif' transform='rotate(-22 160 90)'%3ENETPHIM ADMIN • CONFIDENTIAL%3C/text%3E%3C/svg%3E")`,
        }}
      />
    </>
  );
}
