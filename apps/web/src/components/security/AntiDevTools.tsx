"use client";

import { useEffect } from "react";

/**
 * CineVerse Media & Asset Protection Guard
 * Allows normal browser DevTools usage while preventing image dragging, 
 * image right-clicking, and direct asset hotlinking/copying.
 */
export function AssetProtectionGuard() {
  useEffect(() => {
    // 1. Prevent dragging images to new tab or desktop
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "IMG" || target.tagName === "VIDEO" || target.closest("img"))) {
        e.preventDefault();
        return false;
      }
    };

    // 2. Prevent right-clicking specifically on image & video elements to block "Save image as..."
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
