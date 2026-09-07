'use client';

import { useEffect, useState } from 'react';

export function useDeferredContent(timeout = 1800) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const enable = () => setReady(true);
    const options: AddEventListenerOptions = { passive: true, once: true };
    window.addEventListener('wheel', enable, options);
    window.addEventListener('pointerdown', enable, options);
    window.addEventListener('touchstart', enable, options);
    window.addEventListener('keydown', enable, { once: true });

    const idleWindow = window as typeof window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const idleId = idleWindow.requestIdleCallback?.(enable, { timeout });
    const timer = idleId === undefined ? window.setTimeout(enable, timeout) : undefined;

    return () => {
      window.removeEventListener('wheel', enable);
      window.removeEventListener('pointerdown', enable);
      window.removeEventListener('touchstart', enable);
      window.removeEventListener('keydown', enable);
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [timeout]);

  return ready;
}
