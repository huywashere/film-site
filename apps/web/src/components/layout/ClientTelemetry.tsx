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
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "largest-contentful-paint") {
          recordTelemetry("web_vital.lcp", {
            value: Math.round(entry.startTime),
          });
        }
        if (entry.entryType === "layout-shift") {
          const shift = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
          };
          if (!shift.hadRecentInput)
            recordTelemetry("web_vital.cls", { value: shift.value || 0 });
        }
        if (entry.entryType === "event") {
          recordTelemetry("web_vital.inp", {
            value: Math.round(entry.duration),
          });
        }
      }
    });

    try {
      observer.observe({ type: "largest-contentful-paint", buffered: true });
      observer.observe({ type: "layout-shift", buffered: true });
      observer.observe({
        type: "event",
        buffered: true,
        durationThreshold: 40,
      } as PerformanceObserverInit);
    } catch {
      // Older browsers may not support one or more entry types.
    }
    return () => observer.disconnect();
  }, []);

  return null;
}
