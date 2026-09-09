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
  const onTokenChangeRef = useRef(onTokenChange);
  onTokenChangeRef.current = onTokenChange;

  const configuredSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  
  // On local HTTP dev, use Cloudflare's official test site key so verification never fails.
  // On production or preview domains (e.g. vercel.app, domain.com), use the configured real key.
  const isLocalDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const siteKey =
    !isLocalDev && process.env.NODE_ENV === "production" && configuredSiteKey
      ? configuredSiteKey
      : TURNSTILE_TEST_SITE_KEY;

  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      onTokenChangeRef.current(null);
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
            onTokenChangeRef.current(token);
          },
          "error-callback": (code) => {
            setStatus("error");
            setErrorCode(code);
            onTokenChangeRef.current(null);
            return true;
          },
          "expired-callback": () => {
            setStatus("loading");
            onTokenChangeRef.current(null);
          },
        });
        setStatus("ready");
      } catch {
        setStatus("error");
        setErrorCode("render-failed");
        onTokenChangeRef.current(null);
      }
    };

    let script: HTMLScriptElement | null = null;
    if (window.turnstile) {
      render();
    } else {
      script = getTurnstileScript();
      script.addEventListener("load", render, { once: true });
      script.addEventListener(
        "error",
        () => {
          setStatus("error");
          setErrorCode("script-load-failed");
          onTokenChangeRef.current(null);
        },
        { once: true },
      );
    }

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
      script?.removeEventListener("load", render);
      window.clearInterval(readinessTimer);
      window.clearTimeout(timeoutTimer);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      onTokenChangeRef.current(null);
    };
  }, [action, attempt, siteKey]);

  return (
    <div aria-label="Xác minh chống bot" className="w-full my-1.5 flex flex-col items-center justify-center">
      {/* Official Cloudflare Turnstile native container */}
      <div className="w-full min-h-[65px] flex items-center justify-center">
        <div
          ref={containerRef}
          className="flex items-center justify-center"
        />
      </div>

      {status === "loading" && (
        <p className="-mt-[65px] flex h-[65px] w-full items-center justify-center gap-2 rounded-xl border border-neutral-700/70 bg-[#1b202a] text-[11px] text-neutral-400">
          <Loader2 size={14} className="animate-spin text-violet-400" /> Đang tải xác minh bảo mật...
        </p>
      )}

      {status === "error" && (
        <div className="-mt-[65px] flex min-h-[65px] w-full items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-[#1d1912] px-3 text-left text-[11px] leading-4 text-amber-100">
          <span className="flex items-start gap-2">
            <TriangleAlert
              size={15}
              className="mt-0.5 shrink-0 text-amber-300"
            />
            {errorCode === "110200"
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
