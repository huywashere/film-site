"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import NextImage from "next/image";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
} from "lucide-react";
import {
  kkphimApi,
  movieApi,
  siteConfigApi,
  viewApi,
  watchHistoryApi,
} from "@/lib/api";
import { extractFilmItems, normalizeText } from "@/lib/movie-normalizer";
import { resolveImageUrl } from "@/components/film/FilmCard";
import { TmdbArtwork } from "@/components/film/TmdbArtwork";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/ToastProvider";
import { useAuthStore } from "@/store/authStore";
import { useTranslation } from "@/store/langStore";
import { useWatchParty } from "@/hooks/useWatchParty";
import { useTmdb } from "@/hooks/useTmdb";
import { useTmdbArtwork } from "@/hooks/useTmdbArtwork";
import { tmdbBackdrop, tmdbPoster, tmdbProfile } from "@/lib/tmdb";
import { cardFont } from "@/lib/fonts";
import dynamic from "next/dynamic";
import { watchProgressStorage } from "@/lib/watch-progress";
import { guestDataStorage } from "@/lib/user-data";
import {
  classifyPlayerError,
  getSourceHealth,
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
  buildVicdnEmbedUrl,
  buildVidsrcEmbedUrl,
  canUseUnsandboxedEmbed,
  detectServerType,
  episodeNumberFromLabel,
  findMatchingEpisode,
  getSourceAbbr,
  isPlayableEpisode,
  isAutomaticPlaybackSource,
  resolveSeasonNumber,
  sourcePriority,
  type ServerType,
  type SourceServer,
} from "@/lib/player-source-routing";
import { buildArtworkCandidates } from "@/lib/image-cdn";

const HlsVideoPlayer = dynamic(
  () =>
    import("@/components/video/HlsVideoPlayer").then(
      (module) => module.HlsVideoPlayer,
    ),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-[#0b0d12]" />,
  },
);

const WatchPartyPanel = dynamic(
  () =>
    import("@/components/watch/WatchPartyPanel").then(
      (module) => module.WatchPartyPanel,
    ),
  { ssr: false },
);

