"use client";

import { useEffect, useState } from "react";

/**
 * Enterprise Admin Anti-Screenshot & Screen Capture Deterrent Guard
 * Exclusively protecting the private Admin CMS Dashboard.
 *
 * 1. Blocks PrintScreen, Alt+PrtScn, Win+Shift+S, Cmd+Shift+3/4/5, Ctrl+P.
 * 2. Purges the OS clipboard when capture shortcuts are detected.
 * 3. Automatically heavily blurs the UI when the window loses focus (e.g. Snipping Tool / external grabber activated).
 * 4. Renders a subtle forensic security watermark matrix across the viewport.
 */
export function AdminAntiScreenshot() {
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);

  useEffect(() => {
    // 1. Keyboard Shortcut Interceptor for PrintScreen & Snipping Tool
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = (event.key || "").toLowerCase();
      const code = (event.code || "").toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;

      // PrintScreen / Snapshot
      const isPrtScn =
        key === "printscreen" ||
        code === "printscreen" ||
        key === "snapshot" ||
        code === "snapshot";

      // Ctrl + P / Cmd + P (Print to PDF / Paper)
      const isPrint = ctrl && (key === "p" || code === "keyp");

      // Mac screenshot shortcuts: Cmd + Shift + (3, 4, 5)
      const isMacScreenshot =
        ctrl && shift && ["3", "4", "5", "$", "#", "%"].includes(key);

      // Windows Snipping tool shortcut: Win + Shift + S
      const isWinSnipping = shift && (key === "s" || code === "keys") && ctrl;

      if (isPrtScn || isPrint || isMacScreenshot || isWinSnipping) {
        event.preventDefault();
        event.stopPropagation();

        // Clear clipboard
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            void navigator.clipboard.writeText("");
          }
        } catch {
          // Ignore clipboard permission errors
        }

        // Trigger black curtain flash
        setIsFlashActive(true);
        setTimeout(() => setIsFlashActive(false), 1200);
        return false;
      }
    };

    // 2. Window Blur Protection (Triggers when Snipping Tool or screenshot overlay takes OS focus)
    const handleWindowBlur = () => {
      setIsWindowBlurred(true);
    };

    const handleWindowFocus = () => {
      setIsWindowBlurred(false);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyDown, true);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyDown, true);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  return (
    <>
      {/* Black Curtain Flash on Capture Attempt */}
      {isFlashActive && <div className="admin-screenshot-flash" />}

      {/* Screen Blur Overlay when Window Loses Focus (Snipping Tool defense) */}
      {isWindowBlurred && (
        <div
          role="presentation"
          aria-hidden="true"
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-2xl text-slate-400 select-none pointer-events-auto"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 px-6 py-4 shadow-2xl text-center">
            <p className="text-sm font-bold text-white tracking-wide">
              🔒 Chế độ Bảo Vệ Nội Dung Quản Trị
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Nhấp chuột trở lại cửa sổ để tiếp tục làm việc.
            </p>
          </div>
        </div>
      )}

      {/* Forensic Security Watermark Matrix (Subtle anti-camera photo pattern) */}
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
