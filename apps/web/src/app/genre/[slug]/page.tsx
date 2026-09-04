"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Info,
  ChevronRight,
  ChevronLeft,
  Clapperboard,
  Volume2,
  VolumeX,
  Star,
} from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";

import { movieApi } from "@/lib/api";
import {
  FilmCard,
  FilmItem,
  FilmCardSkeleton,
} from "@/components/film/FilmCard";
import { Pagination } from "@/components/film/Pagination";
import { TrailerModal } from "@/components/film/TrailerModal";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import {
  CURATED_SCIFI_HERO_POOL,
  CURATED_WAR_HERO_POOL,
} from "@/lib/curated-genre-pools";
import { CuratedHeroMovie } from "@/lib/curated-hero-pool";
import { buildAsianHeroImageCandidates } from "@/lib/curated-asian-hero";

const GENRE_NAMES: Record<string, string> = {
  "vien-tuong": "Khoa Học Viễn Tưởng",
  "khoa-hoc-vien-tuong": "Khoa Học Viễn Tưởng",
  "chien-tranh": "Chiến Tranh & Lịch Sử",
  "lich-su": "Lịch Sử & Dã Sử",
  "hanh-dong": "Hành Động",
  "tinh-cam": "Tình Cảm",
  "hai-huoc": "Hài Hước",
  "co-trang": "Cổ Trang",
  "tam-ly": "Tâm Lý",
  "hinh-su": "Hình Sự",
  "vo-thuat": "Võ Thuật",
  "phieu-luu": "Phiêu Lưu",
  "kinh-di": "Kinh Dị",
  "bi-an": "Bí Ẩn",
  "am-nhac": "Âm Nhạc",
  "gia-dinh": "Gia Đình",
  "hoc-duong": "Học Đường",
  "than-thoai": "Thần Thoại",
  "the-thao": "Thể Thao",
  "tai-lieu": "Tài Liệu",
  "chinh-kich": "Chính Kịch",
};

// ── TABS CONFIGURATION (CLEAN TEXT - NO EMOJIS) ──
const SCIFI_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "space", label: "Vũ Trụ & Không Gian", keywords: ["vũ trụ", "không gian", "space", "sao hỏa", "hố đen", "interstellar", "dune", "avatar"] },
  { id: "ai", label: "Trí Tuệ Nhân Tạo & Cyberpunk", keywords: ["trí tuệ", "robot", "cyberpunk", "ma trận", "matrix", "máy móc", "công nghệ"] },
  { id: "timetravel", label: "Du Hành Thời Gian", keywords: ["thời gian", "vòng lặp", "time", "inception", "tenet", "luân hồi", "đa vũ trụ"] },
  { id: "action", label: "Siêu Anh Hùng & Hành Động", keywords: ["siêu anh hùng", "avengers", "hành động", "action", "marvel", "chiến đấu"] },
  { id: "alien", label: "Sinh Vật Vũ Trụ", keywords: ["quái vật", "alien", "ngoài hành tinh", "sinh vật", "romulus", "predator"] },
];

const WAR_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "ww2", label: "Thế Chiến II & Quân Sự", keywords: ["thế chiến", "thế chiến ii", "quân đội", "fury", "dunkirk", "ryan", "chiến dịch", "tăng"] },
  { id: "epic", label: "Đại Kỷ Nguyên & Lịch Sử", keywords: ["lịch sử", "oppenheimer", "kỷ nguyên", "danh nhân", "hào hùng", "vương triều"] },
  { id: "ancient", label: "Chiến Tranh Cổ Đại", keywords: ["cổ đại", "võ sĩ", "giác đấu", "gladiator", "la mã", "troy", "300", "kiếm"] },
  { id: "drama", label: "Tâm Lý & Hòa Bình", keywords: ["tâm lý", "hòa bình", "nỗi đau", "con người", "schindler", "pianist", "sinh tồn"] },
  { id: "sniper", label: "Bắn Tỉa & Đặc Nhiệm", keywords: ["bắn tỉa", "sniper", "đặc nhiệm", "1917", "diều hâu", "black hawk", "sát thủ"] },
];

function stripEmojis(str?: string): string {
  if (!str) return "";
  return str.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "").trim();
}

