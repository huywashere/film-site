'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const MIN_VISIBLE_MS = 650;
const MAX_VISIBLE_MS = 1500;
const EXIT_DURATION_MS = 260;

export function LogoSplashIntro() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const startedAt = performance.now();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let closeStarted = false;
    let closeTimer: number | undefined;
    let removeTimer: number | undefined;

    const close = () => {
      if (closeStarted) return;
      closeStarted = true;
      const remaining = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt));
      closeTimer = window.setTimeout(() => {
        setLeaving(true);
        removeTimer = window.setTimeout(() => {
          document.body.style.overflow = previousOverflow;
          setVisible(false);
        }, EXIT_DURATION_MS);
      }, remaining);
    };

    if (document.readyState === 'complete') close();
    else window.addEventListener('load', close, { once: true });

    const maximumTimer = window.setTimeout(close, MAX_VISIBLE_MS);
    return () => {
      window.removeEventListener('load', close);
      window.clearTimeout(maximumTimer);
      if (closeTimer) window.clearTimeout(closeTimer);
      if (removeTimer) window.clearTimeout(removeTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      id="netphim-entry-splash"
      role="status"
      aria-live="polite"
      aria-label="Đang mở NetPhim"
      className={`netphim-splash-shell fixed inset-0 z-[10000] overflow-hidden bg-[#06070a] transition-[opacity,filter] duration-300 ease-out ${
        leaving
          ? 'netphim-splash-shell--leaving pointer-events-none opacity-0 blur-[2px]'
          : 'pointer-events-auto opacity-100'
      }`}
    >
      <div
        aria-hidden="true"
        className="netphim-splash-grid absolute -inset-[14%] block h-[128%] w-[128%] opacity-45"
      >
        <picture className="block h-full w-full">
          <source media="(min-width: 640px)" srcSet="/images/splash/poster-grid-desktop.webp" />
          <img
            src="/images/splash/poster-grid-mobile.webp"
            alt=""
            width={456}
            height={906}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </picture>
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-black/50" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(124,58,237,0.3),transparent_28%),radial-gradient(circle_at_50%_50%,transparent_18%,rgba(6,7,10,0.68)_66%,#06070a_100%)]"
      />

      <div className="netphim-splash-brand relative flex h-full flex-col items-center justify-center px-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Image
            src="/cinephim-logo.svg"
            alt=""
            width={82}
            height={82}
            priority
            unoptimized
            className="h-[62px] w-[62px] object-contain drop-shadow-[0_14px_34px_rgba(91,33,182,0.45)] sm:h-[78px] sm:w-[78px]"
          />
          <span className="text-[38px] font-black tracking-[-0.055em] text-white drop-shadow-[0_10px_32px_rgba(0,0,0,0.8)] sm:text-[54px]">
            Net<span className="text-violet-400">Phim</span>
          </span>
        </div>
        <div className="mt-7 h-px w-36 overflow-hidden bg-white/15 sm:w-44">
          <span className="netphim-splash-progress block h-full rounded-full bg-gradient-to-r from-violet-500 via-white to-violet-400" />
        </div>
      </div>
    </div>
  );
}
