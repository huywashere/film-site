'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

type NavigationOptions = {
  scroll?: boolean;
};

let fallbackTimer: number | null = null;

function clearPendingFallback() {
  if (fallbackTimer === null || typeof window === 'undefined') return;
  window.clearTimeout(fallbackTimer);
  fallbackTimer = null;
}

function navigateWithFallback(
  navigate: (href: string, options?: NavigationOptions) => void,
  href: string,
  options: NavigationOptions | undefined,
  replace: boolean,
) {
  if (typeof window === 'undefined') {
    navigate(href, options);
    return;
  }

  const destination = new URL(href, window.location.href);
  if (destination.origin !== window.location.origin) {
    if (replace) window.location.replace(destination.href);
    else window.location.assign(destination.href);
    return;
  }

  const startingHref = window.location.href;
  const clientHref = `${destination.pathname}${destination.search}${destination.hash}`;
  clearPendingFallback();

  try {
    navigate(clientHref, options);
  } catch {
    if (replace) window.location.replace(destination.href);
    else window.location.assign(destination.href);
    return;
  }

  if (destination.href === startingHref) return;
  fallbackTimer = window.setTimeout(() => {
    fallbackTimer = null;
    if (window.location.href !== startingHref) return;
    if (replace) window.location.replace(destination.href);
    else window.location.assign(destination.href);
  }, 1_200);
}

/**
 * Preserve normal Next.js client navigation, but recover with a document
 * navigation when an RSC transition never commits the destination URL.
 * The module-level timer survives modal/menu unmounts triggered by the click.
 */
export function useReliableNavigation() {
  const router = useRouter();

  const push = useCallback(
    (href: string, options?: NavigationOptions) => {
      navigateWithFallback(router.push, href, options, false);
    },
    [router],
  );

  const replace = useCallback(
    (href: string, options?: NavigationOptions) => {
      navigateWithFallback(router.replace, href, options, true);
    },
    [router],
  );

  return useMemo(
    () => ({
      push,
      replace,
      back: router.back,
      forward: router.forward,
      refresh: router.refresh,
      prefetch: router.prefetch,
    }),
    [push, replace, router],
  );
}
