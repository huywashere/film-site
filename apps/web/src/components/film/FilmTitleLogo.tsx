'use client';

import { useState } from 'react';
import { tmdbLogo } from '@/lib/tmdb';

/** Mount keyed by artwork so errors and loading never carry across films. */
export function FilmTitleLogo({ path, title }: { path?: string | null; title: string }) {
  const src = path ? tmdbLogo(path, 'w500') : '';
  const [candidate, setCandidate] = useState(0);
  const showLogo = Boolean(src) && candidate <= 1;

  return (
    <h1 className="flex min-h-8 w-full items-center justify-center pt-1 pb-1 sm:pt-1.5 sm:justify-start">
      {!showLogo ? (
        <span className="line-clamp-2 overflow-visible text-xl font-extrabold leading-[1.2] tracking-tight text-white drop-shadow-xl sm:text-2xl md:text-4xl text-center sm:text-left">
          {title}
        </span>
      ) : (
        <span className="sr-only">{title}</span>
      )}

      {src && candidate <= 1 && (
        // The server preloads this URL. Keep it visible from the first paint so
        // the text fallback never flashes before a valid logo is decoded.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={candidate}
          src={candidate === 0 ? src : `/api/image-proxy?url=${encodeURIComponent(src)}&strict=1`}
          alt={title}
          decoding="sync"
          loading="eager"
          fetchPriority="high"
          referrerPolicy="no-referrer"
          onError={() => {
            setCandidate((value) => value + 1);
          }}
          className="h-auto max-h-14 sm:max-h-18 md:max-h-20 w-auto max-w-[16rem] sm:max-w-[20rem] md:max-w-[24rem] object-contain object-center sm:object-left drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]"
        />
      )}
    </h1>
  );
}
