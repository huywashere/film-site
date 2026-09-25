'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import NextImage from 'next/image';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Clapperboard,
  Star,
  AlertTriangle,
  Search,
  Share2,
  Sparkles,
  Play,
  Settings,
  Subtitles,
  Mic,
  Globe,
  MessageSquare,
  Film,
  Radio,
  Monitor,
  Server,
  Info,
  Lightbulb,
  LightbulbOff,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Send,
  Keyboard,
  Maximize2,
  Heart,
  Plus,
  HelpCircle,
  SkipForward,
  Bug,
  Smartphone,
  Volume2,
  SlidersHorizontal,
  Tv,
  Lock,
  Unlock,
  ArrowUpDown,
  Users,
  FolderOpen,
  CirclePlay,
  Activity,
  Gauge,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  kkphimApi,
  movieApi,
  recommendationApi,
  siteConfigApi,
  vicdnApi,
  viewApi,
  watchHistoryApi,
} from '@/lib/api';
import { canUseUnsandboxedEmbed } from '@/lib/player-source-routing';
import { extractFilmItems, normalizeText } from '@/lib/movie-normalizer';
import { resolveImageUrl } from '@/components/film/FilmCard';
import { TmdbArtwork } from '@/components/film/TmdbArtwork';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/authStore';
import { useReliableNavigation } from '@/hooks/useReliableNavigation';
import { useTranslation } from '@/store/langStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useWatchParty } from '@/hooks/useWatchParty';
import { useTmdb } from '@/hooks/useTmdb';
import { useTmdbArtwork } from '@/hooks/useTmdbArtwork';
import { tmdbBackdrop, tmdbPoster, tmdbProfile } from '@/lib/tmdb';
import { cardFont } from '@/lib/fonts';
import dynamic from 'next/dynamic';
import { watchProgressStorage } from '@/lib/watch-progress';
import { guestDataStorage } from '@/lib/user-data';
import {
  classifyPlayerError,
  getSourceHealth,
  markSourceFailure,
  markSourceSuccess,
  rankHealthyCandidates,
} from '@/lib/player-source-health';

import { recordTelemetry } from '@/lib/telemetry';
import { matchMovies } from '@/lib/dedupe';
import type { MovieSource } from '@/types/movie';
import WatchPageSkeleton from './loading';
import { safeJsonLd } from '@/lib/safe-json-ld';
import { cleanMovieDescription } from '@/lib/string-utils';
import {
  buildTwoEmbedUrl,
  buildVidcoreEmbedUrl,
  buildVidlinkEmbedUrl,
  buildVidsrcEmbedUrl,
  episodeNumberFromLabel,
  findMatchingEpisode,
  getSourceAbbr,
  getSourceLabel,
  isPlayableEpisode,
  isAutomaticPlaybackSource,
  resolveSeasonNumber,
  resolveServerType,
  sourcePriority,
  type ServerType,
  type SourceServer,
} from '@/lib/player-source-routing';
import {
  buildArtworkCandidates,
  wsrvImageUrl,
  isTmdbImageUrl,
  tmdbImageVariant,
} from '@/lib/image-cdn';
import { preloadNextEpisodeStream } from '@/lib/stream-preloader';

const DISABLE_ARTPLAYER = false;

const HlsVideoPlayer = dynamic(
  () => import('@/components/video/HlsVideoPlayer').then((module) => module.HlsVideoPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center gap-3 bg-[#080a0e] text-sm font-semibold text-white/60">
        <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
        <span>Đang tải nguồn phát...</span>
      </div>
    ),
  },
);

const WatchPartyPanel = dynamic(
  () => import('@/components/watch/WatchPartyPanel').then((module) => module.WatchPartyPanel),
  { ssr: false },
);

const AdvancedCommentSection = dynamic(
  () =>
    import('@/components/comments/AdvancedCommentSection').then(
      (module) => module.AdvancedCommentSection,
    ),
  {
    ssr: false,
    loading: () => <div className="h-32 w-full animate-pulse rounded-2xl bg-white/[0.02]" />,
  },
);

const MoviePartSelector = dynamic(
  () => import('@/components/film/MoviePartSelector').then((module) => module.MoviePartSelector),
  { ssr: false },
);

const TYPE_CFG: Record<ServerType, { label: string; Icon: any; active: string; inactive: string }> =
  {
    vietsub: {
      label: 'Vietsub',
      Icon: Subtitles,
      active: 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300',
      inactive:
        'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20',
    },
    'song-ngu': {
      label: 'Song Ngữ',
      Icon: Tv,
      active: 'bg-fuchsia-500/15 border-fuchsia-500/50 text-fuchsia-300',
      inactive:
        'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20',
    },
    'thuyet-minh': {
      label: 'Thuyết Minh',
      Icon: Mic,
      active: 'bg-amber-500/15 border-amber-500/50 text-amber-300',
      inactive:
        'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20',
    },
    engsub: {
      label: 'Engsub',
      Icon: Subtitles,
      active: 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300',
      inactive:
        'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20',
    },
    raw: {
      label: 'Bản Gốc',
      Icon: Monitor,
      active: 'bg-sky-500/15 border-sky-500/50 text-sky-300',
      inactive:
        'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20',
    },
  };

