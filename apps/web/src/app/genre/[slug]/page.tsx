"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { DeferredSection } from "@/components/layout/DeferredSection";
import { useDeferredContent } from "@/hooks/useDeferredContent";
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
  defer = false,
}: {
  title: string;
  films: FilmItem[];
  isLoading: boolean;
  defer?: boolean;
}) {
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (!isLoading && !films.length) return null;

  const content = (
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
  return defer ? <DeferredSection>{content}</DeferredSection> : content;
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
      referrerPolicy="no-referrer"
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
    <div className="relative flex h-14 w-44 items-center sm:h-28 sm:w-80 md:h-40 md:w-[460px] lg:h-48 lg:w-[540px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${item.slug}-logo-${candidateIdx}`}
        src={currentLogoSrc}
        alt={item.name}
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
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
          img.referrerPolicy = "no-referrer";
          img.src = cands[0];
        }
      }
      if (nextItem?.titleLogo) {
        const logoCands = buildAsianHeroImageCandidates(nextItem.titleLogo);
        if (logoCands[0]) {
          const logo = new Image();
          logo.referrerPolicy = "no-referrer";
          logo.src = logoCands[0];
        }
      }
    }

    // After 3.5s on slide, start playing the background video trailer (Netflix style, desktop only)
    const videoTimer = setTimeout(() => {
      if (ytKey && typeof window !== "undefined" && window.innerWidth >= 1024) {
        setIsPlayingVideo(true);
      }
    }, 3500);

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
      className="relative h-[68svh] min-h-[500px] max-h-[620px] w-full select-none overflow-hidden bg-[#0a0b10] sm:h-[95vh] sm:min-h-[740px] sm:max-h-[1080px] lg:h-[100vh] lg:min-h-[860px]"
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
              loading="lazy"
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
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end px-4 pb-12 sm:justify-center sm:px-14 sm:pb-32 md:px-20 lg:px-24 lg:pb-12">
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

            {/* Tagline / Subtitle */}
            <p className="text-xs sm:text-base md:text-lg font-bold text-cyan-300 drop-shadow-md">
              {currentItem.name} {currentItem.origin_name ? `• ${currentItem.origin_name}` : ""}
            </p>

            {/* Enhanced Metadata Row: IMDb | TMDB | Year | Movie Genres | Audio */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[11px] sm:text-sm md:text-base font-semibold text-neutral-200">
              {/* IMDb Rating Chip */}
              <div className="hidden items-center gap-1 rounded-md border border-white/15 bg-neutral-900/80 px-2 py-0.5 shadow-sm backdrop-blur-md sm:inline-flex sm:gap-1.5 sm:rounded-lg sm:px-2.5 sm:py-1">
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
            <p className="hidden max-w-2xl text-xs font-medium leading-relaxed text-neutral-200/90 drop-shadow-sm sm:line-clamp-3 sm:text-sm md:text-base">
              {currentItem.content || "Khám phá siêu phẩm điện ảnh đỉnh cao với chất lượng hình ảnh sắc nét và âm thanh sống động."}
            </p>

            {/* Netflix Action Callouts (3 CTA Buttons) */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 sm:pt-2">
              {/* Button 1: Xem Ngay (Primary White Pill) */}
              <Link
                href={`/film/${currentItem.slug}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-white px-4 py-2 text-xs font-extrabold text-black shadow-[0_4px_20px_rgba(255,255,255,0.2)] transition-all hover:scale-105 hover:bg-white/90 active:scale-95 sm:gap-2 sm:px-7 sm:py-3 sm:text-base"
              >
                <Play size={20} fill="currentColor" />
                <span>Xem Ngay</span>
              </Link>

              {/* Button 2: Xem Trailer (Secondary Glass with Play Trailer) */}
              {currentItem.trailer_url && (
                <button
                  type="button"
                  onClick={() => onOpenTrailer(currentItem.name, currentItem.trailer_url)}
                  className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-white/20 bg-white/20 px-4 py-2 text-xs font-bold text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-white/30 active:scale-95 sm:gap-2 sm:px-6 sm:py-3 sm:text-base"
                >
                  <Clapperboard size={19} />
                  <span>Trailer</span>
                </button>
              )}

              {/* Button 3: Chi Tiết Phim */}
              <Link
                href={`/film/${currentItem.slug}`}
                className="hidden items-center justify-center gap-2 rounded-md border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-white/20 active:scale-95 sm:inline-flex sm:px-5 sm:py-3 sm:text-base"
              >
                <Info size={19} />
                <span>Chi Tiết</span>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Mobile Side Navigation Chevrons (2 bên: Trái & Phải) ── */}
      <div className="hidden pointer-events-none">
        {/* Nút chuyển đổi bên Trái */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          aria-label="Phim trước"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/50 active:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg pointer-events-auto transition-transform active:scale-90 cursor-pointer"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>

        {/* Nút chuyển đổi bên Phải */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          aria-label="Phim tiếp theo"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/50 active:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg pointer-events-auto transition-transform active:scale-90 cursor-pointer"
        >
          <ChevronRight size={22} strokeWidth={2.5} />
        </button>
      </div>

      {pool.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 sm:hidden">
          {pool.map((item, index) => (
            <button
              key={item.slug || index}
              type="button"
              onClick={() => {
                setDirection(index >= currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              aria-label={`Chuyển đến phim ${item.name}`}
              className={cn(
                "h-1.5 rounded-full transition-[width,background-color] duration-300",
                index === currentIndex ? "w-5 bg-white" : "w-1.5 bg-white/35",
              )}
            />
          ))}
        </div>
      )}

      {/* ── Desktop Controls: Sound Toggle, Maturity Rating & Slide Chevrons ── */}
      <div className="hidden sm:flex absolute right-6 sm:right-12 bottom-28 md:bottom-36 lg:bottom-44 z-30 pointer-events-auto items-center gap-2 sm:gap-3 select-none">
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
        <div className="flex items-center border-l-4 border-white/70 bg-black/60 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold tracking-widest text-neutral-200 uppercase pointer-events-none">
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
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const page = Number(searchParams.get("page") || 1);
  const label = GENRE_NAMES[slug] || slug;

  const isSciFiPage = slug === "vien-tuong" || slug === "khoa-hoc-vien-tuong";
  const isWarPage = slug === "chien-tranh";
  const isShowcasePage = isSciFiPage || isWarPage;
  const secondaryReady = useDeferredContent();

  useEffect(() => {
    if (slug === "marvel") {
      router.replace("/films?universe=marvel");
    } else if (slug === "dc") {
      router.replace("/films?universe=dc");
    }
  }, [slug, router]);

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
    gcTime: 2 * 60 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Page 2 Query for Showcase Hubs
  const { data: page2Data } = useQuery({
    queryKey: ["genre-page-2", slug],
    queryFn: () => movieApi.getByGenre(slug, 2).then((r) => r.data),
    enabled: isShowcasePage && secondaryReady,
    staleTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  // Thematic Auxiliary Queries for Multi-Row Diversity (deferred after main content loads to prevent network choke)
  const { data: auxData1 } = useQuery({
    queryKey: ["genre-aux-1", isSciFiPage ? "phieu-luu" : "lich-su"],
    queryFn: () =>
      movieApi.getByGenre(isSciFiPage ? "phieu-luu" : "lich-su", 1).then((r) => r.data),
    enabled: isShowcasePage && !isLoading && secondaryReady,
    staleTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const { data: auxData2 } = useQuery({
    queryKey: ["genre-aux-2", isSciFiPage ? "hanh-dong" : "tam-ly"],
    queryFn: () =>
      movieApi.getByGenre(isSciFiPage ? "hanh-dong" : "tam-ly", 1).then((r) => r.data),
    enabled: isShowcasePage && !isLoading && secondaryReady,
    staleTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const rawFilms = useMemo<FilmItem[]>(
    () => data?.data?.items || data?.items || [],
    [data],
  );
  const rawPage2 = useMemo<FilmItem[]>(
    () => page2Data?.data?.items || page2Data?.items || [],
    [page2Data],
  );
  const rawAux1 = useMemo<FilmItem[]>(
    () => auxData1?.data?.items || auxData1?.items || [],
    [auxData1],
  );
  const rawAux2 = useMemo<FilmItem[]>(
    () => auxData2?.data?.items || auxData2?.items || [],
    [auxData2],
  );

  const heroPool = useMemo(
    () =>
      isSciFiPage
        ? CURATED_SCIFI_HERO_POOL
        : isWarPage
          ? CURATED_WAR_HERO_POOL
          : [],
    [isSciFiPage, isWarPage],
  );

  const tabs = useMemo(
    () => (isSciFiPage ? SCIFI_TABS : isWarPage ? WAR_TABS : []),
    [isSciFiPage, isWarPage],
  );

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

  // Curated Multi-Category Swiper Rows with Strict Thematic Matching & 100% Zero-Overlap Deduplication
  const { row1Films, row2Films, row3Films, row4Films, row5Films, row6Films, row7Films, row8Films } =
    useMemo(() => {
      if (!isShowcasePage) {
        return {
          row1Films: [],
          row2Films: [],
          row3Films: [],
          row4Films: [],
          row5Films: [],
          row6Films: [],
          row7Films: [],
          row8Films: [],
        };
      }

      // Comprehensive candidate pool
      const fullCatalogPool = dedupeFilms(
        [...rawFilms, ...rawPage2, ...rawAux1, ...rawAux2, ...heroPool],
        [],
        200,
      );

      const globalSeen = new Set<string>();

      const takeUnique = (
        primary: FilmItem[],
        fallback: FilmItem[],
        targetCount = 12,
      ): FilmItem[] => {
        const list: FilmItem[] = [];

        const tryAdd = (f: FilmItem) => {
          if (!f) return;
          const key = (f.slug || f._id || (f as any).id || "").toLowerCase();
          const base = getBaseTitle(f.name || f.title || "");
          if (key && !globalSeen.has(key) && (!base || !globalSeen.has(base))) {
            globalSeen.add(key);
            if (base) globalSeen.add(base);
            list.push(f);
          }
        };

        (primary || []).forEach(tryAdd);

        if (list.length < targetCount && fallback?.length) {
          (fallback || []).forEach((f) => {
            if (list.length < targetCount) tryAdd(f);
          });
        }

        return list.slice(0, targetCount);
      };

      const matchTheme = (keywords: string[]) => {
        return fullCatalogPool.filter((f) => {
          const key = (f.slug || f._id || (f as any).id || "").toLowerCase();
          const base = getBaseTitle(f.name || f.title || "");
          if (globalSeen.has(key) || (base && globalSeen.has(base))) return false;

          const name = (f.name || "").toLowerCase();
          const origin = (f.origin_name || "").toLowerCase();
          const slugStr = (f.slug || "").toLowerCase();
          const content = (f.content || "").toLowerCase();

          for (const kw of keywords) {
            const lk = kw.toLowerCase();
            if (
              name.includes(lk) ||
              origin.includes(lk) ||
              slugStr.includes(lk) ||
              content.includes(lk)
            ) {
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
      };

      // ── ROW 1: MỚI CẬP NHẬT & ĐANG THỊNH HÀNH ──
      const r1Candidates = [...rawFilms];
      const r1 = takeUnique(r1Candidates, rawPage2, 12);

      // ── ROW 2: THEME 1 (KHÁM PHÁ VŨ TRỤ / THẾ CHIẾN II) ──
      const theme1Keywords = isSciFiPage
        ? [
            "vũ trụ",
            "không gian",
            "space",
            "interstellar",
            "dune",
            "avatar",
            "mars",
            "hố đen",
            "sao hỏa",
            "alien",
            "hành tinh",
            "phi thuyền",
            "thiên hà",
            "gravity",
            "apollo",
            "star wars",
          ]
        : [
            "thế chiến",
            "thế chiến ii",
            "quân đội",
            "fury",
            "dunkirk",
            "ryan",
            "chiến dịch",
            "tăng",
            "lính",
            "trận đánh",
            "hacksaw",
            "trân châu cảng",
            "quân sự",
            "midway",
          ];
      const r2ThemeMatches = matchTheme(theme1Keywords);
      const r2 = takeUnique(r2ThemeMatches, rawAux1, 12);

      // ── ROW 3: THEME 2 (AI & CYBERPUNK / ĐẠI KỶ NGUYÊN & LỊCH SỬ) ──
      const theme2Keywords = isSciFiPage
        ? [
            "trí tuệ",
            "robot",
            "cyberpunk",
            "ma trận",
            "matrix",
            "máy móc",
            "công nghệ",
            "ai",
            "blade runner",
            "terminator",
            "người máy",
            "tương lai",
            "ex machina",
          ]
        : [
            "lịch sử",
            "oppenheimer",
            "kỷ nguyên",
            "danh nhân",
            "hào hùng",
            "vương triều",
            "1917",
            "napoleon",
            "hoàng gia",
            "thời đại",
            "anh hùng",
            "schindler",
          ];
      const r3ThemeMatches = matchTheme(theme2Keywords);
      const r3 = takeUnique(r3ThemeMatches, rawAux2, 12);

      // ── ROW 4: THEME 3 (NGHỊCH LÝ THỜI GIAN / CHIẾN TRANH CỔ ĐẠI) ──
      const theme3Keywords = isSciFiPage
        ? [
            "thời gian",
            "vòng lặp",
            "time",
            "inception",
            "tenet",
            "luân hồi",
            "đa vũ trụ",
            "du hành",
            "nghịch lý",
            "chiều không gian",
            "looper",
            "edge of tomorrow",
          ]
        : [
            "cổ đại",
            "võ sĩ",
            "giác đấu",
            "gladiator",
            "la mã",
            "troy",
            "300",
            "kiếm",
            "vương quyền",
            "đế chế",
            "thành bang",
            "chiến binh",
            "sparta",
            "alexander",
          ];
      const r4ThemeMatches = matchTheme(theme3Keywords);
      const r4 = takeUnique(r4ThemeMatches, rawPage2, 12);

      // ── ROW 5: THEME 4 (SIÊU ANH HÙNG / BẮN TỈA & ĐẶC NHIỆM) ──
      const theme4Keywords = isSciFiPage
        ? [
            "siêu anh hùng",
            "avengers",
            "hành động",
            "action",
            "marvel",
            "chiến đấu",
            "iron man",
            "transformers",
            "quái vật",
            "godzilla",
            "pacific rim",
            "spider-man",
          ]
        : [
            "bắn tỉa",
            "sniper",
            "đặc nhiệm",
            "sinh tồn",
            "diều hâu",
            "black hawk",
            "sát thủ",
            "chiến tuyến",
            "biệt kích",
            "đơn độc",
            "giải cứu",
            "lone survivor",
          ];
      const r5ThemeMatches = matchTheme(theme4Keywords);
      const r5 = takeUnique(r5ThemeMatches, fullCatalogPool, 12);

      // ── ROW 6: SINH TỒN / TÌNH BÁO & CHÍNH TRỊ ──
      const theme5Keywords = isSciFiPage
        ? ["sinh tồn", "thảm họa", "tận thế", "dịch bệnh", "quái vật", "survival", "apocalypse"]
        : ["tình báo", "gián điệp", "chính trị", "mật vụ", "chiến lược", "intelligence", "spy"];
      const r6 = takeUnique(matchTheme(theme5Keywords), fullCatalogPool, 12);

      // ── ROW 7: BÍ ẨN / HẬU CHIẾN ──
      const theme6Keywords = isSciFiPage
        ? ["bí ẩn", "kinh dị", "ngoài hành tinh", "sinh vật", "mất tích", "horror", "mystery"]
        : ["hậu chiến", "hòa bình", "chấn thương", "gia đình", "chính kịch", "drama", "peace"];
      const r7 = takeUnique(matchTheme(theme6Keywords), fullCatalogPool, 12);

      // ── ROW 8: KIỆT TÁC TUYỂN CHỌN ──
      const r8Candidates = [...heroPool, ...fullCatalogPool];
      const r8 = takeUnique(r8Candidates, fullCatalogPool, 12);

      return {
        row1Films: r1,
        row2Films: r2,
        row3Films: r3,
        row4Films: r4,
        row5Films: r5,
        row6Films: r6,
        row7Films: r7,
        row8Films: r8,
      };
    }, [
      isShowcasePage,
      isSciFiPage,
      rawFilms,
      rawPage2,
      rawAux1,
      rawAux2,
      heroPool,
    ]);

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

  const prefetchPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages) return;
    void queryClient.prefetchQuery({
      queryKey: ["genre", slug, targetPage],
      queryFn: () => movieApi.getByGenre(slug, targetPage).then((r) => r.data),
      staleTime: 30 * 60 * 1000,
    });
  };

  // Auto-prefetch next page in idle time for instant pagination
  useEffect(() => {
    if (page < totalPages) {
      const nextPage = page + 1;
      const timer = setTimeout(() => {
        void queryClient.prefetchQuery({
          queryKey: ["genre", slug, nextPage],
          queryFn: () => movieApi.getByGenre(slug, nextPage).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [page, totalPages, slug, queryClient]);

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

          {/* ── CURATED MULTI-CATEGORY SWIPER ROWS (OVERLAPPING HERO BANNER & VIDEO) ── */}
          <div className="relative z-20 pl-4 sm:pl-12 md:pl-20 lg:pl-24 pr-2 sm:pr-4 md:pr-6 pb-16 space-y-6 -mt-6 sm:-mt-24 md:-mt-32 lg:-mt-40">
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
              defer
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
              defer
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
              defer
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
              defer
            />

            {/* Row 6 */}
            <GenreCategoryRow
              title={
                isSciFiPage
                  ? "Sinh Tồn, Thảm Họa & Tận Thế"
                  : "Tình Báo, Gián Điệp & Chính Trị"
              }
              films={row6Films}
              isLoading={isLoading && !row6Films.length}
              defer
            />

            {/* Row 7 */}
            <GenreCategoryRow
              title={
                isSciFiPage
                  ? "Bí Ẩn, Kinh Dị & Sinh Vật Ngoài Hành Tinh"
                  : "Hậu Chiến, Hòa Bình & Số Phận Con Người"
              }
              films={row7Films}
              isLoading={isLoading && !row7Films.length}
              defer
            />

            {/* Row 8 */}
            <GenreCategoryRow
              title={
                isSciFiPage
                  ? "Kiệt Tác Khoa Học Viễn Tưởng Tuyển Chọn"
                  : "Kiệt Tác Điện Ảnh Chiến Tranh Tuyển Chọn"
              }
              films={row8Films}
              isLoading={isLoading && !row8Films.length}
              defer
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
              onPrefetchPage={prefetchPage}
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-y-6 sm:gap-y-8">
              {Array.from({ length: 21 }).map((_, i) => (
                <FilmCardSkeleton key={i} />
              ))}
            </div>
          ) : rawFilms.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-y-6 sm:gap-y-8">
              {rawFilms.map((f, idx) => (
                <FilmCard
                  key={`${f.slug || f._id || (f as any).id}-${idx}`}
                  film={f}
                  priority={idx < 7}
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
            onPrefetchPage={prefetchPage}
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
