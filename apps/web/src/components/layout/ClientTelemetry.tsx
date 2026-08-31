"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { errorMessage, recordTelemetry } from "@/lib/telemetry";
import { initSentry } from "@/lib/sentry";

export function ClientTelemetry() {
  const pathname = usePathname();

  useEffect(() => {
    initSentry();
    recordTelemetry("route.view", { path: pathname });
  }, [pathname]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (event.filename && event.filename.includes("telemetry/client")) return;
      recordTelemetry(
        "frontend.error",
        {
          message: event.message,
          filename: event.filename,
          line: event.lineno,
        },
        "error",
      );
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const msg = errorMessage(event.reason);
      if (msg.includes("telemetry/client") || msg.includes("429")) return;
      recordTelemetry(
        "frontend.unhandled_rejection",
        { message: msg },
        "error",
      );
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    if (!("PerformanceObserver" in window)) return;
    const metrics = {
      lcp: 0,
      cls: 0,
      inp: 0,
      fcp: 0,
      ttfb: 0,
    };
    let reported = false;

    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (navigation) metrics.ttfb = Math.max(0, navigation.responseStart);

    const reportVitals = () => {
      if (reported) return;
      reported = true;
      recordTelemetry("web_vital.summary", {
        lcp: Math.round(metrics.lcp),
        cls: Number(metrics.cls.toFixed(4)),
        inp: Math.round(metrics.inp),
        fcp: Math.round(metrics.fcp),
        ttfb: Math.round(metrics.ttfb),
      });
    };

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "largest-contentful-paint") {
          metrics.lcp = Math.max(metrics.lcp, entry.startTime);
        }
        if (entry.entryType === "layout-shift") {
          const shift = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
          };
          if (!shift.hadRecentInput) metrics.cls += shift.value || 0;
        }
        if (entry.entryType === "event") {
          metrics.inp = Math.max(metrics.inp, entry.duration);
        }
        if (
          entry.entryType === "paint" &&
          entry.name === "first-contentful-paint"
        ) {
          metrics.fcp = entry.startTime;
        }
      }
    });

    try {
      observer.observe({ type: "largest-contentful-paint", buffered: true });
      observer.observe({ type: "layout-shift", buffered: true });
      observer.observe({ type: "paint", buffered: true });
      observer.observe({
        type: "event",
        buffered: true,
        durationThreshold: 40,
      } as PerformanceObserverInit);
    } catch {
      // Older browsers may not support one or more entry types.
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") reportVitals();
    };
    window.addEventListener("pagehide", reportVitals, { once: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      observer.disconnect();
      window.removeEventListener("pagehide", reportVitals);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reportVitals();
    };
  }, []);

  return null;
}