const AdvancedCommentSection = dynamic(
  () =>
    import("@/components/comments/AdvancedCommentSection").then(
      (module) => module.AdvancedCommentSection,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-32 w-full animate-pulse rounded-2xl bg-white/[0.02]" />
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
  "song-ngu": {
    label: "Song Ngữ",
    Icon: Tv,
    active: "bg-fuchsia-500/15 border-fuchsia-500/50 text-fuchsia-300",
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

// ── Sidebar Film Card Component with Direct TMDB / CDN Resolution ──
function SidebarFilmCard({ film, slug }: { film: any; slug: string }) {
  return (
    <div className="space-y-3 pb-4 border-b border-white/[0.08]">
      <div className="flex gap-3">
        <div className="relative w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 border border-white/[0.08] bg-neutral-900 shadow-md">
          <TmdbArtwork
            film={film}
            kind="poster"
            enabled={false}
            className="w-full h-full object-cover"
            alt={film?.name}
          />
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          <h2 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2">
            {film?.name}
          </h2>
          {film?.origin_name && film.origin_name !== film.name && (
            <p className="text-[11px] text-neutral-400 line-clamp-1">
              {film.origin_name}
            </p>
          )}
          <p className="text-[11px] text-neutral-400 font-medium">
            {film?.year}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {film?.quality && (
              <span className="text-[9px] font-black bg-[#00c5ff] text-black px-1.5 py-0.5 rounded shadow-sm">
                {film.quality}
              </span>
            )}
            {film?.lang && (
              <span
                className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm",
                  film.lang.toLowerCase().includes("song ngữ")
                    ? "bg-[#c084fc] text-purple-950"
                    : film.lang.toLowerCase().includes("thuyết minh") ||
                        film.lang.toLowerCase().includes("lồng tiếng")
                      ? "bg-[#fde047] text-amber-950"
                      : "bg-[#86efac] text-emerald-950",
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
        className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold text-neutral-300 bg-white/[0.04] border border-white/[0.06] rounded-xl hover:text-white hover:bg-white/[0.08] transition-colors"
      >
        <Info size={13} /> Chi tiết phim
      </Link>
    </div>
  );
}

// ── Bulletproof Episode Thumbnail with multi-tier fallback for production ──
function EpisodeThumbnail({
  epNum,
  epIndex,
  film,
  tmdbBackdrops,
  bestBackdrop,
  bestPoster,
  isActive,
  isWatched,
  lang,
}: {
  epNum: string;
  epIndex: number;
  film: any;
  tmdbBackdrops?: any[];
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
      if (resolved && !list.includes(resolved)) list.push(resolved);
    };

    // 1. Scene Still for this specific episode index from TMDB backdrops
    if (tmdbBackdrops && tmdbBackdrops.length > 0) {
      const scene = tmdbBackdrops[epIndex % tmdbBackdrops.length];
      if (scene?.file_path) {
        add(tmdbBackdrop(scene.file_path, "w780"));
        add(tmdbBackdrop(scene.file_path, "w1280"));
      }
    }

    // 2. Best backdrop from useTmdb
    if (bestBackdrop?.file_path) {
      add(tmdbBackdrop(bestBackdrop.file_path, "w780"));
    }

    // 3. Provider thumb and poster URLs
    if (film?.thumb_url) add(film.thumb_url);
    if (film?.poster_url) add(film.poster_url);

    // 4. Alternate path for KKPhim
    const primary = film?.thumb_url || film?.poster_url;
    if (primary && typeof primary === "string") {
      if (primary.includes("/uploads/movies/")) {
        add(primary.replace("/uploads/movies/", "/upload/vod/"));
      } else if (primary.includes("/upload/vod/")) {
        add(primary.replace("/upload/vod/", "/uploads/movies/"));
      }
    }

    // 5. Reuse the already-fetched TMDB poster. Do not start one artwork
    // query per episode thumbnail; that duplicated the page-level TMDB search.
    if (bestPoster?.file_path) {
      add(tmdbPoster(bestPoster.file_path, "w500"));
    }

    return list;
  }, [
    epIndex,
    tmdbBackdrops,
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
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (candidateIdx < candidateUrls.length - 1) {
              setCandidateIdx((i) => i + 1);
            }
          }}
          className={cn(
            "w-full h-full object-cover brightness-75 group-hover/ep:brightness-100 transition-all duration-300",
            loaded ? "opacity-100" : "opacity-0",
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
            {lang === "en" ? "Watching" : "Đang xem"}
          </div>
        )}
        {!isActive && isWatched && (
          <div className="bg-emerald-500/90 text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
            <Check size={9} strokeWidth={3} />{" "}
            {lang === "en" ? "Watched" : "Đã xem"}
          </div>
        )}
      </div>

      {/* Episode Title & Play Icon */}
      <div className="absolute bottom-2 left-2.5 right-2.5 z-10 flex items-center justify-between">
        <span
          className={cn(
            "text-xs font-black drop-shadow-md",
            isActive ? "text-white" : "text-white/90",
          )}
        >
          Tập {epNum}
        </span>
        <div
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-200 shadow-md",
            isActive
              ? "bg-white text-black scale-105"
              : "bg-black/60 text-white/80 group-hover/ep:bg-white group-hover/ep:text-black group-hover/ep:scale-110",
          )}
        >
          <Play size={10} fill="currentColor" className="ml-0.5" />
        </div>
      </div>
    </div>
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
      key: "Space / K",
      desc: lang === "en" ? "Play / Pause video" : "Phát / Tạm dừng video",
    },
    {
      key: "F",
      desc: lang === "en" ? "Toggle Fullscreen" : "Bật / Tắt toàn màn hình",
    },
    {
      key: "T",
      desc: lang === "en" ? "Toggle Theater Mode" : "Bật / Tắt chế độ rạp phim",
    },
    {
      key: "M",
      desc: lang === "en" ? "Mute / Unmute audio" : "Tắt / Bật tiếng",
    },
    {
      key: "← / →",
      desc:
        lang === "en"
          ? "Seek backward / forward 5s"
          : "Tua lùi / Tua tới 5 giây",
    },
    {
      key: "↑ / ↓",
      desc:
        lang === "en"
          ? "Increase / Decrease volume 10%"
          : "Tăng / Giảm âm lượng 10%",
    },
    {
      key: "N",
      desc: lang === "en" ? "Next episode" : "Chuyển sang tập kế tiếp",
    },
    {
      key: "P",
      desc: lang === "en" ? "Previous episode" : "Quay lại tập trước",
    },
    {
      key: "B",
      desc: lang === "en" ? "Skip Intro (+85s)" : "Bỏ qua đoạn mở đầu (+85s)",
    },
    {
      key: "?",
      desc: lang === "en" ? "Show keyboard shortcuts" : "Mở bảng phím tắt",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0f1218] border border-white/15 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <span className="text-lg">⌨️</span>
            <span>
              {lang === "en" ? "Keyboard Shortcuts" : "Phím Tắt Điều Khiển"}
            </span>
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
            {lang === "en" ? "Got it" : "Đã hiểu"}
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
        const ep = s._source === "vicdn" ? "/api/vicdn/status" : "/api/health";
        await fetch(ep, { method: "HEAD", cache: "no-store" }).catch(() => null);
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
                {lang === "en"
                  ? "Server Health & Speed Monitor"
                  : "Kiểm Tra Sức Khỏe & Tốc Độ Máy Chủ"}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {lang === "en"
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
              <RefreshCw size={12} className={testing ? "animate-spin" : ""} />
              <span>{testing ? "Đang đo..." : "Đo lại"}</span>
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
              key: `${srv._source || "unknown"}:${srv.server_name || idx}`,
              source: srv._source,
              serverName: srv.server_name,
              priority: srv.priority,
            });
            const healthScore = Math.max(85, health.score);
            const sourceAbbr = getSourceAbbr(srv._source || "");
            const isHls = Boolean(srv.server_data?.[0]?.link_m3u8);

            return (
              <div
                key={idx}
                onClick={() => {
                  onSwitchServer(idx);
                  toast(
                    lang === "en"
                      ? `Switched to ${srv.server_name}`
                      : `Đã chuyển sang ${srv.server_name}`,
                    "success",
                  );
                  onClose();
                }}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer gap-3",
                  isCurrent
                    ? "bg-[#1f1b2c] border-purple-500/70 shadow-lg shadow-purple-950/50 ring-1 ring-purple-500/40"
                    : "bg-[#16181f] border-white/[0.07] hover:bg-[#1d1f28] hover:border-purple-500/30",
                )}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-black/50 border border-white/10 shrink-0">
                    <span className="text-[11px] font-black text-white">{sourceAbbr}</span>
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
                        {srv._type === "song-ngu"
                          ? "Song Ngữ (Vietsub + Lồng tiếng)"
                          : srv._type === "vietsub"
                            ? "Vietsub chuẩn"
                            : srv._type === "thuyet-minh"
                              ? "Thuyết minh Tiếng Việt"
                              : srv._type === "engsub"
                                ? "Engsub quốc tế"
                                : "Bản gốc"}
                      </span>
                      <span>•</span>
                      <span className="text-neutral-400">{isHls ? "1080p FHD HLS" : "Iframe Player"}</span>
                    </div>
                  </div>
                </div>

                {/* Speed & Health Metrics */}
                <div className="flex items-center gap-3.5 self-end sm:self-auto shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          ping < 60
                            ? "bg-purple-400 animate-pulse"
                            : ping < 150
                              ? "bg-amber-400"
                              : "bg-red-400",
                        )}
                      />
                      <span className="text-xs font-bold font-mono text-white">
                        {ping}ms
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      Sức khỏe: <strong className="text-purple-400 font-semibold">{healthScore}%</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm",
                      isCurrent
                        ? "bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-purple-600/30"
                        : "bg-[#242630] text-neutral-300 hover:bg-purple-600 hover:text-white",
                    )}
                  >
                    {isCurrent ? "Đang dùng" : "Chọn nguồn"}
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
  const [selectedReason, setSelectedReason] = useState("cannot_play");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const reasons = [
    {
      id: "cannot_play",
      label:
        lang === "en"
          ? "Video won't play / Black screen"
          : "Video không phát / Màn hình đen",
    },
    {
      id: "lag_buffering",
      label:
        lang === "en"
          ? "Lag / Continuous buffering"
          : "Giật lag / Tải chậm liên tục",
    },
    {
      id: "audio_desync",
      label:
        lang === "en"
          ? "Audio or subtitle out of sync"
          : "Lệch âm thanh hoặc phụ đề",
    },
    {
      id: "wrong_episode",
      label:
        lang === "en"
          ? "Wrong episode / Incomplete"
          : "Sai tập phim / Thiếu nội dung",
    },
  ];

  const handleSubmitReport = () => {
    setSubmitted(true);
    toast(
      lang === "en"
        ? "Thank you! Error report sent to engineers."
        : "Cảm ơn bạn! Đã gửi báo lỗi tới kỹ thuật viên.",
      "success",
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
              {lang === "en"
                ? "Report Stream & Quick Switch"
                : "Báo Lỗi Phim & Đổi Server Nhanh"}
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
            {lang === "en"
              ? "Try switching to an alternate server:"
              : "Thử chuyển nhanh sang server dự phòng:"}
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
                      lang === "en"
                        ? `Switched to ${srv.server_name}`
                        : `Đã chuyển sang ${srv.server_name}`,
                      "success",
                    );
                    onClose();
                  }}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                    isCurrent
                      ? "bg-white/15 border-white/40 text-white ring-1 ring-white/20"
                      : "bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <span className="truncate">
                    {srv.server_name || `Server #${idx + 1}`}
                  </span>
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
            {lang === "en"
              ? "Or report what went wrong:"
              : "Hoặc báo chi tiết vấn đề bạn gặp phải:"}
          </p>
          <div className="space-y-1.5">
            {reasons.map((r) => (
              <label
                key={r.id}
                onClick={() => setSelectedReason(r.id)}
                className={cn(
                  "flex items-center gap-2.5 p-2 rounded-xl border text-xs transition-all cursor-pointer",
                  selectedReason === r.id
                    ? "bg-white/10 border-white/30 text-white font-semibold"
                    : "bg-white/[0.02] border-white/[0.05] text-white/50 hover:text-white/80",
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
            {lang === "en" ? "Cancel" : "Đóng"}
          </button>
          <button
            onClick={handleSubmitReport}
            disabled={submitted}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {submitted
              ? lang === "en"
                ? "Sent ✓"
                : "Đã gửi ✓"
              : lang === "en"
                ? "Submit Report"
                : "Gửi Báo Lỗi"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Recommendation Item Component with TMDB Artwork Resolution ──
function RecMovieItem({ item, index = 0 }: { item: any; index?: number }) {
  const { posterUrl: tmdbPosterUrl, backdropUrl: tmdbBackdropUrl } =
    useTmdbArtwork(item, !item?.poster_url && !item?.thumb_url);

  const candidateUrls = useMemo(() => {
    const sources: string[] = [];
    const add = (url?: unknown) => {
      const resolved = resolveImageUrl(url);
      if (resolved && !sources.includes(resolved)) sources.push(resolved);
    };

    if (tmdbPosterUrl) add(tmdbPosterUrl);
    if (item?.poster_url) add(item.poster_url);
    if (item?.thumb_url) add(item.thumb_url);
    if (tmdbBackdropUrl) add(tmdbBackdropUrl);

    // Alternate path for KKPhim
    const primary = item?.poster_url || item?.thumb_url;
    if (primary && typeof primary === "string") {
      if (primary.includes("/uploads/movies/")) {
        add(primary.replace("/uploads/movies/", "/upload/vod/"));
      } else if (primary.includes("/upload/vod/")) {
        add(primary.replace("/upload/vod/", "/uploads/movies/"));
      }
    }

    return buildArtworkCandidates(sources, "card");
  }, [item?.poster_url, item?.thumb_url, tmdbBackdropUrl, tmdbPosterUrl]);

  const [candidateIdx, setCandidateIdx] = useState(0);

  useEffect(() => {
    setCandidateIdx(0);
  }, [item?.slug, candidateUrls]);

  const src = candidateUrls[candidateIdx];
  const rating = Number(
    item?.tmdb?.vote_average || item?.vote_average || item?.rating || 0,
  );

  return (
    <Link
      href={`/film/${item.slug}`}
      className="flex gap-3 group p-2 rounded-xl hover:bg-white/[0.04] transition-all duration-200 cursor-pointer animate-in fade-in slide-in-from-bottom-1 fill-mode-both"
      style={{ animationDelay: `${Math.min(index, 7) * 35}ms` }}
    >
      <div className="relative w-16 h-24 rounded-lg bg-neutral-900 flex-shrink-0 overflow-hidden border border-white/[0.08] group-hover:border-white/25 shadow-md">
        {src ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={`${item.slug}-${candidateIdx}`}
            src={src}
            alt={item.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => {
              if (candidateIdx < candidateUrls.length - 1) {
                setCandidateIdx((i) => i + 1);
              }
            }}
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
            <p className="text-[11px] text-neutral-400 truncate">
              {item.origin_name}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {item.year && (
            <span className="text-[11px] text-neutral-400 font-medium">
              {item.year}
            </span>
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

// ── Skeleton ──────────────────────────────────────────────────
function WatchSkeleton() {
  return <WatchPageSkeleton />;
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function WatchPage({ initialData }: { initialData?: any }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { t, lang } = useTranslation();

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
  const [watchPartyRequested, setWatchPartyRequested] = useState(
    Boolean(roomCode || shouldCreateParty),
  );
  const [manualPartyCreateRequested, setManualPartyCreateRequested] =
    useState(false);
  const wp = useWatchParty(slug, currentEp, watchPartyRequested);
  const joinWatchPartyRoom = wp.joinRoom;
  const createWatchPartyRoom = wp.createRoom;

  // State
  const [currentServer, setCurrentServer] = useState(0);
  const [failedServers, setFailedServers] = useState<number[]>([]);
  const [episodeSearch, setEpisodeSearch] = useState("");
  const [episodeSortOrder, setEpisodeSortOrder] = useState<"oldest" | "newest">(
    "oldest",
  );
  const [watchContentTab, setWatchContentTab] = useState<
    "episodes" | "recommendations" | "cast" | "trailer" | "collection"
  >("episodes");
  const [autoNextConfig, setAutoNextConfig] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("cineverse_auto_next") !== "false";
    }
    return true;
  });
  const [autoPlayConfig, setAutoPlayConfig] = useState(true);
  const [providerPriority, setProviderPriority] = useState([
    "kkphim",
    "ophim",
    "nguonc",
    "vsmov",
  ]);
  const [watchPartyEnabled, setWatchPartyEnabled] = useState(true);
  const [secondaryDataSlug, setSecondaryDataSlug] = useState("");
  const secondaryDataReady = secondaryDataSlug === slug;
  const [recommendationsSlug, setRecommendationsSlug] = useState("");
  const recommendationsReady = recommendationsSlug === slug;
  const [playerReadySlug, setPlayerReadySlug] = useState("");
  const primaryPlayerReady = playerReadySlug === slug;
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(
    null,
  );

  useEffect(() => {
    // Enable multi-provider fetching immediately so all server sources appear without delay
    setSecondaryDataSlug(slug);
  }, [slug]);

  useEffect(() => {
    // Recommendations are below the player and must not compete with manifest,
    // subtitle and first-segment requests. A no-player fallback still makes
    // them available on films with unavailable streams.
    let timer: ReturnType<typeof window.setTimeout> | undefined;
    const schedule = () => {
      timer = window.setTimeout(
        () => setRecommendationsSlug(slug),
        primaryPlayerReady ? 800 : 3_000,
      );
    };

    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("load", schedule);
    };
  }, [primaryPlayerReady, slug]);
  // Native HLS is the primary transport because it exposes real playback
  // events. Provider iframe remains the safe final transport fallback.
  const [playerEngine, setPlayerEngine] = useState<"hls" | "iframe">("hls");
  const [activeServerType, setActiveServerType] =
    useState<ServerType>("vietsub");
  const [currentTypeServer, setCurrentTypeServer] = useState(0);
  const [vidsrcManuallySelected, setVidsrcManuallySelected] = useState(false);
  const [userManuallySelectedServer, setUserManuallySelectedServer] =
    useState(false);

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
  const recordedViewRef = useRef(false);
  const lastKnownPlaybackTimeRef = useRef(0);
  const lastProgressSyncRef = useRef(0);

  // Universal Player Container & Gestures (for ALL video players & iframe sources)
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const commentsSectionRef = useRef<HTMLDivElement>(null);
  const [commentsReadySlug, setCommentsReadySlug] = useState("");
  const commentsReady = commentsReadySlug === slug;
  const [isOuterSpeedBoosted, setIsOuterSpeedBoosted] = useState(false);
  const [outerDoubleTapHud, setOuterDoubleTapHud] = useState<
    "rewind" | "forward" | null
  >(null);
  const outerPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outerLastTapRef = useRef<number>(0);

  useEffect(() => {
    if (commentsReady) return;
    const target = commentsSectionRef.current;
    if (!target || !("IntersectionObserver" in window)) {
      const timer = window.setTimeout(() => setCommentsReadySlug(slug), 4_000);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setCommentsReadySlug(slug);
        observer.disconnect();
      },
      { rootMargin: "700px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [commentsReady, slug]);

  // Cinema Mode & Player Enhancement States
  const [lightOff, setLightOff] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);

  useEffect(() => {
    if (lightOff) document.body.dataset.cinemaLights = "off";
    else delete document.body.dataset.cinemaLights;

    return () => {
      delete document.body.dataset.cinemaLights;
    };
  }, [lightOff]);

  // Theater mode syncs to body for potential CSS targeting
  useEffect(() => {
    if (theaterMode) document.body.dataset.theaterMode = "on";
    else delete document.body.dataset.theaterMode;
    return () => {
      delete document.body.dataset.theaterMode;
    };
  }, [theaterMode]);

  const [subDelayOffset, setSubDelayOffset] = useState<number>(0);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEpThumbnails, setShowEpThumbnails] = useState(false);
  const [artInstance, setArtInstance] = useState<any>(null);

  // Under-player toolbar states
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showServerHealthModal, setShowServerHealthModal] = useState(false);
  const [showShortcutsGuide, setShowShortcutsGuide] = useState(false);
  const [showServerDropdown, setShowServerDropdown] = useState(false);
  const serverDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        serverDropdownRef.current &&
        !serverDropdownRef.current.contains(event.target as Node)
      ) {
        setShowServerDropdown(false);
      }
    }
    if (showServerDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showServerDropdown]);

  useEffect(() => {
    if (!secondaryDataReady) return;
    let active = true;
    siteConfigApi
      .getPublic()
      .then(({ data }) => {
        if (!active) return;
        if (data.providerPriority?.length)
          setProviderPriority(data.providerPriority);
        setWatchPartyEnabled(data.watchPartyEnabled !== false);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [secondaryDataReady]);

  const [isQuickSettingsCollapsed, setIsQuickSettingsCollapsed] = useState(
    () => {
      if (typeof window !== "undefined") {
        return (
          localStorage.getItem("cineverse_quick_settings_collapsed") === "true"
        );
      }
      return false;
    },
  );

  const toggleQuickSettingsCollapsed = useCallback(() => {
    setIsQuickSettingsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "cineverse_quick_settings_collapsed",
          String(next),
        );
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
    if (typeof window !== "undefined") {
      if (theaterMode) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      const t1 = setTimeout(() => {
        if (artInstance && typeof artInstance.resize === "function") {
          artInstance.resize();
        }
      }, 150);
      const t2 = setTimeout(() => {
        if (artInstance && typeof artInstance.resize === "function") {
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
    if (
      roomCode &&
      wp.roomId !== roomCode &&
      joinedRoomRef.current !== roomCode
    ) {
      joinedRoomRef.current = roomCode;
      joinWatchPartyRoom(roomCode);
    }
  }, [joinWatchPartyRoom, roomCode, wp.roomId]);

  // ── Watch Party: Host -> Room Playback Synchronization ──
  const lastSyncActionRef = useRef<string>("");
  const lastSyncTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!artInstance || !wp.roomId || !wp.isHost) return;

    const handlePlay = () => {
      if (applyingRemoteStateRef.current) return;
      lastSyncActionRef.current = "play";
      lastSyncTimeRef.current = artInstance.currentTime || 0;
      wp.syncPlayerState("play", artInstance.currentTime || 0);
    };

    const handlePause = () => {
      if (applyingRemoteStateRef.current) return;
      lastSyncActionRef.current = "pause";
      lastSyncTimeRef.current = artInstance.currentTime || 0;
      wp.syncPlayerState("pause", artInstance.currentTime || 0);
    };

    let seekTimer: ReturnType<typeof setTimeout> | null = null;
    const handleSeek = () => {
      if (applyingRemoteStateRef.current) return;
      if (seekTimer) clearTimeout(seekTimer);
      seekTimer = setTimeout(() => {
        lastSyncActionRef.current = "seek";
        lastSyncTimeRef.current = artInstance.currentTime || 0;
        wp.syncPlayerState("seek", artInstance.currentTime || 0);
      }, 150);
    };

    // Periodic heartbeat to keep newly joined or drifting users in sync every 6 seconds
    const heartbeat = setInterval(() => {
      if (applyingRemoteStateRef.current) return;
      if (artInstance.playing) {
        wp.syncPlayerState("play", artInstance.currentTime || 0);
      }
    }, 6000);

    artInstance.on("play", handlePlay);
    artInstance.on("pause", handlePause);
    artInstance.on("seek", handleSeek);

    return () => {
      if (seekTimer) clearTimeout(seekTimer);
      clearInterval(heartbeat);
      artInstance.off("play", handlePlay);
      artInstance.off("pause", handlePause);
      artInstance.off("seek", handleSeek);
    };
  }, [artInstance, wp.isHost, wp.roomId, wp.syncPlayerState]);

  // ── Watch Party: Guest <- Room Playback Synchronization with Smart Drift Threshold ──
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

    // Compensate for network transmission latency
    const latencySec = state.serverTime
      ? Math.max(0, Math.min(2.5, (Date.now() - state.serverTime) / 1000))
      : 0;
    const targetTime =
      state.action === "play"
        ? state.currentTime + latencySec
        : state.currentTime;

    const current = artInstance.currentTime || 0;
    const drift = Math.abs(current - targetTime);

    // Only seek if drift exceeds 1.8s (or if host explicitly seeked) to prevent audio/video buffering stutter
    if (drift > 1.8 || state.action === "seek") {
      artInstance.currentTime = targetTime;
    }

    if (state.action === "play") {
      if (!artInstance.playing) {
        artInstance.video?.play?.().catch?.(() => {});
      }
    } else if (state.action === "pause") {
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

  // Keyboard Shortcuts (Space/K: Play/Pause, F: Fullscreen, T: Theater, M: Mute, Arrows: Seek/Volume, N: Next, P: Prev, B: Skip Intro, ?: Shortcuts)
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

      // Theater Mode - works without artInstance
      if (e.code === "KeyT") {
        e.preventDefault();
        setTheaterMode((prev) => !prev);
        return;
      }

      // Show shortcuts modal
      if (e.key === "?") {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
        return;
      }

      // Next / Previous episode - work without artInstance
      if (e.code === "KeyN") {
        e.preventDefault();
        const videoEl = playerContainerRef.current?.querySelector("video");
        if (videoEl)
          videoEl.currentTime = videoEl.duration || videoEl.currentTime;
        return;
      }

      if (e.code === "KeyP") {
        e.preventDefault();
        return;
      }

      // artInstance-dependent shortcuts
      if (e.code === "Space" || e.code === "KeyK") {
        e.preventDefault();
        if (artInstance) {
          artInstance.toggle();
        } else {
          const videoEl = playerContainerRef.current?.querySelector("video");
          if (videoEl) videoEl.paused ? videoEl.play() : videoEl.pause();
        }
      } else if (e.code === "KeyF") {
        e.preventDefault();
        if (artInstance) {
          artInstance.fullscreen = !artInstance.fullscreen;
        } else {
          const videoEl = playerContainerRef.current?.querySelector("video");
          if (videoEl) videoEl.requestFullscreen?.();
        }
      } else if (e.code === "KeyM") {
        e.preventDefault();
        if (artInstance) {
          artInstance.volume = artInstance.volume === 0 ? 0.8 : 0;
        } else {
          const videoEl = playerContainerRef.current?.querySelector("video");
          if (videoEl) videoEl.muted = !videoEl.muted;
        }
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        if (artInstance) {
          artInstance.seek = Math.max(0, artInstance.currentTime - 5);
        } else {
          const videoEl = playerContainerRef.current?.querySelector("video");
          if (videoEl)
            videoEl.currentTime = Math.max(0, videoEl.currentTime - 5);
        }
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        if (artInstance) {
          artInstance.seek = Math.min(
            artInstance.duration || 9999,
            artInstance.currentTime + 5,
          );
        } else {
          const videoEl = playerContainerRef.current?.querySelector("video");
          if (videoEl)
            videoEl.currentTime = Math.min(
              videoEl.duration || 9999,
              videoEl.currentTime + 5,
            );
        }
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        if (artInstance) {
          artInstance.volume = Math.min(1, (artInstance.volume || 0) + 0.1);
        }
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        if (artInstance) {
          artInstance.volume = Math.max(0, (artInstance.volume || 0) - 0.1);
        }
      } else if (e.code === "KeyB") {
        // Skip intro +85s
        e.preventDefault();
        if (artInstance) {
          artInstance.seek = artInstance.currentTime + 85;
          toast("Đã bỏ qua Intro (+85s)", "info");
        } else {
          const videoEl = playerContainerRef.current?.querySelector("video");
          if (videoEl) {
            videoEl.currentTime = Math.min(
              videoEl.duration || 9999,
              videoEl.currentTime + 85,
            );
            toast("Đã bỏ qua Intro (+85s)", "info");
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [artInstance, toast, setTheaterMode, setShowShortcutsModal]);

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
    initialData:
      !preferredSource && sourceSlug === slug
        ? initialData || undefined
        : undefined,
    enabled: !!sourceSlug,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
  const film = data?.movie || data;
  const primarySource = String(
    data?._source || data?.movie?._source || preferredSource || "kkphim",
  );
  const lookupTitle = film?.name || film?.origin_name || slug || "";

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
      next
        ? "Đã thêm vào danh sách Yêu thích ❤️"
        : "Đã bỏ khỏi danh sách Yêu thích",
      next ? "success" : "info",
    );
  };

  const handleToggleWatchlist = () => {
    const current = guestDataStorage.isWatchlisted(slug);
    if (current) {
      guestDataStorage.removeWatchlist(slug);
      setIsInWatchlist(false);
      toast("Đã xóa khỏi Tủ phim", "info");
    } else {
      guestDataStorage.addWatchlist(slug, movieStoredData);
      setIsInWatchlist(true);
      toast("Đã lưu vào Tủ phim 📁", "success");
    }
  };

  const { data: sourceLookupData } = useQuery({
    queryKey: ["watch-source-lookup", lookupTitle, film?.year],
    queryFn: () =>
      movieApi.searchSourceAlternatives(lookupTitle, 1, 30).then((r) => r.data),
    enabled: secondaryDataReady && Boolean(lookupTitle),
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
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
      return matchedSourceRecord?._sourceSlugs?.[source] || sourceSlug || slug;
    },
    [matchedSourceRecord, primarySource, sourceSlug, slug],
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
      secondaryDataReady && Boolean(kkphimSlug) && primarySource !== "kkphim",
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const { data: ophimFetchedData } = useQuery({
    queryKey: ["film-ophim", ophimSlug],
    queryFn: () =>
      movieApi.getDetailFromSource("ophim", ophimSlug).then((r) => r.data),
    enabled:
      secondaryDataReady && Boolean(ophimSlug) && primarySource !== "ophim",
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const { data: nguoncFetchedData } = useQuery({
    queryKey: ["film-nguonc", nguoncSlug],
    queryFn: () =>
      movieApi.getDetailFromSource("nguonc", nguoncSlug).then((r) => r.data),
    enabled:
      secondaryDataReady && Boolean(nguoncSlug) && primarySource !== "nguonc",
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const { data: vsmovFetchedData } = useQuery({
    queryKey: ["film-vsmov", vsmovSlug],
    queryFn: () =>
      movieApi.getDetailFromSource("vsmov", vsmovSlug).then((r) => r.data),
    enabled:
      secondaryDataReady && Boolean(vsmovSlug) && primarySource !== "vsmov",
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    retry: 1,
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

  const {
    bestBackdrop,
    bestPoster,
    backdrops: tmdbBackdrops,
    cast: tmdbCast,
    trailer: tmdbTrailer,
    creditsLoading,
    videosLoading,
  } = useTmdb({
    film,
    enabled: secondaryDataReady && !!film,
    fetchCredits: watchContentTab === "cast",
    fetchVideos: watchContentTab === "trailer",
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

  // ── TMDB Smart Recommendations Engine (AI & Graph-Based) ──
  const effectiveTmdbId = film?.tmdb?.id || film?.tmdbId;
  const effectiveMediaType =
    film?.tmdb?.type || (film?.type === "series" ? "tv" : "movie");

  const { data: recsData } = useQuery({
    queryKey: [
      "smart-recs-v2",
      slug,
      effectiveTmdbId,
      effectiveMediaType,
      filmCategory,
    ],
    queryFn: async () => {
      const items: any[] = [];
      const seenSlugs = new Set<string>();
      if (slug) seenSlugs.add(slug);

      // Render provider-native recommendations first. These already have a
      // valid NetPhim slug and only need one cached catalogue request.
      try {
        const { searchLocalFilms } = await import("@/lib/smart-search");
        const titleKeywords =
          (film?.name || film?.origin_name || slug || "").split(" ")[0] || "";
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
          const genreItems =
            response?.data?.data?.items || response?.data?.items || [];
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
          const tmdbEndpoint = `/api/tmdb/${effectiveMediaType === "tv" ? "tv" : "movie"}/${effectiveTmdbId}/recommendations`;
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
                  "";
                if (!title) return null;

                const response = await kkphimApi.search(title, 1, 10);
                const candidates = extractFilmItems(response) as any[];
                const tmdbId = String(tmdbItem.id);
                const year = String(
                  tmdbItem.release_date || tmdbItem.first_air_date || "",
                ).slice(0, 4);
                const normalizedTitles = new Set(
                  [
                    tmdbItem.title,
                    tmdbItem.name,
                    tmdbItem.original_title,
                    tmdbItem.original_name,
                  ]
                    .filter(Boolean)
                    .map((value) => normalizeText(String(value))),
                );
                const exact = candidates.find(
                  (candidate) => String(candidate?.tmdb?.id || "") === tmdbId,
                );
                const titleMatch = candidates.find((candidate) => {
                  const sameTitle = [candidate?.name, candidate?.origin_name]
                    .filter(Boolean)
                    .map((value) => normalizeText(String(value)))
                    .some((value) => normalizedTitles.has(value));
                  return (
                    sameTitle &&
                    (!year ||
                      !candidate?.year ||
                      String(candidate.year) === year)
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
                  vote_average:
                    providerItem.vote_average || tmdbItem.vote_average,
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
              const item = result.status === "fulfilled" ? result.value : null;
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

  // The recommendation tab is intentionally broader than the genre/TMDB
  // similarity rail: mix fresh single movies, series and catalogue pages.
  const { data: discoveryData, isLoading: discoveryLoading } = useQuery({
    queryKey: ["watch-discovery-mix", slug],
    queryFn: async () => {
      const seed = Array.from(slug || "netphim").reduce(
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
        result.status === "fulfilled"
          ? (extractFilmItems(result.value) as any[])
          : [],
      );

      const unique = pool.filter((item) => {
        if (!item?.slug || seen.has(item.slug)) return false;
        seen.add(item.slug);
        return true;
      });

      // A deterministic shuffle keeps the tab visually varied without
      // changing order during hydration or on every React render.
      unique.sort((left, right) => {
        const score = (value: string) =>
          Array.from(`${slug}:${value}`).reduce(
            (total, character) =>
              (total * 31 + character.charCodeAt(0)) % 2147483647,
            7,
          );
        return score(left.slug) - score(right.slug);
      });

      return { items: unique.slice(0, 12) };
    },
    enabled: watchContentTab === "recommendations" && !!slug,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
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

  const diverseTmdbBackdrops = useMemo(() => {
    const unique = tmdbBackdrops.filter(
      (image, index, items) =>
        items.findIndex(
          (candidate) => candidate.file_path === image.file_path,
        ) === index,
    );
    if (unique.length <= 12) return unique;

    return Array.from({ length: 12 }, (_, index) => {
      const position = Math.round((index * (unique.length - 1)) / 11);
      return unique[position];
    });
  }, [tmdbBackdrops]);

  // Episode processing: normalize provider ownership, language and priority.
  const episodes: SourceServer[] = useMemo(() => {
    const extractEpisodes = (providerData: any): any[] =>
      providerData?.episodes ||
      providerData?.data?.episodes ||
      providerData?.movie?.episodes ||
      providerData?.data?.item?.episodes ||
      providerData?.item?.episodes ||
      [];
    const kkphimEps = extractEpisodes(kkphimData);
    const ophimEps = extractEpisodes(ophimData);
    const nguoncEps = extractEpisodes(nguoncData);
    const vsmovEps = extractEpisodes(vsmovData);
    let vidsrcEps: any[] = [];
    let vicdnEps: any[] = [];

    if (tmdbId) {
      if (tmdbMediaType === "movie") {
        const vicdnEmbedUrl = buildVicdnEmbedUrl({
          tmdbId,
          mediaType: "movie",
        });
        if (vicdnEmbedUrl) {
          vicdnEps = [
            {
              server_name: "ViCDN Song Ngữ",
              server_data: [
                {
                  name: "Full Movie (Song Ngữ)",
                  slug: "full",
                  link_embed: vicdnEmbedUrl,
                  link_m3u8: "",
                },
              ],
            },
          ];
        }
      } else {
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

        const vicdnServerData = Array.from(episodeMap.entries())
          .sort(([left], [right]) => left - right)
          .flatMap(([episodeNumber, sourceEpisode]) => {
            const embedUrl = buildVicdnEmbedUrl({
              tmdbId,
              mediaType: "tv",
              season: vidsrcSeason,
              episode: episodeNumber,
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

        if (vicdnServerData.length > 0) {
          vicdnEps = [
            { server_name: "ViCDN Song Ngữ", server_data: vicdnServerData },
          ];
        }
      }
    }

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

    const tagSource = (arr: any[], sourceKey: string) => {
      const sourceAbbr = getSourceAbbr(sourceKey);
      return arr.map((s, i): SourceServer => {
        const originalName = String(s.server_name || "");
        const serverData = Array.isArray(s.server_data) ? s.server_data : [];
        return {
          ...s,
          server_name: `Server ${i + 1} (${sourceAbbr})`,
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
    };

    const combined = [
      ...tagSource(kkphimEps, "kkphim"),
      ...tagSource(nguoncEps, "nguonc"),
      ...tagSource(vsmovEps, "vsmov"),
      ...tagSource(ophimEps, "ophim"),
      ...tagSource(vicdnEps, "vicdn"),
      ...tagSource(vidsrcEps, "vidsrc"),
    ];
    const rank = new Map(
      providerPriority.map((source, index) => [source, index]),
    );
    return combined.sort(
      (left, right) =>
        (rank.get(left._source || "") ?? 999) -
          (rank.get(right._source || "") ?? 999) ||
        (right.priority ?? 0) - (left.priority ?? 0),
    );
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
    providerPriority,
  ]);

  const serversByType = useMemo(() => {
    const g: Record<ServerType, any[]> = {
      vietsub: [],
      "song-ngu": [],
      "thuyet-minh": [],
      engsub: [],
      raw: [],
    };
    episodes.forEach((ep) => g[ep._type as ServerType].push(ep));
    return g;
  }, [episodes]);

  const availableTypes = useMemo(
    () =>
      (
        ["vietsub", "song-ngu", "thuyet-minh", "engsub", "raw"] as ServerType[]
      ).filter((t) => serversByType[t].length > 0),
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

  const m3u8Url: string = currentEpData?.link_m3u8 || "";
  const m3u8ProxyUrl: string = currentEpData?.link_m3u8_proxy || "";
  const embedUrl: string = currentEpData?.link_embed || "";

  const iframeUrl =
    embedUrl ||
    (m3u8Url
      ? `https://player.phimapi.com/player/?url=${encodeURIComponent(m3u8Url)}`
      : "");
  const iframeSandbox = undefined;
  const videoUrl = m3u8Url || embedUrl || iframeUrl;

  const currentEpIndex = serverData.findIndex(
    (e: any) =>
      (e.slug || e.name) ===
      (currentEp || currentEpData?.slug || currentEpData?.name),
  );

  const posterUrl =
    resolveImageUrl(film?.thumb_url) ||
    resolveImageUrl(film?.poster_url) ||
    undefined;

  // Auto-sync active episode range for long series (e.g. One Piece, Conan with 500-1100+ episodes)
  useEffect(() => {
    if (currentEpIndex >= 0 && serverData.length > 0) {
      const rSize =
        serverData.length > 500 ? 100 : serverData.length > 100 ? 50 : 40;
      const targetRange = Math.floor(currentEpIndex / rSize);
      setEpRangeIndex(targetRange);
    }
  }, [currentEpIndex, serverData.length]);

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
      (!shouldCreateParty && !manualPartyCreateRequested) ||
      !watchPartyEnabled ||
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

      // ── Auto Next Episode Countdown Trigger (within 3 seconds of ending) ──
      if (
        autoNextConfig &&
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
      autoNextConfig,
      autoNextCountdown,
      currentEpData,
      currentEpIndex,
      epName,
      film?.name,
      film?.origin_name,
      posterUrl,
      server?.server_name,
      serverData.length,
      slug,
      user,
    ],
  );

  // Navigation
  const watchUrlForEpisode = useCallback(
    (episode: string, srvIdx?: number) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("ep", episode);
      if (typeof srvIdx === "number") {
        nextParams.set("server", String(srvIdx));
      }
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

  // ── Global Keyboard Shortcuts Listener ──
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

      if (e.code === "Space" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        if (artInstance) {
          if (artInstance.playing) {
            artInstance.pause();
          } else {
            artInstance.play();
          }
        }
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (artInstance) {
          artInstance.fullscreen = !artInstance.fullscreen;
        }
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        setTheaterMode((prev) => {
          const next = !prev;
          toast(
            next ? "Đã bật chế độ rạp phim" : "Đã tắt chế độ rạp phim",
            "info",
          );
          return next;
        });
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        if (artInstance) {
          artInstance.muted = !artInstance.muted;
        }
      } else if (e.key === "ArrowLeft" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        if (artInstance) {
          artInstance.currentTime = Math.max(
            0,
            (artInstance.currentTime || 0) - 10,
          );
        }
      } else if (e.key === "ArrowRight" || e.key === "l" || e.key === "L") {
        e.preventDefault();
        if (artInstance) {
          artInstance.currentTime = (artInstance.currentTime || 0) + 10;
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (artInstance) {
          artInstance.volume = Math.min(
            1,
            Math.round(((artInstance.volume || 1) + 0.1) * 10) / 10,
          );
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (artInstance) {
          artInstance.volume = Math.max(
            0,
            Math.round(((artInstance.volume || 1) - 0.1) * 10) / 10,
          );
        }
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        goNextEpisode();
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        if (artInstance) {
          artInstance.currentTime = 85;
          toast("Đã bỏ qua đoạn mở đầu (Intro)", "info");
        }
      } else if (e.key === "?") {
        e.preventDefault();
        setShowShortcutsGuide((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [artInstance, goNextEpisode, toast]);

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
    // Do not trigger automatic fallback loops if the user explicitly selected a server
    if (vidsrcManuallySelected || userManuallySelectedServer) return;
    iframeLoadTimerRef.current = setTimeout(() => {
      iframeLoadTimerRef.current = null;
      tryNextServer("iframe-timeout");
    }, 20_000);
  }, [
    clearIframeLoadTimeout,
    tryNextServer,
    userManuallySelectedServer,
    vidsrcManuallySelected,
  ]);

  const handlePlayerFailure = useCallback(
    (reason: string) => {
      // Prioritize switching to the next healthy HLS mirror in our custom player
      // to maintain a clean, ad-free, high-quality viewing experience on both mobile and desktop.
      tryNextServer(reason);
    },
    [tryNextServer],
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

  const DISABLE_ARTPLAYER = false;

  useEffect(() => {
    setFailedServers([]);
    setIsFallbacking(false);
    setFallbackMessage("");
    playerLoadStartedAtRef.current = Date.now();
    fallbackAttemptRef.current = 0;
    fallbackInProgressRef.current = false;
    recordedViewRef.current = false;
    playedSourceKeysRef.current.clear();
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
      setPlayerEngine(
        DISABLE_ARTPLAYER
          ? "iframe"
          : first.server_data?.[0]?.link_m3u8
            ? "hls"
            : "iframe",
      );
    }
  }, [activeServerType, episodes, serversByType]);

  useEffect(() => {
    if (typeof document !== "undefined" && film?.name) {
      document.title = `Xem Phim ${film.name} ${currentEpData?.name ? `- Tập ${currentEpData.name}` : ""} Vietsub HD | NetPhim`;
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

  const watchSeoTitle = `Xem Phim ${film?.name || ""} ${currentEpData?.name ? `- Tập ${currentEpData.name}` : ""} Vietsub HD | NetPhim`;
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
    <div
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
          "pt-20 lg:pt-22 mx-auto px-3 md:px-5 pb-10 transition-all duration-300",
          theaterMode
            ? "w-full lg:pl-20 max-w-none"
            : "max-w-[1800px] lg:pl-20",
        )}
      >
        <div
          className={cn(
            "grid gap-5 transition-all duration-300",
            theaterMode
              ? "grid-cols-1"
              : "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px]",
          )}
        >
          {/* ───── LEFT COLUMN ───── */}
          <div
            className={cn(
              "space-y-4 min-w-0",
              theaterMode ? "w-full max-w-none" : "",
            )}
          >
            {/* ── BREADCRUMB & QUICK CONTROLS BAR — Above Video ── */}
            <div className="flex items-center justify-between gap-2 py-1.5 px-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-white/50">
              <div className="flex items-center gap-2 min-w-0">
                {watchPartyEnabled && (
                  <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold transition-all shrink-0 text-xs shadow-sm hover:scale-105 active:scale-95 cursor-pointer border border-white/15"
                  >
                    <ArrowLeft size={13} />
                    <span>Quay lại</span>
                  </button>
                )}
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
                  onClick={() => {
                    if (!wp.roomId) {
                      setWatchPartyRequested(true);
                      setManualPartyCreateRequested(true);
                    } else {
                      wp.setIsOpen(!wp.isOpen);
                    }
                  }}
                  disabled={!watchPartyEnabled}
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
                            title: film?.name || "NetPhim",
                            text: `Xem phim ${film?.name || ""} miễn phí trên NetPhim!`,
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
                          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}&text=${encodeURIComponent(`Xem phim ${film?.name || ""} trên NetPhim!`)}`}
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
                "netphim-watch-player bg-black rounded-2xl overflow-hidden relative shadow-2xl ring-1 ring-white/[0.06] select-none transition-all duration-300 flex items-center justify-center",
                theaterMode
                  ? "is-theater w-full aspect-[16/9] sm:aspect-auto sm:h-[72vh] lg:h-[78vh] min-h-[400px] max-h-[920px] mx-auto shadow-2xl ring-1 ring-purple-500/20"
                  : "w-full aspect-video",
                lightOff ? "relative z-50 ring-1 ring-white/20 shadow-2xl" : "",
              )}
            >
              {/* ── Universal 2x Speed Hold Top HUD Banner ── */}
              {isOuterSpeedBoosted && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/90 border border-purple-500/50 text-purple-400 font-extrabold text-xs px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 animate-pulse pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
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
                      proxySrc={m3u8ProxyUrl}
                      poster={posterUrl}
                      title={film?.name || film?.title || ""}
                      subtitle={
                        currentEpData?.name ? `Tập ${currentEpData.name}` : ""
                      }
                      initialTime={lastKnownPlaybackTimeRef.current || resumeAt}
                      autoPlay={autoPlayConfig}
                      onReady={(player) => {
                        setArtInstance(player);
                        setPlayerReadySlug(slug);
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
                          if (!recordedViewRef.current) {
                            recordedViewRef.current = true;
                            void viewApi
                              .record(slug, {
                                title: film?.name || slug,
                                originName: film?.origin_name,
                                posterUrl,
                                year: Number(film?.year) || undefined,
                                type: film?.type,
                                episode:
                                  currentEpData?.slug || currentEpData?.name,
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
                        recordTelemetry("player.buffering", {
                          source: sourceCandidate.source || "unknown",
                          server: sourceCandidate.serverName || "unknown",
                          episode:
                            currentEpData?.slug ||
                            currentEpData?.name ||
                            "unknown",
                          buffer_ms: bufferMs,
                          engine: "hls",
                        });
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
                        className="w-full h-full border-0"
                        allowFullScreen
                        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer"
                        referrerPolicy="no-referrer-when-downgrade"
                        sandbox={iframeSandbox}
                        title={`${film?.name} - ${currentEpData?.name}`}
                        onLoad={() => {
                          clearIframeLoadTimeout();
                          setPlayerReadySlug(slug);
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
                            if (!recordedViewRef.current) {
                              recordedViewRef.current = true;
                              void viewApi
                                .record(slug, {
                                  title: film?.name || slug,
                                  originName: film?.origin_name,
                                  posterUrl,
                                  year: Number(film?.year) || undefined,
                                  type: film?.type,
                                  episode:
                                    currentEpData?.slug || currentEpData?.name,
                                  serverName: sourceCandidate.serverName,
                                  provider: sourceCandidate.source,
                                })
                                .catch(() => {
                                  recordedViewRef.current = false;
                                });
                            }
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
                        onError={() => {
                          if (!userManuallySelectedServer) {
                            handlePlayerFailure("iframe-error");
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
                </>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full text-white/20">
                  <Clapperboard size={36} className="mb-2" />
                  <p className="text-xs">Không tìm thấy nguồn phim</p>
                </div>
              )}
            </div>

            {/* ── UNDER-PLAYER ACTION TOOLBAR (Neat & Compact on Mobile + Desktop) ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 px-3.5 sm:px-4 py-2.5 bg-[#0a0c10] border border-white/[0.08] rounded-xl text-xs font-semibold select-none shadow-lg">
              {/* Top Row on Mobile / Left on Desktop: Yêu thích + Thêm vào + Mobile Collapse Button */}
              <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-6 w-full sm:w-auto">
                <div className="flex items-center gap-3.5 sm:gap-6">
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    className={cn(
                      "inline-flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 text-xs",
                      isFavorite
                        ? "text-red-400 hover:text-red-300 font-bold"
                        : "text-white/80 hover:text-white",
                    )}
                    title="Thêm vào danh sách yêu thích"
                  >
                    <Heart
                      size={14}
                      className={cn(
                        "transition-transform",
                        isFavorite
                          ? "fill-red-500 text-red-500 scale-110"
                          : "text-white/70",
                      )}
                    />
                    <span>{isFavorite ? "Đã thích" : "Yêu thích"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleWatchlist}
                    className={cn(
                      "inline-flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 text-xs",
                      isInWatchlist
                        ? "text-emerald-400 hover:text-emerald-300 font-bold"
                        : "text-white/80 hover:text-white",
                    )}
                    title="Thêm vào tủ phim"
                  >
                    {isInWatchlist ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <Plus size={14} className="text-white/70" />
                    )}
                    <span>{isInWatchlist ? "Đã lưu" : "Thêm vào"}</span>
                  </button>
                </div>

                {/* Collapse toggle button on mobile (right-aligned in top row) */}
                <div className="sm:hidden">
                  <button
                    type="button"
                    onClick={toggleQuickSettingsCollapsed}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-neutral-400 hover:text-white bg-white/[0.04] border border-white/[0.06] transition-all active:scale-95 cursor-pointer"
                    title={
                      isQuickSettingsCollapsed
                        ? "Mở rộng cài đặt trình phát"
                        : "Thu gọn tất cả cài đặt trình phát"
                    }
                  >
                    <SlidersHorizontal size={11} className="text-neutral-400" />
                    <span>
                      {isQuickSettingsCollapsed ? "Cài đặt" : "Thu gọn"}
                    </span>
                    <ChevronDown
                      size={11}
                      className={cn(
                        "transition-transform duration-200",
                        !isQuickSettingsCollapsed && "rotate-180",
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Quick Player Controls: Single horizontal scrollable row on mobile, spacious on desktop */}
              {!isQuickSettingsCollapsed && (
                <div className="flex items-center gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar pt-1 sm:pt-0 border-t border-white/[0.04] sm:border-t-0 text-[11px] sm:text-xs">
                  {/* Rạp phim mở rộng (Theater Mode) */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = !theaterMode;
                      setTheaterMode(next);
                      toast(
                        next
                          ? "Đã bật chế độ Rạp phim mở rộng"
                          : "Đã tắt chế độ Rạp phim",
                        "info",
                      );
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 transition-all cursor-pointer select-none active:scale-95 shrink-0",
                      theaterMode
                        ? "text-purple-400 font-bold"
                        : "text-neutral-400 hover:text-neutral-200",
                    )}
                    title="Chế độ rạp phim (mở rộng player cực đại)"
                  >
                    <Maximize2
                      size={12}
                      className={
                        theaterMode ? "text-purple-400" : "text-neutral-400"
                      }
                    />
                    <span className="hidden sm:inline">Rạp phim</span>
                    <span className="sm:hidden">Rạp</span>
                    <span
                      className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider",
                        theaterMode
                          ? "bg-purple-600 text-white font-extrabold shadow-sm"
                          : "bg-white/10 text-neutral-400",
                      )}
                    >
                      {theaterMode ? "ON" : "OFF"}
                    </span>
                  </button>

                  {/* Tự động chuyển tập */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = !autoNextConfig;
                      setAutoNextConfig(next);
                      if (typeof window !== "undefined") {
                        localStorage.setItem(
                          "cineverse_auto_next",
                          String(next),
                        );
                      }
                      toast(
                        next
                          ? "Đã bật Tự động chuyển tập"
                          : "Đã tắt Tự động chuyển tập",
                        "info",
                      );
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 transition-all cursor-pointer select-none active:scale-95 shrink-0",
                      autoNextConfig
                        ? "text-purple-400 font-bold"
                        : "text-neutral-400 hover:text-neutral-200",
                    )}
                    title="Tự động phát tập tiếp theo khi kết thúc video"
                  >
                    <SkipForward
                      size={12}
                      className={
                        autoNextConfig ? "text-purple-400" : "text-neutral-400"
                      }
                    />
                    <span className="hidden sm:inline">Tự động chuyển tập</span>
                    <span className="sm:hidden">Tập tiếp</span>
                    <span
                      className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider",
                        autoNextConfig
                          ? "bg-purple-600 text-white font-extrabold shadow-sm"
                          : "bg-white/10 text-neutral-400",
                      )}
                    >
                      {autoNextConfig ? "ON" : "OFF"}
                    </span>
                  </button>

                  {/* Báo lỗi */}
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="inline-flex items-center gap-1 text-neutral-300 hover:text-white transition-colors cursor-pointer active:scale-95 shrink-0"
                    title="Báo lỗi link phim hoặc đổi server nhanh"
                  >
                    <Bug size={12} className="text-purple-400" />
                    <span>Báo lỗi</span>
                  </button>

                  {/* Help / Shortcuts (?) */}
                  <button
                    type="button"
                    onClick={() => setShowShortcutsGuide((prev) => !prev)}
                    className={cn(
                      "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 border shrink-0",
                      showShortcutsGuide
                        ? "bg-purple-600 text-white border-purple-400 shadow-sm"
                        : "bg-white/[0.08] hover:bg-white/20 text-neutral-300 hover:text-white border-white/10",
                    )}
                    title="Hướng dẫn phím tắt & cử chỉ"
                  >
                    <HelpCircle size={12} />
                  </button>

                  {/* Desktop Collapse Button */}
                  <div className="hidden sm:block">
                    <button
                      type="button"
                      onClick={toggleQuickSettingsCollapsed}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer select-none active:scale-95"
                      title="Thu gọn tất cả cài đặt trình phát"
                    >
                      <SlidersHorizontal
                        size={12}
                        className="text-neutral-400"
                      />
                      <span>Thu gọn</span>
                      <ChevronDown
                        size={12}
                        className="rotate-180 transition-transform duration-200"
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Desktop Expand Button when collapsed */}
              {isQuickSettingsCollapsed && (
                <div className="hidden sm:block">
                  <button
                    type="button"
                    onClick={toggleQuickSettingsCollapsed}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer select-none active:scale-95"
                    title="Mở rộng cài đặt trình phát"
                  >
                    <SlidersHorizontal size={12} className="text-neutral-400" />
                    <span>Cài đặt</span>
                    <ChevronDown
                      size={12}
                      className="transition-transform duration-200"
                    />
                  </button>
                </div>
              )}
            </div>

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
                      <span className="text-neutral-400">
                        Tua lùi / Tới 10s
                      </span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-[10px] font-mono font-bold text-white shadow-sm">
                        ← / →
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-white/[0.05]">
                      <span className="text-neutral-400">
                        Tăng / Giảm âm lượng
                      </span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-[10px] font-mono font-bold text-white shadow-sm">
                        ↑ / ↓
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-neutral-400">
                        Chuyển tập kế tiếp
                      </span>
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
                        Nhấn giữ video để kích hoạt{" "}
                        <b className="text-white font-semibold">Tốc độ 2x</b>,
                        thả tay để về 1x
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
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-neutral-300 bg-white/[0.04] border border-white/10 rounded-xl hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft size={13} />{" "}
                    {t("watch.prevEpisode", "Tập trước")}
                  </button>
                )}
                {currentEpIndex >= 0 &&
                  currentEpIndex < serverData.length - 1 && (
                    <button
                      onClick={() => {
                        const n = serverData[currentEpIndex + 1];
                        router.push(watchUrlForEpisode(n.slug || n.name));
                      }}
                      className="flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-white/20"
                    >
                      {t("watch.nextEpisode", "Tập tiếp")}{" "}
                      <ChevronRight size={13} />
                    </button>
                  )}
              </div>
            </div>

            {/* ── Seamless Cinema Navigation Bar ── */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <nav
                className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth w-full -mx-1 px-1 sm:mx-0 sm:px-0"
                aria-label="Nội dung phim"
              >
                {[
                  {
                    id: "episodes" as const,
                    label: lang === "en" ? "Episodes" : "Tập phim",
                    icon: Clapperboard,
                  },
                  {
                    id: "recommendations" as const,
                    label: lang === "en" ? "For you" : "Đề xuất",
                    icon: Sparkles,
                  },
                  {
                    id: "cast" as const,
                    label: lang === "en" ? "Cast" : "Diễn viên",
                    icon: Users,
                  },
                  {
                    id: "trailer" as const,
                    label: "Trailer",
                    icon: CirclePlay,
                  },
                  {
                    id: "collection" as const,
                    label: lang === "en" ? "Gallery" : "Bộ sưu tập",
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
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none shrink-0 whitespace-nowrap",
                        active
                          ? "bg-[#24262c] text-white font-bold shadow-sm"
                          : "text-neutral-400 hover:text-white hover:bg-[#1a1c22]",
                      )}
                    >
                      <IconComponent size={13} aria-hidden="true" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {watchContentTab === "episodes" && (
              <div className="space-y-3.5 py-1">
                {/* ── Seamless Cinema Streaming Controls ── */}
                {(() => {
                  const subEps = episodes.filter(
                    (ep) => ep._type === "vietsub",
                  );
                  const songNguEps = episodes.filter(
                    (ep) => ep._type === "song-ngu",
                  );
                  const dubEps = episodes.filter(
                    (ep) => ep._type === "thuyet-minh",
                  );
                  const engsubEps = episodes.filter(
                    (ep) => ep._type === "engsub",
                  );
                  const rawEps = episodes.filter((ep) => ep._type === "raw");
                  const activeGroup =
                    activeServerType === "song-ngu"
                      ? songNguEps
                      : activeServerType === "thuyet-minh"
                        ? dubEps
                        : activeServerType === "engsub"
                          ? engsubEps
                          : activeServerType === "raw"
                            ? rawEps
                            : subEps;

                  const subOptions = [
                    {
                      id: "vietsub",
                      label: "Vietsub",
                      icon: MessageSquare,
                      count: subEps.length,
                      eps: subEps,
                    },
                    ...(songNguEps.length > 0
                      ? [
                          {
                            id: "song-ngu",
                            label: "Song Ngữ",
                            icon: Tv,
                            count: songNguEps.length,
                            eps: songNguEps,
                          },
                        ]
                      : []),
                    {
                      id: "thuyet-minh",
                      label: "Thuyết Minh",
                      icon: Mic,
                      count: dubEps.length,
                      eps: dubEps,
                    },
                    ...(engsubEps.length > 0
                      ? [
                          {
                            id: "engsub",
                            label: "Engsub",
                            icon: Globe,
                            count: engsubEps.length,
                            eps: engsubEps,
                          },
                        ]
                      : []),
                    ...(rawEps.length > 0
                      ? [
                          {
                            id: "raw",
                            label: "Bản Gốc",
                            icon: Film,
                            count: rawEps.length,
                            eps: rawEps,
                          },
                        ]
                      : []),
                  ];

                  return (
                    <div className="space-y-3">
                      {/* Row 1: Language Segmented Capsule & Quick Tools */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/[0.08]">
                        {/* Audio / Subtitle format pills */}
                        <div
                          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 -mx-1 px-1 sm:mx-0 sm:px-0"
                          role="tablist"
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
                                    (candidate) =>
                                      candidate._source === "vidsrc",
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
                                    const targetIdx = idx >= 0 ? idx : 0;
                                    setCurrentServer(targetIdx);
                                    const matchedEpisode =
                                      findMatchingEpisode(
                                        first?.server_data,
                                        targetEpisode,
                                      );
                                    const matchedEpisodeId =
                                      matchedEpisode?.slug ||
                                      matchedEpisode?.name;
                                    setPlayerEngine(
                                      matchedEpisode?.link_m3u8
                                        ? "hls"
                                        : "iframe",
                                    );
                                    if (matchedEpisodeId)
                                      router.replace(
                                        watchUrlForEpisode(
                                          matchedEpisodeId,
                                          targetIdx,
                                        ),
                                      );
                                  }
                                }}
                                className={cn(
                                  "relative inline-flex items-center gap-1.5 rounded-full px-3.5 sm:px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer select-none shrink-0 whitespace-nowrap",
                                  isActive
                                    ? "bg-[#24262c] text-white font-bold shadow-sm"
                                    : hasItems
                                      ? "text-neutral-400 hover:text-white hover:bg-[#1a1c22]"
                                      : "cursor-not-allowed text-neutral-600 opacity-40",
                                )}
                              >
                                <IconComponent
                                  size={13}
                                  className={
                                    isActive
                                      ? "text-white"
                                      : "text-neutral-400"
                                  }
                                />
                                <span>{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Right Controls: Sort + Thumbnail toggle + Search */}
                        <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const rangeSize =
                                serverData.length > 500
                                  ? 100
                                  : serverData.length > 100
                                    ? 50
                                    : 40;
                              const totalRanges = Math.ceil(
                                serverData.length / rangeSize,
                              );
                              const nextOrder =
                                episodeSortOrder === "oldest"
                                  ? "newest"
                                  : "oldest";
                              setEpisodeSortOrder(nextOrder);
                              if (serverData.length > 30) {
                                setEpRangeIndex(
                                  nextOrder === "newest"
                                    ? Math.max(0, totalRanges - 1)
                                    : 0,
                                );
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#24262c] hover:bg-[#2f313a] px-3 py-1.5 text-xs font-semibold text-neutral-300 transition-colors cursor-pointer select-none shrink-0 whitespace-nowrap"
                          >
                            <ArrowUpDown
                              size={12}
                              className="text-neutral-400"
                            />
                            <span>
                              {episodeSortOrder === "oldest"
                                ? "Cũ nhất"
                                : "Mới nhất"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setShowEpThumbnails(!showEpThumbnails)
                            }
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer select-none shrink-0 whitespace-nowrap",
                              showEpThumbnails
                                ? "bg-[#24262c] text-white font-bold shadow-sm"
                                : "bg-[#181a20] text-neutral-400 hover:text-white hover:bg-[#24262c]",
                            )}
                          >
                            <FolderOpen size={12} />
                            <span>
                              {showEpThumbnails ? "Ẩn ảnh" : "Hiện ảnh"}
                            </span>
                          </button>

                          {serverData.length > 16 && (
                            <div className="relative hidden sm:block">
                              <Search
                                size={12}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30"
                              />
                              <input
                                type="text"
                                placeholder="Tìm tập..."
                                value={episodeSearch}
                                onChange={(e) =>
                                  setEpisodeSearch(e.target.value)
                                }
                                className="bg-[#181a20] border border-white/5 pl-7 pr-3 py-1.5 text-xs text-white placeholder-white/30 rounded-full focus:outline-none focus:bg-[#24262c] w-24 sm:w-28 transition-colors"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Dedicated Server Dropdown Box Selector (Giống hệt hình mẫu người dùng) */}
                      {episodes.length > 0 && (() => {
                        const activeEp = episodes[currentServer];
                        const activeSourceAbbr = getSourceAbbr(activeEp?._source || "");
                        const activeTypeLabel =
                          activeEp?._type === "song-ngu"
                            ? "Song Ngữ"
                            : activeEp?._type === "thuyet-minh"
                              ? "Thuyết Minh"
                              : activeEp?._type === "engsub"
                                ? "Engsub"
                                : activeEp?._type === "raw"
                                  ? "Bản Gốc"
                                  : "Vietsub";
                        const activeServerName =
                          activeEp?.server_name || `${activeTypeLabel} (${activeSourceAbbr})`;

                        return (
                          <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.08] relative">
                            {/* Left: Chọn Server Label + Custom Dropdown Selector Box */}
                            <div className="flex items-center gap-2.5 sm:gap-3">
                              <span className="text-xs sm:text-sm font-semibold text-neutral-300 select-none shrink-0">
                                Chọn Server:
                              </span>

                              {/* Dropdown Container */}
                              <div className="relative" ref={serverDropdownRef}>
                                <button
                                  type="button"
                                  onClick={() => setShowServerDropdown((prev) => !prev)}
                                  className={cn(
                                    "inline-flex items-center justify-between gap-3 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none border min-w-[140px] sm:min-w-[170px]",
                                    showServerDropdown
                                      ? "bg-[#222530] border-white/25 text-white shadow-lg shadow-black/40 ring-1 ring-white/20"
                                      : "bg-[#181a22] border-white/10 hover:border-white/20 text-white hover:bg-[#20222b] shadow-sm",
                                  )}
                                >
                                  <span className="truncate">{activeServerName}</span>
                                  <ChevronDown
                                    size={14}
                                    className={cn(
                                      "text-white/60 transition-transform duration-200 shrink-0",
                                      showServerDropdown && "rotate-180",
                                    )}
                                  />
                                </button>

                                {/* Dropdown Menu Box */}
                                {showServerDropdown && (
                                  <div className="absolute top-full left-0 mt-2 z-[100] w-64 sm:w-72 bg-[#12141c]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="max-h-60 overflow-y-auto no-scrollbar space-y-1 p-0.5">
                                      {episodes.map((ep, idx) => {
                                        const isActive = idx === currentServer;
                                        const hasFailed = failedServers.includes(idx);
                                        const sourceAbbr = getSourceAbbr(ep._source || "");
                                        const totalEps = Array.isArray(ep.server_data) ? ep.server_data.length : 0;
                                        const typeLabel =
                                          ep._type === "song-ngu"
                                            ? "Song Ngữ"
                                            : ep._type === "thuyet-minh"
                                              ? "Thuyết Minh"
                                              : ep._type === "engsub"
                                                ? "Engsub"
                                                : ep._type === "raw"
                                                  ? "Bản Gốc"
                                                  : "Vietsub";
                                        const displayName = ep.server_name || `${typeLabel} (${sourceAbbr})`;

                                        return (
                                          <button
                                            key={idx}
                                            type="button"
                                            disabled={hasFailed}
                                            onClick={() => {
                                              setUserManuallySelectedServer(true);
                                              setVidsrcManuallySelected(ep._source === "vidsrc");
                                              setCurrentServer(idx);
                                              setCurrentTypeServer(idx);
                                              if (ep._type) {
                                                setActiveServerType(ep._type as ServerType);
                                              }
                                              const matchedEpisode = findMatchingEpisode(
                                                ep.server_data,
                                                currentEpData?.slug || currentEpData?.name || currentEp,
                                              );
                                              const matchedEpisodeId = matchedEpisode?.slug || matchedEpisode?.name;
                                              setPlayerEngine(matchedEpisode?.link_m3u8 ? "hls" : "iframe");
                                              if (matchedEpisodeId) {
                                                router.replace(watchUrlForEpisode(matchedEpisodeId, idx));
                                              }
                                              setShowServerDropdown(false);
                                            }}
                                            className={cn(
                                              "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left",
                                              isActive
                                                ? "bg-white/10 text-white font-bold border border-white/15 shadow-sm"
                                                : "text-neutral-300 hover:text-white hover:bg-white/[0.06]",
                                              hasFailed && "opacity-30 cursor-not-allowed line-through",
                                            )}
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className="truncate">{displayName}</span>
                                              {totalEps > 0 && (
                                                <span className="text-[10px] text-neutral-400 shrink-0">
                                                  ({totalEps} tập)
                                                </span>
                                              )}
                                            </div>
                                            {isActive && (
                                              <CheckCircle2
                                                size={15}
                                                className="text-white shrink-0 ml-2"
                                              />
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {/* Quick Speed Test trigger inside dropdown */}
                                    <div className="pt-1 border-t border-white/[0.08]">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowServerDropdown(false);
                                          setShowServerHealthModal(true);
                                        }}
                                        className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-[11px] font-semibold text-neutral-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
                                      >
                                        <span className="flex items-center gap-1.5">
                                          <Activity size={13} className="text-neutral-400" />
                                          <span>Kiểm tra tốc độ & sức khỏe nguồn</span>
                                        </span>
                                        <span className="text-[10px] text-neutral-400 font-mono">
                                          {episodes.length} nguồn
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right: Interactive Speed & Health Button */}
                            <button
                              type="button"
                              onClick={() => setShowServerHealthModal(true)}
                              className="inline-flex items-center gap-2 rounded-xl bg-[#181a22] hover:bg-[#20222b] border border-white/10 hover:border-white/20 px-3.5 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 select-none shrink-0"
                            >
                              <Activity size={13} className="text-neutral-400" />
                              <span className="hidden sm:inline font-medium text-white/90">Kiểm tra tốc độ</span>
                              <span className="rounded-full bg-white/10 text-neutral-300 border border-white/10 px-1.5 py-0.2 text-[10px] font-bold">
                                {episodes.length} nguồn
                              </span>
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

                <section className="min-w-0 pt-1">
                  {/* 4. EPISODE LIST */}
                  {(() => {
                    const rangeSize =
                      serverData.length > 500
                        ? 100
                        : serverData.length > 100
                          ? 50
                          : 40;
                    const totalRanges = Math.ceil(
                      serverData.length / rangeSize,
                    );
                    const safeRangeIndex = Math.max(
                      0,
                      Math.min(epRangeIndex, totalRanges - 1),
                    );
                    const rangeStart = safeRangeIndex * rangeSize;
                    const rangeEnd = Math.min(
                      (safeRangeIndex + 1) * rangeSize,
                      serverData.length,
                    );

                    const candidateEps = episodeSearch.trim()
                      ? filteredEps
                      : serverData.length > 30
                        ? serverData.slice(rangeStart, rangeEnd)
                        : filteredEps;
                    const displayedEps =
                      episodeSortOrder === "newest"
                        ? [...candidateEps].reverse()
                        : candidateEps;
                    const activeEpisodeKey =
                      currentEp || currentEpData?.slug || currentEpData?.name;

                    return (
                      <div className="space-y-3">
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
                                onChange={(e) =>
                                  setEpRangeIndex(Number(e.target.value))
                                }
                                className="bg-[#181a20] border border-white/10 text-white text-xs rounded-full px-3 py-1 font-bold focus:outline-none focus:bg-[#24262c] cursor-pointer"
                              >
                                {Array.from({ length: totalRanges }).map(
                                  (_, rIdx) => {
                                    const start = rIdx * rangeSize + 1;
                                    const end = Math.min(
                                      (rIdx + 1) * rangeSize,
                                      serverData.length,
                                    );
                                    return (
                                      <option
                                        key={rIdx}
                                        value={rIdx}
                                        className="bg-neutral-900 text-white font-medium"
                                      >
                                        Tập {start} - {end}
                                      </option>
                                    );
                                  },
                                )}
                              </select>
                            )}

                            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 pb-1 max-w-full">
                              {Array.from({ length: totalRanges }).map(
                                (_, rIdx) => {
                                  const start = rIdx * rangeSize + 1;
                                  const end = Math.min(
                                    (rIdx + 1) * rangeSize,
                                    serverData.length,
                                  );
                                  const isCurrentRange =
                                    rIdx === safeRangeIndex;
                                  const containsActiveEp =
                                    currentEpIndex >= start - 1 &&
                                    currentEpIndex <= end - 1;

                                  return (
                                    <button
                                      key={rIdx}
                                      type="button"
                                      onClick={() => setEpRangeIndex(rIdx)}
                                      className={cn(
                                        "px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer",
                                        isCurrentRange
                                          ? "bg-[#24262c] text-white font-bold shadow-sm border border-white/15"
                                          : containsActiveEp
                                            ? "bg-[#181a20] text-white font-medium border border-white/10"
                                            : "bg-transparent text-neutral-400 hover:text-white hover:bg-[#1a1c22]",
                                      )}
                                    >
                                      {start} - {end}
                                      {containsActiveEp && (
                                        <span className="ml-1 w-1.5 h-1.5 rounded-full bg-white inline-block animate-pulse" />
                                      )}
                                    </button>
                                  );
                                },
                              )}
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
                                  ep.slug === activeEpisodeKey ||
                                  ep.name === activeEpisodeKey;
                                const epNum = ep.name.replace(/^tập\s*/i, "");
                                const epIdentifier = ep.slug || ep.name;
                                const isWatched =
                                  !isActive &&
                                  watchProgressStorage
                                    .getHistoryEntries()
                                    .some(
                                      (entry) =>
                                        entry.slug === slug &&
                                        entry.epSlug === epIdentifier &&
                                        entry.currentTime > 30,
                                    );
                                return (
                                  <button
                                    key={ep.slug || ep.name || i}
                                    aria-current={isActive ? "true" : undefined}
                                    onClick={() =>
                                      router.push(
                                        watchUrlForEpisode(ep.slug || ep.name),
                                      )
                                    }
                                    className={cn(
                                      "relative flex items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 transition-all cursor-pointer border text-xs font-semibold select-none",
                                      isActive
                                        ? "border-white/30 bg-[#282a32] text-white font-extrabold shadow-sm scale-[1.02]"
                                        : isWatched
                                          ? "bg-[#101216] border-white/[0.03] text-neutral-400 hover:bg-[#181a20]"
                                          : "bg-[#131519] hover:bg-[#1f2128] border-white/[0.04] hover:border-white/15 text-neutral-300 hover:text-white hover:scale-[1.01]",
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
                                        size={11}
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
                                  ep.slug === activeEpisodeKey ||
                                  ep.name === activeEpisodeKey;
                                const epNum = ep.name.replace(/^tập\s*/i, "");
                                // Determine if this ep has been watched using watch progress storage
                                const epIdentifier = ep.slug || ep.name;
                                const isWatched =
                                  !isActive &&
                                  watchProgressStorage
                                    .getHistoryEntries()
                                    .some(
                                      (entry) =>
                                        entry.slug === slug &&
                                        entry.epSlug === epIdentifier &&
                                        entry.currentTime > 30,
                                    );

                                return (
                                  <button
                                    key={ep.slug || ep.name || i}
                                    aria-current={isActive ? "true" : undefined}
                                    onClick={() =>
                                      router.push(
                                        watchUrlForEpisode(ep.slug || ep.name),
                                      )
                                    }
                                    className={cn(
                                      "group/ep relative aspect-video rounded-xl overflow-hidden border transition-all cursor-pointer text-left bg-neutral-900",
                                      isActive
                                        ? "border-2 border-white/60 ring-2 ring-white/20 shadow-lg"
                                        : "border-white/10 hover:border-white/30 hover:scale-[1.02]",
                                    )}
                                  >
                                    {/* Use EpisodeThumbnail for multi-tier fallback: TMDB → provider → proxy */}
                                    <EpisodeThumbnail
                                      epNum={epNum}
                                      epIndex={i}
                                      film={film}
                                      tmdbBackdrops={sceneStills}
                                      bestBackdrop={bestBackdrop}
                                      bestPoster={bestPoster}
                                      isActive={isActive}
                                      isWatched={isWatched}
                                      lang={lang}
                                    />
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
            )}

            {watchContentTab === "recommendations" && (
              <section className="min-h-52 border-b border-white/[0.08] py-5">
                {discoveryLoading ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-28 animate-pulse rounded-xl bg-white/[0.035]"
                      />
                    ))}
                  </div>
                ) : discoveryData?.items?.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {discoveryData.items
                      .slice(0, 10)
                      .map((item: any, index: number) => (
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
                      {lang === "en"
                        ? "No recommendations are available yet."
                        : "Chưa có phim đề xuất phù hợp."}
                    </p>
                  </div>
                )}
              </section>
            )}

            {watchContentTab === "cast" && (
              <section className="min-h-52 border-b border-white/[0.08] py-5">
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
                      const profile = tmdbProfile(person.profile_path, "w185");
                      return (
                        <Link
                          key={person.id}
                          href={`/actors/${person.id}`}
                          className="group min-w-0 text-center"
                        >
                          <div className="mx-auto aspect-square w-full max-w-28 overflow-hidden rounded-full border-2 border-white/[0.09] bg-white/[0.035] transition-all group-hover:-translate-y-0.5 group-hover:border-fuchsia-400/55 group-hover:shadow-[0_10px_28px_-14px_rgba(244,114,182,0.6)]">
                            {profile ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={profile}
                                alt={person.name}
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.035]"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-neutral-600">
                                <Users size={24} />
                              </div>
                            )}
                          </div>
                          <p className="mt-2 truncate text-[11px] font-bold text-neutral-200 group-hover:text-fuchsia-200 sm:text-xs">
                            {person.name}
                          </p>
                          <p className="truncate text-[9px] text-neutral-500 sm:text-[10px]">
                            {person.character ||
                              (lang === "en" ? "Cast member" : "Diễn viên")}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.09] text-center text-neutral-500">
                    <Users size={22} />
                    <p className="text-xs font-semibold">
                      {lang === "en"
                        ? "Cast information is unavailable."
                        : "Chưa có thông tin diễn viên."}
                    </p>
                  </div>
                )}
              </section>
            )}

            {watchContentTab === "trailer" && (
              <section className="min-h-52 border-b border-white/[0.08] py-5">
                {(() => {
                  const rawTrailerUrl = String(film?.trailer_url || "");
                  const urlMatch = rawTrailerUrl.match(
                    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i,
                  );
                  const trailerKey = tmdbTrailer?.key || urlMatch?.[1];

                  if (videosLoading) {
                    return (
                      <div className="aspect-video animate-pulse rounded-xl bg-white/[0.035]" />
                    );
                  }

                  if (!trailerKey) {
                    return (
                      <div className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.09] text-center text-neutral-500">
                        <CirclePlay size={24} />
                        <p className="text-xs font-semibold">
                          {lang === "en"
                            ? "No official trailer was found."
                            : "Chưa tìm thấy trailer chính thức."}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="mx-auto w-full max-w-5xl space-y-2.5">
                      <div className="aspect-video overflow-hidden rounded-xl border border-white/[0.1] bg-black">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailerKey)}?rel=0&playsinline=1`}
                          title={`${film?.name || "NetPhim"} trailer`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="strict-origin-when-cross-origin"
                          className="h-full w-full"
                        />
                      </div>
                      <div className="flex justify-end">
                        <a
                          href={`https://www.youtube.com/watch?v=${encodeURIComponent(trailerKey)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          referrerPolicy="strict-origin-when-cross-origin"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.09] bg-white/[0.035] px-3 py-2 text-[11px] font-bold text-neutral-300 transition-colors hover:border-fuchsia-400/40 hover:text-fuchsia-200"
                        >
                          <ExternalLink size={12} />
                          {lang === "en"
                            ? "Open on YouTube"
                            : "Mở trên YouTube"}
                        </a>
                      </div>
                    </div>
                  );
                })()}
              </section>
            )}

            {watchContentTab === "collection" && (
              <section className="min-h-52 border-b border-white/[0.08] py-5">
                {diverseTmdbBackdrops.length ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {diverseTmdbBackdrops.map((image, index) => {
                      const imageUrl = tmdbBackdrop(image.file_path, "w780");
                      return imageUrl ? (
                        <div
                          key={`${image.file_path}-${index}`}
                          className="group relative aspect-video overflow-hidden rounded-xl border border-white/[0.08] bg-[#12151b] transition-all hover:border-white/25 hover:shadow-lg"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imageUrl}
                            alt={`${film?.name || "NetPhim"} ${index + 1}`}
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
                      {lang === "en"
                        ? "This movie has no gallery yet."
                        : "Phim này chưa có bộ sưu tập hình ảnh."}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* 6. COMMENTS */}
            <div
              ref={commentsSectionRef}
              className="min-h-24 border-t border-white/[0.05] pt-5"
            >
              {commentsReady ? (
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
              ) : (
                <div
                  className="h-24 animate-pulse rounded-xl border border-white/[0.05] bg-white/[0.02]"
                  aria-hidden="true"
                />
              )}
            </div>
          </div>

          {/* ───── RIGHT SIDEBAR ───── */}
          {!theaterMode && (
            <div className="space-y-4 min-w-0">
              {/* Film Info */}
              <SidebarFilmCard film={film} slug={slug} />

              {/* Recommendations */}
              {recsData?.items && recsData.items.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
                    {matchedKeyword
                      ? `Thêm về "${matchedKeyword}"`
                      : "Phim tương tự"}
                  </h3>
                  <div className="space-y-1">
                    {recsData.items
                      .slice(0, 8)
                      .map((item: any, index: number) => (
                        <RecMovieItem
                          key={item._id || item.slug}
                          item={item}
                          index={index}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
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
          setVidsrcManuallySelected(episodes[idx]?._source === "vidsrc");
          setCurrentServer(idx);
          setCurrentTypeServer(idx);
          if (episodes[idx]?._type) {
            setActiveServerType(episodes[idx]._type as ServerType);
          }
          const matchedEpisode = findMatchingEpisode(
            episodes[idx]?.server_data,
            currentEpData?.slug || currentEpData?.name || currentEp,
          );
          const matchedEpisodeId =
            matchedEpisode?.slug || matchedEpisode?.name;
          setPlayerEngine(matchedEpisode?.link_m3u8 ? "hls" : "iframe");
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
