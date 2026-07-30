"use client";

import { useEffect } from "react";
import { X, Clapperboard, Loader2 } from "lucide-react";
import { useTmdb } from "@/hooks/useTmdb";
import { FilmItem } from "@/components/film/FilmCard";

interface TrailerModalProps {
  film?: FilmItem | null;
  isOpen: boolean;
  onClose: () => void;
  filmName?: string;
  trailerUrl?: string;
  tmdbVideoKey?: string;
}

export function TrailerModal({
  film,
  isOpen,
  onClose,
  filmName: directFilmName,
  trailerUrl,
  tmdbVideoKey,
}: TrailerModalProps) {
  const { trailer, videosLoading } = useTmdb({
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

  // Extract Youtube ID from direct trailer URL or TMDB trailer
  let youtubeKey = tmdbVideoKey || trailer?.key;
  if (!youtubeKey && trailerUrl) {
    const match = trailerUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
    );
    if (match) youtubeKey = match[1];
  }

  // Fallback YouTube search embed URL if no explicit key was found
  const embedSrc = youtubeKey
    ? `https://www.youtube-nocookie.com/embed/${youtubeKey}?autoplay=1&rel=0&modestbranding=1`
    : `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(
        `${displayName} official trailer`,
      )}&autoplay=1`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 md:p-10 animate-in fade-in duration-200">
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

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Đóng"
          >
            <X size={15} />
          </button>
        </div>

        {/* Video Frame Box (No Borders) */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-2xl flex items-center justify-center">
          {videosLoading && !youtubeKey ? (
            <div className="flex flex-col items-center gap-2 text-neutral-400">
              <Loader2 size={24} className="animate-spin text-neutral-400" />
              <p className="text-xs font-medium">Đang tải trailer...</p>
            </div>
          ) : (
            <iframe
              src={embedSrc}
              title={`${displayName} Official Trailer`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </div>
  );
}
