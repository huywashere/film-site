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
    // These services are not required to paint or navigate the page. Starting
    // them on first interaction avoids an artificial late burst of JavaScript
    // and network work for visitors who are only reading the hero.
    const mount = () => setMounted(true);
    const options: AddEventListenerOptions = { passive: true, once: true };
    window.addEventListener("pointerdown", mount, options);
    window.addEventListener("keydown", mount, { once: true });
    return () => {
      window.removeEventListener("pointerdown", mount);
      window.removeEventListener("keydown", mount);
    };
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
