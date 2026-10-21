"use client";

import { useEffect } from "react";

/**
 * FlexPhim Media & Asset Protection Guard
 * 1. Print Self-XSS Console Warning (Facebook/Discord Style)
 * 2. Prevent dragging images to desktop / new tab
 * 3. Prevent right-click "Save image as" on media elements
 */
export function AssetProtectionGuard() {
  useEffect(() => {
    // Print Self-XSS Defense Warning Banner in Browser Console
    if (typeof window !== "undefined") {
      const isAuditOrBot =
        navigator.webdriver ||
        /Lighthouse|Chrome-Lighthouse|PTST|HeadlessChrome/i.test(
          navigator.userAgent || ""
        );
      if (!isAuditOrBot) {
        setTimeout(() => {
          console.log(
            "%cDỪNG LẠI! (STOP!)",
            "color: #e50914; font-size: 40px; font-weight: bold; -webkit-text-stroke: 1px black;"
          );
          console.log(
            "%cĐây là tính năng dành riêng cho lập trình viên. Nếu có ai bảo bạn dán bất kỳ mã nào vào đây, ĐÓ LÀ HÀNH VI LỪA ĐẢO nhằm chiếm đoạt tài khoản!",
            "font-size: 16px; color: #ffffff; background: #111; padding: 8px; border-radius: 4px;"
          );
        }, 800);
      }
    }

    // Prevent dragging images & videos to new tab or desktop
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "IMG" || target.tagName === "VIDEO" || target.closest("img"))) {
        e.preventDefault();
        return false;
      }
    };

    // Prevent right-clicking specifically on image & video elements to block "Save image as..."
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "IMG" || target.tagName === "VIDEO" || target.closest("img"))) {
        e.preventDefault();
        return false;
      }
    };

    window.addEventListener("dragstart", handleDragStart);
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  return null;
}

export const AntiDevTools = AssetProtectionGuard;
