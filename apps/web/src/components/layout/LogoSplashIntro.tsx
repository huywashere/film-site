'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { logoFont } from '@/lib/fonts';
import { cn } from '@/lib/utils';

const MIN_VISIBLE_MS = 650;
const MAX_VISIBLE_MS = 1500;
const EXIT_DURATION_MS = 260;

export function LogoSplashIntro() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (document.documentElement.dataset.entrySplash === 'skip') {
      setVisible(false);
      return;
    }

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
          document.documentElement.dataset.entrySplash = 'skip';
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
      aria-label="Đang mở FlexPhim"
      className={`fixed inset-0 z-[10000] overflow-hidden bg-[#06070a] transition-opacity duration-300 ease-out ${
        leaving
          ? 'pointer-events-none opacity-0'
          : 'pointer-events-auto opacity-100'
      }`}
    >
      {/* High-res cinematic poster grid backdrop: visible from the very first frame */}
      <div
        aria-hidden="true"
        className="netphim-splash-artwork absolute inset-0 block h-full w-full overflow-hidden opacity-80 pointer-events-none"
      >
        <picture className="block h-full w-full">
          <source
            media="(min-width: 640px)"
            srcSet="/images/splash/poster-grid-desktop.webp"
            width={2400}
            height={1200}
          />
          <img
            src="/images/splash/poster-grid-mobile.webp"
            alt=""
            width={1080}
            height={2160}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover brightness-[0.85] contrast-[1.08] saturate-[1.12]"
          />
        </picture>
      </div>

      {/* Cinematic vignette & center spotlight */}
      <div aria-hidden="true" className="absolute inset-0 bg-black/35 pointer-events-none" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(124,58,237,0.32),transparent_35%),radial-gradient(circle_at_50%_50%,transparent_20%,rgba(6,7,10,0.5)_60%,#06070a_100%)] pointer-events-none"
      />

      <div className="netphim-splash-brand relative flex h-full flex-col items-center justify-center px-6">
        <div className="flex items-center gap-3 sm:gap-4 drop-shadow-[0_12px_36px_rgba(0,0,0,0.9)]">
          <Image
            src="/flexphim-logo.svg"
            alt=""
            width={82}
            height={82}
            priority
            unoptimized
            className="h-[62px] w-[62px] object-contain drop-shadow-[0_14px_34px_rgba(91,33,182,0.65)] sm:h-[78px] sm:w-[78px]"
          />
          <span
            className={cn(
              logoFont.className,
              "text-[42px] font-bold uppercase tracking-[-0.01em] text-white drop-shadow-[0_10px_32px_rgba(0,0,0,0.95)] select-none sm:text-[56px] leading-none",
            )}
          >
            Flex
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(168,85,247,0.6)]">
              Phim
            </span>
          </span>
        </div>
        <div className="mt-7 h-px w-36 overflow-hidden bg-white/20 sm:w-44 shadow-[0_0_12px_rgba(139,92,246,0.5)]">
          <span className="netphim-splash-progress block h-full rounded-full bg-gradient-to-r from-violet-500 via-white to-violet-400" />
        </div>
      </div>
    </div>
  );
}
