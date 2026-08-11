"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, TriangleAlert } from "lucide-react";

type TurnstileAction = "login" | "register";

type TurnstileApi = {
  ready: (callback: () => void) => void;
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: TurnstileAction;
      theme: "dark";
      size: "flexible";
      callback: (token: string) => void;
      "error-callback": (errorCode: string) => boolean;
      "expired-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_ID = "cf-turnstile-explicit";
const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

function getTurnstileScript(): HTMLScriptElement {
  const existing = document.getElementById(SCRIPT_ID);
  if (existing instanceof HTMLScriptElement) return existing;

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = SCRIPT_URL;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
  return script;
}

type TurnstileWidgetProps = {
  action: TurnstileAction;
  onTokenChange: (token: string | null) => void;
};

export function TurnstileWidget({
  action,
  onTokenChange,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const configuredSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const siteKey =
    process.env.NODE_ENV === "production"
      ? configuredSiteKey
      : TURNSTILE_TEST_SITE_KEY;
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      onTokenChange(null);
      return;
    }

    let disposed = false;
    let renderScheduled = false;
    setStatus("loading");
    setErrorCode(null);
    const render = () => {
      if (
        disposed ||
        renderScheduled ||
        widgetIdRef.current ||
        !containerRef.current ||
        !window.turnstile ||
        typeof window.turnstile.render !== "function"
      )
        return;

      renderScheduled = true;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: "dark",
          size: "flexible",
          callback: (token) => {
            setStatus("ready");
            onTokenChange(token);
          },
          "error-callback": (code) => {
            setStatus("error");
            setErrorCode(code);
            onTokenChange(null);
            return true;
          },
          "expired-callback": () => {
            setStatus("loading");
            onTokenChange(null);
          },
        });
        setStatus("ready");
      } catch {
        setStatus("error");
        setErrorCode("render-failed");
        onTokenChange(null);
      }
    };

    const script = getTurnstileScript();
    if (window.turnstile) {
      render();
    } else {
      script.addEventListener("load", render, { once: true });
      script.addEventListener(
        "error",
        () => {
          setStatus("error");
          setErrorCode("script-load-failed");
          onTokenChange(null);
        },
        { once: true },
      );
    }

    // Next hot-reloads and rapid form mode switches can attach after the CDN
    // script has already fired its load event. Polling only during bootstrap
    // closes that race without adding a permanent timer to the page.
    const readinessTimer = window.setInterval(() => {
      if (window.turnstile) {
        window.clearInterval(readinessTimer);
        render();
      }
    }, 100);
    const timeoutTimer = window.setTimeout(() => {
      window.clearInterval(readinessTimer);
      if (!window.turnstile && !disposed) {
        setStatus("error");
        setErrorCode("script-timeout");
      }
    }, 8_000);

    return () => {
      disposed = true;
      script.removeEventListener("load", render);
      window.clearInterval(readinessTimer);
      window.clearTimeout(timeoutTimer);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      onTokenChange(null);
    };
  }, [action, attempt, onTokenChange, siteKey]);

  if (!siteKey) {
    return (
      <div
        className="flex min-h-[58px] items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3 text-[11px] leading-4 text-red-100"
        role="alert"
      >
        <TriangleAlert size={15} className="shrink-0 text-red-300" />
        Xác minh chống bot chưa được cấu hình.
      </div>
    );
  }

  const hasConfigurationError = [
    "110100",
    "110110",
    "110200",
    "400020",
    "400070",
  ].includes(errorCode || "");

  return (
    <div aria-label="Xác minh chống bot">
      <div
        ref={containerRef}
        className="h-[65px] min-h-[65px] w-full overflow-hidden rounded-xl"
      />
      {status === "loading" && (
        <p className="-mt-[65px] flex h-[65px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] text-[11px] text-neutral-400">
          <Loader2 size={14} className="animate-spin" /> Đang tải xác minh...
        </p>
      )}
      {status === "error" && (
        <div className="-mt-[65px] flex min-h-[65px] items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-[#1d1912] px-3 text-left text-[11px] leading-4 text-amber-100">
          <span className="flex items-start gap-2">
            <TriangleAlert
              size={15}
              className="mt-0.5 shrink-0 text-amber-300"
            />
            {hasConfigurationError
              ? "Tên miền chưa được cho phép trong cấu hình Turnstile."
              : "Không tải được xác minh. Hãy kiểm tra kết nối mạng."}
          </span>
          <button
            type="button"
            onClick={() => {
              document.getElementById(SCRIPT_ID)?.remove();
              delete window.turnstile;
              setAttempt((value) => value + 1);
            }}
            className="shrink-0 rounded-md border border-amber-200/25 px-2 py-1 text-amber-100 transition-colors hover:bg-amber-200/10"
          >
            <RefreshCw size={13} aria-label="Tải lại xác minh" />
          </button>
        </div>
      )}
    </div>
  );
}