function extractYouTubeKey(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match) return match[1];
  if (/^[\w-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

function getBaseTitle(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/\(phần\s*\d+\)/gi, "")
    .replace(/phần\s*\d+/gi, "")
    .replace(/season\s*\d+/gi, "")
    .replace(/\(vietsub\)/gi, "")
    .replace(/\(thuyết\s*minh\)/gi, "")
    .replace(/\(lồng\s*tiếng\)/gi, "")
    .replace(/\(fhd\)/gi, "")
    .replace(/\(hd\)/gi, "")
    .replace(/[^a-z0-9\s]/gi, "")
    .trim();
}

function dedupeFilms(primary: FilmItem[], fallback: FilmItem[] = [], limit = 16): FilmItem[] {
  const seen = new Set<string>();
  const result: FilmItem[] = [];

  const add = (f: FilmItem) => {
    if (!f) return;
    const key = (f.slug || f._id || (f as any).id || "").toLowerCase();
    const base = getBaseTitle(f.name || f.title || "");
    if (key && !seen.has(key) && (!base || !seen.has(base))) {
      seen.add(key);
      if (base) seen.add(base);
      result.push(f);
    }
  };

  primary.forEach(add);
  fallback.forEach(add);
  return result.slice(0, limit);
}

// ── REUSABLE SWIPER ROW COMPONENT ──
function GenreCategoryRow({
  title,
  films,
  isLoading,
}: {
  title: string;
  films: FilmItem[];
  isLoading: boolean;
}) {
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (!isLoading && !films.length) return null;

  return (
    <div className="mb-8 group/row relative" aria-busy={isLoading}>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-base sm:text-lg md:text-xl font-bold text-white tracking-tight">
          {title}
        </h2>
      </div>

      <div className="relative w-full overflow-hidden">
        {/* Left Arrow */}
        <button
          ref={prevRef}
          aria-label="Previous slide"
          className="hidden sm:flex absolute left-0 top-0 bottom-0 z-30 w-11 bg-black/75 hover:bg-black/90 text-white items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer disabled:hidden rounded-r-md"
        >
          <ChevronLeft size={30} strokeWidth={2.5} />
        </button>

        {/* Right Arrow */}
        <button
          ref={nextRef}
          aria-label="Next slide"
          className="hidden sm:flex absolute right-0 top-0 bottom-0 z-30 w-11 bg-black/75 hover:bg-black/90 text-white items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer disabled:hidden rounded-l-md"
        >
          <ChevronRight size={30} strokeWidth={2.5} />
        </button>

        <Swiper
          modules={[Navigation, FreeMode]}
          onBeforeInit={(swiper) => {
            if (
              swiper.params.navigation &&
              typeof swiper.params.navigation !== "boolean"
            ) {
              swiper.params.navigation.prevEl = prevRef.current;
              swiper.params.navigation.nextEl = nextRef.current;
            }
          }}
          navigation={{
            prevEl: prevRef.current,
            nextEl: nextRef.current,
          }}
          speed={600}
          slidesPerGroup={4}
          spaceBetween={8}
          slidesPerView={4}
          breakpoints={{
            0: { slidesPerView: 3.5, spaceBetween: 8 },
            480: { slidesPerView: 4.2, spaceBetween: 10 },
            640: { slidesPerView: 5.2, spaceBetween: 12 },
            768: { slidesPerView: 5.8, spaceBetween: 14 },
            1024: { slidesPerView: 6.8, spaceBetween: 16 },
            1280: { slidesPerView: 7.8, spaceBetween: 16 },
          }}
          freeMode={{ enabled: true, momentumRatio: 0.8 }}
          className="!py-2 !px-1 w-full"
        >
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <SwiperSlide key={`sk-${i}`}>
                  <FilmCardSkeleton hideDetails={false} />
                </SwiperSlide>
              ))
            : films.map((film, idx) => (
                <SwiperSlide key={`${film.slug || film._id || (film as any).id}-${idx}`}>
                  <FilmCard film={film} hideDetails={false} />
                </SwiperSlide>
              ))}
        </Swiper>
      </div>
    </div>
  );
}

