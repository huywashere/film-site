"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  movieApi,
  recommendationApi,
  siteConfigApi,
  type PublicSiteConfiguration,
} from "@/lib/api";
import {
  FilmCard,
  FilmCardSkeleton,
  FilmItem,
} from "@/components/film/FilmCard";
import { useTranslation } from "@/store/langStore";
import { deduplicateSectionRow } from "@/lib/recommendation-engine";
import { extractFilmItems } from "@/lib/movie-normalizer";
import { useSettingsStore } from "@/store/settingsStore";
import { rankHotCatalogFilms } from "@/lib/catalog-curation";
const HomeAnnouncementPopup = dynamic(
  () =>
    import("@/components/layout/HomeAnnouncementPopup").then(
      (module) => module.HomeAnnouncementPopup,
    ),
  { ssr: false },
);
const Top10RankedRow = dynamic(() =>
  import("@/components/film/Top10RankedRow").then(
    (module) => module.Top10RankedRow,
  ),
);
const ContinueWatchingRow = dynamic(() =>
  import("@/components/film/ContinueWatchingRow").then(
    (module) => module.ContinueWatchingRow,
  ),
);
const AuthHistoryCalloutBanner = dynamic(
  () =>
    import("@/components/auth/AuthHistoryCalloutBanner").then(
      (module) => module.AuthHistoryCalloutBanner,
    ),
  { ssr: false },
);
const HeroShowcaseSection = dynamic(() =>
  import("@/components/film/HeroShowcaseSection").then(
    (module) => module.HeroShowcaseSection,
  ),
);
const CuratedSpotlightSection = dynamic(() =>
  import("@/components/film/CuratedSpotlightSection").then(
    (module) => module.CuratedSpotlightSection,
  ),
);
const LandscapeSpotlightRow = dynamic(() =>
  import("@/components/film/LandscapeSpotlightRow").then(
    (module) => module.LandscapeSpotlightRow,
  ),
);
const WeeklyCuratedShowcase = dynamic(() =>
  import("@/components/film/WeeklyCuratedShowcase").then(
    (module) => module.WeeklyCuratedShowcase,
  ),
);
import HeroBanner from "@/app/components/HeroBanner";
import { cardFont } from "@/lib/fonts";
import {
  CURATED_VFX_FILM_ITEMS,
  CURATED_KOREAN_ROMANCE_FILM_ITEMS,
  CURATED_WORKPLACE_FILM_ITEMS,
  CURATED_ACCLAIMED_FILM_ITEMS,
  CURATED_HEALING_FILM_ITEMS,
  CURATED_ADVENTURE_FILM_ITEMS,
  CURATED_SCIFI_FILM_ITEMS,
  CURATED_ACTION_FILM_ITEMS,
  REAL_TRENDING_TOP10_POOL,
} from '@/lib/curated-home-catalog';

// Helper: Làm sạch và trích xuất các khóa nhận diện thương hiệu/franchise (tránh đề xuất Phần 1, Phần 2, Phần 3 cùng lúc)
function getFranchiseTokens(film: FilmItem): string[] {
  const tokens: string[] = [];

  const clean = (text?: string) => {
    if (!text) return "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d")
      .replace(/\s*\([^)]*\)/g, " ") // Bỏ ngoặc (Phần 1), (Season 2), (2024), etc.
      .replace(/[-:]\s*(phan|season|part|tap|ss|mua)\s*\d+/gi, " ")
      .replace(/\s+(phan|season|part|tap|ss|mua)\s*\d+/gi, " ")
      .replace(/\s+(i{1,3}|iv|v|vi{1,3}|ix|x)$/gi, " ") // Số La Mã ở cuối
      .replace(/\s+\d+$/g, " ") // Số ở cuối như "Mortal Kombat 2" -> "mortal kombat"
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const cleanSlug = (s?: string) => {
    if (!s) return "";
    return s
      .toLowerCase()
      .replace(/-phan-\d+/gi, "")
      .replace(/-season-\d+/gi, "")
      .replace(/-part-\d+/gi, "")
      .replace(/-ss\d+/gi, "")
      .replace(/-tap-\d+/gi, "")
      .replace(/-mua-\d+/gi, "")
      .replace(/-(i{1,3}|iv|v|vi{1,3}|ix|x)$/gi, "")
      .replace(/-\d+$/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .trim();
  };

  const nameToken = clean(film.name || film.title);
  const originToken = clean(film.origin_name);
  const slugToken = cleanSlug(film.slug);

  if (nameToken && nameToken.length >= 3) tokens.push(`name:${nameToken}`);
  if (originToken && originToken.length >= 3)
    tokens.push(`origin:${originToken}`);
  if (slugToken && slugToken.length >= 3) tokens.push(`slug:${slugToken}`);

  return tokens;
}

// Helper: Loại bỏ phim trùng lặp theo ID/slug VÀ chỉ giữ 1 phần đại diện duy nhất cho mỗi phim/series
function deduplicate(films: FilmItem[]): FilmItem[] {
  const seenIds = new Set<string>();
  const seenFranchiseTokens = new Set<string>();

  return (films || []).filter((film) => {
    if (!film) return false;
    const exactKey = String(film.slug || film._id || "")
      .trim()
      .toLowerCase();
    if (exactKey && seenIds.has(exactKey)) return false;

    const tokens = getFranchiseTokens(film);
    // Nếu phim này cùng tên franchise/series với phim đã có trong danh sách -> Bỏ qua phần trùng
    const hasDuplicateFranchise = tokens.some((token) =>
      seenFranchiseTokens.has(token),
    );
    if (hasDuplicateFranchise) return false;

    if (exactKey) seenIds.add(exactKey);
    tokens.forEach((token) => seenFranchiseTokens.add(token));
    return true;
  });
}

function catalogItemCount(data: any): number {
  const items = data?.data?.items || data?.items || [];
  return Array.isArray(items) ? items.length : 0;
}

