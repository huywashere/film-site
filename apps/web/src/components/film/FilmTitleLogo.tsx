'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { tmdbLogo } from '@/lib/tmdb';

/** Mount keyed by artwork so errors and loading never carry across films. */
export function FilmTitleLogo({ path, title }: { path: string; title: string }) {
  const src = tmdbLogo(path, 'w500');
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
  if (!src || candidate > 1) return null;

  return (
    <div className={loaded ? 'flex w-full justify-center pt-5 pb-2 sm:justify-start' : 'h-0 overflow-hidden'}>
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
        initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: loaded ? 1 : 0, y: loaded ? 0 : 12, scale: loaded ? 1 : 0.97 }}
        transition={{ duration: reduceMotion ? 0 : 0.65, ease: 'easeOut' }}
        className="h-auto max-h-28 w-auto max-w-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)] sm:max-h-36 sm:max-w-[28rem]"
      />
    </div>
  );
}
