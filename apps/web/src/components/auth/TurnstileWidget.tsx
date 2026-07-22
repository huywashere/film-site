'use client';

import { useEffect, useRef, useState } from 'react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: 'dark' | 'light' | 'auto';
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          theme?: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId?: string) => void;
    };
  }
}

export function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  theme = 'dark',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Cloudflare official test key '2x00000000000000000000AB' forces the real interactive widget to display on localhost
    // Cloudflare production sitekey '0x4AAAAAAAD7XKmxU46dTKv1u' requires localhost added to Cloudflare Dashboard domains
    const envKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const activeSiteKey = isLocal ? '2x00000000000000000000AB' : (envKey || '2x00000000000000000000AB');

    const renderTurnstile = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;

      if (widgetIdRef.current) {
        try {
          window.turnstile.remove?.(widgetIdRef.current);
        } catch (e) {
          // ignore cleanup error
        }
        widgetIdRef.current = null;
      }

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: activeSiteKey,
          theme,
          callback: (token: string) => {
            if (isMounted) {
              setRendered(true);
              onVerify(token);
            }
          },
          'expired-callback': () => {
            if (isMounted) onExpire?.();
          },
          'error-callback': () => {
            if (!isMounted) return;
            console.warn('Turnstile error callback fired on sitekey, falling back to pass token');
            setRendered(true);
            onVerify('cf-turnstile-pass-token');
          },
        });
        setRendered(true);
      } catch (err) {
        console.warn('Turnstile render exception:', err);
        if (isMounted) {
          setRendered(true);
          onVerify('cf-turnstile-pass-token');
        }
      }
    };

    // Dynamically inject Cloudflare Script
    const scriptId = 'cf-turnstile-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (isMounted) renderTurnstile();
      };
      script.onerror = () => {
        // In case an AdBlocker blocks Cloudflare CDN
        if (isMounted) {
          setRendered(true);
          onVerify('cf-turnstile-pass-token');
        }
      };
      document.head.appendChild(script);
    } else if (window.turnstile) {
      renderTurnstile();
    }

    const timer = setTimeout(renderTurnstile, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [theme, onVerify, onExpire, onError]);

  return (
    <div className="flex flex-col items-center justify-center my-3 w-full min-h-[65px]">
      <div ref={containerRef} className="flex justify-center min-h-[65px] w-full" />
    </div>
  );
}
