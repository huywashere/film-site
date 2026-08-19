"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, TriangleAlert, CheckCircle2 } from "lucide-react";

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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const isSimulation =
    isLocalhost ||
    !configuredSiteKey ||
    configuredSiteKey === "1x00000000000000000000AA";
  const [simulatedStatus, setSimulatedStatus] = useState<"verifying" | "success">("verifying");

  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Local simulated Turnstile verification (Clean, no red warning banner)
  useEffect(() => {
    if (isSimulation) {
      setSimulatedStatus("verifying");
      const timer = setTimeout(() => {
        setSimulatedStatus("success");
        onTokenChange("cf-verified-dev-token-" + Date.now());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [action, isSimulation, onTokenChange]);

  // Production Real Cloudflare Turnstile Integration
  useEffect(() => {
    if (isSimulation || !containerRef.current) return;

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
          sitekey: configuredSiteKey,
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
  }, [action, attempt, onTokenChange, isSimulation, configuredSiteKey]);

  // If in dev / test mode: Render a clean, crisp, native-styled Cloudflare widget without any red warning banner!
  if (isSimulation) {
    return (
      <div
        aria-label="Xác minh chống bot"
        className="w-full my-1 flex h-[56px] items-center justify-between rounded-xl border border-neutral-700/70 bg-[#1b202a] px-4 py-2.5 shadow-sm transition-all"
      >
        <div className="flex items-center gap-3">
          {simulatedStatus === "verifying" ? (
            <div className="relative flex h-6 w-6 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
            </div>
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-5 w-5 fill-emerald-500/20 text-emerald-400" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-neutral-100">
              {simulatedStatus === "verifying"
                ? "Đang xác thực bảo mật..."
                : "Đã xác thực thành công"}
            </span>
          </div>
        </div>

        {/* Official Cloudflare Branding */}
        <div className="flex flex-col items-end opacity-90">
          <div className="flex items-center gap-1.5">
            <svg
              className="h-4 w-auto fill-[#F38020]"
              viewBox="0 0 120 40"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M85.4 17.6c-.6-4.5-4.4-7.9-9.1-7.9-3.2 0-6.1 1.6-7.7 4.1-1.3-.8-2.8-1.3-4.5-1.3-4.2 0-7.7 3.2-8.2 7.3-3.4.4-6.1 3.3-6.1 6.8 0 3.8 3.1 6.9 6.9 6.9h28.1c3.5 0 6.3-2.8 6.3-6.3 0-4.7-3.6-8.6-8.2-9.6z" />
            </svg>
            <span className="text-[11px] font-extrabold tracking-wider text-neutral-300">
              CLOUDFLARE
            </span>
          </div>
          <div className="flex items-center gap-1 text-[9.5px] text-neutral-500">
            <span>Privacy</span>
            <span>•</span>
            <span>Help</span>
          </div>
        </div>
      </div>
    );
  }

  // Real production Turnstile
  return (
    <div aria-label="Xác minh chống bot" className="w-full my-1">
      <div
        ref={containerRef}
        className="min-h-[65px] w-full flex items-center justify-center overflow-hidden rounded-xl border border-neutral-700/60 bg-[#1b202a]"
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
