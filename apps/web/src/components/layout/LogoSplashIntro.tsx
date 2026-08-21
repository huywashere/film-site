"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const MIN_VISIBLE_MS = 1_050;
const MAX_VISIBLE_MS = 3_600;
const EXIT_DURATION_MS = 560;

const WALL_TILE_COUNT = 18;

export function LogoSplashIntro() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.netphimIntro !== "show") {
      setVisible(false);
      return;
    }

    const startedAt = performance.now();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let closeScheduled = false;
    let closeTimer: number | undefined;
    let removeTimer: number | undefined;
    let observer: MutationObserver | undefined;
    let watchedImage: HTMLImageElement | null = null;

    const close = () => {
      if (closeScheduled) return;
      closeScheduled = true;
      const remaining = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt));
      closeTimer = window.setTimeout(() => {
        setLeaving(true);
        removeTimer = window.setTimeout(() => {
          root.dataset.netphimIntro = "done";
          document.body.style.overflow = previousOverflow;
          setVisible(false);
        }, EXIT_DURATION_MS);
      }, remaining);
    };

    const checkHomepageReady = () => {
      const hero = document.querySelector<HTMLElement>(
        'section[data-hero-banner="true"]',
      );
      if (!hero || hero.getAttribute("aria-busy") === "true") return false;

      const image = hero.querySelector<HTMLImageElement>("img");
      if (!image) return false;
      if (image.complete && image.naturalWidth > 0) {
        close();
        return true;
      }
      if (watchedImage !== image) {
        watchedImage?.removeEventListener("load", close);
        watchedImage = image;
        watchedImage.addEventListener("load", close, { once: true });
      }
      return false;
    };

    if (window.location.pathname === "/") {
      if (!checkHomepageReady()) {
        observer = new MutationObserver(checkHomepageReady);
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["aria-busy", "src"],
        });
      }
    } else {
      close();
    }

    const maximumTimer = window.setTimeout(close, MAX_VISIBLE_MS);
    return () => {
      observer?.disconnect();
      watchedImage?.removeEventListener("load", close);
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
      className={`fixed inset-0 z-[10000] overflow-hidden bg-[#07070b] transition-[opacity,filter] duration-500 ease-out ${leaving ? "pointer-events-none opacity-0 blur-sm" : "pointer-events-auto opacity-100"}`}
    >
      <div className="absolute -inset-[24%] overflow-hidden bg-[#06070a]">
        <div className="netphim-intro-mosaic grid w-full grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
          {Array.from({ length: WALL_TILE_COUNT }, (_, index) => (
            <div
              key={index}
              aria-hidden="true"
              className="netphim-intro-poster relative aspect-[2/3] overflow-hidden rounded-[3px] bg-[#101116] ring-1 ring-white/[.04]"
            />
          ))}
        </div>
      </div>

      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,9,12,.34)_0%,rgba(6,7,10,.7)_48%,rgba(4,5,8,.96)_100%)]" />
      <div className="netphim-intro-scan absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/[.035] to-transparent" />

      <div className="netphim-intro-brand relative flex h-full flex-col items-center justify-center px-6">
        <div className="relative flex items-center gap-4 sm:gap-5">
          <Image
            src="/cinephim-logo.png"
            alt=""
            width={88}
            height={88}
            priority
            className="h-[66px] w-[66px] object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,.75)] sm:h-[84px] sm:w-[84px]"
          />
          <span className="text-[38px] font-black tracking-[-.065em] text-white drop-shadow-[0_8px_30px_rgba(0,0,0,.7)] sm:text-[58px]">
            NetPhim
          </span>
        </div>
        <div className="mt-7 h-[2px] w-36 overflow-hidden rounded-full bg-white/10 sm:w-44">
          <span className="netphim-intro-progress block h-full rounded-full bg-white/70" />
        </div>
      </div>
    </div>
  );
}
