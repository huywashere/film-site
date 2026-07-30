"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";
import { movieApi, watchHistoryApi } from "@/lib/api";
import { resolveImageUrl } from "@/components/film/FilmCard";
import { watchProgressStorage } from "@/lib/watch-progress";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/ToastProvider";
import { useAuthStore } from "@/store/authStore";
import { useTranslation } from "@/store/langStore";
import { useWatchParty } from "@/hooks/useWatchParty";
import { useTmdb } from "@/hooks/useTmdb";
import { tmdbBackdrop, tmdbApi } from "@/lib/tmdb";
import { WatchPartyPanel } from "@/components/watch/WatchPartyPanel";
import { AdvancedCommentSection } from "@/components/comments/AdvancedCommentSection";

const ArtPlayer = dynamic(() => import("@/components/video/ArtPlayer"), {
  ssr: false,
});

// ── Server type detection ──────────────────────────────────────
type ServerType = "vietsub" | "thuyet-minh" | "raw";

function detectServerType(serverName: string, lang?: string): ServerType {
  const name = (serverName || "").toLowerCase();

  // 1. Prioritize explicit server_name FIRST so Vietsub servers are never incorrectly classified as Thuyết Minh
  if (
    name.includes("vietsub") ||
    name.includes("viet sub") ||
    name.includes("sub")
  ) {
    return "vietsub";
  }

  if (
    name.includes("thuyet minh") ||
    name.includes("thuyết minh") ||
    name.includes("long tieng") ||
    name.includes("lồng tiếng") ||
    name.includes("thuyếtminh") ||
    name.includes("lồngtiếng") ||
    name.includes("tm")
  ) {
    return "thuyet-minh";
  }

  // 2. Fallback to film's default lang only when server_name is neutral (e.g. "KKPhim #1")
  const l = (lang || "").toLowerCase();
  if (
    l.includes("thuyet minh") ||
    l.includes("thuyết minh") ||
    l.includes("long tieng") ||
    l.includes("lồng tiếng")
  ) {
    return "thuyet-minh";
  }

  return "vietsub";
}

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

