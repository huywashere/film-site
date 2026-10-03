'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode } from 'swiper/modules';
import { ChevronRight, ChevronLeft, Play, X } from 'lucide-react';
import { watchProgressStorage, WatchProgressEntry } from '@/lib/watch-progress';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { movieApi, watchHistoryApi } from '@/lib/api';
import { FilmItem } from './FilmCard';
import { DashPagination } from './DashPagination';
import { cardFont } from '@/lib/fonts';
import { useTranslation } from '@/store/langStore';
import { formatEpisodeLabel } from '@/lib/player-source-routing';
import { TmdbArtwork } from './TmdbArtwork';

import 'swiper/css';
import 'swiper/css/navigation';

interface ContinueWatchingRowProps {
  fallbackFilms?: FilmItem[];
}

const LEGACY_SHARED_HISTORY_ARTWORK =
  /(?:^|\/)wp3533664-avengers-infinity-war-4k-wallpapers\.jpg(?:\?|$)/i;

function historyArtwork(value?: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const artwork = value.trim();
  if (
    !artwork ||
    artwork === 'undefined' ||
    artwork === 'null' ||
    artwork === 'none' ||
    LEGACY_SHARED_HISTORY_ARTWORK.test(artwork)
  ) {
    return undefined;
  }
  return artwork;
}

