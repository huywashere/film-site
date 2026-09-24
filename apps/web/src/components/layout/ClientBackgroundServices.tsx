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
    let fallbackTimer: number | null = null;

    const clearFallback = () => {
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
    };

    const recoverStalledNavigation = (event: MouseEvent) => {
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
      const nestedControl = target.closest<HTMLElement>(
        'button, input, textarea, select, [role="button"], [contenteditable="true"]',
      );
      if (
        !anchor ||
        (nestedControl && nestedControl !== anchor) ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self")
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      const startingHref = window.location.href;
      if (
        destination.origin !== window.location.origin ||
        destination.href === startingHref
      ) {
        return;
      }

      const isCatalogDestination =
        destination.pathname === "/films" ||
        destination.pathname.startsWith("/films/") ||
        destination.pathname.startsWith("/genre/") ||
        destination.pathname.startsWith("/country/");

      // These routes depend on several upstream catalogues. A Next RSC
      // transition can remain pending while one provider is cold, leaving the
      // old tab visible and unresponsive. Their server-rendered document is
      // already data-seeded, so navigate to it immediately and deterministically.
      if (isCatalogDestination) {
        event.stopImmediatePropagation();
        clearFallback();
        window.location.assign(destination.href);
        return;
      }

      // Do not interfere with Next's normal Link handling. Recover only when
      // its RSC request completed/aborted without committing the destination.
      clearFallback();
      fallbackTimer = window.setTimeout(() => {
        fallbackTimer = null;
        if (window.location.href === startingHref) {
          window.location.assign(destination.href);
        }
      }, 1_200);
    };

    document.addEventListener("click", recoverStalledNavigation, true);
    window.addEventListener("pagehide", clearFallback);
    return () => {
      clearFallback();
      document.removeEventListener("click", recoverStalledNavigation, true);
      window.removeEventListener("pagehide", clearFallback);
    };
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
