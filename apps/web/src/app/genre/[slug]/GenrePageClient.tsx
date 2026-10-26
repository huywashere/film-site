"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
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
import { TmdbLogoIcon, ImdbLogoIcon } from "@/components/film/MovieRatingBadges";
import { cardFont } from "@/lib/fonts";
import { DeferredSection } from "@/components/layout/DeferredSection";
import { useDeferredContent } from "@/hooks/useDeferredContent";
import { useReliableNavigation } from "@/hooks/useReliableNavigation";
import { cn } from "@/lib/utils";
import {
  CURATED_SCIFI_HERO_POOL,
  CURATED_WAR_HERO_POOL,
} from "@/lib/curated-genre-pools";
import { CuratedHeroMovie } from "@/lib/curated-hero-pool";
import { buildAsianHeroImageCandidates } from "@/lib/curated-asian-hero";
import { preloadMovieLogo } from "@/lib/movie-logo-cache";

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
  "tre-em": "Trẻ Em (Kids)",
  "gia-tuong": "Phim Giả Tưởng",
};

const GENRE_DESCRIPTIONS: Record<string, string> = {
  "gia-tuong": "Khám phá thế giới thần thoại kỳ bí, ma thuật huyễn hoặc và những cuộc phiêu lưu vượt ngoài trí tưởng tượng.",
  "tre-em": "Kho phim thiếu nhi và hoạt hình vui nhộn, giàu tính giáo dục và tràn đầy tiếng cười cho các bạn nhỏ.",
  "hinh-su": "Những vụ trọng án gay cấn, cuộc đối đầu nghẹt thở giữa cơ quan điều tra và thế giới ngầm hiểm ác.",
  "tai-lieu": "Những thước phim tài liệu chân thực về thế giới tự nhiên, lịch sử, văn hóa và những sự kiện mang tầm vóc nhân loại.",
  "chinh-kich": "Các tác phẩm điện ảnh sâu sắc, lay động lòng người với những góc nhìn nhân sinh và chiều sâu tâm lý nhân vật.",
  "hai-huoc": "Những bộ phim hài hước duyên dáng, tràn đầy tiếng cười sảng khoái mang lại năng lượng tích cực.",
  "hanh-dong": "Những pha hành động mãn nhãn, kỹ xảo đỉnh cao và những màn rượt đuổi nghẹt thở.",
  "tinh-cam": "Những câu chuyện tình yêu ngọt ngào, sâu lắng và lãng mạn chạm đến trái tim người xem.",
  "co-trang": "Thế giới võ hiệp giang hồ, hoàng cung tranh đấu và những thiên tình sử kinh điển phương Đông.",
  "tam-ly": "Khai thác sâu sắc chiều sâu nội tâm, những giằng xé đạo đức và chuyển biến tâm lý phức tạp.",
  "vo-thuat": "Những màn quyền cước kinh điển, võ công đỉnh cao và tinh thần thượng võ bất khuất.",
  "phieu-luu": "Hành trình thám hiểm những vùng đất mới lạ, đối mặt hiểm nguy và khám phá những bí ẩn bất tận.",
  "kinh-di": "Những tác phẩm rùng rợn, hồi hộp và ám ảnh dành cho các tín đồ đam mê cảm giác mạnh.",
  "bi-an": "Những vụ án bí ẩn, tình tiết ly kỳ và những manh mối khó đoán chờ được giải mã.",
  "am-nhac": "Những giai điệu thăng hoa, hành trình theo đuổi đam mê nghệ thuật và thế giới âm nhạc bùng nổ.",
  "gia-dinh": "Những thước phim ấm áp về tình thân, sự gắn kết và những giá trị thiêng liêng của gia đình.",
  "hoc-duong": "Kỷ niệm thanh xuân tươi đẹp, tình bạn hồn nhiên và những ước mơ tuổi trẻ đầy nhiệt huyết.",
  "than-thoai": "Thế giới truyền thuyết thần thoại huyền bí, các vị thần và các trận chiến huyền sử.",
  "the-thao": "Tinh thần thể thao bất diệt, nghị lực phi thường và ý chí chạm tới đỉnh vinh quang.",
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

const FANTASY_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "epic", label: "Sử Thi & Arrakis", keywords: ["dune", "chúa nhẫn", "hobbit", "sử thi", "arrakis", "hành tinh cát", "sandworm", "harkonnen", "atreides"] },
  { id: "magic", label: "Phép Thuật & Kỳ Ảo", keywords: ["phép thuật", "phù thủy", "magic", "harry potter", "ma thuật", "phép", "phù thuỷ", "wizard", "sorcerer"] },
  { id: "adventure", label: "Phiêu Lưu Kỳ Bí", keywords: ["phiêu lưu", "thế giới", "vùng đất", "kỳ ảo", "narnia", "thám hiểm", "xứ sở", "wonderland", "adventure"] },
  { id: "creatures", label: "Quái Vật & Thần Thú", keywords: ["rồng", "quái vật", "sinh vật", "thần thú", "beast", "dragon", "godzilla", "kong", "quái thú"] },
  { id: "kingdom", label: "Đế Chế & Vương Quyền", keywords: ["vương quyền", "đế chế", "game of thrones", "hoàng gia", "ngai vàng", "thần thoại", "vua", "kingdom"] },
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
    <div className="mb-8 group/row relative cv-section-auto" aria-busy={isLoading}>
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
          className="catalog-row-swiper !py-2 !px-1 w-full"
        >
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <SwiperSlide
                  key={`sk-${i}`}
                  className="w-1/4 sm:w-1/5 lg:w-[14.2857%] xl:w-[12.5%]"
                >
                  <FilmCardSkeleton hideDetails={false} />
                </SwiperSlide>
              ))
            : films.map((film, idx) => (
                <SwiperSlide
                  key={`${film.slug || film._id || (film as any).id}-${idx}`}
                  className="w-1/4 sm:w-1/5 lg:w-[14.2857%] xl:w-[12.5%]"
                >
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
  const mobileCandidates = useMemo(() => {
    const directList = [item.poster_url, item.thumb_url, item.heroBackdrop].filter(Boolean) as string[];
    const all: string[] = [];
    for (const url of directList) {
      for (const cand of buildAsianHeroImageCandidates(url)) {
        if (!all.includes(cand)) all.push(cand);
      }
    }
    return all;
  }, [item.poster_url, item.thumb_url, item.heroBackdrop]);

  const desktopCandidates = useMemo(() => {
    const directList = [item.heroBackdrop, item.thumb_url, item.poster_url].filter(Boolean) as string[];
    const all: string[] = [];
    for (const url of directList) {
      for (const cand of buildAsianHeroImageCandidates(url)) {
        if (!all.includes(cand)) all.push(cand);
      }
    }
    return all;
  }, [item.heroBackdrop, item.thumb_url, item.poster_url]);

  const [desktopIdx, setDesktopIdx] = useState(0);
  const [mobileIdx, setMobileIdx] = useState(0);

  useEffect(() => {
    setDesktopIdx(0);
    setMobileIdx(0);
  }, [item.slug, item.heroBackdrop, item.thumb_url, item.poster_url]);

  const mobileSrc = mobileCandidates[mobileIdx] || item.poster_url || item.thumb_url || item.heroBackdrop || "";
  const desktopSrc = desktopCandidates[desktopIdx] || item.heroBackdrop || item.thumb_url || "";

  return (
    <picture className="w-full h-full block">
      <source media="(max-width: 767px)" srcSet={mobileSrc} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${item.slug}-backdrop-${desktopIdx}-${mobileIdx}`}
        src={desktopSrc}
        alt={item.name}
        referrerPolicy="no-referrer"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        onError={() => {
          if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
            if (mobileIdx < mobileCandidates.length - 1) {
              setMobileIdx((prev) => prev + 1);
            }
          } else if (desktopIdx < desktopCandidates.length - 1) {
            setDesktopIdx((prev) => prev + 1);
          }
        }}
        className={cn(
          "w-full h-full object-cover object-top sm:object-center transition-opacity duration-1000",
          isPlayingVideo && ytKey
            ? "opacity-0"
            : "opacity-100 brightness-[0.82] contrast-[1.06]",
        )}
      />
    </picture>
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
      <h1
        data-curated-hero-text={item.slug}
        className="text-2xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none drop-shadow-[0_12px_28px_rgba(0,0,0,0.95)]"
      >
        {item.name}
      </h1>
    );
  }

  return (
    <div className="relative flex h-14 w-44 items-center sm:h-28 sm:w-80 md:h-40 md:w-[460px] lg:h-48 lg:w-[540px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-curated-hero-logo={item.slug}
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

// ── SCI-FI TRANSFORMERS CINEMATIC HERO BANNER COMPONENT ──
const CDN_BASE = process.env.NEXT_PUBLIC_CDN_ASSETS_URL?.replace(/\/$/, "") || "";
const TF_BG_PATH = "/Folder-Background/transformers/transformers-bg.png";
const TF_LOGO_PATH = "/Folder-Background/transformers/tf-logo.png";

interface TransformersSlide {
  id: string;
  name: string;
  origin_name: string;
  subtitle: string;
  badge: string;
  year: number;
  quality: string;
  rating: string;
  genres: string[];
  overview: string;
  charImage: string;
  charAlt: string;
  slug: string;
  trailer_url: string;
  charHeightClass?: string;
}

const TRANSFORMERS_SLIDES: TransformersSlide[] = [
  {
    id: "the-last-knight",
    name: "Transformers: Chiến Binh Cuối Cùng",
    origin_name: "Transformers: The Last Knight",
    subtitle: "Nemesis Prime, Megatron & Bumblebee • Trận Chiến Cybertron",
    badge: "👑 TOP 1 VIỄN TƯỞNG",
    year: 2017,
    quality: "FHD • Thuyết Minh",
    rating: "IMDb 7.2",
    genres: ["Robot Biến Hình", "Kỹ Xảo Đỉnh Cao", "Khoa Học Viễn Tưởng", "Hành Động"],
    overview:
      "Optimus Prime bị tẩy não biến thành Nemesis Prime đối đầu với người đồng đội trung thành Bumblebee và Megatron trong trận chiến định đoạt số phận Trái Đất và hành tinh mẹ Cybertron.",
    charImage: "/Folder-Background/transformers/tf-char-trio.png",
    charAlt: "Nemesis Prime, Megatron và Bumblebee",
    slug: "transformers-quai-thu-troi-day",
    trailer_url: "https://www.youtube.com/watch?v=6Vtf0MszgHE",
    charHeightClass: "h-[74%] sm:h-[82%] md:h-[88%] lg:h-[94%] max-h-[700px]",
  },
  {
    id: "age-of-extinction",
    name: "Transformers: Kỷ Nguyên Tuyệt Chủng",
    origin_name: "Transformers: Age of Extinction",
    subtitle: "Optimus Prime & Bạo Long Grimlock • Thức Tỉnh Dinobot",
    badge: "🦖 SIÊU PHẨM DINOBOT",
    year: 2014,
    quality: "FHD • Thuyết Minh",
    rating: "IMDb 7.4",
    genres: ["Robot Biến Hình", "Quái Thú Cơ Khí", "Khoa Học Viễn Tưởng", "Chiến Tranh"],
    overview:
      "Khi loài người quay lưng săn lùng các Autobots, Optimus Prime giải phóng các chiến binh Dinobot huyền thoại dẫn đầu bởi T-Rex Grimlock để đẩy lùi hiểm họa diệt vong.",
    charImage: "/Folder-Background/transformers/tf-char-grimlock.png",
    charAlt: "Optimus Prime cưỡi bạo long Grimlock",
    slug: "transformers-quai-thu-troi-day",
    trailer_url: "https://www.youtube.com/watch?v=dYDGqmxMZFI",
    charHeightClass: "h-[72%] sm:h-[80%] md:h-[86%] lg:h-[92%] max-h-[680px]",
  },
  {
    id: "dark-of-the-moon",
    name: "Transformers: Vùng Tối Của Mặt Trăng",
    origin_name: "Transformers: Dark of the Moon",
    subtitle: "Thủ Lĩnh Tiền Nhiệm Sentinel Prime • Trụ Không Gian Cybertron",
    badge: "⚡ ĐỈNH CAO KỸ XẢO",
    year: 2011,
    quality: "FHD • Thuyết Minh",
    rating: "IMDb 7.6",
    genres: ["Robot Biến Hình", "Khoa Học Viễn Tưởng", "Du Hành Vũ Trụ", "Hành Động"],
    overview:
      "Cuộc chạy đua không gian bí mật đưa con người đến phi thuyền Cybertron rơi trên vùng tối Mặt Trăng, đánh thức Sentinel Prime cùng công nghệ Trụ Không Gian hủy diệt.",
    charImage: "/Folder-Background/transformers/tf-char-sentinel.png",
    charAlt: "Thủ lĩnh tiền nhiệm Sentinel Prime",
    slug: "transformers-quai-thu-troi-day",
    trailer_url: "https://www.youtube.com/watch?v=kHRf01Gjosk",
    charHeightClass: "h-[74%] sm:h-[82%] md:h-[88%] lg:h-[94%] max-h-[690px]",
  },
  {
    id: "rise-of-the-beasts",
    name: "Transformers: Quái Thú Trỗi Dậy",
    origin_name: "Transformers: Rise of the Beasts",
    subtitle: "Thống Soái Terrorcon Scourge • Kẻ Phụng Sự Unicron",
    badge: "🔥 CHIẾN BINH TERRORCON",
    year: 2023,
    quality: "FHD • Thuyết Minh",
    rating: "IMDb 7.3",
    genres: ["Robot Biến Hình", "Maximals", "Khoa Học Viễn Tưởng", "Hành Động"],
    overview:
      "Thủ lĩnh Terrorcon tàn bạo Scourge săn lùng chìa khóa Transwarp mở cổng thời không cho Unicron, buộc Autobots và Maximals phải hợp nhất sức mạnh chống lại kẻ thù diệt thế.",
    charImage: "/Folder-Background/transformers/tf-char-scourge.png",
    charAlt: "Thủ lĩnh Terrorcon Scourge",
    slug: "transformers-quai-thu-troi-day",
    trailer_url: "https://www.youtube.com/watch?v=itnqEauWQZM",
    charHeightClass: "h-[74%] sm:h-[82%] md:h-[88%] lg:h-[94%] max-h-[690px]",
  },
  {
    id: "bounty-hunter",
    name: "Transformers: Thợ Săn Tiền Thưởng",
    origin_name: "Transformers: Lockdown Bounty Hunter",
    subtitle: "Sát Thủ Vô Cảm Lockdown • Mệnh Lệnh Đấng Sáng Tạo",
    badge: "💀 SÁT THỦ NGÂN HÀ",
    year: 2014,
    quality: "FHD • Thuyết Minh",
    rating: "IMDb 7.5",
    genres: ["Robot Biến Hình", "Vũ Khí Tối Thượng", "Khoa Học Viễn Tưởng", "Săn Đuổi"],
    overview:
      "Mang theo phi thuyền khổng lồ và khẩu đại pháo biến hình từ khuôn mặt, Lockdown lùng sục khắp dải ngân hà để bắt sống Optimus Prime trao trả cho Đấng Sáng Tạo.",
    charImage: "/Folder-Background/transformers/tf-char-lockdown.png",
    charAlt: "Thợ săn tiền thưởng Cybertron Lockdown",
    slug: "transformers-quai-thu-troi-day",
    trailer_url: "https://www.youtube.com/watch?v=dYDGqmxMZFI",
    charHeightClass: "h-[72%] sm:h-[80%] md:h-[86%] lg:h-[92%] max-h-[670px]",
  },
];

function SciFiTransformersHeroBanner({
  onOpenTrailer,
}: {
  onOpenTrailer: (name: string, url?: string) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [bgSrc, setBgSrc] = useState(TF_BG_PATH);
  const [logoSrc, setLogoSrc] = useState(TF_LOGO_PATH);

  const currentSlide = TRANSFORMERS_SLIDES[currentIndex];

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % TRANSFORMERS_SLIDES.length);
    }, 8500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % TRANSFORMERS_SLIDES.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + TRANSFORMERS_SLIDES.length) % TRANSFORMERS_SLIDES.length);
  };

  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  return (
    <section
      data-hero-banner="true"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative h-[76svh] min-h-[580px] max-h-[680px] w-full select-none overflow-hidden bg-[#0a0b10] sm:h-[95vh] sm:min-h-[740px] sm:max-h-[1000px] lg:h-[100vh] lg:min-h-[860px]"
    >
      {/* ── Layer 1: Background Scenic Image (Desolate Glacial Cybertron Ring) ── */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <img
          src={bgSrc}
          alt="Transformers - Bối cảnh Cybertron và vòng đai băng giá"
          onError={() => {
            if (CDN_BASE && bgSrc !== `${CDN_BASE}${TF_BG_PATH}`) {
              setBgSrc(`${CDN_BASE}${TF_BG_PATH}`);
            }
          }}
          className="w-full h-full object-cover object-[center_28%] scale-[1.01] filter brightness-[0.95] contrast-[1.05]"
          loading="eager"
        />
      </div>

      {/* ── Layer 2: Soft Cinematic Blending (hiển thị trọn vẹn cảnh nền Cybertron, không đánh đen) ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            linear-gradient(to right, rgba(10,11,16,0.68) 0%, rgba(10,11,16,0.4) 38%, rgba(10,11,16,0.12) 68%, transparent 100%),
            linear-gradient(to top, #0a0b10 0%, rgba(10,11,16,0.7) 12%, rgba(10,11,16,0.2) 28%, transparent 48%),
            linear-gradient(to bottom, rgba(10,11,16,0.65) 0%, rgba(10,11,16,0.15) 14%, transparent 26%)
          `,
        }}
      />

      {/* ── Layer 3: Character Cutout with Smooth Slide Effect from Left/Right & Gentle Hover ── */}
      <div className="absolute right-0 bottom-0 top-0 h-full w-full max-w-2xl sm:max-w-3xl md:max-w-4xl lg:max-w-5xl flex items-end justify-end pointer-events-none z-10 overflow-hidden pr-3 sm:pr-8 md:pr-14 lg:pr-20 xl:pr-28">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentSlide.id}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
            whileHover={{
              scale: 1.025,
              y: -6,
              transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
            }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 bottom-0 h-full flex items-end justify-end pointer-events-auto cursor-pointer group/tf-char"
          >
            <img
              src={currentSlide.charImage}
              alt={currentSlide.charAlt}
              className={cn(
                currentSlide.charHeightClass || "h-[74%] sm:h-[82%] md:h-[88%] lg:h-[94%] max-h-[700px]",
                "w-auto max-w-full object-contain object-bottom select-none filter contrast-[1.03] brightness-[1.02] drop-shadow-[0_20px_45px_rgba(0,0,0,0.8)] transition-all duration-500 group-hover/tf-char:drop-shadow-[0_25px_65px_rgba(56,189,248,0.45)] group-hover/tf-char:brightness-[1.06]",
              )}
              loading="eager"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Layer 4: Typography, 3D Chrome Logo & Actions ── */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={`meta-${currentSlide.id}`}
            custom={direction}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-4 sm:left-12 md:left-16 lg:left-24 top-20 sm:top-36 md:top-40 lg:top-44 max-w-xl sm:max-w-2xl space-y-2.5 sm:space-y-4 pointer-events-auto pr-2 sm:pr-0"
          >
            {/* Top Badges (Monochrome Neutral Glass - Không màu, compact trên mobile) */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-bold">
              <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-white/15 text-neutral-100 border border-white/20 font-bold uppercase tracking-wider backdrop-blur-sm">
                {currentSlide.badge}
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded bg-white/15 text-neutral-100 border border-white/15 backdrop-blur-sm">
                {currentSlide.year}
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-white/15 text-neutral-100 border border-white/15 backdrop-blur-sm">
                Khoa Học Viễn Tưởng
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded bg-white/15 text-neutral-100 border border-white/15 backdrop-blur-sm">
                {currentSlide.quality}
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded bg-white/15 text-amber-300 border border-white/15 backdrop-blur-sm font-extrabold">
                ★ {currentSlide.rating}
              </span>
            </div>

            {/* Official 3D Chrome Logo & Title */}
            <div className="space-y-1.5 sm:space-y-2">
              <div className="h-8 sm:h-14 md:h-16 lg:h-20 max-w-[240px] sm:max-w-[440px] md:max-w-[520px]">
                <img
                  src={logoSrc}
                  alt="Transformers"
                  onError={() => {
                    if (CDN_BASE && logoSrc !== `${CDN_BASE}${TF_LOGO_PATH}`) {
                      setLogoSrc(`${CDN_BASE}${TF_LOGO_PATH}`);
                    }
                  }}
                  className="h-full w-auto object-contain object-left drop-shadow-[0_8px_25px_rgba(0,0,0,0.95)]"
                  loading="eager"
                />
              </div>

              {/* Subtitle with character highlight */}
              <p className="text-xs sm:text-lg font-semibold text-neutral-200/95 font-mono tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] line-clamp-1 sm:line-clamp-none">
                {currentSlide.subtitle}
              </p>
            </div>

            {/* Genre Pills */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5">
              {currentSlide.genres.map((genre, gIdx) => (
                <span
                  key={genre}
                  className={cn(
                    "px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/[0.12] hover:bg-white/[0.2] text-[10px] sm:text-xs font-semibold text-neutral-100 border border-white/[0.15] backdrop-blur-md transition-colors shadow-sm",
                    gIdx > 2 ? "hidden xs:inline-block" : "inline-block",
                  )}
                >
                  {genre}
                </span>
              ))}
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-neutral-200/90 font-medium leading-relaxed max-w-lg line-clamp-2 sm:line-clamp-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
              {currentSlide.overview}
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 pt-1.5 sm:pt-3">
              <Link
                href={`/watch/${currentSlide.slug}`}
                className="inline-flex items-center gap-1.5 sm:gap-2.5 px-4 sm:px-7 py-2 sm:py-3 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-black text-xs sm:text-sm shadow-xl shadow-black/40 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current text-neutral-950" />
                <span>Xem Ngay</span>
              </Link>

              {currentSlide.trailer_url && (
                <button
                  type="button"
                  onClick={() => onOpenTrailer(currentSlide.name, currentSlide.trailer_url)}
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-6 py-2 sm:py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                >
                  <Clapperboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  <span>Trailer</span>
                </button>
              )}

              <Link
                href={`/film/${currentSlide.slug}`}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-6 py-2 sm:py-3 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs sm:text-sm backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              >
                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Chi Tiết</span>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Slide Navigation Controls (Prev / Next & Dots) ── */}
      <div className="absolute right-3 sm:right-8 md:right-12 bottom-3 sm:bottom-32 md:bottom-40 lg:bottom-48 xl:bottom-56 z-30 flex items-center gap-1.5 sm:gap-3 select-none pointer-events-auto">
        {/* Indicators */}
        <div className="hidden sm:flex items-center gap-1.5 mr-2">
          {TRANSFORMERS_SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => {
                setDirection(idx > currentIndex ? 1 : -1);
                setCurrentIndex(idx);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                idx === currentIndex
                  ? "w-7 bg-cyan-400 shadow-sm shadow-cyan-400/50"
                  : "w-2 bg-white/30 hover:bg-white/60",
              )}
              title={slide.name}
            />
          ))}
        </div>

        {/* Counter */}
        <span className="text-[11px] sm:text-xs font-mono font-bold text-neutral-300 bg-black/60 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full border border-white/10 shadow-lg">
          {currentIndex + 1} / {TRANSFORMERS_SLIDES.length}
        </span>

        {/* Arrow Buttons */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-black/60 backdrop-blur-md px-1 sm:px-1.5 py-0.5 sm:py-1 rounded-full border border-white/20 shadow-lg">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Transformers character"
            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Transformers character"
            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

// ── WAR & HISTORY THE ODYSSEY CINEMATIC HERO BANNER COMPONENT ──
const ODYSSEY_BG_PATH = "/Folder-Background/the odysey/odyssey-bg.jpg";

interface WarOdysseySlide {
  id: string;
  name: string;
  origin_name: string;
  subtitle: string;
  badge: string;
  year: number;
  quality: string;
  rating: string;
  genres: string[];
  overview: string;
  charImage: string;
  charAlt: string;
  slug: string;
  trailer_url: string;
  charHeightClass?: string;
}

const WAR_ODYSSEY_SLIDES: WarOdysseySlide[] = [
  {
    id: "odyssey-achilles",
    name: "The Odyssey: Cuộc Chiến Thành Troy",
    origin_name: "The Odyssey: Fall of Troy",
    subtitle: "Dũng Tướng Achilles • Cơn Thịnh Nộ Thần Thánh",
    badge: "SỬ THI CHIẾN TRANH",
    year: 2024,
    quality: "4K UHD • Thuyết Minh",
    rating: "IMDb 8.8",
    genres: ["Chiến Tranh Cổ Đại", "Sử Thi", "Hy Lạp & La Mã", "Hành Động"],
    overview:
      "Hành trình sử thi bi tráng về cuộc vây hãm thành Troy huyền thoại và chuyến hải trình trở về đầy bão táp của Odysseus qua những đại dương kỳ bí và thử thách thần linh tàn khốc.",
    charImage: "/Folder-Background/the odysey/odyssey-warrior-achilles.png",
    charAlt: "Dũng tướng Achilles xuất trận thành Troy",
    slug: "cuoc-chien-thanh-troy",
    trailer_url: "https://www.youtube.com/watch?v=znTLzRJbgCA",
    charHeightClass: "h-[74%] sm:h-[82%] md:h-[88%] lg:h-[94%] max-h-[720px]",
  },
  {
    id: "odyssey-spartan",
    name: "300: Huyền Thoại Chiến Binh Sparta",
    origin_name: "300: Rise of an Empire",
    subtitle: "Thống Lĩnh Leonidas • Cửa Tử Thermopylae Bất Tử",
    badge: "CHIẾN BINH HUYỀN THOẠI",
    year: 2023,
    quality: "4K UHD • Thuyết Minh",
    rating: "IMDb 8.9",
    genres: ["Chiến Tranh Cổ Đại", "Đế Chế Ba Tư", "Sinh Tử Vực Thẳm", "Hào Hùng"],
    overview:
      "Trận đánh huyền thoại tại hẻm núi Thermopylae, nơi 300 dũng sĩ Sparta kiên cường đối đầu với hàng triệu quân xâm lược Ba Tư để bảo vệ nền văn minh và tự do của Hy Lạp.",
    charImage: "/Folder-Background/the odysey/odyssey-warrior-spartan.png",
    charAlt: "Chiến binh thống lĩnh Sparta",
    slug: "300-chien-binh",
    trailer_url: "https://www.youtube.com/watch?v=UrIbxk7idYA",
    charHeightClass: "h-[78%] sm:h-[86%] md:h-[92%] lg:h-[98%] max-h-[760px]",
  },
  {
    id: "odyssey-gladiator",
    name: "Đấu Sĩ La Mã: Khát Vọng Tự Do",
    origin_name: "Gladiator: Rome Imperium",
    subtitle: "Vị Tướng Bị Phản Bội Maximus • Vinh Quang Đấu Trường",
    badge: "ĐẾ CHẾ LA MÃ VĨ ĐẠI",
    year: 2024,
    quality: "4K UHD • Thuyết Minh",
    rating: "IMDb 9.0",
    genres: ["Chiến Tranh Cổ Đại", "Đấu Sĩ La Mã", "Lịch Sử & Dã Sử", "Kiệt Tác"],
    overview:
      "Từ một đại tướng quân bách chiến bách thắng của Đế chế La Mã bị phản bội, Maximus trở thành dũng sĩ giác đấu huyền thoại khuynh đảo đấu trường Colosseum để trả thù bạo chúa.",
    charImage: "/Folder-Background/the odysey/odyssey-warrior-helmet.png",
    charAlt: "Mũ chiến binh giác đấu La Mã",
    slug: "vo-si-giac-dau",
    trailer_url: "https://www.youtube.com/watch?v=4rgYUipGJNo",
    charHeightClass: "h-[74%] sm:h-[82%] md:h-[88%] lg:h-[94%] max-h-[710px]",
  },
];

function WarOdysseyHeroBanner({
  onOpenTrailer,
}: {
  onOpenTrailer: (name: string, url?: string) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [bgSrc, setBgSrc] = useState(ODYSSEY_BG_PATH);

  const currentSlide = WAR_ODYSSEY_SLIDES[currentIndex];

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % WAR_ODYSSEY_SLIDES.length);
    }, 8500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % WAR_ODYSSEY_SLIDES.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + WAR_ODYSSEY_SLIDES.length) % WAR_ODYSSEY_SLIDES.length);
  };

  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  return (
    <section
      data-hero-banner="true"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative h-[76svh] min-h-[580px] max-h-[680px] w-full select-none overflow-hidden bg-[#0a0b10] sm:h-[95vh] sm:min-h-[740px] sm:max-h-[1000px] lg:h-[100vh] lg:min-h-[860px]"
    >
      {/* ── Layer 1: Background Scenic Image (Epic Battle Coastal Fire & Burning Ships) ── */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <img
          src={bgSrc}
          alt="The Odyssey - Trận chiến sử thi cổ đại thành Troy"
          onError={() => {
            if (CDN_BASE && bgSrc !== `${CDN_BASE}${ODYSSEY_BG_PATH}`) {
              setBgSrc(`${CDN_BASE}${ODYSSEY_BG_PATH}`);
            }
          }}
          className="w-full h-full object-cover object-[center_35%] scale-[1.01] filter brightness-[0.88] contrast-[1.1]"
          loading="eager"
        />
      </div>

      {/* ── Layer 2: Soft Cinematic Blending (hiển thị trọn vẹn cảnh chiến trận bốc lửa, không đánh đen) ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            linear-gradient(to right, rgba(10,11,16,0.85) 0%, rgba(10,11,16,0.52) 42%, rgba(10,11,16,0.18) 72%, transparent 100%),
            linear-gradient(to top, #0a0b10 0%, rgba(10,11,16,0.7) 12%, rgba(10,11,16,0.2) 28%, transparent 48%),
            linear-gradient(to bottom, rgba(10,11,16,0.65) 0%, rgba(10,11,16,0.15) 14%, transparent 26%)
          `,
        }}
      />

      {/* ── Layer 3: ALL The Odyssey Warriors Co-appearing in Heroic Battle Formation with Multi-Directional Translation ── */}
      <div className="absolute right-0 bottom-0 top-0 h-full w-full max-w-2xl sm:max-w-3xl md:max-w-4xl lg:max-w-5xl flex items-end justify-end pointer-events-none z-10 overflow-hidden pr-2 sm:pr-6 md:pr-12 lg:pr-16 xl:pr-24">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={`odyssey-squad-${currentSlide.id}`}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 110 : -110 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -110 : 110 }}
            transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
            className="relative h-full w-full flex items-end justify-end pointer-events-auto select-none"
          >
            {/* 1. Background Atmosphere Warrior: Roman / Greek Gladiator Helmet & Smoke */}
            <motion.div
              initial={{ opacity: 0, x: direction > 0 ? 140 : -140 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
              className={cn(
                "absolute right-[-8%] sm:right-[-4%] bottom-0 h-[65%] sm:h-[75%] md:h-[82%] lg:h-[88%] w-auto pointer-events-none transition-all duration-700",
                currentIndex === 2
                  ? "opacity-95 scale-105 z-20 filter contrast-125 brightness-110 drop-shadow-[0_20px_45px_rgba(245,158,11,0.5)]"
                  : "opacity-45 sm:opacity-60 scale-100 z-10 filter contrast-110 brightness-85",
              )}
            >
              <img
                src="/Folder-Background/the odysey/odyssey-warrior-helmet.png"
                alt="Chiến binh Mũ Giác Đấu La Mã"
                className="h-full w-auto object-contain object-bottom"
                loading="eager"
              />
            </motion.div>

            {/* 2. Midground Hero: Spartan Warrior Commander with Shield & Spear */}
            <motion.div
              initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
              className={cn(
                "absolute right-[24%] sm:right-[28%] md:right-[32%] lg:right-[36%] bottom-0 h-[72%] sm:h-[82%] md:h-[88%] lg:h-[95%] max-h-[740px] w-auto transition-all duration-700",
                currentIndex === 1
                  ? "opacity-100 scale-105 z-30 filter contrast-[1.08] brightness-[1.1] drop-shadow-[0_25px_60px_rgba(245,158,11,0.55)]"
                  : "opacity-80 sm:opacity-90 scale-100 z-15 filter contrast-[1.03] brightness-[0.95] drop-shadow-[0_20px_45px_rgba(0,0,0,0.85)]",
              )}
            >
              <img
                src="/Folder-Background/the odysey/odyssey-warrior-spartan.png"
                alt="Thống lĩnh Sparta Leonidas"
                className="h-full w-auto object-contain object-bottom"
                loading="eager"
              />
            </motion.div>

            {/* 3. Foreground Lead Hero: Achilles Charging */}
            <motion.div
              initial={{ opacity: 0, x: direction > 0 ? 60 : -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
              className={cn(
                "relative bottom-0 h-[74%] sm:h-[82%] md:h-[88%] lg:h-[96%] max-h-[750px] w-auto transition-all duration-700",
                currentIndex === 0
                  ? "opacity-100 scale-105 z-30 filter contrast-[1.08] brightness-[1.08] drop-shadow-[0_25px_65px_rgba(245,158,11,0.6)]"
                  : "opacity-85 sm:opacity-90 scale-100 z-25 filter contrast-[1.02] brightness-[0.98] drop-shadow-[0_20px_45px_rgba(0,0,0,0.9)]",
              )}
            >
              <img
                src="/Folder-Background/the odysey/odyssey-warrior-achilles.png"
                alt="Dũng tướng Achilles xuất trận thành Troy"
                className="h-full w-auto object-contain object-bottom"
                loading="eager"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Layer 4: Typography, Logo Banner, Badges & Actions with Left-to-Right Translation ── */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={`war-meta-${currentSlide.id}`}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? -80 : 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? 80 : -80 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-4 sm:left-12 md:left-16 lg:left-24 top-20 sm:top-28 md:top-32 lg:top-36 max-w-xl sm:max-w-2xl space-y-2.5 sm:space-y-3.5 pointer-events-auto pr-2 sm:pr-0"
          >
            {/* Top Badges (Monochrome Neutral Glass with Warm Amber Highlights) */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-bold">
              <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-amber-500/25 text-amber-200 border border-amber-500/40 font-bold uppercase tracking-wider backdrop-blur-md shadow-sm">
                {currentSlide.badge}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-neutral-100 border border-white/15 backdrop-blur-md">
                {currentSlide.year}
              </span>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-white/15 text-neutral-100 border border-white/15 backdrop-blur-md">
                Chiến Tranh & Lịch Sử
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-neutral-100 border border-white/15 backdrop-blur-md">
                {currentSlide.quality}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md font-extrabold">
                ★ {currentSlide.rating}
              </span>
            </div>

            {/* Official HD Logo Banner (Replaces plain text) */}
            <div className="h-16 sm:h-20 md:h-24 lg:h-28 max-w-[320px] sm:max-w-[460px] md:max-w-[540px] lg:max-w-[620px]">
              <img
                src="/Folder-Background/the odysey/odyssey-logo-hd.png"
                alt="The Odyssey: Cuộc Chiến Thành Troy"
                className="h-full w-auto object-contain object-left drop-shadow-[0_8px_25px_rgba(0,0,0,0.95)]"
                loading="eager"
              />
            </div>

            {/* Subtitle with character highlight */}
            <p className="text-sm sm:text-base md:text-lg font-semibold italic text-amber-200/95 font-mono tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] line-clamp-1 sm:line-clamp-none">
              {currentSlide.subtitle}
            </p>

            {/* Genre Pills */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5">
              {currentSlide.genres.map((genre, gIdx) => (
                <span
                  key={genre}
                  className={cn(
                    "px-3 py-1 rounded-full bg-white/[0.12] hover:bg-white/[0.2] text-xs font-semibold text-neutral-100 border border-white/[0.15] backdrop-blur-md transition-colors shadow-sm",
                    gIdx > 2 ? "hidden xs:inline-block" : "inline-block",
                  )}
                >
                  {genre}
                </span>
              ))}
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-neutral-200/90 font-medium leading-relaxed max-w-lg line-clamp-2 sm:line-clamp-3 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
              {currentSlide.overview}
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 pt-1.5 sm:pt-3">
              <Link
                href={`/watch/${currentSlide.slug}`}
                className="inline-flex items-center gap-2 px-5 sm:px-7 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-950/40 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              >
                <Play className="w-4 h-4 fill-current text-neutral-950" />
                <span>Xem Ngay</span>
              </Link>

              {currentSlide.trailer_url && (
                <button
                  type="button"
                  onClick={() => onOpenTrailer(currentSlide.name, currentSlide.trailer_url)}
                  className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                >
                  <Clapperboard className="w-4 h-4 text-amber-300" />
                  <span>Trailer</span>
                </button>
              )}

              <Link
                href={`/film/${currentSlide.slug}`}
                className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs sm:text-sm backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              >
                <Info className="w-4 h-4" />
                <span>Chi Tiết</span>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Slide Navigation Controls (Prev / Next & Dots) ── */}
      <div className="absolute right-3 sm:right-8 md:right-12 bottom-3 sm:bottom-32 md:bottom-40 lg:bottom-48 xl:bottom-56 z-30 flex items-center gap-1.5 sm:gap-3 select-none pointer-events-auto">
        {/* Indicators */}
        <div className="hidden sm:flex items-center gap-1.5 mr-2">
          {WAR_ODYSSEY_SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => {
                setDirection(idx > currentIndex ? 1 : -1);
                setCurrentIndex(idx);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                idx === currentIndex
                  ? "w-7 bg-amber-400 shadow-sm shadow-amber-400/50"
                  : "w-2 bg-white/30 hover:bg-white/60",
              )}
              title={slide.name}
            />
          ))}
        </div>

        {/* Counter */}
        <span className="text-[11px] sm:text-xs font-mono font-bold text-neutral-300 bg-black/60 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full border border-white/10 shadow-lg">
          {currentIndex + 1} / {WAR_ODYSSEY_SLIDES.length}
        </span>

        {/* Arrow Buttons */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-black/60 backdrop-blur-md px-1 sm:px-1.5 py-0.5 sm:py-1 rounded-full border border-white/20 shadow-lg">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous War Odyssey character"
            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next War Odyssey character"
            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

// ── FANTASY DUNE PART TWO CINEMATIC HERO BANNER COMPONENT ──
const DUNE_BG_PATH = "/Folder-Background/dune-2/dune-arrakis-sun-bg.webp";
const DUNE_LOGO_PATH = "/Folder-Background/dune-2/dune-2-logo-hd.png";

interface DuneFantasySlide {
  id: string;
  name: string;
  origin_name: string;
  subtitle: string;
  badge: string;
  year: number;
  quality: string;
  rating: string;
  genres: string[];
  overview: string;
  charImage: string;
  charAlt: string;
  slug: string;
  trailer_url: string;
  charHeightClass?: string;
}

const DUNE_FANTASY_SLIDES: DuneFantasySlide[] = [
  {
    id: "dune-ensemble-shaihulu",
    name: "Dune: Hành Tinh Cát - Phần Hai",
    origin_name: "Dune: Part Two",
    subtitle: "Paul Atreides & Gia Tộc Arrakis • Cơn Thịnh Nộ Sâu Sa Mạc",
    badge: "BOM TẤN GIẢ TƯỞNG SỬ THI",
    year: 2024,
    quality: "4K UHD • Thuyết Minh",
    rating: "IMDb 8.5",
    genres: ["Sử Thi Giả Tưởng", "Vũ Trụ Arrakis", "Hành Động", "Khoa Học Kỳ Ảo"],
    overview:
      "Paul Atreides hợp nhất cùng Chani và tộc người Fremen để phát động cuộc kháng chiến báo thù những kẻ hủy diệt gia tộc mình, đối diện với định mệnh nghiệt ngã làm rung chuyển toàn cõi thiên hà.",
    charImage: "/Folder-Background/dune-2/dune-ensemble-sandworm.png",
    charAlt: "Toàn bộ nhân vật Dune 2 và Thần Thú Shai-Hulud sa mạc",
    slug: "hanh-tinh-cat-phan-hai",
    trailer_url: "https://www.youtube.com/watch?v=Way9Dexny3w",
    charHeightClass: "h-[80%] sm:h-[88%] md:h-[94%] lg:h-[98%] max-h-[760px]",
  },
  {
    id: "dune-paul-chani-duo",
    name: "Dune: Chiến Binh Định Mệnh",
    origin_name: "Dune: Part Two - Desert Warriors",
    subtitle: "Paul & Chani • Sát Cánh Kháng Chiến Tộc Fremen",
    badge: "CHIẾN BINH SA MẠC ARRAKIS",
    year: 2024,
    quality: "4K UHD • Thuyết Minh",
    rating: "IMDb 8.5",
    genres: ["Tình Yêu & Khát Vọng", "Kháng Chiến Fremen", "Sa Mạc Vô Tận", "Phiêu Lưu"],
    overview:
      "Sát cánh chiến đấu bên chiến binh quả cảm Chani, Paul thuần hóa loài sâu cát khổng lồ và học hỏi giáo lý sa mạc cổ xưa để trở thành thủ lĩnh được toàn thể người dân Arrakis tôn sùng.",
    charImage: "/Folder-Background/dune-2/dune-paul-chani-hd.png",
    charAlt: "Paul Atreides và Chani sát cánh trong bộ chiến giáp Stillsuit",
    slug: "hanh-tinh-cat-phan-hai",
    trailer_url: "https://www.youtube.com/watch?v=Way9Dexny3w",
    charHeightClass: "h-[76%] sm:h-[84%] md:h-[90%] lg:h-[96%] max-h-[720px]",
  },
  {
    id: "dune-muaddib-prophet",
    name: "Dune: Tiên Tri Muad'Dib Trỗi Dậy",
    origin_name: "Dune: Part Two - The Kwisatz Haderach",
    subtitle: "Kwisatz Haderach Muad'Dib • Quyền Năng Thấu Thị Tương Lai",
    badge: "ĐẤNG CỨU THẾ THIÊN HÀ",
    year: 2024,
    quality: "4K UHD • Thuyết Minh",
    rating: "IMDb 8.5",
    genres: ["Quyền Năng Huyền Bí", "Tranh Đoạt Vương Quyền", "Thần Thoại Vũ Trụ", "Kịch Tính"],
    overview:
      "Vượt qua lằn ranh sinh tử nhờ Nước Sự Sống, Paul thức tỉnh đôi mắt xanh rực sáng của hương dược Arrakis và dẫn đầu hàng triệu chiến binh Fremen tiến thẳng vào trận chiến định đoạt ngai vàng hoàng đế.",
    charImage: "/Folder-Background/dune-2/dune-paul-solo.png",
    charAlt: "Paul Atreides khoác áo choàng sa mạc với đôi mắt xanh hương dược",
    slug: "hanh-tinh-cat-phan-hai",
    trailer_url: "https://www.youtube.com/watch?v=Way9Dexny3w",
    charHeightClass: "h-[74%] sm:h-[82%] md:h-[88%] lg:h-[94%] max-h-[700px]",
  },
];

function DuneFantasyHeroBanner({
  onOpenTrailer,
}: {
  onOpenTrailer: (name: string, url?: string) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [bgSrc, setBgSrc] = useState(DUNE_BG_PATH);
  const [logoSrc, setLogoSrc] = useState(DUNE_LOGO_PATH);

  const currentSlide = DUNE_FANTASY_SLIDES[currentIndex];

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % DUNE_FANTASY_SLIDES.length);
    }, 8500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % DUNE_FANTASY_SLIDES.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + DUNE_FANTASY_SLIDES.length) % DUNE_FANTASY_SLIDES.length);
  };

  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  return (
    <section
      data-hero-banner="true"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative h-[76svh] min-h-[580px] max-h-[680px] w-full select-none overflow-hidden bg-[#0a0b10] sm:h-[95vh] sm:min-h-[740px] sm:max-h-[1000px] lg:h-[100vh] lg:min-h-[860px]"
    >
      {/* ── Layer 1: Background Scenic Image (Scorching Arrakis Desert Sun & Spice Dunes) ── */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <img
          src={bgSrc}
          alt="Dune: Hành Tinh Cát - Sa Mạc Arrakis"
          onError={() => {
            if (CDN_BASE && bgSrc !== `${CDN_BASE}${DUNE_BG_PATH}`) {
              setBgSrc(`${CDN_BASE}${DUNE_BG_PATH}`);
            }
          }}
          className="w-full h-full object-cover object-[center_35%] scale-[1.01] filter brightness-[0.92] contrast-[1.08]"
          loading="eager"
        />
      </div>

      {/* ── Layer 2: Warm Cinematic Desert Blending ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            linear-gradient(to right, rgba(10,11,16,0.88) 0%, rgba(10,11,16,0.58) 38%, rgba(10,11,16,0.18) 72%, transparent 100%),
            linear-gradient(to top, #0a0b10 0%, rgba(10,11,16,0.7) 12%, rgba(10,11,16,0.2) 28%, transparent 48%),
            linear-gradient(to bottom, rgba(10,11,16,0.65) 0%, rgba(10,11,16,0.15) 14%, transparent 26%)
          `,
        }}
      />

      {/* Atmospheric Warm Spice Ambient Glow */}
      <div
        className="pointer-events-none absolute -bottom-10 left-1/4 w-[600px] h-[300px] bg-amber-500/10 blur-[140px] rounded-full z-10"
        aria-hidden="true"
      />

      {/* ── Layer 3: Character Cutout with Smooth Slide Effect from Left/Right & Gentle Hover ── */}
      <div className="absolute right-0 bottom-0 top-0 h-full w-full max-w-2xl sm:max-w-3xl md:max-w-4xl lg:max-w-5xl flex items-end justify-end pointer-events-none z-10 overflow-hidden pr-3 sm:pr-8 md:pr-14 lg:pr-20 xl:pr-28">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentSlide.id}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative select-none pointer-events-none drop-shadow-[0_25px_50px_rgba(0,0,0,0.95)]",
              currentSlide.charHeightClass || "h-[76%] sm:h-[84%] md:h-[90%] lg:h-[96%]",
            )}
          >
            <motion.img
              src={currentSlide.charImage}
              alt={currentSlide.charAlt}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="h-full w-auto object-contain filter contrast-[1.08] brightness-[0.98]"
              loading="eager"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Layer 4: Foreground Content (Netflix Layout with Title Logo & Action Buttons) ── */}
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end px-4 pb-12 sm:justify-center sm:px-14 sm:pb-32 md:px-20 lg:px-24 lg:pb-12">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide.id}
            custom={direction}
            initial={{ x: direction > 0 ? -30 : 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? 20 : -20, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl sm:max-w-3xl space-y-2.5 sm:space-y-4 lg:space-y-4.5 pointer-events-auto"
          >
            {/* Title Logo */}
            <div className="relative h-14 sm:h-20 md:h-24 lg:h-28 w-64 sm:w-80 md:w-96 select-none -ml-1 sm:-ml-2">
              <img
                src={logoSrc}
                alt="Dune: Part Two"
                onError={() => {
                  if (CDN_BASE && logoSrc !== `${CDN_BASE}${DUNE_LOGO_PATH}`) {
                    setLogoSrc(`${CDN_BASE}${DUNE_LOGO_PATH}`);
                  }
                }}
                className="h-full w-full object-contain object-left drop-shadow-[0_4px_24px_rgba(245,158,11,0.4)]"
                loading="eager"
              />
            </div>

            {/* Tagline / Subtitle */}
            <p className="text-xs sm:text-base md:text-lg font-bold text-amber-300 drop-shadow-md">
              {currentSlide.subtitle}
            </p>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[11px] sm:text-sm md:text-base font-semibold text-neutral-200">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px] sm:text-xs">
                {currentSlide.badge}
              </span>
              <span className="text-white font-bold">{currentSlide.year}</span>
              <span className="text-neutral-500">•</span>
              <span className="text-amber-300 font-bold">{currentSlide.rating}</span>
              <span className="text-neutral-500">•</span>
              <span className="text-neutral-300">{currentSlide.quality}</span>
            </div>

            {/* Genres */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {currentSlide.genres.map((g, idx) => (
                <span key={g} className="text-xs sm:text-sm text-amber-200/90 font-medium">
                  {g}
                  {idx < currentSlide.genres.length - 1 && (
                    <span className="text-neutral-500 ml-1.5">•</span>
                  )}
                </span>
              ))}
            </div>

            {/* Synopsis Description */}
            <p className="hidden max-w-xl text-xs font-medium leading-relaxed text-neutral-200/90 drop-shadow-sm sm:line-clamp-3 sm:text-sm md:text-base">
              {currentSlide.overview}
            </p>

            {/* Action Buttons: Solid White Buttons (Zero Glass) */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2">
              <Link
                href={`/film/${currentSlide.slug}`}
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl bg-white hover:bg-neutral-100 text-black font-extrabold text-xs sm:text-sm shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer select-none"
              >
                <Play size={16} fill="black" />
                <span>Xem Ngay</span>
              </Link>

              {currentSlide.trailer_url && (
                <button
                  type="button"
                  onClick={() => onOpenTrailer(currentSlide.name, currentSlide.trailer_url)}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-white hover:bg-neutral-100 text-black font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer select-none"
                >
                  <Clapperboard size={15} />
                  <span>Xem Trailer</span>
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Layer 5: Slide Indicators & Navigation Controls ── */}
      <div className="absolute right-3 sm:right-8 md:right-12 bottom-3 sm:bottom-32 md:bottom-40 lg:bottom-48 xl:bottom-56 z-30 flex items-center gap-1.5 sm:gap-3 select-none pointer-events-auto">
        <div className="hidden sm:flex items-center gap-1.5 mr-2">
          {DUNE_FANTASY_SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => {
                setDirection(idx > currentIndex ? 1 : -1);
                setCurrentIndex(idx);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                idx === currentIndex
                  ? "w-7 bg-amber-400 shadow-sm shadow-amber-400/50"
                  : "w-2 bg-white/30 hover:bg-white/60",
              )}
              title={slide.name}
            />
          ))}
        </div>

        <span className="text-[11px] sm:text-xs font-mono font-bold text-neutral-300 bg-black/60 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full border border-white/10 shadow-lg">
          {currentIndex + 1} / {DUNE_FANTASY_SLIDES.length}
        </span>

        <div className="flex items-center gap-0.5 sm:gap-1 bg-black/60 backdrop-blur-md px-1 sm:px-1.5 py-0.5 sm:py-1 rounded-full border border-white/20 shadow-lg">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Dune character"
            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Dune character"
            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </section>
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
      pool.forEach((item) => {
        const logoSrc = buildAsianHeroImageCandidates(item.titleLogo)[0];
        if (logoSrc) void preloadMovieLogo(logoSrc);
      });
      if (nextItem?.heroBackdrop) {
        const cands = buildAsianHeroImageCandidates(nextItem.heroBackdrop);
        if (cands[0]) {
          const img = new Image();
          img.referrerPolicy = "no-referrer";
          img.src = cands[0];
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

  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  return (
    <section
      data-hero-banner="true"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative h-[76svh] min-h-[580px] max-h-[680px] w-full select-none overflow-hidden bg-[#0a0b10] sm:h-[95vh] sm:min-h-[740px] sm:max-h-[1080px] lg:h-[100vh] lg:min-h-[860px]"
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
            <ResilientGenreHeroLogo key={currentItem.slug} item={currentItem} />

            {/* Tagline / Subtitle */}
            <p className="text-xs sm:text-base md:text-lg font-bold text-cyan-300 drop-shadow-md">
              {currentItem.name} {currentItem.origin_name ? `• ${currentItem.origin_name}` : ""}
            </p>

            {/* Enhanced Metadata Row: IMDb | TMDB | Year | Movie Genres | Audio */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[11px] sm:text-sm md:text-base font-semibold text-neutral-200">
              {/* IMDb Rating Chip */}
              <div className="hidden items-center gap-1.5 rounded-md border border-white/15 bg-neutral-900/80 px-2 py-0.5 shadow-sm backdrop-blur-md sm:inline-flex sm:rounded-lg sm:px-2.5 sm:py-1">
                <ImdbLogoIcon className="h-3.5 sm:h-4 w-auto" />
                <span className="text-white font-extrabold text-[11px] sm:text-sm tracking-tight">
                  {(currentItem.imdb_rating || currentItem.vote_average || 8.5).toFixed(1).replace('.', ',')}
                </span>
              </div>

              {/* TMDB Rating Chip */}
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-neutral-900/80 border border-white/15 backdrop-blur-md shadow-sm">
                <TmdbLogoIcon className="h-3.5 sm:h-4 w-auto" />
                <span className="text-white font-extrabold text-[11px] sm:text-sm tracking-tight">
                  {Math.round((currentItem.tmdb_rating || (currentItem.tmdb as any)?.vote_average || currentItem.vote_average || 8.0) * 10)}%
                </span>
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
type GenrePageClientProps = {
  initialData?: any;
  initialDataUpdatedAt?: number;
};

export default function GenrePageClient({
  initialData,
  initialDataUpdatedAt,
}: GenrePageClientProps) {
  const params = useParams();
  const router = useReliableNavigation();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const page = Number(searchParams.get("page") || 1);
  const label = GENRE_NAMES[slug] || slug;

  const isSciFiPage = slug === "vien-tuong" || slug === "khoa-hoc-vien-tuong";
  const isWarPage = slug === "chien-tranh";
  const isFantasyPage = slug === "gia-tuong";
  const isShowcasePage = isSciFiPage || isWarPage || isFantasyPage;
  const secondaryReady = useDeferredContent();

  useEffect(() => {
    if (slug === "marvel") {
      router.replace("/universe/marvel");
    } else if (slug === "dc") {
      router.replace("/universe/dc");
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
    initialData,
    initialDataUpdatedAt,
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Page 2 Query for Showcase Hubs & Curated Sections
  const { data: page2Data } = useQuery({
    queryKey: ["genre-page-2", slug],
    queryFn: () => movieApi.getByGenre(slug, 2).then((r) => r.data),
    enabled: isShowcasePage && secondaryReady,
    staleTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  // Thematic Auxiliary Queries for Multi-Row Diversity (deferred after main content loads to prevent network choke)
  const { data: auxData1 } = useQuery({
    queryKey: ["genre-aux-1", isSciFiPage ? "phieu-luu" : isFantasyPage ? "than-thoai" : "lich-su"],
    queryFn: () =>
      movieApi.getByGenre(isSciFiPage ? "phieu-luu" : isFantasyPage ? "than-thoai" : "lich-su", 1).then((r) => r.data),
    enabled: isShowcasePage && !isLoading && secondaryReady,
    staleTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const { data: auxData2 } = useQuery({
    queryKey: ["genre-aux-2", isSciFiPage ? "hanh-dong" : isFantasyPage ? "phieu-luu" : "tam-ly"],
    queryFn: () =>
      movieApi.getByGenre(isSciFiPage ? "hanh-dong" : isFantasyPage ? "phieu-luu" : "tam-ly", 1).then((r) => r.data),
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
    () => (isSciFiPage ? SCIFI_TABS : isWarPage ? WAR_TABS : isFantasyPage ? FANTASY_TABS : []),
    [isSciFiPage, isWarPage, isFantasyPage],
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

      // ── ROW 2: THEME 1 (KHÁM PHÁ VŨ TRỤ / THẾ CHIẾN II / SỬ THI ARRAKIS) ──
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
        : isFantasyPage
          ? [
              "dune",
              "chúa nhẫn",
              "hobbit",
              "sử thi",
              "arrakis",
              "hành tinh cát",
              "sandworm",
              "harkonnen",
              "atreides",
              "paul",
              "chani",
              "fremen",
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

      // ── ROW 3: THEME 2 (AI & CYBERPUNK / ĐẠI KỶ NGUYÊN / PHÉP THUẬT) ──
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
        : isFantasyPage
          ? [
              "phép thuật",
              "phù thủy",
              "magic",
              "harry potter",
              "ma thuật",
              "phép",
              "phù thuỷ",
              "wizard",
              "sorcerer",
              "bùa chú",
              "thần chú",
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

      // ── ROW 4: THEME 3 (NGHỊCH LÝ THỜI GIAN / CHIẾN TRANH CỔ ĐẠI / PHIÊU LƯU KỲ ẢO) ──
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
        : isFantasyPage
          ? [
              "phiêu lưu",
              "vùng đất",
              "kỳ ảo",
              "narnia",
              "thám hiểm",
              "xứ sở",
              "wonderland",
              "adventure",
              "mê cung",
              "kỳ bí",
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

      // ── ROW 5: THEME 4 (SIÊU ANH HÙNG / BẮN TỈA / VƯƠNG QUYỀN) ──
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
        : isFantasyPage
          ? [
              "vương quyền",
              "đế chế",
              "game of thrones",
              "hoàng gia",
              "ngai vàng",
              "thần thoại",
              "vua",
              "kingdom",
              "hoàng đế",
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

      // ── ROW 6: SINH TỒN / TÌNH BÁO / DỊ GIỚI TU TIÊN ──
      const theme5Keywords = isSciFiPage
        ? ["sinh tồn", "thảm họa", "tận thế", "dịch bệnh", "quái vật", "survival", "apocalypse"]
        : isFantasyPage
          ? ["tu tiên", "huyền huyễn", "dị giới", "tiên hiệp", "trọng sinh", "thần ma", "kiếm hiệp", "đạo sĩ"]
          : ["tình báo", "gián điệp", "chính trị", "mật vụ", "chiến lược", "intelligence", "spy"];
      const r6 = takeUnique(matchTheme(theme5Keywords), fullCatalogPool, 12);

      // ── ROW 7: BÍ ẨN / HẬU CHIẾN / RỒNG & THẦN THÚ ──
      const theme6Keywords = isSciFiPage
        ? ["bí ẩn", "kinh dị", "ngoài hành tinh", "sinh vật", "mất tích", "horror", "mystery"]
        : isFantasyPage
          ? ["rồng", "quái vật", "sinh vật", "thần thú", "beast", "dragon", "godzilla", "kong", "quái thú"]
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
      data-eager-hydration="true"
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
          {isSciFiPage ? (
            <SciFiTransformersHeroBanner onOpenTrailer={handleOpenTrailer} />
          ) : isWarPage ? (
            <WarOdysseyHeroBanner onOpenTrailer={handleOpenTrailer} />
          ) : (
            <DuneFantasyHeroBanner onOpenTrailer={handleOpenTrailer} />
          )}

          {/* ── CURATED MULTI-CATEGORY SWIPER ROWS (OVERLAPPING HERO BANNER & VIDEO) ── */}
          <div className="relative z-20 pl-4 sm:pl-12 md:pl-20 lg:pl-24 pr-2 sm:pr-4 md:pr-6 pb-16 space-y-6 mt-3 sm:-mt-24 md:-mt-32 lg:-mt-44 xl:-mt-52">
            {/* Row 1 */}
            <GenreCategoryRow
              title={
                isFantasyPage
                  ? "Phim Giả Tưởng Mới & Đang Thịnh Hành"
                  : isSciFiPage
                    ? "Phim Mới & Đang Thịnh Hành"
                    : "Phim Mới Cập Nhật"
              }
              films={row1Films}
              isLoading={isLoading}
            />

            {/* Row 2 */}
            <GenreCategoryRow
              title={
                isFantasyPage
                  ? "Sử Thi Giả Tưởng & Thế Giới Arrakis"
                  : isSciFiPage
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
                isFantasyPage
                  ? "Phép Thuật, Ma Pháp & Thế Giới Thần Kỳ"
                  : isSciFiPage
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
                isFantasyPage
                  ? "Phiêu Lưu Kỳ Ảo & Xứ Sở Diệu Kỳ"
                  : isSciFiPage
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
                isFantasyPage
                  ? "Cuộc Chiến Vương Quyền & Đế Chế Huyền Thoại"
                  : isSciFiPage
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
                isFantasyPage
                  ? "Dị Giới, Tu Tiên & Huyền Huyễn Đông Tây"
                  : isSciFiPage
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
                isFantasyPage
                  ? "Rồng Thiêng, Quái Vật & Thần Thú Cổ Đại"
                  : isSciFiPage
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
                isFantasyPage
                  ? "Kiệt Tác Điện Ảnh Giả Tưởng Đỉnh Cao"
                  : isSciFiPage
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
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-7 gap-y-3.5 sm:gap-y-6">
                {Array.from({ length: 14 }).map((_, i) => (
                  <FilmCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredCatalogFilms.length > 0 ? (
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-7 gap-y-3.5 sm:gap-y-6 cv-grid-auto">
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
              {GENRE_DESCRIPTIONS[slug] ||
                `Tổng hợp danh sách các bộ phim thuộc thể loại ${label} tuyển chọn hay nhất`}
            </p>
            <div className="mt-1 text-xs font-mono font-bold text-neutral-300 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
              Trang <span className="text-white font-extrabold">{page}</span> / {totalPages}
            </div>
          </div>

          {/* Catalog Grid (Standard 7-Cols Desktop) */}
          {isLoading ? (
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-y-3.5 sm:gap-y-8">
              {Array.from({ length: 21 }).map((_, i) => (
                <FilmCardSkeleton key={i} />
              ))}
            </div>
          ) : rawFilms.length > 0 ? (
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-y-3.5 sm:gap-y-8 cv-grid-auto">
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
