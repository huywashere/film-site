"use client";

import { lazy, Suspense } from "react";
import { useAuthModalStore } from "@/store/authModalStore";

const AuthModal = lazy(() =>
  import("@/components/auth/AuthModal").then((module) => ({
    default: module.AuthModal,
  })),
);

/**
 * Keeps Firebase providers, Motion and the full auth form out of every route's
 * initial bundle. The modal chunk is requested only after a user opens it.
 */
export function LazyAuthModalHost() {
  const isOpen = useAuthModalStore((state) => state.isOpen);
  if (!isOpen) return null;

  return (
    <Suspense fallback={null}>
      <AuthModal />
    </Suspense>
  );
}
