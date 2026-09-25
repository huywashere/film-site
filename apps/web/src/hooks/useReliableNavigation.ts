'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

type NavigationOptions = {
  scroll?: boolean;
};

function navigateReliably(
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

  const clientHref = `${destination.pathname}${destination.search}${destination.hash}`;
  navigate(clientHref, options);
}

/**
 * Keep same-origin navigation inside Next.js so the shared shell, React Query
 * cache and prefetched RSC payload survive route changes. External URLs still
 * use normal document navigation.
 */
export function useReliableNavigation() {
  const router = useRouter();

  const push = useCallback(
    (href: string, options?: NavigationOptions) => {
      navigateReliably(router.push, href, options, false);
    },
    [router],
  );

  const replace = useCallback(
    (href: string, options?: NavigationOptions) => {
      navigateReliably(router.replace, href, options, true);
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
