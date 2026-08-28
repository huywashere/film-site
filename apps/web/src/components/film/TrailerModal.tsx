"use client";

import { useEffect, useState, useMemo } from "react";
import { X, Clapperboard, Loader2, ExternalLink } from "lucide-react";
import { useTmdb } from "@/hooks/useTmdb";
import { FilmItem } from "@/components/film/FilmCard";
import { cardFont } from "@/lib/fonts";

interface TrailerModalProps {
  film?: (FilmItem & { trailer_url?: string }) | null;
  isOpen: boolean;
  onClose: () => void;
  /** Render within a positioned Hero instead of above the entire document. */
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
  presentation = "dialog",
  filmName: directFilmName,
  trailerUrl,
  tmdbVideoKey,
}: TrailerModalProps) {
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const { trailer, videos, videosLoading } = useTmdb({
    film: film || undefined,
    enabled: isOpen && !!film && !tmdbVideoKey,
    fetchImages: false,
    fetchCredits: false,
    fetchVideos: true,
  });

  const displayName =
    directFilmName || film?.name || film?.title || "Phim Điện Ảnh";

  // Check direct sources
  const directKey = useMemo(() => {
    return tmdbVideoKey || extractYouTubeKeyFromUrl(trailerUrl || film?.trailer_url);
  }, [tmdbVideoKey, trailerUrl, film?.trailer_url]);

  // If TMDB provided videos array with any youtube entry, pick first
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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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

  if (!isOpen) return null;

  const finalYouTubeKey = directKey || tmdbKey || resolvedKey;
  const isLoading = (videosLoading || isResolving) && !finalYouTubeKey;

  // Vimeo secondary check if any
  const vimeoKey = !finalYouTubeKey
    ? videos.find((video) => video.site === "Vimeo")?.key
    : null;

  const embedSrc = finalYouTubeKey
    ? `https://www.youtube.com/embed/${encodeURIComponent(finalYouTubeKey)}?autoplay=1&rel=0&playsinline=1`
    : vimeoKey
      ? `https://player.vimeo.com/video/${encodeURIComponent(vimeoKey)}?autoplay=1&title=0&byline=0`
      : null;

  const youtubeSearchHref = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${displayName} official trailer`,
  )}`;
  const externalTrailerHref = finalYouTubeKey
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(finalYouTubeKey)}`
    : vimeoKey
      ? `https://vimeo.com/${encodeURIComponent(vimeoKey)}`
      : youtubeSearchHref;

  return (
    <div
      className={`${cardFont.className} ${presentation === "hero" ? "absolute" : "fixed"} inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 md:p-10 animate-in fade-in duration-200`}
    >
      {/* Dark backdrop overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/92 backdrop-blur-2xl transition-opacity cursor-pointer"
      />

      {/* Borderless Minimal Modal Card */}
      <div className="relative w-full max-w-4xl bg-[#0a0c10]/95 rounded-2xl p-3 sm:p-4 backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.95)] z-10 flex flex-col">
        {/* Minimal Header Bar */}
        <div className="flex items-center justify-between pb-3 px-1">
          <div className="flex items-center gap-2 min-w-0 pr-4 text-xs sm:text-sm text-neutral-400">
            <Clapperboard size={15} className="text-[#23ade5] shrink-0" />
            <span className="truncate font-medium flex items-center gap-1.5">
              Trailer chính thức{" "}
              <span className="text-white font-bold">{displayName}</span>
              {finalYouTubeKey && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 text-[10px] font-bold">
                  TMDB 4K / 1080p HD
                </span>
              )}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
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

        {/* Video Frame Box */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-2xl flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-neutral-400">
              <Loader2 size={24} className="animate-spin text-[#23ade5]" />
              <p className="text-xs font-medium">Đang tải trailer chính thức TMDB chất lượng cao...</p>
            </div>
          ) : embedSrc ? (
            <iframe
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