// ── Skeleton ──────────────────────────────────────────────────
function WatchSkeleton() {
  return (
    <div className="min-h-screen bg-[#0d1117] pt-16">
      <div className="bg-black aspect-video animate-pulse" />
      <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-5 bg-white/5 rounded w-48 animate-pulse" />
        <div className="h-4 bg-white/5 rounded w-32 animate-pulse" />
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();

  const slug = params.slug as string;
  const currentEp = searchParams.get("ep") || "";
  const wp = useWatchParty(slug, currentEp);

  // State
  const [currentServer, setCurrentServer] = useState(0);
  const [failedServers, setFailedServers] = useState<number[]>([]);
  const [episodeSearch, setEpisodeSearch] = useState("");
  const [autoNextConfig, setAutoNextConfig] = useState(true);
  const [autoPlayConfig, setAutoPlayConfig] = useState(true);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(
    null,
  );
  const [useEmbedPlayer, setUseEmbedPlayer] = useState(true);
  const [activeServerType, setActiveServerType] =
    useState<ServerType>("vietsub");
  const [currentTypeServer, setCurrentTypeServer] = useState(0);

  // Fallback state
  const [isFallbacking, setIsFallbacking] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [loadTimeout, setLoadTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const fallbackAttemptRef = useRef(0);
  const autoNextTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncRef = useRef(0);

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
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showEpThumbnails, setShowEpThumbnails] = useState(false);
  const [artInstance, setArtInstance] = useState<any>(null);
  const hasSkippedIntroRef = useRef(false);
  const [epRangeIndex, setEpRangeIndex] = useState(0);
  const epGridRef = useRef<HTMLDivElement>(null);

  const [autoSkipIntro, setAutoSkipIntro] = useState<boolean>(() => {
    try {
      return localStorage.getItem("auto-skip-intro") === "true";
    } catch {
      return false;
    }
  });

  const toggleAutoSkipIntro = (val: boolean) => {
    setAutoSkipIntro(val);
    try {
      localStorage.setItem("auto-skip-intro", String(val));
    } catch {}
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

  const progressSyncMutation = useMutation({
    mutationFn: (data: any) => watchHistoryApi.upsert(data),
  });

  // Data
  const { data, isLoading } = useQuery({
    queryKey: ["film", slug],
    queryFn: () => movieApi.getDetail(slug).then((r) => r.data),
  });
  const { data: ophimData } = useQuery({
    queryKey: ["film-ophim", slug],
    queryFn: () =>
      fetch(`/api/ophim/phim/${slug}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    enabled: !!slug,
  });
  const { data: nguoncData } = useQuery({
    queryKey: ["film-nguonc", slug],
    queryFn: () =>
      fetch(`/api/nguonc/film/${slug}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    enabled: !!slug,
  });
  const { data: vsmovData } = useQuery({
    queryKey: ["film-vsmov", slug],
    queryFn: () =>
      fetch(`/api/vsmov/phim/${slug}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    enabled: !!slug,
  });

  // Recommendations
  const film = data?.movie || data;
  const filmLang: string = film?.lang || "";
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
          const r = await movieApi.search(matchedKeyword, 1, 15);
          items.push(...(r?.data?.items || r?.data?.data?.items || []));
        } catch {}
      }
      if (filmCategory) {
        try {
          const r = await movieApi.getByGenre(filmCategory, 1);
          items.push(...(r?.data?.data?.items || r?.data?.items || []));
        } catch {}
      }
      try {
        const r = await movieApi.getLatest(1);
        items.push(...(r?.data?.items || r?.data?.data?.items || []));
      } catch {}
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
    enabled: !!slug,
  });

  const { data: resumeData } = useQuery({
    queryKey: ["watch-history-resume", slug],
    queryFn: () => watchHistoryApi.getResume(slug).then((r) => r.data),
    enabled: !!user && !!slug,
  });

  // Fetch TMDB Scene Stills / Backdrops for Episode Scene Thumbnails
  const tmdbShowId = film?.tmdb?.id || film?.tmdb_id;
  const tmdbMediaType =
    film?.type === "series" || film?.type === "hoat-hinh" ? "tv" : "movie";

  const { data: tmdbImages } = useQuery({
    queryKey: ["watch-tmdb-scenes", tmdbMediaType, tmdbShowId],
    queryFn: () => tmdbApi.getImages(tmdbMediaType, String(tmdbShowId)),
    enabled: !!tmdbShowId,
    staleTime: 1000 * 60 * 60,
  });

  const sceneStills: any[] = useMemo(() => {
    return tmdbImages?.backdrops || [];
  }, [tmdbImages]);

  // Episode processing — gom từ tất cả nguồn, gán nhãn rõ ràng
  const kkphimEps: any[] = data?.episodes || [];
  const ophimEps: any[] = ophimData?.episodes || [];
  const nguoncEps: any[] = nguoncData?.episodes || [];
  const vsmovEps: any[] = vsmovData?.episodes || [];

  // Mỗi nguồn được tag với tên nguồn + index server trong nguồn đó
  const tagSource = (arr: any[], sourceName: string, sourceKey: string) =>
    arr.map((s, i) => ({
      ...s,
      server_name:
        s.server_name && s.server_name !== "Vietsub"
          ? `[${sourceName}] ${s.server_name}`
          : arr.length > 1
            ? `${sourceName} #${i + 1}`
            : sourceName,
      _source: sourceKey,
      _type: detectServerType(s.server_name || sourceName, filmLang),
    }));

  const episodes = [
    ...tagSource(kkphimEps, "KKPhim", "kkphim"),
    ...tagSource(ophimEps, "OPhim", "ophim"),
    ...tagSource(nguoncEps, "NguonC", "nguonc"),
    ...tagSource(vsmovEps, "VSMov", "vsmov"),
  ];

  const serversByType = useMemo(() => {
    const g: Record<ServerType, any[]> = {
      vietsub: [],
      "thuyet-minh": [],
      raw: [],
    };
    episodes.forEach((ep) => g[ep._type as ServerType].push(ep));
    return g;
  }, [episodes]);

  const availableTypes = useMemo(
    () =>
      (["vietsub", "thuyet-minh", "raw"] as ServerType[]).filter(
        (t) => serversByType[t].length > 0,
      ),
    [serversByType],
  );

  useEffect(() => {
    if (availableTypes.length > 0 && !availableTypes.includes(activeServerType))
      setActiveServerType(availableTypes[0]);
  }, [availableTypes]);

  const currentTypeServers = serversByType[activeServerType] || [];
  const server = episodes[currentServer] || episodes[0];
  const serverData: any[] = useMemo(() => server?.server_data || [], [server]);
  const currentEpData: any =
    serverData.find((e: any) => (e.slug || e.name) === currentEp) ||
    serverData[0];

  const m3u8Url: string = currentEpData?.link_m3u8 || "";
  const embedUrl: string = currentEpData?.link_embed || "";

  // Proxy m3u8 qua server để filter quảng cáo + fix CORS
  const proxiedM3u8 = m3u8Url
    ? `/api/hls-proxy?url=${encodeURIComponent(m3u8Url)}`
    : "";

  const videoUrl = proxiedM3u8 || embedUrl;

  const currentEpIndex = serverData.findIndex(
    (e: any) =>
      (e.slug || e.name) ===
      (currentEp || currentEpData?.slug || currentEpData?.name),
  );

  const posterUrl =
    resolveImageUrl(film?.thumb_url) ||
    resolveImageUrl(film?.poster_url) ||
    undefined;

  // TMDB backdrop cho hero phia tren player
  const { bestBackdrop } = useTmdb({
    film,
    enabled: !!film,
    fetchCredits: false,
    fetchVideos: false,
  });
  const tmdbBackdropUrl = bestBackdrop
    ? tmdbBackdrop(bestBackdrop.file_path, "w1280")
    : null;
  const epName: string = currentEpData?.slug || currentEpData?.name || "";
  const progressKey = slug && epName ? `${slug}_${epName}` : undefined;
  const currentResumeEntry = resumeData?.find(
    (item: any) => item.episode === epName,
  );
  const dbProgress = currentResumeEntry?.progress || 0;

  // Navigation
  const goNextEpisode = useCallback(() => {
    setAutoNextCountdown(null);
    if (currentEpIndex >= 0 && currentEpIndex < serverData.length - 1) {
      const next = serverData[currentEpIndex + 1];
      router.push(`/watch/${slug}?ep=${next.slug || next.name}`);
    }
  }, [currentEpIndex, serverData, slug, router]);

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

  // Progress
  const handleProgress = useCallback(
    (currentTime: number, duration: number) => {
      if (!slug || !epName || duration < 10) return;

      // Auto-skip Intro (+85s) when autoSkipIntro setting is ON
      if (
        autoSkipIntro &&
        !hasSkippedIntroRef.current &&
        currentTime >= 2 &&
        currentTime <= 15
      ) {
        hasSkippedIntroRef.current = true;
        if (artInstance) {
          artInstance.seek = currentTime + 85;
          toast("Đã tự động bỏ qua Intro (+85s)", "info");
        }
      }

      watchProgressStorage.saveProgress({
        slug,
        epSlug: currentEpData?.slug || "01",
        epName,
        title: film?.name || slug,
        poster: posterUrl || "",
        currentTime,
        duration,
      });
      if (!user) return;
      const now = Date.now();
      if (now - lastSyncRef.current < 15000) return;
      lastSyncRef.current = now;
      progressSyncMutation.mutate({
        movieId: slug,
        episode: epName,
        progress: currentTime,
        duration,
        movieTitle: film?.name || slug,
        movieThumb: posterUrl,
      });
    },
    [
      user,
      slug,
      epName,
      film?.name,
      posterUrl,
      currentEpData,
      progressSyncMutation,
      autoSkipIntro,
      artInstance,
      toast,
    ],
  );

  // ── Smart Fallback Engine ─────────────────────────────────────
  const tryNextServer = useCallback(
    (reason: string) => {
      const currentIdx = currentServer;
      const upd = [...failedServers, currentIdx];
      setFailedServers(upd);
      setIsFallbacking(true);

      // Tìm server tiếp theo chưa fail trong cùng type
      const sameTypeServers = episodes.filter(
        (ep) => ep._type === activeServerType,
      );
      const nextSameType = sameTypeServers.find(
        (ep) => !upd.includes(episodes.indexOf(ep)),
      );

      // Nếu không còn server cùng type → thử type khác
      const nextAnyType = !nextSameType
        ? episodes.find((ep) => !upd.includes(episodes.indexOf(ep)))
        : null;

      const nextEp = nextSameType || nextAnyType;

      if (!nextEp) {
        setIsFallbacking(false);
        setFallbackMessage("");
        toast("Tất cả server không khả dụng!", "error");
        return;
      }

      const nextIdx = episodes.indexOf(nextEp);
      const isSwitchingType = nextEp._type !== activeServerType;

      setFallbackMessage(
        isSwitchingType
          ? `Chuyển sang ${nextEp._type === "thuyet-minh" ? "Thuyết minh" : "Phụ đề"}...`
          : `Thử server ${nextEp.server_name}...`,
      );

      // Delay nhỏ để UX mượt, không flash
      setTimeout(() => {
        if (isSwitchingType) setActiveServerType(nextEp._type as ServerType);
        setCurrentServer(nextIdx);
        setCurrentTypeServer(nextIdx);
        setUseEmbedPlayer(false);
        setIsFallbacking(false);
        setFallbackMessage("");
        fallbackAttemptRef.current += 1;

        // Cập nhật URL episode nếu server mới có tập khác
        const nd = nextEp?.server_data || [];
        const sameEp = nd.find((e: any) => (e.slug || e.name) === currentEp);
        const targetEp = sameEp || nd[0];
        if (targetEp) {
          router.replace(
            `/watch/${slug}?ep=${targetEp.slug || targetEp.name}`,
            { scroll: false },
          );
        }
      }, 600);
    },
    [
      currentServer,
      failedServers,
      episodes,
      activeServerType,
      currentEp,
      slug,
      router,
      toast,
    ],
  );

  // Timeout 25s nếu video bị treo không load được hẳn
  const startLoadTimeout = useCallback(() => {
    if (loadTimeout) clearTimeout(loadTimeout);
    const t = setTimeout(() => {
      // Chỉ auto-fallback nếu player thực sự chưa sẵn sàng
      tryNextServer("timeout");
    }, 25000);
    setLoadTimeout(t);
  }, [loadTimeout, tryNextServer]);

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeout) {
      clearTimeout(loadTimeout);
      setLoadTimeout(null);
    }
  }, [loadTimeout]);

  const handlePlayerError = useCallback(
    (err: any) => {
      clearLoadTimeout();
      // Thử embed trước nếu đang dùng m3u8
      if (embedUrl && !useEmbedPlayer) {
        setUseEmbedPlayer(true);
        return;
      }
      tryNextServer("error");
    },
    [clearLoadTimeout, embedUrl, useEmbedPlayer, tryNextServer],
  );

  const handlePlayerReady = useCallback(
    (art: any) => {
      clearLoadTimeout();
      setIsFallbacking(false);
      setFallbackMessage("");
      if (art) {
        setArtInstance(art);
        try {
          art.on("play", () => clearLoadTimeout());
          art.on("pause", () => clearLoadTimeout());
          art.on("video:canplay", () => clearLoadTimeout());
          art.on("video:loadedmetadata", () => clearLoadTimeout());
        } catch (_err) {
          // Ignore Artplayer listener errors
        }
      }
    },
    [clearLoadTimeout],
  );

  useEffect(() => {
    const sp = searchParams.get("server");
    if (sp !== null) {
      const idx = Number(sp) || 0;
      setCurrentServer(idx);
      const ep = episodes[idx];
      if (ep?._type) setActiveServerType(ep._type as ServerType);
    }
  }, [searchParams]);

  useEffect(() => {
    setUseEmbedPlayer(false);
    setFailedServers([]);
    setIsFallbacking(false);
    setFallbackMessage("");
    fallbackAttemptRef.current = 0;
    clearLoadTimeout();
  }, [currentEp, currentServer]);

  // Bắt đầu timeout khi URL video thay đổi
  useEffect(() => {
    if (!proxiedM3u8 && !embedUrl) return;
    if (isFallbacking) return;
    startLoadTimeout();
    return () => clearLoadTimeout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proxiedM3u8, embedUrl, currentServer]);

  useEffect(() => {
    setCurrentTypeServer(0);
    const first = serversByType[activeServerType]?.[0];
    if (first) {
      const gIdx = episodes.indexOf(first);
      setCurrentServer(gIdx >= 0 ? gIdx : 0);
    }
  }, [activeServerType]);

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

  const watchJsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: film?.name,
    alternateName: film?.origin_name,
    description: watchSeoDescription,
    image: posterUrl || tmdbBackdropUrl,
    dateCreated: film?.year ? String(film.year) : undefined,
    potentialAction: {
      "@type": "WatchAction",
      target: `https://cineverse-movie.vercel.app/watch/${slug}`,
    },
  };

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* ── JSON-LD STRUCTURED DATA SCHEMA FOR GOOGLE SEO ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(watchJsonLd) }}
      />

      {/* ── DYNAMIC HEAD META TAGS ── */}
      <head>
        <title>{watchSeoTitle}</title>
        <meta name="description" content={watchSeoDescription} />
        <meta property="og:title" content={watchSeoTitle} />
        <meta property="og:description" content={watchSeoDescription} />
        <meta property="og:image" content={posterUrl || tmdbBackdropUrl} />
        <meta property="og:type" content="video.other" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={watchSeoTitle} />
        <meta name="twitter:image" content={posterUrl || tmdbBackdropUrl} />
      </head>
      {/* ── CINEMA LIGHTS-OFF OVERLAY ── */}
      {lightOff && (
        <div
          onClick={() => setLightOff(false)}
          className="fixed inset-0 bg-black/95 z-40 transition-opacity duration-300 cursor-pointer flex items-start justify-center pt-8 pointer-events-auto"
        >
          <div className="bg-white/10 text-white text-xs font-bold px-4 py-2 rounded-full border border-white/20 backdrop-blur-md animate-bounce shadow-2xl">
            💡 Đang bật chế độ Tắt Đèn Xem Phim (Nhấn bất kỳ đâu để tắt)
          </div>
        </div>
      )}

      {/* ── MAIN — padded top for navbar (64px) + safe left padding for sidebar (96px) ── */}
      <main className="pt-20 lg:pt-22 max-w-screen-2xl mx-auto px-3 md:px-5 lg:pl-24 pb-10">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
          {/* ───── LEFT COLUMN ───── */}
          <div className="space-y-4 min-w-0">
            {/* 1. PLAYER */}
            <div
              ref={playerContainerRef}
              onPointerDown={handleOuterPointerDown}
              onPointerUp={handleOuterPointerUp}
              onPointerLeave={handleOuterPointerUp}
              className={cn(
                "bg-black aspect-video rounded-xl overflow-hidden relative shadow-2xl ring-1 ring-white/[0.06] select-none transition-all duration-300",
                lightOff
                  ? "z-50 ring-2 ring-netflixRed/50 shadow-[0_0_50px_rgba(229,9,20,0.4)]"
                  : "",
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
                    className="absolute bottom-16 right-5 z-40 bg-black/85 hover:bg-netflixRed text-white text-xs font-bold px-3.5 py-2 rounded-lg border border-white/20 backdrop-blur-md shadow-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 animate-pulse"
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
                  {!useEmbedPlayer && proxiedM3u8 ? (
                    <ArtPlayer
                      url={proxiedM3u8}
                      type="hls"
                      poster={posterUrl}
                      title={`${film?.name} - Tập ${currentEpData?.name}`}
                      autoplay={false}
                      progressKey={progressKey}
                      dbProgress={dbProgress}
                      onReady={handlePlayerReady}
                      onEnded={handleVideoEnded}
                      onProgress={(ct, dur) => {
                        // Clear timeout ngay khi video bắt đầu phát được
                        if (ct > 0) clearLoadTimeout();
                        handleProgress(ct, dur);
                      }}
                      onError={handlePlayerError}
                    />
                  ) : embedUrl ? (
                    <div className="relative w-full h-full">
                      <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        allowFullScreen
                        allow="autoplay; fullscreen"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
                        title={`${film?.name} - ${currentEpData?.name}`}
                        onLoad={() => clearLoadTimeout()}
                        onError={() => tryNextServer("iframe-error")}
                      />
                      {episodes.length > 1 && (
                        <button
                          onClick={() => tryNextServer("user-retry")}
                          className="absolute top-3 right-3 z-30 bg-black/80 hover:bg-emerald-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg border border-white/20 shadow-lg backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5"
                          title="Bấm nếu server hiện tại bị lỗi 504 hoặc chậm"
                        >
                          <span>🔄 Đổi Server Phim</span>
                        </button>
                      )}
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

            {/* ── BREADCRUMB & QUICK CONTROLS BAR — Below Video ── */}
            <div className="flex items-center justify-between gap-2 py-1.5 px-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-white/50">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/10 hover:text-white transition-colors font-medium shrink-0 text-white/80"
                >
                  <ArrowLeft size={13} /> Quay lại
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
                    "flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors font-medium text-xs cursor-pointer",
                    lightOff
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white",
                  )}
                  title="Tắt đèn làm mờ xung quanh"
                >
                  <span>💡</span>
                  <span className="hidden sm:inline">
                    {lightOff ? "Bật Đèn" : "Tắt Đèn"}
                  </span>
                </button>

                <button
                  onClick={() => {
                    if (!wp.roomId) wp.createRoom();
                    else wp.setIsOpen(!wp.isOpen);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] hover:text-white/80 transition-colors text-white/50"
                >
                  <Sparkles size={12} />
                  <span className="hidden sm:inline">
                    {wp.roomId ? `Phòng ${wp.roomId}` : "Party"}
                  </span>
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast("Đã sao chép!", "success");
                  }}
                  className="flex items-center gap-1 p-1 rounded-lg hover:bg-white/[0.08] hover:text-white/80 transition-colors text-white/50"
                >
                  <Share2 size={13} />
                </button>
              </div>
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
                      router.push(`/watch/${slug}?ep=${p.slug || p.name}`);
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
                        router.push(`/watch/${slug}?ep=${n.slug || n.name}`);
                      }}
                      className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                    >
                      Tập tiếp <ChevronRight size={13} />
                    </button>
                  )}
              </div>
            </div>

            {/* 3. SERVER TABS — Always show BOTH Phụ đề & Thuyết minh tabs */}
            {(() => {
              const subEps = episodes.filter((ep) => ep._type === "vietsub");
              const dubEps = episodes.filter(
                (ep) => ep._type === "thuyet-minh",
              );
              const activeGroup =
                activeServerType === "thuyet-minh" ? dubEps : subEps;

              return (
                <div className="space-y-3">
                  {/* ── Tab chọn dạng: Phụ đề / Thuyết minh ── */}
                  <div className="flex items-center gap-2">
                    {/* Tab Phụ đề (Vietsub) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveServerType("vietsub");
                        if (subEps.length > 0) {
                          const first = subEps[0];
                          const idx = episodes.indexOf(first);
                          setCurrentServer(idx >= 0 ? idx : 0);
                          setUseEmbedPlayer(false);
                          const nd = first?.server_data || [];
                          if (nd.length > 0)
                            router.push(
                              `/watch/${slug}?ep=${nd[0].slug || nd[0].name}`,
                            );
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none",
                        activeServerType === "vietsub"
                          ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-500/10"
                          : "bg-white/[0.04] border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20",
                        subEps.length === 0 && "opacity-60",
                      )}
                    >
                      <Subtitles size={13} />
                      Phụ đề
                      <span
                        className={cn(
                          "text-[9px] font-bold rounded-full px-1.5 py-0.5",
                          subEps.length > 0
                            ? "bg-white/10 text-white"
                            : "bg-white/5 text-white/40",
                        )}
                      >
                        {subEps.length}
                      </span>
                    </button>

                    {/* Tab Thuyết minh (Dubbed / Lồng tiếng) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveServerType("thuyet-minh");
                        if (dubEps.length > 0) {
                          const first = dubEps[0];
                          const idx = episodes.indexOf(first);
                          setCurrentServer(idx >= 0 ? idx : 0);
                          setUseEmbedPlayer(false);
                          const nd = first?.server_data || [];
                          if (nd.length > 0)
                            router.push(
                              `/watch/${slug}?ep=${nd[0].slug || nd[0].name}`,
                            );
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none",
                        activeServerType === "thuyet-minh"
                          ? "bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10"
                          : "bg-white/[0.04] border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20",
                        dubEps.length === 0 && "opacity-60",
                      )}
                    >
                      <Mic size={13} />
                      Thuyết minh / Lồng tiếng
                      <span
                        className={cn(
                          "text-[9px] font-bold rounded-full px-1.5 py-0.5",
                          dubEps.length > 0
                            ? "bg-white/10 text-white"
                            : "bg-white/5 text-white/40",
                        )}
                      >
                        {dubEps.length}
                      </span>
                    </button>
                  </div>

                  {/* ── Server trong nhóm đang chọn ── */}
                  {activeGroup.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {activeGroup.map((ep) => {
                        const i = episodes.indexOf(ep);
                        const isActive = i === currentServer && useEmbedPlayer;
                        const hasFailed = failedServers.includes(i);
                        const sourceColors: Record<string, string> = {
                          kkphim: isActive
                            ? "bg-blue-500/15 border-blue-500/50 text-blue-300"
                            : "bg-white/[0.03] border-white/[0.07] text-white/45 hover:border-blue-500/30 hover:text-blue-300/70",
                          ophim: isActive
                            ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                            : "bg-white/[0.03] border-white/[0.07] text-white/45 hover:border-emerald-500/30 hover:text-emerald-300/70",
                          nguonc: isActive
                            ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                            : "bg-white/[0.03] border-white/[0.07] text-white/45 hover:border-amber-500/30 hover:text-amber-300/70",
                          vsmov: isActive
                            ? "bg-purple-500/15 border-purple-500/50 text-purple-300"
                            : "bg-white/[0.03] border-white/[0.07] text-white/45 hover:border-purple-500/30 hover:text-purple-300/70",
                        };
                        const colorClass =
                          sourceColors[ep._source] || sourceColors.kkphim;

                        return (
                          <button
                            key={i}
                            onClick={() => {
                              setCurrentServer(i);
                              setCurrentTypeServer(i);
                              setUseEmbedPlayer(true);
                              const nd = ep?.server_data || [];
                              if (nd.length > 0)
                                router.push(
                                  `/watch/${slug}?ep=${nd[0].slug || nd[0].name}`,
                                );
                            }}
                            disabled={hasFailed}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer",
                              hasFailed
                                ? "opacity-30 cursor-not-allowed line-through bg-white/[0.02] border-white/[0.05] text-white/30"
                                : colorClass,
                            )}
                          >
                            <Server size={11} />
                            {ep.server_name}
                            {/* Đang fallback sang server này */}
                            {isActive && isFallbacking && (
                              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                            )}
                            {/* Đang active và load bình thường */}
                            {isActive && !isFallbacking && (
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                            )}
                            {ep.server_data?.length > 0 && (
                              <span className="text-[9px] bg-white/10 rounded-full px-1.5 py-0.5">
                                {ep.server_data.length} tập
                              </span>
                            )}
                            {hasFailed && (
                              <AlertTriangle
                                size={9}
                                className="text-red-400"
                              />
                            )}
                          </button>
                        );
                      })}

                      {/* ✨ Server VIP ArtPlayer Button (Chặn QC, HLS Native Controls) */}
                      {m3u8Url && (
                        <button
                          type="button"
                          onClick={() => {
                            setUseEmbedPlayer(false);
                          }}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer select-none",
                            !useEmbedPlayer
                              ? "bg-gradient-to-r from-red-600/30 to-amber-600/30 border-amber-500/60 text-amber-200 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30"
                              : "bg-white/[0.03] border-white/[0.08] text-amber-400/70 hover:text-amber-300 hover:border-amber-500/30",
                          )}
                          title="Phát qua trình phát ArtPlayer hỗ trợ lọc quảng cáo & chỉnh tốc độ"
                        >
                          <Sparkles size={12} className="text-amber-400" />
                          <span>Server VIP (ArtPlayer - Chặn QC)</span>
                          {!useEmbedPlayer && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 opacity-90 animate-pulse" />
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl text-xs text-white/50 flex items-center gap-2">
                      <Info size={14} className="text-amber-400 shrink-0" />
                      <span>
                        {activeServerType === "thuyet-minh"
                          ? "Phim này hiện chưa có bản Thuyết minh / Lồng tiếng. Bạn có thể chuyển qua bản Phụ đề ở trên."
                          : "Phim này hiện chưa có bản Phụ đề. Bạn có thể chuyển qua bản Thuyết minh ở trên."}
                      </span>
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
                            {start} – {end}
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
                      /* ── MODE 1: Pill Grid Mode (Matching Reference Image 1) ── */
                      <div
                        ref={epGridRef}
                        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 gap-2 max-h-64 overflow-y-auto scrollbar-hide"
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
                                  `/watch/${slug}?ep=${ep.slug || ep.name}`,
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
                      /* ── MODE 2: Landscape Still Grid Mode (Matching Reference Image 2) ── */
                      <div
                        ref={epGridRef}
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-96 overflow-y-auto scrollbar-hide"
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
                                  `/watch/${slug}?ep=${ep.slug || ep.name}`,
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
                                <img
                                  src={stillImage}
                                  alt={`Tập ${epNum}`}
                                  className="w-full h-full object-cover brightness-75 group-hover/ep:brightness-100 transition-all duration-300"
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

            {/* 5. KEYBOARD SHORTCUTS */}
            <details className="group bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-xs font-semibold text-white/40 hover:text-white/70 transition-colors select-none list-none">
                <span className="flex items-center gap-2">
                  <kbd className="bg-white/8 border border-white/10 px-1.5 py-0.5 rounded text-[9px] font-mono">
                    ⌨
                  </kbd>
                  Phím tắt
                </span>
                <span className="text-[10px] group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <div className="px-4 pb-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
                {[
                  ["Space / K", "Phát / Tạm dừng"],
                  ["← / J", "Tua lùi 10 giây"],
                  ["→ / L", "Tua tới 10 giây"],
                  ["↑ / ↓", "Âm lượng +/- 10%"],
                  ["M", "Tắt / Bật tiếng"],
                  ["F", "Toàn màn hình"],
                  ["P", "Picture-in-Picture"],
                  ["D", "Tắt / Bật đèn"],
                  [", / .", "Giảm / Tăng tốc độ"],
                  ["0 – 9", "Nhảy đến 0%–90%"],
                ].map(([key, desc]) => (
                  <div key={key} className="flex items-center gap-2 py-0.5">
                    <kbd className="bg-white/8 border border-white/10 px-1.5 py-0.5 rounded text-[9px] font-mono text-white/60 shrink-0 min-w-[52px] text-center">
                      {key}
                    </kbd>
                    <span className="text-white/40">{desc}</span>
                  </div>
                ))}
              </div>
            </details>

            {/* 6. COMMENTS */}
            <div className="border-t border-white/[0.05] pt-5">
              <AdvancedCommentSection
                movieSlug={slug}
                episodeName={
                  currentEpData?.name
                    ? `Tập ${currentEpData.name.replace(/^tập\s*/i, "")}`
                    : undefined
                }
              />
            </div>
          </div>

          {/* ───── RIGHT SIDEBAR ───── */}
          <div className="space-y-4 min-w-0">
            {/* Film Info */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 space-y-3">
              <div className="flex gap-3">
                {posterUrl && (
                  <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-white/[0.08]">
                    <img
                      src={posterUrl}
                      alt={film?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
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

            {/* Settings */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 space-y-2.5">
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <Settings size={10} /> Cài đặt
              </p>
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
                  {recsData.items.slice(0, 8).map((item: any) => {
                    const thumb =
                      resolveImageUrl(item.thumb_url) ||
                      resolveImageUrl(item.poster_url);
                    return (
                      <Link
                        href={`/film/${item.slug}`}
                        key={item._id || item.slug}
                        className="flex gap-2.5 group hover:bg-white/[0.03] -mx-1 px-1 py-1 rounded-lg transition-colors"
                      >
                        <div className="w-12 h-[68px] rounded-lg bg-white/5 flex-shrink-0 overflow-hidden">
                          {thumb ? (
                            <img
                              src={thumb}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              alt={item.name}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Clapperboard
                                size={14}
                                className="text-white/15"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 py-0.5 space-y-0.5">
                          <p className="text-[11px] font-semibold text-white/70 group-hover:text-white line-clamp-2 leading-snug transition-colors">
                            {item.name}
                          </p>
                          {/* Minimal rating: just the number */}
                          <div className="flex items-center gap-1.5 text-[10px] text-white/25">
                            <span>{item.year}</span>
                            {item.tmdb?.vote_average > 0 && (
                              <>
                                <span>·</span>
                                <span className="flex items-center gap-0.5 text-amber-400/60">
                                  <Star size={9} fill="currentColor" />
                                  {Number(item.tmdb.vote_average).toFixed(1)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
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
          participants={wp.participants}
          messages={wp.messages}
          floatingReactions={wp.floatingReactions}
          onSendMessage={wp.sendMessage}
          onSendReaction={wp.sendReaction}
          onLeaveRoom={wp.leaveRoom}
          onClose={() => wp.setIsOpen(false)}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#14181f] border border-white/10 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <span>⌨️</span> Phím Tắt Xem Phim
              </h3>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-white/40 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                <span className="text-white/60">Phát / Tạm dừng</span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono text-[11px] text-amber-300">
                  Space / K
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                <span className="text-white/60">
                  Toàn màn hình (Fullscreen)
                </span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono text-[11px] text-amber-300">
                  F
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                <span className="text-white/60">Tắt / Mở tiếng (Mute)</span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono text-[11px] text-amber-300">
                  M
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                <span className="text-white/60">Tua lùi / Tua tới 5s</span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono text-[11px] text-amber-300">
                  ← / →
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-white/60">Tua nhanh 2X</span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono text-[11px] text-amber-300">
                  Nhấp giữ Player
                </kbd>
              </div>
            </div>
            <button
              onClick={() => setShowShortcutsModal(false)}
              className="w-full py-2.5 rounded-xl bg-netflixRed hover:bg-red-600 font-bold text-xs transition-colors cursor-pointer shadow-lg"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