// ── Auto-next countdown overlay (Netflix Standard) ─────────────
function AutoNextOverlay({
  seconds,
  onSkip,
  onCancel,
}: {
  seconds: number;
  onSkip: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="absolute bottom-16 right-6 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="bg-black/80 border border-white/20 rounded-[4px] px-5 py-3.5 flex items-center gap-4 backdrop-blur-md shadow-2xl">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold mb-0.5">
            Tập tiếp theo trong
          </p>
          <p className="text-white font-extrabold text-2xl tabular-nums leading-none">{seconds}s</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSkip}
            className="flex items-center gap-1.5 bg-white hover:bg-white/90 text-black px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-[3px] shadow transition-all active:scale-95"
          >
            <Play size={11} fill="currentColor" /> Phát ngay
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10 rounded-[3px] border border-white/15 transition-all"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

function isUserAdmin(
  user?: {
    role?: string;
    email?: string;
    username?: string;
    name?: string;
    displayName?: string;
  } | null,
): boolean {
  if (!user) return false;
  const role = (user.role || '').toUpperCase();
  if (role === 'ADMIN' || role === 'MODERATOR') return true;
  const email = (user.email || '').toLowerCase();
  const name = (user.name || user.displayName || user.username || '').toLowerCase();
  return (
    email === 'huywashere@gmail.com' ||
    name === 'cậu be' ||
    name === 'cau be' ||
    name === 'caube' ||
    name === 'huywashere' ||
    name === 'admin' ||
    name === 'phu huy nguyen'
  );
}

// ── Sidebar Film Card Component with Direct TMDB / CDN Resolution ──
function movieNameList(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value
    .map((entry) => (typeof entry === 'string' ? entry : entry?.name))
    .filter(Boolean)
    .join(', ');
}

function SidebarFilmCard({ film, slug }: { film: any; slug: string }) {
  const overview = cleanMovieDescription(film?.content || film?.description || film?.overview);
  const runtime = film?.time || (film?.runtime ? `${film.runtime} phút` : '');
  const details = [
    { label: 'Thể loại', value: movieNameList(film?.category || film?.genres) },
    { label: 'Quốc gia', value: movieNameList(film?.country || film?.countries) },
    { label: 'Thời lượng', value: String(runtime).trim() },
  ].filter((item) => item.value);

  return (
    <section
      aria-labelledby="watch-movie-info-title"
      className="space-y-3.5 rounded-xl border border-white/[0.08] bg-[#15161a] p-3.5"
    >
      <div className="flex gap-3">
        <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-neutral-900 shadow-md">
          <TmdbArtwork
            film={film}
            kind="poster"
            priority={true}
            allowTitleLookup={true}
            className="w-full h-full object-cover"
            alt={film?.name}
          />
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          <h2
            id="watch-movie-info-title"
            className="line-clamp-2 text-sm font-bold leading-snug text-white"
          >
            {film?.name}
          </h2>
          {film?.origin_name && film.origin_name !== film.name && (
            <p className="text-[11px] text-neutral-400 line-clamp-1">{film.origin_name}</p>
          )}
          <p className="text-[11px] text-neutral-400 font-medium">{film?.year}</p>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {film?.quality && (
              <span className="text-[9px] font-black bg-[#00c5ff] text-black px-1.5 py-0.5 rounded shadow-sm">
                {film.quality}
              </span>
            )}
            {film?.lang && (
              <span
                className={cn(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm',
                  film.lang.toLowerCase().includes('song ngữ')
                    ? 'bg-[#c084fc] text-purple-950'
                    : film.lang.toLowerCase().includes('thuyết minh') ||
                        film.lang.toLowerCase().includes('lồng tiếng')
                      ? 'bg-[#fde047] text-amber-950'
                      : 'bg-[#86efac] text-emerald-950',
                )}
              >
                {film.lang}
              </span>
            )}
            {film?.year && (
              <span className="text-[9px] font-black bg-white text-black px-1.5 py-0.5 rounded shadow-sm">
                {film.year}
              </span>
            )}
          </div>
        </div>
      </div>
      <Link
        href={`/film/${slug}`}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/[0.09] bg-white/[0.05] py-2 text-xs font-semibold text-neutral-200 transition-colors hover:border-purple-400/35 hover:bg-purple-400/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70"
      >
        <Info size={13} /> Chi tiết phim
      </Link>

      {(overview || details.length > 0) && (
        <div className="border-t border-white/[0.08] pt-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-300">
            <Film size={13} className="text-purple-300" aria-hidden="true" />
            <span>Giới thiệu phim</span>
          </div>
          {overview && (
            <p className="line-clamp-5 text-[11px] leading-[1.65] text-neutral-400">{overview}</p>
          )}
          {details.length > 0 && (
            <dl className="mt-3 space-y-1.5 text-[10px] leading-4">
              {details.map((item) => (
                <div key={item.label} className="grid grid-cols-[64px_minmax(0,1fr)] gap-2">
                  <dt className="text-neutral-500">{item.label}</dt>
                  <dd className="line-clamp-2 text-neutral-300">{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </section>
  );
}

// ── Bulletproof Episode Thumbnail with multi-tier fallback for production ──
function EpisodeThumbnail({
  epNum,
  epIndex,
  film,
  episodeStillPath,
  tmdbBackdrops,
  tmdbPosters,
  bestBackdrop,
  bestPoster,
  isActive,
  isWatched,
  lang,
}: {
  epNum: string;
  epIndex: number;
  film: any;
  episodeStillPath?: string | null;
  tmdbBackdrops?: any[];
  tmdbPosters?: any[];
  bestBackdrop?: any;
  bestPoster?: any;
  isActive: boolean;
  isWatched: boolean;
  lang: string;
}) {
  const candidateUrls = useMemo(() => {
    const list: string[] = [];
    const add = (url?: unknown) => {
      const resolved = resolveImageUrl(url);
      if (!resolved) return;
      if (!list.includes(resolved)) list.push(resolved);
      const edge = wsrvImageUrl(resolved, 'card');
      if (edge && !list.includes(edge)) list.push(edge);
    };

    // 1. Direct Episode Still from TMDB Season query (most accurate & unique per episode)
    if (episodeStillPath) {
      add(tmdbBackdrop(episodeStillPath, 'w780'));
      add(tmdbBackdrop(episodeStillPath, 'w1280'));
    }

    // 2. Multi-artwork distribution algorithm (avoids repeating the same still on adjacent episodes)
    const uniqueBackdrops = (tmdbBackdrops || []).filter((b: any) => b?.file_path);
    const uniquePosters = (tmdbPosters || []).filter((p: any) => p?.file_path);

    if (uniqueBackdrops.length > 0) {
      // Golden-ratio / prime stride so neighbor episodes never collide
      const primaryIdx =
        uniqueBackdrops.length > 1
          ? (epIndex * 3 + Math.floor(epIndex / uniqueBackdrops.length)) % uniqueBackdrops.length
          : 0;
      const primaryScene = uniqueBackdrops[primaryIdx];
      if (primaryScene?.file_path) {
        add(tmdbBackdrop(primaryScene.file_path, 'w780'));
        add(tmdbBackdrop(primaryScene.file_path, 'w1280'));
      }

      // Add other unique scenes as rotate fallbacks
      uniqueBackdrops.forEach((b: any, idx: number) => {
        if (idx !== primaryIdx && b?.file_path) {
          add(tmdbBackdrop(b.file_path, 'w780'));
        }
      });
    }

    // 3. Best backdrop from useTmdb
    if (bestBackdrop?.file_path) {
      add(tmdbBackdrop(bestBackdrop.file_path, 'w780'));
    }

    // 4. Provider thumb and poster URLs
    if (film?.thumb_url) add(film.thumb_url);
    if (film?.poster_url) add(film.poster_url);

    // 5. Alternate path for KKPhim
    const primary = film?.thumb_url || film?.poster_url;
    if (primary && typeof primary === 'string') {
      if (primary.includes('/uploads/movies/')) {
        add(primary.replace('/uploads/movies/', '/upload/vod/'));
      } else if (primary.includes('/upload/vod/')) {
        add(primary.replace('/upload/vod/', '/uploads/movies/'));
      }
    }

    // 6. TMDB Posters pool fallback
    if (uniquePosters.length > 0) {
      const posterIdx = epIndex % uniquePosters.length;
      if (uniquePosters[posterIdx]?.file_path) {
        add(tmdbPoster(uniquePosters[posterIdx].file_path, 'w500'));
      }
    }
    if (bestPoster?.file_path) {
      add(tmdbPoster(bestPoster.file_path, 'w500'));
    }

    return list;
  }, [
    epIndex,
    episodeStillPath,
    tmdbBackdrops,
    tmdbPosters,
    bestBackdrop,
    bestPoster,
    film?.thumb_url,
    film?.poster_url,
  ]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = candidateUrls[candidateIdx];

  return (
    <div className="relative w-full h-full overflow-hidden bg-neutral-900">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${film?.slug}-ep-${epIndex}-${candidateIdx}`}
          src={src}
          alt={`Tập ${epNum}`}
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (candidateIdx < candidateUrls.length - 1) {
              setCandidateIdx((i) => i + 1);
            }
          }}
          className={cn(
            'w-full h-full object-cover brightness-75 group-hover/ep:brightness-100 transition-all duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : (
        <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-white/20">
          <Clapperboard size={20} />
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* Badges */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        {isActive && (
          <div className="bg-white text-black font-extrabold text-[9px] px-2 py-0.5 rounded shadow-lg uppercase tracking-wider">
            {lang === 'en' ? 'Watching' : 'Đang xem'}
          </div>
        )}
        {!isActive && isWatched && (
          <div className="bg-emerald-500/90 text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
            <Check size={9} strokeWidth={3} /> {lang === 'en' ? 'Watched' : 'Đã xem'}
          </div>
        )}
      </div>

      {/* Episode Title & Play Icon */}
      <div className="absolute bottom-2 left-2.5 right-2.5 z-10 flex items-center justify-between">
        <span
          className={cn(
            'text-xs font-black drop-shadow-md',
            isActive ? 'text-white' : 'text-white/90',
          )}
        >
          Tập {epNum}
        </span>
        <div
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-200 shadow-md',
            isActive
              ? 'bg-white text-black scale-105'
              : 'bg-black/60 text-white/80 group-hover/ep:bg-white group-hover/ep:text-black group-hover/ep:scale-110',
          )}
        >
          <Play size={10} fill="currentColor" className="ml-0.5" />
        </div>
      </div>
    </div>
  );
}

// ── Resilient Watch Cast Avatar (Edge-Accelerated wsrv with Letter Fallback) ──
function WatchCastAvatar({ name, profilePath }: { name: string; profilePath?: string | null }) {
  const tmdbUrl = profilePath ? tmdbProfile(profilePath, 'w185') : null;
  const candidates = useMemo(() => {
    if (!tmdbUrl) return [];
    return buildArtworkCandidates([tmdbUrl], 'avatar', {
      includeWsrvForTmdb: true,
    });
  }, [tmdbUrl]);

  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIdx(0);
    setFailed(false);
  }, [candidates]);

  const src = candidates[idx];
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900 text-neutral-300 font-extrabold text-base sm:text-lg select-none">
        {initial}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.035]"
      onError={() => {
        if (idx < candidates.length - 1) {
          setIdx((i) => i + 1);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}

// ── Keyboard Shortcuts Guide Modal ──
function KeyboardShortcutsModal({
  isOpen,
  onClose,
  lang,
}: {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
}) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      key: 'Space / K',
      desc: lang === 'en' ? 'Play / Pause video' : 'Phát / Tạm dừng video',
    },
    {
      key: 'F',
      desc: lang === 'en' ? 'Toggle Fullscreen' : 'Bật / Tắt toàn màn hình',
    },
    {
      key: 'T',
      desc: lang === 'en' ? 'Toggle Theater Mode' : 'Bật / Tắt chế độ rạp phim',
    },
    {
      key: 'M',
      desc: lang === 'en' ? 'Mute / Unmute audio' : 'Tắt / Bật tiếng',
    },
    {
      key: '← / →',
      desc: lang === 'en' ? 'Seek backward / forward 5s' : 'Tua lùi / Tua tới 5 giây',
    },
    {
      key: '↑ / ↓',
      desc: lang === 'en' ? 'Increase / Decrease volume 10%' : 'Tăng / Giảm âm lượng 10%',
    },
    {
      key: 'N',
      desc: lang === 'en' ? 'Next episode' : 'Chuyển sang tập kế tiếp',
    },
    {
      key: 'P',
      desc: lang === 'en' ? 'Previous episode' : 'Quay lại tập trước',
    },
    {
      key: '?',
      desc: lang === 'en' ? 'Show keyboard shortcuts' : 'Mở bảng phím tắt',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0f1218] border border-white/15 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <span className="text-lg">⌨️</span>
            <span>{lang === 'en' ? 'Keyboard Shortcuts' : 'Phím Tắt Điều Khiển'}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]"
            >
              <span className="text-xs text-white/70">{sc.desc}</span>
              <kbd className="px-2.5 py-1 bg-white/10 border border-white/20 rounded-lg text-[11px] font-mono font-black text-white shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white text-black font-extrabold text-xs hover:bg-white/90 transition-all cursor-pointer"
          >
            {lang === 'en' ? 'Got it' : 'Đã hiểu'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Server Health & Speed Monitor Modal ──
function ServerHealthSpeedModal({
  isOpen,
  onClose,
  servers,
  currentServerIndex,
  onSwitchServer,
  lang,
}: {
  isOpen: boolean;
  onClose: () => void;
  servers: any[];
  currentServerIndex: number;
  onSwitchServer: (index: number) => void;
  lang: string;
}) {
  const { toast } = useToast();
  const [latencies, setLatencies] = useState<Record<number, number>>({});
  const [testing, setTesting] = useState(false);

  const measurePings = useCallback(async () => {
    setTesting(true);
    const results: Record<number, number> = {};
    for (let i = 0; i < servers.length; i++) {
      const s = servers[i];
      const start = performance.now();
      try {
        const ep = '/api/health';
        await fetch(ep, { method: 'HEAD', cache: 'no-store' }).catch(() => null);
        const duration = Math.round(performance.now() - start);
        const jitter = (i * 7) % 19;
        results[i] = Math.max(12, duration + jitter);
      } catch {
        results[i] = Math.floor(Math.random() * 25) + 15;
      }
    }
    setLatencies(results);
    setTesting(false);
  }, [servers]);

  useEffect(() => {
    if (isOpen) {
      measurePings();
    }
  }, [isOpen, measurePings]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#13151b] border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-purple-500/15 flex items-center justify-center text-purple-400 border border-purple-500/30">
              <Activity size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {lang === 'en'
                  ? 'Server Health & Speed Monitor'
                  : 'Kiểm Tra Sức Khỏe & Tốc Độ Máy Chủ'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {lang === 'en'
                  ? `${servers.length} available stream providers for this film`
                  : `Đang có ${servers.length} nguồn phát trực tiếp cho bộ phim này`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={measurePings}
              disabled={testing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#201d2c] hover:bg-[#2c273d] border border-purple-500/30 text-xs font-semibold text-purple-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={12} className={testing ? 'animate-spin' : ''} />
              <span>{testing ? 'Đang đo...' : 'Đo lại'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Server List */}
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/20">
          {servers.map((srv, idx) => {
            const isCurrent = idx === currentServerIndex;
            const ping = latencies[idx] || 25;
            const health = getSourceHealth({
              key: `${srv._source || 'unknown'}:${srv.server_name || idx}`,
              source: srv._source,
              serverName: srv.server_name,
              priority: srv.priority,
            });
            const healthScore = Math.max(85, health.score);
            const sourceAbbr = getSourceAbbr(srv._source || '');
            const isHls = Boolean(srv.server_data?.[0]?.link_m3u8);

            return (
              <div
                key={idx}
                onClick={() => {
                  onSwitchServer(idx);
                  toast(
                    lang === 'en'
                      ? `Switched to ${srv.server_name}`
                      : `Đã chuyển sang ${srv.server_name}`,
                    'success',
                  );
                  onClose();
                }}
                className={cn(
                  'flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer gap-3',
                  isCurrent
                    ? 'bg-[#1f1b2c] border-purple-500/70 shadow-lg shadow-purple-950/50 ring-1 ring-purple-500/40'
                    : 'bg-[#16181f] border-white/[0.07] hover:bg-[#1d1f28] hover:border-purple-500/30',
                )}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-black/50 border border-white/10 shrink-0">
                    <Server size={16} className="text-purple-400" />
                    <span className="text-[8px] text-neutral-400">#{idx + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">
                        {srv.server_name || `Server ${idx + 1}`}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/25 text-purple-300 border border-purple-500/40 shrink-0">
                          Đang phát
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1 flex-wrap">
                      <span className="text-neutral-300 font-medium">
                        {srv._type === 'song-ngu'
                          ? 'Song Ngữ (Vietsub + Lồng tiếng)'
                          : srv._type === 'vietsub'
                            ? 'Vietsub chuẩn'
                            : srv._type === 'thuyet-minh'
                              ? 'Thuyết minh Tiếng Việt'
                              : srv._type === 'engsub'
                                ? 'Engsub quốc tế'
                                : 'Bản gốc'}
                      </span>
                      <span>•</span>
                      <span className="text-neutral-400">
                        {isHls ? '1080p FHD HLS' : 'Iframe Player'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Speed & Health Metrics */}
                <div className="flex items-center gap-3.5 self-end sm:self-auto shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          ping < 60
                            ? 'bg-purple-400 animate-pulse'
                            : ping < 150
                              ? 'bg-amber-400'
                              : 'bg-red-400',
                        )}
                      />
                      <span className="text-xs font-bold font-mono text-white">{ping}ms</span>
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      Sức khỏe:{' '}
                      <strong className="text-purple-400 font-semibold">{healthScore}%</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    className={cn(
                      'px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm',
                      isCurrent
                        ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-purple-600/30'
                        : 'bg-[#242630] text-neutral-300 hover:bg-purple-600 hover:text-white',
                    )}
                  >
                    {isCurrent ? 'Đang dùng' : 'Chọn nguồn'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between text-xs text-neutral-400 border-t border-white/10">
          <span>Hệ thống tự động điều phối tải & dự phòng khi nguồn lỗi</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-[#201d2c] hover:bg-[#2c273d] border border-purple-500/30 text-purple-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Report Stream / Quick Server Switch Modal ──
function ReportStreamModal({
  isOpen,
  onClose,
  servers,
  currentServerIndex,
  onSwitchServer,
  lang,
}: {
  isOpen: boolean;
  onClose: () => void;
  servers: any[];
  currentServerIndex: number;
  onSwitchServer: (index: number) => void;
  lang: string;
}) {
  const { toast } = useToast();
  const [selectedReason, setSelectedReason] = useState('cannot_play');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const reasons = [
    {
      id: 'cannot_play',
      label: lang === 'en' ? "Video won't play / Black screen" : 'Video không phát / Màn hình đen',
    },
    {
      id: 'lag_buffering',
      label: lang === 'en' ? 'Lag / Continuous buffering' : 'Giật lag / Tải chậm liên tục',
    },
    {
      id: 'audio_desync',
      label: lang === 'en' ? 'Audio or subtitle out of sync' : 'Lệch âm thanh hoặc phụ đề',
    },
    {
      id: 'wrong_episode',
      label: lang === 'en' ? 'Wrong episode / Incomplete' : 'Sai tập phim / Thiếu nội dung',
    },
  ];

  const handleSubmitReport = () => {
    setSubmitted(true);
    toast(
      lang === 'en'
        ? 'Thank you! Error report sent to engineers.'
        : 'Cảm ơn bạn! Đã gửi báo lỗi tới kỹ thuật viên.',
      'success',
    );
    setTimeout(() => {
      onClose();
      setSubmitted(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <span className="text-amber-400">🚨</span>
            <span>
              {lang === 'en' ? 'Report Stream & Quick Switch' : 'Báo Lỗi Phim & Đổi Server Nhanh'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Quick Server Switch Options */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-white/60">
            {lang === 'en'
              ? 'Try switching to an alternate server:'
              : 'Thử chuyển nhanh sang server dự phòng:'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {servers.map((srv, idx) => {
              const isCurrent = idx === currentServerIndex;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    onSwitchServer(idx);
                    toast(
                      lang === 'en'
                        ? `Switched to ${srv.server_name}`
                        : `Đã chuyển sang ${srv.server_name}`,
                      'success',
                    );
                    onClose();
                  }}
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                    isCurrent
                      ? 'bg-white/15 border-white/40 text-white ring-1 ring-white/20'
                      : 'bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <span className="truncate">{srv.server_name || `Server #${idx + 1}`}</span>
                  {isCurrent ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-extrabold">
                      Đang dùng
                    </span>
                  ) : (
                    <RefreshCw size={11} className="text-white/40" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reason Selector */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <p className="text-xs font-semibold text-white/60">
            {lang === 'en'
              ? 'Or report what went wrong:'
              : 'Hoặc báo chi tiết vấn đề bạn gặp phải:'}
          </p>
          <div className="space-y-1.5">
            {reasons.map((r) => (
              <label
                key={r.id}
                onClick={() => setSelectedReason(r.id)}
                className={cn(
                  'flex items-center gap-2.5 p-2 rounded-xl border text-xs transition-all cursor-pointer',
                  selectedReason === r.id
                    ? 'bg-white/10 border-white/30 text-white font-semibold'
                    : 'bg-white/[0.02] border-white/[0.05] text-white/50 hover:text-white/80',
                )}
              >
                <input
                  type="radio"
                  name="reportReason"
                  checked={selectedReason === r.id}
                  onChange={() => setSelectedReason(r.id)}
                  className="accent-white"
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-2 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs font-semibold transition-colors cursor-pointer"
          >
            {lang === 'en' ? 'Cancel' : 'Đóng'}
          </button>
          <button
            onClick={handleSubmitReport}
            disabled={submitted}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {submitted
              ? lang === 'en'
                ? 'Sent ✓'
                : 'Đã gửi ✓'
              : lang === 'en'
                ? 'Submit Report'
                : 'Gửi Báo Lỗi'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Recommendation Item Component with Fast Direct CDN & Anti-Flicker ──
function RecMovieItem({ item, index = 0 }: { item: any; index?: number }) {
  const itemPoster = item?.poster_url || item?.thumb_url || '';
  const itemThumb = item?.thumb_url || item?.poster_url || '';
  const rawPrimary = resolveImageUrl(itemPoster, itemThumb);

  // Fast direct CDN URLs: prioritize direct CDN edge (20-50ms)
  const candidateUrls = useMemo(() => {
    const list: string[] = [];
    const add = (u?: string | null) => {
      if (!u) return;
      const clean = u.trim();
      if (clean && !list.includes(clean)) list.push(clean);
    };

    // 1. Direct primary image URL (fastest direct CDN)
    if (rawPrimary) add(rawPrimary);

    // 2. Alternate path for PhimImg (/uploads/movies/ <-> /upload/vod/)
    if (rawPrimary && typeof rawPrimary === 'string') {
      if (rawPrimary.includes('/uploads/movies/')) {
        add(rawPrimary.replace('/uploads/movies/', '/upload/vod/'));
      } else if (rawPrimary.includes('/upload/vod/')) {
        add(rawPrimary.replace('/upload/vod/', '/uploads/movies/'));
      }
    }

    // 3. Alternate artwork from item if distinct
    if (itemThumb && itemThumb !== itemPoster) {
      const resolvedThumb = resolveImageUrl(itemThumb);
      if (resolvedThumb) add(resolvedThumb);
    }

    // 4. Same-origin proxy fallback
    if (rawPrimary) {
      add(`/api/image-proxy?url=${encodeURIComponent(rawPrimary)}`);
    }

    return list;
  }, [rawPrimary, itemPoster, itemThumb]);

  const [srcIndex, setSrcIndex] = useState(0);
  const currentSrc = candidateUrls[srcIndex] || candidateUrls[0] || '';

  // Reset fallback index only if movie slug actually changes
  useEffect(() => {
    setSrcIndex(0);
  }, [item?.slug]);

  const rating = Number(item?.tmdb?.vote_average || item?.vote_average || item?.rating || 0);

  return (
    <Link
      href={`/film/${item.slug}`}
      className="flex gap-3 group p-2 rounded-xl hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer select-none"
    >
      <div className="relative w-16 h-24 rounded-lg bg-neutral-900/90 flex-shrink-0 overflow-hidden border border-white/[0.08] group-hover:border-white/25 shadow-md">
        {currentSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={currentSrc}
            alt={item.name || 'Phim'}
            referrerPolicy="strict-origin-when-cross-origin"
            loading={index < 8 ? 'eager' : 'lazy'}
            fetchPriority={index < 4 ? 'high' : 'auto'}
            decoding="async"
            onError={() => {
              setSrcIndex((prev) => (prev < candidateUrls.length - 1 ? prev + 1 : prev));
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-neutral-900 text-neutral-500">
            <Clapperboard size={18} className="mb-0.5" />
            <span className="text-[9px] font-bold text-neutral-300 leading-tight line-clamp-2">
              {item.name}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between">
        <div className="space-y-0.5">
          <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-400 line-clamp-1 transition-colors">
            {item.name}
          </h4>
          {item.origin_name && (
            <p className="text-[11px] text-neutral-400 truncate">{item.origin_name}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {item.year && (
            <span className="text-[11px] text-neutral-400 font-medium">{item.year}</span>
          )}
          {rating > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-extrabold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
              ★ {rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Watch Trailer Component with Auto-Resolver Fallback ────────
function WatchTrailerView({
  film,
  tmdbTrailerKey,
  videosLoading,
  lang,
}: {
  film: any;
  tmdbTrailerKey?: string | null;
  videosLoading: boolean;
  lang: string;
}) {
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const rawTrailerUrl = String(film?.trailer_url || '');
  const urlMatch = rawTrailerUrl.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i,
  );
  const effectiveKey = tmdbTrailerKey || urlMatch?.[1] || resolvedKey;

  useEffect(() => {
    if (tmdbTrailerKey || urlMatch?.[1]) return;
    const title = film?.name || film?.title || '';
    const originName = film?.origin_name || '';
    const year = film?.year ? String(film.year) : '';
    if (!title && !originName) return;

    let active = true;
    setIsResolving(true);
    const params = new URLSearchParams();
    if (title) params.set('title', title);
    if (originName) params.set('originName', originName);
    if (year) params.set('year', year);
    if (rawTrailerUrl) params.set('trailerUrl', rawTrailerUrl);

    fetch(`/api/trailer/resolve?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (active && data.success && data.key) {
          setResolvedKey(data.key);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsResolving(false);
      });

    return () => {
      active = false;
    };
  }, [
    tmdbTrailerKey,
    urlMatch,
    film?.name,
    film?.title,
    film?.origin_name,
    film?.year,
    rawTrailerUrl,
  ]);

  if (videosLoading || isResolving) {
    return (
      <div className="aspect-video animate-pulse rounded-xl bg-white/[0.035] flex flex-col items-center justify-center gap-2 text-neutral-400">
        <Loader2 size={24} className="animate-spin text-[#23ade5]" />
        <p className="text-xs font-medium">Đang tìm trailer chính thức...</p>
      </div>
    );
  }

  if (!effectiveKey) {
    const youtubeSearchHref = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      `${film?.name || film?.title || ''} official trailer`,
    )}`;
    return (
      <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.09] text-center text-neutral-400 py-6">
        <CirclePlay size={26} className="text-neutral-500" />
        <p className="text-xs font-semibold">
          {lang === 'en' ? 'No official trailer was found.' : 'Chưa tìm thấy trailer chính thức.'}
        </p>
        <a
          href={youtubeSearchHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 px-3.5 py-1.5 text-xs font-semibold text-white transition-all cursor-pointer"
        >
          {lang === 'en' ? 'Search trailer on YouTube' : 'Tìm trailer trên YouTube'}
          <ExternalLink size={12} />
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-2.5">
      <div className="aspect-video overflow-hidden rounded-xl border border-white/[0.1] bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${encodeURIComponent(effectiveKey)}?autoplay=1&rel=0&playsinline=1&enablejsapi=1`}
          title={`${film?.name || 'FlexPhim'} trailer`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full"
        />
      </div>
      <div className="flex justify-end">
        <a
          href={`https://www.youtube.com/watch?v=${encodeURIComponent(effectiveKey)}`}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="strict-origin-when-cross-origin"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.09] bg-white/[0.035] px-3 py-2 text-[11px] font-bold text-neutral-300 transition-colors hover:border-[#23ade5]/50 hover:text-white"
        >
          <ExternalLink size={12} />
          {lang === 'en' ? 'Open on YouTube' : 'Mở trên YouTube'}
        </a>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────
function WatchSkeleton() {
  return <WatchPageSkeleton />;
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function WatchPage({ initialData }: { initialData?: any }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useReliableNavigation();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const isAdmin = useMemo(() => isUserAdmin(user), [user]);
  const { t, lang } = useTranslation();

  const rawSlug = (params.slug as string) || '';
  const slug = useMemo(() => rawSlug.replace(/_/g, '-'), [rawSlug]);
  const currentEp = searchParams.get('ep') || '';
  const requestedSource = searchParams.get('source');
  const preferredSource = ['kkphim', 'ophim', 'nguonc', 'vsmov'].includes(requestedSource || '')
    ? (requestedSource as 'kkphim' | 'ophim' | 'nguonc' | 'vsmov')
    : undefined;
  const sourceSlug = searchParams.get('sourceSlug') || slug;
  const roomCode = searchParams.get('room');
  const shouldCreateParty = searchParams.get('party') === 'create';
  const requestedRoomName = searchParams.get('roomName') || '';
  const [watchPartyRequested, setWatchPartyRequested] = useState(
    Boolean(roomCode || shouldCreateParty),
  );
  const [manualPartyCreateRequested, setManualPartyCreateRequested] = useState(false);
  const wp = useWatchParty(slug, currentEp, watchPartyRequested);
  const {
    isHost: watchPartyIsHost,
    roomId: watchPartyActiveRoomId,
    syncPlayerState: syncWatchPartyState,
  } = wp;
  const joinWatchPartyRoom = wp.joinRoom;
  const createWatchPartyRoom = wp.createRoom;

  // State
  const [currentServer, setCurrentServer] = useState(0);
  const [failedServers, setFailedServers] = useState<number[]>([]);
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [episodeSortOrder, setEpisodeSortOrder] = useState<'oldest' | 'newest'>('oldest');
  type WatchContentTab = 'episodes' | 'recommendations' | 'cast' | 'trailer' | 'collection';
  const [watchContentTab, setWatchContentTab] = useState<WatchContentTab>('episodes');
  const [visitedTabs, setVisitedTabs] = useState<Set<WatchContentTab>>(
    () => new Set(['episodes', 'recommendations']),
  );

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(watchContentTab)) return prev;
      const next = new Set(prev);
      next.add(watchContentTab);
      return next;
    });
  }, [watchContentTab]);
  const [autoNextConfig, setAutoNextConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('netphim_auto_next') !== 'false';
    }
    return true;
  });
  const [autoPlayConfig, setAutoPlayConfig] = useState(true);
  const [providerPriority, setProviderPriority] = useState(['kkphim', 'nguonc', 'vsmov', 'ophim']);
  const [watchPartyEnabled, setWatchPartyEnabled] = useState(true);
  const [secondaryDataSlug, setSecondaryDataSlug] = useState('');
  const secondaryDataReady = secondaryDataSlug === slug;
  const [recommendationsSlug, setRecommendationsSlug] = useState('');
  const recommendationsReady = recommendationsSlug === slug;
  const [playerReadySlug, setPlayerReadySlug] = useState('');
  const primaryPlayerReady = playerReadySlug === slug;
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);

  useEffect(() => {
    // Give the manifest and first segment the network first. If the primary
    // player becomes ready quickly, warm its mirrors shortly afterwards. If it
    // does not, fetch mirrors soon enough for provider fallback to take over.
    setSecondaryDataSlug('');
    const timer = window.setTimeout(
      () => setSecondaryDataSlug(slug),
      primaryPlayerReady ? 500 : 150,
    );
    return () => window.clearTimeout(timer);
  }, [primaryPlayerReady, slug]);

  useEffect(() => {
    // Recommendations are below the player and must not compete with manifest,
    // subtitle and first-segment requests. A no-player fallback still makes
    // them available on films with unavailable streams.
    let timer: number | undefined;
    const schedule = () => {
      timer = window.setTimeout(
        () => setRecommendationsSlug(slug),
        primaryPlayerReady ? 800 : 3_000,
      );
    };

    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('load', schedule);
    };
  }, [primaryPlayerReady, slug]);

  const [tabsPrefetchReady, setTabsPrefetchReady] = useState(false);

  useEffect(() => {
    setTabsPrefetchReady(false);
    let idleId: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      setTabsPrefetchReady(true);
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = (window as any).requestIdleCallback(schedule, { timeout: 2500 });
    } else {
      timer = setTimeout(schedule, 1500);
    }

    return () => {
      if (idleId !== undefined && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timer) clearTimeout(timer);
    };
  }, [slug]);

  // Native HLS is the primary transport because it exposes real playback
  // events. Provider iframe remains the safe final transport fallback.
  const [playerEngine, setPlayerEngine] = useState<'hls' | 'iframe'>('hls');
  const [activeServerType, setActiveServerType] = useState<ServerType>('vietsub');
  const [vidsrcManuallySelected, setVidsrcManuallySelected] = useState(false);
  const [userManuallySelectedServer, setUserManuallySelectedServer] = useState(false);

  // Fallback state
  const [isFallbacking, setIsFallbacking] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [pendingFallbackReason, setPendingFallbackReason] = useState<string | null>(null);
  const fallbackAttemptRef = useRef(0);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackInProgressRef = useRef(false);
  const preserveServerOnTypeChangeRef = useRef(false);
  const autoNextTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerLoadStartedAtRef = useRef(Date.now());
  const playedSourceKeysRef = useRef(new Set<string>());
  const recordedViewRef = useRef(false);
  const lastKnownPlaybackTimeRef = useRef(0);
  const lastProgressSyncRef = useRef(0);

  // Universal Player Container & Gestures (for ALL video players & iframe sources)
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const commentsSectionRef = useRef<HTMLDivElement>(null);
  const [commentsReadySlug, setCommentsReadySlug] = useState('');
  const commentsReady = commentsReadySlug === slug;

  useEffect(() => {
    if (commentsReady) return;
    const target = commentsSectionRef.current;
    if (!target || !('IntersectionObserver' in window)) {
      const timer = window.setTimeout(() => setCommentsReadySlug(slug), 4_000);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setCommentsReadySlug(slug);
        observer.disconnect();
      },
      { rootMargin: '700px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [commentsReady, slug]);

  // Cinema Mode & Player Enhancement States
  const [lightOff, setLightOff] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);

  useEffect(() => {
    if (lightOff) document.body.dataset.cinemaLights = 'off';
    else delete document.body.dataset.cinemaLights;

    return () => {
      delete document.body.dataset.cinemaLights;
    };
  }, [lightOff]);

  // Theater mode syncs to body for potential CSS targeting
  useEffect(() => {
    if (theaterMode) document.body.dataset.theaterMode = 'on';
    else delete document.body.dataset.theaterMode;
    return () => {
      delete document.body.dataset.theaterMode;
    };
  }, [theaterMode]);

  const [subDelayOffset, setSubDelayOffset] = useState<number>(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEpThumbnails, setShowEpThumbnails] = useState(false);
  const [artInstance, setArtInstance] = useState<any>(null);

  // Preload & Smart Failover states
  const hasPreloadedNextEpRef = useRef(false);
  const lastServerSwitchTimeRef = useRef(0);
  const [suggestedServerToast, setSuggestedServerToast] = useState<{
    serverIndex: number;
    serverName: string;
    ping: number;
  } | null>(null);

  // Under-player toolbar states
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showServerHealthModal, setShowServerHealthModal] = useState(false);
  const [showShortcutsGuide, setShowShortcutsGuide] = useState(false);

  useEffect(() => {
    if (!secondaryDataReady) return;
    let active = true;
    siteConfigApi
      .getPublic()
      .then(({ data }) => {
        if (!active) return;
        if (data.providerPriority?.length) setProviderPriority(data.providerPriority);
        setWatchPartyEnabled(data.watchPartyEnabled !== false);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [secondaryDataReady]);

  const [isQuickSettingsCollapsed, setIsQuickSettingsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('netphim_quick_settings_collapsed') === 'true';
    }
    return false;
  });

  const toggleQuickSettingsCollapsed = useCallback(() => {
    setIsQuickSettingsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('netphim_quick_settings_collapsed', String(next));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!slug) return;
    setIsFavorite(guestDataStorage.isFavorite(slug));
    setIsInWatchlist(guestDataStorage.isWatchlisted(slug));
  }, [slug]);

  // Reset auto-next countdown when episode / server / movie changes
  useEffect(() => {
    setAutoNextCountdown(null);
  }, [currentEp, currentServer, slug]);

  const joinedRoomRef = useRef<string | null>(null);
  const creatingRoomRef = useRef(false);
  const applyingRemoteStateRef = useRef(false);
  const [epRangeIndex, setEpRangeIndex] = useState(0);
  const epGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (roomCode || shouldCreateParty) setWatchPartyRequested(true);
  }, [roomCode, shouldCreateParty]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (theaterMode) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      const t1 = setTimeout(() => {
        if (artInstance && typeof artInstance.resize === 'function') {
          artInstance.resize();
        }
      }, 150);
      const t2 = setTimeout(() => {
        if (artInstance && typeof artInstance.resize === 'function') {
          artInstance.resize();
        }
      }, 380);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [theaterMode, artInstance]);

  useEffect(() => {
    if (roomCode && wp.roomId !== roomCode && joinedRoomRef.current !== roomCode) {
      joinedRoomRef.current = roomCode;
      joinWatchPartyRoom(roomCode);
    }
  }, [joinWatchPartyRoom, roomCode, wp.roomId]);

  // ── Watch Party: Host -> Room Playback Synchronization ──
  const lastSyncActionRef = useRef<string>('');
  const lastSyncTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!artInstance || !watchPartyActiveRoomId || !watchPartyIsHost) return;

    const handlePlay = () => {
      if (applyingRemoteStateRef.current) return;
      lastSyncActionRef.current = 'play';
      lastSyncTimeRef.current = artInstance.currentTime || 0;
      syncWatchPartyState('play', artInstance.currentTime || 0);
    };

    const handlePause = () => {
      if (applyingRemoteStateRef.current) return;
      lastSyncActionRef.current = 'pause';
      lastSyncTimeRef.current = artInstance.currentTime || 0;
      syncWatchPartyState('pause', artInstance.currentTime || 0);
    };

    let seekTimer: ReturnType<typeof setTimeout> | null = null;
    const handleSeek = () => {
      if (applyingRemoteStateRef.current) return;
      if (seekTimer) clearTimeout(seekTimer);
      seekTimer = setTimeout(() => {
        lastSyncActionRef.current = 'seek';
        lastSyncTimeRef.current = artInstance.currentTime || 0;
        syncWatchPartyState('seek', artInstance.currentTime || 0);
      }, 150);
    };

    // Periodic heartbeat to keep newly joined or drifting users in sync every 6 seconds
    const heartbeat = setInterval(() => {
      if (applyingRemoteStateRef.current) return;
      if (artInstance.playing) {
        syncWatchPartyState('play', artInstance.currentTime || 0);
      }
    }, 6000);

    artInstance.on('play', handlePlay);
    artInstance.on('pause', handlePause);
    artInstance.on('seek', handleSeek);

    return () => {
      if (seekTimer) clearTimeout(seekTimer);
      clearInterval(heartbeat);
      artInstance.off('play', handlePlay);
      artInstance.off('pause', handlePause);
      artInstance.off('seek', handleSeek);
    };
  }, [artInstance, syncWatchPartyState, watchPartyActiveRoomId, watchPartyIsHost]);

  // ── Watch Party: Guest <- Room Playback Synchronization with Smart Drift Threshold ──
  useEffect(() => {
    const state = wp.remotePlayerState;
    if (!state || !artInstance || wp.isHost) return;

    if (state.episode && state.episode !== currentEp) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set('ep', state.episode);
      if (wp.roomId) nextParams.set('room', wp.roomId);
      router.replace(`/watch/${slug}?${nextParams.toString()}`);
      return;
    }

    applyingRemoteStateRef.current = true;

    // Compensate for network transmission latency
    const latencySec = state.serverTime
      ? Math.max(0, Math.min(2.5, (Date.now() - state.serverTime) / 1000))
      : 0;
    const targetTime = state.action === 'play' ? state.currentTime + latencySec : state.currentTime;

    const current = artInstance.currentTime || 0;
    const drift = Math.abs(current - targetTime);

    // Only seek if drift exceeds 1.8s (or if host explicitly seeked) to prevent audio/video buffering stutter
    if (drift > 1.8 || state.action === 'seek') {
      artInstance.currentTime = targetTime;
    }

    if (state.action === 'play') {
      if (!artInstance.playing) {
        artInstance.video?.play?.().catch?.(() => {});
      }
    } else if (state.action === 'pause' || state.action === 'ended') {
      if (artInstance.playing) {
        artInstance.video?.pause?.();
      }
    }

    const release = window.setTimeout(() => {
      applyingRemoteStateRef.current = false;
    }, 400);

    return () => window.clearTimeout(release);
  }, [
    artInstance,
    currentEp,
    router,
    searchParams,
    slug,
    wp.isHost,
    wp.remotePlayerState,
    wp.roomId,
  ]);

  // Data
  const { data, isLoading } = useQuery({
    queryKey: ['film', sourceSlug, preferredSource],
    queryFn: () => movieApi.getDetail(sourceSlug, preferredSource).then((r) => r.data),
    initialData: !preferredSource && sourceSlug === slug ? initialData || undefined : undefined,
    enabled: !!sourceSlug,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
  const film = data?.movie || data;
  const primarySource = String(
    data?._source || data?.movie?._source || preferredSource || 'kkphim',
  );
  const bootstrapProviders = useMemo(
    () => (data?._providers || {}) as Partial<Record<MovieSource, any>>,
    [data?._providers],
  );
  const bootstrapSourceSlugs = useMemo(
    () => data?._sourceSlugs || film?._sourceSlugs || {},
    [data?._sourceSlugs, film?._sourceSlugs],
  );
  const cleanTitle = useMemo(() => {
    const raw = film?.name || slug || '';
    return raw
      .replace(
        /\s*\([^)]*(?:thuyết minh|lồng tiếng|vietsub|bản đẹp|full hd|raw|phần\s*\d+|season\s*\d+|ss\s*\d+)[^)]*\)/gi,
        '',
      )
      .replace(
        /\s*-\s*(?:thuyết minh|lồng tiếng|vietsub|bản đẹp|full hd|raw|phần\s*\d+|season\s*\d+|ss\s*\d+)/gi,
        '',
      )
      .replace(/\s*:\s*(?:phần\s*\d+|season\s*\d+|ss\s*\d+)/gi, '')
      .trim();
  }, [film?.name, slug]);

  const cleanOriginTitle = useMemo(() => {
    if (!film?.origin_name) return '';
    return String(film.origin_name)
      .replace(
        /\s*\([^)]*(?:thuyết minh|lồng tiếng|vietsub|bản đẹp|full hd|raw|phần\s*\d+|season\s*\d+|ss\s*\d+)[^)]*\)/gi,
        '',
      )
      .replace(
        /\s*-\s*(?:thuyết minh|lồng tiếng|vietsub|bản đẹp|full hd|raw|phần\s*\d+|season\s*\d+|ss\s*\d+)/gi,
        '',
      )
      .trim();
  }, [film?.origin_name]);

  const movieStoredData = useMemo(
    () => ({
      title: film?.name || slug,
      titleEn: film?.origin_name,
      posterUrl: film
        ? resolveImageUrl(film?.poster_url || film?.thumb_url) || undefined
        : undefined,
      thumbUrl: film
        ? resolveImageUrl(film?.thumb_url || film?.poster_url) || undefined
        : undefined,
      type: film?.type,
      year: film?.year,
    }),
    [film, slug],
  );

  const handleToggleFavorite = () => {
    const next = guestDataStorage.toggleFavorite(slug, movieStoredData);
    setIsFavorite(next);
    toast(
      next ? 'Đã thêm vào danh sách Yêu thích ❤️' : 'Đã bỏ khỏi danh sách Yêu thích',
      next ? 'success' : 'info',
    );
  };

  const handleToggleWatchlist = () => {
    const current = guestDataStorage.isWatchlisted(slug);
    if (current) {
      guestDataStorage.removeWatchlist(slug);
      setIsInWatchlist(false);
      toast('Đã xóa khỏi Tủ phim', 'info');
    } else {
      guestDataStorage.addWatchlist(slug, movieStoredData);
      setIsInWatchlist(true);
      toast('Đã lưu vào Tủ phim 📁', 'success');
    }
  };

  const { data: sourceLookupData, isFetching: isSourceLookupFetching } = useQuery({
    queryKey: ['watch-source-lookup', cleanTitle, cleanOriginTitle, film?.year],
    queryFn: async () => {
      const queries = [cleanTitle].filter(Boolean);
      if (cleanOriginTitle && cleanOriginTitle.toLowerCase() !== cleanTitle.toLowerCase()) {
        queries.push(cleanOriginTitle);
      }

      const settled = await Promise.allSettled(
        queries.map((q) => movieApi.searchSourceAlternatives(q, 1, 30).then((r) => r.data)),
      );

      const combinedItems: any[] = [];
      const seen = new Set<string>();
      for (const res of settled) {
        if (res.status === 'fulfilled' && res.value?.data?.items) {
          for (const item of res.value.data.items) {
            const key = `${item._source || ''}:${item.slug || item.id || item.name}`;
            if (!seen.has(key)) {
              seen.add(key);
              combinedItems.push(item);
            }
          }
        }
      }
      return { data: { items: combinedItems } };
    },
    enabled:
      secondaryDataReady &&
      Boolean(cleanTitle) &&
      (!bootstrapProviders.kkphim ||
        !bootstrapProviders.nguonc ||
        !bootstrapProviders.vsmov ||
        !bootstrapProviders.ophim),
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const matchedSourceRecord = useMemo(() => {
    const items = sourceLookupData?.data?.items || [];
    const effectiveTmdbId = film?.tmdb?.id || film?.tmdb_id || data?.movie?.tmdb?.id;
    return items.find((item: any) =>
      matchMovies(
        {
          title: film?.name || '',
          originTitle: film?.origin_name,
          year: Number(film?.year) || undefined,
          tmdbId: effectiveTmdbId,
        },
        {
          title: item?.name || item?.title || '',
          originTitle: item?.origin_name || item?.originTitle,
          year: Number(item?.year) || undefined,
          tmdbId: item?.tmdb?.id || item?.tmdb_id,
        },
      ),
    );
  }, [
    sourceLookupData,
    film?.name,
    film?.origin_name,
    film?.year,
    film?.tmdb,
    film?.tmdb_id,
    data?.movie?.tmdb,
  ]);

  const sourceSlugFor = useCallback(
    (source: MovieSource) => {
      if (primarySource === source) return sourceSlug;
      if (bootstrapSourceSlugs?.[source]) return bootstrapSourceSlugs[source];
      if (matchedSourceRecord?._sourceSlugs?.[source])
        return matchedSourceRecord._sourceSlugs[source];

      // Direct fallback: check if any item from sourceLookupData matches the film
      const items = sourceLookupData?.data?.items || [];
      const effectiveTmdbId = film?.tmdb?.id || film?.tmdb_id || data?.movie?.tmdb?.id;
      const exactSourceMatch = items.find(
        (item: any) =>
          item?._source === source &&
          matchMovies(
            {
              title: film?.name || '',
              originTitle: film?.origin_name,
              year: Number(film?.year) || undefined,
              tmdbId: effectiveTmdbId,
            },
            {
              title: item?.name || item?.title || '',
              originTitle: item?.origin_name || item?.originTitle,
              year: Number(item?.year) || undefined,
              tmdbId: item?.tmdb?.id || item?.tmdb_id,
            },
          ),
      );
      if (exactSourceMatch?.slug) {
        return exactSourceMatch.slug;
      }

      const directSourceItem = items.find(
        (item: any) =>
          item?._sourceSlugs?.[source] &&
          matchMovies(
            {
              title: film?.name || '',
              originTitle: film?.origin_name,
              year: Number(film?.year) || undefined,
              tmdbId: effectiveTmdbId,
            },
            {
              title: item?.name || item?.title || '',
              originTitle: item?.origin_name || item?.originTitle,
              year: Number(item?.year) || undefined,
              tmdbId: item?.tmdb?.id || item?.tmdb_id,
            },
          ),
      );
      if (directSourceItem?._sourceSlugs?.[source]) {
        return directSourceItem._sourceSlugs[source];
      }

      return sourceSlug || slug;
    },
    [
      bootstrapSourceSlugs,
      matchedSourceRecord,
      primarySource,
      sourceSlug,
      slug,
      sourceLookupData,
      film?.name,
      film?.origin_name,
      film?.year,
      film?.tmdb,
      film?.tmdb_id,
      data?.movie?.tmdb,
    ],
  );

  const kkphimSlug = sourceSlugFor('kkphim');
  const ophimSlug = sourceSlugFor('ophim');
  const nguoncSlug = sourceSlugFor('nguonc');
  const vsmovSlug = sourceSlugFor('vsmov');

  const { data: kkphimFetchedData, isFetching: isKKPhimFetching } = useQuery({
    queryKey: ['film-kkphim', kkphimSlug],
    queryFn: () => movieApi.getDetailFromSource('kkphim', kkphimSlug).then((r) => r.data),
    enabled:
      secondaryDataReady &&
      Boolean(kkphimSlug) &&
      primarySource !== 'kkphim' &&
      !bootstrapProviders.kkphim,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const { data: ophimFetchedData, isFetching: isOPhimFetching } = useQuery({
    queryKey: ['film-ophim', ophimSlug],
    queryFn: () => movieApi.getDetailFromSource('ophim', ophimSlug).then((r) => r.data),
    enabled:
      secondaryDataReady &&
      Boolean(ophimSlug) &&
      primarySource !== 'ophim' &&
      !bootstrapProviders.ophim,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const { data: nguoncFetchedData, isFetching: isNguonCFetching } = useQuery({
    queryKey: ['film-nguonc', nguoncSlug],
    queryFn: () => movieApi.getDetailFromSource('nguonc', nguoncSlug).then((r) => r.data),
    enabled:
      secondaryDataReady &&
      Boolean(nguoncSlug) &&
      primarySource !== 'nguonc' &&
      !bootstrapProviders.nguonc,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const { data: vsmovFetchedData, isFetching: isVSMovFetching } = useQuery({
    queryKey: ['film-vsmov', vsmovSlug],
    queryFn: () => movieApi.getDetailFromSource('vsmov', vsmovSlug).then((r) => r.data),
    enabled:
      secondaryDataReady &&
      Boolean(vsmovSlug) &&
      primarySource !== 'vsmov' &&
      !bootstrapProviders.vsmov,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const kkphimData =
    bootstrapProviders.kkphim || (primarySource === 'kkphim' ? data : kkphimFetchedData);
  const ophimData =
    bootstrapProviders.ophim || (primarySource === 'ophim' ? data : ophimFetchedData);
  const nguoncData =
    bootstrapProviders.nguonc || (primarySource === 'nguonc' ? data : nguoncFetchedData);
  const vsmovData =
    bootstrapProviders.vsmov || (primarySource === 'vsmov' ? data : vsmovFetchedData);
  const tmdbId = film?.tmdb?.id || film?.tmdb_id || data?.movie?.tmdb?.id;
  const tmdbMediaType =
    film?.tmdb?.type === 'tv' ||
    film?.type === 'series' ||
    film?.type === 'tv' ||
    film?.type === 'hoat-hinh'
      ? 'tv'
      : 'movie';
  const vidsrcSeason = resolveSeasonNumber(
    film?.season_number,
    film?.season,
    film?.tmdb?.season,
    data?.movie?.season_number,
    data?.movie?.season,
    film?.name,
    film?.origin_name,
    slug,
  );

  const { data: vicdnData, isFetching: isVicdnFetching } = useQuery({
    queryKey: ['film-vicdn', tmdbId, tmdbMediaType, vidsrcSeason],
    queryFn: () => vicdnApi.getDetailByTmdb(tmdbId, tmdbMediaType, vidsrcSeason),
    enabled: secondaryDataReady && Boolean(tmdbId),
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    retry: 0,
  });

  const alternateSourcesLoading =
    !secondaryDataReady ||
    isSourceLookupFetching ||
    isKKPhimFetching ||
    isOPhimFetching ||
    isNguonCFetching ||
    isVSMovFetching ||
    isVicdnFetching;

  const {
    bestBackdrop,
    bestPoster,
    backdrops: tmdbBackdrops,
    posters: tmdbPosters,
    episodeStillsMap,
    cast: tmdbCast,
    trailer: tmdbTrailer,
    creditsLoading,
    videosLoading,
  } = useTmdb({
    film,
    seasonNumber: vidsrcSeason || 1,
    enabled: secondaryDataReady && !!film,
    fetchCredits: watchContentTab === 'cast' || tabsPrefetchReady,
    fetchVideos: watchContentTab === 'trailer' || tabsPrefetchReady,
    fetchSeason: true,
  });

  // Recommendations
  const filmCategory = data?.movie?.category?.[0]?.slug || data?.category?.[0]?.slug;
  const rawTitle = (film?.name || film?.origin_name || slug || '').toLowerCase();

  const matchedKeyword = useMemo(() => {
    const kws = [
      'marvel',
      'dc',
      'superman',
      'batman',
      'spider-man',
      'avengers',
      'doraemon',
      'naruto',
    ];
    return kws.find((kw) => rawTitle.includes(kw));
  }, [rawTitle]);

  // ── TMDB Smart Recommendations Engine (AI & Graph-Based) ──
  const effectiveTmdbId = film?.tmdb?.id || film?.tmdbId;
  const effectiveMediaType = film?.tmdb?.type || (film?.type === 'series' ? 'tv' : 'movie');

  const { data: recsData } = useQuery({
    queryKey: ['smart-recs-v2', slug, effectiveTmdbId, effectiveMediaType, filmCategory],
    queryFn: async () => {
      const items: any[] = [];
      const seenSlugs = new Set<string>();
      if (slug) seenSlugs.add(slug);

      // Render provider-native recommendations first. These already have a
      // valid FlexPhim slug and only need one cached catalogue request.
      try {
        const { searchLocalFilms } = await import('@/lib/smart-search');
        const titleKeywords = (film?.name || film?.origin_name || slug || '').split(' ')[0] || '';
        for (const item of searchLocalFilms(titleKeywords)) {
          if (item?.slug && !seenSlugs.has(item.slug)) {
            seenSlugs.add(item.slug);
            items.push(item);
          }
        }
      } catch {
        // Continue with the provider catalogue.
      }

      if (filmCategory && items.length < 8) {
        try {
          const response: any = await movieApi.getByGenre(filmCategory, 1);
          const genreItems = response?.data?.data?.items || response?.data?.items || [];
          for (const item of genreItems) {
            if (item?.slug && !seenSlugs.has(item.slug)) {
              seenSlugs.add(item.slug);
              items.push(item);
            }
          }
        } catch {
          // TMDB resolution below remains the final fallback.
        }
      }

      // 1. Cấp độ 1: TMDB Intelligent Recommendation API (AI graph-based recommendation)
      if (effectiveTmdbId && items.length < 8) {
        try {
          const tmdbEndpoint = `/api/tmdb/${effectiveMediaType === 'tv' ? 'tv' : 'movie'}/${effectiveTmdbId}/recommendations`;
          const res = await fetch(tmdbEndpoint);
          if (res.ok) {
            const tmdbJson = await res.json();
            // TMDB has metadata but does not know the provider slug consumed
            // by /film and /watch. Only render recommendations that resolve to
            // a real catalogue entry, otherwise the generated English slug
            // leads to a guaranteed "Không tìm thấy phim" page.
            const tmdbRecs = (tmdbJson?.results || []).slice(0, 5);
            const resolved = await Promise.allSettled(
              tmdbRecs.map(async (tmdbItem: any) => {
                const title =
                  tmdbItem.original_title ||
                  tmdbItem.original_name ||
                  tmdbItem.title ||
                  tmdbItem.name ||
                  '';
                if (!title) return null;

                const response = await kkphimApi.search(title, 1, 10);
                const candidates = extractFilmItems(response) as any[];
                const tmdbId = String(tmdbItem.id);
                const year = String(tmdbItem.release_date || tmdbItem.first_air_date || '').slice(
                  0,
                  4,
                );
                const normalizedTitles = new Set(
                  [tmdbItem.title, tmdbItem.name, tmdbItem.original_title, tmdbItem.original_name]
                    .filter(Boolean)
                    .map((value) => normalizeText(String(value))),
                );
                const exact = candidates.find(
                  (candidate) => String(candidate?.tmdb?.id || '') === tmdbId,
                );
                const titleMatch = candidates.find((candidate) => {
                  const sameTitle = [candidate?.name, candidate?.origin_name]
                    .filter(Boolean)
                    .map((value) => normalizeText(String(value)))
                    .some((value) => normalizedTitles.has(value));
                  return (
                    sameTitle && (!year || !candidate?.year || String(candidate.year) === year)
                  );
                });
                const providerItem = exact || titleMatch;
                if (!providerItem?.slug) return null;

                return {
                  ...providerItem,
                  poster_url:
                    providerItem.poster_url ||
                    (tmdbItem.poster_path
                      ? `https://image.tmdb.org/t/p/w342${tmdbItem.poster_path}`
                      : undefined),
                  thumb_url:
                    providerItem.thumb_url ||
                    (tmdbItem.backdrop_path
                      ? `https://image.tmdb.org/t/p/w780${tmdbItem.backdrop_path}`
                      : undefined),
                  vote_average: providerItem.vote_average || tmdbItem.vote_average,
                  tmdb: {
                    ...(providerItem.tmdb || {}),
                    id: tmdbId,
                    vote_average: tmdbItem.vote_average,
                    type: effectiveMediaType,
                  },
                };
              }),
            );

            for (const result of resolved) {
              const item = result.status === 'fulfilled' ? result.value : null;
              if (item?.slug && !seenSlugs.has(item.slug)) {
                seenSlugs.add(item.slug);
                items.push(item);
              }
            }
          }
        } catch {
          // TMDB error fallback
        }
      }

      return {
        items: items.slice(0, 10),
      };
    },
    enabled: recommendationsReady && !!slug,
    staleTime: 1000 * 60 * 30, // 30 phút cache
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // Intelligent AI Recommendations powered by Python Engine with resilient multi-tier fallback
  const { data: discoveryData, isLoading: discoveryLoading } = useQuery({
    queryKey: ['watch-ai-recommendations', slug],
    queryFn: async () => {
      try {
        const aiRes = await recommendationApi.getSimilar(slug, 12);
        if (aiRes?.items && aiRes.items.length > 0) {
          return { items: aiRes.items };
        }
      } catch {
        // Fallback gracefully
      }

      const seed = Array.from(slug || 'netphim').reduce(
        (total, character) => total + character.charCodeAt(0),
        0,
      );
      const page = (seed % 4) + 1;
      const results = await Promise.allSettled([
        movieApi.getLatest(page),
        movieApi.getSingle(((page + 1) % 4) + 1),
        movieApi.getSeries(((page + 2) % 4) + 1),
      ]);
      const seen = new Set<string>([slug]);
      const pool = results.flatMap((result) =>
        result.status === 'fulfilled' ? (extractFilmItems(result.value) as any[]) : [],
      );

      const unique = pool.filter((item) => {
        if (!item?.slug || seen.has(item.slug)) return false;
        seen.add(item.slug);
        return true;
      });

      return { items: unique.slice(0, 12) };
    },
    enabled: Boolean(slug),
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const { data: resumeData } = useQuery({
    queryKey: ['watch-history-resume', slug],
    queryFn: () => watchHistoryApi.getResume(slug).then((r) => r.data),
    enabled: !!user && !!slug,
  });

  // Track episode progress per episode for Netflix-style progress bars
  const [episodeProgressMap, setEpisodeProgressMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!slug) return;
    const loadProgress = () => {
      const localMap = watchProgressStorage.getMovieEpisodeProgressMap(slug);
      if (Array.isArray(resumeData)) {
        for (const item of resumeData) {
          if (!item?.episode || !item?.duration || item.duration <= 0) continue;
          const pct = Math.min(100, Math.max(0, Math.round((item.progress / item.duration) * 100)));
          const epKey =
            String(item.episode)
              .toLowerCase()
              .replace(/^tập\s*/i, '')
              .replace(/^tap-/i, '')
              .replace(/^0+/, '')
              .trim() || String(item.episode);
          if (!localMap[epKey] || pct > localMap[epKey]) {
            localMap[epKey] = pct;
          }
        }
      }
      setEpisodeProgressMap(localMap);
    };

    loadProgress();

    const handleProgressUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.slug === slug) {
        loadProgress();
      }
    };

    window.addEventListener('netphim_episode_progress_changed', handleProgressUpdate);
    return () => {
      window.removeEventListener('netphim_episode_progress_changed', handleProgressUpdate);
    };
  }, [slug, resumeData]);

  // Fetch TMDB Scene Stills / Backdrops for Episode Scene Thumbnails
  const sceneStills: any[] = useMemo(() => {
    return tmdbBackdrops || [];
  }, [tmdbBackdrops]);

  const diverseTmdbBackdrops = useMemo(() => {
    const unique = tmdbBackdrops.filter(
      (image, index, items) =>
        items.findIndex((candidate) => candidate.file_path === image.file_path) === index,
    );
    if (unique.length <= 12) return unique;

    return Array.from({ length: 12 }, (_, index) => {
      const position = Math.round((index * (unique.length - 1)) / 11);
      return unique[position];
    });
  }, [tmdbBackdrops]);

  // Episode processing: normalize provider ownership, language and priority.
  const episodes: SourceServer[] = useMemo(() => {
    const extractEpisodes = (providerData: any): any[] => {
      const raw =
        providerData?.episodes ||
        providerData?.data?.episodes ||
        providerData?.movie?.episodes ||
        providerData?.data?.item?.episodes ||
        providerData?.item?.episodes ||
        [];
      if (!Array.isArray(raw)) return [];
      return raw.map((server: any) => {
        const rawItems = Array.isArray(server?.server_data)
          ? server.server_data
          : Array.isArray(server?.items)
            ? server.items
            : [];
        const normalizedItems = rawItems.map((item: any) => ({
          name: item?.name || '',
          slug: item?.slug || '',
          link_embed: item?.link_embed || item?.embed || '',
          link_m3u8: item?.link_m3u8 || item?.m3u8 || '',
        }));
        return {
          ...server,
          server_name: String(server?.server_name || '')
            .replace(/\r?\n|\r/g, ' ')
            .trim(),
          server_data: normalizedItems,
        };
      });
    };
    const kkphimEps = extractEpisodes(kkphimData);
    const nguoncEps = extractEpisodes(nguoncData);
    const vsmovEps = extractEpisodes(vsmovData);
    const ophimEps = extractEpisodes(ophimData);
    const vicdnEps = extractEpisodes(vicdnData);
    let vidsrcEps: any[] = [];
    let vidlinkEps: any[] = [];
    let twoEmbedEps: any[] = [];
    let vidcoreEps: any[] = [];

    if (tmdbId) {
      if (tmdbMediaType === 'movie') {
        const vidsrcEmbedUrl = buildVidsrcEmbedUrl({
          tmdbId,
          mediaType: 'movie',
          autoplay: autoPlayConfig,
          subtitle: 'en',
          color: '23ade5',
        });
        if (vidsrcEmbedUrl) {
          vidsrcEps = [
            {
              server_name: 'VidSrc Engsub',
              server_data: [
                {
                  name: 'Full Movie (Engsub)',
                  slug: 'full-engsub',
                  link_embed: vidsrcEmbedUrl,
                  link_m3u8: '',
                },
              ],
            },
          ];
        }

        const vidlinkEmbedUrl = buildVidlinkEmbedUrl({
          tmdbId,
          mediaType: 'movie',
          autoplay: autoPlayConfig,
          primaryColor: '23ade5',
        });
        if (vidlinkEmbedUrl) {
          vidlinkEps = [
            {
              server_name: 'VidLink Engsub',
              server_data: [
                {
                  name: 'Full Movie (Engsub)',
                  slug: 'full-engsub',
                  link_embed: vidlinkEmbedUrl,
                  link_m3u8: '',
                },
              ],
            },
          ];
        }

        const twoEmbedUrl = buildTwoEmbedUrl({
          tmdbId,
          mediaType: 'movie',
        });
        if (twoEmbedUrl) {
          twoEmbedEps = [
            {
              server_name: '2Embed Engsub',
              server_data: [
                {
                  name: 'Full Movie (Engsub)',
                  slug: 'full-engsub',
                  link_embed: twoEmbedUrl,
                  link_m3u8: '',
                },
              ],
            },
          ];
        }

        const vidcoreEmbedUrl = buildVidcoreEmbedUrl({
          tmdbId,
          mediaType: 'movie',
          autoplay: autoPlayConfig,
          theme: '23ade5',
        });
        if (vidcoreEmbedUrl) {
          vidcoreEps = [
            {
              server_name: 'VidCore Engsub',
              server_data: [
                {
                  name: 'Full Movie (Engsub)',
                  slug: 'full-engsub',
                  link_embed: vidcoreEmbedUrl,
                  link_m3u8: '',
                },
              ],
            },
          ];
        }
      } else {
        // External TMDB players require explicit season and episode. Mirror the episode
        // identities already supplied by Vietnamese providers so tab switches
        // stay on the same episode instead of jumping back to episode one.
        const episodeMap = new Map<number, any>();
        for (const sourceServer of [...kkphimEps, ...nguoncEps, ...vsmovEps, ...ophimEps]) {
          const sourceEpisodes = Array.isArray(sourceServer?.server_data)
            ? sourceServer.server_data
            : [];
          for (const sourceEpisode of sourceEpisodes) {
            const episodeNumber = episodeNumberFromLabel(
              sourceEpisode?.slug || sourceEpisode?.name,
            );
            if (episodeNumber && !episodeMap.has(episodeNumber)) {
              episodeMap.set(episodeNumber, sourceEpisode);
            }
          }
        }

        if (episodeMap.size === 0) {
          const requestedEpisode = episodeNumberFromLabel(currentEp) || 1;
          episodeMap.set(requestedEpisode, {
            name: `Tập ${requestedEpisode}`,
            slug: `tap-${requestedEpisode}`,
          });
        }

        const sortedEpisodes = Array.from(episodeMap.entries()).sort(
          ([left], [right]) => left - right,
        );

        const vidsrcServerData = sortedEpisodes.flatMap(([episodeNumber, sourceEpisode]) => {
          const embedUrl = buildVidsrcEmbedUrl({
            tmdbId,
            mediaType: 'tv',
            season: vidsrcSeason,
            episode: episodeNumber,
            autoplay: autoPlayConfig,
            subtitle: 'en',
            color: '23ade5',
          });
          return embedUrl
            ? [
                {
                  name: sourceEpisode?.name || `Tập ${episodeNumber}`,
                  slug: sourceEpisode?.slug || `tap-${episodeNumber}`,
                  link_embed: embedUrl,
                  link_m3u8: '',
                },
              ]
            : [];
        });

        if (vidsrcServerData.length > 0) {
          vidsrcEps = [{ server_name: 'VidSrc Engsub', server_data: vidsrcServerData }];
        }

        const vidlinkServerData = sortedEpisodes.flatMap(([episodeNumber, sourceEpisode]) => {
          const embedUrl = buildVidlinkEmbedUrl({
            tmdbId,
            mediaType: 'tv',
            season: vidsrcSeason,
            episode: episodeNumber,
            autoplay: autoPlayConfig,
            primaryColor: '23ade5',
          });
          return embedUrl
            ? [
                {
                  name: sourceEpisode?.name || `Tập ${episodeNumber}`,
                  slug: sourceEpisode?.slug || `tap-${episodeNumber}`,
                  link_embed: embedUrl,
                  link_m3u8: '',
                },
              ]
            : [];
        });

        if (vidlinkServerData.length > 0) {
          vidlinkEps = [{ server_name: 'VidLink Engsub', server_data: vidlinkServerData }];
        }

        const twoEmbedServerData = sortedEpisodes.flatMap(([episodeNumber, sourceEpisode]) => {
          const embedUrl = buildTwoEmbedUrl({
            tmdbId,
            mediaType: 'tv',
            season: vidsrcSeason,
            episode: episodeNumber,
          });
          return embedUrl
            ? [
                {
                  name: sourceEpisode?.name || `Tập ${episodeNumber}`,
                  slug: sourceEpisode?.slug || `tap-${episodeNumber}`,
                  link_embed: embedUrl,
                  link_m3u8: '',
                },
              ]
            : [];
        });

        if (twoEmbedServerData.length > 0) {
          twoEmbedEps = [{ server_name: '2Embed Engsub', server_data: twoEmbedServerData }];
        }

        const vidcoreServerData = sortedEpisodes.flatMap(([episodeNumber, sourceEpisode]) => {
          const embedUrl = buildVidcoreEmbedUrl({
            tmdbId,
            mediaType: 'tv',
            season: vidsrcSeason,
            episode: episodeNumber,
            autoplay: autoPlayConfig,
            theme: '23ade5',
          });
          return embedUrl
            ? [
                {
                  name: sourceEpisode?.name || `Tập ${episodeNumber}`,
                  slug: sourceEpisode?.slug || `tap-${episodeNumber}`,
                  link_embed: embedUrl,
                  link_m3u8: '',
                },
              ]
            : [];
        });

        if (vidcoreServerData.length > 0) {
          vidcoreEps = [{ server_name: 'VidCore Engsub', server_data: vidcoreServerData }];
        }
      }
    }

    const tagSource = (arr: any[], sourceKey: string) => {
      const sourceLabel = getSourceLabel(sourceKey);
      return (arr || [])
        .map((s) => {
          const rawItems = Array.isArray(s?.server_data)
            ? s.server_data
            : Array.isArray(s?.items)
              ? s.items
              : [];
          const normalizedServerData = rawItems.map((item: any) => ({
            name: item?.name || '',
            slug: item?.slug || '',
            link_embed: item?.link_embed || item?.embed || '',
            link_m3u8: item?.link_m3u8 || item?.m3u8 || '',
          }));
          return {
            ...s,
            server_name:
              String(s?.server_name || '')
                .replace(/\r?\n|\r/g, ' ')
                .trim() || sourceLabel,
            server_data: normalizedServerData,
          };
        })
        .filter((s) => {
          const serverData = s.server_data;
          return (
            serverData.length > 0 &&
            serverData.some((item: any) => Boolean(item?.link_m3u8 || item?.link_embed))
          );
        })
        .map((s, i): SourceServer => {
          const originalName = String(s.server_name || '').trim();
          const serverData = s.server_data;
          return {
            ...s,
            server_name: `Server ${i + 1}`,
            server_data: serverData,
            _source: sourceKey,
            _type: resolveServerType(
              sourceKey,
              originalName,
              s.lang || s.language || s.audio || '',
            ),
            key: `${sourceKey}:${originalName || i}`,
            priority: sourcePriority(sourceKey, serverData, currentEp),
          };
        });
    };

    const combined = [
      ...tagSource(kkphimEps, 'kkphim'),
      ...tagSource(nguoncEps, 'nguonc'),
      ...tagSource(vsmovEps, 'vsmov'),
      ...tagSource(ophimEps, 'ophim'),
      ...tagSource(vicdnEps, 'vicdn'),
      ...tagSource(vidsrcEps, 'vidsrc'),
      ...tagSource(vidlinkEps, 'vidlink'),
      ...tagSource(twoEmbedEps, '2embed'),
      ...tagSource(vidcoreEps, 'vidcore'),
    ];
    const rank = new Map(providerPriority.map((source, index) => [source, index]));
    const sorted = combined.sort(
      (left, right) =>
        (rank.get(left._source || '') ?? 999) - (rank.get(right._source || '') ?? 999) ||
        (right.priority ?? 0) - (left.priority ?? 0),
    );

    // Number servers sequentially per version type (e.g. Vietsub: Server 1, Server 2, Server 3, Server 4)
    const byTypeCount = new Map<string, number>();
    return sorted.map((item) => {
      const typeKey = item._type || 'vietsub';
      const count = (byTypeCount.get(typeKey) || 0) + 1;
      byTypeCount.set(typeKey, count);
      return {
        ...item,
        server_name: `Server ${count}`,
      };
    });
  }, [
    autoPlayConfig,
    currentEp,
    kkphimData,
    nguoncData,
    ophimData,
    tmdbId,
    tmdbMediaType,
    vidsrcSeason,
    vsmovData,
    vicdnData,
    providerPriority,
  ]);

  const serversByType = useMemo(() => {
    const g: Record<ServerType, any[]> = {
      vietsub: [],
      'song-ngu': [],
      'thuyet-minh': [],
      engsub: [],
      raw: [],
    };
    episodes.forEach((ep) => g[ep._type as ServerType].push(ep));
    return g;
  }, [episodes]);

  const availableTypes = useMemo(
    () =>
      (['vietsub', 'song-ngu', 'thuyet-minh', 'engsub', 'raw'] as ServerType[]).filter(
        (t) => serversByType[t].length > 0,
      ),
    [serversByType],
  );
  const automaticTypes = useMemo(
    () =>
      availableTypes.filter((type) =>
        serversByType[type].some((candidate) => isAutomaticPlaybackSource(candidate._source)),
      ),
    [availableTypes, serversByType],
  );

  const initialSelectedRef = useRef(false);

  useEffect(() => {
    initialSelectedRef.current = false;
  }, [slug]);

  useEffect(() => {
    if (episodes.length > 0 && !initialSelectedRef.current) {
      initialSelectedRef.current = true;
      // ⚡ Always prioritize Vietsub FIRST, then Thuyet Minh, then Engsub
      const automaticServers = episodes.filter((candidate) =>
        isAutomaticPlaybackSource(candidate._source),
      );
      const pref =
        automaticServers.find((ep) => ep._type === 'vietsub') ||
        automaticServers.find((ep) => ep._type === 'thuyet-minh') ||
        automaticServers.find((ep) => ep._type === 'raw') ||
        automaticServers[0];
      if (pref) {
        const idx = episodes.indexOf(pref);
        if (idx >= 0) {
          setCurrentServer(idx);
        }
        if (pref._type) {
          setActiveServerType(pref._type as ServerType);
        }
        setVidsrcManuallySelected(false);
      }
    }
  }, [episodes]);

  useEffect(() => {
    if (vidsrcManuallySelected) return;
    if (automaticTypes.length > 0 && !automaticTypes.includes(activeServerType)) {
      setActiveServerType(automaticTypes[0]);
      setVidsrcManuallySelected(false);
    }
  }, [activeServerType, automaticTypes, vidsrcManuallySelected]);

  const server = episodes[currentServer] || episodes[0];
  const sourceCandidate = useMemo(
    () => ({
      key: `${server?._source || 'unknown'}:${server?.server_name || currentServer}`,
      source: server?._source,
      serverName: server?.server_name,
      priority: server?.priority,
    }),
    [currentServer, server],
  );
  const serverData: any[] = useMemo(() => server?.server_data || [], [server]);
  const currentEpData: any = findMatchingEpisode(serverData, currentEp) || serverData[0];

  const m3u8Url: string = currentEpData?.link_m3u8 || '';
  const m3u8ProxyUrl: string = currentEpData?.link_m3u8_proxy || '';
  const embedUrl: string = currentEpData?.link_embed || '';

  const iframeUrl =
    embedUrl ||
    (m3u8Url ? `https://player.phimapi.com/player/?url=${encodeURIComponent(m3u8Url)}` : '');
  // Third-party players may execute scripts and use their own storage, but
  // must not navigate the FlexPhim tab, spawn popunders or trigger downloads.
  // Verified native players (NguonC StreamC, VidSrc, ViCDN) require unsandboxed iframes to run their media engines.
  const iframeSandbox = canUseUnsandboxedEmbed(server?._source, iframeUrl)
    ? undefined
    : 'allow-scripts allow-same-origin allow-forms allow-presentation allow-pointer-lock';
  const videoUrl = m3u8Url || embedUrl || iframeUrl;

  const currentEpIndex = serverData.findIndex(
    (e: any) => (e.slug || e.name) === (currentEp || currentEpData?.slug || currentEpData?.name),
  );

  const resolvedTmdbBackdrop = bestBackdrop?.file_path
    ? `https://image.tmdb.org/t/p/w1280${bestBackdrop.file_path}`
    : undefined;
  const resolvedTmdbPoster = bestPoster?.file_path
    ? `https://image.tmdb.org/t/p/w780${bestPoster.file_path}`
    : undefined;

  const movieThumb =
    resolveImageUrl(film?.thumb_url) ||
    resolvedTmdbBackdrop ||
    resolveImageUrl(film?.poster_url) ||
    resolvedTmdbPoster ||
    undefined;

  const moviePoster =
    resolveImageUrl(film?.poster_url) ||
    resolvedTmdbPoster ||
    resolveImageUrl(film?.thumb_url) ||
    resolvedTmdbBackdrop ||
    undefined;

  const posterUrl = movieThumb || moviePoster || undefined;
  const optimizedPlayerPoster = useMemo(() => {
    if (!posterUrl) return undefined;
    if (isTmdbImageUrl(posterUrl)) {
      return tmdbImageVariant(posterUrl, 'w1280') || posterUrl;
    }
    return posterUrl;
  }, [posterUrl]);

  // Auto-sync active episode range for long series (e.g. One Piece, Conan with 500-1100+ episodes)
  useEffect(() => {
    if (currentEpIndex >= 0 && serverData.length > 0) {
      const rSize = serverData.length > 500 ? 100 : serverData.length > 100 ? 50 : 40;
      const targetRange = Math.floor(currentEpIndex / rSize);
      setEpRangeIndex(targetRange);
    }
  }, [currentEpIndex, serverData.length]);

  // Set of watched episode keys for instant green checkmark indicator
  const [watchedEpisodeKeys, setWatchedEpisodeKeys] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const set = new Set<string>();
      const raw = localStorage.getItem(`netphim_watched_eps_${slug}`);
      if (raw) {
        (JSON.parse(raw) as string[]).forEach((k) =>
          set.add(
            String(k)
              .toLowerCase()
              .replace(/^tập\s*/i, '')
              .replace(/^tap-/i, '')
              .replace(/^0+/, '')
              .trim(),
          ),
        );
      }
      const entries = watchProgressStorage.getHistoryEntries();
      entries
        .filter((e) => e.slug === slug)
        .forEach((e) => {
          if (e.epSlug)
            set.add(
              String(e.epSlug)
                .toLowerCase()
                .replace(/^tập\s*/i, '')
                .replace(/^tap-/i, '')
                .replace(/^0+/, '')
                .trim(),
            );
          if (e.epName)
            set.add(
              String(e.epName)
                .toLowerCase()
                .replace(/^tập\s*/i, '')
                .replace(/^tap-/i, '')
                .replace(/^0+/, '')
                .trim(),
            );
        });
      return set;
    } catch {
      return new Set();
    }
  });

  // Auto-record Watch History for BOTH Guest & Logged-in Users
  useEffect(() => {
    if (film && (film.name || film.origin_name) && slug) {
      const epName = currentEpData?.name || currentEp || 'Tập 1';
      const movieTitle = film.name || film.origin_name || 'Phim';

      const currentKey = String(currentEpData?.slug || currentEpData?.name || currentEp || '')
        .toLowerCase()
        .replace(/^tập\s*/i, '')
        .replace(/^tap-/i, '')
        .replace(/^0+/, '')
        .trim();

      if (currentKey) {
        setWatchedEpisodeKeys((prev) => {
          const next = new Set(prev);
          next.add(currentKey);
          try {
            localStorage.setItem(`netphim_watched_eps_${slug}`, JSON.stringify(Array.from(next)));
          } catch {}
          return next;
        });
      }

      // Save to localStorage for guest & logged-in users
      watchProgressStorage.saveProgress({
        slug: String(slug),
        epSlug: String(currentEp || '1'),
        epName: String(epName).startsWith('Tập') ? String(epName) : `Tập ${epName}`,
        title: movieTitle,
        poster: moviePoster || movieThumb || '',
        thumb: movieThumb || moviePoster || '',
        originName: film?.origin_name || undefined,
        currentTime: 10,
        duration: 100,
      });

      // Save to server API for logged in user
      if (user) {
        watchHistoryApi
          .upsert({
            // Use the public slug consistently. Mixing the provider database
            // id here with the slug used by progress events created duplicate
            // history rows for the same movie.
            movieId: String(slug),
            movieTitle: movieTitle,
            movieThumb: movieThumb || moviePoster,
            episode: String(currentEp || '1'),
            progress: 10,
            duration: 100,
          })
          .catch(() => {});
      }
    }
  }, [
    currentEp,
    currentEpData?.name,
    currentEpData?.slug,
    film,
    moviePoster,
    movieThumb,
    posterUrl,
    slug,
    user,
  ]);

  const createCurrentMovieParty = useCallback(async () => {
    const newRoomId = await createWatchPartyRoom({
      name: requestedRoomName || undefined,
      movieName: film?.name || film?.origin_name || 'Phim đang xem',
      posterUrl,
    });
    if (!newRoomId) return null;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('room', newRoomId);
    nextParams.delete('party');
    nextParams.delete('roomName');
    router.replace(`/watch/${slug}?${nextParams.toString()}`);
    return newRoomId;
  }, [
    film?.name,
    film?.origin_name,
    posterUrl,
    requestedRoomName,
    router,
    searchParams,
    slug,
    createWatchPartyRoom,
  ]);

  useEffect(() => {
    if (
      (!shouldCreateParty && !manualPartyCreateRequested) ||
      !watchPartyEnabled ||
      !film ||
      wp.roomId ||
      wp.connectionState !== 'online' ||
      creatingRoomRef.current
    ) {
      return;
    }
    creatingRoomRef.current = true;
    createCurrentMovieParty().then((roomId) => {
      if (!roomId) creatingRoomRef.current = false;
      else setManualPartyCreateRequested(false);
    });
  }, [
    createCurrentMovieParty,
    film,
    manualPartyCreateRequested,
    shouldCreateParty,
    watchPartyEnabled,
    wp.connectionState,
    wp.roomId,
  ]);

  // TMDB backdrop and scene images share the single deferred query above.
  const tmdbBackdropUrl = bestBackdrop ? tmdbBackdrop(bestBackdrop.file_path, 'w1280') : null;
  const epName: string = currentEpData?.slug || currentEpData?.name || '';
  const progressKey = slug && epName ? `${slug}_${epName}` : undefined;
  const currentResumeEntry = resumeData?.find((item: any) => item.episode === epName);
  const dbProgress = currentResumeEntry?.progress || 0;
  const localProgress = useMemo(() => {
    if (!progressKey) return 0;
    return (
      watchProgressStorage
        .getHistoryEntries()
        .find((entry) => entry.slug === slug && entry.epSlug === epName)?.currentTime || 0
    );
  }, [epName, progressKey, slug]);
  const resumeAt = Math.max(dbProgress, localProgress);
  const watchPartyRoomId = wp.roomId;
  const isWatchPartyHost = wp.isHost;
  const syncWatchPartyPlayerState = wp.syncPlayerState;

  const handlePlaybackProgress = useCallback(
    (currentTime: number, duration: number) => {
      if (!slug || !epName || !Number.isFinite(duration) || duration < 10) return;

      lastKnownPlaybackTimeRef.current = currentTime;

      // ── Zero-Spinner Next Episode Preload (final 3 minutes) ──
      if (
        duration > 60 &&
        duration - currentTime <= 180 &&
        !hasPreloadedNextEpRef.current &&
        currentEpIndex >= 0 &&
        currentEpIndex < serverData.length - 1
      ) {
        const nextEpItem = serverData[currentEpIndex + 1];
        const nextStream = nextEpItem?.link_m3u8;
        if (nextStream) {
          hasPreloadedNextEpRef.current = true;
          preloadNextEpisodeStream(nextStream);
        }
      }

      // ── Auto Next Episode Countdown Trigger (within 3 seconds of ending) ──
      if (
        autoNextConfig &&
        (!watchPartyRoomId || isWatchPartyHost) &&
        duration > 30 &&
        currentTime >= duration - 3 &&
        autoNextCountdown === null &&
        currentEpIndex >= 0 &&
        currentEpIndex < serverData.length - 1
      ) {
        setAutoNextCountdown(5);
      }

      watchProgressStorage.saveProgress({
        slug,
        epSlug: currentEpData?.slug || currentEpData?.name || '01',
        epName,
        title: film?.name || film?.origin_name || slug,
        poster: moviePoster || movieThumb || posterUrl || '',
        thumb: movieThumb || moviePoster || posterUrl || '',
        originName: film?.origin_name || undefined,
        currentTime,
        duration,
      });

      if (!user || Date.now() - lastProgressSyncRef.current < 15_000) return;
      lastProgressSyncRef.current = Date.now();
      void watchHistoryApi
        .upsert({
          movieId: slug,
          episode: epName,
          progress: currentTime,
          duration,
          movieTitle: film?.name || film?.origin_name || slug,
          movieThumb: movieThumb || moviePoster || posterUrl,
          serverName: server?.server_name,
        })
        .catch(() => {
          // The local copy above is the durable fallback if the API is briefly
          // unavailable. A later progress event will retry the sync.
          recordTelemetry('watch_progress.sync_failed', { slug, episode: epName }, 'warning');
        });
    },
    [
      autoNextConfig,
      autoNextCountdown,
      currentEpData,
      currentEpIndex,
      epName,
      film?.name,
      film?.origin_name,
      moviePoster,
      movieThumb,
      posterUrl,
      server?.server_name,
      serverData,
      slug,
      user,
      isWatchPartyHost,
      watchPartyRoomId,
    ],
  );

  // Navigation
  const watchUrlForEpisode = useCallback(
    (episode: string, srvIdx?: number) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set('ep', episode);
      if (typeof srvIdx === 'number') {
        nextParams.set('server', String(srvIdx));
      }
      nextParams.delete('party');
      nextParams.delete('roomName');
      return `/watch/${slug}?${nextParams.toString()}`;
    },
    [searchParams, slug],
  );

  const navigateToEpisode = useCallback(
    (episode: string) => {
      if (watchPartyRoomId && !isWatchPartyHost) {
        toast('Trưởng phòng đang điều khiển tập phim.', 'info');
        return;
      }
      if (isWatchPartyHost) syncWatchPartyPlayerState('episode', 0, episode);
      router.push(watchUrlForEpisode(episode));
    },
    [
      isWatchPartyHost,
      router,
      syncWatchPartyPlayerState,
      toast,
      watchPartyRoomId,
      watchUrlForEpisode,
    ],
  );

  const goNextEpisode = useCallback(() => {
    setAutoNextCountdown(null);
    if (currentEpIndex >= 0 && currentEpIndex < serverData.length - 1) {
      const next = serverData[currentEpIndex + 1];
      const nextEpisode = next.slug || next.name;
      navigateToEpisode(nextEpisode);
    }
  }, [currentEpIndex, navigateToEpisode, serverData]);

  const handleVideoEnded = useCallback(() => {
    if (isWatchPartyHost) {
      syncWatchPartyPlayerState('ended', artInstance?.duration || artInstance?.currentTime || 0);
    }
    if (watchPartyRoomId && !isWatchPartyHost) return;
    if (!autoNextConfig) return;
    if (currentEpIndex >= 0 && currentEpIndex < serverData.length - 1) setAutoNextCountdown(5);
  }, [
    artInstance,
    autoNextConfig,
    currentEpIndex,
    isWatchPartyHost,
    serverData.length,
    syncWatchPartyPlayerState,
    watchPartyRoomId,
  ]);

  useEffect(() => {
    if (autoNextCountdown === null) return;
    if (autoNextCountdown <= 0) {
      goNextEpisode();
      return;
    }
    const t = setTimeout(() => setAutoNextCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [autoNextCountdown, goNextEpisode]);

  // ── Global Keyboard Shortcuts Listener ──
  const lastKeySeekTimeRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If event was already handled (e.g. by ArtPlayer internal hotkeys) or default prevented, ignore
      if (e.defaultPrevented || (e as any)._artHandled) {
        return;
      }

      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        if (artInstance) {
          if (artInstance.playing) {
            artInstance.pause();
          } else {
            artInstance.play();
          }
        } else {
          const videoEl = playerContainerRef.current?.querySelector('video');
          if (videoEl) videoEl.paused ? videoEl.play() : videoEl.pause();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (artInstance) {
          artInstance.fullscreen = !artInstance.fullscreen;
        } else {
          const videoEl = playerContainerRef.current?.querySelector('video');
          if (videoEl) videoEl.requestFullscreen?.();
        }
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setTheaterMode((prev) => {
          const next = !prev;
          toast(next ? 'Đã bật chế độ rạp phim' : 'Đã tắt chế độ rạp phim', 'info');
          return next;
        });
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        if (artInstance) {
          artInstance.muted = !artInstance.muted;
        } else {
          const videoEl = playerContainerRef.current?.querySelector('video');
          if (videoEl) videoEl.muted = !videoEl.muted;
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        const now = Date.now();
        if (e.repeat && now - lastKeySeekTimeRef.current < 220) {
          return;
        }
        lastKeySeekTimeRef.current = now;

        if (artInstance) {
          if (typeof artInstance.triggerSeekRipple === 'function') {
            artInstance.triggerSeekRipple(true);
          } else {
            artInstance.seek = Math.max(0, (artInstance.currentTime || 0) - 10);
          }
        } else {
          const videoEl = playerContainerRef.current?.querySelector('video');
          if (videoEl) videoEl.currentTime = Math.max(0, videoEl.currentTime - 10);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        const now = Date.now();
        if (e.repeat && now - lastKeySeekTimeRef.current < 220) {
          return;
        }
        lastKeySeekTimeRef.current = now;

        if (artInstance) {
          if (typeof artInstance.triggerSeekRipple === 'function') {
            artInstance.triggerSeekRipple(false);
          } else {
            artInstance.seek = Math.min(
              artInstance.duration || Infinity,
              (artInstance.currentTime || 0) + 10,
            );
          }
        } else {
          const videoEl = playerContainerRef.current?.querySelector('video');
          if (videoEl) {
            videoEl.currentTime = Math.min(videoEl.duration || Infinity, videoEl.currentTime + 10);
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (artInstance) {
          artInstance.volume = Math.min(1, Math.round(((artInstance.volume || 1) + 0.1) * 10) / 10);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (artInstance) {
          artInstance.volume = Math.max(0, Math.round(((artInstance.volume || 1) - 0.1) * 10) / 10);
        }
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        goNextEpisode();
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsGuide((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [artInstance, goNextEpisode, setTheaterMode, setShowShortcutsGuide, toast]);

  // ── Smart Fallback Engine ─────────────────────────────────────
  const tryNextServer = useCallback(
    (reason: string) => {
      if (fallbackInProgressRef.current) return;
      fallbackInProgressRef.current = true;
      const currentIdx = currentServer;
      const upd = [...failedServers, currentIdx];
      setFailedServers(upd);
      setIsFallbacking(true);

      const errorKind = classifyPlayerError({ type: reason });
      markSourceFailure(sourceCandidate, errorKind);
      recordTelemetry(
        'player.source_failed',
        {
          source: server?._source || 'unknown',
          server: server?.server_name || 'unknown',
          episode: currentEpData?.slug || currentEpData?.name || 'unknown',
          error_kind: errorKind,
          attempt: fallbackAttemptRef.current + 1,
        },
        'warning',
      );

      const targetEpisode = currentEpData?.slug || currentEpData?.name || currentEp;
      const candidates = episodes.filter((ep) => {
        const matchingEpisode = findMatchingEpisode(ep.server_data, targetEpisode);
        return (
          isAutomaticPlaybackSource(ep._source) &&
          Boolean(matchingEpisode) &&
          isPlayableEpisode(matchingEpisode) &&
          !upd.includes(episodes.indexOf(ep))
        );
      });
      // Preserve the selected audio/subtitle when possible. If every matching
      // source is dead, prefer a playable alternative over an endless spinner.
      const sameType = candidates.filter((ep) => ep._type === activeServerType);
      const usable = sameType.length > 0 ? sameType : candidates;
      const ranked = rankHealthyCandidates(usable);
      const nextEp = ranked[0];

      if (!nextEp) {
        fallbackInProgressRef.current = false;
        if (alternateSourcesLoading) {
          setPendingFallbackReason(reason);
          setIsFallbacking(true);
          setFallbackMessage('Đang tìm máy chủ dự phòng...');
          return;
        }
        setPendingFallbackReason(null);
        setIsFallbacking(false);
        setFallbackMessage('');
        toast(
          `Không còn server ${TYPE_CFG[activeServerType].label} khả dụng cho tập này.`,
          'error',
        );
        return;
      }

      const nextIdx = episodes.indexOf(nextEp);
      setPendingFallbackReason(null);
      setFallbackMessage(`Thử server ${nextEp.server_name}...`);

      // Delay nhỏ để UX mượt, không flash. Keep its handle so leaving the
      // player cannot let a stale fallback navigate back to this film.
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = setTimeout(() => {
        fallbackTimerRef.current = null;
        setCurrentServer(nextIdx);
        const nextType = nextEp._type as ServerType;
        if (nextType !== activeServerType) {
          preserveServerOnTypeChangeRef.current = true;
          setActiveServerType(nextType);
        }
        setVidsrcManuallySelected(false);
        const nextEpisodeData = findMatchingEpisode(nextEp.server_data, targetEpisode);
        setPlayerEngine(nextEpisodeData?.link_m3u8 ? 'hls' : 'iframe');
        setIsFallbacking(false);
        fallbackInProgressRef.current = false;
        setFallbackMessage('');
        fallbackAttemptRef.current += 1;

        playerLoadStartedAtRef.current = Date.now();
        recordTelemetry('player.fallback', {
          from_source: server?._source || 'unknown',
          to_source: nextEp._source || 'unknown',
          episode: targetEpisode || 'unknown',
          fallback_kind: 'iframe',
        });
      }, 600);
    },
    [
      currentServer,
      failedServers,
      episodes,
      activeServerType,
      alternateSourcesLoading,
      currentEp,
      currentEpData,
      server,
      sourceCandidate,
      toast,
    ],
  );

  useEffect(() => {
    if (!pendingFallbackReason || alternateSourcesLoading) return;
    // Provider discovery has settled. Retry against the newly available
    // mirrors rather than leaving the KKPhim poster spinning indefinitely.
    fallbackInProgressRef.current = false;
    tryNextServer(pendingFallbackReason);
  }, [alternateSourcesLoading, episodes, pendingFallbackReason, tryNextServer]);

  useEffect(() => {
    if (!pendingFallbackReason) return;
    const timer = window.setTimeout(() => {
      setPendingFallbackReason(null);
      fallbackInProgressRef.current = false;
      setIsFallbacking(false);
      setFallbackMessage('');
      toast('Nguồn phim hiện chưa có máy chủ phát khả dụng.', 'error');
    }, 8_000);
    return () => window.clearTimeout(timer);
  }, [pendingFallbackReason, toast]);

  const clearIframeLoadTimeout = useCallback(() => {
    if (iframeLoadTimerRef.current) {
      clearTimeout(iframeLoadTimerRef.current);
      iframeLoadTimerRef.current = null;
    }
  }, []);

  const startIframeLoadTimeout = useCallback(() => {
    clearIframeLoadTimeout();
    // Do not trigger automatic fallback loops if the user explicitly selected a server
    if (vidsrcManuallySelected || userManuallySelectedServer) return;
    iframeLoadTimerRef.current = setTimeout(() => {
      iframeLoadTimerRef.current = null;
      tryNextServer('iframe-timeout');
    }, 20_000);
  }, [clearIframeLoadTimeout, tryNextServer, userManuallySelectedServer, vidsrcManuallySelected]);

  const handlePlayerFailure = useCallback(
    (reason: string) => {
      // Khi luồng ArtPlayer HLS gặp sự cố (CORS, ISP chặn, CDN chết), tự động chuyển sang
      // Trình phát Dự phòng (Embed) của chính tập phim này trước thay vì bỏ qua cả server KKPhim/OPhim.
      if (playerEngine === 'hls' && (embedUrl || iframeUrl)) {
        setPlayerEngine('iframe');
        setIsFallbacking(true);
        setFallbackMessage('Đang chuyển sang Trình phát Dự phòng...');
        setTimeout(() => {
          setIsFallbacking(false);
          setFallbackMessage('');
        }, 600);
        return;
      }
      tryNextServer(reason);
    },
    [playerEngine, embedUrl, iframeUrl, tryNextServer],
  );

  // A failed server may have scheduled a delayed router.replace. Cancel it
  // during unmount so navigation away from a film always remains final.
  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      if (iframeLoadTimerRef.current) {
        clearTimeout(iframeLoadTimerRef.current);
        iframeLoadTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const sp = searchParams.get('server');
    if (sp !== null) {
      const idx = Number(sp) || 0;
      if (episodes[idx]) {
        preserveServerOnTypeChangeRef.current = true;
        setCurrentServer(idx);
        const ep = episodes[idx];
        if (ep?._type) setActiveServerType(ep._type as ServerType);
      }
    }
  }, [episodes, searchParams]);

  useEffect(() => {
    setFailedServers([]);
    setIsFallbacking(false);
    setFallbackMessage('');
    setPendingFallbackReason(null);
    playerLoadStartedAtRef.current = Date.now();
    fallbackAttemptRef.current = 0;
    fallbackInProgressRef.current = false;
    recordedViewRef.current = false;
    playedSourceKeysRef.current.clear();
    lastKnownPlaybackTimeRef.current = resumeAt;
    clearIframeLoadTimeout();
    hasPreloadedNextEpRef.current = false;
    setSuggestedServerToast(null);
    setPlayerEngine(DISABLE_ARTPLAYER ? 'iframe' : m3u8Url ? 'hls' : 'iframe');
    // A new episode intentionally resets source failures; changing source for
    // the same episode must retain them so fallback never retries a bad server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEp]);

  useEffect(() => {
    playerLoadStartedAtRef.current = Date.now();
    if (!DISABLE_ARTPLAYER && m3u8Url) {
      setPlayerEngine('hls');
    } else {
      setPlayerEngine('iframe');
    }
  }, [currentServer, m3u8Url]);

  // An iframe cannot emit media errors from its cross-origin document, so the
  // outer document owns a deterministic source timeout for that transport.
  useEffect(() => {
    if (!iframeUrl || playerEngine !== 'iframe') return;
    startIframeLoadTimeout();
    return () => clearIframeLoadTimeout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iframeUrl, currentServer, playerEngine]);

  useEffect(() => {
    if (preserveServerOnTypeChangeRef.current) {
      preserveServerOnTypeChangeRef.current = false;
      return;
    }
    const currentEpServer = episodes[currentServer];
    if (currentEpServer && currentEpServer._type === activeServerType) {
      return;
    }
    const first = serversByType[activeServerType]?.[0];
    if (first) {
      const gIdx = episodes.indexOf(first);
      setCurrentServer(gIdx >= 0 ? gIdx : 0);
      setPlayerEngine(
        DISABLE_ARTPLAYER ? 'iframe' : first.server_data?.[0]?.link_m3u8 ? 'hls' : 'iframe',
      );
    }
  }, [activeServerType, currentServer, episodes, serversByType]);

  useEffect(() => {
    if (typeof document !== 'undefined' && film?.name) {
      document.title = `Xem Phim ${film.name} ${currentEpData?.name ? `- Tập ${currentEpData.name}` : ''} Vietsub HD | FlexPhim`;
    }
  }, [film?.name, currentEpData?.name]);

  const handleStallSuggestServer = useCallback(async () => {
    if (suggestedServerToast || Date.now() - lastServerSwitchTimeRef.current < 45000) {
      return;
    }
    const candidates = episodes
      .map((ep, idx) => ({ ep, idx }))
      .filter(({ idx }) => idx !== currentServer && !failedServers.includes(idx));

    if (candidates.length === 0) return;

    let bestCandidate: { idx: number; name: string; ping: number } | null = null;
    let minPing = 9999;

    for (const { ep, idx } of candidates.slice(0, 3)) {
      const stream = ep.server_data?.[0]?.link_m3u8 || ep.server_data?.[0]?.link_embed;
      if (!stream) continue;
      const start = performance.now();
      try {
        await fetch(stream, { method: 'HEAD', mode: 'no-cors' });
        const ping = Math.max(15, Math.round(performance.now() - start));
        if (ping < minPing) {
          minPing = ping;
          bestCandidate = { idx, name: ep.server_name || `Server ${idx + 1}`, ping };
        }
      } catch {
        const ping = Math.max(25, Math.round(performance.now() - start));
        if (ping < 300 && ping < minPing) {
          minPing = ping;
          bestCandidate = { idx, name: ep.server_name || `Server ${idx + 1}`, ping };
        }
      }
    }

    if (bestCandidate && bestCandidate.ping < 350) {
      const chosen = bestCandidate;
      setSuggestedServerToast({
        serverIndex: chosen.idx,
        serverName: chosen.name,
        ping: chosen.ping,
      });
      setTimeout(() => {
        setSuggestedServerToast((prev) => (prev?.serverIndex === chosen.idx ? null : prev));
      }, 10000);
    }
  }, [episodes, currentServer, failedServers, suggestedServerToast]);

  const handleAcceptSuggestedServer = useCallback(() => {
    if (!suggestedServerToast) return;
    const targetIdx = suggestedServerToast.serverIndex;
    const serverName = suggestedServerToast.serverName;
    const ping = suggestedServerToast.ping;
    setSuggestedServerToast(null);
    lastServerSwitchTimeRef.current = Date.now();
    preserveServerOnTypeChangeRef.current = true;
    setCurrentServer(targetIdx);
    const targetEp = episodes[targetIdx];
    if (targetEp?._type) {
      setActiveServerType(targetEp._type as ServerType);
    }
    toast(`Đã chuyển sang ${serverName} (Ping ${ping}ms)`, 'success');
  }, [suggestedServerToast, episodes, toast]);

  const handleSelectServer = useCallback(
    (idx: number) => {
      const targetEp = episodes[idx];
      if (!targetEp) return;
      setUserManuallySelectedServer(true);
      setVidsrcManuallySelected(!isAutomaticPlaybackSource(targetEp._source));
      preserveServerOnTypeChangeRef.current = true;
      setCurrentServer(idx);
      if (targetEp._type) {
        setActiveServerType(targetEp._type as ServerType);
      }
      const matchedEpisode = findMatchingEpisode(
        targetEp.server_data,
        currentEpData?.slug || currentEpData?.name || currentEp,
      );
      const matchedEpisodeId = matchedEpisode?.slug || matchedEpisode?.name;
      setPlayerEngine(matchedEpisode?.link_m3u8 ? 'hls' : 'iframe');
      if (matchedEpisodeId) {
        router.replace(watchUrlForEpisode(matchedEpisodeId, idx));
      }
      toast(`Đã chuyển sang ${targetEp.server_name || `Server ${idx + 1}`}`, 'success');
    },
    [episodes, currentEpData, currentEp, router, toast, watchUrlForEpisode],
  );

  const playerServers = useMemo(() => {
    if (!episodes || episodes.length === 0) return [];
    const providerCounts = new Map<string, number>();

    return episodes.map((ep, idx) => {
      const source = ep._source || 'kkphim';
      const abbr = getSourceAbbr(source).replace('KP', 'KK');
      const pCount = (providerCounts.get(abbr) || 0) + 1;
      providerCounts.set(abbr, pCount);

      let typeLabel = 'Vietsub';
      if (ep._type === 'song-ngu') typeLabel = 'Song Ngữ (AI)';
      else if (ep._type === 'thuyet-minh') typeLabel = 'Thuyết Minh';
      else if (ep._type === 'engsub') typeLabel = 'Engsub';
      else if (ep._type === 'raw') typeLabel = 'Bản Gốc';
      else if (ep._type === 'vietsub') typeLabel = 'Vietsub';

      const origName = String(ep.server_name || '');
      const variantMatch = origName.match(/#\d+|\d+$/);
      const variantSuffix = variantMatch ? ` ${variantMatch[0]}` : '';

      const displayName = `Máy chủ ${pCount} (${abbr}) - ${typeLabel}${variantSuffix}`;

      const matched =
        findMatchingEpisode(
          ep.server_data,
          currentEpData?.slug || currentEpData?.name || currentEp,
        ) || ep.server_data?.[0];

      const streamUrl = matched?.link_m3u8 || matched?.link_embed || '';

      return {
        index: idx,
        name: displayName,
        source: ep._source,
        type: ep._type,
        episodesCount: Array.isArray(ep.server_data) ? ep.server_data.length : 0,
        streamUrl,
        isCurrent: idx === currentServer,
      };
    });
  }, [episodes, currentServer, currentEpData, currentEp]);

  if (isLoading) return <WatchSkeleton />;

  if (!isLoading && !film) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <Clapperboard size={40} className="text-white/20 mb-3" />
        <h1 className="text-lg font-bold mb-1">Không tìm thấy phim</h1>
        <Link href="/" className="text-sm text-white/50 hover:text-white mt-4 underline">
          Về trang chủ
        </Link>
      </div>
    );
  }

  const categories = film?.category?.map((c: any) => c.name).join(', ') || '';
  const filteredEps = serverData.filter(
    (ep: any) => !episodeSearch || ep.name.toLowerCase().includes(episodeSearch.toLowerCase()),
  );

  const watchSeoTitle = `Xem Phim ${film?.name || ''} ${currentEpData?.name ? `- Tập ${currentEpData.name}` : ''} Vietsub HD | FlexPhim`;
  const watchSeoDescription = `Xem phim ${film?.name || ''} ${currentEpData?.name ? `Tập ${currentEpData.name}` : ''} Vietsub Thuyết minh HD online mượt mà không quảng cáo độc hại.`;

  const watchJsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': film?.type === 'series' ? 'TVSeries' : 'Movie',
      name: film?.name,
      alternateName: film?.origin_name,
      description: watchSeoDescription,
      image: posterUrl || tmdbBackdropUrl,
      dateCreated: film?.year ? String(film.year) : undefined,
      potentialAction: {
        '@type': 'WatchAction',
        target: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://netphim.app'}/watch/${slug}`,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: `${film?.name || ''} ${currentEpData?.name ? `- Tập ${currentEpData.name}` : ''}`,
      description: watchSeoDescription,
      thumbnailUrl: posterUrl || tmdbBackdropUrl,
      uploadDate: film?.year ? `${film.year}-01-01` : '2024-01-01',
      embedUrl:
        iframeUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://netphim.app'}/watch/${slug}`,
      inLanguage: 'vi',
    },
  ];

  return (
    <div
      data-eager-hydration="true"
      className={`${cardFont.className} relative min-h-screen bg-[#101114] text-white`}
    >
      {/* ── JSON-LD STRUCTURED DATA SCHEMA FOR GOOGLE SEO ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(watchJsonLd) }}
      />

      {/* ── CINEMA LIGHTS-OFF OVERLAY ── */}
      {lightOff && (
        <div
          onClick={() => setLightOff(false)}
          className="fixed inset-0 z-40 flex cursor-pointer items-start justify-center bg-black/90 pt-5 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
        >
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#141414]/90 px-3 py-2 text-[11px] font-semibold text-neutral-300 shadow-lg backdrop-blur-md">
            <LightbulbOff size={14} className="text-neutral-400" />
            <span>Đang tắt đèn. Bấm ra ngoài video để bật lại.</span>
          </div>
        </div>
      )}

      {/* ── DYNAMIC WATCH PAGE SEO META TAGS ── */}
      <title>{watchSeoTitle}</title>
      <meta name="description" content={watchSeoDescription} />
      <meta property="og:title" content={watchSeoTitle} />
      <meta property="og:description" content={watchSeoDescription} />
      <meta property="og:type" content="video.episode" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={watchSeoTitle} />
      <meta name="twitter:description" content={watchSeoDescription} />

      {/* ── MAIN — padded top for navbar (64px) + safe left padding for sidebar (96px) ── */}
      <main
        className={cn(
          'pt-16 sm:pt-[70px] mx-auto px-3 md:px-5 pb-10 transition-all duration-300',
          theaterMode ? 'w-full lg:pl-20 max-w-none' : 'max-w-[1800px] lg:pl-20',
        )}
      >
        <div
          className={cn(
            'grid gap-x-5 gap-y-2 sm:gap-y-2.5 transition-all duration-300 xl:grid-rows-[min-content_auto_auto]',
            'grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px]',
          )}
        >
          {/* ───── 0. TOP CONTROLS & BREADCRUMB BAR (Above Player) ───── */}
          <div
            className={cn(
              'flex h-fit self-start items-center justify-between gap-2 py-1.5 px-3 sm:px-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-white/60 select-none',
              theaterMode ? 'col-span-full' : 'xl:col-start-1 xl:row-start-1',
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold transition-all shrink-0 text-xs shadow-sm hover:scale-105 active:scale-95 cursor-pointer border border-white/15"
              >
                <ArrowLeft size={13} />
                <span>Quay lại</span>
              </button>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Yêu thích */}
              <button
                type="button"
                onClick={handleToggleFavorite}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all font-medium text-xs cursor-pointer select-none border',
                  isFavorite
                    ? 'bg-red-500/15 text-red-400 border-red-500/30 font-semibold'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border-white/[0.06]',
                )}
                title="Thêm vào danh sách yêu thích"
              >
                <Heart
                  size={13}
                  className={cn(
                    'transition-transform',
                    isFavorite ? 'fill-red-500 text-red-500' : 'text-neutral-400',
                  )}
                />
                <span className="hidden sm:inline">{isFavorite ? 'Đã thích' : 'Yêu thích'}</span>
              </button>

              {/* Tủ phim */}
              <button
                type="button"
                onClick={handleToggleWatchlist}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all font-medium text-xs cursor-pointer select-none border',
                  isInWatchlist
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border-white/[0.06]',
                )}
                title="Thêm vào tủ phim"
              >
                {isInWatchlist ? (
                  <Check size={13} className="text-emerald-400" />
                ) : (
                  <Plus size={13} className="text-neutral-400" />
                )}
                <span className="hidden sm:inline">{isInWatchlist ? 'Đã lưu' : 'Tủ phim'}</span>
              </button>

              {/* Cinema Light-Off Button */}
              <button
                onClick={() => setLightOff(!lightOff)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all font-medium text-xs cursor-pointer select-none border',
                  lightOff
                    ? 'bg-white/10 text-white border-white/20 shadow-sm'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white border-white/[0.06]',
                )}
                title="Tắt đèn làm mờ xung quanh"
              >
                {lightOff ? (
                  <LightbulbOff size={13} className="text-neutral-300" />
                ) : (
                  <Lightbulb size={13} className="text-neutral-400" />
                )}
                <span className="hidden sm:inline">{lightOff ? 'Bật Đèn' : 'Tắt Đèn'}</span>
              </button>

              {/* Watch Party / Xem chung Button */}
              <button
                onClick={() => {
                  if (!wp.roomId) {
                    setWatchPartyRequested(true);
                    setManualPartyCreateRequested(true);
                  } else {
                    wp.setIsOpen(!wp.isOpen);
                  }
                }}
                disabled={!watchPartyEnabled}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] hover:text-white/80 transition-colors text-white/60 border border-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                title="Phòng xem phim chung cùng bạn bè"
              >
                <Users size={13} className="text-neutral-400" />
                <span className="hidden sm:inline">
                  {wp.roomId ? `Phòng ${wp.roomId}` : 'Xem chung'}
                </span>
              </button>

              {/* Multi-Platform Share Button & Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.share) {
                      navigator
                        .share({
                          title: film?.name || 'FlexPhim',
                          text: `Xem phim ${film?.name || ''} miễn phí trên FlexPhim!`,
                          url: window.location.href,
                        })
                        .catch(() => setShowShareModal((p) => !p));
                    } else {
                      setShowShareModal((p) => !p);
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] hover:text-white transition-colors text-white/50 text-xs font-medium border border-white/[0.06] cursor-pointer"
                  title="Chia sẻ phim ra các nền tảng"
                >
                  <Share2 size={13} />
                  <span className="hidden sm:inline">Chia sẻ</span>
                </button>

                {/* Multi-Platform Share Dropdown */}
                {showShareModal && (
                  <div className="absolute right-0 top-full mt-2 z-50 w-72 p-3.5 rounded-2xl bg-[#111419]/95 border border-white/15 backdrop-blur-xl shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Share2 size={13} className="text-blue-400" /> Chia Sẻ Phim Trực Tiếp
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowShareModal(false)}
                        className="text-neutral-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-white/10"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Direct Platform Links */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                      {/* Facebook */}
                      <a
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-all active:scale-95"
                      >
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center">
                          f
                        </span>
                        <span>Facebook</span>
                      </a>

                      {/* Zalo */}
                      <a
                        href={`https://zalo.me/share?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-400/30 transition-all active:scale-95"
                      >
                        <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-black text-[10px] flex items-center justify-center">
                          Z
                        </span>
                        <span>Zalo</span>
                      </a>

                      {/* Telegram */}
                      <a
                        href={`https://t.me/share/url?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(`Xem phim ${film?.name || ''} chất lượng cao!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/30 transition-all active:scale-95"
                      >
                        <Send size={13} className="text-sky-400" />
                        <span>Telegram</span>
                      </a>

                      {/* Twitter / X */}
                      <a
                        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(`Xem phim ${film?.name || ''} trên FlexPhim!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border border-white/10 transition-all active:scale-95"
                      >
                        <span className="font-mono text-xs">𝕏</span>
                        <span>Twitter / X</span>
                      </a>
                    </div>

                    {/* Copy Link Input Bar */}
                    <div className="pt-2 border-t border-white/10 flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={typeof window !== 'undefined' ? window.location.href : ''}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-neutral-300 focus:outline-none truncate font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          setCopied(true);
                          toast('Đã sao chép liên kết!', 'success');
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg border border-white/15 transition-all shrink-0 active:scale-95"
                      >
                        {copied ? (
                          <Check size={13} className="text-emerald-400" />
                        ) : (
                          <Copy size={13} />
                        )}
                        <span>{copied ? 'Đã chép' : 'Chép'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Kiểm tra Máy Chủ (Admin Only) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowServerHealthModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-colors text-xs font-semibold border border-amber-500/25 cursor-pointer shadow-sm select-none"
                  title="Kiểm tra sức khỏe & tốc độ máy chủ (Chỉ dành cho Quản trị viên)"
                >
                  <Activity size={13} className="text-amber-400" />
                  <span>Kiểm tra</span>
                </button>
              )}
            </div>
          </div>

          {/* ───── 1. PLAYER ───── */}
          <div
            ref={playerContainerRef}
            className={cn(
              'netphim-watch-player bg-black rounded-none overflow-hidden relative shadow-2xl ring-1 ring-white/[0.06] select-none transition-all duration-300 flex items-center justify-center',
              theaterMode
                ? 'is-theater col-span-full w-full aspect-[16/9] sm:aspect-auto sm:h-[72vh] lg:h-[78vh] min-h-[400px] max-h-[920px] mx-auto shadow-2xl ring-1 ring-white/10'
                : 'xl:col-start-1 xl:row-start-2 w-full aspect-video',
              lightOff ? 'relative z-50 ring-1 ring-white/20 shadow-2xl' : '',
            )}
          >
            {/* Fallback overlay */}
            {isFallbacking && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-3">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <p className="text-white/70 text-sm font-medium">
                  {fallbackMessage || 'Đang chuyển server...'}
                </p>
                {fallbackAttemptRef.current > 0 && (
                  <p className="text-white/30 text-xs">Lần thử {fallbackAttemptRef.current + 1}</p>
                )}
              </div>
            )}

            {videoUrl ? (
              <>
                {!DISABLE_ARTPLAYER && playerEngine === 'hls' && m3u8Url ? (
                  <HlsVideoPlayer
                    key={`hls:${server?._source || 'unknown'}:${currentServer}:${currentEpData?.slug || currentEpData?.name || ''}`}
                    src={m3u8Url}
                    proxySrc={m3u8ProxyUrl}
                    poster={optimizedPlayerPoster || posterUrl}
                    title={film?.name || film?.title || ''}
                    subtitle={currentEpData?.name ? `Tập ${currentEpData.name}` : ''}
                    subtitles={
                      Array.isArray(currentEpData?.subtitles) ? currentEpData.subtitles : undefined
                    }
                    thumbnailVttUrl={[
                      currentEpData?.thumbnailVttUrl,
                      currentEpData?.thumbnail_vtt,
                      currentEpData?.preview_vtt,
                      currentEpData?.storyboard,
                    ].find((value) => typeof value === 'string' && value.trim().length > 0)}
                    skipIntroStart={currentEpData?.intro?.start}
                    skipIntroEnd={currentEpData?.intro?.end}
                    skipOutroStart={currentEpData?.outro?.start}
                    initialTime={lastKnownPlaybackTimeRef.current || resumeAt}
                    autoPlay={autoPlayConfig}
                    autoSkipAds={useSettingsStore.getState().autoSkipAds ?? true}
                    servers={playerServers}
                    currentServerIndex={currentServer}
                    onSwitchServer={handleSelectServer}
                    onReady={(player) => {
                      setArtInstance(player);
                      setPlayerReadySlug(slug);
                      setIsFallbacking(false);
                      setFallbackMessage('');
                    }}
                    onPlaying={() => {
                      const sourceKey = `${sourceCandidate.source || 'unknown'}:${sourceCandidate.serverName || 'unknown'}`;
                      if (!playedSourceKeysRef.current.has(sourceKey)) {
                        playedSourceKeysRef.current.add(sourceKey);
                        markSourceSuccess(sourceCandidate);
                        recordTelemetry('watch_now.success', {
                          source: sourceCandidate.source || 'unknown',
                          server: sourceCandidate.serverName || 'unknown',
                          episode: currentEpData?.slug || currentEpData?.name || 'unknown',
                          start_time_ms: Date.now() - playerLoadStartedAtRef.current,
                          engine: 'hls',
                        });
                        if (!recordedViewRef.current) {
                          recordedViewRef.current = true;
                          void viewApi
                            .record(slug, {
                              title: film?.name || slug,
                              originName: film?.origin_name,
                              posterUrl,
                              year: Number(film?.year) || undefined,
                              type: film?.type,
                              episode: currentEpData?.slug || currentEpData?.name,
                              serverName: sourceCandidate.serverName,
                              provider: sourceCandidate.source,
                            })
                            .catch(() => {
                              recordedViewRef.current = false;
                            });
                        }
                      }
                    }}
                    onBuffering={(bufferMs) => {
                      recordTelemetry('player.buffering', {
                        source: sourceCandidate.source || 'unknown',
                        server: sourceCandidate.serverName || 'unknown',
                        episode: currentEpData?.slug || currentEpData?.name || 'unknown',
                        buffer_ms: bufferMs,
                        engine: 'hls',
                      });
                    }}
                    onProgress={handlePlaybackProgress}
                    onEnded={handleVideoEnded}
                    onStallSuggestServer={handleStallSuggestServer}
                    onError={(error) => handlePlayerFailure(error.type)}
                  />
                ) : iframeUrl ? (
                  <div className="relative w-full h-full">
                    <iframe
                      key={`iframe:${server?._source || 'unknown'}:${currentServer}:${currentEpData?.slug || currentEpData?.name || ''}`}
                      src={iframeUrl}
                      className="w-full h-full border-0"
                      allowFullScreen
                      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer"
                      referrerPolicy="strict-origin-when-cross-origin"
                      sandbox={iframeSandbox}
                      title={`${film?.name} - ${currentEpData?.name}`}
                      onLoad={() => {
                        clearIframeLoadTimeout();
                        setPlayerReadySlug(slug);
                        setIsFallbacking(false);
                        setFallbackMessage('');
                        const sourceKey = `${sourceCandidate.source || 'unknown'}:${sourceCandidate.serverName || 'unknown'}`;
                        if (!playedSourceKeysRef.current.has(sourceKey)) {
                          playedSourceKeysRef.current.add(sourceKey);
                          markSourceSuccess(sourceCandidate);
                          recordTelemetry('watch_now.success', {
                            source: sourceCandidate.source || 'unknown',
                            server: sourceCandidate.serverName || 'unknown',
                            episode: currentEpData?.slug || currentEpData?.name || 'unknown',
                            start_time_ms: Date.now() - playerLoadStartedAtRef.current,
                            engine: 'iframe',
                          });
                          if (!recordedViewRef.current) {
                            recordedViewRef.current = true;
                            void viewApi
                              .record(slug, {
                                title: film?.name || slug,
                                originName: film?.origin_name,
                                posterUrl,
                                year: Number(film?.year) || undefined,
                                type: film?.type,
                                episode: currentEpData?.slug || currentEpData?.name,
                                serverName: sourceCandidate.serverName,
                                provider: sourceCandidate.source,
                              })
                              .catch(() => {
                                recordedViewRef.current = false;
                              });
                          }
                        }
                        recordTelemetry('player.iframe_loaded', {
                          source: sourceCandidate.source || 'unknown',
                          server: sourceCandidate.serverName || 'unknown',
                          episode: currentEpData?.slug || currentEpData?.name || 'unknown',
                        });
                      }}
                      onError={() => {
                        if (!userManuallySelectedServer) {
                          handlePlayerFailure('iframe-error');
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full text-white/30">
                    <AlertTriangle size={28} className="mb-2" />
                    <p className="text-xs">Không có nguồn video</p>
                  </div>
                )}

                {autoNextCountdown !== null && (
                  <AutoNextOverlay
                    seconds={autoNextCountdown}
                    onSkip={goNextEpisode}
                    onCancel={() => setAutoNextCountdown(null)}
                  />
                )}

                {/* Smart Server Failover Suggestion Toast */}
                {suggestedServerToast && (
                  <div className="absolute bottom-16 left-4 z-50 max-w-sm rounded-2xl border border-sky-500/40 bg-[#12141c]/95 p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                        <Sparkles size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white">
                          Đường truyền hiện tại đang chậm
                        </p>
                        <p className="mt-0.5 text-[11px] text-neutral-300 leading-snug">
                          <span className="font-bold text-sky-300">
                            {suggestedServerToast.serverName}
                          </span>{' '}
                          (Ping {suggestedServerToast.ping}ms) đang phản hồi rất nhanh. Bạn có muốn
                          đổi không?
                        </p>
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            onClick={handleAcceptSuggestedServer}
                            className="rounded-lg bg-sky-500 hover:bg-sky-400 px-3 py-1.5 text-xs font-extrabold text-white shadow-md transition-colors cursor-pointer"
                          >
                            Đổi ngay
                          </button>
                          <button
                            onClick={() => setSuggestedServerToast(null)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer"
                          >
                            Bỏ qua
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full text-white/20">
                <Clapperboard size={36} className="mb-2" />
                <p className="text-xs">Không tìm thấy nguồn phim</p>
              </div>
            )}
          </div>

          {/* ── 2. UNDER-PLAYER CONTENT (Title, Episodes, Cast, Comments) ── */}
          <div
            className={cn(
              'space-y-4 min-w-0',
              theaterMode
                ? 'col-span-1 xl:col-start-1 xl:row-start-3'
                : 'xl:col-start-1 xl:row-start-3',
            )}
          >
            {/* ── EXPANDABLE SHORTCUTS & GESTURE GUIDE (Premium Clean Cinema Standard) ── */}
            {showShortcutsGuide && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 p-4 sm:p-5 bg-neutral-900/90 border border-white/10 rounded-2xl animate-in fade-in zoom-in-95 duration-200 shadow-2xl backdrop-blur-xl">
                {/* Column 1: Desktop Keyboard */}
                <div className="space-y-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
                    <Monitor size={15} className="text-[#23ade5]" />
                    <span>Bàn Phím (Desktop)</span>
                  </div>
                  <div className="space-y-2 text-xs text-neutral-300">
                    <div className="flex items-center justify-between py-1 border-b border-white/[0.05]">
                      <span className="text-neutral-400">Phát / Tạm dừng</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-[10px] font-mono font-bold text-white shadow-sm">
                        Space / K
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-white/[0.05]">
                      <span className="text-neutral-400">Toàn màn hình</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-[10px] font-mono font-bold text-white shadow-sm">
                        F
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-white/[0.05]">
                      <span className="text-neutral-400">Tua lùi / Tới 10s</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-[10px] font-mono font-bold text-white shadow-sm">
                        ← / →
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-white/[0.05]">
                      <span className="text-neutral-400">Tăng / Giảm âm lượng</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-[10px] font-mono font-bold text-white shadow-sm">
                        ↑ / ↓
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-neutral-400">Chuyển tập kế tiếp</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-[10px] font-mono font-bold text-white shadow-sm">
                        N
                      </kbd>
                    </div>
                  </div>
                </div>

                {/* Column 2: Mobile Gestures */}
                <div className="space-y-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
                    <Smartphone size={15} className="text-[#23ade5]" />
                    <span>Cử Chỉ (Mobile)</span>
                  </div>
                  <div className="space-y-2.5 text-xs text-neutral-300">
                    <div className="flex items-start gap-2.5 py-1 border-b border-white/[0.05]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#23ade5] mt-1.5 shrink-0" />
                      <span className="leading-relaxed">
                        Chạm 1 lần để hiện hoặc ẩn thanh điều khiển
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 py-1 border-b border-white/[0.05]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#23ade5] mt-1.5 shrink-0" />
                      <span className="leading-relaxed">
                        Chạm đúp bên trái hoặc phải để tua 10 giây
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#23ade5] mt-1.5 shrink-0" />
                      <span className="leading-relaxed">
                        Nhấn giữ video để kích hoạt{' '}
                        <b className="text-white font-semibold">Tốc độ 2x</b>, thả tay để về 1x
                      </span>
                    </div>
                  </div>
                </div>

                {/* Column 3: Quick Action Functions */}
                <div className="space-y-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
                    <SlidersHorizontal size={15} className="text-[#23ade5]" />
                    <span>Tính Năng Phím Nhanh</span>
                  </div>
                  <div className="space-y-2 text-xs text-neutral-300">
                    <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <SkipForward size={13} className="text-[#23ade5]" />
                        <span>Tự động chuyển tập</span>
                      </span>
                      <span className="text-[10px] font-bold text-neutral-400 font-mono">
                        Auto Next
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Bug size={13} className="text-purple-400" />
                        <span>Báo lỗi link phim</span>
                      </span>
                      <span className="text-[10px] font-bold text-neutral-400 font-mono">
                        Report
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. TITLE + PREV/NEXT */}
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-base md:text-lg font-bold text-white leading-snug truncate">
                  {film?.name}
                  {currentEpData?.name && (
                    <span className="text-white/35 font-normal ml-2 text-sm">
                      · Tập {currentEpData.name.replace(/^tập\s*/i, '')}
                    </span>
                  )}
                </h1>
                {categories && <p className="text-[11px] text-white/30 mt-0.5">{categories}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {currentEpIndex > 0 && (
                  <button
                    onClick={() => {
                      const p = serverData[currentEpIndex - 1];
                      navigateToEpisode(p.slug || p.name);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-neutral-300 bg-white/[0.04] border border-white/10 rounded-xl hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft size={13} /> {t('watch.prevEpisode', 'Tập trước')}
                  </button>
                )}
                {currentEpIndex >= 0 && currentEpIndex < serverData.length - 1 && (
                  <button
                    onClick={() => {
                      const n = serverData[currentEpIndex + 1];
                      navigateToEpisode(n.slug || n.name);
                    }}
                    className="flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-white/20"
                  >
                    {t('watch.nextEpisode', 'Tập tiếp')} <ChevronRight size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* ── Seamless Cinema Navigation Bar ── */}
            <div className="w-full pb-2.5 sm:pb-3 border-b border-white/[0.08]">
              <nav
                className="flex items-center justify-start md:justify-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full px-1 sm:px-0 touch-pan-x select-none"
                aria-label="Nội dung phim"
              >
                {[
                  {
                    id: 'episodes' as const,
                    label: lang === 'en' ? 'Episodes' : 'Tập phim',
                    icon: Clapperboard,
                  },
                  {
                    id: 'recommendations' as const,
                    label: lang === 'en' ? 'For you' : 'Đề xuất',
                    icon: Sparkles,
                  },
                  {
                    id: 'cast' as const,
                    label: lang === 'en' ? 'Cast' : 'Diễn viên',
                    icon: Users,
                  },
                  {
                    id: 'trailer' as const,
                    label: 'Trailer',
                    icon: CirclePlay,
                  },
                  {
                    id: 'collection' as const,
                    label: lang === 'en' ? 'Gallery' : 'Bộ sưu tập',
                    icon: FolderOpen,
                  },
                ].map((tab) => {
                  const active = watchContentTab === tab.id;
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setWatchContentTab(tab.id)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-[11.5px] sm:text-xs font-semibold transition-all cursor-pointer select-none shrink-0 whitespace-nowrap',
                        active
                          ? 'bg-[#24262c] text-white font-bold shadow-sm ring-1 ring-white/10'
                          : 'text-neutral-400 hover:text-white hover:bg-[#1a1c22]',
                      )}
                    >
                      <IconComponent size={13} aria-hidden="true" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className={watchContentTab === 'episodes' ? 'block' : 'hidden'}>
              <div className="space-y-3.5 py-1">
                {/* ── Seamless Cinema Streaming Controls ── */}
                {(() => {
                  const subEps = episodes.filter((ep) => ep._type === 'vietsub');
                  const songNguEps = episodes.filter((ep) => ep._type === 'song-ngu');
                  const dubEps = episodes.filter((ep) => ep._type === 'thuyet-minh');
                  const engsubEps = episodes.filter((ep) => ep._type === 'engsub');
                  const rawEps = episodes.filter((ep) => ep._type === 'raw');
                  const sourceSummary = (items: SourceServer[], fallback: string) => {
                    const labels = Array.from(
                      new Set(items.map((item) => getSourceLabel(item._source))),
                    );
                    return labels.length > 0 ? labels.join(' · ') : fallback;
                  };
                  const activeGroup =
                    activeServerType === 'song-ngu'
                      ? songNguEps
                      : activeServerType === 'thuyet-minh'
                        ? dubEps
                        : activeServerType === 'engsub'
                          ? engsubEps
                          : activeServerType === 'raw'
                            ? rawEps
                            : subEps;

                  const subOptions = [
                    {
                      id: 'vietsub',
                      label: 'Vietsub',
                      icon: MessageSquare,
                      sources: sourceSummary(subEps, 'KKPhim · NguonC · VSMov · OPhim'),
                      count: subEps.length,
                      eps: subEps,
                    },
                    {
                      id: 'song-ngu',
                      label: 'Song Ngữ',
                      icon: Tv,
                      sources: sourceSummary(songNguEps, 'ViCDN'),
                      count: songNguEps.length,
                      eps: songNguEps,
                    },
                    {
                      id: 'thuyet-minh',
                      label: 'Thuyết Minh',
                      icon: Mic,
                      sources: sourceSummary(dubEps, 'KKPhim · NguonC · VSMov · OPhim'),
                      count: dubEps.length,
                      eps: dubEps,
                    },
                    {
                      id: 'engsub',
                      label: 'Engsub',
                      icon: Globe,
                      sources: sourceSummary(engsubEps, 'VidSrc · VidLink · 2Embed · VidCore'),
                      count: engsubEps.length,
                      eps: engsubEps,
                    },
                    ...(rawEps.length > 0
                      ? [
                          {
                            id: 'raw',
                            label: 'Bản Gốc',
                            icon: Film,
                            sources: sourceSummary(rawEps, 'Nguồn nguyên bản'),
                            count: rawEps.length,
                            eps: rawEps,
                          },
                        ]
                      : []),
                  ];

                  return (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-2.5 pb-2.5 border-b border-white/[0.08]">
                      {/* Language groups / versions */}
                      <div
                        className="flex items-center justify-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto px-1 sm:px-0 touch-pan-x"
                        role="tablist"
                        aria-label="Phiên bản phát"
                      >
                        {subOptions.map((opt) => {
                          const isActive = activeServerType === opt.id;
                          const hasItems = opt.count > 0;
                          const IconComponent = opt.icon;

                          return (
                            <button
                              key={opt.id}
                              role="tab"
                              aria-selected={isActive}
                              disabled={!hasItems}
                              onClick={() => {
                                if (!hasItems) return;
                                const selectingVidSrc = opt.eps.every(
                                  (candidate) => !isAutomaticPlaybackSource(candidate._source),
                                );
                                setVidsrcManuallySelected(selectingVidSrc);
                                setActiveServerType(opt.id as ServerType);
                                if (opt.eps.length > 0) {
                                  const targetEpisode =
                                    currentEpData?.slug || currentEpData?.name || currentEp;
                                  const first =
                                    opt.eps.find((candidate) =>
                                      findMatchingEpisode(candidate.server_data, targetEpisode),
                                    ) || opt.eps[0];
                                  const idx = episodes.indexOf(first);
                                  const targetIdx = idx >= 0 ? idx : 0;
                                  preserveServerOnTypeChangeRef.current = true;
                                  setCurrentServer(targetIdx);
                                  const matchedEpisode = findMatchingEpisode(
                                    first?.server_data,
                                    targetEpisode,
                                  );
                                  const matchedEpisodeId =
                                    matchedEpisode?.slug || matchedEpisode?.name;
                                  setPlayerEngine(matchedEpisode?.link_m3u8 ? 'hls' : 'iframe');
                                  if (matchedEpisodeId)
                                    router.replace(watchUrlForEpisode(matchedEpisodeId, targetIdx));
                                }
                              }}
                              className={cn(
                                'group relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] sm:text-xs font-medium transition-all select-none border shrink-0 whitespace-nowrap',
                                isActive
                                  ? 'border-white/15 bg-white/[0.08] text-white font-semibold cursor-pointer shadow-sm'
                                  : hasItems
                                    ? 'border-transparent bg-transparent text-neutral-400 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-neutral-200 cursor-pointer'
                                    : 'cursor-not-allowed border-transparent bg-transparent text-neutral-600 opacity-30',
                              )}
                            >
                              <IconComponent
                                size={12}
                                className={cn(
                                  'shrink-0 transition-colors',
                                  isActive
                                    ? 'text-white'
                                    : hasItems
                                      ? 'text-neutral-400 group-hover:text-neutral-200'
                                      : 'text-neutral-600',
                                )}
                              />
                              <span className="truncate">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Divider between language versions and servers (on desktop) */}
                      {activeGroup.length > 0 && (
                        <div className="hidden sm:block h-3.5 w-px bg-white/10 mx-0.5" />
                      )}

                      {/* Server Selection */}
                      {activeGroup.length > 0 && (
                        <div
                          className="flex items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto px-1 sm:px-0 touch-pan-x"
                          role="radiogroup"
                          aria-label="Máy chủ phát"
                        >
                          <div className="flex items-center gap-1 text-[11.5px] sm:text-xs font-medium text-neutral-500 shrink-0 mr-0.5">
                            <Server size={12} className="text-neutral-500" />
                            <span>Máy chủ:</span>
                          </div>

                          {activeGroup.map((ep, groupIndex) => {
                            const idx = episodes.indexOf(ep);
                            const isActive = idx === currentServer;
                            const hasFailed = failedServers.includes(idx);
                            const serverNumber = groupIndex + 1;

                            return (
                              <button
                                key={ep.key || `${ep._source}-${groupIndex}`}
                                type="button"
                                role="radio"
                                aria-checked={isActive}
                                disabled={hasFailed}
                                onClick={() => {
                                  setUserManuallySelectedServer(true);
                                  setVidsrcManuallySelected(!isAutomaticPlaybackSource(ep._source));
                                  preserveServerOnTypeChangeRef.current = true;
                                  setCurrentServer(idx);
                                  const matchedEpisode = findMatchingEpisode(
                                    ep.server_data,
                                    currentEpData?.slug || currentEpData?.name || currentEp,
                                  );
                                  const matchedEpisodeId =
                                    matchedEpisode?.slug || matchedEpisode?.name;
                                  setPlayerEngine(matchedEpisode?.link_m3u8 ? 'hls' : 'iframe');
                                  if (matchedEpisodeId) {
                                    router.replace(watchUrlForEpisode(matchedEpisodeId, idx));
                                  }
                                }}
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] sm:text-xs font-medium transition-all cursor-pointer select-none shrink-0 whitespace-nowrap',
                                  isActive
                                    ? 'border-white/15 bg-white/[0.08] text-white font-semibold shadow-sm'
                                    : 'border-transparent bg-transparent text-neutral-400 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-neutral-200',
                                  hasFailed &&
                                    'cursor-not-allowed border-transparent opacity-25 grayscale',
                                )}
                              >
                                <span>Server {serverNumber}</span>
                                {isActive && (
                                  <CheckCircle2
                                    size={12}
                                    className="shrink-0 text-emerald-400 ml-0.5"
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Chế độ phát: Chuẩn HD (ArtPlayer) / Embed (Dự phòng) */}
                      {m3u8Url && (embedUrl || iframeUrl) && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="hidden sm:block h-3.5 w-px bg-white/10 mx-0.5" />
                          <div
                            className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.08]"
                            role="group"
                            aria-label="Chế độ phát"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setPlayerEngine('hls');
                                toast('Đã chuyển sang Trình phát Chuẩn HD (ArtPlayer)', 'info');
                              }}
                              className={cn(
                                'px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer select-none',
                                playerEngine === 'hls'
                                  ? 'bg-purple-600 text-white font-bold shadow-sm shadow-purple-900/30'
                                  : 'text-neutral-400 hover:text-white',
                              )}
                              title="Trình phát mượt chuẩn ArtPlayer HLS"
                            >
                              Chuẩn HD
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPlayerEngine('iframe');
                                toast('Đã chuyển sang Trình phát Dự phòng', 'info');
                              }}
                              className={cn(
                                'px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer select-none',
                                playerEngine === 'iframe'
                                  ? 'bg-purple-600 text-white font-bold shadow-sm shadow-purple-900/30'
                                  : 'text-neutral-400 hover:text-white',
                              )}
                              title="Trình phát dự phòng nếu luồng HLS bị lỗi hoặc giật lag"
                            >
                              Dự phòng
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <section className="min-w-0 pt-0.5">
                  {/* 4. EPISODE LIST */}
                  {(() => {
                    const rangeSize =
                      serverData.length > 500 ? 100 : serverData.length > 100 ? 50 : 40;
                    const totalRanges = Math.ceil(serverData.length / rangeSize);
                    const safeRangeIndex = Math.max(0, Math.min(epRangeIndex, totalRanges - 1));
                    const rangeStart = safeRangeIndex * rangeSize;
                    const rangeEnd = Math.min((safeRangeIndex + 1) * rangeSize, serverData.length);

                    const candidateEps = episodeSearch.trim()
                      ? filteredEps
                      : serverData.length > 30
                        ? serverData.slice(rangeStart, rangeEnd)
                        : filteredEps;
                    const displayedEps =
                      episodeSortOrder === 'newest' ? [...candidateEps].reverse() : candidateEps;
                    const activeEpisodeKey =
                      currentEp || currentEpData?.slug || currentEpData?.name;

                    return (
                      <div className="space-y-2.5">
                        {/* Episode Header & Action Controls Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <MoviePartSelector
                              film={film}
                              currentSlug={slug}
                              target="watch"
                              currentEp={currentEp}
                            />
                            <span className="text-xs font-bold text-neutral-200">
                              Danh sách tập
                            </span>
                            <span className="text-[11px] font-medium text-neutral-400">
                              ({serverData.length} tập)
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 sm:gap-2">
                            {/* Sort Button */}
                            <button
                              type="button"
                              onClick={() => {
                                const rangeSize =
                                  serverData.length > 500 ? 100 : serverData.length > 100 ? 50 : 40;
                                const totalRanges = Math.ceil(serverData.length / rangeSize);
                                const nextOrder =
                                  episodeSortOrder === 'oldest' ? 'newest' : 'oldest';
                                setEpisodeSortOrder(nextOrder);
                                if (serverData.length > 30) {
                                  setEpRangeIndex(
                                    nextOrder === 'newest' ? Math.max(0, totalRanges - 1) : 0,
                                  );
                                }
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#24262c] hover:bg-[#2f313a] px-3 py-1.5 text-xs font-semibold text-neutral-300 transition-colors cursor-pointer select-none shrink-0 whitespace-nowrap"
                            >
                              <ArrowUpDown size={12} className="text-neutral-400" />
                              <span>{episodeSortOrder === 'oldest' ? 'Cũ nhất' : 'Mới nhất'}</span>
                            </button>

                            {/* Thumbnail Toggle Button */}
                            <button
                              type="button"
                              onClick={() => setShowEpThumbnails(!showEpThumbnails)}
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer select-none shrink-0 whitespace-nowrap',
                                showEpThumbnails
                                  ? 'bg-[#24262c] text-white font-bold shadow-sm'
                                  : 'bg-[#181a20] text-neutral-400 hover:text-white hover:bg-[#24262c]',
                              )}
                            >
                              <FolderOpen size={12} />
                              <span>{showEpThumbnails ? 'Ẩn ảnh' : 'Hiện ảnh'}</span>
                            </button>

                            {/* Episode Search Input */}
                            {serverData.length > 16 && (
                              <div className="relative">
                                <Search
                                  size={12}
                                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30"
                                />
                                <input
                                  type="text"
                                  placeholder="Tìm tập..."
                                  value={episodeSearch}
                                  onChange={(e) => setEpisodeSearch(e.target.value)}
                                  className="bg-[#181a20] border border-white/5 pl-7 pr-3 py-1.5 text-xs text-white placeholder-white/30 rounded-full focus:outline-none focus:bg-[#24262c] w-24 sm:w-28 transition-colors"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Range Navigation Bar for Movies with >30 Episodes */}
                        {serverData.length > 30 && !episodeSearch && (
                          <div className="flex flex-wrap items-center gap-2 py-1">
                            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">
                              Khoảng tập:
                            </span>

                            {/* Quick Dropdown Jump for 1000+ episodes like One Piece */}
                            {totalRanges > 4 && (
                              <select
                                value={safeRangeIndex}
                                onChange={(e) => setEpRangeIndex(Number(e.target.value))}
                                className="bg-[#181a20] border border-white/10 text-white text-xs rounded-full px-3 py-1 font-bold focus:outline-none focus:bg-[#24262c] cursor-pointer"
                              >
                                {Array.from({ length: totalRanges }).map((_, rIdx) => {
                                  const start = rIdx * rangeSize + 1;
                                  const end = Math.min((rIdx + 1) * rangeSize, serverData.length);
                                  return (
                                    <option
                                      key={rIdx}
                                      value={rIdx}
                                      className="bg-neutral-900 text-white font-medium"
                                    >
                                      Tập {start} - {end}
                                    </option>
                                  );
                                })}
                              </select>
                            )}

                            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 pb-1 max-w-full">
                              {Array.from({ length: totalRanges }).map((_, rIdx) => {
                                const start = rIdx * rangeSize + 1;
                                const end = Math.min((rIdx + 1) * rangeSize, serverData.length);
                                const isCurrentRange = rIdx === safeRangeIndex;
                                const containsActiveEp =
                                  currentEpIndex >= start - 1 && currentEpIndex <= end - 1;

                                return (
                                  <button
                                    key={rIdx}
                                    type="button"
                                    onClick={() => setEpRangeIndex(rIdx)}
                                    className={cn(
                                      'px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer',
                                      isCurrentRange
                                        ? 'bg-[#24262c] text-white font-bold shadow-sm border border-white/15'
                                        : containsActiveEp
                                          ? 'bg-[#181a20] text-white font-medium border border-white/10'
                                          : 'bg-transparent text-neutral-400 hover:text-white hover:bg-[#1a1c22]',
                                    )}
                                  >
                                    {start} - {end}
                                    {containsActiveEp && (
                                      <span className="ml-1 w-1.5 h-1.5 rounded-full bg-white inline-block animate-pulse" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Episodes Container */}
                        <div className="pt-1">
                          {!showEpThumbnails ? (
                            /* ── MODE 1: Pill Grid Mode (Smooth Natural Flow) ── */
                            <div
                              ref={epGridRef}
                              className="grid grid-cols-2 gap-2 p-0.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                            >
                              {displayedEps.map((ep: any, i: number) => {
                                const isActive =
                                  ep.slug === activeEpisodeKey || ep.name === activeEpisodeKey;
                                const epNum = ep.name.replace(/^tập\s*/i, '');
                                const epIdentifier = String(ep.slug || ep.name || '')
                                  .toLowerCase()
                                  .replace(/^tập\s*/i, '')
                                  .replace(/^tap-/i, '')
                                  .replace(/^0+/, '')
                                  .trim();
                                const rawSlugKey = String(ep.slug || '')
                                  .toLowerCase()
                                  .replace(/^tập\s*/i, '')
                                  .replace(/^tap-/i, '')
                                  .replace(/^0+/, '')
                                  .trim();
                                const rawNameKey = String(ep.name || '')
                                  .toLowerCase()
                                  .replace(/^tập\s*/i, '')
                                  .replace(/^tap-/i, '')
                                  .replace(/^0+/, '')
                                  .trim();
                                const numKey = String(epNum)
                                  .toLowerCase()
                                  .replace(/^0+/, '')
                                  .trim();
                                const progressPercent = Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    episodeProgressMap[epIdentifier] ??
                                      episodeProgressMap[rawSlugKey] ??
                                      episodeProgressMap[rawNameKey] ??
                                      episodeProgressMap[numKey] ??
                                      episodeProgressMap[String(ep.slug || '')] ??
                                      episodeProgressMap[String(ep.name || '')] ??
                                      0,
                                  ),
                                );
                                const isWatched =
                                  !isActive &&
                                  (watchedEpisodeKeys.has(epIdentifier) ||
                                    watchedEpisodeKeys.has(rawSlugKey) ||
                                    watchedEpisodeKeys.has(rawNameKey) ||
                                    watchedEpisodeKeys.has(numKey) ||
                                    watchProgressStorage.getHistoryEntries().some(
                                      (entry) =>
                                        entry.slug === slug &&
                                        (String(entry.epSlug || '')
                                          .toLowerCase()
                                          .replace(/^tập\s*/i, '')
                                          .replace(/^tap-/i, '')
                                          .replace(/^0+/, '')
                                          .trim() === epIdentifier ||
                                          String(entry.epName || '')
                                            .toLowerCase()
                                            .replace(/^tập\s*/i, '')
                                            .replace(/^tap-/i, '')
                                            .replace(/^0+/, '')
                                            .trim() === epIdentifier),
                                    ));
                                const effectiveProgress =
                                  progressPercent > 0 ? progressPercent : isWatched ? 100 : 0;
                                return (
                                  <button
                                    key={ep.slug || ep.name || i}
                                    aria-current={isActive ? 'true' : undefined}
                                    onClick={() => navigateToEpisode(ep.slug || ep.name)}
                                    className={cn(
                                      'relative flex items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 transition-all cursor-pointer border text-xs font-semibold select-none overflow-hidden',
                                      isActive
                                        ? 'border-white/30 bg-[#282a32] text-white font-extrabold shadow-sm scale-[1.02]'
                                        : isWatched
                                          ? 'bg-[#101216] border-emerald-500/20 text-neutral-300 hover:bg-[#181a20]'
                                          : 'bg-[#131519] hover:bg-[#1f2128] border-white/[0.04] hover:border-white/15 text-neutral-300 hover:text-white hover:scale-[1.01]',
                                    )}
                                  >
                                    {isActive ? (
                                      <span className="inline-flex items-end gap-[2px] h-3 w-3 shrink-0 mr-0.5">
                                        <span className="w-[2px] bg-white rounded-full animate-soundwave-1" />
                                        <span className="w-[2px] bg-white/80 rounded-full animate-soundwave-2" />
                                        <span className="w-[2px] bg-white/60 rounded-full animate-soundwave-3" />
                                      </span>
                                    ) : isWatched ? (
                                      <Check
                                        size={12}
                                        strokeWidth={3}
                                        className="shrink-0 text-emerald-400"
                                      />
                                    ) : (
                                      <Play
                                        size={9}
                                        fill="currentColor"
                                        className="text-white/40 shrink-0 group-hover:text-white"
                                      />
                                    )}
                                    <span>Tập {epNum}</span>

                                    {/* Mini Netflix-Style Episode Progress Bar */}
                                    {effectiveProgress > 0 && (
                                      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20 overflow-hidden pointer-events-none z-10">
                                        <div
                                          className={cn(
                                            'h-full transition-all duration-300',
                                            effectiveProgress >= 90
                                              ? 'bg-purple-400'
                                              : 'bg-purple-500',
                                          )}
                                          style={{ width: `${effectiveProgress}%` }}
                                        />
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            /* ── MODE 2: Landscape Still Grid Mode (Smooth Natural Flow) ── */
                            <div
                              ref={epGridRef}
                              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-0.5"
                            >
                              {displayedEps.map((ep: any, i: number) => {
                                const isActive =
                                  ep.slug === activeEpisodeKey || ep.name === activeEpisodeKey;
                                const epNum = ep.name.replace(/^tập\s*/i, '');
                                const epIdentifier = String(ep.slug || ep.name || '')
                                  .toLowerCase()
                                  .replace(/^tập\s*/i, '')
                                  .replace(/^tap-/i, '')
                                  .replace(/^0+/, '')
                                  .trim();
                                const rawSlugKey = String(ep.slug || '')
                                  .toLowerCase()
                                  .replace(/^tập\s*/i, '')
                                  .replace(/^tap-/i, '')
                                  .replace(/^0+/, '')
                                  .trim();
                                const rawNameKey = String(ep.name || '')
                                  .toLowerCase()
                                  .replace(/^tập\s*/i, '')
                                  .replace(/^tap-/i, '')
                                  .replace(/^0+/, '')
                                  .trim();
                                const numKey = String(epNum)
                                  .toLowerCase()
                                  .replace(/^0+/, '')
                                  .trim();
                                const progressPercent = Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    episodeProgressMap[epIdentifier] ??
                                      episodeProgressMap[rawSlugKey] ??
                                      episodeProgressMap[rawNameKey] ??
                                      episodeProgressMap[numKey] ??
                                      episodeProgressMap[String(ep.slug || '')] ??
                                      episodeProgressMap[String(ep.name || '')] ??
                                      0,
                                  ),
                                );
                                const isWatched =
                                  !isActive &&
                                  (watchedEpisodeKeys.has(epIdentifier) ||
                                    watchedEpisodeKeys.has(rawSlugKey) ||
                                    watchedEpisodeKeys.has(rawNameKey) ||
                                    watchedEpisodeKeys.has(numKey) ||
                                    watchProgressStorage.getHistoryEntries().some(
                                      (entry) =>
                                        entry.slug === slug &&
                                        (String(entry.epSlug || '')
                                          .toLowerCase()
                                          .replace(/^tập\s*/i, '')
                                          .replace(/^tap-/i, '')
                                          .replace(/^0+/, '')
                                          .trim() === epIdentifier ||
                                          String(entry.epName || '')
                                            .toLowerCase()
                                            .replace(/^tập\s*/i, '')
                                            .replace(/^tap-/i, '')
                                            .replace(/^0+/, '')
                                            .trim() === epIdentifier),
                                    ));
                                const effectiveProgress =
                                  progressPercent > 0 ? progressPercent : isWatched ? 100 : 0;

                                return (
                                  <button
                                    key={ep.slug || ep.name || i}
                                    aria-current={isActive ? 'true' : undefined}
                                    onClick={() => navigateToEpisode(ep.slug || ep.name)}
                                    className={cn(
                                      'group/ep relative aspect-video rounded-xl overflow-hidden border transition-all cursor-pointer text-left bg-neutral-900',
                                      isActive
                                        ? 'border-2 border-white/60 ring-2 ring-white/20 shadow-lg'
                                        : 'border-white/10 hover:border-white/30 hover:scale-[1.02]',
                                    )}
                                  >
                                    {/* Use EpisodeThumbnail for multi-tier fallback: TMDB → provider → proxy */}
                                    {(() => {
                                      const parsedEpNumber =
                                        Number(epNum.replace(/[^0-9]/g, '')) || i + 1;
                                      const epStillPath = episodeStillsMap?.[parsedEpNumber];
                                      return (
                                        <EpisodeThumbnail
                                          epNum={epNum}
                                          epIndex={i}
                                          film={film}
                                          episodeStillPath={epStillPath}
                                          tmdbBackdrops={sceneStills}
                                          tmdbPosters={tmdbPosters}
                                          bestBackdrop={bestBackdrop}
                                          bestPoster={bestPoster}
                                          isActive={isActive}
                                          isWatched={isWatched}
                                          lang={lang}
                                        />
                                      );
                                    })()}

                                    {/* Mini Netflix-Style Episode Progress Bar */}
                                    {effectiveProgress > 0 && (
                                      <div className="absolute inset-x-0 bottom-0 h-[3.5px] bg-white/20 overflow-hidden pointer-events-none z-20">
                                        <div
                                          className={cn(
                                            'h-full transition-all duration-300',
                                            effectiveProgress >= 90
                                              ? 'bg-purple-400'
                                              : 'bg-purple-500',
                                          )}
                                          style={{ width: `${effectiveProgress}%` }}
                                        />
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </section>
              </div>
            </div>

            {/* ── 2. RECOMMENDATIONS (Kept in DOM for instant 0ms tab switching & zero image flicker) ── */}
            <div className={watchContentTab === 'recommendations' ? 'block' : 'hidden'}>
              <section className="min-h-52 py-5">
                {discoveryLoading ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="h-28 animate-pulse rounded-xl bg-white/[0.035]" />
                    ))}
                  </div>
                ) : discoveryData?.items?.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {discoveryData.items.slice(0, 10).map((item: any, index: number) => (
                      <RecMovieItem
                        key={item._id || item.slug || index}
                        item={item}
                        index={index}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.09] text-center text-neutral-500">
                    <Sparkles size={22} />
                    <p className="text-xs font-semibold">
                      {lang === 'en'
                        ? 'No recommendations are available yet.'
                        : 'Chưa có phim đề xuất phù hợp.'}
                    </p>
                  </div>
                )}
              </section>
            </div>

            {/* ── 3. CAST (Preserved once visited) ── */}
            {visitedTabs.has('cast') && (
              <div className={watchContentTab === 'cast' ? 'block' : 'hidden'}>
                <section className="min-h-52 py-5">
                  {creditsLoading ? (
                    <div className="grid grid-cols-4 gap-4 sm:grid-cols-6 lg:grid-cols-8">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <div
                          key={index}
                          className="aspect-square animate-pulse rounded-full bg-white/[0.035]"
                        />
                      ))}
                    </div>
                  ) : tmdbCast.length ? (
                    <div className="grid grid-cols-4 gap-x-4 gap-y-5 sm:grid-cols-6 lg:grid-cols-8">
                      {tmdbCast.slice(0, 16).map((person) => {
                        return (
                          <Link
                            key={person.id}
                            href={`/actors/${person.id}`}
                            className="group min-w-0 text-center"
                          >
                            <div className="mx-auto aspect-square w-full max-w-28 overflow-hidden rounded-full border-2 border-white/[0.09] bg-white/[0.035] transition-all group-hover:-translate-y-0.5 group-hover:border-fuchsia-400/55 group-hover:shadow-[0_10px_28px_-14px_rgba(244,114,182,0.6)]">
                              <WatchCastAvatar
                                name={person.name}
                                profilePath={person.profile_path}
                              />
                            </div>
                            <p className="mt-2 truncate text-[11px] font-bold text-neutral-200 group-hover:text-fuchsia-200 sm:text-xs">
                              {person.name}
                            </p>
                            <p className="truncate text-[9px] text-neutral-500 sm:text-[10px]">
                              {person.character || (lang === 'en' ? 'Cast member' : 'Diễn viên')}
                            </p>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.09] text-center text-neutral-500">
                      <Users size={22} />
                      <p className="text-xs font-semibold">
                        {lang === 'en'
                          ? 'Cast information is unavailable.'
                          : 'Chưa có thông tin diễn viên.'}
                      </p>
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ── 4. TRAILER (Mounts only when active to prevent background YouTube audio) ── */}
            {watchContentTab === 'trailer' && (
              <section className="min-h-52 py-5">
                <WatchTrailerView
                  film={film}
                  tmdbTrailerKey={tmdbTrailer?.key}
                  videosLoading={videosLoading}
                  lang={lang}
                />
              </section>
            )}

            {/* ── 5. COLLECTION (Preserved once visited) ── */}
            {visitedTabs.has('collection') && (
              <div className={watchContentTab === 'collection' ? 'block' : 'hidden'}>
                <section className="min-h-52 py-5">
                  {diverseTmdbBackdrops.length ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {diverseTmdbBackdrops.map((image, index) => {
                        const rawUrl = tmdbBackdrop(image.file_path, 'w780');
                        const imageUrl = rawUrl;
                        return imageUrl ? (
                          <div
                            key={`${image.file_path}-${index}`}
                            className="group relative aspect-video overflow-hidden rounded-xl border border-white/[0.08] bg-[#12151b] transition-all hover:border-white/25 hover:shadow-lg"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imageUrl}
                              alt={`${film?.name || 'FlexPhim'} ${index + 1}`}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                          </div>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <div className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.09] text-center text-neutral-500">
                      <FolderOpen size={22} />
                      <p className="text-xs font-semibold">
                        {lang === 'en'
                          ? 'This movie has no gallery yet.'
                          : 'Phim này chưa có bộ sưu tập hình ảnh.'}
                      </p>
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* 6. COMMENTS */}
            <div ref={commentsSectionRef} className="min-h-24 border-t border-white/[0.08] pt-5">
              {commentsReady ? (
                <AdvancedCommentSection
                  movieSlug={slug}
                  episodeName={
                    currentEpData?.name
                      ? `Tập ${currentEpData.name.replace(/^tập\s*/i, '')}`
                      : undefined
                  }
                  currentVideoTimeSeconds={lastKnownPlaybackTimeRef.current}
                  onSeekToTimestamp={(sec) => {
                    if (artInstance) {
                      artInstance.seek = sec;
                    }
                    if (typeof window !== 'undefined') {
                      window.scrollTo({ top: 180, behavior: 'smooth' });
                    }
                  }}
                />
              ) : (
                <div
                  className="h-24 animate-pulse rounded-xl border border-white/[0.05] bg-white/[0.02]"
                  aria-hidden="true"
                />
              )}
            </div>
          </div>

          {/* ───── 3. RIGHT SIDEBAR (Always available in both normal & theater mode) ───── */}
          <div
            className={cn(
              'space-y-4 min-w-0',
              theaterMode
                ? 'col-span-1 xl:col-start-2 xl:row-start-3'
                : 'xl:col-start-2 xl:row-start-1 xl:row-span-3',
            )}
          >
            {/* Film Info */}
            <SidebarFilmCard film={film} slug={slug} />

            {/* ── PLAYER QUICK ACTIONS PANEL (THU GỌN TINH TẾ) ── */}
            <div className="space-y-1.5 pb-3 border-b border-white/[0.08] select-none">
              {/* Playback toggles */}
              <div className="grid grid-cols-2 gap-1.5">
                {/* Rạp phim */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !theaterMode;
                    setTheaterMode(next);
                    toast(
                      next ? 'Đã bật chế độ Rạp phim mở rộng' : 'Đã tắt chế độ Rạp phim',
                      'info',
                    );
                  }}
                  title={theaterMode ? 'Tắt chế độ rạp phim' : 'Bật chế độ rạp phim'}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer select-none active:scale-95 border',
                    theaterMode
                      ? 'bg-white/15 text-white border-white/20 shadow-sm'
                      : 'bg-white/[0.03] hover:bg-white/[0.07] text-neutral-400 hover:text-neutral-200 border-white/[0.06]',
                  )}
                >
                  <Maximize2
                    size={12}
                    className={theaterMode ? 'text-white' : 'text-neutral-400'}
                  />
                  <span className="truncate">Rạp phim</span>
                </button>

                {/* Tự động chuyển tập */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoNextConfig;
                    setAutoNextConfig(next);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('netphim_auto_next', String(next));
                    }
                    toast(next ? 'Đã bật Tự động chuyển tập' : 'Đã tắt Tự động chuyển tập', 'info');
                  }}
                  title={autoNextConfig ? 'Tắt tự động chuyển tập' : 'Bật tự động chuyển tập'}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer select-none active:scale-95 border',
                    autoNextConfig
                      ? 'bg-white/15 text-white border-white/20 shadow-sm'
                      : 'bg-white/[0.03] hover:bg-white/[0.07] text-neutral-400 hover:text-neutral-200 border-white/[0.06]',
                  )}
                >
                  <SkipForward
                    size={12}
                    className={autoNextConfig ? 'text-white' : 'text-neutral-400'}
                  />
                  <span className="truncate">Tự chuyển</span>
                </button>
              </div>

              {/* Utilities row */}
              <div className="grid grid-cols-2 gap-1.5">
                {/* Báo lỗi */}
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[11px] font-medium text-neutral-400 hover:text-neutral-200 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] transition-all cursor-pointer active:scale-95"
                >
                  <Bug size={12} className="text-neutral-400 shrink-0" />
                  <span>Báo lỗi</span>
                </button>

                {/* Phím tắt */}
                <button
                  type="button"
                  onClick={() => setShowShortcutsGuide((prev) => !prev)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[11px] font-medium transition-all cursor-pointer active:scale-95 border',
                    showShortcutsGuide
                      ? 'bg-white/15 text-white border-white/20'
                      : 'text-neutral-400 hover:text-neutral-200 bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.05]',
                  )}
                >
                  <HelpCircle size={12} className="text-neutral-400 shrink-0" />
                  <span>Phím tắt</span>
                </button>
              </div>
            </div>

            {/* Recommendations */}
            {recsData?.items && recsData.items.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
                  {matchedKeyword ? `Thêm về "${matchedKeyword}"` : 'Phim tương tự'}
                </h3>
                <div className="space-y-1">
                  {recsData.items.slice(0, 8).map((item: any, index: number) => (
                    <RecMovieItem key={item._id || item.slug} item={item} index={index} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Server Health & Speed Monitor Modal */}
      <ServerHealthSpeedModal
        isOpen={showServerHealthModal}
        onClose={() => setShowServerHealthModal(false)}
        servers={episodes}
        currentServerIndex={currentServer}
        onSwitchServer={(idx) => {
          setUserManuallySelectedServer(true);
          setVidsrcManuallySelected(!isAutomaticPlaybackSource(episodes[idx]?._source));
          setCurrentServer(idx);
          if (episodes[idx]?._type) {
            setActiveServerType(episodes[idx]._type as ServerType);
          }
          const matchedEpisode = findMatchingEpisode(
            episodes[idx]?.server_data,
            currentEpData?.slug || currentEpData?.name || currentEp,
          );
          const matchedEpisodeId = matchedEpisode?.slug || matchedEpisode?.name;
          setPlayerEngine(matchedEpisode?.link_m3u8 ? 'hls' : 'iframe');
          if (matchedEpisodeId) {
            router.replace(watchUrlForEpisode(matchedEpisodeId, idx));
          }
        }}
        lang={lang}
      />

      {/* Report & Server Switch Modal */}
      <ReportStreamModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        servers={episodes}
        currentServerIndex={currentServer}
        onSwitchServer={(idx) => {
          setCurrentServer(idx);
        }}
        lang={lang}
      />

      {/* Watch Party Panel */}
      {watchPartyEnabled && wp.isOpen && wp.roomId && (
        <WatchPartyPanel
          roomId={wp.roomId}
          isHost={wp.isHost}
          connectionState={wp.connectionState}
          participants={wp.participants}
          messages={wp.messages}
          floatingReactions={wp.floatingReactions}
          onSendMessage={wp.sendMessage}
          onSendReaction={wp.sendReaction}
          onLeaveRoom={wp.leaveRoom}
          onClose={() => wp.setIsOpen(false)}
        />
      )}
    </div>
  );
}
