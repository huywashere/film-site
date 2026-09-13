"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Play,
  Film,
  X,
  ChevronRight,
  ChevronLeft,
  Star,
  Volume2,
} from "lucide-react";
import {
  UniverseSpotlightItem,
  getUniverseSpotlights,
  MARVEL_SUB_FRANCHISES,
  DC_SUB_FRANCHISES,
} from "@/lib/universe-catalog";
import { cn } from "@/lib/utils";

interface UniverseHeroBannerProps {
  universe: "marvel" | "dc";
  activeSubFranchise: string;
  onSelectSubFranchise: (subId: string) => void;
}

export function UniverseHeroBanner({
  universe,
  activeSubFranchise,
  onSelectSubFranchise,
}: UniverseHeroBannerProps) {
  const spotlights = useMemo(() => getUniverseSpotlights(universe), [universe]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);

  // Reset selected index when universe changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [universe]);

  // Auto slide every 8s when not hovering and modal closed
  useEffect(() => {
    if (isHovering || spotlights.length <= 1 || showTrailerModal) return;
    const interval = setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % spotlights.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isHovering, spotlights.length, showTrailerModal]);

  const current = spotlights[selectedIndex] || spotlights[0];
  const isMarvel = universe === "marvel";
  const subFranchises = isMarvel ? MARVEL_SUB_FRANCHISES : DC_SUB_FRANCHISES;

  // Format YouTube Embed URL with strict security attributes to prevent error 153
  const trailerEmbedUrl = useMemo(() => {
    if (!current?.trailer_url) return null;
    let videoId = "";
    if (current.trailer_url.includes("v=")) {
      videoId = current.trailer_url.split("v=")[1]?.split("&")[0] || "";
    } else if (current.trailer_url.includes("youtu.be/")) {
      videoId = current.trailer_url.split("youtu.be/")[1]?.split("?")[0] || "";
    }
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`;
  }, [current?.trailer_url]);

  const handlePrev = useCallback(() => {
    setSelectedIndex((prev) => (prev === 0 ? spotlights.length - 1 : prev - 1));
  }, [spotlights.length]);

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev + 1) % spotlights.length);
  }, [spotlights.length]);

  return (
    <div
      className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.1] bg-[#0c0e15] mb-6 select-none shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-all duration-300"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* ── Ambient Studio Glow Aura ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div
          className={cn(
            "absolute -top-24 left-1/3 w-[650px] h-[380px] blur-[140px] rounded-full transition-colors duration-700",
            isMarvel ? "bg-red-600/[0.08]" : "bg-sky-600/[0.08]",
          )}
        />
      </div>

      {/* ── Background Backdrop Layer (Crystal Clear Artwork with Precision Asymmetric Shadow) ── */}
      <div className="absolute inset-0 z-0">
        {spotlights.map((item, idx) => {
          const isActive = idx === selectedIndex;
          return (
            <div
              key={item.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-700 ease-in-out",
                isActive
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none",
              )}
            >
              {/* Main high-resolution backdrop - Bright and razor-sharp */}
              <Image
                src={item.heroBackdrop}
                alt={item.name}
                fill
                priority={idx === 0}
                className={cn(
                  "object-cover object-[center_20%] lg:object-[center_18%] filter brightness-[0.98] contrast-[1.05] transition-transform duration-1000 ease-out",
                  isActive ? "scale-100" : "scale-105",
                )}
                sizes="100vw"
              />

              {/* Cinematic Left Shadow: ensures text legibility on the left while leaving the character/action completely clear in the center & right */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0c10] via-[#0a0c10]/85 via-35% sm:via-30% to-transparent to-75% pointer-events-none" />

              {/* Cinematic Bottom Shadow: smooth melt into page background without obstructing center artwork */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10]/50 via-15% to-transparent to-45% pointer-events-none" />

              {/* Subtle Top Vignette for brand badge contrast */}
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#0a0c10]/60 to-transparent pointer-events-none" />
            </div>
          );
        })}
      </div>

      {/* ── Main Single-Zone Cinematic Content Canvas ── */}
      <div className="relative z-10 flex flex-col justify-between min-h-[440px] sm:min-h-[480px] lg:min-h-[520px] px-5 sm:px-8 lg:px-12 pt-6 sm:pt-8 pb-5 sm:pb-6">
        {/* Top Row: Floating Universe Brand Capsule */}
          {/* Universe Official Brand Logo (Original Logo, no custom container wrapper) */}
          <div className="flex items-center select-none ml-0.5 sm:ml-1">
            {isMarvel ? (
              // Official Marvel Brand Logo
              <div className="relative h-7 sm:h-9 md:h-10 w-20 sm:w-24 md:w-28 shrink-0">
                <Image
                  src="/images/logos/marvel-logo.svg"
                  alt="Marvel"
                  fill
                  priority
                  sizes="(max-width: 640px) 80px, 112px"
                  className="object-contain object-left"
                />
              </div>
            ) : (
              // Official DC Comics Vector Logo
              <div className="relative h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 shrink-0">
                <Image
                  src="/images/logos/dc-logo.svg"
                  alt="DC Comics"
                  fill
                  priority
                  sizes="(max-width: 640px) 48px, 56px"
                  className="object-contain object-left"
                />
              </div>
            )}
          </div>

        {/* Center / Lower-Left: Featured Movie Information & CTA */}
        <div className="my-auto py-6 sm:py-8 max-w-2xl space-y-3.5 sm:space-y-4">
          {/* Movie Title Logo or Crisp Typography */}
          <div>
            {current.titleLogo ? (
              <div className="relative h-16 sm:h-24 md:h-28 lg:h-32 xl:h-36 w-72 sm:w-96 md:w-[420px] lg:w-[480px] xl:w-[520px] max-w-full">
                <Image
                  src={current.titleLogo}
                  alt={current.name}
                  fill
                  sizes="(max-width: 768px) 320px, 520px"
                  className="object-contain object-left filter drop-shadow-[0_10px_30px_rgba(0,0,0,0.95)]"
                  priority
                />
              </div>
            ) : (
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-[0_4px_14px_rgba(0,0,0,0.9)] leading-tight">
                {current.name}
              </h2>
            )}

            {/* Subtitle with English name and release year */}
            <p className="text-xs sm:text-sm font-semibold text-neutral-300 mt-1.5 drop-shadow-sm flex items-center gap-2">
              <span>{current.origin_name}</span>
              <span className="text-white/30">•</span>
              <span className="text-neutral-400">{current.year}</span>
            </p>
          </div>

          {/* Key Meta Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
            <span className="flex items-center gap-1 font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2.5 py-0.5 rounded-md shadow-sm">
              <Star size={11} fill="currentColor" />
              {current.rating} TMDB
            </span>
            <span className="font-medium text-neutral-300 bg-[#141720] border border-white/10 px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
              <Volume2 size={11} className="text-neutral-400" />
              {current.lang}
            </span>
          </div>

          {/* Synopsis Description */}
          <p className="text-xs sm:text-sm text-neutral-200/90 leading-relaxed max-w-xl line-clamp-2 sm:line-clamp-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {current.content}
          </p>

          {/* CTA Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
            <Link
              href={`/watch/${current.slug}`}
              className="inline-flex items-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm bg-white text-black hover:bg-neutral-100 shadow-lg shadow-black/40 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] cursor-pointer group"
            >
              <Play
                size={15}
                fill="currentColor"
                className="transition-transform group-hover:scale-110"
              />
              <span>Xem Phim Ngay</span>
            </Link>

            {trailerEmbedUrl && (
              <button
                type="button"
                onClick={() => setShowTrailerModal(true)}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm text-white bg-[#181b24] hover:bg-[#232836] border border-white/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md"
              >
                <Film size={15} />
                <span>Xem Trailer</span>
              </button>
            )}

            <Link
              href={`/film/${current.slug}`}
              className="inline-flex items-center gap-1 px-3.5 py-2.5 sm:py-3 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white transition-all duration-200 cursor-pointer hover:bg-white/5"
            >
              <span>Chi tiết</span>
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>

        {/* Bottom Row: Carousel Controller (Prev/Next + Clean Thumbnails + Indicator Pills) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/[0.08]">
          {/* Active Film Counter & Title snippet */}
          <div className="flex items-center gap-2 text-xs text-neutral-300">
            <span className="font-mono font-bold text-white">
              0{selectedIndex + 1}
            </span>
            <span className="text-neutral-500">/</span>
            <span className="font-mono text-neutral-400">
              0{spotlights.length}
            </span>
            <span className="text-white/20">•</span>
            <span className="font-semibold text-white/90 truncate max-w-[220px] sm:max-w-xs">
              {current.name}
            </span>
          </div>

          {/* Navigation Controls: Mini Thumbnails + Arrow Chevrons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Desktop Quick Mini Thumbnail Preview Strip */}
            <div className="hidden md:flex items-center gap-2">
              {spotlights.map((item, idx) => {
                const isActive = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    title={item.name}
                    className={cn(
                      "relative w-14 lg:w-16 h-8 lg:h-9 rounded-lg overflow-hidden border transition-all duration-200 cursor-pointer group bg-black/40 shrink-0",
                      isActive
                        ? "border-white ring-2 ring-white/40 shadow-lg scale-105 opacity-100"
                        : "border-white/10 hover:border-white/30 opacity-60 hover:opacity-100 scale-100",
                    )}
                  >
                    <Image
                      src={item.heroBackdrop}
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-cover object-center group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white shadow-sm" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile / Tablet Pagination Dots */}
            <div className="flex md:hidden items-center gap-1.5">
              {spotlights.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                    idx === selectedIndex
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/30 hover:bg-white/60",
                  )}
                  aria-label={`Chuyển đến phim ${idx + 1}`}
                />
              ))}
            </div>

            {/* Prev & Next Arrow Buttons */}
            <div className="flex items-center gap-1 pl-1">
              <button
                type="button"
                onClick={handlePrev}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-white bg-black/40 hover:bg-black/60 border border-white/10 backdrop-blur-sm transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
                aria-label="Phim trước"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-white bg-black/40 hover:bg-black/60 border border-white/10 backdrop-blur-sm transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
                aria-label="Phim kế tiếp"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Docked Sub-Franchise Filter Bar (At the bottom of the banner) ── */}
      <div className="relative z-10 px-4 sm:px-8 lg:px-12 py-3 bg-black/50 backdrop-blur-md border-t border-white/[0.08] flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 mr-1.5">
          Phân nhánh:
        </span>
        {subFranchises.map((sub) => {
          const isActive = activeSubFranchise === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => onSelectSubFranchise(sub.id)}
              className={cn(
                "px-3.5 py-1 rounded-xl text-xs whitespace-nowrap transition-all duration-200 cursor-pointer select-none shrink-0 border",
                isActive
                  ? "bg-white text-black border-white shadow-sm font-bold"
                  : "bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/[0.08] border-white/[0.08] font-medium",
              )}
            >
              {sub.label}
            </button>
          );
        })}
      </div>

      {/* ── Official Studio Trailer Lightbox Modal ── */}
      {showTrailerModal && trailerEmbedUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-[#11131a] rounded-2xl overflow-hidden border border-white/15 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Film
                  size={16}
                  className={isMarvel ? "text-red-400" : "text-sky-400"}
                />
                <span className="text-xs sm:text-sm font-bold text-white">
                  Trailer Chính Thức: {current.name} ({current.origin_name})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowTrailerModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Video Player Embed (Strict Origin Security) */}
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={trailerEmbedUrl}
                title={`Trailer ${current.name}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