// ── RESILIENT HERO MEDIA COMPONENTS ──
function ResilientGenreHeroBackdrop({
  item,
  isPlayingVideo,
  ytKey,
}: {
  item: CuratedHeroMovie;
  isPlayingVideo: boolean;
  ytKey: string | null;
}) {
  const candidates = useMemo(() => {
    const directList = [item.heroBackdrop, item.thumb_url, item.poster_url].filter(Boolean) as string[];
    const all: string[] = [];
    for (const url of directList) {
      for (const cand of buildAsianHeroImageCandidates(url)) {
        if (!all.includes(cand)) all.push(cand);
      }
    }
    return all;
  }, [item.heroBackdrop, item.thumb_url, item.poster_url]);

  const [candidateIdx, setCandidateIdx] = useState(0);

  useEffect(() => {
    setCandidateIdx(0);
  }, [item.slug, item.heroBackdrop, item.thumb_url, item.poster_url]);

  const currentSrc = candidates[candidateIdx] || item.heroBackdrop || item.thumb_url || "";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={`${item.slug}-backdrop-${candidateIdx}`}
      src={currentSrc}
      alt={item.name}
      referrerPolicy="strict-origin-when-cross-origin"
      crossOrigin="anonymous"
      loading="eager"
      decoding="async"
      fetchPriority="high"
      onError={() => {
        if (candidateIdx < candidates.length - 1) {
          setCandidateIdx((prev) => prev + 1);
        }
      }}
      className={cn(
        "w-full h-full object-cover object-center transition-opacity duration-1000",
        isPlayingVideo && ytKey
          ? "opacity-0"
          : "opacity-100 brightness-[0.82] contrast-[1.06]",
      )}
    />
  );
}

