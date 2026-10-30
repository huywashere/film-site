'use client';

import { useEffect } from 'react';

/**
 * Watchdog component that guards against stalled or poisoned Next.js App Router RSC flight transitions.
 * If a loading skeleton remains mounted for longer than `timeoutMs`, it forces a clean document reload
 * to the destination URL, preventing users from ever being trapped in an infinite skeleton screen.
 */
export function StuckNavigationRecovery({ timeoutMs = 3500 }: { timeoutMs?: number }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentUrl = window.location.href;
    const pathKey = `flexphim_stuck_nav_${window.location.pathname}`;

    const timer = setTimeout(() => {
      try {
        const attempts = Number(sessionStorage.getItem(pathKey) || '0');
        if (attempts < 2) {
          sessionStorage.setItem(pathKey, String(attempts + 1));
          window.location.replace(currentUrl);
        }
      } catch {
        window.location.replace(currentUrl);
      }
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [timeoutMs]);

  return null;
}

