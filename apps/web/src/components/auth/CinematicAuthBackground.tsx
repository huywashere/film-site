"use client";

import { useState, useEffect } from "react";
import { getRandomAuthArtwork, LOGIN_COVER_ARTWORKS } from "@/lib/auth-artworks";

export interface CinematicAuthBackgroundProps {
  artworkUrl?: string;
}

export function CinematicAuthBackground({ artworkUrl }: CinematicAuthBackgroundProps) {
  const [activeUrl, setActiveUrl] = useState<string>(() => {
    return artworkUrl || getRandomAuthArtwork().url;
  });

  useEffect(() => {
    if (artworkUrl) {
      setActiveUrl(artworkUrl);
    }
  }, [artworkUrl]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 bg-[#07090e]">
      {/* Fullscreen Random Movie Collage Backdrop - Optimized for instant visual render */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={activeUrl}
        alt="Cinema Universe Collage"
        loading="eager"
        decoding="async"
        // @ts-ignore
        fetchPriority="high"
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
