"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// Long enough to be perceived on a fast production response, but bounded so
// the splash never becomes another loading bottleneck on a slow connection.
const MIN_VISIBLE_MS = 720;
const MAX_VISIBLE_MS = 1_800;
const EXIT_DURATION_MS = 280;

const WALL_TILE_COUNT = 18;

export function LogoSplashIntro() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.netphimIntro = "show";

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
      const remaining = Math.max(
        0,
        MIN_VISIBLE_MS - (performance.now() - startedAt),
      );
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
      className={`fixed inset-0 z-[10000] overflow-hidden bg-[#07080a] transition-[opacity,filter] duration-300 ease-out ${leaving ? "pointer-events-none opacity-0 blur-[2px]" : "pointer-events-auto opacity-100"}`}
    >
      <div className="absolute -inset-[18%] overflow-hidden bg-[#06070a]">
        <div className="netphim-intro-mosaic grid w-full grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
          {Array.from({ length: WALL_TILE_COUNT }, (_, index) => (
            <div
              key={index}
              aria-hidden="true"
              className="netphim-intro-poster relative aspect-[2/3] overflow-hidden rounded-[3px] bg-[#101116] ring-1 ring-white/[.04]"
            />
          ))}
        </div>
      </div>

      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(12,13,17,.22)_0%,rgba(6,7,10,.72)_48%,rgba(4,5,8,.97)_100%)]" />

      <div className="netphim-intro-brand relative flex h-full flex-col items-center justify-center px-6">
        <div className="relative flex items-center gap-3.5 sm:gap-5">
          <Image
            src="/cinephim-logo.png"
            alt=""
            width={88}
            height={88}
            priority
            className="h-[62px] w-[62px] object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,.75)] sm:h-[82px] sm:w-[82px]"
          />
          <span className="text-[36px] font-black tracking-[-.055em] text-white drop-shadow-[0_8px_30px_rgba(0,0,0,.7)] sm:text-[56px]">
            NetPhim
          </span>
        </div>
        <div className="mt-7 h-px w-36 overflow-hidden bg-white/15 sm:w-44">
          <span className="netphim-intro-progress block h-full rounded-full bg-white/70" />
        </div>
      </div>
    </div>
  );
}
