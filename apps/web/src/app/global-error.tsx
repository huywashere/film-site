"use client";

import { StatusPage } from "@/components/layout/StatusPage";

export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body>
        <StatusPage code="500" onRetry={reset} />
      </body>
    </html>
  );
}
