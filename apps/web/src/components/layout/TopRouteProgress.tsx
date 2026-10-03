"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function TopRouteProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Instant trigger when user clicks any same-origin navigation link
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const anchor = (e.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }
      if (anchor.target && anchor.target !== "_self") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const currentPath = window.location.pathname + window.location.search;
      if (href !== currentPath) {
        setLoading(true);
        setProgress(38);
        if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
        progressTimerRef.current = setTimeout(() => {
          setProgress(65);
        }, 180);
      }
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    };
  }, []);

  // When pathname or searchParams finish updating, glide to 100% and hide
  useEffect(() => {
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    setProgress(95);

    const timer1 = setTimeout(() => {
      setProgress(100);
    }, 80);

    const timer2 = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 280);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [pathname, searchParams]);

  if (!loading && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-[2.5px] bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-cyan-400 via-violet-500 to-rose-500 shadow-[0_0_12px_rgba(35,173,229,0.9),0_0_24px_rgba(168,85,247,0.6)] transition-all duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
      />
    </div>
  );
}

export function TopRouteProgress() {
  return (
    <Suspense fallback={null}>
      <TopRouteProgressInner />
    </Suspense>
  );
}
