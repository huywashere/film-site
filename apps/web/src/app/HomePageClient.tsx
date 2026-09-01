"use client";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronRight, ChevronLeft, ChevronDown, Loader2 } from "lucide-react";
import {
  movieApi,
  siteConfigApi,
  type PublicSiteConfiguration,
} from "@/lib/api";
import {
  FilmCard,
  FilmCardSkeleton,
  FilmItem,
} from "@/components/film/FilmCard";
import { useTranslation } from "@/store/langStore";
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
import HeroBanner from "@/app/components/HeroBanner";
import { cardFont } from "@/lib/fonts";

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
    const exactKey = film._id || film.slug;
    if (exactKey && seenIds.has(exactKey.toLowerCase())) return false;

    const tokens = getFranchiseTokens(film);
    // Nếu phim này cùng tên franchise/series với phim đã có trong danh sách -> Bỏ qua phần trùng
    const hasDuplicateFranchise = tokens.some((token) =>
      seenFranchiseTokens.has(token),
    );
    if (hasDuplicateFranchise) return false;

    if (exactKey) seenIds.add(exactKey.toLowerCase());
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

// Fallback riêng cho hàng Top 10. Hero không còn dùng bộ banner tĩnh này.
const HOLLYWOOD_TOP10_POOL: FilmItem[] = [
  {
    _id: "deadpool-va-wolverine",
    name: "Deadpool & Wolverine",
    origin_name: "Deadpool & Wolverine",
    slug: "deadpool-va-wolverine",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20250821-1/45b6b9aad03ae0aa2aceb5d73419831a.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20250821-1/1ec414f82adc729512410edd1b083996.jpg",
    quality: "4K Ultra HD",
  },
  {
    _id: "nguoi-nhen-khong-con-nha",
    name: "Spider-Man: No Way Home",
    origin_name: "Spider-Man: No Way Home",
    slug: "nguoi-nhen-khong-con-nha",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20250828-1/08fd0a68865ce452e959ae2bf58b7a8c.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20250828-1/db868e69da1af78d124ed464063b27a6.jpg",
    quality: "4K Ultra HD",
  },
  {
    _id: "ky-si-bong-dem",
    name: "The Dark Knight",
    origin_name: "The Dark Knight",
    slug: "ky-si-bong-dem",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20240104-1/2cae46be24f514793c9e873f6de0fc32.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20240104-1/b2748e456090a1c43b246c014b60fa1a.jpg",
    quality: "4K Ultra HD",
  },
  {
    _id: "avatar-dong-chay-cua-nuoc",
    name: "Avatar: The Way Of Water",
    origin_name: "Avatar: The Way Of Water",
    slug: "avatar-dong-chay-cua-nuoc",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20250513-1/59fc5ffe0025ca40c99d48b070b59320.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20250513-1/7b4e51db1a258ef9602558352066bfec.jpg",
    quality: "4K Ultra HD",
  },
  {
    _id: "avengers-tran-chien-cuoi-cung",
    name: "Avengers: Endgame",
    origin_name: "Avengers: Endgame",
    slug: "avengers-tran-chien-cuoi-cung",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20240128-1/4278b5bc228cbc7963f50547e6c76cff.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20240128-1/72824a2b39de2fbb3e9617058b2f9eb3.jpg",
    quality: "4K Ultra HD",
  },
  {
    _id: "ho-den-tu-than",
    name: "Interstellar",
    origin_name: "Interstellar",
    slug: "ho-den-tu-than",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20250302-1/4cee31c3afd0fbfd11ed4f14b1bfd816.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20250302-1/6012710a981edf1b6209bdb7fa82d1a6.jpg",
    quality: "4K Ultra HD",
  },
];

// Helper: Nhận diện phim Anime hoặc Hoạt hình 3D (Đấu La, Trảm Thần, Tiên Ni...)
function isAnimationOrAnime(film: FilmItem): boolean {
  if (!film || !film.name) return false;
  const name = film.name.toLowerCase();
  const slug = (film.slug || "").toLowerCase();
  const type = (film.type || "").toLowerCase();

  if (
    type === "hoathinh" ||
    slug.includes("hoat-hinh") ||
    slug.includes("anime")
  ) {
    return true;
  }

  // Keywords for Chinese 3D Donghua / Anime
  const animKeywords = [
    "hoạt hình",
    "anime",
    "3d",
    "phong thần",
    "trảm thần",
    "tiên nghịch",
    "đẩu la",
    "vạn cổ",
    "thôn phệ",
    "thế giới hoàn mỹ",
    "già thiên",
    "đại chủ tể",
    "thần ấn",
    "ngẫu nhiên",
    "manga",
  ];

  return animKeywords.some((kw) => name.includes(kw) || slug.includes(kw));
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
  "Phim Thần Thoại & Kỹ Xảo": "from-violet-400 via-fuchsia-400 to-rose-300",
  "Phim Hành Động": "from-orange-400 via-amber-400 to-yellow-300",
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
};

