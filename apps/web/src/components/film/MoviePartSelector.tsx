"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Sparkles, Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  MoviePartItem,
  resolveAllMovieParts,
  parsePartInfo,
} from "@/lib/movie-parts";
import { cn } from "@/lib/utils";

export interface MoviePartSelectorProps {
  film?: {
    name?: string;
    title?: string;
    origin_name?: string;
    slug: string;
    year?: number;
    quality?: string;
    poster_url?: string;
    thumb_url?: string;
  } | null;
  currentSlug: string;
  target?: "watch" | "film";
  currentEp?: string;
  className?: string;
  onSelectPart?: (part: MoviePartItem) => void;
}

/**
 * Biểu tượng 3 thanh ngang màu Amber chuẩn theo design gốc của người dùng
 */
function AmberBarsIcon({ className }: { className?: string }) {
  return (
    <svg
      width="15"
      height="12"
      viewBox="0 0 15 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="0" y="0.5" width="15" height="2.2" rx="1.1" fill="#f59e0b" />
      <rect x="0" y="5" width="11" height="2.2" rx="1.1" fill="#f59e0b" />
      <rect x="0" y="9.5" width="13.5" height="2.2" rx="1.1" fill="#f59e0b" />
    </svg>
  );
}

export function MoviePartSelector({
  film,
  currentSlug,
  target = "watch",
  currentEp,
  className,
  onSelectPart,
}: MoviePartSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const filmName = film?.name || film?.title || "";
  const filmOrigin = film?.origin_name || "";
  const slug = film?.slug || currentSlug;

  // Query tìm kiếm các phần liên quan từ catalog và API
  const { data: parts = [] } = useQuery({
    queryKey: ["movie-parts", slug, filmName],
    queryFn: async () => {
      if (!slug) return [];
      return resolveAllMovieParts({
        name: filmName,
        slug,
        origin_name: filmOrigin,
        year: film?.year,
        quality: film?.quality,
        poster_url: film?.poster_url,
        thumb_url: film?.thumb_url,
      });
    },
    enabled: Boolean(slug && filmName),
    staleTime: 1000 * 60 * 30, // 30 phút
    refetchOnWindowFocus: false,
  });

  // Đóng khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Đóng khi nhấn phím Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Không hiển thị nếu phim lẻ không có phần khác
  if (!parts || parts.length <= 1) {
    return null;
  }

  // Xác định nhãn của phần hiện tại
  const currentPart =
    parts.find((p) => p.slug === slug || p.isCurrent) ||
    parts.find((p) => currentSlug.includes(p.slug)) ||
    parts[0];

  const parsedCurrent = parsePartInfo(filmName, filmOrigin, slug);
  const currentPartLabel = currentPart?.partLabel || (parsedCurrent ? parsedCurrent.partLabel : "Phần 1");

  const buildTargetLink = (partSlug: string) => {
    if (target === "watch") {
      // Giữ ep nếu cùng xem, hoặc để watch page tự chọn ep đầu
      return `/watch/${partSlug}`;
    }
    return `/film/${partSlug}`;
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex items-center select-none", className)}
    >
      {/* Nút chọn Phần (Season Selector Button) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-1.5 py-1 px-2 rounded-lg transition-all cursor-pointer group",
          isOpen
            ? "bg-white/15 text-white ring-1 ring-amber-400/50"
            : "hover:bg-white/10 active:bg-white/15 text-neutral-200 hover:text-white",
        )}
        title="Chọn phần phim khác"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <AmberBarsIcon className="shrink-0 drop-shadow-[0_1px_3px_rgba(245,158,11,0.5)] transition-transform group-hover:scale-105" />
        <span className="font-bold text-white text-xs sm:text-[13px] tracking-tight group-hover:text-amber-200 transition-colors">
          {currentPartLabel}
        </span>
        <ChevronDown
          size={13}
          className={cn(
            "text-neutral-400 group-hover:text-white transition-transform duration-200 shrink-0",
            isOpen && "rotate-180 text-amber-400",
          )}
        />
      </button>

      {/* Vạch kẻ dọc ngăn cách kế bên danh sách tập */}
      <div className="h-3.5 w-px bg-white/20 mx-1.5 sm:mx-2 shrink-0" aria-hidden="true" />

      {/* Popover Menu danh sách các phần */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 min-w-[240px] sm:min-w-[280px] max-w-[340px] max-h-[380px] overflow-y-auto no-scrollbar rounded-xl bg-[#12151c]/95 backdrop-blur-xl border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.9)] z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-2.5 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between border-b border-white/10 mb-1">
            <span className="flex items-center gap-1.5">
              <Sparkles size={11} className="text-amber-400" />
              <span>Danh sách các phần ({parts.length})</span>
            </span>
            <span className="text-[10px] text-amber-400 font-mono">
              Series
            </span>
          </div>

          {/* List of parts */}
          <div className="space-y-1">
            {parts.map((part) => {
              const isSelected = part.slug === slug || (part.isCurrent && !parts.some(p => p.slug === slug));

              return (
                <Link
                  key={part.slug}
                  href={buildTargetLink(part.slug)}
                  onClick={(e) => {
                    setIsOpen(false);
                    if (onSelectPart) {
                      onSelectPart(part);
                    }
                  }}
                  className={cn(
                    "flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer",
                    isSelected
                      ? "bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold shadow-sm"
                      : "text-neutral-300 hover:text-white hover:bg-white/10 border border-transparent",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "shrink-0 text-xs font-black px-1.5 py-0.5 rounded",
                        isSelected
                          ? "bg-amber-400/30 text-amber-200"
                          : "bg-white/10 text-neutral-300",
                      )}
                    >
                      {part.partLabel}
                    </span>
                    <span className="truncate text-[11px] font-medium text-neutral-200">
                      {part.title}
                    </span>
                  </div>

                  {isSelected ? (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                      <Check size={10} />
                      <span>Đang xem</span>
                    </span>
                  ) : (
                    part.year && (
                      <span className="shrink-0 text-[10px] text-neutral-500 font-mono">
                        {part.year}
                      </span>
                    )
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
