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
        setProgress(45);
        if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
        progressTimerRef.current = setTimeout(() => {
          setProgress(75);
        }, 120);
      }
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    };
  }, []);

  // When pathname or searchParams finish updating, glide to 100% and hide swiftly
  useEffect(() => {
    if (!loading && progress === 0) return;
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    setProgress(100);

    const timer = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 140);

    return () => {
      clearTimeout(timer);
    };
  }, [pathname, searchParams]);

  if (!loading && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-[2px] bg-transparent"
    >
      <div
        className="relative h-full bg-gradient-to-r from-purple-400 via-purple-300 to-violet-300 shadow-[0_0_8px_rgba(192,132,252,0.85),0_0_16px_rgba(168,85,247,0.4)] transition-all duration-150 ease-out"
        style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
      >
        {/* Sleek leading flare at the tip */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/70 blur-[0.5px]" />
        <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_5px_#c084fc]" />
      </div>
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
