'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { tmdbLogo } from '@/lib/tmdb';

/** Mount keyed by artwork so errors and loading never carry across films. */
export function FilmTitleLogo({ path, title }: { path?: string | null; title: string }) {
  const src = path ? tmdbLogo(path, 'w500') : '';
  const [candidate, setCandidate] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete) {
      if (image.naturalWidth > 0) setLoaded(true);
      else setCandidate((value) => value + 1);
    }
  }, [candidate, src]);
  const showLogo = Boolean(src) && candidate <= 1 && loaded;

  return (
    <h1 className="flex min-h-10 w-full items-center justify-center pt-2 pb-1 sm:justify-start">
      {!showLogo && (
        <span className="line-clamp-3 overflow-visible text-2xl font-extrabold leading-[1.25] tracking-tight text-white drop-shadow-xl sm:text-3xl md:text-5xl">
          {title}
        </span>
      )}

      {src && candidate <= 1 && (
        <motion.img
          ref={imageRef}
          key={candidate}
          src={candidate === 0 ? src : `/api/image-proxy?url=${encodeURIComponent(src)}&strict=1`}
          alt={title}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            setCandidate((value) => value + 1);
          }}
          initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: loaded ? 1 : 0, y: loaded ? 0 : 8, scale: loaded ? 1 : 0.98 }}
          transition={{ duration: reduceMotion ? 0 : 0.5, ease: 'easeOut' }}
          className={showLogo
            ? 'h-auto max-h-24 w-auto max-w-full object-contain object-left drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)] sm:max-h-28 sm:max-w-[28rem]'
            : 'absolute h-px w-px opacity-0'
          }
        />
      )}
    </h1>
  );
}