function ResilientGenreHeroLogo({
  item,
}: {
  item: CuratedHeroMovie;
}) {
  const candidates = useMemo(() => {
    return buildAsianHeroImageCandidates(item.titleLogo);
  }, [item.titleLogo]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const [hasFailedAll, setHasFailedAll] = useState(false);

  useEffect(() => {
    setCandidateIdx(0);
    setHasFailedAll(false);
  }, [item.slug, item.titleLogo]);

  const currentLogoSrc = candidates[candidateIdx];

  if (!currentLogoSrc || hasFailedAll) {
    return (
      <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none drop-shadow-[0_12px_28px_rgba(0,0,0,0.95)]">
        {item.name}
      </h1>
    );
  }

  return (
    <div className="relative w-56 sm:w-80 md:w-[460px] lg:w-[540px] h-16 sm:h-28 md:h-40 lg:h-48 flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${item.slug}-logo-${candidateIdx}`}
        src={currentLogoSrc}
        alt={item.name}
        loading="eager"
        decoding="async"
        referrerPolicy="strict-origin-when-cross-origin"
        crossOrigin="anonymous"
        onError={() => {
          if (candidateIdx < candidates.length - 1) {
            setCandidateIdx((prev) => prev + 1);
          } else {
            setHasFailedAll(true);
          }
        }}
        className="max-h-full max-w-full object-contain object-left drop-shadow-[0_12px_32px_rgba(0,0,0,0.95)]"
      />
    </div>
  );
}

// ── NETFLIX-GRADE CINEMATIC HERO BANNER COMPONENT ──
function GenreCuratedHeroBanner({
  pool,
  genreLabel,
  onOpenTrailer,
}: {
  pool: CuratedHeroMovie[];
  genreLabel: string;
  onOpenTrailer: (name: string, url?: string) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  const currentItem = pool[currentIndex] || pool[0];
  const ytKey = useMemo(() => extractYouTubeKey(currentItem?.trailer_url), [currentItem?.trailer_url]);

  useEffect(() => {
    setIsPlayingVideo(false);

    // Preload next slide assets via edge CDN for instant transitions
    if (typeof window !== "undefined" && pool?.length > 1) {
      const nextIndex = (currentIndex + 1) % pool.length;
      const nextItem = pool[nextIndex];
      if (nextItem?.heroBackdrop) {
        const cands = buildAsianHeroImageCandidates(nextItem.heroBackdrop);
        if (cands[0]) {
          const img = new Image();
          img.referrerPolicy = "strict-origin-when-cross-origin";
          img.crossOrigin = "anonymous";
          img.src = cands[0];
        }
      }
      if (nextItem?.titleLogo) {
        const logoCands = buildAsianHeroImageCandidates(nextItem.titleLogo);
        if (logoCands[0]) {
          const logo = new Image();
          logo.referrerPolicy = "strict-origin-when-cross-origin";
          logo.crossOrigin = "anonymous";
          logo.src = logoCands[0];
        }
      }
    }

    // After 1.8s on slide, start playing the background video trailer (Netflix style, desktop only)
    const videoTimer = setTimeout(() => {
      if (ytKey && typeof window !== "undefined" && window.innerWidth >= 1024) {
        setIsPlayingVideo(true);
      }
    }, 1800);

    return () => clearTimeout(videoTimer);
  }, [currentIndex, ytKey, pool]);

  useEffect(() => {
    if (pool.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % pool.length);
    }, 9000);
    return () => clearInterval(interval);
  }, [pool.length, isPaused]);

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % pool.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + pool.length) % pool.length);
  };

  return (
    <section
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full min-h-[600px] sm:min-h-[740px] lg:min-h-[860px] h-[86vh] sm:h-[95vh] lg:h-[100vh] max-h-[1080px] overflow-hidden bg-[#0a0b10] select-none"
    >
      {/* ── Background Media: Live Video Trailer or Dynamic Backdrop ── */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {/* Backdrop Image with Resilient Edge Multi-Tier Proxy */}
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={`backdrop-${currentItem.slug || currentIndex}`}
            custom={direction}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 w-full h-full"
          >
            <ResilientGenreHeroBackdrop
              item={currentItem}
              isPlayingVideo={isPlayingVideo}
              ytKey={ytKey}
            />
          </motion.div>
        </AnimatePresence>

        {/* Netflix-Style Live Background Trailer (Desktop only) */}
        {ytKey && isPlayingVideo && (
          <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none transition-opacity duration-1000">
            <iframe
              src={`https://www.youtube.com/embed/${ytKey}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&rel=0&playsinline=1&modestbranding=1&loop=1&playlist=${ytKey}&enablejsapi=1`}
              title={currentItem.name}
              allow="autoplay; encrypted-media"
              referrerPolicy="strict-origin-when-cross-origin"
              className="w-full h-full object-cover scale-[1.38] brightness-[0.78] contrast-[1.08] transition-opacity duration-700"
            />
          </div>
        )}
      </div>

      {/* ── Cinematic Netflix Multi-Layer Vignette Gradients ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            linear-gradient(to right, #0a0b10 0%, rgba(10,11,16,0.92) 28%, rgba(10,11,16,0.55) 55%, transparent 80%),
            linear-gradient(to top, #0a0b10 0%, rgba(10,11,16,0.85) 24%, transparent 58%),
            linear-gradient(to bottom, rgba(10,11,16,0.7) 0%, transparent 22%)
          `,
        }}
      />

      {/* ── Left Content Overlay (Netflix Layout) ── */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-end sm:justify-center px-4 sm:px-14 md:px-20 lg:px-24 pb-16 sm:pb-20 lg:pb-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentItem.slug || currentIndex}
            custom={direction}
            initial={{ x: direction > 0 ? -30 : 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? 20 : -20, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl space-y-2.5 sm:space-y-4.5 lg:space-y-5 pointer-events-auto"
          >
            {/* Large Netflix-Scale Title Logo PNG or Bold Typography */}
            <ResilientGenreHeroLogo item={currentItem} />

            {/* Clean Prominent Subtitle */}
            <p className="text-xs sm:text-base md:text-lg text-neutral-200 font-semibold tracking-wide drop-shadow truncate max-w-xl">
              {currentItem.name} {currentItem.origin_name ? `• ${currentItem.origin_name}` : ""}
            </p>

            {/* Enhanced Metadata Row: IMDb | TMDB | Year | Movie Genres | Audio */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[11px] sm:text-sm md:text-base font-semibold text-neutral-200">
              {/* IMDb Rating Chip */}
              <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-neutral-900/80 border border-white/15 backdrop-blur-md shadow-sm">
                <Star size={12} className="sm:w-3.5 sm:h-3.5 fill-[#f5c518] text-[#f5c518] shrink-0" />
                <span className="text-white font-extrabold text-[11px] sm:text-sm tracking-tight">
                  {(currentItem.imdb_rating || currentItem.vote_average || 8.5).toFixed(1)}
                </span>
                <span className="text-[9px] sm:text-[11px] font-bold text-neutral-400 uppercase tracking-wider">IMDb</span>
              </div>

              {/* TMDB Rating Chip */}
              <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-neutral-900/80 border border-white/15 backdrop-blur-md shadow-sm">
                <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-gradient-to-tr from-[#90cea1] to-[#01b4e4] flex items-center justify-center shrink-0 p-[1.5px] sm:p-[2px]">
                  <div className="w-full h-full rounded-full bg-[#12141c]" />
                </div>
                <span className="text-cyan-300 font-extrabold text-[11px] sm:text-sm tracking-tight">
                  {Math.round((currentItem.tmdb_rating || (currentItem.tmdb as any)?.vote_average || currentItem.vote_average || 8.0) * 10)}%
                </span>
                <span className="text-[9px] sm:text-[11px] font-bold text-neutral-400 uppercase tracking-wider">TMDB</span>
              </div>

              <span className="text-white font-bold">{currentItem.year}</span>

              <span className="text-neutral-500">•</span>

              {/* Specific genres for this movie (max 3 on mobile for clean inline wrap) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(currentItem.genres && currentItem.genres.length > 0
                  ? currentItem.genres.slice(0, 3)
                  : [genreLabel]
                ).map((genreName, gIdx, arr) => (
                  <span
                    key={gIdx}
                    className="text-cyan-300 font-semibold"
                  >
                    {genreName}
                    {gIdx < arr.length - 1 && (
                      <span className="text-neutral-500 ml-1.5">•</span>
                    )}
                  </span>
                ))}
              </div>

              <span className="text-neutral-500 hidden sm:inline">•</span>
              <span className="text-neutral-300 hidden sm:inline">{currentItem.lang || "Vietsub + Thuyết Minh"}</span>
            </div>

            {/* Large Prominent Synopsis Description */}
            <p className="line-clamp-2 sm:line-clamp-3 md:line-clamp-4 text-xs sm:text-base md:text-lg text-neutral-200 font-normal leading-relaxed drop-shadow max-w-2xl">
              {currentItem.content}
            </p>

            {/* Prominent Netflix Action Buttons */}
            <div className="flex items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2">
              <Link
                href={`/film/${currentItem.slug}`}
                className="inline-flex items-center gap-2 sm:gap-3 px-5 sm:px-9 py-2.5 sm:py-3.5 rounded-lg bg-white hover:bg-neutral-100 text-black font-black text-sm sm:text-lg transition-all shadow-2xl hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Play size={16} className="sm:w-5 sm:h-5" fill="currentColor" />
                <span>Xem Phim</span>
              </Link>

              {currentItem.trailer_url && (
                <button
                  type="button"
                  onClick={() => onOpenTrailer(currentItem.name, currentItem.trailer_url)}
                  className="inline-flex items-center gap-2 px-4 sm:px-7 py-2.5 sm:py-3.5 rounded-lg bg-neutral-900/85 hover:bg-neutral-800 text-white font-bold text-sm sm:text-lg backdrop-blur-md border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                >
                  <Clapperboard size={16} className="sm:w-[19px] sm:h-[19px]" />
                  <span>Trailer</span>
                </button>
              )}

              <Link
                href={`/film/${currentItem.slug}`}
                className="hidden sm:inline-flex items-center gap-2 px-6 py-3 sm:py-3.5 rounded-lg bg-neutral-900/85 hover:bg-neutral-800 text-neutral-200 hover:text-white font-bold text-base sm:text-lg backdrop-blur-md border border-white/20 transition-all shadow-lg"
              >
                <Info size={19} />
                <span>Chi Tiết</span>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom Controls: Sound Toggle, Maturity Rating & Slide Chevrons ── */}
      <div className="absolute right-3 sm:right-12 bottom-3 sm:bottom-10 z-30 pointer-events-auto flex items-center gap-2 sm:gap-3 select-none">
        {/* Sound Toggle (Mute / Unmute) */}
        {ytKey && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted((prev) => !prev);
            }}
            aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
            title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-white/40 bg-black/60 hover:bg-black/90 flex items-center justify-center text-white backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-lg pointer-events-auto"
          >
            {isMuted ? <VolumeX size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Volume2 size={16} className="sm:w-[18px] sm:h-[18px]" />}
          </button>
        )}

        {/* Maturity Rating Badge */}
        <div className="hidden sm:flex items-center border-l-4 border-white/70 bg-black/60 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold tracking-widest text-neutral-200 uppercase pointer-events-none">
          T16 • RẠP
        </div>

        {/* Slide Chevrons */}
        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border border-white/20 shadow-lg pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Previous movie"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer pointer-events-auto"
          >
            <ChevronLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>

          <span className="text-[11px] sm:text-xs font-mono font-bold text-neutral-300 px-1 select-none">
            {currentIndex + 1} / {pool.length}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Next movie"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer pointer-events-auto"
          >
            <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
        </div>
      </div>
    </section>
  );
}

// ── MAIN GENRE PAGE COMPONENT ──
export default function GenrePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const page = Number(searchParams.get("page") || 1);
  const label = GENRE_NAMES[slug] || slug;

  const isSciFiPage = slug === "vien-tuong" || slug === "khoa-hoc-vien-tuong";
  const isWarPage = slug === "chien-tranh";
  const isShowcasePage = isSciFiPage || isWarPage;

  const [activeTab, setActiveTab] = useState("all");
  const [trailerState, setTrailerState] = useState<{
    isOpen: boolean;
    filmName?: string;
    trailerUrl?: string;
  }>({ isOpen: false });

  const handleOpenTrailer = (filmName: string, trailerUrl?: string) => {
    setTrailerState({
      isOpen: true,
      filmName,
      trailerUrl,
    });
  };

  // Main Page Query
  const { data, isLoading } = useQuery({
    queryKey: ["genre", slug, page],
    queryFn: () => movieApi.getByGenre(slug, page).then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  });

  // Page 2 Query for Showcase Hubs
  const { data: page2Data } = useQuery({
    queryKey: ["genre-page-2", slug],
    queryFn: () => movieApi.getByGenre(slug, 2).then((r) => r.data),
    enabled: isShowcasePage,
    staleTime: 30 * 60 * 1000,
  });

  // Thematic Auxiliary Queries for Multi-Row Diversity
  const { data: auxData1 } = useQuery({
    queryKey: ["genre-aux-1", isSciFiPage ? "phieu-luu" : "lich-su"],
    queryFn: () =>
      movieApi.getByGenre(isSciFiPage ? "phieu-luu" : "lich-su", 1).then((r) => r.data),
    enabled: isShowcasePage,
    staleTime: 30 * 60 * 1000,
  });

  const { data: auxData2 } = useQuery({
    queryKey: ["genre-aux-2", isSciFiPage ? "hanh-dong" : "tam-ly"],
    queryFn: () =>
      movieApi.getByGenre(isSciFiPage ? "hanh-dong" : "tam-ly", 1).then((r) => r.data),
    enabled: isShowcasePage,
    staleTime: 30 * 60 * 1000,
  });

  const rawFilms: FilmItem[] = data?.data?.items || data?.items || [];
  const rawPage2: FilmItem[] = page2Data?.data?.items || page2Data?.items || [];
  const rawAux1: FilmItem[] = auxData1?.data?.items || auxData1?.items || [];
  const rawAux2: FilmItem[] = auxData2?.data?.items || auxData2?.items || [];

  const heroPool = isSciFiPage
    ? CURATED_SCIFI_HERO_POOL
    : isWarPage
      ? CURATED_WAR_HERO_POOL
      : [];

  const tabs = isSciFiPage ? SCIFI_TABS : isWarPage ? WAR_TABS : [];

  // Filtered films for the full catalog grid based on active tab
  const filteredCatalogFilms = useMemo(() => {
    if (activeTab === "all") return rawFilms;
    const tabObj = tabs.find((t) => t.id === activeTab);
    if (!tabObj || !tabObj.keywords) return rawFilms;

    const keywords = tabObj.keywords;
    const matched = rawFilms.filter((f) => {
      if (!f) return false;
      const name = (f.name || "").toLowerCase();
      const origin = (f.origin_name || "").toLowerCase();
      const slug = (f.slug || "").toLowerCase();
      const type = (f.type || "").toLowerCase();
      for (const kw of keywords) {
        const lk = kw.toLowerCase();
        if (name.includes(lk) || origin.includes(lk) || slug.includes(lk) || type.includes(lk)) {
          return true;
        }
      }
      if (Array.isArray(f.category)) {
        for (const c of f.category) {
          const cName = (c?.name || "").toLowerCase();
          const cSlug = (c?.slug || "").toLowerCase();
          for (const kw of keywords) {
            const lk = kw.toLowerCase();
            if (cName.includes(lk) || cSlug.includes(lk)) return true;
          }
        }
      }
      return false;
    });
    return matched.length >= 6 ? matched : rawFilms;
  }, [rawFilms, activeTab, tabs]);

  // Curated Multi-Category Swiper Rows
  const { row1Films, row2Films, row3Films, row4Films, row5Films, row6Films } =
    useMemo(() => {
      if (!isShowcasePage) {
        return {
          row1Films: [],
          row2Films: [],
          row3Films: [],
          row4Films: [],
          row5Films: [],
          row6Films: [],
        };
      }

      // Row 1: Mới cập nhật & Đang thịnh hành
      const r1 = dedupeFilms(rawFilms, rawPage2, 16);

      // Row 2: Theme 1 (Không gian / Thế chiến II)
      const r2Source = isSciFiPage
        ? [...heroPool.slice(0, 4), ...rawAux1]
        : [...heroPool.slice(0, 4), ...rawPage2];
      const r2 = dedupeFilms(r2Source, rawFilms, 16);

      // Row 3: Theme 2 (AI Cyberpunk / Đại kỷ nguyên)
      const r3Source = isSciFiPage
        ? [...heroPool.slice(3, 7), ...rawPage2]
        : [...heroPool.slice(2, 6), ...rawAux1];
      const r3 = dedupeFilms(r3Source, rawAux2, 16);

      // Row 4: Theme 3 (Du hành thời gian / Chiến tranh cổ đại)
      const r4Source = isSciFiPage
        ? [...heroPool.slice(2, 6), ...rawAux2]
        : [...heroPool.slice(4, 8), ...rawAux2];
      const r4 = dedupeFilms(r4Source, rawFilms, 16);

      // Row 5: Theme 4 (Siêu anh hùng / Tâm lý bi hùng)
      const r5Source = isSciFiPage ? rawAux2 : rawAux2;
      const r5 = dedupeFilms(r5Source, rawPage2, 16);

      // Row 6: Tuyển chọn đặc sắc
      const r6 = dedupeFilms([...heroPool, ...rawPage2], rawFilms, 16);

      return {
        row1Films: r1,
        row2Films: r2,
        row3Films: r3,
        row4Films: r4,
        row5Films: r5,
        row6Films: r6,
      };
    }, [isShowcasePage, isSciFiPage, rawFilms, rawPage2, rawAux1, rawAux2, heroPool]);

  // Total items & Pagination
  const totalItems =
    Number(data?.data?.params?.pagination?.totalItems) ||
    Number(data?.params?.pagination?.totalItems) ||
    Number(data?.pagination?.totalItems) ||
    Number(data?.data?.paginate?.total_items) ||
    undefined;

  const rawTotal =
    Number(data?.data?.params?.pagination?.totalPages) ||
    Number(data?.params?.pagination?.totalPages) ||
    Number(data?.pagination?.totalPages) ||
    Number(data?.paginate?.total_page) ||
    Number(data?.data?.paginate?.total_page) ||
    (totalItems ? Math.ceil(totalItems / 24) : undefined);

  const totalPages = Math.max(1, rawTotal || (rawFilms.length > 0 ? 1 : 1));

  const handlePageChange = (newPage: number) => {
    router.push(`/genre/${slug}?page=${newPage}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className={cn(
        cardFont.className,
        "min-h-screen w-full bg-[#0a0b10] text-white",
        isShowcasePage ? "-mt-20 sm:-mt-24 pb-20" : "pb-20 pl-4 pr-4 pt-20 sm:pt-24 md:pr-10 lg:pl-24",
      )}
    >
      {/* ── CASE 1: SHOWCASE HUBS (Khoa Học Viễn Tưởng & Chiến Tranh) ── */}
      {isShowcasePage ? (
        <>
          {/* Netflix-Grade Cinematic Hero Banner */}
          <GenreCuratedHeroBanner
            pool={heroPool}
            genreLabel={label}
            onOpenTrailer={handleOpenTrailer}
          />

          {/* ── CATEGORY TABS BAR (MINIMALIST PILLS - NO EMOJIS) ── */}
          <div className="relative z-10 pl-4 sm:pl-12 md:pl-20 lg:pl-24 pr-4 sm:pr-8 md:pr-12 pt-6 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none touch-pan-x select-none">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer",
                      isActive
                        ? "bg-white text-black font-extrabold shadow-sm scale-105"
                        : "bg-white/[0.08] hover:bg-white/[0.16] text-neutral-300 hover:text-white border border-white/10",
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── CURATED MULTI-CATEGORY SWIPER ROWS (CLEAN TITLES - NO EMOJIS) ── */}
          <div className="relative z-20 pl-4 sm:pl-12 md:pl-20 lg:pl-24 pr-2 sm:pr-4 md:pr-6 pb-12 space-y-6 mt-4">
            {/* Row 1 */}
            <GenreCategoryRow
              title={
                isSciFiPage
                  ? "Phim Mới & Đang Thịnh Hành"
                  : "Phim Mới Cập Nhật"
              }
              films={row1Films}
              isLoading={isLoading}
            />

            {/* Row 2 */}
            <GenreCategoryRow
              title={
                isSciFiPage
                  ? "Khám Phá Vũ Trụ & Không Gian"
                  : "Thế Chiến Khốc Liệt & Quân Sự"
              }
              films={row2Films}
              isLoading={isLoading && !row2Films.length}
            />

            {/* Row 3 */}
            <GenreCategoryRow
              title={
                isSciFiPage
                  ? "Trí Tuệ Nhân Tạo & Cyberpunk"
                  : "Đại Kỷ Nguyên & Lịch Sử Hào Hùng"
              }
              films={row3Films}
              isLoading={isLoading && !row3Films.length}
            />

            {/* Row 4 */}
            <GenreCategoryRow
              title={
                isSciFiPage
                  ? "Nghịch Lý Thời Gian & Đa Chiều"
                  : "Chiến Tranh Cổ Đại & Vương Triều"
              }
              films={row4Films}
              isLoading={isLoading && !row4Films.length}
            />

            {/* Row 5 */}
            <GenreCategoryRow
              title={
                isSciFiPage
                  ? "Siêu Anh Hùng & Hành Động"
                  : "Tâm Lý Chiến Tranh & Hòa Bình"
              }
              films={row5Films}
              isLoading={isLoading && !row5Films.length}
            />

            {/* Row 6 */}
            <GenreCategoryRow
              title={
                isSciFiPage
                  ? "Kiệt Tác Tuyển Chọn"
                  : "Kiệt Tác Điện Ảnh Tuyển Chọn"
              }
              films={row6Films}
              isLoading={isLoading && !row6Films.length}
            />

            {/* ── FULL CATALOG SECTION ── */}
            <div className="mt-14 mb-8 pt-8 border-t border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-2">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Tất Cả Phim {label}
                  {activeTab !== "all" && (
                    <span className="text-sm font-normal text-neutral-400 ml-2">
                      • {tabs.find((t) => t.id === activeTab)?.label}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-neutral-400 font-semibold mt-1">
                  Kho phim điện ảnh và series {label} đặc sắc nhất với phụ đề và thuyết minh chuẩn
                </p>
              </div>

              <div className="text-xs font-bold text-neutral-400 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/10 self-start md:self-auto">
                Trang <span className="text-white font-extrabold">{page}</span> / {totalPages}
              </div>
            </div>

            {/* Full Catalog Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-7">
                {Array.from({ length: 14 }).map((_, i) => (
                  <FilmCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredCatalogFilms.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-7">
                {filteredCatalogFilms.map((f, idx) => (
                  <FilmCard
                    key={`${f.slug || f._id || idx}-${idx}`}
                    film={f}
                    priority={idx < 7}
                  />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-neutral-500 font-semibold text-sm">
                Chưa tìm thấy bộ phim nào thuộc danh mục này.
              </div>
            )}

            {/* Pagination Controls */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      ) : (
        /* ── CASE 2: ALL OTHER GENRES (Clean Modern Catalog View) ── */
        <div className="w-full">
          {/* Page Header — Centered */}
          <div className="flex flex-col items-center justify-center text-center mb-10 pb-6 border-b border-white/10 gap-2.5 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              Khám Phá Thể Loại
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Thể Loại: {label}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 font-medium">
              Tổng hợp danh sách các bộ phim thuộc thể loại {label} tuyển chọn hay nhất
            </p>
            <div className="mt-1 text-xs font-mono font-bold text-neutral-300 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
              Trang <span className="text-white font-extrabold">{page}</span> / {totalPages}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-y-6 sm:gap-y-8">
              {Array.from({ length: 24 }).map((_, i) => (
                <FilmCardSkeleton key={i} />
              ))}
            </div>
          ) : rawFilms.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-y-6 sm:gap-y-8">
              {rawFilms.map((f, idx) => (
                <FilmCard
                  key={`${f.slug || f._id || (f as any).id}-${idx}`}
                  film={f}
                  priority={idx < 8}
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-neutral-500 font-semibold text-sm">
              Chưa tìm thấy bộ phim nào thuộc thể loại này.
            </div>
          )}

          {/* Pagination Controls */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* ── Fullscreen Trailer Modal ── */}
      <TrailerModal
        isOpen={trailerState.isOpen}
        onClose={() => setTrailerState({ isOpen: false })}
        trailerUrl={trailerState.trailerUrl}
        filmName={trailerState.filmName}
      />
    </div>
  );
}
