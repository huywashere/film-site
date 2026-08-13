"use client";

import { StatusPage } from "@/components/layout/StatusPage";

export default function Custom500Page() {
  return <StatusPage code="500" onRetry={() => window.location.reload()} />;
}
