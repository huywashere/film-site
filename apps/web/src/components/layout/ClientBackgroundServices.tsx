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
    const navigateInternalLink = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self")
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.href === window.location.href
      ) {
        return;
      }

      // Keep navigation functional even if a stale RSC tree or hydration
      // mismatch prevents Next's client router from committing the new route.
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(destination.href);
    };

    document.addEventListener("click", navigateInternalLink, true);
    return () =>
      document.removeEventListener("click", navigateInternalLink, true);
  }, []);

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
