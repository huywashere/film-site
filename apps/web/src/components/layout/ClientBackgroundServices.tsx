"use client";

import { useEffect, useState } from "react";
import { RegisterSW } from "@/components/layout/RegisterSW";
import { OfflineDetector } from "@/components/layout/OfflineDetector";
import { ClientTelemetry } from "@/components/layout/ClientTelemetry";
import { AntiDevTools } from "@/components/security/AntiDevTools";
import { ScrollToTopButton } from "@/components/layout/ScrollToTop";

export function ClientBackgroundServices() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Defer non-critical background watchers until main thread is completely idle
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(() => setMounted(true), {
        timeout: 2000,
      });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = setTimeout(() => setMounted(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <RegisterSW />
      <AntiDevTools />
      <ClientTelemetry />
      <OfflineDetector />
      <ScrollToTopButton />
    </>
  );
}
