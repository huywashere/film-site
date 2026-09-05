'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import NextImage from 'next/image';
import dynamic from 'next/dynamic';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Bookmark,
  Share2,
  Clock,
  Calendar,
  Globe,
  Users,
  Loader2,
  Plus,
  Check,
  Star,
  CheckCircle,
  Info,
  ThumbsUp,
  Bell,
  Subtitles,
  Mic,
  Monitor,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
  ArrowLeft,
  Clapperboard,
  Trophy,
  DollarSign,
  ExternalLink,
  Sparkles,
  X,
} from 'lucide-react';
import { movieApi, watchlistApi, ratingsApi, reviewsApi } from '@/lib/api';
import { FilmNotFound } from '@/components/film/FilmNotFound';
import { StarRating } from '@/components/film/StarRating';
import { resolveImageUrl } from '@/components/film/FilmCard';
import { alternateMovieArtworkUrl } from '@/lib/movie-image-url';
import { useAuthStore } from '@/store/authStore';
import { useAuthModalStore } from '@/store/authModalStore';
import { useToast } from '@/providers/ToastProvider';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/store/langStore';
import { Button } from '@/components/ui/button';
import { useTmdb, useTmdbPerson } from '@/hooks/useTmdb';
import { tmdbBackdrop, tmdbProfile, tmdbPoster } from '@/lib/tmdb';
import { buildArtworkCandidates, wsrvImageUrl, type ImagePreset } from '@/lib/image-cdn';
import { safeJsonLd } from '@/lib/safe-json-ld';
import { cardFont } from '@/lib/fonts';
import { guestDataStorage } from '@/lib/user-data';
import { useOmdb } from '@/hooks/useOmdb';
import type { ServerTmdbResult } from '@/lib/server/movie-tmdb-server';

const TrailerModal = dynamic(
  () => import('@/components/film/TrailerModal').then((module) => module.TrailerModal),
  { ssr: false },
);

function formatRating(value: number) {
  return Number.isFinite(value) && value > 0 ? value.toFixed(1) : null;
}

function formatVoteCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace('.0', '')} triệu`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1).replace('.0', '')} nghìn`;
  }
  return String(Math.round(value));
}

function ResilientDetailImage({
  candidates,
  alt,
  className,
  priority = false,
  preset = 'backdrop',
}: {
  candidates: Array<string | null | undefined>;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  preset?: ImagePreset;
}) {
  const sources = useMemo(
    () =>
      buildArtworkCandidates(candidates, preset, {
        includeWsrvForTmdb: true,
        includeAlternatePhimimgPath: true,
      }),
    [candidates, preset],
  );
  const sourceKey = sources.join('|');
  const [sourceIndex, setSourceIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setSourceIndex(0);
    setLoaded(false);
  }, [sourceKey]);

  const source = sources[sourceIndex];

  useEffect(() => {
    setLoaded(false);
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [source]);

  if (!source) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      key={source}
      src={source}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      referrerPolicy="no-referrer"
      className={cn(
        'w-full h-full object-cover transition-opacity duration-500',
        loaded ? 'opacity-100' : 'opacity-0',
        className,
      )}
      onLoad={() => setLoaded(true)}
      onError={() => {
        setLoaded(false);
        if (sourceIndex < sources.length - 1) {
          setSourceIndex((index) => index + 1);
        }
      }}
    />
  );
}

// ── Clean, High-Speed Detail Poster Card (Multi-Tier Resilient Pipeline) ──
function DetailPosterCard({
  src,
  fallbackSrc,
  posterUrl,
  thumbUrl,
  filmName,
  className = 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500',
  onOpenLightbox,
}: {
  src?: string | null;
  fallbackSrc?: string | null;
  posterUrl?: string | null;
  thumbUrl?: string | null;
  filmName: string;
  className?: string;
  onOpenLightbox?: () => void;
}) {
  const candidates = useMemo(() => {
    const list: string[] = [];
    const add = (url?: string | null) => {
      if (!url) return;
      const clean = url.trim();
      if (clean && !list.includes(clean)) list.push(clean);
    };

    // 1. TMDB Poster: edge proxy first to bypass VN ISP blocking, then local proxy, then direct
    if (src && /image\.tmdb\.org/i.test(src)) {
      const wsrv = wsrvImageUrl(src, 'poster');
      if (wsrv) add(wsrv);
      add(`/api/image-proxy?url=${encodeURIComponent(src)}`);
      add(src);
    } else if (src) {
      add(src);
    }

    // 2. Direct provider poster
    const provPoster = fallbackSrc || (posterUrl ? resolveImageUrl(posterUrl) : null);
    if (provPoster) {
      add(provPoster);
      const alt = alternateMovieArtworkUrl(provPoster);
      if (alt) add(alt);
    }

    // 3. Provider thumbnail (often valid when poster is missing or 404)
    const provThumb = thumbUrl ? resolveImageUrl(thumbUrl) : null;
    if (provThumb) {
      add(provThumb);
      const altThumb = alternateMovieArtworkUrl(provThumb);
      if (altThumb) add(altThumb);
    }

    // 4. Local image proxy for provider artwork (Next.js server always reaches phimimg)
    if (provPoster) {
      add(`/api/image-proxy?url=${encodeURIComponent(provPoster)}`);
    }
    if (provThumb) {
      add(`/api/image-proxy?url=${encodeURIComponent(provThumb)}`);
    }

    return list;
  }, [src, fallbackSrc, posterUrl, thumbUrl]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [hasFailedAll, setHasFailedAll] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const candidatesKey = candidates.join('|');
  useEffect(() => {
    setCurrentIndex(0);
    setLoaded(false);
    setHasFailedAll(false);
  }, [candidatesKey]);

  const currentSrc = candidates[currentIndex];

  useEffect(() => {
    setLoaded(false);
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [currentSrc]);

  if (!currentSrc || hasFailedAll) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#12151b] border border-white/10 rounded-2xl select-none">
        <Clapperboard className="w-10 h-10 text-amber-400/80 mb-2 drop-shadow" />
        <span className="text-xs font-bold text-neutral-300 leading-tight line-clamp-3 px-2">
          {filmName}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onOpenLightbox}
      className="relative w-full h-full overflow-hidden cursor-pointer select-none group bg-[#12151b]"
      title="Bấm để xem ảnh phóng to"
    >
      {/* Skeleton / Shimmer background while loading */}
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,#101218_25%,#181b23_45%,#101218_65%)] bg-[length:220%_100%] motion-reduce:animate-none"
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        key={currentSrc}
        src={currentSrc}
        alt={filmName}
        referrerPolicy="no-referrer"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(false);
          if (currentIndex < candidates.length - 1) {
            setCurrentIndex((prev) => prev + 1);
          } else {
            setHasFailedAll(true);
          }
        }}
        className={cn(
          className,
          loaded ? 'opacity-100' : 'opacity-0',
          'transition-opacity duration-300',
        )}
      />

      {/* Subtle hover overlay */}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
}