function historyIdentity(value?: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function HistoryArtwork({
  item,
  catalogFilm,
  landscape,
  className,
  priority = false,
}: {
  item: any;
  catalogFilm?: FilmItem;
  landscape: boolean;
  className: string;
  priority?: boolean;
}) {
  const title = item.title || item.name || 'Phim';
  const rawPoster =
    historyArtwork(item.poster) ||
    historyArtwork(item.poster_url) ||
    historyArtwork(item.moviePoster) ||
    historyArtwork(item.thumb) ||
    historyArtwork(item.thumb_url) ||
    historyArtwork(item.movieThumb);
  const rawThumb =
    historyArtwork(item.thumb) ||
    historyArtwork(item.thumb_url) ||
    historyArtwork(item.movieThumb) ||
    historyArtwork(item.poster) ||
    historyArtwork(item.poster_url) ||
    historyArtwork(item.moviePoster);

  // Self-healing: if an old/corrupt localStorage entry has no artwork and no catalog match, recover it from API
  const itemSlug = item.slug || item.movieId;
  const needsRecovery = !catalogFilm && !rawPoster && !rawThumb && Boolean(itemSlug);

  const { data: recoveryData } = useQuery({
    queryKey: ['history-artwork-recovery', itemSlug],
    queryFn: () => movieApi.getDetail(itemSlug).then((r) => r.data),
    enabled: needsRecovery,
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const recoveredMovie = recoveryData?.movie || recoveryData?.item || recoveryData;
  const recoveredThumb =
    historyArtwork(recoveredMovie?.thumb_url) || historyArtwork(recoveredMovie?.poster_url);
  const recoveredPoster =
    historyArtwork(recoveredMovie?.poster_url) || historyArtwork(recoveredMovie?.thumb_url);

  // Auto-heal local entry so future renders have persistent artwork
  useEffect(() => {
    if ((recoveredThumb || recoveredPoster) && item.slug) {
      watchProgressStorage.saveProgress({
        slug: item.slug,
        epSlug: item.epSlug || '1',
        epName: item.epName || '',
        title: item.title || title,
        poster: recoveredPoster || recoveredThumb || '',
        thumb: recoveredThumb || recoveredPoster || '',
        originName: recoveredMovie?.origin_name || item.originName,
        currentTime: item.currentTime || 0,
        duration: item.duration || 5400,
      });
    }
  }, [recoveredThumb, recoveredPoster, item, title, recoveredMovie?.origin_name]);

  const effectivePoster =
    catalogFilm?.poster_url ||
    rawPoster ||
    recoveredPoster ||
    catalogFilm?.thumb_url ||
    rawThumb ||
    recoveredThumb;

  const effectiveThumb =
    catalogFilm?.thumb_url ||
    rawThumb ||
    recoveredThumb ||
    catalogFilm?.poster_url ||
    rawPoster ||
    recoveredPoster;

  const filmForArtwork = useMemo<FilmItem>(
    () => ({
      ...catalogFilm,
      slug: catalogFilm?.slug || itemSlug || title,
      name: catalogFilm?.name || title,
      title: catalogFilm?.title || title,
      origin_name:
        catalogFilm?.origin_name ||
        item.originName ||
        item.origin_name ||
        recoveredMovie?.origin_name ||
        item.titleEn ||
        undefined,
      year:
        catalogFilm?.year ||
        Number(item.year || item.movieYear || recoveredMovie?.year) ||
        undefined,
      type: catalogFilm?.type || item.type || recoveredMovie?.type,
      tmdb: catalogFilm?.tmdb || item.tmdb || recoveredMovie?.tmdb,
      poster_url: effectivePoster,
      thumb_url: effectiveThumb,
    }),
    [catalogFilm, item, title, itemSlug, effectivePoster, effectiveThumb, recoveredMovie],
  );

  return (
    <TmdbArtwork
      film={filmForArtwork}
      kind={landscape ? 'backdrop' : 'poster'}
      alt={`Ảnh phim ${title}`}
      className={className}
      priority={priority}
      allowTitleLookup
    />
  );
}

function getHistoryProgressDetails(item: any) {
  const title = item.title || item.name || 'Phim đã xem';

  // Parse current watched time safely in seconds
  const currentSec = Math.max(0, Number(item.currentTime ?? item.progress ?? 0) || 0);

  // Parse total duration safely in seconds
  let durationSec = Math.max(0, Number(item.duration ?? 0) || 0);
  if (durationSec <= 100) {
    if (typeof item.time === 'string') {
      const match = item.time.match(/(\d+)\s*(?:phút|min|p)/i);
      if (match) {
        durationSec = parseInt(match[1], 10) * 60;
      } else {
        durationSec = 5400; // 90 mins
      }
    } else {
      durationSec = 5400; // 90 mins
    }
  }

  // Format watched string e.g. "34p", "7p", "0p", "1g 15p"
  const watchedMins = Math.floor(currentSec / 60);
  let watchedStr = '';
  if (watchedMins >= 60) {
    const h = Math.floor(watchedMins / 60);
    const m = watchedMins % 60;
    watchedStr = `${h}g ${m}p`;
  } else {
    watchedStr = `${watchedMins}p`;
  }

  // Format total string in minutes e.g. "141p", "58p", "45p"
  const totalMins = Math.max(1, Math.floor(durationSec / 60));
  const totalStr = `${totalMins}p`;

  // Percentage for red progress bar (clamped 0 to 100)
  const percent =
    durationSec > 0
      ? Math.min(
          100,
          Math.max(currentSec > 0 ? 3 : 0, Math.round((currentSec / durationSec) * 100)),
        )
      : 0;

  const epLabel = formatEpisodeLabel(item.epName || item.epSlug);

  // Quality badge e.g. "HD", "RDẼ", "Vietsub", "L.Tiếng"
  let qualityBadge = 'HD';
  const langLower = (item.lang || item.quality || '').toLowerCase();
  if (langLower.includes('lồng tiếng') || langLower.includes('l.tiếng')) {
    qualityBadge = 'L.Tiếng';
  } else if (langLower.includes('thuyết minh')) {
    qualityBadge = 'Thuyết Minh';
  } else if (langLower.includes('vietsub') || langLower.includes('sub')) {
    qualityBadge = 'Vietsub';
  } else if (item.quality) {
    qualityBadge = item.quality;
  }

  return {
    title,
    watchedStr: `Đã xem: ${watchedStr}`,
    totalStr,
    percent,
    epLabel,
    qualityBadge,
  };
}

export function ContinueWatchingRow({ fallbackFilms = [] }: ContinueWatchingRowProps) {
  const { user } = useAuthStore();
  const [localEntries, setLocalEntries] = useState<WatchProgressEntry[]>([]);
  const [swiper, setSwiper] = useState<any>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // Load localStorage entries for non-logged-in guest users or local progress
  useEffect(() => {
    const entries = watchProgressStorage.getHistoryEntries();
    setLocalEntries(entries);
  }, []);

  // Fetch logged-in user history from server
  const { data: serverHistoryData } = useQuery({
    queryKey: ['watch-history-row', user?.id],
    queryFn: () => watchHistoryApi.getHistory(1, 20).then((r) => r.data),
    enabled: !!user,
  });

  // Convert server history into unified items
  const serverItems = useMemo(() => {
    const items = Array.isArray(serverHistoryData)
      ? serverHistoryData
      : serverHistoryData?.items || [];
    return items.map((item: any) => ({
      slug: item.movieId || item.movieSlug || item.slug,
      epSlug: item.episode || '1',
      epName: item.episode ? `Tập ${item.episode}` : '',
      title: item.movieTitle || item.name || 'Phim đã xem',
      originName: item.originName || item.origin_name || item.titleEn || '',
      poster: item.poster || item.moviePoster || item.poster_url || item.movieThumb || item.thumb,
      thumb: item.movieThumb || item.thumb || item.thumb_url || item.backdrop || item.poster || item.moviePoster,
      year: item.year || item.movieYear,
      lang: item.lang || item.movieLang,
      quality: item.quality || item.movieQuality,
      currentTime: item.progress || 0,
      duration: item.duration || 5400,
      updatedAt: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now(),
    }));
  }, [serverHistoryData]);

  // Combine local & server items deduplicated by slug
  const historyEntries = useMemo(() => {
    const combined = [...localEntries, ...serverItems];
    const seen = new Set<string>();
    return combined.filter((item) => {
      if (!item.slug || seen.has(item.slug)) return false;
      seen.add(item.slug);
      return true;
    });
  }, [localEntries, serverItems]);

  const catalogBySlug = useMemo(() => {
    const map = new Map<string, FilmItem>();
    for (const film of fallbackFilms) {
      if (film.slug) map.set(film.slug, film);
      for (const sourceSlug of Object.values(film._sourceSlugs || {})) {
        if (sourceSlug) map.set(sourceSlug, film);
      }
    }
    return map;
  }, [fallbackFilms]);

  const catalogByTitle = useMemo(() => {
    const map = new Map<string, FilmItem>();
    for (const film of fallbackFilms) {
      for (const title of [film.name, film.title, film.origin_name]) {
        const identity = historyIdentity(title);
        if (identity && !map.has(identity)) map.set(identity, film);
      }
    }
    return map;
  }, [fallbackFilms]);

  const { t } = useTranslation();
  const hasHistory = historyEntries.length > 0;
  const sectionTitle = t('home.historyTitle', 'Lịch sử xem');

  if (!hasHistory) return null;

  // Remove single local item from watch progress
  const handleRemoveItem = (e: React.MouseEvent, slug: string, epSlug?: string) => {
    e.preventDefault();
    e.stopPropagation();
    watchProgressStorage.removeEntry(slug, epSlug);
    setLocalEntries((prev) => prev.filter((item) => item.slug !== slug));
  };

  return (
    <div
      data-history-row="true"
      className={`${cardFont.className} w-full mb-10 relative group/section`}
    >
      {/* Header: "Lịch sử xem" + "Xem tất cả >" + Dash Pagination */}
      <div className="mb-3 flex items-start justify-between gap-2 px-1 sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
          <h2
            data-history-title="true"
            className={`${cardFont.className} min-w-0 flex-1 text-lg font-extrabold tracking-tight text-white sm:flex-none md:text-xl`}
          >
            {sectionTitle}
          </h2>
          {hasHistory && (
            <Link
              href="/history"
              data-history-action="true"
              className="group/link inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs sm:text-sm font-semibold text-white/80 hover:text-white transition-colors select-none ml-1.5"
            >
              <span>{t('home.viewAll', 'Xem tất cả')}</span>
              <ChevronRight
                size={14}
                className="stroke-[2.2] text-white/60 group-hover/link:text-white transition-transform group-hover/link:translate-x-0.5"
              />
            </Link>
          )}
        </div>

        {/* Dynamic Dash Line Pagination Indicators (— - - - -) */}
        <div className="hidden sm:block">
          <DashPagination swiper={swiper} />
        </div>
      </div>

      {/* Main Carousel Area with Fixed Slide Widths */}
      <div className="flex items-stretch gap-3.5">
        <div className="flex-1 min-w-0 overflow-hidden">
          <Swiper
            modules={[Navigation, FreeMode]}
            onSwiper={(s) => setSwiper(s)}
            navigation={{
              prevEl: prevRef.current,
              nextEl: nextRef.current,
            }}
            onBeforeInit={(swiper: any) => {
              if (swiper.params.navigation && typeof swiper.params.navigation !== 'boolean') {
                swiper.params.navigation.prevEl = prevRef.current;
                swiper.params.navigation.nextEl = nextRef.current;
              }
            }}
            speed={500}
            slidesPerGroup={2}
            freeMode={{ enabled: true, momentumRatio: 0.8 }}
            spaceBetween={10}
            breakpoints={{
              360: { slidesPerView: 1.8, spaceBetween: 10 },
              480: { slidesPerView: 2.3, spaceBetween: 12 },
              640: { slidesPerView: 3.2, spaceBetween: 14 },
              768: { slidesPerView: 3.8, spaceBetween: 16 },
              1024: { slidesPerView: 4.4, spaceBetween: 16 },
              1280: { slidesPerView: 5.0, spaceBetween: 18 },
            }}
            className="w-full !pb-3 !pt-1 !pl-0.5"
          >
            {historyEntries.map((item: any, idx: number) => {
              const { title, watchedStr, totalStr, percent, epLabel, qualityBadge } =
                getHistoryProgressDetails(item);
              const catalogFilm =
                catalogBySlug.get(item.slug) || catalogByTitle.get(historyIdentity(title));

              return (
                <SwiperSlide key={`continue-${item.slug}-${item.epSlug || ''}-${idx}`}>
                  <div className="w-full shrink-0">
                    <Link
                      href={`/watch/${item.slug}${item.epSlug ? `?ep=${item.epSlug}` : ''}`}
                      className="group/card block relative select-none cursor-pointer"
                    >
                      {/* 16:9 Landscape Card Image */}
                      <div className="aspect-video w-full rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 group-hover/card:border-white/40 group-hover/card:scale-[1.02] shadow-xl bg-neutral-900 transition-all duration-300 relative">
                        <HistoryArtwork
                          item={item}
                          catalogFilm={catalogFilm}
                          landscape
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                        />

                        {/* Gradient Bottom Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover/card:opacity-50 transition-opacity" />

                        {/* Badges in Bottom Left: [Tập 1] [HD] */}
                        <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1.5 pointer-events-none">
                          <span className="bg-[#7c3aed] text-white text-[9.5px] font-black px-1.5 py-0.5 rounded shadow tracking-tight uppercase">
                            {epLabel}
                          </span>
                          <span className="bg-black/85 border border-white/20 text-neutral-300 text-[9.5px] font-bold px-1.5 py-0.5 rounded shadow uppercase">
                            {qualityBadge}
                          </span>
                        </div>

                        {/* Play Button Icon on Hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity z-20 bg-black/40">
                          <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform scale-75 group-hover/card:scale-100 transition-transform">
                            <Play size={16} fill="currentColor" className="ml-0.5" />
                          </div>
                        </div>

                        {/* Remove Button on hover */}
                        <button
                          onClick={(e) => handleRemoveItem(e, item.slug, item.epSlug)}
                          title="Xóa khỏi lịch sử xem"
                          aria-label="Xóa khỏi lịch sử xem"
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-white/70 hover:text-white transition-all opacity-0 group-hover/card:opacity-100 z-30 cursor-pointer shadow-md"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {/* Content Underneath: Title + Info Row + Continuous Red Progress Bar */}
                      <div className="mt-2 px-0.5 space-y-1">
                        {/* Film Title */}
                        <h3
                          className={`${cardFont.className} text-xs sm:text-sm font-bold text-white leading-snug line-clamp-1 group-hover/card:text-red-400 transition-colors tracking-tight`}
                        >
                          {title}
                        </h3>

                        {/* Progress Meta Line: "Đã xem: 34p" ... "141p" */}
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-medium leading-none pt-0.5">
                          <span>{watchedStr}</span>
                          <span>{totalStr}</span>
                        </div>

                        {/* Continuous Red Progress Bar Line */}
                        <div className="w-full h-[3px] bg-neutral-800 rounded-full overflow-hidden mt-1.5">
                          <div
                            className="h-full bg-[#e50914] rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>

        {/* Minimalist Navigation Buttons Column */}
        <div className="hidden sm:flex flex-col justify-center gap-3 shrink-0 px-1 my-auto">
          <button
            ref={nextRef}
            aria-label="Xem tiếp slide sau"
            title="Xem tiếp slide sau"
            className="p-1.5 text-white/40 hover:text-white transition-all cursor-pointer hover:scale-125 active:scale-90 disabled:opacity-15 disabled:pointer-events-none"
          >
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>
          <button
            ref={prevRef}
            aria-label="Xem tiếp slide trước"
            title="Xem tiếp slide trước"
            className="p-1.5 text-white/40 hover:text-white transition-all cursor-pointer hover:scale-125 active:scale-90 disabled:opacity-15 disabled:pointer-events-none"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