function movieTaxonomyContains(
  values: Array<{ name?: string; slug?: string }> | undefined,
  needles: string[],
): boolean {
  const haystack = (values || [])
    .flatMap((value) => [value.name, value.slug])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

function asCatalogPayload(items: FilmItem[]) {
  return { items, data: { items } };
}

// Helper: Nhận diện và lọc triệt để phim Anime, Donghua 3D, Tokusatsu
function isAnimationOrAnime(film: FilmItem): boolean {
  if (!film || !film.name) return false;
  const name = (film.name || "").toLowerCase();
  const originName = (film.origin_name || "").toLowerCase();
  const slug = (film.slug || "").toLowerCase();
  const type = (film.type || "").toLowerCase();

  if (
    type === "hoathinh" ||
    type === "anime" ||
    slug.includes("hoat-hinh") ||
    slug.includes("anime")
  ) {
    return true;
  }

  if (
    movieTaxonomyContains(film.category, [
      "hoạt hình",
      "hoat-hinh",
      "anime",
      "animation",
      "donghua",
    ])
  ) {
    return true;
  }

  const combined = `${name} ${originName} ${slug}`;

  const animRegex =
    /hoạt hình|anime|donghua|manga|isekai|chuyển sinh|thánh nữ|trùm cuối|pokemon|kanata kara|ultraman|chiến binh ánh sáng|zombie sagashitemasu|yasei no last boss|tensei shita|phàm nhân tu tiên|đấu la đại lục|thôn phệ tinh không|vạn giới|độc tôn|tiên nghịch|già thiên|đại chúa tể|thần ấn vương tọa|nghịch thiên chí tôn|thương nguyên đồ|huyết quỷ|jojo|slime|tòa tháp thần linh|one piece|naruto|dragon ball|conan|doraemon|shin cậu bé|inuyasha|bleach|attack on titan|shingeki|demon slayer|kimetsu|jujutsu kaisen|chainsaw man|tokyo ghoul|black clover|my hero academia|boku no hero|hunter x hunter|sword art online|death note|gintama|haikyuu|fairy tail|seven deadly sins|nanatsu no taizai|yêu thần ký|luyện khí mười vạn năm|vạn cổ chí tôn|độc kiếm cửu thiên|sư huynh quá cẩn trọng/i;

  if (animRegex.test(combined)) {
    return true;
  }

  const isJapan = movieTaxonomyContains(film.country, ["nhật bản", "nhat-ban", "japan"]);
  if (isJapan && film.time && /\d+\s*phút\/tập/i.test(film.time)) {
    const match = film.time.match(/(\d+)\s*phút/i);
    if (match && Number(match[1]) <= 26) {
      return true;
    }
  }

  return false;
}

// Lọc CHỈ giữ lại phim người đóng thật (Live-Action), loại bỏ 3D/Anime cho các hàng phim thông thường
function filterLiveActionOnly(films: FilmItem[]): FilmItem[] {
  return films.filter((f) => !isAnimationOrAnime(f));
}

function isLikelySeries(film: FilmItem): boolean {
  const type = (film.type || "").toLowerCase();
  const episode = (film.episode_current || "").toLowerCase();
  const title = `${film.name || ""} ${film.origin_name || ""}`.toLowerCase();
  return (
    ["series", "phim-bo", "tvshows", "tv-shows"].includes(type) ||
    /tập|episode|hoàn tất|đang chiếu/.test(episode) ||
    /phần \d+|season \d+/.test(title)
  );
}

const SECTION_TITLE_TONES: Record<string, string> = {
  "Phim Mới Cập Nhật": "from-cyan-400 via-sky-400 to-indigo-300",
  "Series Âu-Mỹ Đỉnh Cao": "from-violet-400 via-purple-400 to-fuchsia-300",
  "Series Âu Mỹ Đỉnh Cao": "from-violet-400 via-purple-400 to-fuchsia-300",
  "Cổ Trang Kiếm Hiệp Đặc Sắc": "from-amber-300 via-orange-400 to-red-400",
  "Tuyệt Tác Khoa Học Viễn Tưởng": "from-orange-400 via-amber-400 to-yellow-300",
  "Phim Viễn Tưởng": "from-violet-400 via-fuchsia-400 to-rose-300",
  "Phim Thần Thoại & Kỹ Xảo": "from-violet-400 via-fuchsia-400 to-rose-300",
  "Phim Hành Động": "from-orange-400 via-amber-400 to-yellow-300",
  "Phim Hành Động Kịch Tính": "from-orange-400 via-amber-400 to-yellow-300",
  "Phim Kinh Dị": "from-red-400 via-rose-400 to-orange-300",
  "Phim Hình Sự & Tội Phạm": "from-sky-400 via-blue-400 to-indigo-300",
  "Phim Hình Sự - Tội Phạm": "from-sky-400 via-blue-400 to-indigo-300",
  "Phim Cổ Trang": "from-amber-300 via-orange-400 to-red-400",
  "Phim Chiếu Rạp": "from-fuchsia-400 via-violet-400 to-indigo-300",
  "Phim Âu-Mỹ Đáng Xem": "from-emerald-400 via-teal-400 to-cyan-300",
  "Series Quốc Tế": "from-blue-400 via-indigo-400 to-violet-300",
  "Anime & Hoạt Hình": "from-pink-400 via-rose-400 to-orange-300",
  "Phim Phiêu Lưu Mạo Hiểm": "from-lime-400 via-emerald-400 to-teal-300",
  "Phim Lẻ Âu-Mỹ Chất Lượng Cao": "from-amber-300 via-yellow-300 to-lime-300",
  "Phim Chính Kịch": "from-purple-400 via-violet-400 to-blue-300",
  "Phim Kinh Dị & Sinh Tồn": "from-red-400 via-rose-400 to-orange-300",
  "Thể Loại Chiến Tranh Và Gai Góc":
    "from-stone-300 via-neutral-400 to-slate-300",
  "Phim Hài": "from-yellow-300 via-lime-300 to-emerald-300",
  "Phim Tình Cảm": "from-fuchsia-400 via-pink-400 to-rose-300",
  "Phim Chữa Lành": "from-teal-300 via-emerald-400 to-green-300",
  "Phim Tình Cảm Hàn Quốc": "from-rose-400 via-pink-400 to-purple-300",
};

function sectionTitleTone(title: string) {
  return (
    SECTION_TITLE_TONES[title] || "from-cyan-400 via-sky-400 to-indigo-300"
  );
}

// Reusable Row Skeleton Component to prevent black void / layout shifts during scrolling or loading
function SectionRowSkeleton({
  title,
  href,
  cardVariant,
}: {
  title?: string;
  href?: string;
  cardVariant?: 'standard' | 'landscape' | 'poster-pill';
}) {
  const { t } = useTranslation();
  const cardLayout = useSettingsStore((s) => s.cardLayout);
  const isLandscape = cardLayout === "horizontal";
  const effectiveCardVariant = cardVariant || (isLandscape ? "landscape" : "standard");
  const isPosterPill = effectiveCardVariant === "poster-pill";

  const itemWidthClass = isLandscape
    ? "w-[72%] min-w-[220px] shrink-0 snap-start sm:w-[46%] md:w-[32%] lg:w-[calc((100%-4*1rem)/5)] xl:w-[calc((100%-4*1rem)/5)]"
    : isPosterPill
      ? "w-[36%] min-w-[130px] shrink-0 snap-start sm:w-[26%] md:w-[20%] lg:w-[calc((100%-5*1rem-2rem)/6)] xl:w-[calc((100%-5*1rem-2rem)/6)] 2xl:w-[calc((100%-5*1rem-2rem)/6)]"
      : "w-[26%] min-w-[112px] shrink-0 snap-start sm:w-[22%] md:w-[18%] lg:w-[calc((100%-6*1rem)/7)] xl:w-[calc((100%-6*1rem)/7)]";

  return (
    <div
      data-film-section-skeleton="true"
      className={`${cardFont.className} mb-8 select-none`}
      aria-busy="true"
    >
      <div className="mb-3 flex items-start justify-between gap-2 px-1 sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
          {title ? (
            <h2 className={`${cardFont.className} text-xl font-extrabold tracking-[-0.025em] text-white sm:text-2xl`}>
              {title}
            </h2>
          ) : (
            <div className="h-7 w-48 rounded bg-white/[0.08] motion-safe:animate-pulse motion-safe:[animation-iteration-count:3]" />
          )}
          {href && (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-xs sm:text-sm font-semibold text-white/40 ml-1.5">
              <span>{t("home.viewAll", "Xem tất cả")}</span>
              <ChevronRight size={14} className="stroke-[2.2] text-white/30" />
            </span>
          )}
        </div>
        <div className="hidden items-center gap-1.5 sm:flex" aria-hidden="true">
          <div className="h-2 w-20 rounded bg-white/[0.07] motion-safe:animate-pulse motion-safe:[animation-iteration-count:3]" />
        </div>
      </div>
      <div className="flex items-stretch gap-3">
        <div className="min-w-0 flex-1">
          <div className="scrollbar-hide flex w-full snap-x snap-mandatory gap-2.5 overflow-x-hidden py-2.5 sm:gap-3.5 lg:gap-4">
            {Array.from({ length: 8 }, (_, idx) => (
              <div key={`skel-row-${idx}`} className={itemWidthClass}>
                <FilmCardSkeleton variant={effectiveCardVariant} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Standard Film Carousel Section Component
function FilmSection({
  title,
  films,
  isLoading,
  href,
  cardVariant,
}: {
  title: string;
  films: FilmItem[];
  isLoading: boolean;
  href?: string;
  cardVariant?: 'standard' | 'landscape' | 'poster-pill';
}) {
  const { t } = useTranslation();
  const cardLayout = useSettingsStore((s) => s.cardLayout);
  const isLandscape = cardLayout === "horizontal";
  const rowRef = useRef<HTMLDivElement>(null);
  const [scrollStep, setScrollStep] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const effectiveCardVariant = cardVariant || (isLandscape ? "landscape" : "standard");
  const isPosterPill = effectiveCardVariant === "poster-pill";

  const itemWidthClass = isLandscape
    ? "w-[72%] min-w-[220px] shrink-0 snap-start sm:w-[46%] md:w-[32%] lg:w-[calc((100%-4*1rem)/5)] xl:w-[calc((100%-4*1rem)/5)]"
    : isPosterPill
      ? "w-[36%] min-w-[130px] shrink-0 snap-start sm:w-[26%] md:w-[20%] lg:w-[calc((100%-5*1rem-2rem)/6)] xl:w-[calc((100%-5*1rem-2rem)/6)] 2xl:w-[calc((100%-5*1rem-2rem)/6)]"
      : "w-[26%] min-w-[112px] shrink-0 snap-start sm:w-[22%] md:w-[18%] lg:w-[calc((100%-6*1rem)/7)] xl:w-[calc((100%-6*1rem)/7)]";

  const updateScrollStep = () => {
    const row = rowRef.current;
    if (!row) return;

    const maxScroll = row.scrollWidth - row.clientWidth;
    setScrollStep(
      maxScroll > 0 ? Math.round((row.scrollLeft / maxScroll) * 3) : 0,
    );
    setCanScrollLeft(row.scrollLeft > 10);
    setCanScrollRight(maxScroll > 0 && row.scrollLeft < maxScroll - 10);
  };

  useEffect(() => {
    updateScrollStep();
    const timer = setTimeout(updateScrollStep, 100);
    const handleResize = () => updateScrollStep();
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [films]);

  const scrollFilms = (direction: -1 | 1) => {
    const row = rowRef.current;
    if (!row) return;
    row.scrollBy({
      left: direction * row.clientWidth * 0.85,
      behavior: "smooth",
    });
  };

  const hasFilms = Boolean(films && films.length > 0);
  const showSkeleton = isLoading || !hasFilms;

  return (
    <div
      data-film-section="true"
      className={`${cardFont.className} mb-8 group/section`}
    >
      {/* Title Header matching user's requested layout (Inline pill button + right dash line pagination) */}
      <div className="mb-3 flex items-start justify-between gap-2 px-1 sm:items-center">
        {/* Left Side: Title + Inline "Xem tất cả >" link */}
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
          <div className="min-w-0 flex-1 sm:flex-none">
            <h2
              data-film-section-title="true"
              className={`${cardFont.className} text-xl font-extrabold tracking-[-0.025em] text-white sm:text-2xl`}
            >
              {title}
            </h2>
          </div>
          {href && (
            <Link
              href={href}
              data-film-section-action="true"
              className="group/link inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs sm:text-sm font-semibold text-white/80 hover:text-white transition-colors select-none ml-1.5"
            >
              <span>{t("home.viewAll", "Xem tất cả")}</span>
              <ChevronRight size={14} className="stroke-[2.2] text-white/60 group-hover/link:text-white transition-transform group-hover/link:translate-x-0.5" />
            </Link>
          )}
        </div>

        {/* Right Side: Dynamic Dash Line Pagination Indicators (— - - - -) */}
        {showSkeleton ? (
          <div className="h-2 w-24 rounded bg-white/[0.07] motion-safe:animate-pulse motion-safe:[animation-iteration-count:3]" />
        ) : (
          <div
            className="hidden items-center gap-1.5 sm:flex"
            aria-hidden="true"
          >
            {[0, 1, 2, 3].map((step) => (
              <span
                key={step}
                className={`h-0.5 rounded-full transition-[width,background-color] duration-200 ${
                  step === scrollStep ? "w-6 bg-white/85" : "w-3 bg-white/20"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Row Container with Navigation */}
      <div className="flex items-stretch gap-3" aria-busy={showSkeleton}>
        <div className="min-w-0 flex-1">
          <div
            ref={rowRef}
            onScroll={updateScrollStep}
            className={cn(
              "scrollbar-hide flex w-full snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain py-2.5 sm:gap-3.5 lg:gap-4",
              isPosterPill && "py-3 sm:py-4 px-1 sm:px-2"
            )}
          >
            {showSkeleton
              ? Array.from({ length: 14 }, (_, index) => (
                  <div
                    key={`film-skeleton-${index}`}
                    className={itemWidthClass}
                  >
                    <FilmCardSkeleton variant={effectiveCardVariant} />
                  </div>
                ))
              : films.map((film, idx) => (
                  <div
                    key={`slide-${title}-${film._id || film.slug || "film"}-${idx}`}
                    className={cn(itemWidthClass, isPosterPill && "py-1")}
                  >
                    <div className="transition-transform duration-300 ease-out hover:scale-[1.03] hover:z-30">
                      <FilmCard
                        film={film}
                        variant={effectiveCardVariant}
                        preferHighQuality={
                          title === "Phim Mới Cập Nhật" && idx < 4
                        }
                      />
                    </div>
                  </div>
                ))}
          </div>
        </div>

        {!showSkeleton && (
          <div className="my-auto hidden shrink-0 flex-col justify-center gap-3 px-1 sm:flex">
            <button
              type="button"
              onClick={() => scrollFilms(1)}
              disabled={!canScrollRight}
              aria-label={`Xem phim tiếp theo trong ${title}`}
              title={`Xem phim tiếp theo trong ${title}`}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white/45 transition-[color,transform,opacity] hover:scale-125 hover:text-white active:scale-90 disabled:pointer-events-none disabled:opacity-20"
            >
              <ChevronRight size={23} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              onClick={() => scrollFilms(-1)}
              disabled={!canScrollLeft}
              aria-label={`Xem phim trước trong ${title}`}
              title={`Xem phim trước trong ${title}`}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white/45 transition-[color,transform,opacity] hover:scale-125 hover:text-white active:scale-90 disabled:pointer-events-none disabled:opacity-20"
            >
              <ChevronLeft size={23} strokeWidth={2.4} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Component Wrapper for Intersection Observer Lazy Load (Smooth progressive load with realistic row skeleton to prevent black voids)
function LazySection({
  children,
  title,
  href,
  cardVariant,
  skeleton,
  initiallyVisible = false,
  onVisible,
}: {
  children: React.ReactNode;
  title?: string;
  href?: string;
  cardVariant?: 'standard' | 'landscape' | 'poster-pill';
  skeleton?: React.ReactNode;
  initiallyVisible?: boolean;
  onVisible?: () => void;
}) {
  const [isVisible, setIsVisible] = useState(initiallyVisible);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          onVisible?.();
          observer.disconnect();
        }
      },
      { rootMargin: "1400px 0px" },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible, onVisible]);

  return (
    <div ref={containerRef} className="w-full">
      {isVisible ? (
        children
      ) : (
        skeleton || (
          <SectionRowSkeleton
            title={title}
            href={href}
            cardVariant={cardVariant}
          />
        )
      )}
    </div>
  );
}

export default function HomePageClient({
  initialPublicConfig,
  initialHeroFilms,
}: {
  initialPublicConfig?: PublicSiteConfiguration | null;
  initialHeroFilms?: FilmItem[];
}) {
  const { t } = useTranslation();

  const [showMoreSections, setShowMoreSections] = useState(false);
  const [loadedSections, setLoadedSections] = useState<Record<string, boolean>>({});
  const infiniteSentinelRef = useRef<HTMLDivElement>(null);

  const markSectionLoaded = useCallback((sectionKey: string) => {
    setLoadedSections((prev) => (prev[sectionKey] ? prev : { ...prev, [sectionKey]: true }));
  }, []);

  const isSectionActive = useCallback(
    (key: string) => Boolean(showMoreSections || loadedSections[key]),
    [showMoreSections, loadedSections],
  );

  useEffect(() => {
    const revealSectionsForRestore = (event?: Event) => {
      let pending: { routeKey?: string; y?: number } | null = null;
      if (event instanceof CustomEvent) {
        pending = event.detail as { routeKey?: string; y?: number };
      } else {
        try {
          const raw = window.sessionStorage.getItem(
            "flexphim:pending-scroll-restore",
          );
          pending = raw ? JSON.parse(raw) : null;
        } catch {
          pending = null;
        }
      }

      const routeKey = `${window.location.pathname}${window.location.search}`;
      if (
        pending?.routeKey === routeKey &&
        typeof pending.y === "number" &&
        pending.y > window.innerHeight
      ) {
        setShowMoreSections(true);
      }
    };

    revealSectionsForRestore();
    window.addEventListener(
      "flexphim:restore-scroll",
      revealSectionsForRestore,
    );
    return () =>
      window.removeEventListener(
        "flexphim:restore-scroll",
        revealSectionsForRestore,
      );
  }, []);

  // Progressive scroll-based loading: automatically fetch and reveal remaining sections as user approaches them
  useEffect(() => {
    if (showMoreSections) return;
    const el = infiniteSentinelRef.current;
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      setShowMoreSections(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShowMoreSections(true);
          observer.disconnect();
        }
      },
      { rootMargin: "1400px 0px" },
    );

    observer.observe(el);

    const timer = window.setTimeout(() => {
      setShowMoreSections(true);
    }, 1200);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [showMoreSections]);

  const queryClient = useQueryClient();
  const [catalogReady] = useState(true);
  const [secondaryCatalogReady] = useState(true);
  const { data: publicConfig } = useQuery({
    queryKey: ["public-site-configuration"],
    queryFn: () => siteConfigApi.getPublic().then((response) => response.data),
    initialData: initialPublicConfig || undefined,
    enabled: true,
    staleTime: 5_000,
    retry: false,
  });
  useEffect(() => {
    if (publicConfig?.seoTitle) document.title = publicConfig.seoTitle;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (description && publicConfig?.seoDescription)
      description.content = publicConfig.seoDescription;
  }, [publicConfig?.seoDescription, publicConfig?.seoTitle]);

  const {
    data: homeFeedData,
    isLoading: homeFeedLoading,
  } = useQuery({
    queryKey: ["home-feed-v1", 24],
    queryFn: () => movieApi.getHomeFeed(24).then((response) => response.data),
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: catalogReady,
  });

  const homeFeedSections = homeFeedData?.sections;
  const homeFeedPool = useMemo(
    () =>
      deduplicate([
        ...(homeFeedSections?.latest || []),
        ...(homeFeedSections?.series || []),
        ...(homeFeedSections?.single || []),
        ...(homeFeedSections?.anime || []),
      ]),
    [homeFeedSections],
  );

  // ── Initial 4 Sections Data (Prioritizing Hollywood/Western Live-Action & Fantasy Movies) ──
  // 1. Phim kỹ xảo (VFX, Fantasy & Myth Movies)
  const vfxGenreData = useMemo(
    () =>
      asCatalogPayload(
        homeFeedPool.filter((film) =>
          movieTaxonomyContains(film.category, [
            "thần thoại",
            "than-thoai",
            "viễn tưởng",
            "vien-tuong",
            "fantasy",
            "sci-fi",
          ]),
        ),
      ),
    [homeFeedPool],
  );
  const vfxUsUkData = vfxGenreData;
  const vfxLoading = secondaryCatalogReady && homeFeedLoading;

  // 2. Series Âu-Mỹ (Hollywood TV Series) - Multi-Page Fetch for Rich Curated Hero Showcase
  const { data: remoteUsUkSeries } = useQuery({
    queryKey: ["home-us-uk-series-list-v3"],
    queryFn: async () => {
      try {
        const [res1, res2, res3] = await Promise.all([
          movieApi.getByCountry("au-my", 1),
          movieApi.getByCountry("au-my", 2),
          movieApi.getByCountry("au-my", 3),
        ]);
        const list1 = extractFilmItems(res1.data);
        const list2 = extractFilmItems(res2.data);
        const list3 = extractFilmItems(res3.data);
        return [...list1, ...list2, ...list3];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    // This enrichment used to launch two more catalogue requests during the
    // hero/LCP window. The home feed already provides a useful first render.
    enabled: secondaryCatalogReady && Boolean(homeFeedSections?.series?.length),
  });

  const usUkSeriesData = useMemo(() => {
    const rawList = [
      ...(remoteUsUkSeries || []),
      ...(homeFeedSections?.series || []).filter(
        (film: FilmItem) =>
          movieTaxonomyContains(film.country, [
            "âu mỹ",
            "au-my",
            "mỹ",
            "anh",
            "united states",
          ]) || !film.country?.length,
      ),
      ...homeFeedPool.filter(
        (film) =>
          movieTaxonomyContains(film.country, [
            "âu mỹ",
            "au-my",
            "mỹ",
            "anh",
            "united states",
          ]) &&
          (film.type === "series" ||
            film.tmdb?.type === "tv" ||
            (film.episode_current &&
              !film.episode_current.toLowerCase().includes("full"))),
      ),
    ];
    return asCatalogPayload(deduplicateSectionRow(rawList));
  }, [remoteUsUkSeries, homeFeedSections?.series, homeFeedPool]);
  const usUkSeriesLoading = secondaryCatalogReady && homeFeedLoading;
  // 3. Phim hành động (Hollywood & International Action Movies)
  const actionData = useMemo(
    () =>
      asCatalogPayload(
        homeFeedPool.filter((film) =>
          movieTaxonomyContains(film.category, ["hành động", "hanh-dong", "action"]),
        ),
      ),
    [homeFeedPool],
  );
  const actionUsUkData = actionData;
  const actionLoading = secondaryCatalogReady && homeFeedLoading;

  // 4. Phim khoa học viễn tưởng bom tấn (Hollywood Sci-Fi Blockbusters)
  const scifiData = vfxGenreData;
  const scifiLoading = secondaryCatalogReady && homeFeedLoading;

  // Phim Tình Cảm Hàn Quốc (K-Drama Romance)
  const { data: remoteKoreanRomanceData, isLoading: koreanRomanceQueryLoading } = useQuery({
    queryKey: ["home-section-korean-romance-v1"],
    queryFn: async () => {
      try {
        const [res1, res2] = await Promise.all([
          movieApi.getFiltered({ country: "han-quoc", category: "tinh-cam", page: 1, limit: 24 }),
          movieApi.getFiltered({ country: "han-quoc", category: "tinh-cam", page: 2, limit: 24 }),
        ]);
        const list1 = extractFilmItems(res1.data);
        const list2 = extractFilmItems(res2.data);
        return [...list1, ...list2] as unknown as FilmItem[];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    enabled: isSectionActive("koreanRomance"),
  });

  const koreanRomanceFilms = useMemo(() => {
    const remote = (remoteKoreanRomanceData || []) as FilmItem[];
    return deduplicate([
      ...CURATED_KOREAN_ROMANCE_FILM_ITEMS,
      ...remote,
    ]);
  }, [remoteKoreanRomanceData]);
  const koreanRomanceLoading = catalogReady && homeFeedLoading && koreanRomanceQueryLoading && !koreanRomanceFilms.length;

  // Phim Chữa Lành (Healing & Wholesome Life Drama)
  const { data: remoteHealingData, isLoading: healingQueryLoading } = useQuery({
    queryKey: ["home-section-healing-v1"],
    queryFn: async () => {
      try {
        const [res1, res2] = await Promise.all([
          movieApi.getFiltered({ category: "tam-ly", page: 1, limit: 24 }),
          movieApi.getFiltered({ category: "gia-dinh", page: 1, limit: 24 }),
        ]);
        const list1 = extractFilmItems(res1.data);
        const list2 = extractFilmItems(res2.data);
        return [...list1, ...list2] as unknown as FilmItem[];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    enabled: isSectionActive("healing"),
  });

  const healingFilms = useMemo(() => {
    const remote = (remoteHealingData || []) as FilmItem[];
    return deduplicate([
      ...CURATED_HEALING_FILM_ITEMS,
      ...remote,
    ]);
  }, [remoteHealingData]);
  const healingLoading = catalogReady && homeFeedLoading && healingQueryLoading && !healingFilms.length;

  // 5-7. Các hàng danh mục chính được trả chung trong home-feed để trình
  // duyệt không phải tạo thêm request khi người dùng cuộn trang chủ.
  const { data: horrorFallbackData, isLoading: horrorFallbackLoading } =
    useQuery({
      queryKey: ["home-section-horror-v1"],
      queryFn: () => movieApi.getByGenre("kinh-di", 1).then((r) => r.data),
      enabled:
        secondaryCatalogReady &&
        !homeFeedLoading &&
        !homeFeedSections?.horror?.length,
      staleTime: 10 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
    });
  const { data: historicalFallbackData, isLoading: historicalFallbackLoading } =
    useQuery({
      queryKey: ["home-section-historical-v1"],
      queryFn: () => movieApi.getByGenre("co-trang", 1).then((r) => r.data),
      enabled:
        secondaryCatalogReady &&
        !homeFeedLoading &&
        !homeFeedSections?.historical?.length,
      staleTime: 10 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
    });
  const {
    data: theatricalFallbackData,
    isLoading: theatricalFallbackLoading,
  } = useQuery({
    queryKey: ["home-section-theatrical-v1"],
    queryFn: () => movieApi.getChieuRap(1).then((r) => r.data),
    enabled:
      secondaryCatalogReady &&
      !homeFeedLoading &&
      !homeFeedSections?.theatrical?.length,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const horrorData = useMemo(
    () =>
      homeFeedSections?.horror?.length
        ? asCatalogPayload(homeFeedSections.horror)
        : horrorFallbackData,
    [homeFeedSections?.horror, horrorFallbackData],
  );
  const historicalData = useMemo(
    () =>
      homeFeedSections?.historical?.length
        ? asCatalogPayload(homeFeedSections.historical)
        : historicalFallbackData,
    [historicalFallbackData, homeFeedSections?.historical],
  );

  // Phim Hình Sự & Tội Phạm (Live-Action, không Anime/Hoạt hình)
  const { data: wuxiaQueryData, isLoading: wuxiaQueryLoading } = useQuery({
    queryKey: ["home-section-crime-v1"],
    queryFn: () => movieApi.getByGenre("hinh-su", 1).then((r) => r.data),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    enabled: true,
  });
  const wuxiaData = useMemo(
    () => wuxiaQueryData,
    [wuxiaQueryData],
  );
  const wuxiaLoading = wuxiaQueryLoading && !wuxiaData;
  const theatricalData = useMemo(
    () =>
      homeFeedSections?.theatrical?.length
        ? asCatalogPayload(homeFeedSections.theatrical)
        : theatricalFallbackData,
    [homeFeedSections?.theatrical, theatricalFallbackData],
  );
  const horrorLoading =
    (catalogReady && homeFeedLoading) || horrorFallbackLoading;
  const historicalLoading =
    (catalogReady && homeFeedLoading) || historicalFallbackLoading;
  const theatricalLoading =
    (catalogReady && homeFeedLoading) || theatricalFallbackLoading;

  // ── Progressive On-Demand Section Queries (Triggered as User Scrolls to Each Row) ──

  // Chủ đề công sở (Workplace & Office Dramas)
  const { data: workplaceRemoteData, isLoading: workplaceQueryLoading } = useQuery({
    queryKey: ["home-section-workplace-v1"],
    queryFn: async () => {
      try {
        const [res1, res2] = await Promise.all([
          movieApi.getFiltered({ category: "tinh-cam", page: 1, limit: 24 }),
          movieApi.getFiltered({ category: "chinh-kich", page: 1, limit: 24 }),
        ]);
        const list1 = extractFilmItems(res1.data);
        const list2 = extractFilmItems(res2.data);
        return [...list1, ...list2] as unknown as FilmItem[];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    enabled: isSectionActive("workplace"),
  });

  // Phim hay được đón nhận (Critically Acclaimed & Audience Favorites)
  const { data: acclaimedRemoteData, isLoading: acclaimedQueryLoading } = useQuery({
    queryKey: ["home-section-acclaimed-v1"],
    queryFn: () =>
      movieApi
        .getFiltered({
          sort_field: "view",
          page: 1,
          limit: 24,
        })
        .then((r) => r.data)
        .catch(() => null),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    enabled: isSectionActive("acclaimed"),
  });

  // 5. Xem gì tiếp theo (Hollywood Recommendations)
  const { data: usUkBlockbustersData, isLoading: nextWatchQueryLoading } = useQuery({
    queryKey: ["us-uk-blockbusters-next"],
    queryFn: () => movieApi.getByCountry("au-my", 2).then((r) => r.data),
    enabled: isSectionActive("nextWatch"),
  });

  // 6. Series quốc tế (International Series)
  const seriesData = useMemo(
    () =>
      homeFeedSections?.series
        ? asCatalogPayload(homeFeedSections.series)
        : undefined,
    [homeFeedSections?.series],
  );

  // 7. Anime & Hoạt hình lồng tiếng (ONLY place for Anime/3D Animation)
  const animeData = useMemo(
    () =>
      homeFeedSections?.anime
        ? asCatalogPayload(homeFeedSections.anime)
        : undefined,
    [homeFeedSections?.anime],
  );
  const { data: animeGenreData, isLoading: animeGenreQueryLoading } = useQuery({
    queryKey: ["anime-genre", 1],
    queryFn: () => movieApi.getByGenre("hoat-hinh", 1).then((r) => r.data),
    enabled: isSectionActive("anime"),
  });

  // 8. Phim phiêu lưu mạo hiểm (Hollywood & International Adventure Movies)
  const { data: adventureUsUkData, isLoading: adventureUsUkLoading } = useQuery({
    queryKey: ["adventure-movies-us-uk-v2"],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: "au-my",
          category: "phieu-luu",
          page: 1,
          limit: 24,
        })
        .then((r) => r.data),
    enabled: isSectionActive("adventure"),
  });
  const { data: adventureData, isLoading: adventureFeatureLoading } = useQuery({
    queryKey: ["adventure-movies-feature-films-v2"],
    queryFn: () =>
      movieApi
        .getFiltered({
          type: "phim-le",
          category: "phieu-luu",
          page: 1,
          limit: 24,
        })
        .then((r) => r.data),
    enabled: isSectionActive("adventure"),
  });
  const adventureQueryLoading = adventureUsUkLoading || adventureFeatureLoading;

  // 9. Phim chất lượng cao Hollywood
  const singleData = useMemo(
    () =>
      homeFeedSections?.single
        ? asCatalogPayload(homeFeedSections.single)
        : undefined,
    [homeFeedSections?.single],
  );

  // 10. Phim chính kịch chuyển thể từ sách (Book Adaptation Dramas)
  const { data: dramaData, isLoading: dramaQueryLoading } = useQuery({
    queryKey: ["drama-movies"],
    queryFn: () => movieApi.getByGenre("chinh-kich", 1).then((r) => r.data),
    enabled: isSectionActive("drama"),
  });

  // 11. Phim kịch tính về thảm họa chết chóc (Hollywood Thriller & Disaster)
  const { data: disasterUsUkData, isLoading: disasterQueryLoading } = useQuery({
    queryKey: ["disaster-movies-us-uk"],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: "au-my",
          category: "kinh-di",
          page: 1,
          limit: 24,
        })
        .then((r) => r.data),
    enabled: isSectionActive("disaster"),
  });

  // 12. Thể loại chiến tranh và gai góc (War Movies)
  const { data: warData, isLoading: warQueryLoading } = useQuery({
    queryKey: ["war-movies"],
    queryFn: () => movieApi.getByGenre("chien-tranh", 1).then((r) => r.data),
    enabled: isSectionActive("war"),
  });

  // 13. Phim hài (Comedy Movies)
  const { data: comedyData, isLoading: comedyQueryLoading } = useQuery({
    queryKey: ["comedy-movies"],
    queryFn: () => movieApi.getByGenre("hai-huoc", 1).then((r) => r.data),
    enabled: isSectionActive("comedy"),
  });

  // 14. Bộ phim giải trí hoàn hảo (Romance & Feel-Good Movies)
  const { data: romanceData, isLoading: romanceQueryLoading } = useQuery({
    queryKey: ["romance-movies"],
    queryFn: () => movieApi.getByGenre("tinh-cam", 1).then((r) => r.data),
    enabled: isSectionActive("romance"),
  });

  // Latest films query for Phim Mới Cập Nhật
  const latestData = useMemo(
    () =>
      homeFeedSections?.latest
        ? asCatalogPayload(homeFeedSections.latest)
        : undefined,
    [homeFeedSections?.latest],
  );
  const latestLoading = catalogReady && homeFeedLoading;
  // Top 10 phim đang được xem nhiều nhất toàn hệ thống (Global Platform-wide Top 10)
  const { data: systemTop10Data } = useQuery({
    queryKey: ["home-system-top10-v2"],
    queryFn: async () => {
      try {
        const res = await recommendationApi.getTop10();
        if (Array.isArray(res?.items) && res.items.length > 0) {
          return res.items as FilmItem[];
        }
      } catch {
        // Fallback
      }
      try {
        const top10Res = await movieApi.getTop10(10);
        const items =
          (top10Res as any)?.data?.items ||
          (top10Res as any)?.items ||
          (Array.isArray(top10Res) ? top10Res : []);
        if (Array.isArray(items) && items.length > 0) {
          return items as FilmItem[];
        }
      } catch {
        // Fallback
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const trendingData = useMemo(
    () => homeFeedData?.top10 || [],
    [homeFeedData?.top10],
  );
  const trendingFilms = useMemo(() => {
    const fromSystem = Array.isArray(systemTop10Data) ? systemTop10Data : [];
    const fromHomeFeed = Array.isArray(trendingData) ? trendingData : [];
    return deduplicate([...fromSystem, ...fromHomeFeed]);
  }, [systemTop10Data, trendingData]);

  // ── Process arrays with STRICT Live-Action filtering for Hollywood rows ──
  const vfxFilms = useMemo(() => {
    // Strictly filter out mistagged titles (Asian BL, monk comedies, tiên hiệp, donghua, 3D animation, etc.)
    const isGenuineVfx = (film: FilmItem) => {
      if (!film?.name || !film?.slug) return false;
      const combined = `${film.name} ${film.origin_name || ""} ${film.content || ""}`.toLowerCase();
      if (
        /chiến binh ánh sáng|chiến binh nụ cười|ultraman|cả thế giới chỉ có anh kết nối|người yêu xui xẻo|unlucky bae|độc kiếm cửu thiên|sword god|nour|sư huynh quá cẩn trọng|pull strings|gián đột biến|the nest|tàn thuốc|luang pho|tiên hiệp|kiếm hiệp|ngôn tình|học đường|đam mỹ|boys love|tình cảm gia đình|hài kịch thái lan/i.test(
          combined,
        )
      ) {
        return false;
      }
      return (
        movieTaxonomyContains(film.category, [
          "thần thoại",
          "than-thoai",
          "viễn tưởng",
          "vien-tuong",
          "fantasy",
          "sci-fi",
          "kỹ xảo",
          "hành động",
        ]) &&
        (movieTaxonomyContains(film.country, [
          "âu mỹ",
          "au-my",
          "mỹ",
          "anh",
          "united states",
        ]) || !film.country?.length)
      );
    };

    const list1 = (vfxGenreData?.data?.items || vfxGenreData?.items || []).filter(isGenuineVfx);
    const list2 = (vfxUsUkData?.data?.items || vfxUsUkData?.items || []).filter(isGenuineVfx);

    return deduplicate([
      ...CURATED_VFX_FILM_ITEMS,
      ...filterLiveActionOnly([...list1, ...list2]),
    ]);
  }, [vfxGenreData, vfxUsUkData]);

  const usUkSeriesFilms = useMemo(() => {
    const firstPage =
      usUkSeriesData?.data?.items || usUkSeriesData?.items || [];
    const liveAction = filterLiveActionOnly(
      deduplicate(firstPage),
    );
    return liveAction.filter(isLikelySeries);
  }, [usUkSeriesData]);

  const actionFilms = useMemo(() => {
    // Only allow genuine Action Blockbusters (strictly filter out Asian BL, monk comedies, tiên hiệp, donghua, teen romance, etc.)
    const isGenuineAction = (film: FilmItem) => {
      if (!film?.name || !film?.slug) return false;
      if (isAnimationOrAnime(film)) return false;
      if (
        film.episode_current?.toLowerCase().includes("trailer") ||
        film.quality?.toLowerCase().includes("trailer") ||
        /sắp chiếu|trailer|dự kiến khởi chiếu/i.test(film.episode_current || "")
      ) {
        return false;
      }
      const combined = `${film.name} ${film.origin_name || ""} ${film.content || ""}`.toLowerCase();
      if (
        /deadpool|doraemon|conan|chiến binh ánh sáng|tàn thuốc|luang pho|người yêu xui xẻo|unlucky bae|độc kiếm cửu thiên|sư huynh quá cẩn trọng|tiên hiệp|kiếm hiệp|ngôn tình|học đường|đam mỹ|boys love|tình cảm gia đình|hài kịch thái lan|gián đột biến/i.test(
          combined,
        )
      ) {
        return false;
      }
      return movieTaxonomyContains(film.category, ["hành động", "hanh-dong", "action"]);
    };

    const usUkList = (actionUsUkData?.data?.items || actionUsUkData?.items || []).filter(isGenuineAction);
    const genList = (actionData?.data?.items || actionData?.items || []).filter(isGenuineAction);

    return deduplicate([
      ...CURATED_ACTION_FILM_ITEMS,
      ...filterLiveActionOnly([...usUkList, ...genList]),
    ]);
  }, [actionUsUkData, actionData]);

  const scifiFilms = useMemo(() => {
    // Only allow genuine Sci-Fi live-action films (strictly filter out Asian BL/teen romance, tiên hiệp, donghua, or comedy series that are mistagged by upstream APIs)
    const isGenuineSciFi = (film: FilmItem) => {
      if (!film?.name || !film?.slug) return false;
      const combined = `${film.name} ${film.origin_name || ""} ${film.content || ""}`.toLowerCase();
      if (
        /người yêu xui xẻo|unlucky bae|độc kiếm cửu thiên|sư huynh quá cẩn trọng|chiến binh ánh sáng|chiến binh nụ cười|tiên hiệp|kiếm hiệp|ngôn tình|học đường|đam mỹ|boys love|tình cảm gia đình|hài kịch thái lan|gián đột biến/i.test(
          combined,
        )
      ) {
        return false;
      }
      return movieTaxonomyContains(film.category, ["viễn tưởng", "vien-tuong", "sci-fi"]);
    };

    const usUkList = (vfxUsUkData?.data?.items || vfxUsUkData?.items || []).filter(isGenuineSciFi);
    const genList = (scifiData?.data?.items || scifiData?.items || []).filter(isGenuineSciFi);

    return deduplicate([
      ...CURATED_SCIFI_FILM_ITEMS,
      ...filterLiveActionOnly([...usUkList, ...genList]),
    ]);
  }, [vfxUsUkData, scifiData]);

  const horrorFilms = useMemo(() => {
    const list = horrorData?.data?.items || horrorData?.items || [];
    return deduplicate(
      rankHotCatalogFilms(filterLiveActionOnly(list), trendingFilms),
    );
  }, [horrorData, trendingFilms]);

  const wuxiaFilms = useMemo(() => {
    const list = wuxiaData?.data?.items || wuxiaData?.items || [];
    const poolMatches = homeFeedPool.filter((film) =>
      movieTaxonomyContains(film.category, [
        "hình sự",
        "hinh-su",
        "tội phạm",
        "toi-pham",
        "trinh thám",
        "trinh-tham",
      ]),
    );
    return deduplicate(
      rankHotCatalogFilms(
        filterLiveActionOnly([...list, ...poolMatches]),
        trendingFilms,
      ),
    );
  }, [wuxiaData, homeFeedPool, trendingFilms]);

  const historicalFilms = useMemo(() => {
    const list = historicalData?.data?.items || historicalData?.items || [];
    const poolMatches = homeFeedPool.filter((film) =>
      movieTaxonomyContains(film.category, [
        "cổ trang",
        "co-trang",
        "kiếm hiệp",
        "kiem-hiep",
        "tiên hiệp",
        "tien-hiep",
        "võ thuật",
      ]),
    );
    return deduplicate(
      rankHotCatalogFilms(
        filterLiveActionOnly([...list, ...poolMatches]),
        trendingFilms,
      ),
    );
  }, [historicalData, homeFeedPool, trendingFilms]);

  const theatricalFilms = useMemo(() => {
    const list = theatricalData?.data?.items || theatricalData?.items || [];
    return deduplicate(
      rankHotCatalogFilms(list, trendingFilms, { releaseFocused: true }),
    );
  }, [theatricalData, trendingFilms]);

  const nextWatchFilms = useMemo(() => {
    const list =
      usUkBlockbustersData?.data?.items || usUkBlockbustersData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [usUkBlockbustersData]);

  const seriesFilms = useMemo(() => {
    const list = seriesData?.data?.items || seriesData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [seriesData]);

  // Anime & 3D Animation (ONLY row allowed to contain Animation)
  const animeFilms = useMemo(() => {
    const list1 = animeData?.data?.items || animeData?.items || [];
    const list2 = animeGenreData?.data?.items || animeGenreData?.items || [];
    return deduplicate([...list1, ...list2]);
  }, [animeData, animeGenreData]);

  const adventureFilms = useMemo(() => {
    const isGenuineAdventure = (film: FilmItem) => {
      if (!film?.name || !film?.slug) return false;
      if (isAnimationOrAnime(film)) return false;
      const combined = `${film.name} ${film.origin_name || ""} ${film.content || ""}`.toLowerCase();
      if (
        /chiến binh ánh sáng|ultraman|chuyển sinh|thánh nữ|trùm cuối|kanata|zombie sagashitemasu|vạn giới|độc tôn|tu tiên|độc kiếm|sư huynh|gián đột biến|tàn thuốc|luang pho|tiên hiệp|ngôn tình|đam mỹ|boys love|hài kịch thái lan/i.test(
          combined,
        )
      ) {
        return false;
      }
      return true;
    };

    const usUkList = (adventureUsUkData?.data?.items || adventureUsUkData?.items || []).filter(isGenuineAdventure);
    const featureList = (adventureData?.data?.items || adventureData?.items || []).filter(isGenuineAdventure);
    const poolMatches = homeFeedPool.filter(
      (film) =>
        movieTaxonomyContains(film.category, ["phiêu lưu", "phieu-luu", "adventure"]) &&
        isGenuineAdventure(film),
    );

    return deduplicate([
      ...CURATED_ADVENTURE_FILM_ITEMS,
      ...filterLiveActionOnly([...usUkList, ...featureList, ...poolMatches]),
    ]);
  }, [adventureUsUkData, adventureData, homeFeedPool]);

  const singleFilms = useMemo(() => {
    const list = singleData?.data?.items || singleData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [singleData]);

  const dramaFilms = useMemo(() => {
    const list = dramaData?.data?.items || dramaData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [dramaData]);

  const disasterFilms = useMemo(() => {
    const list = disasterUsUkData?.data?.items || disasterUsUkData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [disasterUsUkData]);

  const warFilms = useMemo(() => {
    const list = warData?.data?.items || warData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [warData]);

  const comedyFilms = useMemo(() => {
    const list = comedyData?.data?.items || comedyData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [comedyData]);

  const romanceFilms = useMemo(() => {
    const list = romanceData?.data?.items || romanceData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [romanceData]);

  const workplaceFilms = useMemo(() => {
    const isWorkplaceFilm = (film: FilmItem) => {
      if (!film?.name || !film?.slug) return false;
      const combined = `${film.name} ${film.origin_name || ""} ${film.content || ""}`.toLowerCase();
      return (
        /công sở|văn phòng|thư ký|tổng tài|sếp|giám đốc|khởi nghiệp|kinh doanh|doanh nghiệp|đồng nghiệp|tài chính|thương trường|luật sư|bác sĩ|nghề nghiệp|hẹn hò chốn công sở|office|business|secretary|workplace|intern|corporate|boss/i.test(
          combined,
        ) ||
        [
          "hen-ho-chon-cong-so",
          "thu-ky-kim-sao-the",
          "khach-san-vuong-gia",
          "soi-gia-pho-wall",
          "nu-hoang-nuoc-mat",
          "khoi-nghiep",
          "co-di-ma-lay-chong-toi",
          "co-nang-cu-ta-kim-bok-joo",
          "co-nang-manh-me-do-bong-soon",
        ].includes(film.slug)
      );
    };

    const remote = (workplaceRemoteData || []).filter(isWorkplaceFilm);
    const poolMatches = homeFeedPool.filter(isWorkplaceFilm);

    return deduplicate([
      ...CURATED_WORKPLACE_FILM_ITEMS,
      ...filterLiveActionOnly([...remote, ...poolMatches]),
    ]);
  }, [workplaceRemoteData, homeFeedPool]);

  const acclaimedFilms = useMemo(() => {
    const list = acclaimedRemoteData?.data?.items || acclaimedRemoteData?.items || [];
    const highRatedPool = homeFeedPool.filter(
      (film) => (film.vote_average || film.rating || 0) >= 8.0,
    );
    return deduplicate([
      ...CURATED_ACCLAIMED_FILM_ITEMS,
      ...rankHotCatalogFilms(
        filterLiveActionOnly([...list, ...highRatedPool]),
        trendingFilms,
      ),
    ]);
  }, [acclaimedRemoteData, homeFeedPool, trendingFilms]);

  const workplaceLoading =
    isSectionActive("workplace") &&
    workplaceQueryLoading &&
    !workplaceFilms.length;
  const acclaimedLoading =
    isSectionActive("acclaimed") &&
    acclaimedQueryLoading &&
    !acclaimedFilms.length;
  const nextWatchLoading =
    isSectionActive("nextWatch") &&
    nextWatchQueryLoading &&
    !nextWatchFilms.length;
  const seriesLoading =
    isSectionActive("series") && homeFeedLoading && !seriesFilms.length;
  const animeLoading =
    isSectionActive("anime") &&
    (homeFeedLoading || animeGenreQueryLoading) &&
    !animeFilms.length;
  const adventureLoading =
    isSectionActive("adventure") &&
    adventureQueryLoading &&
    !adventureFilms.length;
  const singleLoading =
    isSectionActive("single") && homeFeedLoading && !singleFilms.length;
  const dramaLoading =
    isSectionActive("drama") && dramaQueryLoading && !dramaFilms.length;
  const disasterLoading =
    isSectionActive("disaster") &&
    disasterQueryLoading &&
    !disasterFilms.length;
  const warLoading =
    isSectionActive("war") && warQueryLoading && !warFilms.length;
  const comedyLoading =
    isSectionActive("comedy") && comedyQueryLoading && !comedyFilms.length;
  const romanceLoading =
    isSectionActive("romance") && romanceQueryLoading && !romanceFilms.length;

  const latestFilms = useMemo(
    () => deduplicate(latestData?.items || latestData?.data?.items || []),
    [latestData],
  );
  // Deduplication registry & row limits
  const {
    top10List,
    latestRowList,
    wuxiaRowList,
    vfxRowList,
    usUkSeriesRowList,
    actionRowList,
    scifiRowList,
    horrorRowList,
    historicalRowList,
    theatricalRowList,
    acclaimedRowList,
    workplaceRowList,
    nextWatchRowList,
    seriesRowList,
    animeRowList,
    adventureRowList,
    singleRowList,
    dramaRowList,
    disasterRowList,
    warRowList,
    comedyRowList,
    romanceRowList,
    koreanRomanceRowList,
    healingRowList,
  } = useMemo(() => {
    const buildRow = (rawFilms: FilmItem[], targetCount = 14): FilmItem[] => {
      return deduplicate(rawFilms).slice(0, targetCount);
    };

    // Initial Sections
    const latestRowList = buildRow(latestFilms, 21);
    const wuxiaRowList = buildRow(wuxiaFilms, 14);
    const vfxRowList = buildRow(vfxFilms, 14);
    const usUkSeriesRowList = buildRow(usUkSeriesFilms, 30);
    const actionRowList = buildRow(actionFilms, 14);
    const koreanRomanceRowList = buildRow(koreanRomanceFilms, 14);
    const healingRowList = buildRow(healingFilms, 14);
    const scifiRowList = buildRow(scifiFilms, 14);
    const horrorRowList = buildRow(horrorFilms, 14);
    const historicalRowList = buildRow(historicalFilms, 14);
    const theatricalRowList = buildRow(theatricalFilms, 14);
    const acclaimedRowList = buildRow(acclaimedFilms, 14);
    const workplaceRowList = buildRow(workplaceFilms, 14);

    // Lazy 10 Sections
    const nextWatchRowList = buildRow(nextWatchFilms, 14);
    const seriesRowList = buildRow(seriesFilms, 21);
    const animeRowList = buildRow(animeFilms, 21);
    const adventureRowList = buildRow(adventureFilms, 14);
    const singleRowList = buildRow(singleFilms, 21);
    const dramaRowList = buildRow(dramaFilms, 14);
    const disasterRowList = buildRow(disasterFilms, 14);
    const warRowList = buildRow(warFilms, 14);
    const comedyRowList = buildRow(comedyFilms, 14);
    const romanceRowList = buildRow(romanceFilms, 14);

    const sectionSlugs = new Set(
      [
        ...latestRowList,
        ...wuxiaRowList,
        ...vfxRowList,
        ...usUkSeriesRowList,
        ...actionRowList,
        ...koreanRomanceRowList,
        ...healingRowList,
        ...scifiRowList,
        ...horrorRowList,
        ...historicalRowList,
        ...theatricalRowList,
        ...acclaimedRowList,
        ...workplaceRowList,
        ...nextWatchRowList,
        ...seriesRowList,
        ...animeRowList,
        ...adventureRowList,
        ...singleRowList,
        ...dramaRowList,
        ...disasterRowList,
        ...warRowList,
        ...comedyRowList,
        ...romanceRowList,
      ].map((film) => film.slug),
    );

    // Phim Top 10 thịnh hành được xem nhiều nhất toàn hệ thống (không lấy lịch sử cá nhân từng user)
    const realCandidates = deduplicate([
      ...trendingFilms,
      ...REAL_TRENDING_TOP10_POOL,
      ...latestFilms,
      ...usUkSeriesFilms,
      ...actionFilms,
      ...koreanRomanceFilms,
      ...healingFilms,
      ...vfxFilms,
      ...scifiFilms,
      ...horrorFilms,
      ...historicalFilms,
      ...theatricalFilms,
      ...acclaimedFilms,
      ...workplaceFilms,
    ]);

    const sanitizedCandidates = realCandidates.map((film) => {
      const safeQuality = (film.quality || "FHD")
        .replace(/4K\s*Ultra\s*HD|4K/gi, "FHD")
        .trim();
      return {
        ...film,
        quality: safeQuality || "FHD",
      };
    });

    const top10List = deduplicateSectionRow(
      filterLiveActionOnly(sanitizedCandidates),
    ).slice(0, 10);

    return {
      top10List,
      latestRowList,
      wuxiaRowList,
      vfxRowList,
      usUkSeriesRowList,
      actionRowList,
      koreanRomanceRowList,
      healingRowList,
      scifiRowList,
      horrorRowList,
      historicalRowList,
      theatricalRowList,
      acclaimedRowList,
      workplaceRowList,
      nextWatchRowList,
      seriesRowList,
      animeRowList,
      adventureRowList,
      singleRowList,
      dramaRowList,
      disasterRowList,
      warRowList,
      comedyRowList,
      romanceRowList,
    };
  }, [
    trendingFilms,
    latestFilms,
    vfxFilms,
    usUkSeriesFilms,
    actionFilms,
    koreanRomanceFilms,
    healingFilms,
    scifiFilms,
    horrorFilms,
    historicalFilms,
    theatricalFilms,
    acclaimedFilms,
    workplaceFilms,
    nextWatchFilms,
    seriesFilms,
    animeFilms,
    adventureFilms,
    singleFilms,
    dramaFilms,
    disasterFilms,
    warFilms,
    comedyFilms,
    romanceFilms,
  ]);

  const configuredTop10List = useMemo(() => {
    const slugs = publicConfig?.homeTop10Slugs || [];
    if (!slugs.length) return top10List;
    const pool = deduplicate([
      ...top10List,
      ...trendingFilms,
      ...REAL_TRENDING_TOP10_POOL,
      ...latestFilms,
    ]);
    const selected = slugs
      .map((slug) => pool.find((film) => film.slug === slug))
      .filter((film): film is FilmItem => Boolean(film));
    return deduplicate([...selected, ...pool]).slice(0, 10);
  }, [latestFilms, publicConfig?.homeTop10Slugs, top10List, trendingFilms]);

  const weeklyMobileRowList = useMemo(() => {
    const interleaved: FilmItem[] = [];
    const length = Math.max(seriesRowList.length, singleRowList.length);
    for (let index = 0; index < length; index += 1) {
      if (seriesRowList[index]) interleaved.push(seriesRowList[index]);
      if (singleRowList[index]) interleaved.push(singleRowList[index]);
    }
    return deduplicateSectionRow(interleaved).slice(0, 14);
  }, [seriesRowList, singleRowList]);

  const customFeaturedSections = useMemo(() => {
    const rows = publicConfig?.homeFeaturedRows;
    if (!rows || typeof rows !== "object" || Array.isArray(rows)) return {};

    const filmPool = deduplicate([
      ...latestFilms,
      ...trendingFilms,
      ...vfxFilms,
      ...usUkSeriesFilms,
      ...actionFilms,
      ...koreanRomanceFilms,
      ...healingFilms,
      ...scifiFilms,
      ...horrorFilms,
      ...historicalFilms,
      ...theatricalFilms,
      ...seriesFilms,
      ...animeFilms,
      ...singleFilms,
    ]);

    return Object.fromEntries(
      Object.entries(rows).flatMap(([rowId, rawRow]) => {
        if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow))
          return [];
        const row = rawRow as Record<string, unknown>;
        const title = typeof row.title === "string" ? row.title.trim() : "";
        const slugs = Array.isArray(row.slugs)
          ? row.slugs.filter((slug): slug is string => typeof slug === "string")
          : [];
        const films = slugs
          .map((slug) => filmPool.find((film) => film.slug === slug))
          .filter((film): film is FilmItem => Boolean(film));
        if (!title || !films.length) return [];
        const href = typeof row.href === "string" ? row.href : "/films";
        return [
          [
            `featured:${rowId}`,
            <LazySection key={rowId}>
              <FilmSection
                title={title}
                films={films}
                isLoading={false}
                href={href}
              />
            </LazySection>,
          ],
        ];
      }),
    ) as Record<string, React.ReactNode>;
  }, [
    actionFilms,
    animeFilms,
    healingFilms,
    historicalFilms,
    horrorFilms,
    koreanRomanceFilms,
    latestFilms,
    publicConfig?.homeFeaturedRows,
    scifiFilms,
    seriesFilms,
    singleFilms,
    trendingFilms,
    theatricalFilms,
    usUkSeriesFilms,
    vfxFilms,
  ]);

  const hiddenHomeSections = new Set(publicConfig?.homeHiddenSections || []);
  const primarySections: Record<string, React.ReactNode> = {
    top10: (
      <LazySection initiallyVisible>
        <Top10RankedRow films={configuredTop10List} />
      </LazySection>
    ),
    continue: (
      <LazySection initiallyVisible>
        <AuthHistoryCalloutBanner className="mb-8" />
        <ContinueWatchingRow fallbackFilms={homeFeedPool} />
      </LazySection>
    ),
    latest: (
      <LazySection initiallyVisible>
        <div className="hidden md:block">
          <LandscapeSpotlightRow
            title={t("sections.latest", "Phim Mới Cập Nhật")}
            films={latestRowList}
            isLoading={latestLoading}
            href="/films"
            cardLinkMode="detail"
          />
        </div>
        <div className="md:hidden">
          <FilmSection
            title={t("sections.latest", "Phim Mới Cập Nhật")}
            films={latestRowList}
            isLoading={latestLoading}
            href="/films"
          />
        </div>
      </LazySection>
    ),
    wuxia: (
      <LazySection initiallyVisible>
        <FilmSection
          title={t("sections.wuxia", "Phim Hình Sự & Tội Phạm")}
          films={wuxiaRowList}
          isLoading={wuxiaLoading}
          href="/genre/hinh-su"
        />
      </LazySection>
    ),
    crime: (
      <LazySection initiallyVisible>
        <FilmSection
          title={t("sections.crime", "Phim Hình Sự & Tội Phạm")}
          films={wuxiaRowList}
          isLoading={wuxiaLoading}
          href="/genre/hinh-su"
        />
      </LazySection>
    ),
    vfx: (
      <LazySection title={t("sections.vfx", "Phim Viễn Tưởng")} href="/genre/vien-tuong" onVisible={() => markSectionLoaded("vfx")}>
        <FilmSection
          title={t("sections.vfx", "Phim Viễn Tưởng")}
          films={vfxRowList}
          isLoading={vfxLoading}
          href="/genre/vien-tuong"
        />
      </LazySection>
    ),
    "usuk-series": (
      <LazySection title={t("sections.usUkSeries", "Series Âu-Mỹ Đỉnh Cao")} href="/search?type=series&country=au-my" onVisible={() => markSectionLoaded("usuk-series")}>
        <div className="hidden md:block">
          <HeroShowcaseSection
            title={t("sections.usUkSeries", "Series Âu-Mỹ Đỉnh Cao")}
            films={usUkSeriesRowList}
            isLoading={usUkSeriesLoading}
            href="/search?type=series&country=au-my"
          />
        </div>
        <div className="md:hidden">
          <FilmSection
            title={t("sections.usUkSeries", "Series Âu-Mỹ Đỉnh Cao")}
            films={usUkSeriesRowList}
            isLoading={usUkSeriesLoading}
            href="/search?type=series&country=au-my"
          />
        </div>
      </LazySection>
    ),
    action: (
      <LazySection title={t("sections.action", "Phim Hành Động Kịch Tính")} href="/genre/hanh-dong" onVisible={() => markSectionLoaded("action")}>
        <FilmSection
          title={t("sections.action", "Phim Hành Động Kịch Tính")}
          films={actionRowList}
          isLoading={actionLoading}
          href="/genre/hanh-dong"
        />
      </LazySection>
    ),
    "korean-romance": (
      <LazySection title={t("sections.koreanRomance", "Phim Tình Cảm Hàn Quốc")} href="/films?country=han-quoc&genre=tinh-cam" onVisible={() => markSectionLoaded("koreanRomance")}>
        <FilmSection
          title={t("sections.koreanRomance", "Phim Tình Cảm Hàn Quốc")}
          films={koreanRomanceRowList}
          isLoading={koreanRomanceLoading}
          href="/films?country=han-quoc&genre=tinh-cam"
        />
      </LazySection>
    ),
    healing: (
      <LazySection title={t("sections.healing", "Phim Chữa Lành")} href="/films?genre=tam-ly" onVisible={() => markSectionLoaded("healing")}>
        <FilmSection
          title={t("sections.healing", "Phim Chữa Lành")}
          films={healingRowList}
          isLoading={healingLoading}
          href="/films?genre=tam-ly"
        />
      </LazySection>
    ),
    scifi: (
      <LazySection title={t("sections.scifi", "Tuyệt Tác Khoa Học Viễn Tưởng")} href="/genre/vien-tuong" onVisible={() => markSectionLoaded("scifi")}>
        <div className="hidden md:block">
          <CuratedSpotlightSection
            title={t("sections.scifi", "Tuyệt Tác Khoa Học Viễn Tưởng")}
            films={scifiRowList}
            isLoading={scifiLoading}
            href="/genre/vien-tuong"
          />
        </div>
        <div className="md:hidden">
          <FilmSection
            title={t("sections.scifi", "Tuyệt Tác Khoa Học Viễn Tưởng")}
            films={scifiRowList}
            isLoading={scifiLoading}
            href="/genre/vien-tuong"
          />
        </div>
      </LazySection>
    ),
    horror: (
      <LazySection title={t("sections.horror", "Phim Kinh Dị")} href="/genre/kinh-di" onVisible={() => markSectionLoaded("horror")}>
        <FilmSection
          title={t("sections.horror", "Phim Kinh Dị")}
          films={horrorRowList}
          isLoading={horrorLoading}
          href="/genre/kinh-di"
        />
      </LazySection>
    ),
    historical: (
      <LazySection title={t("sections.historical", "Phim Cổ Trang")} href="/genre/co-trang" cardVariant="poster-pill" onVisible={() => markSectionLoaded("historical")}>
        <div data-mobile-simple-section="historical" className="md:hidden">
          <FilmSection
            title={t("sections.historical", "Phim Cổ Trang")}
            films={historicalRowList}
            isLoading={historicalLoading}
            href="/genre/co-trang"
          />
        </div>
        <div className="hidden md:block">
          <FilmSection
            title={t("sections.historical", "Phim Cổ Trang")}
            films={historicalRowList}
            isLoading={historicalLoading}
            href="/genre/co-trang"
            cardVariant="poster-pill"
          />
        </div>
      </LazySection>
    ),
    theatrical: (
      <LazySection title={t("sections.theatrical", "Phim Chiếu Rạp")} href="/films/chieu-rap" onVisible={() => markSectionLoaded("theatrical")}>
        <FilmSection
          title={t("sections.theatrical", "Phim Chiếu Rạp")}
          films={theatricalRowList}
          isLoading={theatricalLoading}
          href="/films/chieu-rap"
        />
      </LazySection>
    ),
    acclaimed: (
      <LazySection title={t("sections.acclaimed", "Phim Hay Được Đón Nhận")} href="/films?sort=view" onVisible={() => markSectionLoaded("acclaimed")}>
        <FilmSection
          title={t("sections.acclaimed", "Phim Hay Được Đón Nhận")}
          films={acclaimedRowList}
          isLoading={acclaimedLoading}
          href="/films?sort=view"
        />
      </LazySection>
    ),
    workplace: (
      <LazySection title={t("sections.workplace", "Phim Đề Tài Công Sở")} href="/films?genre=tinh-cam" onVisible={() => markSectionLoaded("workplace")}>
        <FilmSection
          title={t("sections.workplace", "Phim Đề Tài Công Sở")}
          films={workplaceRowList}
          isLoading={workplaceLoading}
          href="/films?genre=tinh-cam"
        />
      </LazySection>
    ),
    ...customFeaturedSections,
  };
  const defaultSectionOrder = [
    "top10",
    "continue",
    "latest",
    "wuxia",
    "vfx",
    "usuk-series",
    "action",
    "korean-romance",
    "healing",
    "scifi",
    "horror",
    "historical",
    "theatrical",
    "acclaimed",
    "workplace",
  ];
  const savedSectionOrder = (publicConfig?.homeSectionOrder?.length
    ? publicConfig.homeSectionOrder
    : defaultSectionOrder).filter((sectionId) => sectionId !== "schedule");
  const configuredSectionOrder = [
    ...savedSectionOrder,
    ...defaultSectionOrder.filter(
      (sectionId) => !savedSectionOrder.includes(sectionId),
    ),
  ];
  const primarySectionOrder = [
    ...configuredSectionOrder,
    ...Object.keys(customFeaturedSections).filter(
      (sectionId) => !configuredSectionOrder.includes(sectionId),
    ),
  ];
  return (
    <div
      data-home-page="true"
      className="netflix-home-page min-h-screen text-foreground overflow-hidden pb-12 bg-[#141414]"
    >
      <HomeAnnouncementPopup />
      {/* Hero Banner slider */}
      <HeroBanner
        films={initialHeroFilms}
        initialConfig={publicConfig || initialPublicConfig || undefined}
        randomizeCuratedPool={!publicConfig?.heroMovieSlugs?.length && !initialPublicConfig?.heroMovieSlugs?.length}
      />

      {/* Main Content Area */}
      <div
        data-home-content="true"
        className="w-full pl-4 lg:pl-24 pr-4 md:pr-10 relative pt-6 md:pt-10 z-30"
      >
        {primarySectionOrder
          .filter(
            (sectionId) =>
              !hiddenHomeSections.has(sectionId) && primarySections[sectionId],
          )
          .map((sectionId) => (
            <div key={sectionId}>{primarySections[sectionId]}</div>
          ))}

        {/* ── Progressive Infinite Scroll Sentinel (Triggers background fetch before reaching bottom) ── */}
        <div
          ref={infiniteSentinelRef}
          className="h-2 w-full pointer-events-none"
          aria-hidden="true"
        />

        <div className="space-y-2">
          {/* ── 10 Progressively Loaded Sections as User Scrolls ── */}
          <LazySection title={t("sections.nextWatch", "Gợi Ý Phim Tiếp Theo")} href="/country/au-my" onVisible={() => markSectionLoaded("nextWatch")}>
            <FilmSection
              title={t("sections.nextWatch", "Gợi Ý Phim Tiếp Theo")}
              films={nextWatchRowList}
              isLoading={nextWatchLoading}
              href="/country/au-my"
            />
          </LazySection>

          <LazySection title={t("sections.series", "Phim Bộ Đặc Sắc")} href="/films/series" onVisible={() => markSectionLoaded("series")}>
            <FilmSection
              title={t("sections.series", "Phim Bộ Đặc Sắc")}
              films={seriesRowList}
              isLoading={seriesLoading}
              href="/films/series"
            />
          </LazySection>

          <LazySection title={t("sections.anime", "Thế Giới Anime & Hoạt Hình")} href="/films/anime" onVisible={() => markSectionLoaded("anime")}>
            <FilmSection
              title={t("sections.anime", "Thế Giới Anime & Hoạt Hình")}
              films={animeRowList}
              isLoading={animeLoading}
              href="/films/anime"
            />
          </LazySection>

          <LazySection title={t("sections.adventure", "Phim Phiêu Lưu & Khám Phá")} href="/genre/phieu-luu" onVisible={() => markSectionLoaded("adventure")}>
            <FilmSection
              title={t("sections.adventure", "Phim Phiêu Lưu & Khám Phá")}
              films={adventureRowList}
              isLoading={adventureLoading}
              href="/genre/phieu-luu"
            />
          </LazySection>

          <LazySection title={t("sections.single", "Phim Lẻ Tuyển Chọn")} href="/films/single" onVisible={() => markSectionLoaded("single")}>
            <FilmSection
              title={t("sections.single", "Phim Lẻ Tuyển Chọn")}
              films={singleRowList}
              isLoading={singleLoading}
              href="/films/single"
            />
          </LazySection>

          <LazySection title={t("sections.drama", "Phim Tâm Lý & Xã Hội")} href="/genre/chinh-kich" onVisible={() => markSectionLoaded("drama")}>
            <FilmSection
              title={t("sections.drama", "Phim Tâm Lý & Xã Hội")}
              films={dramaRowList}
              isLoading={dramaLoading}
              href="/genre/chinh-kich"
            />
          </LazySection>

          <LazySection title={t("sections.disaster", "Phim Thảm Họa & Sinh Tồn")} href="/genre/kinh-di" onVisible={() => markSectionLoaded("disaster")}>
            <FilmSection
              title={t("sections.disaster", "Phim Thảm Họa & Sinh Tồn")}
              films={disasterRowList}
              isLoading={disasterLoading}
              href="/genre/kinh-di"
            />
          </LazySection>

          <LazySection title={t("sections.war", "Phim Chiến Tranh & Lịch Sử")} href="/genre/chien-tranh" onVisible={() => markSectionLoaded("war")}>
            <FilmSection
              title={t("sections.war", "Phim Chiến Tranh & Lịch Sử")}
              films={warRowList}
              isLoading={warLoading}
              href="/genre/chien-tranh"
            />
          </LazySection>

          <LazySection title={t("sections.comedy", "Phim Hài Hước & Gia Đình")} href="/genre/hai-huoc" onVisible={() => markSectionLoaded("comedy")}>
            <FilmSection
              title={t("sections.comedy", "Phim Hài Hước & Gia Đình")}
              films={comedyRowList}
              isLoading={comedyLoading}
              href="/genre/hai-huoc"
            />
          </LazySection>

          <LazySection title={t("sections.romance", "Phim Lãng Mạn & Tình Cảm")} href="/genre/tinh-cam" onVisible={() => markSectionLoaded("romance")}>
            <FilmSection
              title={t("sections.romance", "Phim Lãng Mạn & Tình Cảm")}
              films={romanceRowList}
              isLoading={romanceLoading}
              href="/genre/tinh-cam"
            />
          </LazySection>

          <LazySection title="Phim Bộ & Phim Lẻ Tuần Này" href="/films" onVisible={() => markSectionLoaded("weekly")}>
            <div data-mobile-simple-section="weekly" className="md:hidden">
              <FilmSection
                title="Phim Bộ & Phim Lẻ Tuần Này"
                films={weeklyMobileRowList}
                isLoading={seriesLoading || singleLoading}
                href="/films"
              />
            </div>
            <div className="hidden md:block">
              <WeeklyCuratedShowcase
                seriesFilms={seriesRowList}
                singleFilms={singleRowList}
                isLoading={seriesLoading || singleLoading}
              />
            </div>
          </LazySection>
        </div>
      </div>
    </div>
  );
}
