'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

export function DeferredSection({
  children,
  minHeight = 300,
  rootMargin = '240px 0px',
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || visible) return;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin, threshold: 0.01 },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [rootMargin, visible]);

  return (
    <div ref={anchorRef} style={visible ? undefined : { minHeight }}>
      {visible ? children : null}
    </div>
  );
}
