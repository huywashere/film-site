"use client";

import { useState, useEffect } from "react";
import { getRandomAuthArtwork } from "@/lib/auth-artworks";
import { wsrvPublicImageUrl } from "@/lib/image-cdn";

export interface CinematicAuthBackgroundProps {
  artworkUrl?: string;
}

export function CinematicAuthBackground({ artworkUrl }: CinematicAuthBackgroundProps) {
  const [activeUrl, setActiveUrl] = useState<string>(() => {
    return artworkUrl || getRandomAuthArtwork().url;
  });
  const [useLocalFallback, setUseLocalFallback] = useState(false);

  useEffect(() => {
    if (artworkUrl) {
      setActiveUrl(artworkUrl);
    }
    setUseLocalFallback(false);
  }, [artworkUrl]);

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

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 bg-[#07090e]">
      {/* Fullscreen Random Movie Collage Backdrop - Optimized for instant visual render */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={activeUrl}
        src={useLocalFallback ? activeUrl : desktopUrl || activeUrl}
        srcSet={
          !useLocalFallback && mobileUrl && tabletUrl && desktopUrl
            ? `${mobileUrl} 640w, ${tabletUrl} 1280w, ${desktopUrl} 1920w`
            : undefined
        }
        alt=""
        aria-hidden="true"
        sizes="100vw"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        onError={() => setUseLocalFallback(true)}
        className="w-full h-full object-cover object-center scale-[1.02] filter brightness-[0.85] contrast-[1.03] select-none pointer-events-none animate-in fade-in duration-300"
        referrerPolicy="no-referrer"
      />

      {/* Cinematic Vignette & Ambient Light Dark Scrim */}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/45" />
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.5)_100%)]" />
    </div>
  );
}
