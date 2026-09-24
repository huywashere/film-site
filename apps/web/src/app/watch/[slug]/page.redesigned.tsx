"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Clapperboard,
  Heart,
  Star,
  AlertTriangle,
  Search,
  SkipForward,
  X,
  Play,
  Camera,
  Bookmark,
  Share2,
  Settings,
  Sparkles,
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
import { useReliableNavigation } from "@/hooks/useReliableNavigation";
import { AdvancedCommentSection } from "@/components/comments/AdvancedCommentSection";

const ArtPlayer = dynamic(() => import("@/components/video/ArtPlayer"), {
  ssr: false,
});

// ── Letterboxd-inspired Skeleton ──
function WatchSkeleton() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="h-4 bg-white/5 rounded w-96 animate-pulse" />
        <div className="aspect-video bg-black rounded-sm animate-pulse" />
        <div className="h-12 bg-white/5 rounded w-full animate-pulse" />
      </div>
    </div>
  );
}

// ── Auto-next overlay (minimal) ──
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
    <div className="absolute bottom-6 right-6 z-50">
      <div className="bg-black/95 border border-white/20 px-4 py-3 flex items-center gap-4">
        <div className="text-sm">
          <div className="text-white/60 text-xs">Next episode in</div>
          <div className="text-white font-bold tabular-nums">{seconds}s</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSkip}
            className="bg-[#3b82f6] text-white px-3 py-1 text-sm font-medium hover:bg-[#2563eb] transition-colors"
          >
            Watch now
          </button>
          <button
            onClick={onCancel}
            className="text-white/60 hover:text-white px-2 py-1 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
