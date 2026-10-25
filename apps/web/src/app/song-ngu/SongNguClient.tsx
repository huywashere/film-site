"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Search,
  RotateCcw,
  Film,
  X,
  ChevronDown,
  Play,
  Info,
} from "lucide-react";
import {
  FilmCard,
  FilmCardSkeleton,
  type FilmItem,
  resolveImageUrl,
} from "@/components/film/FilmCard";
import { Pagination } from "@/components/film/Pagination";
import { vicdnApi, vodphimApi, movieApi } from "@/lib/api";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const CDN_BASE = process.env.NEXT_PUBLIC_CDN_ASSETS_URL?.replace(/\/$/, "") || "";
const TUOC_COT_BG_PATH =
  "/Folder-Background/China/tuoc-cot/tuoc-cot-bg.png";
const TUOC_COT_CHARS_PATH =
  "/Folder-Background/China/tuoc-cot/tuoc-cot-couple-chars.png";
const TUOC_COT_LOGO_PATH =
  "/Folder-Background/China/tuoc-cot/tuoc-cot-logo.png";

function SongNguTuocCotHeroBanner() {
  const [bgSrc, setBgSrc] = useState(TUOC_COT_BG_PATH);
  const [charsSrc, setCharsSrc] = useState(TUOC_COT_CHARS_PATH);
  const [logoSrc, setLogoSrc] = useState(TUOC_COT_LOGO_PATH);
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <section
      data-hero-banner="true"
      className="relative h-[78svh] min-h-[580px] w-full select-none overflow-hidden bg-[#0a0b10] sm:h-[88vh] sm:min-h-[680px] lg:h-[95vh] lg:min-h-[780px]"
    >
      {/* ── Layer 1: Background Scenic Image (Imperial Red Chamber with Mountain Wall) ── */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <img
          src={bgSrc}
          alt="Tước Cốt - Bối cảnh cung điện đỏ son"
          onError={() => {
            if (CDN_BASE && bgSrc !== `${CDN_BASE}${TUOC_COT_BG_PATH}`) {
              setBgSrc(`${CDN_BASE}${TUOC_COT_BG_PATH}`);
            }
          }}
          className="w-full h-full object-cover object-center scale-100 filter brightness-[0.98] contrast-[1.04]"
          loading="eager"
        />
      </div>

      {/* ── Layer 2: Soft Cinematic Blending (hiển thị trọn vẹn cảnh nền đỏ son, không đánh đen) ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            linear-gradient(to right, rgba(10,11,16,0.72) 0%, rgba(10,11,16,0.32) 44%, rgba(10,11,16,0.02) 75%, transparent 100%),
            linear-gradient(to top, #0a0b10 0%, rgba(10,11,16,0.35) 8%, transparent 22%)
          `,
        }}
      />

      {/* ── Layer 3: Two Characters Cutout with Gentle Slide-in & Smooth Hover Effect ── */}
      <div className="absolute right-0 bottom-0 top-0 h-full w-full max-w-2xl sm:max-w-3xl md:max-w-4xl lg:max-w-5xl flex items-end justify-end pointer-events-none z-10 overflow-hidden pr-3 sm:pr-8 md:pr-14 lg:pr-20 xl:pr-28 pb-8 sm:pb-12 md:pb-16 lg:pb-20">
        <motion.div
          initial={{ opacity: 0, x: 70 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{
            scale: 1.025,
            y: -6,
            transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
          }}
          transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="relative h-full flex items-end justify-end pointer-events-auto cursor-pointer group/chars"
        >
          <img
            src={charsSrc}
            alt="Tước Cốt - Đinh Vũ Hề & Chu Khiết Quỳnh"
            onError={() => {
              if (CDN_BASE && charsSrc !== `${CDN_BASE}${TUOC_COT_CHARS_PATH}`) {
                setCharsSrc(`${CDN_BASE}${TUOC_COT_CHARS_PATH}`);
              }
            }}
            className="h-[68%] sm:h-[78%] md:h-[84%] lg:h-[90%] max-h-[640px] w-auto max-w-full object-contain object-bottom select-none filter contrast-[1.03] brightness-[1.02] drop-shadow-[0_20px_45px_rgba(0,0,0,0.75)] transition-all duration-500 group-hover/chars:drop-shadow-[0_25px_60px_rgba(255,255,255,0.22)] group-hover/chars:brightness-[1.06]"
            loading="eager"
          />
        </motion.div>
      </div>

      {/* ── Layer 4: Typography, Logo Banner & Actions ── */}
      <div className="absolute inset-0 z-20 flex flex-col justify-start pt-56 sm:pt-56 md:pt-60 lg:pt-64 xl:pt-72 px-4 sm:px-10 md:px-16 lg:px-24 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="max-w-xl sm:max-w-2xl space-y-2.5 sm:space-y-4 pt-2 sm:pt-4 pointer-events-auto"
        >
          {/* Title Group with Official Calligraphic Logobanner */}
          <div className="space-y-2">
            {!logoFailed ? (
              <div className="h-12 sm:h-16 md:h-20 lg:h-24 max-w-[280px] sm:max-w-[420px] md:max-w-[500px]">
                <img
                  src={logoSrc}
                  alt="Tước Cốt (Que Gu)"
                  onError={() => {
                    if (CDN_BASE && logoSrc !== `${CDN_BASE}${TUOC_COT_LOGO_PATH}`) {
                      setLogoSrc(`${CDN_BASE}${TUOC_COT_LOGO_PATH}`);
                    } else {
                      setLogoFailed(true);
                    }
                  }}
                  className="h-full w-auto object-contain object-left drop-shadow-[0_8px_25px_rgba(0,0,0,0.95)]"
                  loading="eager"
                />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-[0_4px_22px_rgba(0,0,0,0.95)] flex items-center gap-3">
                  <span>TƯỚC CỐT</span>
                  <span className="text-xs sm:text-sm font-normal px-2.5 py-0.5 rounded-full bg-white/15 text-neutral-200 border border-white/20 tracking-widest uppercase">
                    雀骨
                  </span>
                </h1>
              </div>
            )}

            {/* Subtitle — Chuẩn không màu */}
            <p className="text-base sm:text-xl font-serif italic text-neutral-200/90 font-medium drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
              Que Gu (The Bone&apos;s Grace)
            </p>
          </div>

          {/* Genre Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {["Cổ Trang", "Tình Cảm", "Cung Đấu", "Kỳ Ảo"].map((genre) => (
              <span
                key={genre}
                className="px-3 py-1 rounded-full bg-white/[0.12] hover:bg-white/[0.2] text-xs font-semibold text-neutral-100 border border-white/[0.15] backdrop-blur-md transition-colors shadow-sm"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-neutral-200/95 font-medium leading-relaxed max-w-lg line-clamp-3 sm:line-clamp-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
            Mối tình hoàng gia định mệnh giữa vị vương gia uy dũng mang trong mình bí mật gia tộc
            và nàng mỹ nhân thông tuệ giữa chốn thâm cung hiểm ác với phụ đề song ngữ Anh - Việt chuẩn xác.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3 pt-2 sm:pt-3">
            <Link
              href="/watch/tuoc-cot"
              className="inline-flex items-center gap-2.5 px-6 sm:px-7 py-2.5 sm:py-3 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-black text-xs sm:text-sm shadow-xl shadow-black/40 transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-4 h-4 fill-current text-neutral-950" />
              <span>Xem Ngay</span>
            </Link>

            <Link
              href="/film/tuoc-cot"
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs sm:text-sm backdrop-blur-md transition-all hover:scale-105 active:scale-95"
            >
              <Info className="w-4 h-4" />
              <span>Chi Tiết</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Định nghĩa các tùy chọn bộ lọc chuẩn phong cách Duyệt Tìm (/films) ──

const YEARS = Array.from({ length: 27 }, (_, i) => 2026 - i);

const QUICK_FORMATS = [
  { label: "Tất cả", value: "all" },
  { label: "Phim Bộ", value: "series" },
  { label: "Phim Lẻ", value: "single" },
  { label: "Hoạt Hình", value: "hoat-hinh" },
  { label: "Viễn Tưởng", value: "vien-tuong" },
  { label: "Hành Động", value: "hanh-dong" },
  { label: "Chiếu Rạp", value: "chieu-rap" },
];

const BILINGUAL_GENRES = [
  { slug: "", label: "Thể Loại" },
  { slug: "hoat-hinh", label: "Hoạt Hình (Disney / Pixar)" },
  { slug: "vien-tuong", label: "Khoa Học & Viễn Tưởng" },
  { slug: "hanh-dong", label: "Hành Động & Phiêu Lưu" },
  { slug: "hai-huoc", label: "Hài Hước" },
  { slug: "tam-ly", label: "Tâm Lý & Chính Kịch" },
  { slug: "hinh-su", label: "Hình Sự & Tội Phạm" },
  { slug: "bi-an", label: "Bí Ẩn & Giật Gân" },
  { slug: "kinh-di", label: "Kinh Dị" },
  { slug: "tinh-cam", label: "Tình Cảm & Lãng Mạn" },
];

const QUALITIES = [
  { label: "Chất lượng", value: "all" },
  { label: "Full HD (1080p)", value: "fhd" },
  { label: "HD (720p)", value: "hd" },
];

const SORTS = [
  { label: "Mới cập nhật", value: "modified.time" },
  { label: "Năm phát hành", value: "year" },
  { label: "Đánh giá cao nhất", value: "rating" },
];

// ── Hàm tổng hợp dữ liệu phim song ngữ từ hệ thống (Hoàn toàn ẩn thông tin nguồn) ──

async function fetchBilingualFilms({
  format,
  genre,
  search,
  page,
}: {
  format: string;
  genre: string;
  search: string;
  page: number;
}): Promise<{ items: FilmItem[]; totalPages: number; totalItems?: number }> {
  const trimmed = search.trim();

  // 1. Chế độ tìm kiếm từ khóa
  if (trimmed) {
    const [vodphimRes, movieRes] = await Promise.allSettled([
      vodphimApi.search(trimmed, page, 28),
      movieApi.search(trimmed, page, 28),
    ]);

    const items: FilmItem[] = [];
    const seen = new Set<string>();

    if (vodphimRes.status === "fulfilled" && vodphimRes.value) {
      const val: any = vodphimRes.value;
      const raw = Array.isArray(val?.data?.items)
        ? val.data.items
        : Array.isArray(val?.items)
          ? val.items
          : [];
      for (const item of raw) {
        if (item.slug && !seen.has(item.slug)) {
          seen.add(item.slug);
          items.push({
            ...item,
            _sourceName: undefined,
            lang: "Song Ngữ",
            quality: item.quality || "FHD",
          });
        }
      }
    }

    if (movieRes.status === "fulfilled" && movieRes.value) {
      const val: any = movieRes.value;
      const raw = Array.isArray(val?.data?.data?.items)
        ? val.data.data.items
        : Array.isArray(val?.data?.items)
          ? val.data.items
          : Array.isArray(val?.items)
            ? val.items
            : [];
      for (const item of raw) {
        if (item.slug && !seen.has(item.slug)) {
          seen.add(item.slug);
          items.push({
            ...item,
            _sourceName: undefined,
            lang: "Song Ngữ",
            quality: item.quality || "FHD",
          });
        }
      }
    }

    return {
      items,
      totalPages: Math.min(items.length > 0 ? 10 : 1, 25),
      totalItems: items.length,
    };
  }

  // 2. Chế độ duyệt danh mục & định dạng tổng hợp
  try {
    const targetCat = genre || (format !== "all" && format !== "series" && format !== "single" ? format : "");

    const [vicdnRes, vodphimRes] = await Promise.allSettled([
      targetCat
        ? vicdnApi.getByCategory(targetCat, page)
        : vicdnApi.getLatest(page),
      format === "series"
        ? vodphimApi.getSeries(page, 24)
        : format === "single"
          ? vodphimApi.getSingle(page, 24)
          : targetCat
            ? vodphimApi.getByGenre(targetCat, page, 24)
            : vodphimApi.getLatest(page, 24),
    ]);

    let vicdnItems: FilmItem[] = [];
    if (vicdnRes.status === "fulfilled" && vicdnRes.value) {
      const val: any = vicdnRes.value;
      const raw = Array.isArray(val?.items)
        ? val.items
        : Array.isArray(val?.data)
          ? val.data
          : [];
      vicdnItems = raw.map((item: any) => ({
        ...item,
        _sourceName: undefined,
        lang: "Song Ngữ",
        quality: item.quality || "FHD",
      }));
    }

    let vodphimItems: FilmItem[] = [];
    if (vodphimRes.status === "fulfilled" && vodphimRes.value) {
      const val: any = vodphimRes.value;
      const raw = Array.isArray(val?.data?.items)
        ? val.data.items
        : Array.isArray(val?.items)
          ? val.items
          : [];
      vodphimItems = raw.map((item: any) => ({
        ...item,
        _sourceName: undefined,
        lang: "Song Ngữ",
        quality: item.quality || "FHD",
      }));
    }

    // Đan xen mượt mà và loại bỏ trùng lặp slug
    const merged: FilmItem[] = [];
    const seen = new Set<string>();
    const maxLen = Math.max(vicdnItems.length, vodphimItems.length);

    for (let i = 0; i < maxLen; i++) {
      if (i < vicdnItems.length) {
        const it = vicdnItems[i];
        if (it.slug && !seen.has(it.slug)) {
          seen.add(it.slug);
          merged.push(it);
        }
      }
      if (i < vodphimItems.length) {
        const it = vodphimItems[i];
        if (it.slug && !seen.has(it.slug)) {
          seen.add(it.slug);
          merged.push(it);
        }
      }
    }

    return {
      items: merged,
      totalPages: 25,
      totalItems: merged.length * 25,
    };
  } catch {
    return { items: [], totalPages: 1 };
  }
}

// ── Component Chính: Giao diện Chuẩn Dark Cinema Đồng Bộ Trang Home & Duyệt Tìm ──

export function SongNguClient({
  initialPage = 1,
}: {
  initialSource?: any;
  initialPage?: number;
}) {
  const [format, setFormat] = useState("all");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedQuality, setSelectedQuality] = useState("all");
  const [selectedSort, setSelectedSort] = useState("modified.time");
  const [page, setPage] = useState(initialPage);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Debounce tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const queryKey = useMemo(
    () => ["bilingual-films-catalog", format, selectedGenre, searchQuery, page],
    [format, selectedGenre, searchQuery, page],
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      fetchBilingualFilms({
        format,
        genre: selectedGenre,
        search: searchQuery,
        page,
      }),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const rawItems = data?.items || [];
  const totalPages = data?.totalPages || 1;

  // Lọc và sắp xếp phía Client
  const films: FilmItem[] = useMemo(() => {
    let list: FilmItem[] = rawItems.map((item): FilmItem => {
      const anyItem = item as any;
      const pUrl = String(item.poster_url || item.thumb_url || "");
      const tUrl = String(item.thumb_url || item.poster_url || "");
      const rawTmdbId = item.tmdbId || anyItem.tmdb_id || anyItem.tmdb?.id;
      const tmdbId = rawTmdbId && Number.isFinite(Number(rawTmdbId)) ? Number(rawTmdbId) : undefined;
      const filmType = item.type || (anyItem.type === "tv" ? "series" : "single");
      return {
        _id: String(item._id || anyItem.id || item.slug || ""),
        name: String(item.name || anyItem.title || ""),
        origin_name: String(item.origin_name || anyItem.original_title || ""),
        slug: String(item.slug || ""),
        poster_url: resolveImageUrl(pUrl, tUrl) || pUrl,
        thumb_url: resolveImageUrl(tUrl, pUrl) || tUrl,
        year: Number(item.year) || 2026,
        type: filmType,
        tmdbId,
        tmdb: item.tmdb || (tmdbId ? { id: tmdbId, type: filmType === "series" ? "tv" : "movie" } : undefined),
        episode_current: String(item.episode_current || "FHD"),
        quality: String(item.quality || "FHD"),
        lang: "Song Ngữ",
        category: Array.isArray(item.category) ? item.category : [],
        country: Array.isArray(item.country) ? item.country : [],
        vote_average: Number(item.vote_average || anyItem.rating) || 8.5,
      };
    });

    if (selectedYear) {
      list = list.filter((f) => String(f.year) === String(selectedYear));
    }

    if (selectedQuality !== "all") {
      if (selectedQuality === "fhd") {
        list = list.filter(
          (f) =>
            (f.quality || "").toLowerCase().includes("1080") ||
            (f.quality || "").toLowerCase().includes("fhd"),
        );
      } else if (selectedQuality === "hd") {
        list = list.filter(
          (f) =>
            (f.quality || "").toLowerCase().includes("720") ||
            (f.quality || "").toLowerCase().includes("hd"),
        );
      }
    }

    if (selectedSort === "rating") {
      list = [...list].sort(
        (a, b) => (b.vote_average || 0) - (a.vote_average || 0),
      );
    } else if (selectedSort === "year") {
      list = [...list].sort((a, b) => (b.year || 0) - (a.year || 0));
    }

    return list;
  }, [rawItems, selectedYear, selectedQuality, selectedSort]);

  const isFiltered =
    format !== "all" ||
    Boolean(selectedGenre) ||
    Boolean(selectedYear) ||
    selectedQuality !== "all" ||
    selectedSort !== "modified.time" ||
    Boolean(searchQuery);

  const handleResetAll = useCallback(() => {
    setFormat("all");
    setSelectedGenre("");
    setSelectedYear("");
    setSelectedQuality("all");
    setSelectedSort("modified.time");
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  }, []);

  return (
    <main
      data-eager-hydration="true"
      className={cn(
        cardFont.className,
        "relative min-h-[100dvh] bg-[#0a0b10] text-white -mt-20 sm:-mt-24 pb-24 sm:pb-28 select-none",
      )}
    >
      {/* ── Top Hero Banner (Tước Cốt - Phim Song Ngữ Chọn Lọc) ── */}
      <SongNguTuocCotHeroBanner />

      {/* ── Ambient Studio Lighting (Đồng bộ chuẩn 100% với Trang Chủ và Duyệt Tìm) ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-b from-white/[0.025] to-transparent blur-[140px] rounded-full" />
      </div>

      <div
        id="song-ngu-catalog"
        className="relative z-20 w-full px-2.5 sm:px-10 lg:px-24 pb-20 -mt-8 sm:-mt-12 md:-mt-16 lg:-mt-20"
      >
        {/* ── Lưới Thẻ Phim Chuẩn 7 Cột Phong Cách Trang Chủ (2xl:grid-cols-7) ── */}
        {isLoading ? (
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-y-3.5 sm:gap-y-8">
            {Array.from({ length: 14 }).map((_, i) => (
              <FilmCardSkeleton key={i} />
            ))}
          </div>
        ) : films.length === 0 ? (
          <div className="text-center py-20 bg-[#12141c]/50 border border-white/[0.08] rounded-2xl p-8 max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-neutral-500">
              <Film size={24} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Không tìm thấy bộ phim song ngữ phù hợp
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Danh sách phim đang được cập nhật thêm.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-y-3.5 sm:gap-y-8 cv-grid-auto">
            {films.map((film, idx) => (
              <FilmCard
                key={`${film.slug || film._id || idx}-${idx}`}
                film={film}
                priority={idx < 7}
              />
            ))}
          </div>
        )}

        {/* ── Phân Trang ── */}
        {totalPages > 1 && (
          <div className="pt-6">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(newPage) => {
                setPage(newPage);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        )}
      </div>
    </main>
  );
}
