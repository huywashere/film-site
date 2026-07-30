"use client";

import { useState, useEffect } from "react";
import { X, Play, ExternalLink, AlertCircle, Loader2 } from "lucide-react";

export function parseYouTubeVideoId(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const str = String(urlOrId).trim();

  // Clean 11-char YouTube ID check
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = str.match(regExp);

  return match && match[2].length === 11 ? match[2] : null;
}

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  filmName: string;
  trailerUrl?: string;
  tmdbVideoKey?: string;
}

export function TrailerModal({
  isOpen,
  onClose,
  filmName,
  trailerUrl,
  tmdbVideoKey,
}: TrailerModalProps) {
  const [hasError, setHasError] = useState(false);
  const [fetchedKey, setFetchedKey] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Determine YouTube Video ID from provided props
  const propYoutubeId =
    parseYouTubeVideoId(tmdbVideoKey) || parseYouTubeVideoId(trailerUrl);

  const finalYoutubeId = propYoutubeId || fetchedKey;

  const fallbackYoutubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    filmName + " trailer vietsub hd",
  )}`;

  // Auto-search TMDB for YouTube trailer if prop ID is missing
  useEffect(() => {
    setHasError(false);
    setFetchedKey(null);

    if (!isOpen) return;
    if (propYoutubeId) return; // Prop already supplied valid ID

    let isMounted = true;
    setIsSearching(true);

    const findTrailer = async () => {
      try {
        const cleanName = filmName
          .replace(/\(phần\s*\d+\)/gi, "")
          .replace(/\(season\s*\d+\)/gi, "")
          .replace(/phần\s*\d+/gi, "")
          .trim();

        const searchRes = await fetch(
          `/api/tmdb/search/multi?query=${encodeURIComponent(cleanName)}&language=vi-VN`,
        );
        if (!searchRes.ok) throw new Error("TMDB search error");
        const searchData = await searchRes.json();
        const results = searchData.results || [];
        const match = results.find(
          (item: any) =>
            item.media_type === "movie" || item.media_type === "tv",
        );

        if (match && isMounted) {
          const mediaType = match.media_type;
          const videosRes = await fetch(
            `/api/tmdb/${mediaType}/${match.id}/videos?language=en-US`,
          );
          if (videosRes.ok) {
            const videosData = await videosRes.json();
            const vids = videosData.results || [];
            const trailerVid =
              vids.find(
                (v: any) =>
                  v.site === "YouTube" &&
                  (v.type === "Trailer" || v.type === "Teaser"),
              ) || vids.find((v: any) => v.site === "YouTube");

            if (trailerVid?.key && isMounted) {
              setFetchedKey(trailerVid.key);
            }
          }
        }
      } catch (err) {
        console.error("Auto trailer search error:", err);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    };

    findTrailer();

    return () => {
      isMounted = false;
    };
  }, [isOpen, filmName, propYoutubeId]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl p-3 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl aspect-video bg-[#0f1218] rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-center items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/80 hover:bg-white/20 text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer shadow-xl backdrop-blur-md active:scale-95"
          aria-label="Đóng trailer"
        >
          <X size={20} />
        </button>

        {isSearching ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
            <Loader2 size={36} className="animate-spin text-red-500" />
            <p className="text-xs font-bold text-neutral-300">
              Đang tìm kiếm Trailer HD chính thức cho &ldquo;{filmName}
              &rdquo;...
            </p>
          </div>
        ) : finalYoutubeId && !hasError ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${finalYoutubeId}?autoplay=1&rel=0&modestbranding=1`}
            title={`Trailer ${filmName}`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onError={() => setHasError(true)}
          />
        ) : (
          /* Fallback view when YouTube embed is restricted */
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md">
            <div className="p-4 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 shadow-lg">
              <AlertCircle size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                Trailer Phim: {filmName}
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Trình phát YouTube hạn chế nhúng trực tiếp trên tên phim này.
                Bạn có thể mở xem trailer HD chính thức trực tiếp trên YouTube.
              </p>
            </div>
            <a
              href={fallbackYoutubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Play size={16} fill="currentColor" />
              <span>Xem Trailer Trên YouTube</span>
              <ExternalLink size={14} className="ml-1" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