function sectionTitleTone(title: string) {
  return (
    SECTION_TITLE_TONES[title] || "from-cyan-400 via-sky-400 to-indigo-300"
  );
}

// Standard Film Carousel Section Component (With Sleek Right Vertical Pills Navigation)
function FilmSection({
  title,
  films,
  isLoading,
  href,
}: {
  title: string;
  films: FilmItem[];
  isLoading: boolean;
  href?: string;
}) {
  const { t } = useTranslation();
  const rowRef = useRef<HTMLDivElement>(null);
  const [scrollStep, setScrollStep] = useState(0);

  const updateScrollStep = () => {
    const row = rowRef.current;
    if (!row) return;

    const maxScroll = row.scrollWidth - row.clientWidth;
    setScrollStep(
      maxScroll > 0 ? Math.round((row.scrollLeft / maxScroll) * 3) : 0,
    );
  };

  const scrollFilms = (direction: -1 | 1) => {
    const row = rowRef.current;
    if (!row) return;
    row.scrollBy({
      left: direction * row.clientWidth * 0.85,
      behavior: "smooth",
    });
  };

  if (!isLoading && (!films || films.length === 0)) return null;

  return (
    <div
      data-film-section="true"
      className={`${cardFont.className} mb-8 group/section`}
    >
      {/* Title Header matching user's requested layout (Inline pill button + right dash line pagination) */}
      <div className="mb-3.5 flex items-start justify-between gap-2 px-1 sm:items-center">
        {/* Left Side: Title + Inline "Xem tất cả >" Pill Button */}
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
          <div className="min-w-0 flex-1 sm:flex-none">
            <h2
              data-film-section-title="true"
              className={`${cardFont.className} bg-gradient-to-r ${sectionTitleTone(title)} bg-clip-text text-xl font-extrabold tracking-[-0.025em] text-transparent sm:text-2xl`}
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
        {isLoading ? (
          <div className="h-2 w-24 rounded bg-white/[0.07] motion-safe:animate-pulse" />
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

      {/* Row Container with Right Minimalist Vertical Stack Navigation */}
      <div className="flex items-stretch gap-3" aria-busy={isLoading}>
        <div className="flex-1 min-w-0">
          <div
            ref={rowRef}
            onScroll={updateScrollStep}
            className="scrollbar-hide flex w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain py-1 sm:gap-3 lg:gap-4"
          >
            {isLoading
              ? Array.from({ length: 10 }, (_, index) => (
                  <div
                    key={`film-skeleton-${index}`}
                    className="w-[26%] min-w-[112px] shrink-0 snap-start sm:w-[19%] md:w-[18%] lg:w-[16%] xl:w-[15.4%]"
                  >
                    <FilmCardSkeleton />
                  </div>
                ))
              : films.map((film, idx) => (
                  <div
                    key={`slide-${title}-${film._id || film.slug || "film"}-${idx}`}
                    className="w-[26%] min-w-[112px] shrink-0 snap-start sm:w-[19%] md:w-[18%] lg:w-[16%] xl:w-[15.4%]"
                  >
                    <FilmCard
                      film={film}
                      priority={idx < 8}
                      preferHighQuality={
                        title === "Phim Mới Cập Nhật" && idx < 8
                      }
                    />
                  </div>
                ))}
          </div>
        </div>

        {/* ── Minimalist Vertical Chevron Navigation (Pure icons without background box) ── */}
        <div className="hidden sm:flex flex-col justify-center gap-3 shrink-0 my-auto px-1">
          <button
            onClick={() => scrollFilms(1)}
            disabled={isLoading}
            aria-label={`Chuyển sang phải cho ${title}`}
            title={`Xem phim tiếp theo trong ${title}`}
            className="p-1.5 text-white/40 hover:text-white transition-all cursor-pointer hover:scale-125 active:scale-90 disabled:opacity-15 disabled:pointer-events-none"
          >
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>

          <button
            onClick={() => scrollFilms(-1)}
            disabled={isLoading}
            aria-label={`Chuyển sang trái cho ${title}`}
            title={`Xem phim trước trong ${title}`}
            className="p-1.5 text-white/40 hover:text-white transition-all cursor-pointer hover:scale-125 active:scale-90 disabled:opacity-15 disabled:pointer-events-none"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Component Wrapper for Intersection Observer Lazy Load (No min-height gaps, GPU Accelerated)
function LazySection({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "350px 0px" },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="[content-visibility:auto] [contain-intrinsic-size:1px_400px] transform-gpu"
    >
      {isVisible ? (
        children
      ) : (
        <div className="mb-8 h-[260px] w-full rounded-2xl bg-white/[0.01] motion-safe:animate-pulse sm:h-[340px] lg:h-[360px]" />
      )}
    </div>
  );
}

export default function HomePageClient({
  initialPublicConfig,
}: {
  initialPublicConfig?: PublicSiteConfiguration | null;
}) {
  const { t } = useTranslation();

  const [showMoreSections, setShowMoreSections] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [catalogReady, setCatalogReady] = useState(false);
  const [secondaryCatalogReady, setSecondaryCatalogReady] = useState(false);
  const { data: publicConfig } = useQuery({
    queryKey: ["public-site-configuration"],
    queryFn: () => siteConfigApi.getPublic().then((response) => response.data),
    initialData: initialPublicConfig || undefined,
    staleTime: 60_000,
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

  // The hero fills the first viewport. Load catalogue rows on the first sign
  // of scroll/touch intent, with a conservative fallback for idle visitors.
  // This prevents every below-the-fold API from competing with the hero.
  useEffect(() => {
    const reveal = () => setCatalogReady(true);
    const options: AddEventListenerOptions = { passive: true, once: true };
    window.addEventListener("wheel", reveal, options);
    window.addEventListener("touchstart", reveal, options);
    window.addEventListener("keydown", reveal, { once: true });

    // Do not leave catalogue rows as permanent skeletons when the visitor does
    // not scroll. Start the critical rows during the first idle window, while
    // still giving the hero the initial network/CPU budget.
    let idleId: number | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(reveal, { timeout: 900 });
    } else {
      fallbackTimer = globalThis.setTimeout(reveal, 650);
    }

    return () => {
      window.removeEventListener("wheel", reveal);
      window.removeEventListener("touchstart", reveal);
      window.removeEventListener("keydown", reveal);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    if (!catalogReady) return;
    const timer = window.setTimeout(() => setSecondaryCatalogReady(true), 550);
    return () => window.clearTimeout(timer);
  }, [catalogReady]);

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

  const handleShowMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setShowMoreSections(true);
      setIsLoadingMore(false);
    }, 450);
  };

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

  // 2. Series Âu-Mỹ (Hollywood TV Series)
  const usUkSeriesData = useMemo(
    () =>
      asCatalogPayload(
        (homeFeedSections?.series || []).filter(
          (film) =>
            movieTaxonomyContains(film.country, [
              "âu mỹ",
              "au-my",
              "mỹ",
              "anh",
              "united states",
            ]) || !film.country?.length,
        ),
      ),
    [homeFeedSections?.series],
  );
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

  // ── Lazy Loaded 10 Sections Data (Loaded after clicking Xem Thêm) ──

  // 5. Xem gì tiếp theo (Hollywood Recommendations)
  const { data: usUkBlockbustersData, isLoading: nextWatchLoading } = useQuery({
    queryKey: ["us-uk-blockbusters-next"],
    queryFn: () => movieApi.getByCountry("au-my", 2).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 6. Series quốc tế (International Series)
  const seriesData = useMemo(
    () =>
      homeFeedSections?.series
        ? asCatalogPayload(homeFeedSections.series)
        : undefined,
    [homeFeedSections?.series],
  );
  const seriesLoading = showMoreSections && homeFeedLoading;

  // 7. Anime & Hoạt hình lồng tiếng (ONLY place for Anime/3D Animation)
  const animeData = useMemo(
    () =>
      homeFeedSections?.anime
        ? asCatalogPayload(homeFeedSections.anime)
        : undefined,
    [homeFeedSections?.anime],
  );
  const animeLoading = showMoreSections && homeFeedLoading;
  const { data: animeGenreData } = useQuery({
    queryKey: ["anime-genre", 1],
    queryFn: () => movieApi.getByGenre("hoat-hinh", 1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 8. Phim phiêu lưu mạo hiểm (Hollywood Adventure Movies)
  const { data: adventureUsUkData, isLoading: adventureLoading } = useQuery({
    queryKey: ["adventure-movies-us-uk"],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: "au-my",
          category: "phieu-luu",
          page: 1,
          limit: 24,
        })
        .then((r) => r.data),
    enabled: showMoreSections,
  });
  const { data: adventureData } = useQuery({
    queryKey: ["adventure-movies"],
    queryFn: () => movieApi.getByGenre("phieu-luu", 1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 9. Phim chất lượng 4K (Hollywood 4K Movies)
  const singleData = useMemo(
    () =>
      homeFeedSections?.single
        ? asCatalogPayload(homeFeedSections.single)
        : undefined,
    [homeFeedSections?.single],
  );
  const singleLoading = showMoreSections && homeFeedLoading;

  // 10. Phim chính kịch chuyển thể từ sách (Book Adaptation Dramas)
  const { data: dramaData, isLoading: dramaLoading } = useQuery({
    queryKey: ["drama-movies"],
    queryFn: () => movieApi.getByGenre("chinh-kich", 1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 11. Phim kịch tính về thảm họa chết chóc (Hollywood Thriller & Disaster)
  const { data: disasterUsUkData, isLoading: disasterLoading } = useQuery({
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
    enabled: showMoreSections,
  });

  // 12. Thể loại chiến tranh và gai góc (War Movies)
  const { data: warData, isLoading: warLoading } = useQuery({
    queryKey: ["war-movies"],
    queryFn: () => movieApi.getByGenre("chien-tranh", 1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 13. Phim hài (Comedy Movies)
  const { data: comedyData, isLoading: comedyLoading } = useQuery({
    queryKey: ["comedy-movies"],
    queryFn: () => movieApi.getByGenre("hai-huoc", 1).then((r) => r.data),
    enabled: showMoreSections,
  });

  // 14. Bộ phim giải trí hoàn hảo (Romance & Feel-Good Movies)
  const { data: romanceData, isLoading: romanceLoading } = useQuery({
    queryKey: ["romance-movies"],
    queryFn: () => movieApi.getByGenre("tinh-cam", 1).then((r) => r.data),
    enabled: showMoreSections,
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
  const trendingData = useMemo(
    () => homeFeedData?.top10 || [],
    [homeFeedData?.top10],
  );

  // ── Process arrays with STRICT Live-Action filtering for Hollywood rows ──
  const vfxFilms = useMemo(() => {
    const list1 = vfxGenreData?.data?.items || vfxGenreData?.items || [];
    const list2 = vfxUsUkData?.data?.items || vfxUsUkData?.items || [];
    return filterLiveActionOnly(deduplicate([...list1, ...list2]));
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
    const usUkList = actionUsUkData?.data?.items || actionUsUkData?.items || [];
    const genList = actionData?.data?.items || actionData?.items || [];
    return filterLiveActionOnly(deduplicate([...usUkList, ...genList]));
  }, [actionUsUkData, actionData]);

  const scifiFilms = useMemo(() => {
    const usUkList = vfxUsUkData?.data?.items || vfxUsUkData?.items || [];
    const genList = scifiData?.data?.items || scifiData?.items || [];
    return filterLiveActionOnly(deduplicate([...usUkList, ...genList]));
  }, [vfxUsUkData, scifiData]);

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
    const usUkList =
      adventureUsUkData?.data?.items || adventureUsUkData?.items || [];
    const genList = adventureData?.data?.items || adventureData?.items || [];
    return filterLiveActionOnly(deduplicate([...usUkList, ...genList]));
  }, [adventureUsUkData, adventureData]);

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

  const latestFilms = useMemo(
    () => deduplicate(latestData?.items || latestData?.data?.items || []),
    [latestData],
  );
  const trendingFilms = useMemo(
    () => deduplicate(Array.isArray(trendingData) ? trendingData : []),
    [trendingData],
  );

  // Deduplication registry & row limits
  const {
    top10List,
    latestRowList,
    vfxRowList,
    usUkSeriesRowList,
    actionRowList,
    scifiRowList,
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
  } = useMemo(() => {
    const buildRow = (rawFilms: FilmItem[], targetCount = 12): FilmItem[] => {
      return deduplicate(rawFilms).slice(0, targetCount);
    };

    // Initial Sections
    const latestRowList = buildRow(latestFilms);
    const vfxRowList = buildRow(vfxFilms);
    const usUkSeriesRowList = buildRow(usUkSeriesFilms, 24);
    const actionRowList = buildRow(actionFilms);
    const scifiRowList = buildRow(scifiFilms);

    // Lazy 10 Sections
    const nextWatchRowList = buildRow(nextWatchFilms);
    const seriesRowList = buildRow(seriesFilms);
    const animeRowList = buildRow(animeFilms);
    const adventureRowList = buildRow(adventureFilms);
    const singleRowList = buildRow(singleFilms);
    const dramaRowList = buildRow(dramaFilms);
    const disasterRowList = buildRow(disasterFilms);
    const warRowList = buildRow(warFilms);
    const comedyRowList = buildRow(comedyFilms);
    const romanceRowList = buildRow(romanceFilms);

    const sectionSlugs = new Set(
      [
        ...latestRowList,
        ...vfxRowList,
        ...usUkSeriesRowList,
        ...actionRowList,
        ...scifiRowList,
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

    const highInterestFilms = deduplicate([
      ...trendingFilms,
      ...actionFilms,
      ...scifiFilms,
      ...HOLLYWOOD_TOP10_POOL,
    ]);

    const top10List = filterLiveActionOnly(highInterestFilms)
      .filter((film) => !sectionSlugs.has(film.slug))
      .slice(0, 10);
    if (top10List.length < 10) {
      top10List.push(
        ...filterLiveActionOnly(highInterestFilms)
          .filter(
            (film) =>
              !sectionSlugs.has(film.slug) &&
              !top10List.some((ranked) => ranked.slug === film.slug),
          )
          .slice(0, 10 - top10List.length),
      );
    }
    if (top10List.length < 10) {
      top10List.push(
        ...filterLiveActionOnly(highInterestFilms)
          .filter(
            (film) => !top10List.some((ranked) => ranked.slug === film.slug),
          )
          .slice(0, 10 - top10List.length),
      );
    }

    return {
      top10List,
      latestRowList,
      vfxRowList,
      usUkSeriesRowList,
      actionRowList,
      scifiRowList,
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
    scifiFilms,
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
    const pool = deduplicate([...top10List, ...trendingFilms, ...latestFilms]);
    const selected = slugs
      .map((slug) => pool.find((film) => film.slug === slug))
      .filter((film): film is FilmItem => Boolean(film));
    return deduplicate([...selected, ...pool]).slice(0, 10);
  }, [latestFilms, publicConfig?.homeTop10Slugs, top10List, trendingFilms]);

  const customFeaturedSections = useMemo(() => {
    const rows = publicConfig?.homeFeaturedRows;
    if (!rows || typeof rows !== "object" || Array.isArray(rows)) return {};

    const filmPool = deduplicate([
      ...latestFilms,
      ...trendingFilms,
      ...vfxFilms,
      ...usUkSeriesFilms,
      ...actionFilms,
      ...scifiFilms,
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
    latestFilms,
    publicConfig?.homeFeaturedRows,
    scifiFilms,
    seriesFilms,
    singleFilms,
    trendingFilms,
    usUkSeriesFilms,
    vfxFilms,
  ]);

  const hiddenHomeSections = new Set(publicConfig?.homeHiddenSections || []);
  const primarySections: Record<string, React.ReactNode> = {
    top10: (
      <LazySection>
        <Top10RankedRow films={configuredTop10List} />
      </LazySection>
    ),
    continue: (
      <LazySection>
        <ContinueWatchingRow fallbackFilms={homeFeedPool} />
      </LazySection>
    ),
    latest: (
      <LazySection>
        <LandscapeSpotlightRow
          title={t("sections.latest", "Phim Mới Cập Nhật")}
          films={latestRowList}
          isLoading={latestLoading}
          href="/films"
        />
      </LazySection>
    ),
    vfx: (
      <LazySection>
        <FilmSection
          title={t("sections.vfx", "Phim Thần Thoại & Kỹ Xảo")}
          films={vfxRowList}
          isLoading={vfxLoading}
          href="/genre/than-thoai"
        />
      </LazySection>
    ),
    "usuk-series": (
      <LazySection>
        <HeroShowcaseSection
          title={t("sections.usUkSeries", "Series Âu-Mỹ Đỉnh Cao")}
          films={usUkSeriesRowList}
          isLoading={usUkSeriesLoading}
          href="/search?type=series&country=au-my"
        />
      </LazySection>
    ),
    action: (
      <LazySection>
        <FilmSection
          title={t("sections.action", "Phim Hành Động Kịch Tính")}
          films={actionRowList}
          isLoading={actionLoading}
          href="/genre/hanh-dong"
        />
      </LazySection>
    ),
    scifi: (
      <LazySection>
        <CuratedSpotlightSection
          title={t("sections.scifi", "Tuyệt Tác Khoa Học Viễn Tưởng")}
          films={scifiRowList}
          isLoading={scifiLoading}
          href="/genre/vien-tuong"
        />
      </LazySection>
    ),
    ...customFeaturedSections,
  };
  const defaultSectionOrder = [
    "top10",
    "continue",
    "latest",
    "vfx",
    "usuk-series",
    "action",
    "scifi",
  ];
  const configuredSectionOrder = (publicConfig?.homeSectionOrder?.length
    ? publicConfig.homeSectionOrder
    : defaultSectionOrder).filter((sectionId) => sectionId !== "schedule");
  const primarySectionOrder = [
    ...configuredSectionOrder,
    ...Object.keys(customFeaturedSections).filter(
      (sectionId) => !configuredSectionOrder.includes(sectionId),
    ),
  ];

  return (
    <div className="bg-background min-h-screen text-foreground overflow-hidden pb-12">
      <HomeAnnouncementPopup />
      {/* Hero Banner slider */}
      <HeroBanner initialConfig={initialPublicConfig || undefined} />

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

        {/* ── Ultra-Minimal Show More Sections Button ── */}
        {!showMoreSections ? (
          <div className="my-3 flex w-full justify-center px-1 sm:my-5 lg:my-6">
            <button
              onClick={handleShowMore}
              disabled={isLoadingMore}
              className={`${cardFont.className} group inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-neutral-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 shadow-lg transition-all cursor-pointer active:scale-95`}
            >
              <span className="font-semibold tracking-wide">
                {t("common.viewMore", "Xem thêm phim")}
              </span>
              {isLoadingMore ? (
                <Loader2 size={13} className="animate-spin text-white" />
              ) : (
                <ChevronDown
                  size={14}
                  className="transition-transform duration-300 group-hover:translate-y-0.5 text-neutral-300 group-hover:text-white"
                />
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* ── 10 Lazy Loaded Sections ── */}
            <LazySection>
              <FilmSection
                title={t("sections.nextWatch", "Gợi Ý Phim Tiếp Theo")}
                films={nextWatchRowList}
                isLoading={nextWatchLoading}
                href="/country/au-my"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title={t("sections.series", "Phim Bộ Đặc Sắc")}
                films={seriesRowList}
                isLoading={seriesLoading}
                href="/films/series"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title={t("sections.anime", "Thế Giới Anime & Hoạt Hình")}
                films={animeRowList}
                isLoading={animeLoading}
                href="/films/anime"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title={t("sections.adventure", "Phim Phiêu Lưu & Khám Phá")}
                films={adventureRowList}
                isLoading={adventureLoading}
                href="/genre/phieu-luu"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title={t("sections.single", "Phim Lẻ Tuyển Chọn")}
                films={singleRowList}
                isLoading={singleLoading}
                href="/films/single"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title={t("sections.drama", "Phim Tâm Lý & Xã Hội")}
                films={dramaRowList}
                isLoading={dramaLoading}
                href="/genre/chinh-kich"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title={t("sections.disaster", "Phim Thảm Họa & Sinh Tồn")}
                films={disasterRowList}
                isLoading={disasterLoading}
                href="/genre/kinh-di"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title={t("sections.war", "Phim Chiến Tranh & Lịch Sử")}
                films={warRowList}
                isLoading={warLoading}
                href="/genre/chien-tranh"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title={t("sections.comedy", "Phim Hài Hước & Gia Đình")}
                films={comedyRowList}
                isLoading={comedyLoading}
                href="/genre/hai-huoc"
              />
            </LazySection>

            <LazySection>
              <FilmSection
                title={t("sections.romance", "Phim Lãng Mạn & Tình Cảm")}
                films={romanceRowList}
                isLoading={romanceLoading}
                href="/genre/tinh-cam"
              />
            </LazySection>
          </div>
        )}
      </div>
    </div>
  );
}
