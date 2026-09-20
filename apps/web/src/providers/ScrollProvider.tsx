"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

const SCROLL_STORAGE_PREFIX = "flexphim:scroll-position:";
const PENDING_RESTORE_KEY = "flexphim:pending-scroll-restore";
const RESTORE_TIMEOUT_MS = 8_000;
const MAX_SAVED_AGE_MS = 6 * 60 * 60 * 1_000;

type SavedScrollPosition = {
  x: number;
  y: number;
  savedAt: number;
};

function currentRouteKey(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function readSavedPosition(routeKey: string): SavedScrollPosition | null {
  try {
    const raw = window.sessionStorage.getItem(
      `${SCROLL_STORAGE_PREFIX}${routeKey}`,
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedScrollPosition>;
    if (
      typeof parsed.x !== "number" ||
      typeof parsed.y !== "number" ||
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > MAX_SAVED_AGE_MS
    ) {
      return null;
    }
    return {
      x: Math.max(0, parsed.x),
      y: Math.max(0, parsed.y),
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

function savePosition(routeKey: string, x = window.scrollX, y = window.scrollY) {
  if (!routeKey) return;
  try {
    window.sessionStorage.setItem(
      `${SCROLL_STORAGE_PREFIX}${routeKey}`,
      JSON.stringify({ x, y, savedAt: Date.now() }),
    );
  } catch {
    // Storage is an enhancement. Navigation must still work in private mode.
  }
}

function isInitialHistoryRestore(): boolean {
  const navigation = performance.getEntriesByType(
    "navigation",
  )[0] as PerformanceNavigationTiming | undefined;
  return navigation?.type === "back_forward" || navigation?.type === "reload";
}

export function ScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeRouteRef = useRef("");
  const navigationRef = useRef<"initial" | "push" | "pop">("initial");
  const scrollFrameRef = useRef<number | null>(null);
  const restoringRef = useRef(false);
  const cancelRestoreRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!("scrollRestoration" in window.history)) return;

    window.history.scrollRestoration = "manual";
    activeRouteRef.current = currentRouteKey();

    const persistCurrentPosition = () => {
      if (restoringRef.current) return;
      savePosition(activeRouteRef.current);
    };

    const handleScroll = () => {
      if (restoringRef.current || scrollFrameRef.current !== null) return;
      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        persistCurrentPosition();
      });
    };

    const handleInternalLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download"))
        return;

      try {
        const destination = new URL(anchor.href, window.location.href);
        if (destination.origin !== window.location.origin) return;
        persistCurrentPosition();
        if (
          `${destination.pathname}${destination.search}` !==
          activeRouteRef.current
        ) {
          navigationRef.current = "push";
        }
      } catch {
        // Ignore malformed or non-http links.
      }
    };

    const handlePopState = () => {
      persistCurrentPosition();
      navigationRef.current = "pop";
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") persistCurrentPosition();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pagehide", persistCurrentPosition);
    document.addEventListener("click", handleInternalLink, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      persistCurrentPosition();
      cancelRestoreRef.current();
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pagehide", persistCurrentPosition);
      document.removeEventListener("click", handleInternalLink, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useLayoutEffect(() => {
    const routeKey = currentRouteKey();
    const navigationKind = navigationRef.current;
    const shouldRestore =
      navigationKind === "pop" ||
      (navigationKind === "initial" && isInitialHistoryRestore());

    navigationRef.current = "push";
    activeRouteRef.current = routeKey;
    cancelRestoreRef.current();

    if (window.location.hash) return;

    const saved = shouldRestore ? readSavedPosition(routeKey) : null;
    if (!saved) {
      restoringRef.current = false;
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant" as ScrollBehavior,
      });
      return;
    }

    restoringRef.current = true;
    try {
      window.sessionStorage.setItem(
        PENDING_RESTORE_KEY,
        JSON.stringify({ routeKey, y: saved.y }),
      );
    } catch {
      // Lazy sections can still restore through the retry loop below.
    }
    window.dispatchEvent(
      new CustomEvent("flexphim:restore-scroll", {
        detail: { routeKey, y: saved.y },
      }),
    );

    let cancelled = false;
    let timer: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const startedAt = Date.now();
    const deadline = Date.now() + RESTORE_TIMEOUT_MS;
    let lastDocumentHeight = 0;
    let stableSince = startedAt;
    const previousHtmlOverflowAnchor =
      document.documentElement.style.overflowAnchor;
    const previousBodyOverflowAnchor = document.body.style.overflowAnchor;
    document.documentElement.style.overflowAnchor = "none";
    document.body.style.overflowAnchor = "none";

    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      restoringRef.current = false;
      if (timer !== null) window.clearTimeout(timer);
      resizeObserver?.disconnect();
      document.documentElement.style.overflowAnchor =
        previousHtmlOverflowAnchor;
      document.body.style.overflowAnchor = previousBodyOverflowAnchor;
      try {
        window.sessionStorage.removeItem(PENDING_RESTORE_KEY);
      } catch {
        // Ignore storage restrictions.
      }
    };

    const restore = () => {
      if (cancelled) return;
      const maxY = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const documentHeight = document.documentElement.scrollHeight;
      if (documentHeight !== lastDocumentHeight) {
        lastDocumentHeight = documentHeight;
        stableSince = Date.now();
      }
      window.scrollTo({
        top: Math.min(saved.y, maxY),
        left: saved.x,
        behavior: "instant" as ScrollBehavior,
      });

      const now = Date.now();
      const reachedTarget = Math.abs(window.scrollY - saved.y) <= 2;
      const layoutIsStable = now - stableSince >= 700;
      const minimumHoldElapsed = now - startedAt >= 1_200;
      if (
        (reachedTarget && layoutIsStable && minimumHoldElapsed) ||
        now >= deadline
      ) {
        finish();
        return;
      }
      timer = window.setTimeout(restore, 80);
    };

    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(restore);
      resizeObserver.observe(document.documentElement);
    }
    window.requestAnimationFrame(restore);
    cancelRestoreRef.current = finish;

    return finish;
  }, [pathname]);

  return <>{children}</>;
}
