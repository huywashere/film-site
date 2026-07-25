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
import { WatchPartyPanel } from "@/components/watch/WatchPartyPanel";
import { AdvancedCommentSection } from "@/components/comments/AdvancedCommentSection";

const ArtPlayer = dynamic(() => import("@/components/video/ArtPlayer"), {
  ssr: false,
});

// ── Server type detection ──────────────────────────────────────
type ServerType = "vietsub" | "thuyet-minh" | "raw";

function detectServerType(serverName: string, lang?: string): ServerType {
  const name = (serverName || "").toLowerCase();
  const l = (lang || "").toLowerCase();
  if (
    name.includes("thuyet minh") ||
    name.includes("thuyết minh") ||
    name.includes("tm") ||
    l.includes("thuyet minh") ||
    l.includes("thuyết minh") ||
    l.includes("lồng tiếng")
  )
    return "thuyet-minh";
  if (
    name.includes("vietsub") ||
    name.includes("viet sub") ||
    l.includes("vietsub") ||
    l.includes("sub")
  )
    return "vietsub";
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
  const [useEmbedPlayer, setUseEmbedPlayer] = useState(false);
  const [activeServerType, setActiveServerType] =
    useState<ServerType>("vietsub");
  const [currentTypeServer, setCurrentTypeServer] = useState(0);
  const autoNextTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncRef = useRef(0);

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

  // Episode processing
  const kkphimEps: any[] = data?.episodes || [];
  const ophimEps: any[] = ophimData?.episodes || [];
  const nguoncEps: any[] = nguoncData?.episodes || [];

  const tagged = (arr: any[], prefix: string) =>
    arr.map((s, i) => ({
      ...s,
      server_name: arr.length > 1 ? `${prefix} ${i + 1}` : prefix,
      _type: detectServerType(s.server_name || prefix, filmLang),
    }));

  const episodes = [
    ...tagged(kkphimEps, "Server"),
    ...tagged(ophimEps, "OPhim"),
    ...tagged(nguoncEps, "NguonC"),
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
  const server =
    currentTypeServers[currentTypeServer] || episodes[currentServer];
  const serverData: any[] = server?.server_data || [];
  const currentEpData: any =
    serverData.find((e: any) => (e.slug || e.name) === currentEp) ||
    serverData[0];

  const m3u8Url: string = currentEpData?.link_m3u8 || "";
  const embedUrl: string = currentEpData?.link_embed || "";
  const videoUrl = m3u8Url || embedUrl;

  const currentEpIndex = serverData.findIndex(
    (e: any) =>
      (e.slug || e.name) ===
      (currentEp || currentEpData?.slug || currentEpData?.name),
  );

  const posterUrl =
    resolveImageUrl(film?.thumb_url) ||
    resolveImageUrl(film?.poster_url) ||
    undefined;
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
    ],
  );

  // Error
  const handlePlayerError = (err: any) => {
    if (embedUrl && !useEmbedPlayer) {
      toast("Chuyển player dự phòng...", "warning");
      setUseEmbedPlayer(true);
      return;
    }
    const gIdx = episodes.indexOf(server);
    if (!failedServers.includes(gIdx)) {
      const upd = [...failedServers, gIdx];
      setFailedServers(upd);
      const next = currentTypeServers.find(
        (s) => !upd.includes(episodes.indexOf(s)),
      );
      if (next) {
        setCurrentTypeServer(currentTypeServers.indexOf(next) + 1);
        const nd = next?.server_data || [];
        if (nd.length > 0)
          router.push(`/watch/${slug}?ep=${nd[0].slug || nd[0].name}`);
      } else toast("Tất cả server không khả dụng!", "error");
    }
  };

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
  }, [currentEp, currentServer]);

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
      <div className="min-h-screen bg-[#0d1117] text-white flex flex-col items-center justify-center">
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

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* ── MAIN — padded top for navbar (64px) + margin ── */}
      <main className="pt-20 max-w-screen-2xl mx-auto px-3 md:px-5 pb-10">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
          {/* ───── LEFT COLUMN ───── */}
          <div className="space-y-4 min-w-0">
            {/* 1. PLAYER */}
            <div className="bg-black aspect-video rounded-xl overflow-hidden relative shadow-2xl ring-1 ring-white/[0.06]">
              {videoUrl ? (
                <>
                  {!useEmbedPlayer && m3u8Url ? (
                    <ArtPlayer
                      url={m3u8Url}
                      type="hls"
                      poster={posterUrl}
                      title={`${film?.name} - Tập ${currentEpData?.name}`}
                      autoplay={false}
                      progressKey={progressKey}
                      dbProgress={dbProgress}
                      onReady={() => {}}
                      onEnded={handleVideoEnded}
                      onProgress={handleProgress}
                      onError={handlePlayerError}
                    />
                  ) : embedUrl ? (
                    <iframe
                      src={embedUrl}
                      className="w-full h-full"
                      allowFullScreen
                      allow="autoplay; fullscreen"
                      title={`${film?.name} - ${currentEpData?.name}`}
                    />
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

            {/* ── BREADCRUMB & BACK BUTTON BAR — Below Video ── */}
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
              <div className="flex items-center gap-3 shrink-0">
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

            {/* 3. SERVER TYPE TABS */}
            {availableTypes.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                  <Server size={11} /> Chọn nguồn phim
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableTypes.map((type) => {
                    const cfg = TYPE_CFG[type];
                    const isActive = activeServerType === type;
                    const count = serversByType[type].length;
                    return (
                      <button
                        key={type}
                        onClick={() => setActiveServerType(type)}
                        className={cn(
                          "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all",
                          isActive ? cfg.active : cfg.inactive,
                        )}
                      >
                        <cfg.Icon size={13} />
                        {cfg.label}
                        {count > 1 && (
                          <span className="text-[9px] font-bold bg-white/10 rounded-full px-1.5 py-0.5">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {currentTypeServers.length > 1 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {currentTypeServers.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setCurrentTypeServer(i);
                          const gIdx = episodes.indexOf(s);
                          setCurrentServer(gIdx >= 0 ? gIdx : 0);
                          const nd = s?.server_data || [];
                          if (nd.length > 0)
                            router.push(
                              `/watch/${slug}?ep=${nd[0].slug || nd[0].name}`,
                            );
                        }}
                        className={cn(
                          "px-3 py-1 rounded-lg border text-[10px] font-medium transition-all",
                          i === currentTypeServer
                            ? "bg-white/10 border-white/20 text-white"
                            : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70",
                        )}
                      >
                        Server {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. EPISODE LIST — list style, not tiny squares */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                <span className="text-xs font-semibold text-white/60">
                  Danh sách tập{" "}
                  <span className="text-white/30">({serverData.length})</span>
                </span>
                {serverData.length > 16 && (
                  <div className="relative">
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
              </div>

              {/* Episodes grid — comfortable size */}
              <div className="p-3">
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-8 xl:grid-cols-10 gap-1.5 max-h-52 overflow-y-auto scrollbar-hide">
                  {filteredEps.map((ep: any, i: number) => {
                    const isActive =
                      ep.slug === currentEp ||
                      ep.name === currentEp ||
                      i === currentEpIndex;
                    const epNum = ep.name.replace(/^tập\s*/i, "");
                    return (
                      <button
                        key={ep.slug || ep.name || i}
                        onClick={() =>
                          router.push(`/watch/${slug}?ep=${ep.slug || ep.name}`)
                        }
                        className={cn(
                          "flex flex-col items-center justify-center rounded-lg py-2.5 px-1 transition-all",
                          "text-[11px] font-semibold leading-tight",
                          isActive
                            ? "bg-red-600 text-white shadow-lg shadow-red-500/25"
                            : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/90",
                        )}
                      >
                        <span className="text-xs font-bold">{epNum}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 5. COMMENTS */}
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
    </div>
  );
}
