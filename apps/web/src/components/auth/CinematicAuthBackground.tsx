"use client";

import { useState, useEffect } from "react";
import { LOGIN_COVER_ARTWORKS } from "@/lib/auth-artworks";
import { wsrvPublicImageUrl } from "@/lib/image-cdn";

export interface CinematicAuthBackgroundProps {
  artworkUrl?: string;
}

export function CinematicAuthBackground({ artworkUrl }: CinematicAuthBackgroundProps) {
  const [activeUrl, setActiveUrl] = useState<string>(() => {
    return artworkUrl || LOGIN_COVER_ARTWORKS[0].url;
  });

  const [useCdnLayer, setUseCdnLayer] = useState(false);

  useEffect(() => {
    if (artworkUrl && artworkUrl !== activeUrl) {
      setActiveUrl(artworkUrl);
    }
  }, [artworkUrl, activeUrl]);

  useEffect(() => {
    const host = window.location.hostname;
    setUseCdnLayer(host !== "localhost" && host !== "127.0.0.1");
  }, []);

  const mobileUrl = wsrvPublicImageUrl(activeUrl, "backdrop", {
    width: 640,
    height: null,
    quality: 75,
  });
  const tabletUrl = wsrvPublicImageUrl(activeUrl, "backdrop", {
    width: 1280,
    height: null,
    quality: 75,
  });
  const desktopUrl = wsrvPublicImageUrl(activeUrl, "backdrop", {
    width: 1920,
    height: null,
    quality: 75,
  });

  const effectiveSrc = useCdnLayer && desktopUrl ? desktopUrl : activeUrl;
  const effectiveSrcSet =
    useCdnLayer && mobileUrl && tabletUrl && desktopUrl
      ? `${mobileUrl} 640w, ${tabletUrl} 1280w, ${desktopUrl} 1920w`
      : undefined;

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 bg-[#07090e]">
      {/* High-Performance Asynchronous Single Backdrop Layer */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={effectiveSrc}
        srcSet={effectiveSrcSet}
        sizes="100vw"
        alt=""
        aria-hidden="true"
        loading="eager"
        fetchPriority="high"
        decoding="async"
        onError={() => setUseCdnLayer(false)}
        className="absolute inset-0 w-full h-full object-cover object-center scale-[1.02] filter brightness-[0.82] contrast-[1.03] select-none pointer-events-none transition-opacity duration-300"
      />

      {/* Cinematic Vignette & Ambient Light Dark Scrim */}
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/50" />
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