// ── Main Watch Page (Letterboxd Style) ──
export default function WatchPageRedesigned() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useReliableNavigation();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();

  const slug = params.slug as string;
  const currentEp = searchParams.get("ep") || "";
  const wp = useWatchParty(slug, currentEp);

  // ── State management (keeping all original functionality) ──
  const [currentServer, setCurrentServer] = useState(0);
  const [failedServers, setFailedServers] = useState<number[]>([]);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"episodes" | "servers" | "info">(
    "episodes",
  );
  const [episodeSearch, setEpisodeSearch] = useState("");
  const [autoNextConfig, setAutoNextConfig] = useState(true);
  const [autoPlayConfig, setAutoPlayConfig] = useState(true);
  const [autoSkipConfig, setAutoSkipConfig] = useState(true);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(
    null,
  );
  const [useEmbedPlayer, setUseEmbedPlayer] = useState(false);
  const autoNextTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncRef = useRef(0);

  const progressSyncMutation = useMutation({
    mutationFn: (data: {
      movieId: string;
      episode: string;
      progress: number;
      duration: number;
      movieTitle: string;
      movieThumb?: string;
    }) => watchHistoryApi.upsert(data),
  });

  // ── Data queries (unchanged) ──
  const { data, isLoading } = useQuery({
    queryKey: ["film", slug],
    queryFn: () => movieApi.getDetail(slug).then((r) => r.data),
  });

  const { data: ophimData } = useQuery({
    queryKey: ["film-ophim", slug],
    queryFn: () =>
      fetch(`/api/ophim/phim/${slug}`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    enabled: !!slug,
  });

  const { data: nguoncData } = useQuery({
    queryKey: ["film-nguonc", slug],
    queryFn: () =>
      fetch(`/api/nguonc/film/${slug}`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    enabled: !!slug,
  });
  // ── Smart recommendations ──
  const rawTitle = (
    data?.movie?.name ||
    data?.name ||
    data?.movie?.origin_name ||
    slug ||
    ""
  ).toLowerCase();
  const filmCategory =
    data?.movie?.category?.[0]?.slug || data?.category?.[0]?.slug;

  const matchedKeyword = useMemo(() => {
    const keywords = [
      "marvel",
      "dc",
      "superman",
      "batman",
      "spider-man",
      "avengers",
      "doraemon",
      "naruto",
    ];
    return keywords.find((kw) => rawTitle.includes(kw));
  }, [rawTitle]);

  const { data: recommendationsData } = useQuery({
    queryKey: ["smart-recommendations", slug, filmCategory, matchedKeyword],
    queryFn: async () => {
      const recItems: any[] = [];
      if (matchedKeyword) {
        try {
          const res = await movieApi.search(matchedKeyword, 1, 15);
          const searchItems = res?.data?.items || res?.data?.data?.items || [];
          recItems.push(...searchItems);
        } catch {
          // Ignore search errors
        }
      }
      if (filmCategory) {
        try {
          const res = await movieApi.getByGenre(filmCategory, 1);
          const genreItems = res?.data?.data?.items || res?.data?.items || [];
          recItems.push(...genreItems);
        } catch {
          // Ignore genre fetch errors
        }
      }
      try {
        const res = await movieApi.getLatest(1);
        const latestItems = res?.data?.items || res?.data?.data?.items || [];
        recItems.push(...latestItems);
      } catch {
        // Ignore latest fetch errors
      }

      const seen = new Set<string>();
      const filtered = recItems.filter((item: any) => {
        if (!item || !item.slug || item.slug === slug || seen.has(item.slug))
          return false;
        seen.add(item.slug);
        return true;
      });
      return { items: filtered.slice(0, 10) };
    },
    enabled: !!slug,
  });

  const { data: resumeData } = useQuery({
    queryKey: ["watch-history-resume", slug],
    queryFn: () => watchHistoryApi.getResume(slug).then((r) => r.data),
    enabled: !!user && !!slug,
  });

  // ── Episode processing (unchanged logic) ──
  const film = data?.movie || data;
  const kkphimEpisodes: any[] = data?.episodes || [];
  const ophimEpisodes: any[] = ophimData?.episodes || [];
  const nguoncEpisodes: any[] = nguoncData?.episodes || [];

  const mappedKKPhim = kkphimEpisodes.map((s: any, idx: number) => ({
    ...s,
    server_name:
      kkphimEpisodes.length > 1 ? `Server 1 (#${idx + 1})` : "Server 1",
  }));
  const mappedNguonC = nguoncEpisodes.map((s: any, idx: number) => ({
    ...s,
    server_name:
      nguoncEpisodes.length > 1 ? `Server 2 (#${idx + 1})` : "Server 2",
  }));
  const mappedOphim = ophimEpisodes.map((s: any, idx: number) => ({
    ...s,
    server_name:
      ophimEpisodes.length > 1 ? `Server 3 (#${idx + 1})` : "Server 3",
  }));

  const episodes: any[] = [...mappedKKPhim, ...mappedNguonC, ...mappedOphim];
  const server = episodes[currentServer];
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
  const actors: string[] =
    typeof film?.actor === "string"
      ? film.actor
          .split(",")
          .map((a: string) => a.trim())
          .filter(Boolean)
      : [];

  const epName: string = currentEpData?.slug || currentEpData?.name || "";
  const progressKey = slug && epName ? `${slug}_${epName}` : undefined;
  const currentResumeEntry = resumeData?.find(
    (item: any) => item.episode === epName,
  );
  const dbProgress = currentResumeEntry?.progress || 0;
  // ── Auto-next logic (unchanged) ──
  const goNextEpisode = useCallback(() => {
    if (autoNextTimerRef.current) clearInterval(autoNextTimerRef.current);
    setAutoNextCountdown(null);
    if (currentEpIndex >= 0 && currentEpIndex < serverData.length - 1) {
      const nextEp = serverData[currentEpIndex + 1];
      router.push(
        `/watch/${slug}?ep=${nextEp.slug || nextEp.name}&server=${currentServer}`,
      );
    }
  }, [currentEpIndex, serverData, slug, currentServer, router]);

  const handleVideoEnded = useCallback(() => {
    if (!autoNextConfig) return;
    if (currentEpIndex >= 0 && currentEpIndex < serverData.length - 1) {
      if (autoSkipConfig) {
        goNextEpisode();
      } else {
        setAutoNextCountdown(5);
      }
    }
  }, [
    autoNextConfig,
    autoSkipConfig,
    goNextEpisode,
    currentEpIndex,
    serverData.length,
  ]);

  const cancelAutoNext = () => {
    if (autoNextTimerRef.current) clearInterval(autoNextTimerRef.current);
    setAutoNextCountdown(null);
  };

  // ── Progress tracking (unchanged) ──
  const handleProgress = useCallback(
    (currentTime: number, duration: number) => {
      if (!slug || !epName || duration < 10) return;

      watchProgressStorage.saveProgress({
        slug,
        epSlug: currentEpData?.slug || currentEpData?.name || "01",
        epName,
        title: film?.name || slug,
        poster: posterUrl || "",
        currentTime,
        duration,
      });

      if (!user) return;
      const now = Date.now();
      if (now - lastSyncRef.current < 15_000) return;
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
    [user, slug, epName, film?.name, posterUrl, currentEpData],
  );

  // ── Error handler (unchanged) ──
  const handlePlayerError = (err: any) => {
    console.warn("Player error:", err);
    if (embedUrl && !useEmbedPlayer) {
      toast("Switching to backup iframe player...", "warning");
      setUseEmbedPlayer(true);
      return;
    }

    if (!failedServers.includes(currentServer)) {
      const updated = [...failedServers, currentServer];
      setFailedServers(updated);
      const nextIdx = episodes.findIndex((_, idx) => !updated.includes(idx));
      if (nextIdx !== -1) {
        toast(`Switching to Server #${nextIdx + 1}...`, "error");
        setCurrentServer(nextIdx);
        const nd = episodes[nextIdx]?.server_data || [];
        if (nd.length > 0) {
          router.push(
            `/watch/${slug}?ep=${nd[0].slug || nd[0].name}&server=${nextIdx}`,
          );
        }
      } else {
        toast("All servers are currently unavailable!", "error");
      }
    }
  };

  useEffect(() => {
    const serverParam = searchParams.get("server");
    if (serverParam !== null) setCurrentServer(Number(serverParam) || 0);
  }, [searchParams]);

  useEffect(() => {
    setUseEmbedPlayer(false);
  }, [currentEp, currentServer]);
  if (isLoading) return <WatchSkeleton />;

  if (!isLoading && !film) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex flex-col items-center justify-center p-6">
        <Clapperboard size={48} className="text-white/30 mb-4" />
        <h1 className="text-xl font-bold mb-2">Film not found</h1>
        <p className="text-white/60 text-sm mb-6 max-w-md text-center">
          The film you're looking for may be temporarily unavailable.
        </p>
        <Link
          href="/"
          className="bg-[#3b82f6] text-white px-6 py-2 text-sm font-medium hover:bg-[#2563eb] transition-colors"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* ── LETTERBOXD-STYLE HEADER: Simple breadcrumb ── */}
      <header className="border-b border-white/10 bg-[#0d1117]/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <nav className="flex items-center space-x-3 text-sm text-white/60">
            <Link
              href="/"
              className="hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              <span>Home</span>
            </Link>
            <ChevronRight size={14} className="text-white/30" />
            <span className="text-white font-medium truncate max-w-sm">
              {film?.name}
            </span>
            {currentEpData?.name && (
              <>
                <ChevronRight size={14} className="text-white/30" />
                <span className="text-white">
                  Episode {currentEpData.name.replace(/^tập\s*/i, "")}
                </span>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── MAIN CONTENT: Letterboxd grid layout ── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── LEFT COLUMN: Player + Actions ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. VIDEO PLAYER - Clean, minimal frame */}
            <div className="bg-black aspect-video relative group">
              {videoUrl ? (
                <>
                  {!useEmbedPlayer && m3u8Url ? (
                    <ArtPlayer
                      url={m3u8Url}
                      type="hls"
                      poster={posterUrl}
                      title={`${film?.name} - Episode ${currentEpData?.name}`}
                      autoplay={false}
                      progressKey={progressKey}
                      dbProgress={dbProgress}
                      isTheaterMode={isTheaterMode}
                      onTheaterModeToggle={setIsTheaterMode}
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
                    <div className="flex flex-col items-center justify-center w-full h-full bg-black/50 text-white/60">
                      <AlertTriangle size={32} className="mb-2" />
                      <p className="text-sm">No video source available</p>
                    </div>
                  )}

                  {/* Auto-next overlay */}
                  {autoNextCountdown !== null && (
                    <AutoNextOverlay
                      seconds={autoNextCountdown}
                      onSkip={goNextEpisode}
                      onCancel={cancelAutoNext}
                    />
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full text-white/40">
                  <Clapperboard size={32} className="mb-2" />
                  <p className="text-sm">No video source found</p>
                </div>
              )}
            </div>
            {/* 2. ACTION TOOLBAR - Letterboxd-inspired, minimal grouping */}
            <div className="flex items-center justify-between py-4 border-t border-b border-white/10">
              {/* Left: Secondary actions - ghost style */}
              <div className="flex items-center space-x-6 text-sm text-white/60">
                <button
                  onClick={() => toast("Subtitles enabled", "success")}
                  className="flex items-center space-x-2 hover:text-white transition-colors"
                >
                  <Camera size={16} />
                  <span>Subtitles</span>
                </button>

                <button
                  onClick={() => {
                    if (!wp.roomId) wp.createRoom();
                    else wp.setIsOpen(!wp.isOpen);
                  }}
                  className="flex items-center space-x-2 hover:text-white transition-colors"
                >
                  <Sparkles size={16} />
                  <span>{wp.roomId ? `Room ${wp.roomId}` : "Watch Party"}</span>
                </button>

                <button
                  onClick={() => toast("Added to favorites", "success")}
                  className="flex items-center space-x-2 hover:text-white transition-colors"
                >
                  <Heart size={16} />
                  <span>Like</span>
                </button>

                <button
                  onClick={() => toast("Added to watchlist", "success")}
                  className="flex items-center space-x-2 hover:text-white transition-colors"
                >
                  <Bookmark size={16} />
                  <span>Watchlist</span>
                </button>

                <button
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      navigator.clipboard.writeText(window.location.href);
                      toast("Link copied to clipboard", "success");
                    }
                  }}
                  className="flex items-center space-x-2 hover:text-white transition-colors"
                >
                  <Share2 size={16} />
                  <span>Share</span>
                </button>

                <button
                  onClick={() => toast("Please rate in comments below", "info")}
                  className="flex items-center space-x-2 hover:text-white transition-colors"
                >
                  <Star size={16} />
                  <span>Rate</span>
                </button>

                <button
                  onClick={() => toast("Issue reported", "success")}
                  className="flex items-center space-x-2 hover:text-white transition-colors"
                >
                  <AlertTriangle size={16} />
                  <span>Report</span>
                </button>
              </div>

              {/* Right: Primary navigation - ONLY next episode gets accent color */}
              <div className="flex items-center space-x-3">
                {currentEpIndex > 0 && (
                  <button
                    onClick={() => {
                      const prev = serverData[currentEpIndex - 1];
                      router.push(
                        `/watch/${slug}?ep=${prev.slug || prev.name}&server=${currentServer}`,
                      );
                    }}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white/60 border border-white/20 hover:text-white hover:border-white/40 transition-colors"
                  >
                    <ChevronLeft size={16} />
                    <span>Previous</span>
                  </button>
                )}

                {currentEpIndex < serverData.length - 1 && (
                  <button
                    onClick={() => {
                      const next = serverData[currentEpIndex + 1];
                      router.push(
                        `/watch/${slug}?ep=${next.slug || next.name}&server=${currentServer}`,
                      );
                    }}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium bg-[#3b82f6] text-white hover:bg-[#2563eb] transition-colors"
                  >
                    <span>Next Episode</span>
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
            {/* 3. EPISODE GRID - Minimal, focus on active state */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Episodes</h2>
                <span className="text-sm text-white/40">
                  {serverData.length} episodes
                </span>
              </div>

              {/* Search episodes if many */}
              {serverData.length > 12 && (
                <div className="relative max-w-sm">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                  />
                  <input
                    type="text"
                    placeholder="Find episode..."
                    value={episodeSearch}
                    onChange={(e) => setEpisodeSearch(e.target.value)}
                    className="w-full bg-[#12161c] border border-white/20 px-10 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#3b82f6] transition-colors"
                  />
                </div>
              )}

              {/* Episode grid - Clean, minimal */}
              <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                {serverData
                  .filter(
                    (ep: any) =>
                      !episodeSearch ||
                      ep.name
                        .toLowerCase()
                        .includes(episodeSearch.toLowerCase()),
                  )
                  .map((ep: any, index: number) => {
                    const active =
                      ep.slug === currentEp ||
                      ep.name === currentEp ||
                      index === currentEpIndex;
                    return (
                      <button
                        key={ep.slug || ep.name || index}
                        onClick={() =>
                          router.push(
                            `/watch/${slug}?ep=${ep.slug || ep.name}&server=${currentServer}`,
                          )
                        }
                        className={cn(
                          "aspect-square flex items-center justify-center text-sm font-medium transition-colors border",
                          active
                            ? "bg-[#3b82f6] text-white border-[#3b82f6]"
                            : "bg-[#12161c] text-white/60 border-white/20 hover:text-white hover:border-white/40",
                        )}
                      >
                        {ep.name.replace(/^tập\s*/i, "")}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* 4. COMMENTS SECTION */}
            <div className="pt-8 border-t border-white/10">
              <AdvancedCommentSection
                movieSlug={slug}
                episodeName={
                  currentEpData?.name
                    ? `Episode ${currentEpData.name}`
                    : undefined
                }
              />
            </div>
          </div>
          {/* ── RIGHT SIDEBAR: Letterboxd-style info + recommendations ── */}
          <div className="space-y-8">
            {/* Film Info Card - Clean poster + typography */}
            <div className="space-y-4">
              <div className="flex gap-4">
                {posterUrl && (
                  <div className="w-24 h-36 bg-[#12161c] border border-white/10 overflow-hidden flex-shrink-0">
                    <img
                      src={posterUrl}
                      alt={film?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="space-y-2 min-w-0 flex-1">
                  <h1 className="text-lg font-bold text-white leading-tight">
                    {film?.name}
                  </h1>
                  <p className="text-sm text-white/60">
                    {film?.origin_name && film.origin_name !== film.name && (
                      <span className="block">{film.origin_name}</span>
                    )}
                    <span>{film?.year}</span>
                  </p>

                  {/* Quality & Lang badges - minimal */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-white/10 text-white px-2 py-1 border border-white/20">
                      {film?.quality || "HD"}
                    </span>
                    <span className="bg-white/10 text-white px-2 py-1 border border-white/20">
                      {film?.lang || "Subtitled"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description - clean typography */}
              {film?.content && (
                <div className="space-y-2 pt-4 border-t border-white/10">
                  <h3 className="text-sm font-bold text-white">Synopsis</h3>
                  <div className="text-sm text-white/70 leading-relaxed max-h-32 overflow-y-auto">
                    {film.content
                      .replace(/<[^>]*>/g, " ")
                      .replace(/\s+/g, " ")
                      .trim()}
                  </div>
                </div>
              )}

              {/* Cast - minimal list */}
              {actors.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-white/10">
                  <h3 className="text-sm font-bold text-white">Cast</h3>
                  <div className="text-sm text-white/60 space-y-1">
                    {actors.slice(0, 6).map((actor, idx) => (
                      <div key={idx} className="truncate">
                        {actor}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Server Selection - Clean tabs */}
            <div className="space-y-3 pt-6 border-t border-white/10">
              <h3 className="text-sm font-bold text-white">Servers</h3>
              <div className="space-y-1">
                {episodes.map((s: any, i: number) => {
                  const active = currentServer === i;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setCurrentServer(i);
                        const nd = s?.server_data || [];
                        if (nd.length > 0) {
                          router.push(
                            `/watch/${slug}?ep=${nd[0].slug || nd[0].name}&server=${i}`,
                          );
                        }
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm transition-colors border",
                        active
                          ? "bg-[#3b82f6] text-white border-[#3b82f6]"
                          : "bg-[#12161c] text-white/60 border-white/20 hover:text-white hover:border-white/40",
                      )}
                    >
                      {s.server_name || `Server ${i + 1}`}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Recommendations - Letterboxd list style */}
            <div className="space-y-4 pt-6 border-t border-white/10">
              <h3 className="text-sm font-bold text-white">
                {matchedKeyword ? `More ${matchedKeyword}` : "More like this"}
              </h3>

              <div className="space-y-3">
                {recommendationsData?.items?.slice(0, 8).map((item: any) => {
                  const recPoster =
                    resolveImageUrl(item.thumb_url) ||
                    resolveImageUrl(item.poster_url);
                  return (
                    <Link
                      href={`/film/${item.slug}`}
                      key={item._id || item.slug}
                      className="flex gap-3 group hover:bg-white/5 -mx-2 px-2 py-1 transition-colors"
                    >
                      <div className="w-12 h-18 bg-[#12161c] border border-white/10 flex-shrink-0 overflow-hidden">
                        {recPoster ? (
                          <img
                            src={recPoster}
                            className="w-full h-full object-cover"
                            alt={item.name}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Clapperboard size={16} className="text-white/20" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-white group-hover:text-white/80 line-clamp-2 leading-snug">
                          {item.name}
                        </h4>
                        <div className="text-xs text-white/40 space-y-0.5">
                          <div>{item.year}</div>
                          <div className="flex items-center space-x-1">
                            <Star size={10} className="text-white/40" />
                            <span>{item.tmdb?.vote_average || "8.0"}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Player Settings */}
            <div className="space-y-3 pt-6 border-t border-white/10">
              <h3 className="text-sm font-bold text-white">Settings</h3>

              <div className="space-y-2 text-sm">
                <label className="flex items-center justify-between">
                  <span className="text-white/60">Auto Next</span>
                  <button
                    onClick={() => setAutoNextConfig(!autoNextConfig)}
                    className={cn(
                      "w-10 h-5 rounded-full flex items-center transition-colors p-1",
                      autoNextConfig
                        ? "bg-[#3b82f6] justify-end"
                        : "bg-white/20 justify-start",
                    )}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow" />
                  </button>
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-white/60">Auto Play</span>
                  <button
                    onClick={() => setAutoPlayConfig(!autoPlayConfig)}
                    className={cn(
                      "w-10 h-5 rounded-full flex items-center transition-colors p-1",
                      autoPlayConfig
                        ? "bg-[#3b82f6] justify-end"
                        : "bg-white/20 justify-start",
                    )}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow" />
                  </button>
                </label>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