// ── Fullscreen Interactive Lightbox Modal ──
function FilmImageLightboxModal({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  filmName,
}: {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  filmName: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
    }
  }, [isOpen, initialIndex, images.length]);

  const total = images.length;
  const currentImage = images[currentIndex];

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Keyboard navigation (Escape, Left, Right)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  if (!isOpen || !images.length) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/92 backdrop-blur-2xl p-4 sm:p-6 select-none"
      >
        {/* Top Header */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 inset-x-4 sm:inset-x-8 flex items-center justify-between z-20 text-white"
        >
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-sm sm:text-base text-neutral-200 truncate max-w-xs sm:max-w-md">
              {filmName}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-xs font-mono font-bold text-amber-300">
              {currentIndex + 1} / {total}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/15 transition-all cursor-pointer active:scale-90"
            title="Đóng (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Center Image with Smooth Animation */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-5xl max-h-[75vh] w-full flex items-center justify-center my-auto"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentImage}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="relative max-h-[75vh] max-w-full flex items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentImage}
                alt={`${filmName} - Ảnh ${currentIndex + 1}`}
                referrerPolicy="strict-origin-when-cross-origin"
                decoding="async"
                className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] border border-white/10"
              />
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 sm:-left-6 p-3 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 backdrop-blur-md transition-all active:scale-90 cursor-pointer shadow-2xl"
                title="Ảnh trước (Mũi tên trái)"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 sm:-right-6 p-3 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 backdrop-blur-md transition-all active:scale-90 cursor-pointer shadow-2xl"
                title="Ảnh tiếp theo (Mũi tên phải)"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>

        {/* Bottom Thumbnail Strip */}
        {total > 1 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 inset-x-4 flex items-center justify-center gap-2 overflow-x-auto py-2 px-4 max-w-3xl mx-auto scrollbar-none"
          >
            {images.map((thumb, idx) => (
              <button
                key={`${thumb}-${idx}`}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  'relative w-14 sm:w-16 h-10 sm:h-12 rounded-lg overflow-hidden shrink-0 border transition-all cursor-pointer',
                  idx === currentIndex
                    ? 'border-amber-400 scale-110 shadow-lg ring-2 ring-amber-400/30'
                    : 'border-white/20 opacity-50 hover:opacity-100',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumb}
                  alt={`Thumbnail ${idx + 1}`}
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ── Cast Card with Resilient Edge Photo & Initial Fallback ──────
function CastCard({
  name,
  role = 'Diễn viên',
  profilePath,
  personId,
}: {
  name: string;
  role?: string;
  profilePath?: string | null;
  personId?: number;
}) {
  const cleanName = (name || '')
    .replace(/\(.*?\)/g, '')
    .replace(/[:\-–—].*/g, '')
    .trim();

  const directTmdbUrl = profilePath ? tmdbProfile(profilePath, 'w185') : null;

  const { data, isLoading } = useQuery({
    queryKey: ['cast-image-v2', cleanName],
    queryFn: async () => {
      if (directTmdbUrl) return directTmdbUrl;
      const res = await fetch(`/api/cast-image?name=${encodeURIComponent(cleanName)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.url;
    },
    enabled: !directTmdbUrl && !!cleanName,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const rawPhotoUrl = directTmdbUrl || (data && data !== 'placeholder' ? data : null);

  const photoCandidates = useMemo(() => {
    if (!rawPhotoUrl) return [];
    return buildArtworkCandidates([rawPhotoUrl], 'avatar');
  }, [rawPhotoUrl]);

  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    setPhotoIndex(0);
    setPhotoFailed(false);
  }, [photoCandidates]);

  const activePhotoSrc = photoCandidates[photoIndex];
  const initial = cleanName ? cleanName.charAt(0).toUpperCase() : '?';

  // If loading, show skeleton pulse
  if (isLoading && !directTmdbUrl) {
    return (
      <div className="flex flex-col items-center space-y-1.5 p-1.5 w-24 md:w-28 flex-shrink-0 animate-pulse">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10" />
        <div className="w-16 h-3 bg-white/10 rounded" />
      </div>
    );
  }

  // Skip card only if name is completely empty
  if (!cleanName) {
    return null;
  }

  const cardContent = (
    <div
      className="flex flex-col items-center text-center space-y-1.5 p-1.5 w-24 md:w-28 flex-shrink-0 group cursor-pointer"
      title={`${cleanName}${role ? ` (${role})` : ''}`}
    >
      <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-neutral-900 transition-[border-color,transform] duration-200 group-hover:scale-[1.03] group-hover:border-white/30 md:h-20 md:w-20 shadow-md">
        {activePhotoSrc && !photoFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${cleanName}-${activePhotoSrc}`}
            src={activePhotoSrc}
            alt={cleanName}
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => {
              if (photoIndex < photoCandidates.length - 1) {
                setPhotoIndex((i) => i + 1);
              } else {
                setPhotoFailed(true);
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950 text-neutral-300 font-extrabold text-base md:text-lg select-none border border-white/5">
            {initial}
          </div>
        )}
      </div>
      <div className="w-full truncate px-1">
        <p className="truncate text-[11px] font-bold text-white group-hover:text-amber-300 transition-colors">
          {cleanName}
        </p>
        <p className="text-[9px] text-neutral-500 truncate mt-0.5">{role}</p>
      </div>
    </div>
  );

  if (personId) {
    return <Link href={`/actors/${personId}`}>{cardContent}</Link>;
  }

  return cardContent;
}

// ── Smooth Drag & Button Cast Scroller Component ─────────────
function CastScroller({ children }: { children: React.ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isMouseDown = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  const checkScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // Initial check after paint
    const timer = setTimeout(() => {
      checkScroll();
    }, 200);
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [checkScroll]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollerRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollerRef.current;
    if (!el) return;
    isMouseDown.current = true;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeftStart.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX.current) * 1.3;
    el.scrollLeft = scrollLeftStart.current - walk;
  };

  const handleMouseUp = () => {
    isMouseDown.current = false;
  };

  return (
    <div className="relative group/scroller">
      {/* Left Scroll Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll('left')}
          className="hidden md:flex absolute -left-3 top-1/2 -translate-y-5 z-30 w-9 h-9 rounded-full bg-black/85 hover:bg-black border border-white/20 text-white items-center justify-center backdrop-blur-md shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
          aria-label="Cuộn sang trái"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {/* Right Scroll Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll('right')}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-5 z-30 w-9 h-9 rounded-full bg-black/85 hover:bg-black border border-white/20 text-white items-center justify-center backdrop-blur-md shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
          aria-label="Cuộn sang phải"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Cast Scroll Track */}
      <div
        ref={scrollerRef}
        onScroll={checkScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="flex gap-3 overflow-x-auto pb-3 pt-1 px-1 touch-pan-x select-none cursor-grab active:cursor-grabbing scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40"
      >
        {children}
      </div>
    </div>
  );
}

// ── Server type detection (same logic as watch page) ──
type EpServerType = 'vietsub' | 'thuyet-minh' | 'raw';
function detectEpServerType(serverName: string, lang?: string): EpServerType {
  const name = (serverName || '').toLowerCase();
  const langStr = (lang || '').toLowerCase();
  if (
    name.includes('thuyet minh') ||
    name.includes('thuyết minh') ||
    name.includes('tm') ||
    langStr.includes('thuyet minh') ||
    langStr.includes('thuyết minh') ||
    langStr.includes('lồng tiếng')
  )
    return 'thuyet-minh';
  return 'vietsub';
}

const EP_TYPE_CONFIG: Record<
  EpServerType,
  { label: string; icon: any; activeCls: string; inactiveCls: string }
> = {
  vietsub: {
    label: 'Vietsub',
    icon: Subtitles,
    activeCls: 'bg-white/12 border-white/30 text-white',
    inactiveCls: 'bg-white/5 border-white/10 text-white/50 hover:text-white',
  },
  'thuyet-minh': {
    label: 'Thuyết Minh',
    icon: Mic,
    activeCls: 'bg-white/12 border-white/30 text-white',
    inactiveCls: 'bg-white/5 border-white/10 text-white/50 hover:text-white',
  },
  raw: {
    label: 'Bản Gốc',
    icon: Monitor,
    activeCls: 'bg-white/12 border-white/30 text-white',
    inactiveCls: 'bg-white/5 border-white/10 text-white/50 hover:text-white',
  },
};

// ── Episode List (Redesigned with server type tabs) ───────────────────────────
function EpisodeList({
  episodes,
  slug,
  filmLang,
}: {
  episodes: any[];
  slug: string;
  filmLang?: string;
}) {
  const [activeType, setActiveType] = useState<EpServerType>('vietsub');
  const [serverIdx, setServerIdx] = useState(0);

  if (!episodes?.length) return null;

  // Group by server type
  const byType: Record<EpServerType, any[]> = {
    vietsub: [],
    'thuyet-minh': [],
    raw: [],
  };
  episodes.forEach((ep) => {
    const t = detectEpServerType(ep.server_name || '', filmLang || '');
    byType[t].push(ep);
  });
  const availableTypes = (['vietsub', 'thuyet-minh', 'raw'] as EpServerType[]).filter(
    (t) => byType[t].length > 0,
  );

  const currentTypeServers = byType[activeType] || [];
  const activeServer = currentTypeServers[serverIdx] || episodes[0];
  const items = activeServer?.server_data || [];

  const firstEpLink = (ep: any) => `/watch/${slug}?ep=${ep.slug || ep.name}`;

  return (
    <div className="flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
          Danh sách tập ({items.length})
        </h3>
      </div>

      {/* Server Type Tabs */}
      {availableTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTypes.map((type) => {
            const cfg = EP_TYPE_CONFIG[type];
            const CfgIcon = cfg.icon;
            const isActive = activeType === type;
            return (
              <button
                key={type}
                onClick={() => {
                  setActiveType(type);
                  setServerIdx(0);
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all',
                  isActive ? cfg.activeCls : cfg.inactiveCls,
                )}
              >
                <CfgIcon size={13} />
                {cfg.label}
                {byType[type].length > 1 && (
                  <span className="text-[10px] font-black bg-white/10 px-1.5 py-0.5 rounded-full">
                    {byType[type].length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Server selection within type */}
      {currentTypeServers.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {currentTypeServers.map((s: any, i: number) => (
            <button
              key={i}
              onClick={() => setServerIdx(i)}
              className={cn(
                'px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all',
                i === serverIdx
                  ? 'bg-white/15 border-white/30 text-white'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white',
              )}
            >
              Server {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Episode grid */}
      <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-10 gap-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-hide">
        {items.map((ep: any, i: number) => (
          <Link
            key={ep.slug || i}
            href={firstEpLink(ep)}
            className={cn(
              'flex items-center justify-center aspect-square rounded-lg',
              'text-xs font-bold transition-all',
              'bg-white/5 text-white/60 border border-white/[0.06]',
              'hover:border-white/30 hover:bg-white/10 hover:text-white',
            )}
          >
            {ep.name.replace(/^tập\s*/i, '')}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Review Item (Plex Card Style) ────────────────────────────
function ReviewItem({ review }: { review: any }) {
  const { t } = useTranslation();

  // Deterministic seed based on review id to make reaction counts look realistic
  const seed = review.id
    ? review.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
    : 12;
  const initLikes = (seed % 12) + 2;
  const initLoves = (seed % 6) + 1;
  const initAgrees = seed % 8;

  const [reactions, setReactions] = useState<{
    like: number;
    love: number;
    agree: number;
    userReacted: 'like' | 'love' | 'agree' | null;
  }>(() => {
    if (typeof window === 'undefined') {
      return {
        like: initLikes,
        love: initLoves,
        agree: initAgrees,
        userReacted: null,
      };
    }
    try {
      const saved = localStorage.getItem(`review-react-${review.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          like: initLikes + (parsed.userReacted === 'like' ? 1 : 0),
          love: initLoves + (parsed.userReacted === 'love' ? 1 : 0),
          agree: initAgrees + (parsed.userReacted === 'agree' ? 1 : 0),
          userReacted: parsed.userReacted,
        };
      }
    } catch (_e) {
      /* ignore localStorage errors */
    }
    return {
      like: initLikes,
      love: initLoves,
      agree: initAgrees,
      userReacted: null,
    };
  });

  const handleReact = (type: 'like' | 'love' | 'agree') => {
    setReactions((prev) => {
      let newUserReacted: 'like' | 'love' | 'agree' | null = type;
      let diffLike = 0;
      let diffLove = 0;
      let diffAgree = 0;

      if (prev.userReacted === type) {
        // Toggle off
        newUserReacted = null;
        if (type === 'like') diffLike = -1;
        if (type === 'love') diffLove = -1;
        if (type === 'agree') diffAgree = -1;
      } else {
        // Switch reaction or add new
        if (prev.userReacted === 'like') diffLike = -1;
        if (prev.userReacted === 'love') diffLove = -1;
        if (prev.userReacted === 'agree') diffAgree = -1;

        if (type === 'like') diffLike = 1;
        if (type === 'love') diffLove = 1;
        if (type === 'agree') diffAgree = 1;
      }

      const updated = {
        like: prev.like + diffLike,
        love: prev.love + diffLove,
        agree: prev.agree + diffAgree,
        userReacted: newUserReacted,
      };

      try {
        localStorage.setItem(
          `review-react-${review.id}`,
          JSON.stringify({ userReacted: newUserReacted }),
        );
      } catch (_e) {
        /* ignore localStorage errors */
      }

      return updated;
    });
  };

  return (
    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col space-y-3 hover:border-white/10 transition-colors shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <NextImage
            src={
              review.user?.avatarUrl ||
              `https://ui-avatars.com/api/?name=${review.user?.username || 'U'}&background=182027&color=ffffff&size=32`
            }
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-full border border-white/10 object-cover"
            unoptimized
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {review.user?.displayName || review.user?.username}
            </p>
            <p className="text-[9px] text-neutral-500">
              {new Date(review.createdAt).toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>
        {review.rating && (
          <div className="flex items-center gap-0.5 text-neutral-300 text-xs">
            <Star size={10} fill="currentColor" />
            <span className="font-bold text-white">{review.rating}</span>
          </div>
        )}
      </div>
      <p className="text-xs text-neutral-400 leading-relaxed font-medium pl-11">{review.content}</p>

      {/* Quick Reactions Bar */}
      <div className="flex items-center gap-2 pl-11 pt-2 border-t border-white/[0.02]">
        <button
          onClick={() => handleReact('like')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border',
            reactions.userReacted === 'like'
              ? 'bg-white text-black border-white scale-105'
              : 'bg-white/[0.02] border-white/5 text-neutral-400 hover:text-white hover:bg-white/[0.05]',
          )}
        >
          <span>👍</span>
          <span>{t('film.like', 'Thích')}</span>
          <span className="opacity-60">{reactions.like}</span>
        </button>
        <button
          onClick={() => handleReact('love')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border',
            reactions.userReacted === 'love'
              ? 'scale-105 border-white/30 bg-white/10 text-white'
              : 'bg-white/[0.02] border-white/5 text-neutral-400 hover:text-white hover:bg-white/[0.05]',
          )}
        >
          <span>❤️</span>
          <span>{t('film.love', 'Yêu thích')}</span>
          <span className="opacity-60">{reactions.love}</span>
        </button>
        <button
          onClick={() => handleReact('agree')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border',
            reactions.userReacted === 'agree'
              ? 'scale-105 border-white/30 bg-white/10 text-white'
              : 'bg-white/[0.02] border-white/5 text-neutral-400 hover:text-white hover:bg-white/[0.05]',
          )}
        >
          <span>💡</span>
          <span>{t('film.agree', 'Đồng ý')}</span>
          <span className="opacity-60">{reactions.agree}</span>
        </button>
      </div>
    </div>
  );
}

// ── Write Review ─────────────────────────────────────────────
function WriteReview({ movieId }: { movieId: string }) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <div className="p-6 bg-[#151920]/50 border border-white/5 rounded-2xl shadow-xl h-full flex flex-col items-center justify-center space-y-4 text-center min-h-[160px]">
        <span className="text-neutral-400 text-xs font-semibold">
          Đăng nhập để viết bình luận của bạn
        </span>
        <button
          type="button"
          onClick={() => useAuthModalStore.getState().openModal("login")}
          className="rounded-lg bg-white px-6 py-2.5 text-[11px] font-extrabold text-[#111317] transition-colors hover:bg-neutral-200 cursor-pointer"
        >
          ĐĂNG NHẬP
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await reviewsApi.create({
        movieId,
        content: content.trim(),
        rating: rating || undefined,
      });
      setContent('');
      setRating(0);
      toast('Đã đăng đánh giá thành công!', 'success');
    } catch {
      toast('Không thể gửi bình luận', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col justify-between space-y-4 p-6 bg-[#151920]/50 border border-white/5 rounded-2xl shadow-xl h-full min-h-[160px]"
    >
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center space-x-2">
          <NextImage
            src={
              user.avatarUrl ||
              `https://ui-avatars.com/api/?name=${user.username}&background=182027&color=ffffff`
            }
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-full border border-white/10 object-cover"
            unoptimized
          />
          <span className="text-xs font-bold text-white">{user.displayName || user.username}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
            Đánh giá sao:
          </span>
          <StarRating value={rating} onChange={setRating} size={16} />
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Chia sẻ cảm nhận của bạn về bộ phim này..."
        className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-foreground placeholder:text-neutral-500 transition-colors focus:border-white/30 focus:outline-none"
        rows={3}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className="rounded-lg bg-white px-5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-[#111317] transition-colors hover:bg-neutral-200 disabled:opacity-50"
        >
          {submitting ? 'Đang gửi...' : 'Gửi Đánh Giá'}
        </button>
      </div>
    </form>
  );
}

// ── Main Detail Page (Plex Redesign) ──────────────────────────
export default function FilmDetailPage({
  initialData,
  initialTmdb,
}: {
  initialData?: any;
  initialTmdb?: ServerTmdbResult | null;
}) {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const queryClient = useQueryClient();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistPending, setWatchlistPending] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [secondaryReadySlug, setSecondaryReadySlug] = useState('');
  const secondaryReady = secondaryReadySlug === slug;

  // Always reset scroll position to top when entering or switching movie detail pages
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      const raf = requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [slug]);

  useEffect(() => {
    let timer: number | undefined;
    const activate = () => {
      timer = window.setTimeout(() => setSecondaryReadySlug(slug), 100);
    };

    if (document.readyState === 'complete') activate();
    else window.addEventListener('load', activate, { once: true });

    // A broken decorative image must not postpone enhancements forever.
    const fallbackTimer = window.setTimeout(() => setSecondaryReadySlug(slug), 4_000);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('load', activate);
    };
  }, [slug]);

  // Fetch film detail
  const { data, isLoading, error } = useQuery({
    queryKey: ['film', slug],
    queryFn: () => movieApi.getDetail(slug).then((r) => r.data),
    initialData: initialData || undefined,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const film = data?.movie || (data?.error ? null : data);
  const episodes = data?.episodes || [];
  const isNotFound =
    !isLoading &&
    (error || !data || data?.error || !film || (!film.name && !film.title && !film.slug));

  const { cleanContent, directors, actors } = useMemo(() => {
    if (!film) return { cleanContent: '', directors: [], actors: [] };
    const parseList = (val: any) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.filter((v: any) => v && v.trim() !== '');
      if (typeof val === 'string')
        return val
          .split(',')
          .map((v: string) => v.trim())
          .filter(Boolean);
      return [];
    };

    const d = parseList(film?.director);
    const a = parseList(film?.actor);

    let content = film?.content || '';
    if (content.includes('-->') && content.length > 1000) {
      return {
        cleanContent: 'Đang cập nhật nội dung mô tả cho phim này...',
        directors: d,
        actors: a,
      };
    }

    content = content.replace(/<[^>]*>/g, '');
    return { cleanContent: content, directors: d, actors: a };
  }, [film]);

  // TMDB data — fetch images immediately for gallery & alternative poster switcher
  const {
    backdrops,
    posters,
    bestBackdrop,
    bestPoster,
    cast: tmdbCast,
    directors: tmdbDirectors,
    creditsLoading: tmdbCreditsLoading,
    isResolving: tmdbResolving,
    trailer,
  } = useTmdb({
    film,
    enabled: !!film,
    fetchImages: true,
    fetchCredits: secondaryReady,
    fetchVideos: secondaryReady || showTrailer,
    initialTmdb,
  });

  // OMDB data — ratings IMDb/RT/Metacritic + awards + box office (fetch immediately, 0ms cache)
  const { omdb } = useOmdb(film, !!film);

  const providerPosterUrl = film
    ? resolveImageUrl(film.poster_url, film.thumb_url) || resolveImageUrl(film.thumb_url)
    : null;
  const providerBackdropUrl = film
    ? resolveImageUrl(film.thumb_url, film.poster_url) || resolveImageUrl(film.poster_url)
    : null;
  const posterUrl =
    (bestPoster ? tmdbPoster(bestPoster.file_path, 'w500') : null) ||
    initialTmdb?.tmdbPosterUrl ||
    providerPosterUrl ||
    providerBackdropUrl ||
    undefined;
  const backdropUrl =
    (bestBackdrop ? tmdbBackdrop(bestBackdrop.file_path, 'w1280') : null) ||
    initialTmdb?.tmdbBackdropUrl ||
    providerBackdropUrl ||
    providerPosterUrl ||
    undefined;
  const tmdbPosterUrl =
    (bestPoster ? tmdbPoster(bestPoster.file_path, 'w500') : null) ||
    initialTmdb?.tmdbPosterUrl ||
    null;
  const tmdbBackdropUrl =
    (bestBackdrop ? tmdbBackdrop(bestBackdrop.file_path, 'w1280') : null) ||
    initialTmdb?.tmdbBackdropUrl ||
    null;
  const tmdbOriginalPosterUrl =
    (bestPoster ? tmdbPoster(bestPoster.file_path, 'original') : null) ||
    (initialTmdb?.bestPoster ? tmdbPoster(initialTmdb.bestPoster.file_path, 'original') : null);

  const heroPosterCandidates = useMemo(() => {
    const list: string[] = [];
    if (tmdbPosterUrl) list.push(tmdbPosterUrl);
    if (providerPosterUrl && !list.includes(providerPosterUrl)) list.push(providerPosterUrl);
    if (providerBackdropUrl && !list.includes(providerBackdropUrl)) list.push(providerBackdropUrl);
    return list;
  }, [tmdbPosterUrl, providerPosterUrl, providerBackdropUrl]);

  const allGalleryImages = useMemo(() => {
    const list: string[] = [];
    const main = tmdbOriginalPosterUrl || tmdbPosterUrl || providerPosterUrl;
    if (main) list.push(main);
    return list;
  }, [tmdbOriginalPosterUrl, tmdbPosterUrl, providerPosterUrl]);

  // Watchlist status check
  useEffect(() => {
    if (!slug || isNotFound) return;

    const syncWatchlistState = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          movieId?: string;
          action?: 'add' | 'remove';
        }>
      ).detail;
      if (detail?.movieId !== slug) return;
      setInWatchlist(detail.action === 'add');
    };

    window.addEventListener('netphim_watchlist_changed', syncWatchlistState);

    if (!user) {
      setInWatchlist(guestDataStorage.isWatchlisted(slug));
      return () => window.removeEventListener('netphim_watchlist_changed', syncWatchlistState);
    }

    let active = true;
    void watchlistApi
      .check(slug)
      .then((res) => {
        if (active) setInWatchlist(!!res.data?.inWatchlist);
      })
      .catch(() => {});

    return () => {
      active = false;
      window.removeEventListener('netphim_watchlist_changed', syncWatchlistState);
    };
  }, [user, slug, isNotFound]);

  const prefetchWatchData = () => {
    if (isNotFound || !film) return;
    queryClient.prefetchQuery({
      queryKey: ['film-ophim', slug],
      queryFn: () =>
        fetch(`/api/ophim/phim/${slug}`)
          .then((res) => {
            if (!res.ok) return null;
            return res.json();
          })
          .catch(() => null),
      staleTime: 5 * 60 * 1000,
    });
  };

  if (isLoading) return <FilmDetailSkeleton />;

  if (isNotFound || !film) return <FilmNotFound querySlug={slug} />;

  const handleWatchlist = async () => {
    if (watchlistPending) return;
    const previous = inWatchlist;
    const next = !previous;
    const movieData = {
      title: film?.name || film?.title || slug,
      titleEn: film?.origin_name,
      posterUrl,
      thumbUrl: backdropUrl,
      type: film?.type,
      year: film?.year,
    };

    setInWatchlist(next);
    setWatchlistPending(true);
    try {
      if (!user) {
        if (next) guestDataStorage.addWatchlist(slug, movieData);
        else guestDataStorage.removeWatchlist(slug);
      } else if (!next) {
        await watchlistApi.remove(slug);
      } else {
        await watchlistApi.add(slug, movieData);
      }

      if (user) {
        window.dispatchEvent(
          new CustomEvent('netphim_watchlist_changed', {
            detail: { movieId: slug, action: next ? 'add' : 'remove' },
          }),
        );
      }

      await queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      await queryClient.invalidateQueries({ queryKey: ['user-watchlist'] });
      toast(next ? 'Đã thêm vào Xem sau' : 'Đã xóa khỏi Xem sau', 'success');
    } catch {
      setInWatchlist(previous);
      toast('Chưa thể cập nhật Xem sau, vui lòng thử lại', 'error');
    } finally {
      setWatchlistPending(false);
    }
  };

  const handleRate = async (score: number) => {
    if (!user) {
      toast('Bạn cần đăng nhập để đánh giá', 'error');
      return;
    }
    try {
      await ratingsApi.rate(slug, score);
      setMyRating(score);
      toast(`Đã đánh giá ${score} sao!`, 'success');
    } catch {
      toast('Không thể gửi đánh giá', 'error');
    }
  };

  const firstEp = episodes?.[0]?.server_data?.[0];
  const watchLink = firstEp
    ? `/watch/${slug}?ep=${firstEp.slug || firstEp.name}`
    : `/watch/${slug}`;

  useEffect(() => {
    if (watchLink) {
      try {
        router.prefetch(watchLink);
      } catch (_e) {
        // ignore prefetch errors
      }
    }
  }, [watchLink, router]);

  const genres = Array.isArray(film?.category) ? film.category : [];
  const countries = Array.isArray(film?.country) ? film.country : [];
  const episodeCount = episodes.reduce(
    (total: number, server: any) => Math.max(total, server?.server_data?.length || 0),
    0,
  );
  const tmdbRating = Number(film?.tmdb?.vote_average || film?.vote_average || film?.rating || 0);
  const tmdbVoteCount = Number(film?.tmdb?.vote_count || film?.vote_count || 0);
  // Prefer OMDB real IMDb rating over provider-provided one
  const imdbRating = Number(
    omdb?.imdbRating || film?.imdb?.vote_average || film?.imdb_rating || film?.imdb?.rating || 0,
  );
  const imdbVoteCount = Number(omdb?.imdbVotes?.replace(/,/g, '') || film?.imdb?.vote_count || 0);
  const tmdbRatingLabel = formatRating(tmdbRating);
  const imdbRatingLabel = formatRating(imdbRating);
  const tmdbVoteLabel = formatVoteCount(tmdbVoteCount);
  const imdbVoteLabel = formatVoteCount(imdbVoteCount);
  const statusLabel =
    film?.status === 'completed' ||
    String(film?.episode_current || '')
      .toLowerCase()
      .includes('full')
      ? lang === 'en'
        ? 'Completed'
        : 'Đã hoàn thành'
      : film?.episode_current || (lang === 'en' ? 'Updating' : 'Đang cập nhật');
  const typeLabel =
    film?.type === 'series' || film?.type === 'tv'
      ? lang === 'en'
        ? 'TV Series'
        : 'Phim Bộ'
      : film?.type === 'hoat-hinh'
        ? lang === 'en'
          ? 'Animation'
          : 'Hoạt Hình'
        : lang === 'en'
          ? 'Movie'
          : 'Phim Lẻ';

  const filmName = film?.name || film?.title || slug;
  const originName = film?.origin_name || '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': film?.type === 'series' ? 'TVSeries' : 'Movie',
    name: filmName,
    alternateName: originName,
    description:
      cleanContent ||
      `Xem phim ${filmName} (${originName}) online chất lượng cao Vietsub Thuyết Minh HD full.`,
    image: posterUrl || backdropUrl,
    dateCreated: film?.year ? String(film.year) : undefined,
    genre: genres.map((g: any) => g?.name).filter(Boolean),
    countryOfOrigin: countries.map((c: any) => c?.name).filter(Boolean),
    aggregateRating:
      tmdbRating > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: tmdbRating.toFixed(1),
            bestRating: '10',
            worstRating: '0',
            ratingCount: String(tmdbVoteCount || 1),
          }
        : undefined,
    potentialAction: {
      '@type': 'WatchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://netphim.app'}/watch/${slug}`,
        actionPlatform: [
          'http://schema.org/DesktopWebPlatform',
          'http://schema.org/MobileWebPlatform',
        ],
      },
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Trang Chủ',
        item: process.env.NEXT_PUBLIC_SITE_URL || 'https://netphim.app',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: typeLabel,
        item: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://netphim.app'}/films/${film?.type === 'series' ? 'series' : 'single'}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: filmName,
        item: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://netphim.app'}/film/${slug}`,
      },
    ],
  };

  const jsonLdPayload = [jsonLd, breadcrumbJsonLd];

  const seoTitle = `${filmName} ${originName ? `(${originName})` : ''} ${film?.year ? `- ${film.year}` : ''} Vietsub HD | NetPhim`;
  const seoDescription = cleanContent
    ? cleanContent.slice(0, 160)
    : `Xem phim ${filmName} (${originName}) chất lượng cao Vietsub Thuyết minh HD miễn phí trên NetPhim.`;

  return (
    <div
      className={`${cardFont.className} relative min-h-screen select-none overflow-hidden bg-[#0d0f12] pb-24 text-foreground`}
    >
      {/* ── JSON-LD STRUCTURED DATA SCHEMA FOR GOOGLE SEO ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdPayload) }}
      />

      {/* ── DYNAMIC HEAD META TAGS (OPEN GRAPH & TWITTER CARDS) ── */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <link rel="canonical" href={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://netphim.app'}/film/${slug}`} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:url" content={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://netphim.app'}/film/${slug}`} />
      <meta property="og:image" content={posterUrl || backdropUrl || undefined} />
      <meta property="og:type" content="video.movie" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={posterUrl || backdropUrl || undefined} />
      {/* ── Giant Backdrop Banner (Plex Style Left-to-Right Blended Layout) ── */}
      {(backdropUrl || posterUrl || providerBackdropUrl || providerPosterUrl) && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[86vh] min-h-[720px] w-full select-none overflow-hidden md:h-[105vh] md:max-h-[1040px]">
          <ResilientDetailImage
            candidates={[
              tmdbBackdropUrl,
              providerBackdropUrl,
              tmdbPosterUrl,
              providerPosterUrl,
            ]}
            alt={filmName}
            sizes="100vw"
            className="scale-[1.03] object-cover object-top opacity-55"
            priority
          />
          <div className="absolute inset-0 bg-[#0d0f12]/55" />
          <div className="absolute inset-0 w-full bg-gradient-to-r from-[#0d0f12] via-[#0d0f12]/85 to-[#0d0f12]/20 md:w-[72%]" />
          <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-[#0d0f12] via-[#0d0f12]/78 to-transparent" />
        </div>
      )}

      <div className="relative z-10 container mx-auto px-4 md:px-12 lg:pl-20 pt-24 sm:pt-28">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 mb-5 flex-wrap">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-all text-xs border border-white/15 shadow-sm active:scale-95 cursor-pointer mr-1"
          >
            <ArrowLeft size={13} />
            <span>{t('watch.back', 'Quay lại')}</span>
          </button>
          <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
            {t('common.goHome', 'Trang chủ')}
          </Link>
          <ChevronRightIcon size={12} className="text-neutral-600" />
          {genres[0]?.name && (
            <>
              <Link
                href={`/genre/${genres[0].slug}`}
                className="hover:text-white transition-colors"
              >
                {t(`genres_list.${genres[0].slug}`, genres[0].name)}
              </Link>
              <ChevronRightIcon size={12} className="text-neutral-600" />
            </>
          )}
          {film.year && (
            <>
              <span className="text-neutral-400">{film.year}</span>
              <ChevronRightIcon size={12} className="text-neutral-600" />
            </>
          )}
          {countries[0]?.name && (
            <>
              <Link
                href={`/country/${countries[0].slug}`}
                className="hover:text-white transition-colors"
              >
                {t(`countries_list.${countries[0].slug}`, countries[0].name)}
              </Link>
              <ChevronRightIcon size={12} className="text-neutral-600" />
            </>
          )}
          <span className="max-w-xs truncate font-bold text-neutral-200">{film.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-8 flex flex-col space-y-4 md:space-y-5 items-center sm:items-start text-center sm:text-left">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start w-full">
              <div className="lg:hidden w-36 sm:w-40 aspect-[2/3] rounded-2xl overflow-hidden border border-white/15 bg-neutral-900 shadow-2xl shrink-0 relative group mx-auto sm:mx-0">
                <DetailPosterCard
                  src={tmdbPosterUrl}
                  fallbackSrc={providerPosterUrl}
                  posterUrl={film.poster_url}
                  thumbUrl={film.thumb_url}
                  filmName={film.name}
                  onOpenLightbox={() => {
                    setLightboxIndex(0);
                    setLightboxOpen(true);
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="flex flex-col space-y-2 sm:space-y-3 min-w-0 flex-1 items-center sm:items-start">
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.25] drop-shadow-xl line-clamp-3 pt-2 pb-1 overflow-visible">
                  {film.name}
                </h1>

                {film.origin_name && (
                  <p className="text-xs sm:text-base text-neutral-300 font-medium tracking-wide italic line-clamp-2">
                    {film.origin_name}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 text-xs font-bold pt-1">
                  {film.quality && (
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wide shadow-sm select-none',
                        film.quality.toUpperCase().includes('4K')
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black'
                          : film.quality.toUpperCase().includes('FHD')
                            ? 'bg-[#00c5ff] text-black'
                            : film.quality.toUpperCase().includes('HD')
                              ? 'bg-[#00b4d8] text-black'
                              : 'bg-cyan-500 text-black',
                      )}
                    >
                      {film.quality}
                    </span>
                  )}
                  {film.lang && (
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-[10px] sm:text-[11px] font-black tracking-tight inline-flex items-center gap-1 shadow-sm select-none',
                        film.lang.toLowerCase().includes('song ngữ')
                          ? 'bg-[#c084fc] text-purple-950'
                          : film.lang.toLowerCase().includes('thuyết minh') ||
                              film.lang.toLowerCase().includes('lồng tiếng')
                            ? 'bg-[#fde047] text-amber-950'
                            : 'bg-[#86efac] text-emerald-950',
                      )}
                    >
                      {film.lang.toLowerCase().includes('song ngữ') ? (
                        <span className="text-[9px] font-black bg-purple-950/20 px-1 py-0.2 rounded leading-none">
                          文A
                        </span>
                      ) : film.lang.toLowerCase().includes('thuyết minh') ||
                        film.lang.toLowerCase().includes('lồng tiếng') ? (
                        <Mic size={11} className="stroke-[2.5]" />
                      ) : (
                        <Subtitles size={11} className="stroke-[2.5]" />
                      )}
                      <span>{film.lang}</span>
                    </span>
                  )}
                  {film.episode_current &&
                    film.episode_current !== 'Full' &&
                    film.episode_current !== 'HD' && (
                      <span className="bg-[#27272a] text-white border border-white/20 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold shadow-sm select-none">
                        {film.episode_current}
                      </span>
                    )}
                  {film.year && (
                    <span className="bg-white text-neutral-950 font-black px-2 py-0.5 rounded text-[10px] sm:text-[11px] shadow-sm select-none">
                      {film.year}
                    </span>
                  )}
                  {film.time && (
                    <span className="bg-white/10 text-neutral-200 border border-white/15 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold backdrop-blur-sm shadow-sm select-none">
                      {film.time}
                    </span>
                  )}
                  {tmdbRatingLabel && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded bg-[#01b4e4]/15 border border-[#01b4e4]/40 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-cyan-300 shadow-sm select-none"
                      title={
                        tmdbVoteCount > 0
                          ? `${tmdbVoteCount.toLocaleString('vi-VN')} ${t('film.votes', 'lượt đánh giá trên TMDB')}`
                          : t('film.tmdbScore', 'Điểm TMDB')
                      }
                    >
                      <span className="bg-[#01b4e4] text-black font-black px-1 rounded text-[9px] leading-tight">
                        TMDB
                      </span>
                      <span>{tmdbRatingLabel}/10</span>
                    </span>
                  )}
                  {imdbRatingLabel && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded bg-[#f5c518]/15 border border-[#f5c518]/40 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-amber-300 shadow-sm select-none"
                      title={
                        imdbVoteCount > 0
                          ? `${imdbVoteCount.toLocaleString('vi-VN')} ${t('film.votes', 'lượt đánh giá trên IMDb')}`
                          : t('film.imdbScore', 'Điểm IMDb')
                      }
                    >
                      <span className="bg-[#f5c518] text-black font-black px-1 rounded text-[9px] leading-tight">
                        IMDb
                      </span>
                      <span>{imdbRatingLabel}/10</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 w-full">
              <Link
                href={watchLink}
                className="flex items-center space-x-2 rounded-full bg-white px-7 py-2.5 text-xs font-extrabold text-[#111317] transition-colors hover:bg-neutral-200 active:scale-[0.98] sm:py-3 shadow-lg"
                onMouseEnter={prefetchWatchData}
              >
                <Play size={14} fill="currentColor" />
                <span>{t('watch.watchFilm', 'Xem phim')}</span>
              </Link>

              <button
                onClick={() => setShowTrailer(true)}
                className="bg-[#181b22] hover:bg-[#222731] text-white px-6 py-2.5 sm:py-3 rounded-full font-extrabold tracking-wider uppercase text-xs border border-white/10 hover:border-white/20 transition-all cursor-pointer active:scale-95 shadow-md"
              >
                {t('film.trailer', 'Trailer')}
              </button>

              <div className="flex items-center space-x-3 sm:ml-2">
                <div className="flex flex-col items-center gap-1 group">
                  <button
                    onClick={handleWatchlist}
                    disabled={watchlistPending}
                    aria-pressed={inWatchlist}
                    aria-label={
                      inWatchlist
                        ? t('film.removeFromWatchlist', 'Xóa khỏi Tủ phim')
                        : t('film.addToWatchlist', 'Thêm vào Tủ phim')
                    }
                    className={cn(
                      'w-10 h-10 rounded-full border border-white/10 hover:border-white/20 flex items-center justify-center bg-[#181b22] hover:bg-[#222731] transition-all cursor-pointer disabled:cursor-wait disabled:opacity-60 active:scale-95 shadow-sm',
                      inWatchlist
                        ? 'border-sky-400/40 bg-sky-500/15 text-sky-400'
                        : 'text-neutral-200 hover:text-white',
                    )}
                  >
                    {inWatchlist ? (
                      <Check size={16} className="stroke-[3] text-sky-400" />
                    ) : (
                      <Plus size={16} className="text-neutral-200 group-hover:text-white" />
                    )}
                  </button>
                  <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wider group-hover:text-white transition-colors">
                    {t('nav.watchlist', 'Tủ phim')}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1 group">
                  <button
                    onClick={() => {
                      if (!user) {
                        toast(
                          t('toast.loginToTrack', 'Bạn cần đăng nhập để theo dõi tập mới'),
                          'error',
                        );
                        return;
                      }
                      toast(
                        t(
                          'toast.subscribed',
                          `Đã đăng ký nhận thông báo khi có tập mới của ${film?.name}!`,
                        ),
                        'success',
                      );
                    }}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-[#181b22] text-neutral-200 transition-all hover:border-white/20 hover:bg-[#222731] hover:text-white active:scale-95 shadow-sm"
                  >
                    <Bell size={16} className="text-neutral-200 group-hover:text-white" />
                  </button>
                  <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wider group-hover:text-white transition-colors">
                    {t('watch.follow', 'Theo dõi')}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1 group">
                  <button
                    onClick={() => handleRate(5)}
                    className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-[#181b22] hover:bg-[#222731] hover:border-white/20 transition-all text-neutral-200 hover:text-white cursor-pointer active:scale-95 shadow-sm"
                  >
                    <Star
                      size={16}
                      fill={myRating ? 'currentColor' : 'none'}
                      className={cn(
                        myRating ? 'text-amber-400' : 'text-neutral-200 group-hover:text-white',
                      )}
                    />
                  </button>
                  <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wider group-hover:text-white transition-colors">
                    {t('watch.rate', 'Đánh giá')}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1 group">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast(
                        t('film.copiedLink', 'Đã sao chép liên kết phim vào bộ nhớ tạm!'),
                        'success',
                      );
                    }}
                    className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-[#181b22] hover:bg-[#222731] hover:border-white/20 transition-all text-neutral-200 hover:text-white cursor-pointer active:scale-95 shadow-sm"
                  >
                    <Share2 size={16} className="text-neutral-200 group-hover:text-white" />
                  </button>
                  <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wider group-hover:text-white transition-colors">
                    {t('film.share', 'Chia sẻ')}
                  </span>
                </div>
              </div>
            </div>

            {/* ── OMDB Ratings (below action buttons) ── */}
            <AnimatePresence>
              {omdb && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-2 pt-3 w-full"
                >
                  {/* IMDb chip */}
                  {omdb.imdbRating && (
                    <a
                      href={omdb.imdbId ? `https://www.imdb.com/title/${omdb.imdbId}` : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-1.5 rounded-lg border border-[#f5c518]/25 bg-[#f5c518]/8 px-2.5 py-1.5 hover:border-[#f5c518]/50 transition-all"
                    >
                      <svg viewBox="0 0 64 32" width="32" height="16" aria-label="IMDb">
                        <rect width="64" height="32" rx="4" fill="#F5C518" />
                        <text
                          x="5"
                          y="23"
                          fontFamily="Arial Black, sans-serif"
                          fontWeight="900"
                          fontSize="20"
                          fill="#000"
                        >
                          IMDb
                        </text>
                      </svg>
                      <span className="text-xs font-black text-white">
                        {omdb.imdbRating}
                        <span className="text-neutral-500 font-normal">/10</span>
                      </span>
                      {omdb.imdbVotes && (
                        <span className="text-[10px] text-neutral-500 hidden sm:inline">
                          ({omdb.imdbVotes})
                        </span>
                      )}
                    </a>
                  )}

                  {/* RT chip */}
                  {omdb.rottenTomatoes &&
                    (() => {
                      const pct = parseInt(omdb.rottenTomatoes!);
                      const isFresh = pct >= 60;
                      return (
                        <div
                          className={cn(
                            'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5',
                            isFresh
                              ? 'border-red-500/25 bg-red-500/8'
                              : 'border-white/10 bg-white/[0.03]',
                          )}
                        >
                          <svg
                            viewBox="0 0 32 32"
                            width="15"
                            height="15"
                            aria-label="Rotten Tomatoes"
                          >
                            {isFresh ? (
                              <>
                                <circle cx="16" cy="18" r="12" fill="#FA320A" />
                                <ellipse cx="16" cy="8" rx="4" ry="6" fill="#22C55E" />
                                <ellipse
                                  cx="20"
                                  cy="6"
                                  rx="2.5"
                                  ry="5"
                                  fill="#16A34A"
                                  transform="rotate(20 20 6)"
                                />
                                <circle cx="12" cy="20" r="3" fill="#fff" opacity="0.25" />
                              </>
                            ) : (
                              <>
                                <circle cx="16" cy="16" r="13" fill="#6B7280" />
                                <text
                                  x="16"
                                  y="21"
                                  textAnchor="middle"
                                  fontFamily="sans-serif"
                                  fontSize="14"
                                  fill="#fff"
                                  fontWeight="bold"
                                >
                                  ☔
                                </text>
                              </>
                            )}
                          </svg>
                          <span
                            className={cn(
                              'text-xs font-black',
                              isFresh ? 'text-red-400' : 'text-neutral-400',
                            )}
                          >
                            {omdb.rottenTomatoes}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-bold px-1.5 py-px rounded-full',
                              isFresh
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-neutral-700/60 text-neutral-500',
                            )}
                          >
                            {isFresh ? 'Tươi' : 'Héo'}
                          </span>
                        </div>
                      );
                    })()}

                  {/* Metacritic chip */}
                  {omdb.metacritic &&
                    (() => {
                      const score = parseInt(omdb.metacritic!);
                      const color = score >= 61 ? '#43d45a' : score >= 40 ? '#ffbd3f' : '#ff4c4c';
                      return (
                        <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
                          <span
                            className="text-[10px] font-black w-7 h-6 rounded flex items-center justify-center leading-none"
                            style={{ background: color, color: '#000' }}
                          >
                            {score}
                          </span>
                          <span className="text-[10px] font-bold text-neutral-400">Điểm MC</span>
                        </div>
                      );
                    })()}

                  {/* Awards */}
                  {omdb.awards && (
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 w-full mt-0.5">
                      <Trophy size={11} className="text-amber-400 shrink-0" />
                      <span className="text-[11px] text-neutral-500 leading-snug line-clamp-2">
                        {omdb.awards}
                      </span>
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-[11px] text-neutral-500 w-full pt-0.5">
                    {omdb.boxOffice && (
                      <span className="flex items-center gap-1">
                        <DollarSign size={10} />
                        <span className="text-neutral-400">{omdb.boxOffice}</span>
                      </span>
                    )}
                    {omdb.rated && (
                      <span className="border border-white/15 text-neutral-400 px-1.5 py-px rounded text-[10px] font-bold tracking-wider">
                        {omdb.rated}
                      </span>
                    )}
                    {omdb.language && (
                      <span className="flex items-center gap-1">
                        <Globe size={10} />
                        <span>
                          {omdb.language
                            ?.split(', ')
                            .map(
                              (l: string) =>
                                ({
                                  English: 'Tiếng Anh',
                                  Spanish: 'Tiếng Tây Ban Nha',
                                  French: 'Tiếng Pháp',
                                  German: 'Tiếng Đức',
                                  Korean: 'Tiếng Hàn',
                                  Japanese: 'Tiếng Nhật',
                                  Chinese: 'Tiếng Trung',
                                  Vietnamese: 'Tiếng Việt',
                                  Thai: 'Tiếng Thái',
                                  Portuguese: 'Tiếng Bồ Đào Nha',
                                  Italian: 'Tiếng Ý',
                                  Russian: 'Tiếng Nga',
                                  Arabic: 'Tiếng Ả Rập',
                                  Hindi: 'Tiếng Hindi',
                                  Polish: 'Tiếng Ba Lan',
                                  Turkish: 'Tiếng Thổ Nhĩ Kỳ',
                                })[l] || l,
                            )
                            .join(', ')}
                        </span>
                      </span>
                    )}
                    {omdb.country && (
                      <span>
                        ·{' '}
                        {omdb.country
                          ?.split(', ')
                          .map(
                            (c: string) =>
                              ({
                                'United States': 'Mỹ',
                                'United Kingdom': 'Anh',
                                Canada: 'Canada',
                                Australia: 'Úc',
                                France: 'Pháp',
                                Germany: 'Đức',
                                Japan: 'Nhật Bản',
                                'South Korea': 'Hàn Quốc',
                                China: 'Trung Quốc',
                                Vietnam: 'Việt Nam',
                                India: 'Ấn Độ',
                                Italy: 'Ý',
                                Spain: 'Tây Ban Nha',
                                Russia: 'Nga',
                                'New Zealand': 'New Zealand',
                                Thailand: 'Thái Lan',
                              })[c] || c,
                          )
                          .join(', ')}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-4 hidden lg:flex justify-end">
            <div className="w-64 aspect-[2/3] rounded-2xl overflow-hidden border border-white/15 bg-neutral-950/60 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative group">
              <DetailPosterCard
                src={tmdbPosterUrl}
                fallbackSrc={providerPosterUrl}
                posterUrl={film.poster_url}
                thumbUrl={film.thumb_url}
                filmName={film.name}
                onOpenLightbox={() => {
                  setLightboxIndex(0);
                  setLightboxOpen(true);
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          <section
            aria-label={t('home.details', 'Thông tin phim')}
            className="grid grid-cols-2 overflow-hidden rounded-[14px] border border-white/10 bg-[#0d0f12]/65 shadow-[0_14px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:grid-cols-3 sm:divide-x sm:divide-white/10"
          >
            <div className="border-b border-r border-white/10 px-3.5 py-3 sm:border-b-0 sm:border-r-0">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                  {t('film.genres', 'Thể loại')}
                </h2>
                <span className="text-[10px] font-semibold text-neutral-600">{genres.length}</span>
              </div>
              <div className="flex min-h-6 flex-wrap items-center gap-1.5">
                {genres.length > 0 ? (
                  genres.map((genre: any) => (
                    <Link
                      key={genre.slug || genre.name}
                      href={genre.slug ? `/genre/${genre.slug}` : '#'}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-neutral-300 transition-colors hover:border-white/20 hover:text-white"
                    >
                      {t(`genres_list.${genre.slug}`, genre.name)}
                    </Link>
                  ))
                ) : (
                  <span className="text-xs text-neutral-500">
                    {t('common.noData', 'Đang cập nhật')}
                  </span>
                )}
              </div>
            </div>

            <div className="border-b border-white/10 px-3.5 py-3 sm:border-b-0">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                  {t('film.country', 'Quốc gia')}
                </h2>
                <span className="text-[10px] font-semibold text-neutral-600">
                  {countries.length}
                </span>
              </div>
              <div className="flex min-h-6 flex-wrap items-center gap-1.5">
                {countries.length > 0 ? (
                  countries.map((country: any) => (
                    <Link
                      key={country.slug || country.name}
                      href={country.slug ? `/country/${country.slug}` : '#'}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-neutral-300 transition-colors hover:border-white/20 hover:text-white"
                    >
                      {t(`countries_list.${country.slug}`, country.name)}
                    </Link>
                  ))
                ) : (
                  <span className="text-xs text-neutral-500">
                    {t('common.noData', 'Đang cập nhật')}
                  </span>
                )}
              </div>
            </div>

            <div className="col-span-2 px-3.5 py-3 sm:col-span-1">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                  {t('home.details', 'Thông tin')}
                </h2>
                <span className="max-w-[55%] truncate rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-semibold text-neutral-400">
                  {statusLabel}
                </span>
              </div>
              <dl className="space-y-1 text-[11px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">{t('film.duration', 'Thời lượng')}</dt>
                  <dd className="truncate font-semibold text-neutral-200">
                    {film.time || t('film.defaultDuration', '22 phút/tập')}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">{t('film.episodes', 'Tập hiện tại')}</dt>
                  <dd className="truncate font-semibold text-neutral-200">
                    {film.episode_current ||
                      (episodeCount ? t('film.episodeCount', `Tập ${episodeCount}`) : 'Full')}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {secondaryReady &&
            !tmdbResolving &&
            !tmdbCreditsLoading &&
            (directors.length > 0 ||
              actors.length > 0 ||
              tmdbDirectors.length > 0 ||
              tmdbCast.length > 0) && (
              <section className="space-y-3" aria-labelledby="film-credits-title">
                <h2
                  id="film-credits-title"
                  className="text-xs font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2"
                >
                  <span>{t('film.cast', 'Đạo diễn và diễn viên')}</span>
                </h2>
                <CastScroller>
                  {tmdbDirectors.some((director) => director.profile_path)
                    ? tmdbDirectors
                        .filter((director) => director.profile_path)
                        .slice(0, 3)
                        .map((director) => (
                          <CastCard
                            key={`tmdb-director-${director.id}`}
                            name={director.name}
                            role={t('film.director', 'Đạo diễn')}
                            profilePath={director.profile_path}
                            personId={director.id}
                          />
                        ))
                    : directors
                        .slice(0, 3)
                        .map((director, idx) => (
                          <CastCard
                            key={`director-${director}-${idx}`}
                            name={director}
                            role={t('film.director', 'Đạo diễn')}
                          />
                        ))}
                  {tmdbCast.some((castMember) => castMember.profile_path)
                    ? tmdbCast
                        .filter((castMember) => castMember.profile_path)
                        .slice(0, 12)
                        .map((c) => (
                          <CastCard
                            key={`tmdb-cast-${c.id}`}
                            name={c.name}
                            role={c.character || t('film.castMember', 'Diễn viên')}
                            profilePath={c.profile_path}
                            personId={c.id}
                          />
                        ))
                    : actors
                        .slice(0, 10)
                        .map((actor, idx) => (
                          <CastCard
                            key={`actor-${actor}-${idx}`}
                            name={actor}
                            role={t('film.characters', 'Diễn viên')}
                          />
                        ))}
                </CastScroller>
              </section>
            )}

          <section className="space-y-3 pt-4 border-t border-white/5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center">
              <span>{t('film.synopsis', 'Nội dung phim')}</span>
            </h2>

            {film.origin_name && (
              <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                <span className="font-bold text-white mr-1.5">
                  {t('film.originName', 'Tên gốc')}:
                </span>
                <span>{film.origin_name}</span>
              </p>
            )}

            {cleanContent && (
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-normal max-w-4xl">
                {cleanContent}
              </p>
            )}
          </section>

          <section className="space-y-3 pt-4 border-t border-white/5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center">
              <span>{t('film.tags', 'Từ khóa')}</span>
              <span className="ml-2 text-xs font-normal text-neutral-400">
                ({genres.length + 2} {t('film.tagsCount', 'từ khóa')})
              </span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {genres.map((g: any) => (
                <span
                  key={g.slug || g.name}
                  className="bg-white/5 border border-white/10 text-neutral-300 px-3 py-1 rounded-md text-xs font-medium hover:border-white/20 transition-colors cursor-pointer"
                >
                  {g.slug || g.name.toLowerCase()}
                </span>
              ))}
              <span className="bg-white/5 border border-white/10 text-neutral-300 px-3 py-1 rounded-md text-xs font-medium">
                anime
              </span>
              <span className="bg-white/5 border border-white/10 text-neutral-300 px-3 py-1 rounded-md text-xs font-medium">
                fantasy
              </span>
            </div>
          </section>

        </div>
      </div>

      {/* Trailer Video Modal */}
      <TrailerModal
        isOpen={showTrailer}
        onClose={() => setShowTrailer(false)}
        film={film}
        filmName={film?.name || ''}
        trailerUrl={film?.trailer_url}
        tmdbVideoKey={trailer?.key}
      />

      {/* Fullscreen Interactive Image Lightbox Modal */}
      <FilmImageLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={allGalleryImages.length > 0 ? allGalleryImages : heroPosterCandidates}
        initialIndex={lightboxIndex}
        filmName={film?.name || ''}
      />
    </div>
  );
}

function FilmDetailSkeleton() {
  return (
    <div className="relative min-h-screen bg-black pb-24 text-white">
      <div className="absolute inset-x-0 top-0 h-[65vh] overflow-hidden md:h-[82vh]">
        <div className="h-full w-full animate-pulse bg-gradient-to-br from-[#161b22] via-[#0d1015] to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="container relative z-10 mx-auto px-4 pt-24 md:px-12 sm:pt-28">
        <div className="animate-pulse">
          <div className="mb-5 h-7 w-72 rounded-full bg-white/[0.07]" />

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-8">
              <div className="h-11 w-4/5 rounded-lg bg-white/10 sm:h-14 md:h-16" />
              <div className="h-4 w-2/5 rounded bg-white/[0.07]" />
              <div className="flex gap-2">
                {[72, 104, 56, 88].map((width, index) => (
                  <div key={index} className="h-6 rounded-md bg-white/[0.08]" style={{ width }} />
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <div className="h-11 w-32 rounded-full bg-white/15" />
                <div className="h-11 w-24 rounded-full bg-white/[0.08]" />
                <div className="h-11 w-32 rounded-full bg-white/[0.05]" />
              </div>
            </div>

            <div className="hidden justify-end lg:col-span-4 lg:flex">
              <div className="aspect-[2/3] w-64 rounded-2xl border border-white/[0.08] bg-white/[0.07]" />
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="h-28 rounded-xl border border-white/[0.07] bg-white/[0.035] p-4"
              >
                <div className="h-3 w-20 rounded bg-white/[0.08]" />
                <div className="mt-5 h-4 w-3/4 rounded bg-white/[0.06]" />
                <div className="mt-2 h-3 w-1/2 rounded bg-white/[0.04]" />
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <div className="h-64 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
              <div className="h-5 w-36 rounded bg-white/[0.08]" />
              <div className="mt-5 h-3 w-full rounded bg-white/[0.055]" />
              <div className="mt-3 h-3 w-11/12 rounded bg-white/[0.055]" />
              <div className="mt-3 h-3 w-4/5 rounded bg-white/[0.055]" />
            </div>
            <div className="h-64 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
              <div className="h-5 w-28 rounded bg-white/[0.08]" />
              <div className="mt-5 grid grid-cols-4 gap-2">
                {Array.from({ length: 12 }, (_, index) => (
                  <div key={index} className="h-9 rounded-lg bg-white/[0.055]" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
