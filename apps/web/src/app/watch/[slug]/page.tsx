"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import NextImage from "next/image";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
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
} from "lucide-react";
import { movieApi, watchHistoryApi } from "@/lib/api";
import { resolveImageUrl } from "@/components/film/FilmCard";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/ToastProvider";
import { useAuthStore } from "@/store/authStore";
import { useTranslation } from "@/store/langStore";
import { useWatchParty } from "@/hooks/useWatchParty";
import { useTmdb } from "@/hooks/useTmdb";
import { useTmdbArtwork } from "@/hooks/useTmdbArtwork";
import { tmdbBackdrop } from "@/lib/tmdb";
import { cardFont } from "@/lib/fonts";
import { WatchPartyPanel } from "@/components/watch/WatchPartyPanel";
import { AdvancedCommentSection } from "@/components/comments/AdvancedCommentSection";
import dynamic from "next/dynamic";
import { watchProgressStorage } from "@/lib/watch-progress";
import {
  classifyPlayerError,
  markSourceFailure,
  markSourceSuccess,
  rankHealthyCandidates,
} from "@/lib/player-source-health";
import { recordTelemetry } from "@/lib/telemetry";
import { matchMovies } from "@/lib/dedupe";
import type { MovieSource } from "@/types/movie";
import WatchPageSkeleton from "./loading";
import { safeJsonLd } from "@/lib/safe-json-ld";
import {
  buildVidsrcEmbedUrl,
  canUseUnsandboxedEmbed,
  detectServerType,
  episodeNumberFromLabel,
  findMatchingEpisode,
  isPlayableEpisode,
  isAutomaticPlaybackSource,
  resolveSeasonNumber,
  sourcePriority,
  type ServerType,
  type SourceServer,
} from "@/lib/player-source-routing";

const HlsVideoPlayer = dynamic(
  () =>
    import("@/components/video/HlsVideoPlayer").then(
      (module) => module.HlsVideoPlayer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse bg-[#0b0d12]" />
    ),
  },
);

const TYPE_CFG: Record<
  ServerType,
  { label: string; Icon: any; active: string; inactive: string }
> = {
  vietsub: {
    label: "Vietsub",
    Icon: Subtitles,
    active: "bg-emerald-500/15 border-emerald-500/50 text-emerald-300",
    inactive:
      "bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20",
  },
  "thuyet-minh": {
    label: "Thuyết Minh",
    Icon: Mic,
    active: "bg-amber-500/15 border-amber-500/50 text-amber-300",
    inactive:
      "bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20",
  },
  engsub: {
    label: "Engsub",
    Icon: Subtitles,
    active: "bg-cyan-500/15 border-cyan-500/50 text-cyan-300",
    inactive:
      "bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20",
  },
  raw: {
    label: "Bản Gốc",
    Icon: Monitor,
    active: "bg-sky-500/15 border-sky-500/50 text-sky-300",
    inactive:
      "bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20",
  },
};

// ── Auto-next countdown overlay ────────────────────────────────
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
    <div className="absolute bottom-14 right-5 z-50">
      <div className="bg-black/85 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-4 backdrop-blur-md shadow-xl">
        <div>
          <p className="text-[10px] text-white/40 mb-0.5">
            Tập tiếp theo trong
          </p>
          <p className="text-white font-bold text-2xl tabular-nums leading-none">
            {seconds}s
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSkip}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 text-xs font-bold rounded-lg transition-colors"
          >
            <Play size={11} fill="currentColor" /> Xem ngay
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar Film Card Component with TMDB Artwork Resolution ──
function SidebarFilmCard({ film, slug }: { film: any; slug: string }) {
  const initialPoster =
    resolveImageUrl(film?.poster_url, film?.thumb_url) ||
    resolveImageUrl(film?.thumb_url);

  const [imgSrc, setImgSrc] = useState<string | null>(initialPoster);

  const { posterUrl: tmdbPosterUrl, backdropUrl: tmdbBackdropUrl } = useTmdbArtwork(
    film,
    !imgSrc || imgSrc.startsWith("/api/image-proxy"),
  );

  const preferredTmdb = tmdbPosterUrl || tmdbBackdropUrl;

  useEffect(() => {
    if (initialPoster) {
      setImgSrc(initialPoster);
    } else if (preferredTmdb) {
      setImgSrc(preferredTmdb);
    }
  }, [initialPoster, preferredTmdb]);

  useEffect(() => {
    if (preferredTmdb && (!imgSrc || imgSrc.startsWith("/api/image-proxy"))) {
      setImgSrc(preferredTmdb);
    }
  }, [preferredTmdb, imgSrc]);

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 space-y-3">
      <div className="flex gap-3">
        <div className="relative w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-white/[0.08] bg-neutral-900">
          {imgSrc ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imgSrc}
              alt={film?.name || "Poster"}
              className="w-full h-full object-cover"
              onError={() => {
                if (preferredTmdb && imgSrc !== preferredTmdb) {
                  setImgSrc(preferredTmdb);
                } else if (imgSrc && !imgSrc.startsWith("/api/image-proxy")) {
                  setImgSrc(`/api/image-proxy?url=${encodeURIComponent(imgSrc)}`);
                } else {
                  setImgSrc(null);
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-gradient-to-b from-neutral-800 to-black">
              <Clapperboard size={16} className="text-amber-500/80 mb-0.5" />
              <span className="text-[9px] font-bold text-white leading-tight line-clamp-2">
                {film?.name}
              </span>
            </div>
          )}
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          <h2 className="text-xs font-bold text-white leading-snug line-clamp-2">
            {film?.name}
          </h2>
          {film?.origin_name && film.origin_name !== film.name && (
            <p className="text-[10px] text-white/30 line-clamp-1">
              {film.origin_name}
            </p>
          )}
          <p className="text-[10px] text-white/30">{film?.year}</p>
          <div className="flex flex-wrap gap-1 pt-0.5">
            {film?.quality && (
              <span className="text-[9px] font-bold bg-white/8 text-white/60 px-1.5 py-0.5 rounded border border-white/[0.08]">
                {film.quality}
              </span>
            )}
            {film?.lang && (
              <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400/80 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {film.lang}
              </span>
            )}
          </div>
        </div>
      </div>
      <Link
        href={`/film/${slug}`}
        className="flex items-center justify-center gap-1.5 w-full py-1.5 text-[11px] font-medium text-white/40 bg-white/[0.03] border border-white/[0.06] rounded-lg hover:text-white/70 hover:bg-white/[0.06] transition-colors"
      >
        <Info size={11} /> Chi tiết phim
      </Link>
    </div>
  );
}

