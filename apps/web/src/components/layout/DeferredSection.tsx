'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export function DeferredSection({
  children,
  minHeight = 300,
  rootMargin = '180px 0px',
  className,
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
  className?: string;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || mounted) return;
    if (!('IntersectionObserver' in window)) {
      setMounted(true);
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setMounted(true);
        window.requestAnimationFrame(() => {
          setInView(true);
        });
        observer.disconnect();
      },
      { rootMargin, threshold: 0.01 },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [rootMargin, mounted]);

  return (
    <div
      ref={anchorRef}
      style={mounted ? undefined : { minHeight }}
      className={cn(
        'w-full cv-section-auto transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform',
        inView
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-7 scale-[0.99] pointer-events-none',
        className,
      )}
    >
      {mounted ? children : null}
    </div>
  );
}
