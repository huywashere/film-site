"use client";

import { useEffect } from "react";

const DARK_BROWSER_CHROME = "#08090c";
const LIGHT_BROWSER_CHROME = "#f4f6f9";

function isLightTheme(root: HTMLElement) {
  return root.classList.contains("light") || root.dataset.theme === "light";
}

/**
 * Keeps the mobile browser/PWA chrome aligned with the active theme.
 * ThemeWatcher remains the single source of truth; this component only reacts
 * to the class/data attribute that it writes on <html>.
 */
export function ThemeColorSync() {
  useEffect(() => {
    const root = document.documentElement;

    const sync = () => {
      const light = isLightTheme(root);
      let meta = document.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]',
      );

      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "theme-color";
        document.head.appendChild(meta);
      }

      meta.content = light ? LIGHT_BROWSER_CHROME : DARK_BROWSER_CHROME;
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
