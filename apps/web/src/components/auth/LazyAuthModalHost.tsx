"use client";

import { lazy, Suspense, useEffect } from "react";
import { useAuthModalStore } from "@/store/authModalStore";

const AuthModal = lazy(() =>
  import("@/components/auth/AuthModal").then((module) => ({
    default: module.AuthModal,
  })),
);

/**
 * Keeps Firebase providers, Motion and the full auth form out of every route's
 * initial bundle. The modal chunk is pre-warmed on idle so clicking login opens
 * instantly with 0ms latency.
 */
export function LazyAuthModalHost() {
  const isOpen = useAuthModalStore((state) => state.isOpen);

  useEffect(() => {
    // Silently pre-warm AuthModal chunk in browser cache during idle
    const prewarm = () => {
      void import("@/components/auth/AuthModal");
    };

    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(prewarm, { timeout: 4000 });
      return () => window.cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(prewarm, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <Suspense fallback={null}>
      <AuthModal />
    </Suspense>
  );
}
