"use client";

import { useEffect, useState } from "react";

type AdItem = {
  id: string;
  title: string;
  type: "BANNER_TOP" | "BANNER_BOTTOM" | "BANNER_PLAYER" | "VIDEO_PREROLL" | "POPUNDER" | "CUSTOM_HTML";
  imageUrl?: string | null;
  targetUrl?: string | null;
  htmlContent?: string | null;
  isActive: boolean;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export function AdBanner({
  placement,
  className = "",
}: {
  placement: "BANNER_TOP" | "BANNER_BOTTOM" | "BANNER_PLAYER";
  className?: string;
}) {
  const [ad, setAd] = useState<AdItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchAd() {
      try {
        const res = await fetch(`${API_BASE_URL}/ads/active`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && isMounted) {
          const matched = data.find((a: AdItem) => a.type === placement && a.isActive);
          if (matched) {
            setAd(matched);
            // Record view impression
            void fetch(`${API_BASE_URL}/ads/${matched.id}/view`, { method: "POST" }).catch(() => {});
          }
        }
      } catch {
        // ignore
      }
    }
    void fetchAd();
    return () => {
      isMounted = false;
    };
  }, [placement]);

  if (!ad) return null;

  const handleClick = () => {
    if (ad.id) {
      void fetch(`${API_BASE_URL}/ads/${ad.id}/click`, { method: "POST" }).catch(() => {});
    }
  };

  if (ad.htmlContent) {
    return (
      <div
        className={`my-4 flex justify-center overflow-hidden rounded-xl ${className}`}
        dangerouslySetInnerHTML={{ __html: ad.htmlContent }}
      />
    );
  }

  if (!ad.imageUrl) return null;

  return (
    <div className={`my-4 flex flex-col items-center justify-center ${className}`}>
      <span className="mb-1 text-[9px] font-bold uppercase tracking-widest text-white/30">
        Quảng cáo
      </span>
      <a
        href={ad.targetUrl || "#"}
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={handleClick}
        className="group relative block overflow-hidden rounded-xl border border-white/10 shadow-lg transition-transform hover:scale-[1.01]"
      >
        <img
          src={ad.imageUrl}
          alt={ad.title || "Quảng cáo"}
          className="max-h-[120px] w-full object-contain sm:max-h-[160px]"
          loading="lazy"
        />
      </a>
    </div>
  );
}
