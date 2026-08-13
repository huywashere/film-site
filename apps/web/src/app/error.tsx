"use client";

import { useEffect, useRef } from "react";
import { StatusPage } from "@/components/layout/StatusPage";
import { captureException } from "@/lib/sentry";

const DEV_RECOVERY_KEY = "cinephim:dev-error-recovery";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const recoveryStarted = useRef(false);

  useEffect(() => {
    captureException(error, { tags: { scope: "route-error-boundary" } });

    if (process.env.NODE_ENV !== "development" || recoveryStarted.current)
      return;

    const recoveryId = `${window.location.pathname}:${error.message}`;
    if (sessionStorage.getItem(DEV_RECOVERY_KEY) === recoveryId) return;

    recoveryStarted.current = true;
    sessionStorage.setItem(DEV_RECOVERY_KEY, recoveryId);
    reset();

    const reloadTimer = window.setTimeout(() => {
      window.location.reload();
    }, 150);

    return () => window.clearTimeout(reloadTimer);
  }, [error, reset]);

  const retry = () => {
    sessionStorage.removeItem(DEV_RECOVERY_KEY);
    reset();
    window.setTimeout(() => window.location.reload(), 50);
  };

  return <StatusPage code="500" onRetry={retry} />;
}
