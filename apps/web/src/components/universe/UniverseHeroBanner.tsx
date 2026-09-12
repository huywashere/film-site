"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Film, Sparkles, X, ChevronRight, ShieldCheck, Flame, Star, Volume2 } from "lucide-react";
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

  // Auto slide every 8s when not hovering
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

  return (
    <div
      className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.08] bg-[#0c0e15] mb-6 select-none shadow-2xl transition-all duration-300"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* ── Dynamic Ambient Glow Aura (Đồng bộ trang chủ) ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-24 left-1/4 w-[600px] h-[350px] bg-white/[0.025] blur-[120px] rounded-full" />
      </div>

      {/* ── Background Backdrop Layer (Smooth crossfade) ── */}
      <div className="absolute inset-0 z-0">
        {spotlights.map((item, idx) => (
          <div
            key={item.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-in-out",
              idx === selectedIndex ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none",
            )}
            style={{
              transitionProperty: "opacity, transform",
            }}
          >
            <Image
              src={item.heroBackdrop}
              alt={item.name}
              fill
              priority={idx === 0}
              className="object-cover object-[center_28%] opacity-35 filter brightness-[0.75] contrast-[1.05]"
              sizes="100vw"
            />
            {/* Vignette gradients to integrate smoothly into dark palette */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e15] via-[#0c0e15]/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c0e15] via-[#0c0e15]/85 to-transparent" />
          </div>
        ))}
      </div>

      {/* ── Main Dual-Zone Showcase Content ── */}
      <div className="relative z-10 px-4 sm:px-8 lg:px-10 pt-6 sm:pt-8 pb-5 sm:pb-6">
        {/* ── 1. Exclusive Universe Logo Banner Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 sm:pb-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            {isMarvel ? (
              // ── Marvel Studios Official Logo Banner ──
              <div className="flex items-center tracking-tighter select-none">
                <div className="bg-[#e62429] text-white px-2.5 py-0.5 sm:px-3 sm:py-1 font-black text-sm sm:text-base lg:text-lg uppercase tracking-wider rounded-l shadow-sm">
                  MARVEL
                </div>
                <div className="bg-black/70 backdrop-blur-md text-white px-2 sm:px-2.5 py-0.5 sm:py-1 font-bold text-sm sm:text-base lg:text-lg uppercase tracking-widest rounded-r border border-white/20 border-l-0">
                  STUDIOS
                </div>
              </div>
            ) : (
              // ── DC Universe Official Minimalist Logo Banner ──
              <div className="flex items-center gap-2.5 select-none">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0055ff] flex items-center justify-center shadow-md">
                  <span className="text-white font-black text-xs sm:text-sm tracking-tight">DC</span>
                </div>
                <span className="font-black text-sm sm:text-base lg:text-lg tracking-wider text-white uppercase">
                  DC UNIVERSE
                </span>
              </div>
            )}

            <div className="hidden sm:block h-4 w-[1px] bg-white/20" />

            <span className="text-xs sm:text-sm font-medium tracking-wide text-neutral-400">
              {isMarvel ? "Multiverse Saga • Siêu Anh Hùng" : "Gods & Monsters • Thế Giới Siêu Anh Hùng"}
            </span>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-neutral-300">
            <Sparkles size={12} className={isMarvel ? "text-red-400" : "text-sky-400"} />
            <span>{isMarvel ? "175+ Bom Tấn Marvel" : "180+ Kiệt Tác DC"}</span>
            <span className="text-white/20">•</span>
            <span>4K Ultra HD</span>
          </div>
        </div>

        {/* ── 2. Cinematic Showcase Body: Left Spotlight + Right Marquee Cards ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 pt-5 sm:pt-6 items-center min-h-[260px] sm:min-h-[290px]">
          {/* Left Column: Spotlight Marquee Film Details (7 Cols) */}
          <div className="lg:col-span-7 space-y-3 sm:space-y-4">
            {/* Spotlight Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white bg-white/[0.06] border border-white/10 backdrop-blur-md shadow-sm">
              <Flame size={12} className="text-amber-400" />
              <span>{current.spotlightBadge}</span>
            </div>

            {/* Title / Title Logo TMDB */}
            <div>
              {current.titleLogo ? (
                <div className="relative h-12 sm:h-16 lg:h-20 w-56 sm:w-72 lg:w-80">
                  <Image
                    src={current.titleLogo}
                    alt={current.name}
                    fill
                    sizes="320px"
                    className="object-contain object-left filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                    priority
                  />
                </div>
              ) : (
                <div className="space-y-0.5">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight drop-shadow-md">
                    {current.name}
                  </h2>
                </div>
              )}
              <p className="text-xs sm:text-sm font-semibold text-neutral-400 mt-1">
                {current.origin_name} ({current.year})
              </p>
            </div>

            {/* Movie Meta Badges */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
              <span className="flex items-center gap-1 font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-md">
                <Star size={11} fill="currentColor" />
                {current.rating} TMDB
              </span>
              <span className="font-bold text-cyan-300 bg-cyan-400/10 border border-cyan-400/30 px-2 py-0.5 rounded-md">
                {current.quality}
              </span>
              <span className="font-medium text-neutral-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Volume2 size={11} className="text-neutral-400" />
                {current.lang}
              </span>
            </div>

            {/* Content Overview */}
            <p className="text-xs sm:text-sm text-neutral-300/90 leading-relaxed max-w-2xl line-clamp-2 sm:line-clamp-3">
              {current.content}
            </p>

            {/* CTA Action Buttons (NetPhim Standard Style) */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Link
                href={`/watch/${current.slug}`}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-extrabold text-xs sm:text-sm bg-white text-black hover:bg-white/90 shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Play size={14} fill="currentColor" />
                <span>Xem Phim Ngay</span>
              </Link>

              {trailerEmbedUrl && (
                <button
                  type="button"
                  onClick={() => setShowTrailerModal(true)}
                  className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-neutral-200 bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-md transition-all duration-200 hover:text-white cursor-pointer"
                >
                  <Film size={14} />
                  <span>Xem Trailer</span>
                </button>
              )}

              <Link
                href={`/film/${current.slug}`}
                className="inline-flex items-center gap-1 px-3 py-2 sm:py-2.5 text-xs text-neutral-400 hover:text-white transition-colors"
              >
                <span>Chi tiết</span>
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>

          {/* Right Column: Marquee Interactive Mini Slider (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-neutral-400 mb-2.5">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} className={isMarvel ? "text-red-400" : "text-sky-400"} />
                <span>Tâm điểm siêu phẩm ({spotlights.length})</span>
              </span>
              <span className="text-[10px] text-neutral-500">Bấm để đổi phim</span>
            </div>

            {/* Grid of Marquee Cards */}
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-3 gap-2">
              {spotlights.map((item, idx) => {
                const isActive = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={cn(
                      "relative rounded-xl overflow-hidden aspect-[16/10] border transition-all duration-200 cursor-pointer text-left group bg-[#12141c]",
                      isActive
                        ? "border-white/40 ring-1 ring-white/30 shadow-lg scale-[1.02]"
                        : "border-white/[0.08] hover:border-white/20 opacity-70 hover:opacity-100",
                    )}
                  >
                    <Image
                      src={item.heroBackdrop}
                      alt={item.name}
                      fill
                      sizes="180px"
                      className="object-cover object-center filter brightness-[0.75] group-hover:brightness-[0.95] transition-all"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute bottom-1.5 left-2 right-2">
                      <p className="text-[10px] sm:text-[11px] font-bold text-white truncate drop-shadow-sm">
                        {item.name}
                      </p>
                      <p className="text-[9px] text-neutral-400 truncate">
                        {item.year} • {item.rating}★
                      </p>
                    </div>
                    {/* Active Indicator Bar */}
                    {isActive && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/90" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 3. Sub-Franchise Filter Pills Bar ── */}
        <div className="mt-5 pt-3.5 border-t border-white/[0.08] flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
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
                  "px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer select-none shrink-0 border",
                  isActive
                    ? "bg-white text-black border-white shadow-sm font-black"
                    : "bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/[0.08] border-white/[0.08]",
                )}
              >
                {sub.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Official Studio Trailer Lightbox Modal ── */}
      {showTrailerModal && trailerEmbedUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-[#11131a] rounded-2xl overflow-hidden border border-white/15 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Film size={16} className={isMarvel ? "text-red-400" : "text-cyan-400"} />
                <span className="text-xs sm:text-sm font-bold text-white">
                  Trailer Chính Thức: {current.name} ({current.origin_name})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowTrailerModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Video Player Embed */}
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
