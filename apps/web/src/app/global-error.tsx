"use client";

import { useEffect } from "react";
import { StatusPage } from "@/components/layout/StatusPage";
import { captureException } from "@/lib/sentry";
import {
  recoverFromChunkLoadError,
  retryCurrentDocument,
} from "@/lib/chunk-load-recovery";

export default function GlobalError({
  error,
}: {
  error: Error;
}) {
  useEffect(() => {
    captureException(error, { tags: { scope: "global-error-boundary" } });
    recoverFromChunkLoadError(error);
  }, [error]);

  const retry = () => {
    retryCurrentDocument();
  };

  return (
    <html lang="vi">
      <body>
        <StatusPage code="500" onRetry={retry} />
      </body>
    </html>
  );
}
