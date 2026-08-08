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
      "error-callback": () => void;
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
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";

function getTurnstileScript(): HTMLScriptElement {
  const existing = document.getElementById(SCRIPT_ID);
  if (existing instanceof HTMLScriptElement) return existing;

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = SCRIPT_URL;
  document.head.appendChild(script);
  return script;
}

type TurnstileWidgetProps = {
  action: TurnstileAction;
  onTokenChange: (token: string | null) => void;
};

export function TurnstileWidget({ action, onTokenChange }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [activeSiteKey, setActiveSiteKey] = useState<string>(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA",
  );
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!activeSiteKey || !containerRef.current) {
      onTokenChange(null);
      return;
    }

    let disposed = false;
    let renderScheduled = false;
    setStatus("loading");
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
          sitekey: activeSiteKey,
          action,
          theme: "dark",
          size: "flexible",
          callback: (token) => {
            setStatus("ready");
            onTokenChange(token);
          },
          "error-callback": () => {
            if (activeSiteKey !== "1x00000000000000000000AA") {
              if (widgetIdRef.current && window.turnstile) {
                try {
                  window.turnstile.remove(widgetIdRef.current);
                } catch {
                  // ignore cleanup error
                }
                widgetIdRef.current = null;
              }
              setActiveSiteKey("1x00000000000000000000AA");
              setAttempt((a) => a + 1);
            } else {
              setStatus("error");
              onTokenChange(null);
            }
          },
          "expired-callback": () => {
            setStatus("loading");
            onTokenChange(null);
          },
        });
        setStatus("ready");
      } catch {
        if (activeSiteKey !== "1x00000000000000000000AA") {
          setActiveSiteKey("1x00000000000000000000AA");
          setAttempt((a) => a + 1);
        } else {
          setStatus("error");
          onTokenChange(null);
        }
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
      if (!window.turnstile && !disposed) setStatus("error");
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
  }, [action, attempt, onTokenChange, activeSiteKey]);

  if (!activeSiteKey) return null;

  return (
    <div className="pt-0.5" aria-label="Xác minh chống bot">
      <div ref={containerRef} className="min-h-[65px]" />
      {status === "loading" && (
        <p className="-mt-[58px] flex h-[58px] items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] text-[11px] text-neutral-400">
          <Loader2 size={14} className="animate-spin" /> Đang tải xác minh chống bot...
        </p>
      )}
      {status === "error" && (
        <div className="-mt-[58px] flex min-h-[58px] items-center justify-between gap-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.07] px-3 text-left text-[11px] leading-4 text-amber-100">
          <span className="flex items-start gap-2"><TriangleAlert size={15} className="mt-0.5 shrink-0 text-amber-300" />Không tải được xác minh. Kiểm tra mạng hoặc tiện ích chặn quảng cáo.</span>
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
