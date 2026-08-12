"use client";

import { StatusPage } from "@/components/layout/StatusPage";

export default function Custom500Page() {
  return (
    <div className="fixed inset-0 z-[100]">
      <StatusPage code="500" onRetry={() => window.location.reload()} />
    </div>
  );
}
