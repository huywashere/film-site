"use client";

import { StatusPage } from "@/components/layout/StatusPage";

export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100]">
      <StatusPage code="500" onRetry={reset} />
    </div>
  );
}