// ── Recommendation Item Component with TMDB Artwork Resolution ──
function RecMovieItem({ item }: { item: any }) {
  const initialThumb =
    resolveImageUrl(item.poster_url, item.thumb_url) ||
    resolveImageUrl(item.thumb_url);

  const [imgSrc, setImgSrc] = useState<string | null>(initialThumb);

  const { posterUrl: tmdbPosterUrl, backdropUrl: tmdbBackdropUrl } = useTmdbArtwork(
    item,
    !imgSrc || imgSrc.startsWith("/api/image-proxy"),
  );

  const preferredTmdb = tmdbPosterUrl || tmdbBackdropUrl;

  useEffect(() => {
    if (initialThumb) {
      setImgSrc(initialThumb);
    } else if (preferredTmdb) {
      setImgSrc(preferredTmdb);
    }
  }, [initialThumb, preferredTmdb]);

  useEffect(() => {
    if (preferredTmdb && (!imgSrc || imgSrc.startsWith("/api/image-proxy"))) {
      setImgSrc(preferredTmdb);
    }
  }, [preferredTmdb, imgSrc]);

  return (
    <Link
      href={`/film/${item.slug}`}
      className="flex gap-2.5 group hover:bg-white/[0.03] -mx-1 px-1 py-1 rounded-lg transition-colors"
    >
      <div className="relative w-12 h-[68px] rounded-lg bg-neutral-900 flex-shrink-0 overflow-hidden border border-white/10">
        {imgSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imgSrc}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => {
              if (preferredTmdb && imgSrc !== preferredTmdb) {
                setImgSrc(preferredTmdb);
              } else if (imgSrc && !imgSrc.startsWith("/api/image-proxy")) {
                setImgSrc(`/api/image-proxy?url=${encodeURIComponent(imgSrc)}`);
              } else {
                setImgSrc(null);
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-gradient-to-b from-neutral-800 to-black">
            <Clapperboard size={14} className="text-amber-500/80 mb-0.5" />
            <span className="text-[8px] font-bold text-white leading-tight line-clamp-2">
              {item.name}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 py-0.5 space-y-0.5">
        <p className="text-[11px] font-semibold text-white/70 group-hover:text-white line-clamp-2 leading-snug transition-colors">
          {item.name}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-white/25">
          <span>{item.year}</span>
          {typeof item?.tmdb?.vote_average === "number" && item.tmdb.vote_average > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-0.5 text-amber-400/60 font-bold">
                ★ {item.tmdb.vote_average.toFixed(1)}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Skeleton ──────────────────────────────────────────────────
function WatchSkeleton() {
  return <WatchPageSkeleton />;
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();

  const rawSlug = (params.slug as string) || "";
  const slug = useMemo(() => rawSlug.replace(/_/g, "-"), [rawSlug]);
  const currentEp = searchParams.get("ep") || "";
  const requestedSource = searchParams.get("source");
  const preferredSource = ["kkphim", "ophim", "nguonc", "vsmov"].includes(
    requestedSource || "",
  )
    ? (requestedSource as "kkphim" | "ophim" | "nguonc" | "vsmov")
    : undefined;
  const sourceSlug = searchParams.get("sourceSlug") || slug;
  const roomCode = searchParams.get("room");
  const shouldCreateParty = searchParams.get("party") === "create";
  const requestedRoomName = searchParams.get("roomName") || "";
  const wp = useWatchParty(slug, currentEp);
  const joinWatchPartyRoom = wp.joinRoom;
  const createWatchPartyRoom = wp.createRoom;

  // State
  const [currentServer, setCurrentServer] = useState(0);
  const [failedServers, setFailedServers] = useState<number[]>([]);
  const [episodeSearch, setEpisodeSearch] = useState("");
  const [autoNextConfig, setAutoNextConfig] = useState(true);
  const [autoPlayConfig, setAutoPlayConfig] = useState(true);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(
    null,
  );
  // Native HLS is the primary transport because it exposes real playback
  // events. Provider iframe remains the safe final transport fallback.
  const [playerEngine, setPlayerEngine] = useState<"hls" | "iframe">("hls");
  const [activeServerType, setActiveServerType] =
    useState<ServerType>("vietsub");
  const [currentTypeServer, setCurrentTypeServer] = useState(0);
  const [vidsrcManuallySelected, setVidsrcManuallySelected] = useState(false);

  // Fallback state
  const [isFallbacking, setIsFallbacking] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState("");
  const fallbackAttemptRef = useRef(0);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackInProgressRef = useRef(false);
  const preserveServerOnTypeChangeRef = useRef(false);
  const autoNextTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerLoadStartedAtRef = useRef(Date.now());
  const playedSourceKeysRef = useRef(new Set<string>());
  const lastKnownPlaybackTimeRef = useRef(0);
  const lastProgressSyncRef = useRef(0);

  // Universal Player Container & Gestures (for ALL video players & iframe sources)
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isOuterSpeedBoosted, setIsOuterSpeedBoosted] = useState(false);
  const [outerDoubleTapHud, setOuterDoubleTapHud] = useState<
    "rewind" | "forward" | null
  >(null);
  const outerPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outerLastTapRef = useRef<number>(0);

  // Cinema Mode & Player Enhancement States
  const [lightOff, setLightOff] = useState(false);
  const [subDelayOffset, setSubDelayOffset] = useState<number>(0);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEpThumbnails, setShowEpThumbnails] = useState(false);
  const [artInstance, setArtInstance] = useState<any>(null);
  const [fallbackSourcesReady, setFallbackSourcesReady] = useState(false);
  const [backgroundDataReady, setBackgroundDataReady] = useState(false);
  const hasSkippedIntroRef = useRef(false);
  const joinedRoomRef = useRef<string | null>(null);
  const creatingRoomRef = useRef(false);
  const applyingRemoteStateRef = useRef(false);
  const [epRangeIndex, setEpRangeIndex] = useState(0);
  const epGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fallbackTimer = window.setTimeout(
      () => setFallbackSourcesReady(true),
      450,
    );
    const backgroundTimer = window.setTimeout(
      () => setBackgroundDataReady(true),
      1100,
    );
    return () => {
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(backgroundTimer);
    };
  }, []);

  const [autoSkipIntro, setAutoSkipIntro] = useState<boolean>(() => {
    try {
      return localStorage.getItem("auto-skip-intro") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (
      roomCode &&
      wp.roomId !== roomCode &&
      joinedRoomRef.current !== roomCode
    ) {
      joinedRoomRef.current = roomCode;
      joinWatchPartyRoom(roomCode);
    }
  }, [joinWatchPartyRoom, roomCode, wp.roomId]);

  useEffect(() => {
    const state = wp.remotePlayerState;
    if (!state || !artInstance || wp.isHost) return;

    if (state.episode && state.episode !== currentEp) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("ep", state.episode);
      if (wp.roomId) nextParams.set("room", wp.roomId);
      router.replace(`/watch/${slug}?${nextParams.toString()}`);
      return;
    }

    applyingRemoteStateRef.current = true;
    const drift = Math.abs((artInstance.currentTime || 0) - state.currentTime);
    if (drift > 1.5 || state.action === "seek") {
      artInstance.currentTime = state.currentTime;
    }
    if (state.action === "play") {
      artInstance.video?.play?.().catch?.(() => {});
    } else if (state.action === "pause") {
      artInstance.video?.pause?.();
    }
    const release = window.setTimeout(() => {
      applyingRemoteStateRef.current = false;
    }, 800);
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

  const toggleAutoSkipIntro = (val: boolean) => {
    setAutoSkipIntro(val);
    try {
      localStorage.setItem("auto-skip-intro", String(val));
    } catch {
      // Storage can be unavailable in private browsing mode.
    }
  };

  useEffect(() => {
    hasSkippedIntroRef.current = false;
  }, [currentEp, slug]);

  // Keyboard Shortcuts (Space: Play/Pause, F: Fullscreen, M: Mute, Arrows: Seek/Volume)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (!artInstance) return;

      if (e.code === "Space" || e.code === "KeyK") {
        e.preventDefault();
        artInstance.toggle();
      } else if (e.code === "KeyF") {
        e.preventDefault();
        artInstance.fullscreen = !artInstance.fullscreen;
      } else if (e.code === "KeyM") {
        e.preventDefault();
        artInstance.volume = artInstance.volume === 0 ? 0.8 : 0;
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        artInstance.seek = Math.max(0, artInstance.currentTime - 5);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        artInstance.seek = Math.min(
          artInstance.duration || 9999,
          artInstance.currentTime + 5,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [artInstance]);

  const handleOuterPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest(".art-controls") ||
      target.closest(".art-setting") ||
      target.closest("button")
    ) {
      return;
    }

    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (now - outerLastTapRef.current < 300) {
      if (outerPressTimerRef.current) {
        clearTimeout(outerPressTimerRef.current);
        outerPressTimerRef.current = null;
      }
      const videoEl = playerContainerRef.current?.querySelector("video");
      if (clickX < width * 0.45) {
        if (videoEl)
          videoEl.currentTime = Math.max(0, videoEl.currentTime - 10);
        setOuterDoubleTapHud("rewind");
        setTimeout(() => setOuterDoubleTapHud(null), 800);
      } else if (clickX > width * 0.55) {
        if (videoEl)
          videoEl.currentTime = Math.min(
            videoEl.duration || 0,
            videoEl.currentTime + 10,
          );
        setOuterDoubleTapHud("forward");
        setTimeout(() => setOuterDoubleTapHud(null), 800);
      }
      outerLastTapRef.current = 0;
      return;
    }
    outerLastTapRef.current = now;

    outerPressTimerRef.current = setTimeout(() => {
      const videoEl = playerContainerRef.current?.querySelector("video");
      if (videoEl) videoEl.playbackRate = 2.0;
      setIsOuterSpeedBoosted(true);
    }, 280);
  };

  const handleOuterPointerUp = () => {
    if (outerPressTimerRef.current) {
      clearTimeout(outerPressTimerRef.current);
      outerPressTimerRef.current = null;
    }
    const videoEl = playerContainerRef.current?.querySelector("video");
    if (videoEl) videoEl.playbackRate = 1.0;
    if (isOuterSpeedBoosted) {
      setIsOuterSpeedBoosted(false);
    }
  };

  // Data
  const { data, isLoading } = useQuery({
    queryKey: ["film", sourceSlug, preferredSource],
    queryFn: () =>
      movieApi.getDetail(sourceSlug, preferredSource).then((r) => r.data),
    enabled: !!sourceSlug,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
  const film = data?.movie || data;
  const primarySource = String(
    data?._source || data?.movie?._source || preferredSource || "kkphim",
  );
  const lookupTitle = film?.origin_name || film?.name || "";

  const { data: sourceLookupData } = useQuery({
    queryKey: ["watch-source-lookup", lookupTitle, film?.year],
    queryFn: () => movieApi.search(lookupTitle, 1, 30).then((r) => r.data),
    enabled: fallbackSourcesReady && Boolean(lookupTitle),
    staleTime: 1000 * 60 * 30,
  });

  const matchedSourceRecord = useMemo(() => {
    const items = sourceLookupData?.data?.items || [];
    return items.find((item: any) =>
      matchMovies(
        {
          title: film?.name || "",
          originTitle: film?.origin_name,
          year: Number(film?.year) || undefined,
        },
        {
          title: item?.name || item?.title || "",
          originTitle: item?.origin_name || item?.originTitle,
          year: Number(item?.year) || undefined,
        },
      ),
    );
  }, [sourceLookupData, film?.name, film?.origin_name, film?.year]);

  const sourceSlugFor = useCallback(
    (source: MovieSource) => {
      if (primarySource === source) return sourceSlug;
      return matchedSourceRecord?._sourceSlugs?.[source] || "";
    },
    [matchedSourceRecord, primarySource, sourceSlug],
  );

  const kkphimSlug = sourceSlugFor("kkphim");
  const ophimSlug = sourceSlugFor("ophim");
  const nguoncSlug = sourceSlugFor("nguonc");
  const vsmovSlug = sourceSlugFor("vsmov");

  const { data: kkphimFetchedData } = useQuery({
    queryKey: ["film-kkphim", kkphimSlug],
    queryFn: () =>
      movieApi.getDetailFromSource("kkphim", kkphimSlug).then((r) => r.data),
    enabled:
      fallbackSourcesReady &&
      Boolean(kkphimSlug) &&
      primarySource !== "kkphim",
  });
  const { data: ophimFetchedData } = useQuery({
    queryKey: ["film-ophim", ophimSlug],
    queryFn: () =>
      movieApi.getDetailFromSource("ophim", ophimSlug).then((r) => r.data),
    enabled:
      fallbackSourcesReady && Boolean(ophimSlug) && primarySource !== "ophim",
  });
  const { data: nguoncFetchedData } = useQuery({
    queryKey: ["film-nguonc", nguoncSlug],
    queryFn: () =>
      movieApi.getDetailFromSource("nguonc", nguoncSlug).then((r) => r.data),
    enabled:
      fallbackSourcesReady &&
      Boolean(nguoncSlug) &&
      primarySource !== "nguonc",
  });
  const { data: vsmovFetchedData } = useQuery({
    queryKey: ["film-vsmov", vsmovSlug],
    queryFn: () =>
      movieApi.getDetailFromSource("vsmov", vsmovSlug).then((r) => r.data),
    enabled:
      fallbackSourcesReady && Boolean(vsmovSlug) && primarySource !== "vsmov",
  });

  const kkphimData = primarySource === "kkphim" ? data : kkphimFetchedData;
  const ophimData = primarySource === "ophim" ? data : ophimFetchedData;
  const nguoncData = primarySource === "nguonc" ? data : nguoncFetchedData;
  const vsmovData = primarySource === "vsmov" ? data : vsmovFetchedData;
  const tmdbId = film?.tmdb?.id || film?.tmdb_id || data?.movie?.tmdb?.id;
  const tmdbMediaType =
    film?.tmdb?.type === "tv" ||
    film?.type === "series" ||
    film?.type === "tv" ||
    film?.type === "hoat-hinh"
      ? "tv"
      : "movie";
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

  const { bestBackdrop, backdrops: tmdbBackdrops } = useTmdb({
    film,
    enabled: !!film && backgroundDataReady,
    fetchCredits: false,
    fetchVideos: false,
  });

  // Recommendations
  const filmCategory =
    data?.movie?.category?.[0]?.slug || data?.category?.[0]?.slug;
  const rawTitle = (
    film?.name ||
    film?.origin_name ||
    slug ||
    ""
  ).toLowerCase();

  const matchedKeyword = useMemo(() => {
    const kws = [
      "marvel",
      "dc",
      "superman",
      "batman",
      "spider-man",
      "avengers",
      "doraemon",
      "naruto",
    ];
    return kws.find((kw) => rawTitle.includes(kw));
  }, [rawTitle]);

  const { data: recsData } = useQuery({
    queryKey: ["recs", slug, filmCategory, matchedKeyword],
    queryFn: async () => {
      const items: any[] = [];
      if (matchedKeyword) {
        try {
          const r: any = await movieApi.search(matchedKeyword, 1, 15);
          items.push(...(r?.data?.items || r?.data?.data?.items || []));
        } catch {
          // Recommendation source is optional.
        }
      }
      if (filmCategory) {
        try {
          const r: any = await movieApi.getByGenre(filmCategory, 1);
          items.push(...(r?.data?.data?.items || r?.data?.items || []));
        } catch {
          // Recommendation source is optional.
        }
      }
      try {
        const r: any = await movieApi.getLatest(1);
        items.push(...(r?.data?.items || r?.data?.data?.items || []));
      } catch {
        // Recommendation source is optional.
      }
      const seen = new Set<string>();
      return {
        items: items
          .filter(
            (i: any) =>
              i?.slug &&
              i.slug !== slug &&
              !seen.has(i.slug) &&
              seen.add(i.slug),
          )
          .slice(0, 10),
      };
    },
    enabled: backgroundDataReady && !!slug,
  });

  const { data: resumeData } = useQuery({
    queryKey: ["watch-history-resume", slug],
    queryFn: () => watchHistoryApi.getResume(slug).then((r) => r.data),
    enabled: !!user && !!slug,
  });

  // Fetch TMDB Scene Stills / Backdrops for Episode Scene Thumbnails
  const sceneStills: any[] = useMemo(() => {
    return tmdbBackdrops || [];
  }, [tmdbBackdrops]);

  // Episode processing: normalize provider ownership, language and priority.
  const episodes: SourceServer[] = useMemo(() => {
    const extractEpisodes = (providerData: any): any[] =>
      providerData?.episodes ||
      providerData?.data?.episodes ||
      providerData?.movie?.episodes ||
      [];
    const kkphimEps = extractEpisodes(kkphimData);
    const ophimEps = extractEpisodes(ophimData);
    const nguoncEps = extractEpisodes(nguoncData);
    const vsmovEps = extractEpisodes(vsmovData);
    let vidsrcEps: any[] = [];

    if (tmdbMediaType === "movie") {
      const embedUrl = buildVidsrcEmbedUrl({
        tmdbId,
        mediaType: "movie",
        autoplay: autoPlayConfig,
        subtitle: "en",
        color: "8b5cf6",
      });
      if (embedUrl) {
        vidsrcEps = [
          {
            server_name: "VidSrc Engsub",
            server_data: [
              {
                name: "Full Movie (Engsub)",
                slug: "full-engsub",
                link_embed: embedUrl,
                link_m3u8: "",
              },
            ],
          },
        ];
      }
    } else {
      // VidSrc requires an explicit season and episode. Mirror the episode
      // identities already supplied by Vietnamese providers so tab switches
      // stay on the same episode instead of jumping back to episode one.
      const episodeMap = new Map<number, any>();
      for (const sourceServer of [
        ...kkphimEps,
        ...nguoncEps,
        ...vsmovEps,
        ...ophimEps,
      ]) {
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

      const serverData = Array.from(episodeMap.entries())
        .sort(([left], [right]) => left - right)
        .flatMap(([episodeNumber, sourceEpisode]) => {
          const embedUrl = buildVidsrcEmbedUrl({
            tmdbId,
            mediaType: "tv",
            season: vidsrcSeason,
            episode: episodeNumber,
            autoplay: autoPlayConfig,
            subtitle: "en",
            color: "8b5cf6",
          });
          return embedUrl
            ? [
                {
                  name: sourceEpisode?.name || `Tập ${episodeNumber}`,
                  slug: sourceEpisode?.slug || `tap-${episodeNumber}`,
                  link_embed: embedUrl,
                  link_m3u8: "",
                },
              ]
            : [];
        });

      if (serverData.length > 0) {
        vidsrcEps = [{ server_name: "VidSrc Engsub", server_data: serverData }];
      }
    }

    const tagSource = (arr: any[], sourceName: string, sourceKey: string) =>
      arr.map((s, i): SourceServer => {
        const originalName = String(s.server_name || "");
        const serverData = Array.isArray(s.server_data) ? s.server_data : [];
        return {
          ...s,
          server_name: originalName
            ? `[${sourceName}] ${originalName}`
            : `${sourceName} #${i + 1}`,
          server_data: serverData,
          _source: sourceKey,
          _type: detectServerType(
            originalName,
            s.lang || s.language || s.audio || "",
          ),
          key: `${sourceKey}:${originalName || i}`,
          priority: sourcePriority(sourceKey, serverData, currentEp),
        };
      });

    return [
      ...tagSource(kkphimEps, "KKPhim", "kkphim"),
      ...tagSource(nguoncEps, "NguonC", "nguonc"),
      ...tagSource(vsmovEps, "VSMov", "vsmov"),
      ...tagSource(ophimEps, "OPhim", "ophim"),
      ...tagSource(vidsrcEps, "VidSrc", "vidsrc"),
    ];
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
  ]);

  const serversByType = useMemo(() => {
    const g: Record<ServerType, any[]> = {
      vietsub: [],
      "thuyet-minh": [],
      engsub: [],
      raw: [],
    };
    episodes.forEach((ep) => g[ep._type as ServerType].push(ep));
    return g;
  }, [episodes]);

  const availableTypes = useMemo(
    () =>
      (["vietsub", "thuyet-minh", "engsub", "raw"] as ServerType[]).filter(
        (t) => serversByType[t].length > 0,
      ),
    [serversByType],
  );
  const automaticTypes = useMemo(
    () =>
      availableTypes.filter((type) =>
        serversByType[type].some((candidate) =>
          isAutomaticPlaybackSource(candidate._source),
        ),
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
        automaticServers.find((ep) => ep._type === "vietsub") ||
        automaticServers.find((ep) => ep._type === "thuyet-minh") ||
        automaticServers.find((ep) => ep._type === "raw") ||
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
    if (
      automaticTypes.length > 0 &&
      !automaticTypes.includes(activeServerType)
    ) {
      setActiveServerType(automaticTypes[0]);
      setVidsrcManuallySelected(false);
    }
  }, [activeServerType, automaticTypes, vidsrcManuallySelected]);

  const currentTypeServers = serversByType[activeServerType] || [];
  const server = episodes[currentServer] || episodes[0];
  const sourceCandidate = useMemo(
    () => ({
      key: `${server?._source || "unknown"}:${server?.server_name || currentServer}`,
      source: server?._source,
      serverName: server?.server_name,
      priority: server?.priority,
    }),
    [currentServer, server],
  );
  const serverData: any[] = useMemo(() => server?.server_data || [], [server]);
  const currentEpData: any =
    findMatchingEpisode(serverData, currentEp) || serverData[0];

  const vidsrcRequiresManualSelection =
    server?._source === "vidsrc" && !vidsrcManuallySelected;
  const m3u8Url: string = vidsrcRequiresManualSelection
    ? ""
    : currentEpData?.link_m3u8 || "";
  const embedUrl: string = vidsrcRequiresManualSelection
    ? ""
    : currentEpData?.link_embed || "";

  const iframeUrl =
    embedUrl ||
    (m3u8Url
      ? `https://player.phimapi.com/player/?url=${encodeURIComponent(m3u8Url)}`
      : "");
  const iframeSandbox = canUseUnsandboxedEmbed(server?._source, iframeUrl)
    ? undefined
    : "allow-scripts allow-same-origin allow-forms allow-presentation";
  const videoUrl = m3u8Url || iframeUrl;

  const currentEpIndex = serverData.findIndex(
    (e: any) =>
      (e.slug || e.name) ===
      (currentEp || currentEpData?.slug || currentEpData?.name),
  );

  const posterUrl =
    resolveImageUrl(film?.thumb_url) ||
    resolveImageUrl(film?.poster_url) ||
    undefined;

  // Auto-record Watch History for BOTH Guest & Logged-in Users
  useEffect(() => {
    if (film && (film.name || film.origin_name) && slug) {
      const epName = currentEpData?.name || currentEp || "Tập 1";
      const movieTitle = film.name || film.origin_name || "Phim";
      const moviePoster =
        posterUrl || resolveImageUrl(film.poster_url || film.thumb_url) || "";

      // Save to localStorage for guest & logged-in users
      watchProgressStorage.saveProgress({
        slug: String(slug),
        epSlug: String(currentEp || "1"),
        epName: String(epName).startsWith("Tập")
          ? String(epName)
          : `Tập ${epName}`,
        title: movieTitle,
        poster: moviePoster,
        currentTime: 10,
        duration: 100,
      });

      // Save to server API for logged in user
      if (user) {
        watchHistoryApi
          .upsert({
            movieId: film._id || String(slug),
            movieTitle: movieTitle,
            movieThumb: moviePoster,
            episode: String(currentEp || "1"),
            progress: 10,
            duration: 100,
          })
          .catch(() => {});
      }
    }
  }, [film, slug, currentEp, currentEpData?.name, posterUrl, user]);

  const createCurrentMovieParty = useCallback(async () => {
    const newRoomId = await createWatchPartyRoom({
      name: requestedRoomName || undefined,
      movieName: film?.name || film?.origin_name || "Phim đang xem",
      posterUrl,
    });
    if (!newRoomId) return null;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("room", newRoomId);
    nextParams.delete("party");
    nextParams.delete("roomName");
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
      !shouldCreateParty ||
      !film ||
      wp.roomId ||
      wp.connectionState !== "online" ||
      creatingRoomRef.current
    ) {
      return;
    }
    creatingRoomRef.current = true;
    createCurrentMovieParty().then((roomId) => {
      if (!roomId) creatingRoomRef.current = false;
    });
  }, [
    createCurrentMovieParty,
    film,
    shouldCreateParty,
    wp.connectionState,
    wp.roomId,
  ]);

  // TMDB backdrop and scene images share the single deferred query above.
  const tmdbBackdropUrl = bestBackdrop
    ? tmdbBackdrop(bestBackdrop.file_path, "w1280")
    : null;
  const epName: string = currentEpData?.slug || currentEpData?.name || "";
  const progressKey = slug && epName ? `${slug}_${epName}` : undefined;
  const currentResumeEntry = resumeData?.find(
    (item: any) => item.episode === epName,
  );
  const dbProgress = currentResumeEntry?.progress || 0;
  const localProgress = useMemo(() => {
    if (!progressKey) return 0;
    return (
      watchProgressStorage
        .getHistoryEntries()
        .find((entry) => entry.slug === slug && entry.epSlug === epName)
        ?.currentTime || 0
    );
  }, [epName, progressKey, slug]);
  const resumeAt = Math.max(dbProgress, localProgress);

  const handlePlaybackProgress = useCallback(
    (currentTime: number, duration: number) => {
      if (!slug || !epName || !Number.isFinite(duration) || duration < 10)
        return;

      lastKnownPlaybackTimeRef.current = currentTime;
      watchProgressStorage.saveProgress({
        slug,
        epSlug: currentEpData?.slug || currentEpData?.name || "01",
        epName,
        title: film?.name || film?.origin_name || slug,
        poster: posterUrl || "",
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
          movieThumb: posterUrl,
          serverName: server?.server_name,
        })
        .catch(() => {
          // The local copy above is the durable fallback if the API is briefly
          // unavailable. A later progress event will retry the sync.
          recordTelemetry(
            "watch_progress.sync_failed",
            { slug, episode: epName },
            "warning",
          );
        });
    },
    [
      currentEpData,
      epName,
      film?.name,
      film?.origin_name,
      posterUrl,
      server?.server_name,
      slug,
      user,
    ],
  );

  // Navigation
  const watchUrlForEpisode = useCallback(
    (episode: string) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("ep", episode);
      nextParams.delete("party");
      nextParams.delete("roomName");
      return `/watch/${slug}?${nextParams.toString()}`;
    },
    [searchParams, slug],
  );

  const goNextEpisode = useCallback(() => {
    setAutoNextCountdown(null);
    if (currentEpIndex >= 0 && currentEpIndex < serverData.length - 1) {
      const next = serverData[currentEpIndex + 1];
      router.push(watchUrlForEpisode(next.slug || next.name));
    }
  }, [currentEpIndex, router, serverData, watchUrlForEpisode]);

  const handleVideoEnded = useCallback(() => {
    if (!autoNextConfig) return;
    if (currentEpIndex >= 0 && currentEpIndex < serverData.length - 1)
      setAutoNextCountdown(5);
  }, [autoNextConfig, currentEpIndex, serverData.length]);

  useEffect(() => {
    if (autoNextCountdown === null) return;
    if (autoNextCountdown <= 0) {
      goNextEpisode();
      return;
    }
    const t = setTimeout(
      () => setAutoNextCountdown((c) => (c !== null ? c - 1 : null)),
      1000,
    );
    return () => clearTimeout(t);
  }, [autoNextCountdown, goNextEpisode]);

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
        "player.source_failed",
        {
          source: server?._source || "unknown",
          server: server?.server_name || "unknown",
          episode: currentEpData?.slug || currentEpData?.name || "unknown",
          error_kind: errorKind,
          attempt: fallbackAttemptRef.current + 1,
        },
        "warning",
      );

      const targetEpisode =
        currentEpData?.slug || currentEpData?.name || currentEp;
      const usable = episodes.filter((ep) => {
        const matchingEpisode = findMatchingEpisode(
          ep.server_data,
          targetEpisode,
        );
        return (
          isAutomaticPlaybackSource(ep._source) &&
          ep._type === activeServerType &&
          Boolean(matchingEpisode) &&
          isPlayableEpisode(matchingEpisode) &&
          !upd.includes(episodes.indexOf(ep))
        );
      });
      // Fallback is intentionally locked to the selected audio/subtitle tab.
      // Provider priority, transport quality and learned health decide order.
      const ranked = rankHealthyCandidates(usable);
      const nextEp = ranked[0];

      if (!nextEp) {
        fallbackInProgressRef.current = false;
        setIsFallbacking(false);
        setFallbackMessage("");
        toast(
          `Không còn server ${TYPE_CFG[activeServerType].label} khả dụng cho tập này.`,
          "error",
        );
        return;
      }

      const nextIdx = episodes.indexOf(nextEp);
      setFallbackMessage(`Thử server ${nextEp.server_name}...`);

      // Delay nhỏ để UX mượt, không flash. Keep its handle so leaving the
      // player cannot let a stale fallback navigate back to this film.
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = setTimeout(() => {
        fallbackTimerRef.current = null;
        setCurrentServer(nextIdx);
        setCurrentTypeServer(nextIdx);
        setVidsrcManuallySelected(false);
        const nextEpisodeData = findMatchingEpisode(
          nextEp.server_data,
          targetEpisode,
        );
        setPlayerEngine(nextEpisodeData?.link_m3u8 ? "hls" : "iframe");
        setIsFallbacking(false);
        fallbackInProgressRef.current = false;
        setFallbackMessage("");
        fallbackAttemptRef.current += 1;

        playerLoadStartedAtRef.current = Date.now();
        recordTelemetry("player.fallback", {
          from_source: server?._source || "unknown",
          to_source: nextEp._source || "unknown",
          episode: targetEpisode || "unknown",
          fallback_kind: "iframe",
        });
      }, 600);
    },
    [
      currentServer,
      failedServers,
      episodes,
      activeServerType,
      currentEp,
      currentEpData,
      server,
      sourceCandidate,
      toast,
    ],
  );

  const clearIframeLoadTimeout = useCallback(() => {
    if (iframeLoadTimerRef.current) {
      clearTimeout(iframeLoadTimerRef.current);
      iframeLoadTimerRef.current = null;
    }
  }, []);

  const startIframeLoadTimeout = useCallback(() => {
    clearIframeLoadTimeout();
    iframeLoadTimerRef.current = setTimeout(() => {
      iframeLoadTimerRef.current = null;
      tryNextServer("iframe-timeout");
    }, 12_000);
  }, [clearIframeLoadTimeout, tryNextServer]);

  const handlePlayerFailure = useCallback(
    (reason: string) => {
      // HLS has observable manifest/segment/CORS errors. Before declaring a
      // provider dead, give its maintained iframe implementation one chance.
      if (playerEngine === "hls" && iframeUrl) {
        setIsFallbacking(true);
        setFallbackMessage("Đang chuyển sang trình phát dự phòng...");
        recordTelemetry(
          "player.transport_fallback",
          {
            source: server?._source || "unknown",
            server: server?.server_name || "unknown",
            transport: "hls",
            error_kind: classifyPlayerError({ type: reason }),
          },
          "warning",
        );
        playerLoadStartedAtRef.current = Date.now();
        setPlayerEngine("iframe");
        return;
      }
      tryNextServer(reason);
    },
    [
      iframeUrl,
      playerEngine,
      server?._source,
      server?.server_name,
      tryNextServer,
    ],
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
    const sp = searchParams.get("server");
    if (sp !== null) {
      const idx = Number(sp) || 0;
      setCurrentServer(idx);
      const ep = episodes[idx];
      if (ep?._type) setActiveServerType(ep._type as ServerType);
    }
  }, [episodes, searchParams]);

  const DISABLE_ARTPLAYER = true;

  useEffect(() => {
    setFailedServers([]);
    setIsFallbacking(false);
    setFallbackMessage("");
    playerLoadStartedAtRef.current = Date.now();
    fallbackAttemptRef.current = 0;
    fallbackInProgressRef.current = false;
    lastKnownPlaybackTimeRef.current = resumeAt;
    clearIframeLoadTimeout();
    setPlayerEngine(DISABLE_ARTPLAYER ? "iframe" : m3u8Url ? "hls" : "iframe");
    // A new episode intentionally resets source failures; changing source for
    // the same episode must retain them so fallback never retries a bad server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEp]);

  useEffect(() => {
    playerLoadStartedAtRef.current = Date.now();
    if (!DISABLE_ARTPLAYER && m3u8Url) {
      setPlayerEngine("hls");
    } else {
      setPlayerEngine("iframe");
    }
  }, [currentServer, m3u8Url]);

  // An iframe cannot emit media errors from its cross-origin document, so the
  // outer document owns a deterministic source timeout for that transport.
  useEffect(() => {
    if (!iframeUrl || playerEngine !== "iframe") return;
    startIframeLoadTimeout();
    return () => clearIframeLoadTimeout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iframeUrl, currentServer, playerEngine]);

  useEffect(() => {
    if (preserveServerOnTypeChangeRef.current) {
      preserveServerOnTypeChangeRef.current = false;
      return;
    }
    setCurrentTypeServer(0);
    const first = serversByType[activeServerType]?.[0];
    if (first) {
      const gIdx = episodes.indexOf(first);
      setCurrentServer(gIdx >= 0 ? gIdx : 0);
      setPlayerEngine(DISABLE_ARTPLAYER ? "iframe" : first.server_data?.[0]?.link_m3u8 ? "hls" : "iframe");
    }
  }, [activeServerType, episodes, serversByType]);

  useEffect(() => {
    if (typeof document !== "undefined" && film?.name) {
      document.title = `Xem Phim ${film.name} ${currentEpData?.name ? `- Tập ${currentEpData.name}` : ""} Vietsub HD | CineVerse`;
    }
  }, [film?.name, currentEpData?.name]);

  if (isLoading) return <WatchSkeleton />;

  if (!isLoading && !film) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <Clapperboard size={40} className="text-white/20 mb-3" />
        <h1 className="text-lg font-bold mb-1">Không tìm thấy phim</h1>
        <Link
          href="/"
          className="text-sm text-white/50 hover:text-white mt-4 underline"
        >
          Về trang chủ
        </Link>
      </div>
    );
  }

  const categories = film?.category?.map((c: any) => c.name).join(", ") || "";
  const filteredEps = serverData.filter(
    (ep: any) =>
      !episodeSearch ||
      ep.name.toLowerCase().includes(episodeSearch.toLowerCase()),
  );

  const watchSeoTitle = `Xem Phim ${film?.name || ""} ${currentEpData?.name ? `- Tập ${currentEpData.name}` : ""} Vietsub HD | CineVerse`;
  const watchSeoDescription = `Xem phim ${film?.name || ""} ${currentEpData?.name ? `Tập ${currentEpData.name}` : ""} Vietsub Thuyết minh HD online mượt mà không quảng cáo độc hại.`;

  const watchJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": film?.type === "series" ? "TVSeries" : "Movie",
      name: film?.name,
      alternateName: film?.origin_name,
      description: watchSeoDescription,
      image: posterUrl || tmdbBackdropUrl,
      dateCreated: film?.year ? String(film.year) : undefined,
      potentialAction: {
        "@type": "WatchAction",
        target: `https://cineverse-movie.vercel.app/watch/${slug}`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: `${film?.name || ""} ${currentEpData?.name ? `- Tập ${currentEpData.name}` : ""}`,
      description: watchSeoDescription,
      thumbnailUrl: posterUrl || tmdbBackdropUrl,
      uploadDate: film?.year ? `${film.year}-01-01` : "2024-01-01",
      embedUrl: iframeUrl || `https://cineverse-movie.vercel.app/watch/${slug}`,
      inLanguage: "vi",
    },
  ];

  return (
    <div className={`${cardFont.className} relative min-h-screen bg-[#101114] text-white`}>
      {/* ── JSON-LD STRUCTURED DATA SCHEMA FOR GOOGLE SEO ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(watchJsonLd) }}
      />

      {/* ── CINEMA LIGHTS-OFF OVERLAY ── */}
      {lightOff && (
        <div
          onClick={() => setLightOff(false)}
          className="fixed inset-0 bg-black/90 z-40 transition-opacity duration-300 cursor-pointer flex items-start justify-center pt-20 pointer-events-auto backdrop-blur-sm"
        >
          <div className="bg-[#111419]/90 text-neutral-300 text-xs font-semibold px-4 py-2 rounded-full border border-white/15 backdrop-blur-md shadow-lg flex items-center gap-2">
            <LightbulbOff size={14} className="text-neutral-400" />
            <span>
              Đang bật chế độ Tắt Đèn (Bấm bất kỳ đâu xung quanh để bật lại đèn)
            </span>
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
      <main className="pt-20 lg:pt-22 max-w-screen-2xl mx-auto px-3 md:px-5 lg:pl-24 pb-10">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
          {/* ───── LEFT COLUMN ───── */}
          <div className="space-y-4 min-w-0">
            {/* ── BREADCRUMB & QUICK CONTROLS BAR — Above Video ── */}
            <div className="flex items-center justify-between gap-2 py-1.5 px-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-white/50">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold transition-all shrink-0 text-xs shadow-sm hover:scale-105 active:scale-95 cursor-pointer border border-white/15"
                >
                  <ArrowLeft size={13} />
                  <span>Quay lại</span>
                </button>
                <ChevronRight size={11} className="text-white/20 shrink-0" />
                <Link
                  href={`/film/${slug}`}
                  className="hover:text-white/80 transition-colors truncate max-w-[180px] sm:max-w-xs text-white/60"
                >
                  {film?.name}
                </Link>
                {currentEpData?.name && (
                  <>
                    <ChevronRight
                      size={11}
                      className="text-white/20 shrink-0"
                    />
                    <span className="text-white/80 font-semibold shrink-0">
                      Tập {currentEpData.name.replace(/^tập\s*/i, "")}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Cinema Light-Off Button */}
                <button
                  onClick={() => setLightOff(!lightOff)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all font-medium text-xs cursor-pointer select-none border",
                    lightOff
                      ? "bg-white/10 text-white border-white/20 shadow-sm"
                      : "bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white border-transparent",
                  )}
                  title="Tắt đèn làm mờ xung quanh"
                >
                  {lightOff ? (
                    <LightbulbOff size={14} className="text-neutral-300" />
                  ) : (
                    <Lightbulb size={14} className="text-neutral-400" />
                  )}
                  <span className="hidden sm:inline">
                    {lightOff ? "Bật Đèn" : "Tắt Đèn"}
                  </span>
                </button>



                <button
                  onClick={async () => {
                    if (!wp.roomId) await createCurrentMovieParty();
                    else wp.setIsOpen(!wp.isOpen);
                  }}
                  disabled={wp.connectionState !== "online"}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] hover:text-white/80 transition-colors text-white/50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Sparkles size={12} />
                  <span className="hidden sm:inline">
                    {wp.roomId ? `Phòng ${wp.roomId}` : "Party"}
                  </span>
                </button>
                {/* Multi-Platform Share Button & Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.share) {
                        navigator
                          .share({
                            title: film?.name || "CineVerse",
                            text: `Xem phim ${film?.name || ""} miễn phí trên CineVerse!`,
                            url: window.location.href,
                          })
                          .catch(() => setShowShareModal((p) => !p));
                      } else {
                        setShowShareModal((p) => !p);
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] hover:text-white transition-colors text-white/50 text-xs font-medium cursor-pointer"
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
                          <Share2 size={13} className="text-blue-400" /> Chia Sẻ
                          Phim Trực Tiếp
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
                          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
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
                          href={`https://zalo.me/share?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
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
                          href={`https://t.me/share/url?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}&text=${encodeURIComponent(`Xem phim ${film?.name || ""} chất lượng cao!`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/30 transition-all active:scale-95"
                        >
                          <Send size={13} className="text-sky-400" />
                          <span>Telegram</span>
                        </a>

                        {/* Twitter / X */}
                        <a
                          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}&text=${encodeURIComponent(`Xem phim ${film?.name || ""} trên CineVerse!`)}`}
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
                          value={
                            typeof window !== "undefined"
                              ? window.location.href
                              : ""
                          }
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-neutral-300 focus:outline-none truncate font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            setCopied(true);
                            toast("Đã sao chép liên kết!", "success");
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg border border-white/15 transition-all shrink-0 active:scale-95"
                        >
                          {copied ? (
                            <Check size={13} className="text-emerald-400" />
                          ) : (
                            <Copy size={13} />
                          )}
                          <span>{copied ? "Đã chép" : "Chép"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 1. PLAYER */}
            <div
              ref={playerContainerRef}
              onPointerDown={handleOuterPointerDown}
              onPointerUp={handleOuterPointerUp}
              onPointerLeave={handleOuterPointerUp}
              className={cn(
                "bg-black aspect-video rounded-xl overflow-hidden relative shadow-2xl ring-1 ring-white/[0.06] select-none transition-all duration-300",
                lightOff ? "relative z-50 ring-1 ring-white/20 shadow-2xl" : "",
              )}
            >
              {/* ── Universal 2x Speed Hold Top HUD Banner ── */}
              {isOuterSpeedBoosted && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/90 border border-amber-500/50 text-amber-400 font-extrabold text-xs px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 animate-pulse pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>⏩ Tua Nhanh 2X (Đang Giữ)</span>
                </div>
              )}

              {/* ── Universal Double Tap Rewind HUD (-10s) ── */}
              {outerDoubleTapHud === "rewind" && (
                <div className="absolute left-10 top-1/2 -translate-y-1/2 z-50 bg-black/85 text-white font-black text-sm px-5 py-3 rounded-full border border-white/20 backdrop-blur-md animate-in zoom-in-50 duration-200 flex items-center gap-2 pointer-events-none">
                  <span>⏪</span> -10s
                </div>
              )}

              {/* ── Universal Double Tap Fast-Forward HUD (+10s) ── */}
              {outerDoubleTapHud === "forward" && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2 z-50 bg-black/85 text-white font-black text-sm px-5 py-3 rounded-full border border-white/20 backdrop-blur-md animate-in zoom-in-50 duration-200 flex items-center gap-2 pointer-events-none">
                  +10s <span>⏩</span>
                </div>
              )}

              {/* Floating Skip Intro (+85s) Overlay */}
              {artInstance &&
                artInstance.currentTime > 5 &&
                artInstance.currentTime < 150 && (
                  <button
                    onClick={() => {
                      if (artInstance) {
                        artInstance.seek = artInstance.currentTime + 85;
                        toast("Đã bỏ qua Intro (+85s)", "info");
                      }
                    }}
                    className="absolute bottom-16 right-5 z-40 flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-[#15171b]/95 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#202329] active:scale-95"
                  >
                    <span>⏩ Bỏ qua Intro (+85s)</span>
                  </button>
                )}

              {/* Fallback overlay */}
              {isFallbacking && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-3">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <p className="text-white/70 text-sm font-medium">
                    {fallbackMessage || "Đang chuyển server..."}
                  </p>
                  {fallbackAttemptRef.current > 0 && (
                    <p className="text-white/30 text-xs">
                      Lần thử {fallbackAttemptRef.current + 1}
                    </p>
                  )}
                </div>
              )}
              {videoUrl ? (
                <>
                  {!DISABLE_ARTPLAYER && playerEngine === "hls" && m3u8Url ? (
                    <HlsVideoPlayer
                      key={`hls:${server?._source || "unknown"}:${currentServer}:${currentEpData?.slug || currentEpData?.name || ""}`}
                      src={m3u8Url}
                      poster={posterUrl}
                      initialTime={lastKnownPlaybackTimeRef.current || resumeAt}
                      autoPlay={autoPlayConfig}
                      onReady={() => {
                        setIsFallbacking(false);
                        setFallbackMessage("");
                      }}
                      onPlaying={() => {
                        const sourceKey = `${sourceCandidate.source || "unknown"}:${sourceCandidate.serverName || "unknown"}`;
                        if (!playedSourceKeysRef.current.has(sourceKey)) {
                          playedSourceKeysRef.current.add(sourceKey);
                          markSourceSuccess(sourceCandidate);
                          recordTelemetry("watch_now.success", {
                            source: sourceCandidate.source || "unknown",
                            server: sourceCandidate.serverName || "unknown",
                            episode:
                              currentEpData?.slug ||
                              currentEpData?.name ||
                              "unknown",
                            start_time_ms:
                              Date.now() - playerLoadStartedAtRef.current,
                            engine: "hls",
                          });
                        }
                      }}
                      onProgress={handlePlaybackProgress}
                      onEnded={handleVideoEnded}
                      onError={(error) => handlePlayerFailure(error.type)}
                    />
                  ) : iframeUrl ? (
                    <div className="relative w-full h-full">
                      <iframe
                        key={`iframe:${server?._source || "unknown"}:${currentServer}:${currentEpData?.slug || currentEpData?.name || ""}`}
                        src={iframeUrl}
                        className="w-full h-full"
                        allowFullScreen
                        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                        sandbox={iframeSandbox}
                        title={`${film?.name} - ${currentEpData?.name}`}
                        onLoad={() => {
                          clearIframeLoadTimeout();
                          setIsFallbacking(false);
                          setFallbackMessage("");
                          const sourceKey = `${sourceCandidate.source || "unknown"}:${sourceCandidate.serverName || "unknown"}`;
                          if (!playedSourceKeysRef.current.has(sourceKey)) {
                            playedSourceKeysRef.current.add(sourceKey);
                            markSourceSuccess(sourceCandidate);
                            recordTelemetry("watch_now.success", {
                              source: sourceCandidate.source || "unknown",
                              server: sourceCandidate.serverName || "unknown",
                              episode:
                                currentEpData?.slug ||
                                currentEpData?.name ||
                                "unknown",
                              start_time_ms:
                                Date.now() - playerLoadStartedAtRef.current,
                              engine: "iframe",
                            });
                          }
                          recordTelemetry("player.iframe_loaded", {
                            source: sourceCandidate.source || "unknown",
                            server: sourceCandidate.serverName || "unknown",
                            episode:
                              currentEpData?.slug ||
                              currentEpData?.name ||
                              "unknown",
                          });
                        }}
                        onError={() => handlePlayerFailure("iframe-error")}
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
                </>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full text-white/20">
                  <Clapperboard size={36} className="mb-2" />
                  <p className="text-xs">Không tìm thấy nguồn phim</p>
                </div>
              )}
            </div>

            {/* 2. TITLE + PREV/NEXT */}
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-base md:text-lg font-bold text-white leading-snug truncate">
                  {film?.name}
                  {currentEpData?.name && (
                    <span className="text-white/35 font-normal ml-2 text-sm">
                      · Tập {currentEpData.name.replace(/^tập\s*/i, "")}
                    </span>
                  )}
                </h1>
                {categories && (
                  <p className="text-[11px] text-white/30 mt-0.5">
                    {categories}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {currentEpIndex > 0 && (
                  <button
                    onClick={() => {
                      const p = serverData[currentEpIndex - 1];
                      router.push(watchUrlForEpisode(p.slug || p.name));
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white/50 bg-white/[0.04] border border-white/[0.08] rounded-lg hover:text-white hover:bg-white/[0.08] transition-colors"
                  >
                    <ChevronLeft size={13} /> Trước
                  </button>
                )}
                {currentEpIndex >= 0 &&
                  currentEpIndex < serverData.length - 1 && (
                    <button
                      onClick={() => {
                        const n = serverData[currentEpIndex + 1];
                        router.push(watchUrlForEpisode(n.slug || n.name));
                      }}
                      className="flex items-center gap-1 rounded-lg bg-white px-4 py-1.5 text-xs font-semibold text-[#111317] transition-colors hover:bg-neutral-200"
                    >
                      Tập tiếp <ChevronRight size={13} />
                    </button>
                  )}
              </div>
            </div>

            {/* 3. SERVER / SUBTITLE CARDS (1:1 Design Matching User Screenshot) */}
            {(() => {
              const subEps = episodes.filter((ep) => ep._type === "vietsub");
              const dubEps = episodes.filter(
                (ep) => ep._type === "thuyet-minh",
              );
              const engsubEps = episodes.filter((ep) => ep._type === "engsub");
              const rawEps = episodes.filter((ep) => ep._type === "raw");
              const activeGroup =
                activeServerType === "thuyet-minh"
                  ? dubEps
                  : activeServerType === "engsub"
                    ? engsubEps
                    : activeServerType === "raw"
                      ? rawEps
                      : subEps;

              const movieBackdrop =
                tmdbBackdropUrl ||
                posterUrl ||
                "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop";

              const subOptions = [
                {
                  id: "vietsub",
                  label: "Phụ đề",
                  icon: "💬",
                  count: subEps.length,
                  eps: subEps,
                  activeBg: "bg-[#161a24] border-2 border-white shadow-lg",
                  inactiveBg:
                    "bg-[#0d1017] border border-white/15 hover:border-white/40",
                },
                {
                  id: "thuyet-minh",
                  label: "Thuyết minh",
                  icon: "🎙️",
                  count: dubEps.length,
                  eps: dubEps,
                  activeBg: "bg-[#161a24] border-2 border-white shadow-lg",
                  inactiveBg:
                    "bg-[#0d1017] border border-white/15 hover:border-white/40",
                },
                ...(engsubEps.length > 0
                  ? [
                      {
                        id: "engsub",
                        label: "Engsub (Phụ đề Anh)",
                        icon: "🌐",
                        count: engsubEps.length,
                        eps: engsubEps,
                      },
                    ]
                  : []),
                ...(rawEps.length > 0
                  ? [
                      {
                        id: "raw",
                        label: "Bản gốc / Chưa xác định",
                        icon: "🎬",
                        count: rawEps.length,
                        eps: rawEps,
                      },
                    ]
                  : []),
              ];

              return (
                <div className="space-y-3 bg-[#14161d]/80 p-3.5 sm:p-4 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md">
                  {/* ── Minimalist Version / Audio Pill Tabs ── */}
                  <div className="flex flex-wrap items-center gap-2">
                    {subOptions.map((opt) => {
                      const isActive = activeServerType === opt.id;
                      const hasItems = opt.count > 0;

                      return (
                        <button
                          key={opt.id}
                          disabled={!hasItems}
                          onClick={() => {
                            if (!hasItems) return;
                            const selectingVidSrc = opt.eps.every(
                              (candidate) => candidate._source === "vidsrc",
                            );
                            setVidsrcManuallySelected(selectingVidSrc);
                            setActiveServerType(opt.id as ServerType);
                            if (opt.eps.length > 0) {
                              const targetEpisode =
                                currentEpData?.slug ||
                                currentEpData?.name ||
                                currentEp;
                              const first =
                                opt.eps.find((candidate) =>
                                  findMatchingEpisode(
                                    candidate.server_data,
                                    targetEpisode,
                                  ),
                                ) || opt.eps[0];
                              const idx = episodes.indexOf(first);
                              setCurrentServer(idx >= 0 ? idx : 0);
                              const matchedEpisode = findMatchingEpisode(
                                first?.server_data,
                                targetEpisode,
                              );
                              const matchedEpisodeId =
                                matchedEpisode?.slug || matchedEpisode?.name;
                              setPlayerEngine(
                                matchedEpisode?.link_m3u8 ? "hls" : "iframe",
                              );
                              if (matchedEpisodeId)
                                router.push(
                                  watchUrlForEpisode(matchedEpisodeId),
                                );
                            }
                          }}
                          className={cn(
                            "group inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none active:scale-95 border",
                            isActive
                              ? "bg-white text-black border-white shadow-md scale-[1.02]"
                              : hasItems
                                ? "bg-white/[0.05] hover:bg-white/[0.12] text-neutral-300 border-white/10 hover:border-white/25"
                                : "opacity-40 cursor-not-allowed bg-white/[0.02] border-white/5 text-neutral-500",
                          )}
                        >
                          <span>{opt.icon}</span>
                          <span>{opt.label}</span>
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* ── Sleek Server Provider Pills ── */}
                  {activeGroup.length > 0 && (
                    <div className="pt-2 border-t border-white/[0.08] flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mr-1">
                        Nguồn phát:
                      </span>
                      {activeGroup.map((ep) => {
                        const i = episodes.indexOf(ep);
                        const isActive = i === currentServer;
                        const hasFailed = failedServers.includes(i);

                        return (
                          <button
                            key={i}
                            disabled={hasFailed}
                            onClick={() => {
                              setVidsrcManuallySelected(
                                ep._source === "vidsrc",
                              );
                              setCurrentServer(i);
                              setCurrentTypeServer(i);
                              const matchedEpisode = findMatchingEpisode(
                                ep.server_data,
                                currentEpData?.slug ||
                                  currentEpData?.name ||
                                  currentEp,
                              );
                              const matchedEpisodeId =
                                matchedEpisode?.slug || matchedEpisode?.name;
                              setPlayerEngine(
                                matchedEpisode?.link_m3u8 ? "hls" : "iframe",
                              );
                              if (matchedEpisodeId) {
                                router.push(
                                  watchUrlForEpisode(matchedEpisodeId),
                                );
                              }
                            }}
                            className={cn(
                              "px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer select-none active:scale-95 border text-xs flex items-center gap-1.5",
                              isActive
                                ? "bg-red-600 text-white border-red-500 shadow-md"
                                : "bg-white/[0.05] hover:bg-white/[0.12] text-neutral-300 border-white/10 hover:border-white/20",
                              hasFailed && "opacity-30 cursor-not-allowed line-through",
                            )}
                          >
                            <span>
                              {ep._source ? `[${ep._source.toUpperCase()}] ` : ""}
                              {ep.server_name || `Server ${i + 1}`}
                            </span>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 4. EPISODE LIST — matching exact reference images with range scroll & toggle switch */}
            {(() => {
              const rangeSize = 40;
              const totalRanges = Math.ceil(serverData.length / rangeSize);
              const rangeStart = epRangeIndex * rangeSize;
              const rangeEnd = Math.min(
                (epRangeIndex + 1) * rangeSize,
                serverData.length,
              );

              const displayedEps = episodeSearch.trim()
                ? filteredEps
                : serverData.length > 30
                  ? serverData.slice(rangeStart, rangeEnd)
                  : filteredEps;

              return (
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">
                  {/* Header: Danh sách tập ( X / Y ) + Toggle Switch */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white/80">
                        Danh sách tập{" "}
                        <span className="text-white/40">
                          ({" "}
                          <span className="text-emerald-400 font-extrabold">
                            {currentEpIndex >= 0 ? currentEpIndex + 1 : 1}
                          </span>{" "}
                          /{" "}
                          <span className="text-emerald-400/80">
                            {serverData.length}
                          </span>{" "}
                          )
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {serverData.length > 16 && (
                        <div className="relative hidden sm:block">
                          <Search
                            size={12}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25"
                          />
                          <input
                            type="text"
                            placeholder="Tìm tập..."
                            value={episodeSearch}
                            onChange={(e) => setEpisodeSearch(e.target.value)}
                            className="bg-white/[0.04] border border-white/[0.06] pl-7 pr-3 py-1 text-[11px] text-white placeholder-white/25 rounded-lg focus:outline-none focus:border-white/20 w-28 transition-colors"
                          />
                        </div>
                      )}

                      {/* Toggle Switch: Hiện ảnh / Ẩn ảnh */}
                      <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer select-none">
                        <span>{showEpThumbnails ? "Ẩn ảnh" : "Hiện ảnh"}</span>
                        <button
                          type="button"
                          onClick={() => setShowEpThumbnails(!showEpThumbnails)}
                          className={cn(
                            "w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center",
                            showEpThumbnails
                              ? "bg-emerald-500 justify-end"
                              : "bg-white/20 justify-start",
                          )}
                        >
                          <span className="w-4 h-4 rounded-full bg-white shadow-md block" />
                        </button>
                      </label>
                    </div>
                  </div>

                  {/* Range Navigation Bar for Movies with >30 Episodes */}
                  {serverData.length > 30 && !episodeSearch && (
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.015] border-b border-white/[0.04] overflow-x-auto scrollbar-hide">
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider shrink-0 mr-1">
                        Khoảng tập:
                      </span>
                      {Array.from({ length: totalRanges }).map((_, rIdx) => {
                        const start = rIdx * rangeSize + 1;
                        const end = Math.min(
                          (rIdx + 1) * rangeSize,
                          serverData.length,
                        );
                        const isCurrentRange = rIdx === epRangeIndex;
                        const containsActiveEp =
                          currentEpIndex >= start - 1 &&
                          currentEpIndex <= end - 1;

                        return (
                          <button
                            key={rIdx}
                            type="button"
                            onClick={() => setEpRangeIndex(rIdx)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer border",
                              isCurrentRange
                                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm"
                                : containsActiveEp
                                  ? "bg-white/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.07] hover:text-white",
                            )}
                          >
                            {start} - {end}
                            {containsActiveEp && (
                              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Episodes Container */}
                  <div className="p-3">
                    {!showEpThumbnails ? (
                      /* ── MODE 1: Pill Grid Mode ── */
                      <div
                        ref={epGridRef}
                        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 gap-2 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40 overscroll-contain touch-pan-y p-1"
                      >
                        {displayedEps.map((ep: any, i: number) => {
                          const isActive =
                            ep.slug === currentEp ||
                            ep.name === currentEp ||
                            episodes.indexOf(ep) === currentEpIndex;
                          const epNum = ep.name.replace(/^tập\s*/i, "");
                          return (
                            <button
                              key={ep.slug || ep.name || i}
                              onClick={() =>
                                router.push(
                                  watchUrlForEpisode(ep.slug || ep.name),
                                )
                              }
                              className={cn(
                                "flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 transition-all cursor-pointer border text-xs font-bold",
                                isActive
                                  ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30"
                                  : "bg-[#14181f]/80 hover:bg-white/[0.08] border-white/10 text-white/70 hover:text-white",
                              )}
                            >
                              <Play
                                size={10}
                                fill="currentColor"
                                className="shrink-0"
                              />
                              <span>Tập {epNum}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      /* ── MODE 2: Landscape Still Grid Mode (Hiện ảnh tập) ── */
                      <div
                        ref={epGridRef}
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[520px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40 overscroll-contain touch-pan-y p-1"
                      >
                        {displayedEps.map((ep: any, i: number) => {
                          const isActive =
                            ep.slug === currentEp ||
                            ep.name === currentEp ||
                            episodes.indexOf(ep) === currentEpIndex;
                          const epNum = ep.name.replace(/^tập\s*/i, "");

                          // Unique episode scene backdrop still mapping
                          let stillImage = tmdbBackdropUrl || posterUrl;
                          if (sceneStills && sceneStills.length > 0) {
                            const sceneItem =
                              sceneStills[i % sceneStills.length];
                            if (sceneItem?.file_path) {
                              stillImage =
                                tmdbBackdrop(sceneItem.file_path, "w780") ||
                                stillImage;
                            }
                          }

                          return (
                            <button
                              key={ep.slug || ep.name || i}
                              onClick={() =>
                                router.push(
                                  watchUrlForEpisode(ep.slug || ep.name),
                                )
                              }
                              className={cn(
                                "group/ep relative aspect-video rounded-xl overflow-hidden border transition-all cursor-pointer text-left bg-neutral-900",
                                isActive
                                  ? "border-2 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl"
                                  : "border-white/10 hover:border-white/30 hover:scale-[1.02]",
                              )}
                            >
                              {stillImage ? (
                                <NextImage
                                  src={stillImage}
                                  alt={`Tập ${epNum}`}
                                  fill
                                  sizes="(max-width: 640px) 50vw, 240px"
                                  className="object-cover brightness-75 group-hover/ep:brightness-100 transition-all duration-300"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-white/20">
                                  <Clapperboard size={20} />
                                </div>
                              )}

                              {/* Gradient Overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                              {/* ĐANG XEM Badge */}
                              {isActive && (
                                <div className="absolute top-2 right-2 z-10 bg-emerald-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded shadow-lg uppercase tracking-wider">
                                  Đang xem
                                </div>
                              )}

                              {/* Episode Title */}
                              <div className="absolute bottom-2 left-2.5 z-10">
                                <span
                                  className={cn(
                                    "text-xs font-black drop-shadow-md",
                                    isActive
                                      ? "text-emerald-400"
                                      : "text-white group-hover/ep:text-emerald-300",
                                  )}
                                >
                                  Tập {epNum}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 6. COMMENTS */}
            <div className="border-t border-white/[0.05] pt-5">
              <AdvancedCommentSection
                movieSlug={slug}
                episodeName={
                  currentEpData?.name
                    ? `Tập ${currentEpData.name.replace(/^tập\s*/i, "")}`
                    : undefined
                }
                currentVideoTimeSeconds={lastKnownPlaybackTimeRef.current}
                onSeekToTimestamp={(sec) => {
                  if (artInstance) {
                    artInstance.seek = sec;
                  }
                  if (typeof window !== "undefined") {
                    window.scrollTo({ top: 180, behavior: "smooth" });
                  }
                }}
              />
            </div>
          </div>

          {/* ───── RIGHT SIDEBAR ───── */}
          <div className="space-y-4 min-w-0">
            {/* Film Info */}
            <SidebarFilmCard film={film} slug={slug} />

            {/* Settings */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                  <Settings size={10} /> Cài đặt
                </p>
              </div>

              {/* Nút Đổi Server Phim (Chuyển sang server dự phòng nếu server hiện tại bị lag) */}
              {episodes.length > 1 && (
                <button
                  type="button"
                  onClick={() => tryNextServer("user-retry")}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-white bg-[#161a22] hover:bg-emerald-600 border border-white/10 hover:border-emerald-500 rounded-xl transition-all cursor-pointer shadow-md hover:scale-[1.01] active:scale-98 group/srvBtn"
                  title="Bấm để chuyển sang nguồn server dự phòng khác nếu phim bị đứng hoặc lag"
                >
                  <RefreshCw
                    size={13}
                    className="text-emerald-400 group-hover/srvBtn:rotate-180 transition-transform duration-500 shrink-0"
                  />
                  <span>Đổi Server Phim</span>
                </button>
              )}

              {[
                {
                  label: "Tự phát tập tiếp",
                  value: autoNextConfig,
                  set: setAutoNextConfig,
                },
                {
                  label: "Tự động phát",
                  value: autoPlayConfig,
                  set: setAutoPlayConfig,
                },
                {
                  label: "Tự bỏ qua Intro",
                  value: autoSkipIntro,
                  set: toggleAutoSkipIntro,
                },
              ].map(({ label, value, set }) => (
                <label
                  key={label}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span className="text-xs text-white/50">{label}</span>
                  <button
                    onClick={() => set(!value)}
                    className={cn(
                      "w-9 h-[18px] rounded-full flex items-center transition-colors p-0.5",
                      value
                        ? "bg-emerald-500 justify-end"
                        : "bg-white/10 justify-start",
                    )}
                  >
                    <div className="w-[14px] h-[14px] bg-white rounded-full shadow-sm" />
                  </button>
                </label>
              ))}
            </div>

            {/* Recommendations */}
            {recsData?.items && recsData.items.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 space-y-3">
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">
                  {matchedKeyword
                    ? `Thêm về "${matchedKeyword}"`
                    : "Phim tương tự"}
                </p>
                <div className="space-y-2.5">
                  {recsData.items.slice(0, 8).map((item: any) => (
                    <RecMovieItem key={item._id || item.slug} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Watch Party Panel */}
      {wp.isOpen && wp.roomId && (
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
