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

  // The initial server/client tree uses the same-origin image only. Enable the
  // CDN layer after hydration on public hosts; wsrv cannot fetch localhost.
  const [useCdnLayer, setUseCdnLayer] = useState(false);

  useEffect(() => {
    if (artworkUrl && artworkUrl !== activeUrl) {
      setActiveUrl(artworkUrl);
    }
  }, [artworkUrl, activeUrl]);

  useEffect(() => {
    // Preload both login artworks in browser cache so switching or refreshing is instant
    LOGIN_COVER_ARTWORKS.forEach((art) => {
      const img = new Image();
      img.src = art.url;
    });

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

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 bg-[#07090e]">
      {/* Instant Local Base Layer - Renders in ~10ms from same-origin cache so the user NEVER sees a black void */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={activeUrl}
        alt=""
        aria-hidden="true"
        loading="eager"
        fetchPriority="high"
        decoding="sync"
        className="absolute inset-0 w-full h-full object-cover object-center scale-[1.02] filter brightness-[0.85] contrast-[1.03] select-none pointer-events-none"
      />

      {/* Responsive Cloud CDN Layer with wsrv.nl - Progressive enhancement on production */}
      {useCdnLayer && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={activeUrl}
          src={desktopUrl || activeUrl}
          srcSet={
            mobileUrl && tabletUrl && desktopUrl
              ? `${mobileUrl} 640w, ${tabletUrl} 1280w, ${desktopUrl} 1920w`
              : undefined
          }
          alt=""
          aria-hidden="true"
          sizes="100vw"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onError={() => setUseCdnLayer(false)}
          className="absolute inset-0 w-full h-full object-cover object-center scale-[1.02] filter brightness-[0.85] contrast-[1.03] select-none pointer-events-none transition-opacity duration-300 animate-in fade-in"
          referrerPolicy="no-referrer"
        />
      )}

      {/* Cinematic Vignette & Ambient Light Dark Scrim */}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/45" />
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.5)_100%)]" />
    </div>
  );
}
