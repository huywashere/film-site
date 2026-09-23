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
    // These optional services are not required to paint or navigate the page.
    // The service worker is intentionally mounted outside this gate: starting
    // it on pointerdown used to race with and cancel the first navigation.
    const mount = () => setMounted(true);
    const options: AddEventListenerOptions = { passive: true, once: true };
    window.addEventListener("pointerdown", mount, options);
    window.addEventListener("keydown", mount, { once: true });
    return () => {
      window.removeEventListener("pointerdown", mount);
      window.removeEventListener("keydown", mount);
    };
  }, []);

  return (
    <>
      <RegisterSW />
      {mounted ? (
        <>
          <AntiDevTools />
          <ClientTelemetry />
          <OfflineDetector />
          <ScrollToTopButton />
        </>
      ) : null}
    </>
  );
}
