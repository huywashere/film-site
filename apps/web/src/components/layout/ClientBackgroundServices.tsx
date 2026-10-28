"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { RegisterSW } from "@/components/layout/RegisterSW";

const AntiDevTools = dynamic(
  () => import("@/components/security/AntiDevTools").then((mod) => mod.AntiDevTools),
  { ssr: false },
);
const ClientTelemetry = dynamic(
  () => import("@/components/layout/ClientTelemetry").then((mod) => mod.ClientTelemetry),
  { ssr: false },
);
const OfflineDetector = dynamic(
  () => import("@/components/layout/OfflineDetector").then((mod) => mod.OfflineDetector),
  { ssr: false },
);
const ScrollToTopButton = dynamic(
  () => import("@/components/layout/ScrollToTop").then((mod) => mod.ScrollToTopButton),
  { ssr: false },
);

export function ClientBackgroundServices() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (window.location.pathname.startsWith("/watch/")) {
      void import("@/components/video/HlsVideoPlayer");
    }

    const wakeBoundaries = () => {
      document
        .querySelectorAll<HTMLElement>("[data-eager-hydration='true']")
        .forEach((target) => {
          target.dispatchEvent(
            new MouseEvent("click", { bubbles: true, cancelable: true }),
          );
        });
    };

    const frame = window.requestAnimationFrame(wakeBoundaries);
    const retry = window.setTimeout(wakeBoundaries, 700);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(retry);
    };
  }, [pathname]);

  useEffect(() => {
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
