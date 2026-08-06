"use client";

import { useEffect } from "react";
import { StatusPage } from "@/components/layout/StatusPage";
import { captureException } from "@/lib/sentry";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, { tags: { scope: "global-error-boundary" } });
  }, [error]);

  return (
    <html lang="vi">
      <body>
        <StatusPage code="500" onRetry={reset} />
      </body>
    </html>
  );
}
