"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Disable automatic browser scroll restoration so route transitions always start cleanly at the top
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    if (typeof window !== "undefined" && !window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      const raf = requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [pathname]);

  return <>{children}</>;
}
