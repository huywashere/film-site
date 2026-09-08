'use client';

import { useState } from 'react';
import { tmdbLogo } from '@/lib/tmdb';

/** Mount keyed by artwork so errors and loading never carry across films. */
export function FilmTitleLogo({ path, title }: { path?: string | null; title: string }) {
  const src = path ? tmdbLogo(path, 'w500') : '';
  const [candidate, setCandidate] = useState(0);
  const showLogo = Boolean(src) && candidate <= 1;

  return (
    <h1 className="flex min-h-10 w-full items-center justify-center pt-2 pb-1 sm:justify-start">
      {!showLogo && (
        <span className="line-clamp-3 overflow-visible text-2xl font-extrabold leading-[1.25] tracking-tight text-white drop-shadow-xl sm:text-3xl md:text-5xl">
          {title}
        </span>
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
          className="h-auto max-h-24 w-auto max-w-full object-contain object-left drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)] sm:max-h-28 sm:max-w-[28rem]"
        />
      )}
    </h1>
  );
}
