"use client";

import { useEffect } from "react";
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

export function TrailerModal({
  film,
  isOpen,
  onClose,
  presentation = "dialog",
  filmName: directFilmName,
  trailerUrl,
  tmdbVideoKey,
}: TrailerModalProps) {
  const { trailer, videos, videosLoading } = useTmdb({
    film: film || undefined,
    enabled: isOpen && !!film && !tmdbVideoKey,
    fetchImages: false,
    fetchCredits: false,
    fetchVideos: true,
  });

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

  if (!isOpen) return null;

  const displayName =
    directFilmName || film?.name || film?.title || "Phim Điện Ảnh";

  // Resolve YouTube first, then Vimeo as a secondary official video source.
  let youtubeKey = tmdbVideoKey || trailer?.key;
  let vimeoKey = videos.find((video) => video.site === "Vimeo")?.key;
  const rawUrl = trailerUrl || film?.trailer_url || "";

  if (!youtubeKey && rawUrl) {
    const match = rawUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
    );
    if (match) youtubeKey = match[1];
    if (!youtubeKey && /^[\w-]{11}$/.test(rawUrl.trim())) {
      youtubeKey = rawUrl.trim();
    }
    const vimeoMatch = rawUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (!vimeoKey && vimeoMatch) vimeoKey = vimeoMatch[1];
  }

  // If TMDB provided videos array with any youtube entry, pick first
  if (!youtubeKey && !vimeoKey && videos.length > 0) {
    const yt = videos.find((v) => v.site === "YouTube" && v.key);
    if (yt) youtubeKey = yt.key;
  }

  // Fallback to official YouTube search embed if no direct ID is known
  const searchEmbedSrc = `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(
    `${displayName} official trailer`,
  )}&autoplay=1&playsinline=1&rel=0`;

  const embedSrc = youtubeKey
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeKey)}?autoplay=1&playsinline=1&rel=0`
    : vimeoKey
      ? `https://player.vimeo.com/video/${encodeURIComponent(vimeoKey)}?autoplay=1&title=0&byline=0`
      : !videosLoading
        ? searchEmbedSrc
        : null;

  const youtubeSearchHref = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${displayName} official trailer`,
  )}`;
  const externalTrailerHref = youtubeKey
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeKey)}`
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
        {/* Minimal Header Bar (No Borders) */}
        <div className="flex items-center justify-between pb-3 px-1">
          <div className="flex items-center gap-2 min-w-0 pr-4 text-xs sm:text-sm text-neutral-400">
            <Clapperboard size={15} className="text-neutral-400 shrink-0" />
            <span className="truncate font-medium">
              Trailer chính thức{" "}
              <span className="text-white font-bold">{displayName}</span>
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

        {/* Video Frame Box (No Borders) */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-2xl flex items-center justify-center">
          {videosLoading && !embedSrc ? (
            <div className="flex flex-col items-center gap-2 text-neutral-400">
              <Loader2 size={24} className="animate-spin text-neutral-400" />
              <p className="text-xs font-medium">Đang tải trailer...</p>
            </div>
          ) : embedSrc ? (
            <iframe
              src={embedSrc}
              title={`${displayName} Official Trailer`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center text-neutral-300">
              <Clapperboard size={28} className="text-neutral-300" />
              <p className="text-sm font-semibold">Trailer chưa có trên TMDB</p>
              <p className="text-xs leading-relaxed text-neutral-500">
                Mở kết quả YouTube để xem trailer chính thức của phim này.
              </p>
              <a
                href={externalTrailerHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#111317] transition-colors hover:bg-neutral-200 active:scale-[0.98]"
              >
                Mở YouTube
                <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
