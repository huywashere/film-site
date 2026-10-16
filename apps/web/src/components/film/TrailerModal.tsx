"use client";

import { useEffect, useState, useMemo } from "react";
import {
  X,
  Clapperboard,
  Loader2,
  ExternalLink,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { useTmdb } from "@/hooks/useTmdb";
import { filterAccurateTrailers } from "@/lib/tmdb";
import { FilmItem } from "@/components/film/FilmCard";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

interface TrailerModalProps {
  film?: (FilmItem & { trailer_url?: string }) | null;
  isOpen: boolean;
  onClose: () => void;
  /** Presentation mode */
  presentation?: "dialog" | "hero";
  filmName?: string;
  trailerUrl?: string;
  tmdbVideoKey?: string;
}

function extractYouTubeKeyFromUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
  );
  if (match) return match[1];
  if (/^[\w-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

export function TrailerModal({
  film,
  isOpen,
  onClose,
  filmName: directFilmName,
  trailerUrl,
  tmdbVideoKey,
}: TrailerModalProps) {
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [isFloating, setIsFloating] = useState(false);

  const { trailer, videos, videosLoading } = useTmdb({
    film: film || undefined,
    enabled: isOpen && !!film && !tmdbVideoKey,
    fetchImages: false,
    fetchCredits: false,
    fetchVideos: true,
  });

  const displayName =
    directFilmName || film?.name || film?.title || "Phim Điện Ảnh";

  // Priority 1: Direct explicitly passed key or trailerUrl
  const directKey = useMemo(() => {
    return tmdbVideoKey || extractYouTubeKeyFromUrl(trailerUrl);
  }, [tmdbVideoKey, trailerUrl]);

  // Priority 2: TMDB official studio trailer
  const tmdbKey = useMemo(() => {
    if (trailer?.key) return trailer.key;
    if (videos.length > 0) {
      const yt =
        videos.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.key) ||
        videos.find((v) => v.site === "YouTube" && v.key);
      if (yt) return yt.key;
    }
    return null;
  }, [trailer, videos]);

  // Priority 4: Third-party raw film.trailer_url fallback
  const rawFallbackKey = useMemo(() => {
    return extractYouTubeKeyFromUrl(film?.trailer_url);
  }, [film?.trailer_url]);

  // Reset selected index & floating mode when modal opens or film changes
  useEffect(() => {
    if (isOpen) {
      setSelectedVideoIndex(0);
      setIsFloating(false);
    }
  }, [isOpen, film?.slug, tmdbVideoKey]);

  // Lock body scroll when modal is open in FULL mode, unlock in FLOATING mode
  useEffect(() => {
    if (isOpen && !isFloating) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, isFloating]);

  // Press ESC to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-resolve trailer from API if not yet found
  useEffect(() => {
    if (!isOpen) {
      setResolvedKey(null);
      setIsResolving(false);
      return;
    }

    if (directKey || tmdbKey) return;

    let active = true;
    setIsResolving(true);

    const title = film?.name || film?.title || directFilmName || "";
    const originName = film?.origin_name || "";
    const year = film?.year ? String(film.year) : "";
    const rawUrl = trailerUrl || film?.trailer_url || "";

    const params = new URLSearchParams();
    if (title) params.set("title", title);
    if (originName) params.set("originName", originName);
    if (year) params.set("year", year);
    if (rawUrl) params.set("trailerUrl", rawUrl);

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
  }, [isOpen, directKey, tmdbKey, film, directFilmName, trailerUrl]);

  // Compile list of all candidate trailer keys in order of studio authenticity
  const candidateVideos = useMemo(() => {
    const list: Array<{ key: string; name: string; type: string }> = [];

    // 1. Direct explicit key
    if (directKey) {
      list.push({ key: directKey, name: "Trailer 1", type: "Trailer" });
    }

    // 2. Official TMDB primary trailer
    if (trailer?.key && !list.some((v) => v.key === trailer.key)) {
      list.push({
        key: trailer.key,
        name: trailer.name || "Trailer Chính Thức",
        type: trailer.type || "Trailer",
      });
    }

    // 3. Other TMDB videos filtered strictly for genuine trailers & teasers
    const accurateVideos = filterAccurateTrailers(videos);
    accurateVideos.forEach((v, idx) => {
      if (!list.some((item) => item.key === v.key)) {
        const isOfficial = v.official || /official/i.test(v.name);
        const isTeaser = v.type === "Teaser" || /teaser/i.test(v.name);
        const label =
          v.name && v.name.length <= 30
            ? v.name
            : isTeaser
              ? "Teaser Trailer"
              : isOfficial
                ? `Trailer Chính Thức ${idx > 0 ? idx + 1 : ""}`.trim()
                : `Trailer ${idx + 1}`;
        list.push({
          key: v.key,
          name: label,
          type: v.type || "Trailer",
        });
      }
    });

    // 4. API Resolved Key
    if (resolvedKey && !list.some((v) => v.key === resolvedKey)) {
      list.push({ key: resolvedKey, name: "Trailer Full HD", type: "Trailer" });
    }

    // 5. Raw provider fallback
    if (rawFallbackKey && !list.some((v) => v.key === rawFallbackKey)) {
      list.push({ key: rawFallbackKey, name: "Trailer Dự Phòng", type: "Trailer" });
    }

    return list;
  }, [directKey, trailer, videos, resolvedKey, rawFallbackKey]);

  if (!isOpen) return null;

  const currentVideo = candidateVideos[selectedVideoIndex] || candidateVideos[0];
  const activeYouTubeKey = currentVideo?.key || null;
  const isLoading = (videosLoading || isResolving) && candidateVideos.length === 0;

  // Vimeo secondary check if any
  const vimeoKey = !activeYouTubeKey
    ? videos.find((video) => video.site === "Vimeo")?.key
    : null;

  const embedSrc = activeYouTubeKey
    ? `https://www.youtube.com/embed/${encodeURIComponent(activeYouTubeKey)}?autoplay=1&rel=0&playsinline=1&enablejsapi=1`
    : vimeoKey
      ? `https://player.vimeo.com/video/${encodeURIComponent(vimeoKey)}?autoplay=1&title=0&byline=0`
      : null;

  const youtubeSearchHref = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${displayName} official trailer`,
  )}`;
  const externalTrailerHref = activeYouTubeKey
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(activeYouTubeKey)}`
    : vimeoKey
      ? `https://vimeo.com/${encodeURIComponent(vimeoKey)}`
      : youtubeSearchHref;

  // ── FLOATING CORNER MINI-PLAYER (Xem linh hoạt khi lướt trang) ──
  if (isFloating) {
    return (
      <div
        className={cn(
          cardFont.className,
          "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[99999] w-[310px] sm:w-[380px] rounded-2xl bg-[#0a0c10]/95 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.95)] backdrop-blur-2xl p-2.5 flex flex-col transition-all duration-300 animate-in slide-in-from-bottom-5",
        )}
      >
        {/* Floating Mini Header */}
        <div className="flex items-center justify-between pb-2 px-1 text-xs">
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            <Clapperboard size={13} className="text-[#23ade5] shrink-0" />
            <span className="truncate text-white font-bold text-xs">{displayName}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsFloating(false)}
              title="Phóng to toàn màn hình"
              className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Maximize2 size={13} />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Đóng trailer"
              className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Floating Video Box */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner border border-white/5">
          {embedSrc ? (
            <iframe
              key={`floating-${activeYouTubeKey || "iframe"}`}
              src={embedSrc}
              title={`${displayName} Official Trailer`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-xs text-neutral-400">
              Đang tải trailer...
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── FULL VIEWPORT CENTERED MODAL ──
  return (
    <div
      className={cn(
        cardFont.className,
        "fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 md:p-10 animate-in fade-in duration-200",
      )}
    >
      {/* Dark backdrop overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/92 backdrop-blur-2xl transition-opacity cursor-pointer"
      />

      {/* Borderless Minimal Modal Card */}
      <div className="relative w-full max-w-4xl bg-[#0a0c10]/95 rounded-2xl p-3 sm:p-4 backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.95)] z-10 flex flex-col border border-white/10">
        {/* Minimal Header Bar */}
        <div className="flex items-center justify-between pb-3 px-1 gap-2">
          <div className="flex items-center gap-2 min-w-0 pr-2 text-xs sm:text-sm text-neutral-400">
            <Clapperboard size={15} className="text-[#23ade5] shrink-0" />
            <span className="truncate font-medium flex items-center gap-1.5">
              Trailer chính thức{" "}
              <span className="text-white font-bold">{displayName}</span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {/* Nút Thu nhỏ / Nổi góc để lướt trang */}
            <button
              type="button"
              onClick={() => setIsFloating(true)}
              title="Thu nhỏ nổi góc màn hình để vừa xem vừa lướt web"
              className="flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-semibold text-neutral-300 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Minimize2 size={12} className="text-[#23ade5]" />
              <span className="hidden sm:inline">Thu nhỏ nổi góc</span>
            </button>

            {embedSrc && (
              <a
                href={externalTrailerHref}
                target="_blank"
                rel="noreferrer"
                className="flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-semibold text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                Mở nguồn
                <ExternalLink size={12} />
              </a>
            )}
            <button
              onClick={onClose}
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-neutral-300 transition-colors hover:bg-white/20 hover:text-white"
              aria-label="Đóng"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Multi-Trailer Switcher Pills (If film has multiple official versions/teasers) */}
        {candidateVideos.length > 1 && (
          <div className="flex items-center gap-1.5 pb-2.5 overflow-x-auto no-scrollbar">
            {candidateVideos.slice(0, 4).map((vid, idx) => (
              <button
                key={vid.key || idx}
                type="button"
                onClick={() => setSelectedVideoIndex(idx)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold transition-all shrink-0 cursor-pointer border",
                  idx === selectedVideoIndex
                    ? "bg-white text-black border-white font-bold shadow-sm"
                    : "bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 border-white/[0.08]",
                )}
              >
                {vid.name.length > 28 ? `${vid.name.slice(0, 26)}...` : vid.name}
              </button>
            ))}
          </div>
        )}

        {/* Video Frame Box */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-2xl flex items-center justify-center border border-white/5">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-neutral-400">
              <Loader2 size={24} className="animate-spin text-[#23ade5]" />
              <p className="text-xs font-medium">Đang tải trailer chính thức chất lượng cao...</p>
            </div>
          ) : embedSrc ? (
            <iframe
              key={`modal-${activeYouTubeKey || "iframe"}`}
              src={embedSrc}
              title={`${displayName} Official Trailer`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center text-neutral-300">
              <Clapperboard size={28} className="text-neutral-400" />
              <p className="text-sm font-semibold">Chưa có trailer chính thức</p>
              <p className="text-xs leading-relaxed text-neutral-500">
                Phim này hiện chưa phát hành trailer chính thức chất lượng cao từ hãng phim.
              </p>
              <a
                href={youtubeSearchHref}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 px-4 py-1.5 text-xs font-bold text-white transition-all"
              >
                Tìm trailer trên YouTube
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
