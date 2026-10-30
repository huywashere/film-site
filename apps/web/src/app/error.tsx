"use client";

import { useEffect, useRef } from "react";
import { StatusPage } from "@/components/layout/StatusPage";
import { captureException } from "@/lib/sentry";
import {
  recoverFromChunkLoadError,
  retryCurrentDocument,
} from "@/lib/chunk-load-recovery";

const DEV_RECOVERY_KEY = "flexphim:dev-error-recovery";

export default function ErrorPage({
  error,
}: {
  error: Error;
}) {
  const recoveryStarted = useRef(false);

  useEffect(() => {
    captureException(error, { tags: { scope: "route-error-boundary" } });

    if (recoverFromChunkLoadError(error)) return;

    if (recoveryStarted.current) return;

    const recoveryId = `${window.location.pathname}:${error.message}`;
    if (sessionStorage.getItem(DEV_RECOVERY_KEY) === recoveryId) return;

    recoveryStarted.current = true;
    sessionStorage.setItem(DEV_RECOVERY_KEY, recoveryId);
    // Automatic retry with clean document reload
    retryCurrentDocument();
  }, [error]);

  const retry = () => {
    sessionStorage.removeItem(DEV_RECOVERY_KEY);
    retryCurrentDocument();
  };

  return <StatusPage code="500" onRetry={retry} />;
}
