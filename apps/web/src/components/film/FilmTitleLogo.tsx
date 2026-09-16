'use client';

import { useState } from 'react';
import { tmdbLogo } from '@/lib/tmdb';
import { buildArtworkCandidates } from '@/lib/image-cdn';

/** Mount keyed by artwork so errors and loading never carry across films. */
export function FilmTitleLogo({ path, title }: { path?: string | null; title: string }) {
  const src = path ? tmdbLogo(path, 'w500') : '';
  const candidates = src
    ? buildArtworkCandidates([src], 'titleLogo', {
        includeWsrvForTmdb: true,
        strictProxy: true,
      })
    : [];
  const [candidate, setCandidate] = useState(0);
  const showLogo = Boolean(candidates[candidate]);

  return (
    <h1 className="flex min-h-8 w-full items-center justify-center pt-1 pb-1 sm:pt-1.5 sm:justify-start">
      {!showLogo ? (
        <span className="line-clamp-2 overflow-visible text-xl font-extrabold leading-[1.2] tracking-tight text-white drop-shadow-xl sm:text-2xl md:text-4xl text-center sm:text-left">
          {title}
        </span>
      ) : (
        <span className="sr-only">{title}</span>
      )}

      {showLogo && (
        // The server preloads this URL. Keep it visible from the first paint so
        // the text fallback never flashes before a valid logo is decoded.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={candidate}
          src={candidates[candidate]}
          alt=""
          aria-hidden="true"
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
