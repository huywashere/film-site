"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { PublicSiteConfiguration, siteConfigApi } from "@/lib/api";

const DISMISSED_VERSION_KEY = "netphim:home-announcement:dismissed-version";

function getSafeLink(value?: string) {
  const href = value?.trim();
  if (!href) return "";
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const parsed = new URL(href);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? href
      : "";
  } catch {
    return "";
  }
}

export function HomeAnnouncementPopup() {
  const [config, setConfig] = useState<PublicSiteConfiguration | null>(null);
  const [open, setOpen] = useState(false);
  const [catGif] = useState(
    () => `/images/cat${Math.floor(Math.random() * 4) + 1}-optimized.webp`,
  );
  const dismissButtonRef = useRef<HTMLButtonElement>(null);

  const dismiss = useCallback(() => {
    if (config) {
      try {
        localStorage.setItem(
          DISMISSED_VERSION_KEY,
          String(config.homePopupVersion),
        );
      } catch {
        // Closing must never depend on storage availability.
      }
    }
    setOpen(false);
  }, [config]);

  useEffect(() => {
    let active = true;
    siteConfigApi
      .getPublic()
      .then(({ data }) => {
        if (!active || !data.homePopupEnabled || !data.homePopupBody?.trim())
          return;
        let dismissedVersion = 0;
        try {
          dismissedVersion = Number(
            localStorage.getItem(DISMISSED_VERSION_KEY) || 0,
          );
        } catch {
          // Storage can be unavailable in privacy mode; the announcement still works.
        }
        if (dismissedVersion === data.homePopupVersion) return;
        setConfig(data);
        setOpen(true);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(
      () => dismissButtonRef.current?.focus(),
      80,
    );
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [dismiss, open]);

  const paragraphs = useMemo(
    () =>
      (config?.homePopupBody || "")
        .split(/\n{2,}/)
        .map((item) => item.trim())
        .filter(Boolean),
    [config?.homePopupBody],
  );
  const safeLink = getSafeLink(config?.homePopupLink);

  if (!open || !config) return null;

  const linkContent = (
    <>
      {config.homePopupLinkLabel?.trim() || "Xem chi tiết"}
      <ArrowUpRight aria-hidden="true" size={16} />
    </>
  );

  return (
    <div
      className="fixed inset-0 z-[180] grid place-items-center overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-[6px] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 sm:px-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-announcement-title"
        aria-describedby="home-announcement-body"
        className="relative w-full max-w-[620px] overflow-hidden rounded-[28px] border border-white/[.12] bg-[#111116] text-white shadow-[0_32px_110px_rgba(0,0,0,.72)] motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-3 motion-safe:duration-300"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-violet-600/[.11] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/70 to-transparent" />
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/25 text-zinc-400 backdrop-blur transition hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:right-5 sm:top-5"
          aria-label="Đóng thông báo"
        >
          <X size={18} />
        </button>

        <div className="relative px-5 pb-5 pt-5 sm:px-7 sm:pb-7 sm:pt-7">
          <div className="flex items-start gap-4 pr-10 sm:gap-5 sm:pr-12">
            <div className="relative h-[82px] w-[96px] shrink-0 rotate-[-2deg] overflow-hidden rounded-[20px] border border-violet-300/25 bg-[#09090d] p-1 shadow-[0_14px_35px_rgba(0,0,0,.38)] sm:h-[104px] sm:w-[126px]">
              <Image
                src={catGif}
                alt="Mèo đưa tin NetPhim"
                fill
                unoptimized
                sizes="126px"
                className="rounded-[16px] object-cover"
              />
              <span className="absolute bottom-2 left-2 rounded-full border border-white/10 bg-black/70 px-2 py-1 text-[8px] font-black uppercase tracking-[.14em] text-amber-200 backdrop-blur-sm">
                Tin mới
              </span>
            </div>
            <div className="min-w-0 pt-1 sm:pt-2">
              <p className="text-[9px] font-black uppercase tracking-[.22em] text-violet-300 sm:text-[10px]">
                NetPhim nhắn bạn
              </p>
              <h2
                id="home-announcement-title"
                className="mt-2 text-[20px] font-black leading-[1.25] tracking-[-.035em] text-zinc-50 sm:mt-3 sm:text-[27px]"
              >
                {config.homePopupTitle?.trim() || "Có một thông báo mới"}
              </h2>
            </div>
          </div>
          <div
            id="home-announcement-body"
            className="mt-6 space-y-4 text-[14px] font-medium leading-7 text-zinc-300 sm:mt-7 sm:text-[15px]"
          >
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
          <footer className="mt-7 flex flex-wrap items-center justify-end gap-4 border-t border-white/[.08] pt-5 sm:justify-between">
            {safeLink ? (
              safeLink.startsWith("/") ? (
                <Link
                  href={safeLink}
                  onClick={dismiss}
                  className="mr-auto inline-flex items-center gap-1.5 rounded-md text-sm font-extrabold text-amber-300 underline-offset-4 transition hover:text-amber-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  {linkContent}
                </Link>
              ) : (
                <a
                  href={safeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={dismiss}
                  className="mr-auto inline-flex items-center gap-1.5 rounded-md text-sm font-extrabold text-amber-300 underline-offset-4 transition hover:text-amber-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  {linkContent}
                </a>
              )
            ) : (
              <p className="mr-auto hidden text-[10px] font-bold uppercase tracking-[.18em] text-zinc-600 sm:block">
                Chúc bạn xem phim vui vẻ
              </p>
            )}
            <button
              ref={dismissButtonRef}
              type="button"
              onClick={dismiss}
              className="min-w-28 rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 px-6 py-3 text-[11px] font-black uppercase tracking-[.08em] text-zinc-950 shadow-[0_10px_30px_rgba(250,204,21,.13)] transition hover:brightness-105 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111116]"
            >
              {config.homePopupDismissLabel?.trim() || "Đã hiểu"}
            </button>
          </footer>
        </div>
      </section>
    </div>
  );
}
