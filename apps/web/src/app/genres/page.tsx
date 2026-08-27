"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  Search,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Film,
  Tv,
  Globe,
  Calendar,
  Layers,
  X,
  Grid3X3,
  ListFilter,
  Flame,
  Check,
} from "lucide-react";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { movieApi } from "@/lib/api";
import { FilmCard, FilmCardSkeleton, FilmItem } from "@/components/film/FilmCard";
import { Pagination } from "@/components/film/Pagination";
import { GENRES_LIST, COUNTRIES_LIST } from "@/components/layout/Navbar";

interface TopicItem {
  slug: string;
  title: string;
  description: string;
  href: string;
  accent: string;
  badge: string;
  image: string;
}

// 16 Chủ đề điện ảnh đỉnh cao chuẩn phong cách Cinema Universe
const TOPICS: TopicItem[] = [
  {
    slug: "phim-han-quoc",
    title: "Phim Hàn Quốc",
    description: "K-Drama & K-Movie kinh điển xứ kim chi",
    href: "/country/han-quoc",
    accent: "#f43f5e",
    badge: "K-Drama Hot",
    image: "https://image.tmdb.org/t/p/w1280/vbkpl0ps4s5tMTUnC7SFXNzWmVr.jpg", // Lovely Runner
  },
  {
    slug: "phim-trung-quoc",
    title: "Phim Trung Quốc",
    description: "Cổ trang tiên hiệp, kiếm hiệp & ngôn tình",
    href: "/country/trung-quoc",
    accent: "#f59e0b",
    badge: "Hoa Ngữ",
    image: "https://image.tmdb.org/t/p/w1280/aJxMvBSaUdbIkY8nqFkuEarrgcx.jpg", // Thương Lan Quyết
  },
  {
    slug: "dien-anh-au-my",
    title: "Điện Ảnh Âu Mỹ",
    description: "Bom tấn Hollywood 4K & vũ trụ điện ảnh",
    href: "/country/au-my",
    accent: "#0ea5e9",
    badge: "Hollywood",
    image: "https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg", // Avengers: Endgame
  },
  {
    slug: "anime-nhat-ban",
    title: "Anime Nhật Bản",
    description: "Thế giới hoạt hình & phép thuật xứ Phù Tang",
    href: "/films/anime",
    accent: "#a855f7",
    badge: "Anime 4K",
    image: "https://image.tmdb.org/t/p/w1280/8x9iKH8kWA0zdkgNdpAew7OstYe.jpg", // Your Name
  },
  {
    slug: "co-trang-tien-hiep",
    title: "Cổ Trang Tiên Hiệp",
    description: "Kiếm hiệp kỳ ảo, tu tiên & thần thoại huyền huyễn",
    href: "/search?genre=co-trang&country=trung-quoc",
    accent: "#10b981",
    badge: "Tiên Hiệp",
    image: "https://image.tmdb.org/t/p/w1280/ampkwvfwO7o5YMwYAVPKx1PLDaB.jpg", // Trần Tình Lệnh
  },
  {
    slug: "thanh-xuan-vuon-truong",
    title: "Thanh Xuân Vườn Trường",
    description: "Tuổi trẻ, tình bạn & hoài niệm học đường",
    href: "/search?genre=hoc-duong",
    accent: "#14b8a6",
    badge: "Thanh Xuân",
    image: "https://image.tmdb.org/t/p/w1280/3nWfjIBUyYUCABI7Fsl1AhNhDAr.jpg", // Khi Anh Chạy Về Phía Em
  },
  {
    slug: "tinh-yeu-lang-man",
    title: "Tình Cảm & Lãng Mạn",
    description: "Ngọt ngào, say đắm & rung động trái tim",
    href: "/genre/tinh-cam",
    accent: "#ec4899",
    badge: "Lãng Mạn",
    image: "https://image.tmdb.org/t/p/w1280/3yEHM2HT2vrUtO93YzTJNgEfiZG.jpg", // Hạ Cánh Nơi Anh
  },
  {
    slug: "gia-dinh-doi-thuong",
    title: "Gia Đình & Đời Thường",
    description: "Nhẹ nhàng, ấm áp, gắn kết yêu thương & bình yên",
    href: "/genre/gia-dinh",
    accent: "#84cc16",
    badge: "Gia Đình",
    image: "https://image.tmdb.org/t/p/w1280/1QUrjFNKgVchKktX4N6DaegfPbP.jpg", // Đi Đến Nơi Có Gió
  },
  {
    slug: "phim-cong-so",
    title: "Phim Công Sở & Đô Thị",
    description: "Tình cảm, sự nghiệp & cuộc sống hiện đại",
    href: "/search?q=phim%20cong%20so",
    accent: "#6366f1",
    badge: "Đô Thị",
    image: "https://image.tmdb.org/t/p/w1280/lq0YqJuffMuZhoKTiC5xDqvtCSn.jpg", // Hẹn Hò Chốn Công Sở
  },
  {
    slug: "hinh-su-toi-pham",
    title: "Hình Sự & Trinh Thám",
    description: "Phá án gay cấn, truy lùng tội phạm kịch tính",
    href: "/genre/hinh-su",
    accent: "#06b6d4",
    badge: "Trinh Thám",
    image: "https://image.tmdb.org/t/p/w1280/i1SyUHsi45psSH1xy9sM0in8FKJ.jpg", // Taxi Driver
  },
  {
    slug: "phim-chieu-rap-4k",
    title: "Chiếu Rạp & Bom Tấn 4K",
    description: "Tuyển chọn phim rạp kỹ xảo âm thanh đỉnh cao",
    href: "/search?q=chieu%20rap",
    accent: "#eab308",
    badge: "4K Cinema",
    image: "https://image.tmdb.org/t/p/w1280/7I6VUdPj6tQECNHdviJkUHD2u89.jpg", // John Wick 4
  },
  {
    slug: "kinh-di-tam-linh",
    title: "Kinh Dị & Siêu Nhiên",
    description: "Rùng rợn, giật gân, ám ảnh & thần bí",
    href: "/genre/kinh-di",
    accent: "#ef4444",
    badge: "Kinh Dị",
    image: "https://image.tmdb.org/t/p/w1280/709O9e0mEq45bB60bX7oP462l6w.jpg", // Exhuma: Quật Mộ Trùng Ma
  },
  {
    slug: "hai-huoc-giai-tri",
    title: "Hài Hước & Thư Giãn",
    description: "Tiếng cười sảng khoái, giải tỏa căng thẳng",
    href: "/genre/hai-huoc",
    accent: "#fb923c",
    badge: "Hài Hước",
    image: "https://image.tmdb.org/t/p/w1280/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg", // Deadpool & Wolverine
  },
  {
    slug: "khoa-hoc-vien-tuong",
    title: "Khoa Học Viễn Tưởng",
    description: "Du hành vũ trụ, tương lai & đa vũ trụ giả tưởng",
    href: "/genre/vien-tuong",
    accent: "#3b82f6",
    badge: "Sci-Fi",
    image: "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg", // Interstellar
  },
  {
    slug: "chien-tranh-lich-su",
    title: "Chiến Tranh & Sử Thi",
    description: "Tái hiện những trang sử hào hùng và bi tráng",
    href: "/genre/chien-tranh",
    accent: "#78716c",
    badge: "Lịch Sử",
    image: "https://image.tmdb.org/t/p/w1280/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg", // Oppenheimer
  },
  {
    slug: "am-nhac-nghe-thuat",
    title: "Âm Nhạc & Nghệ Thuật",
    description: "Giai điệu bất hủ, vũ đạo & cảm xúc thăng hoa",
    href: "/genre/am-nhac",
    accent: "#d946ef",
    badge: "Nghệ Thuật",
    image: "https://image.tmdb.org/t/p/w1280/q8793iKq1KqQj42h4u4wE1P1e4q.jpg", // La La Land
  },
];

const YEARS = Array.from({ length: 25 }, (_, i) => 2026 - i);

const TYPES = [
  { label: "Tất cả định dạng", value: "all" },
  { label: "Phim Bộ", value: "series" },
  { label: "Phim Lẻ", value: "single" },
  { label: "Hoạt Hình / Anime", value: "anime" },
  { label: "TV Shows", value: "tv-shows" },
];

const SORTS = [
  { label: "Mới cập nhật", value: "modified.time" },
  { label: "Năm phát hành", value: "year" },
  { label: "Mức độ phổ biến", value: "view" },
];

export default function GenresPage() {
  const router = useRouter();

  // Active View Tab
  const [activeTab, setActiveTab] = useState<"universe" | "filter">("universe");

  // Advanced Filter State
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedSort, setSelectedSort] = useState("modified.time");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

  const isFiltered =
    !!search.trim() ||
    !!selectedGenre ||
    !!selectedCountry ||
    !!selectedYear ||
    selectedType !== "all";

  // Auto switch to filter tab when user interacts with search or filters
  const handleFilterChange = (setter: (val: any) => void, val: any) => {
    setter(val);
    setPage(1);
    setActiveTab("filter");
  };

  const handleReset = () => {
    setSearch("");
    setSelectedGenre("");
    setSelectedCountry("");
    setSelectedYear("");
    setSelectedType("all");
    setSelectedSort("modified.time");
    setPage(1);
  };

  // Query film list based on search vs filters
  const { data, isLoading } = useQuery({
    queryKey: [
      "genre-hub-films",
      search,
      selectedGenre,
      selectedCountry,
      selectedYear,
      selectedType,
      selectedSort,
      page,
    ],
    queryFn: async () => {
      if (search.trim()) {
        const res = await movieApi.search(search.trim(), page, 24);
        return res.data;
      }
      if (selectedGenre) {
        const res = await movieApi.getByGenre(selectedGenre, page);
        return res.data;
      }
      if (selectedCountry) {
        const res = await movieApi.getByCountry(selectedCountry, page);
        return res.data;
      }
      if (selectedType === "series") {
        const res = await movieApi.getSeries(page);
        return res.data;
      }
      if (selectedType === "single") {
        const res = await movieApi.getSingle(page);
        return res.data;
      }
      if (selectedType === "anime") {
        const res = await movieApi.getAnime(page);
        return res.data;
      }
      if (selectedType === "tv-shows") {
        const res = await movieApi.getTvShows(page);
        return res.data;
      }
      const res = await movieApi.getLatest(page);
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const filmList: FilmItem[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.data?.items)) return data.data.items;
    if (Array.isArray(data.data)) return data.data;
    return [];
  }, [data]);

  // Client-side year filtering if year is specified
  const filteredFilms = useMemo(() => {
    if (!selectedYear) return filmList;
    return filmList.filter((f) => String(f.year) === String(selectedYear));
  }, [filmList, selectedYear]);

  const totalPages = useMemo(() => {
    const pagination = data?.pagination || data?.data?.params?.pagination;
    if (pagination?.totalPages) return pagination.totalPages;
    if (pagination?.totalItems && pagination?.totalItemsPerPage) {
      return Math.ceil(pagination.totalItems / pagination.totalItemsPerPage);
    }
    return 1;
  }, [data]);

  const totalItems = useMemo(() => {
    const pagination = data?.pagination || data?.data?.params?.pagination;
    return pagination?.totalItems || filteredFilms.length;
  }, [data, filteredFilms]);

  // Recommended Marquee Films
  const { data: recommendedData } = useQuery({
    queryKey: ["genres-recommended"],
    queryFn: async () => {
      const res = await movieApi.getLatest(1);
      return res.data?.items?.slice(0, 16) || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  const recommendedFilms =
    recommendedData?.length > 0
      ? recommendedData
      : [
          {
            slug: "ha-canh-noi-anh",
            name: "Hạ Cánh Nơi Anh",
            year: 2020,
            quality: "4K",
            thumb_url:
              "https://image.tmdb.org/t/p/w300/3yEHM2HT2vrUtO93YzTJNgEfiZG.jpg",
          },
          {
            slug: "tran-tinh-lenh",
            name: "Trần Tình Lệnh",
            year: 2019,
            quality: "HD",
            thumb_url:
              "https://image.tmdb.org/t/p/w300/ampkwvfwO7o5YMwYAVPKx1PLDaB.jpg",
          },
          {
            slug: "oppenheimer",
            name: "Oppenheimer",
            year: 2023,
            quality: "4K",
            thumb_url:
              "https://image.tmdb.org/t/p/w300/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg",
          },
          {
            slug: "sat-thu-john-wick-4",
            name: "John Wick 4",
            year: 2023,
            quality: "4K",
            thumb_url:
              "https://image.tmdb.org/t/p/w300/7I6VUdPj6tQECNHdviJkUHD2u89.jpg",
          },
          {
            slug: "deadpool-va-wolverine",
            name: "Deadpool & Wolverine",
            year: 2024,
            quality: "4K",
            thumb_url:
              "https://image.tmdb.org/t/p/w300/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg",
          },
          {
            slug: "di-den-noi-co-gio",
            name: "Đi Đến Nơi Có Gió",
            year: 2023,
            quality: "FHD",
            thumb_url:
              "https://image.tmdb.org/t/p/w300/1QUrjFNKgVchKktX4N6DaegfPbP.jpg",
          },
        ];

  return (
    <main
      className={cn(
        cardFont.className,
        "relative min-h-[100dvh] bg-[#141414] text-white px-4 sm:px-6 pb-28 pt-20 md:pr-8 lg:pl-24",
      )}
    >
      <div className="relative mx-auto w-full max-w-[1720px] space-y-7">
        {/* ── HEADER (CINEMA GRADE) ── */}
        <header className="relative text-center">
          <div className="sm:absolute left-0 top-0 mb-4 sm:mb-0 text-left">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-300 transition-colors hover:text-white cursor-pointer px-4 py-2 rounded-full bg-[#201d2c] border border-purple-500/30 hover:border-purple-500/60 shadow-sm"
            >
              <ArrowLeft size={14} className="text-purple-400" /> Quay lại
            </button>
          </div>

          <div className="pt-1 sm:pt-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2.5">
              <Sparkles size={13} className="text-purple-400 animate-pulse" />
              <span>Vũ Trụ Điện Ảnh & Lọc Phim Chuyên Sâu</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Thế Giới Phim
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto">
              Khám phá các vũ trụ điện ảnh, chủ đề phim thịnh hành và bộ lọc đa tiêu chí chuẩn cinema.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              type="button"
              onClick={() => setActiveTab("universe")}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer select-none",
                activeTab === "universe" && !isFiltered
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40"
                  : "bg-[#181a22] text-neutral-400 border border-white/[0.08] hover:text-white hover:bg-[#222530]",
              )}
            >
              <Layers size={14} className={activeTab === "universe" && !isFiltered ? "text-white" : "text-purple-400"} />
              <span>Vũ Trụ Điện Ảnh (16 Chủ Đề)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("filter")}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer select-none",
                activeTab === "filter" || isFiltered
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40"
                  : "bg-[#181a22] text-neutral-400 border border-white/[0.08] hover:text-white hover:bg-[#222530]",
              )}
            >
              <SlidersHorizontal size={14} className={activeTab === "filter" || isFiltered ? "text-white" : "text-purple-400"} />
              <span>Bộ Lọc Phim Chuyên Sâu</span>
              {isFiltered && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              )}
            </button>
          </div>
        </header>

        {/* ── ADVANCED FILTER CONTROL PANEL (LUXURY PURPLE CINEMA) ── */}
        <section
          aria-label="Bộ lọc phim chuyên sâu"
          className="rounded-2xl border border-white/10 bg-[#161822] p-4 sm:p-5 shadow-2xl space-y-4"
        >
          {/* Quick Presets Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider pr-1 select-none flex items-center gap-1.5">
                <Flame size={13} className="text-purple-400" />
                <span>Định dạng:</span>
              </span>
              {TYPES.map((t) => {
                const isActive = selectedType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleFilterChange(setSelectedType, t.value)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none",
                      isActive
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 border border-purple-400/40"
                        : "bg-[#1f222e] text-neutral-400 border border-white/[0.06] hover:bg-[#282c3c] hover:text-white",
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* View Mode & Reset Button */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 hover:text-red-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Xóa bộ lọc</span>
                </button>
              )}

              <div className="hidden sm:flex items-center bg-[#1f222e] border border-white/[0.08] rounded-full p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  title="Dạng lưới"
                  className={cn(
                    "p-1.5 rounded-full transition-colors cursor-pointer",
                    viewMode === "grid"
                      ? "bg-purple-600 text-white"
                      : "text-neutral-400 hover:text-white",
                  )}
                >
                  <Grid3X3 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("compact")}
                  title="Dạng danh sách gọn"
                  className={cn(
                    "p-1.5 rounded-full transition-colors cursor-pointer",
                    viewMode === "compact"
                      ? "bg-purple-600 text-white"
                      : "text-neutral-400 hover:text-white",
                  )}
                >
                  <ListFilter size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Main 4-Column Filter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Live Search Input */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Tìm tên phim, diễn viên..."
                value={search}
                onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                className="w-full bg-[#1f222e] border border-white/[0.08] pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => handleFilterChange(setSearch, "")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs p-1"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* 2. Thể Loại (Genre) */}
            <div className="relative">
              <select
                value={selectedGenre}
                onChange={(e) => handleFilterChange(setSelectedGenre, e.target.value)}
                className="w-full appearance-none bg-[#1f222e] border border-white/[0.08] px-3.5 py-2 text-xs text-neutral-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 cursor-pointer font-medium transition-all"
              >
                <option value="" className="bg-[#181a24] text-neutral-400">
                  Tất cả thể loại ({GENRES_LIST.length})
                </option>
                {GENRES_LIST.map((g) => (
                  <option key={g.slug} value={g.slug} className="bg-[#181a24] text-white">
                    {g.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
            </div>

            {/* 3. Quốc Gia (Country) */}
            <div className="relative">
              <select
                value={selectedCountry}
                onChange={(e) => handleFilterChange(setSelectedCountry, e.target.value)}
                className="w-full appearance-none bg-[#1f222e] border border-white/[0.08] px-3.5 py-2 text-xs text-neutral-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 cursor-pointer font-medium transition-all"
              >
                <option value="" className="bg-[#181a24] text-neutral-400">
                  Tất cả quốc gia ({COUNTRIES_LIST.length})
                </option>
                {COUNTRIES_LIST.map((c) => (
                  <option key={c.slug} value={c.slug} className="bg-[#181a24] text-white">
                    {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
            </div>

            {/* 4. Năm Phát Hành & Sắp Xếp */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => handleFilterChange(setSelectedYear, e.target.value)}
                  className="w-full appearance-none bg-[#1f222e] border border-white/[0.08] px-3 py-2 text-xs text-neutral-200 rounded-xl focus:outline-none focus:border-purple-500 cursor-pointer font-medium transition-all"
                >
                  <option value="" className="bg-[#181a24] text-neutral-400">
                    Tất cả năm
                  </option>
                  {YEARS.map((y) => (
                    <option key={y} value={y} className="bg-[#181a24] text-white">
                      Năm {y}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                />
              </div>

              <div className="relative">
                <select
                  value={selectedSort}
                  onChange={(e) => handleFilterChange(setSelectedSort, e.target.value)}
                  className="w-full appearance-none bg-[#1f222e] border border-white/[0.08] px-3 py-2 text-xs text-neutral-200 rounded-xl focus:outline-none focus:border-purple-500 cursor-pointer font-medium transition-all"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-[#181a24] text-white">
                      {s.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* Active Badges Pill Summary */}
          {isFiltered && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-white/[0.06] text-xs">
              <span className="text-neutral-400 font-semibold">Đang lọc:</span>
              {search.trim() && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                  Từ khóa: &ldquo;{search}&rdquo;
                  <button onClick={() => setSearch("")} className="hover:text-white cursor-pointer ml-1">✕</button>
                </span>
              )}
              {selectedType !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                  Loại: {TYPES.find((t) => t.value === selectedType)?.label}
                  <button onClick={() => setSelectedType("all")} className="hover:text-white cursor-pointer ml-1">✕</button>
                </span>
              )}
              {selectedGenre && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                  Thể loại: {GENRES_LIST.find((g) => g.slug === selectedGenre)?.label}
                  <button onClick={() => setSelectedGenre("")} className="hover:text-white cursor-pointer ml-1">✕</button>
                </span>
              )}
              {selectedCountry && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                  Quốc gia: {COUNTRIES_LIST.find((c) => c.slug === selectedCountry)?.label}
                  <button onClick={() => setSelectedCountry("")} className="hover:text-white cursor-pointer ml-1">✕</button>
                </span>
              )}
              {selectedYear && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                  Năm: {selectedYear}
                  <button onClick={() => setSelectedYear("")} className="hover:text-white cursor-pointer ml-1">✕</button>
                </span>
              )}
            </div>
          )}
        </section>

        {/* ── CONDITIONAL CONTENT: FILTER RESULTS vs UNIVERSE TOPICS ── */}
        {activeTab === "filter" || isFiltered ? (
          /* ── LIVE FILTER RESULTS SECTION ── */
          <section aria-label="Kết quả lọc phim" className="space-y-5 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {isLoading
                    ? "Đang tìm kiếm phim..."
                    : `Tìm thấy ${totalItems} bộ phim phù hợp`}
                </h2>
              </div>
              <span className="text-xs text-neutral-400">Trang {page} / {totalPages}</span>
            </div>

            {/* Film Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {Array.from({ length: 18 }).map((_, i) => (
                  <FilmCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredFilms.length > 0 ? (
              <div
                className={cn(
                  "grid gap-3 sm:gap-4",
                  viewMode === "grid"
                    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                    : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
                )}
              >
                {filteredFilms.map((film, index) => (
                  <FilmCard
                    key={`${film.slug || index}-${index}`}
                    film={film}
                    priority={index < 6}
                  />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center rounded-2xl bg-[#161822] border border-white/[0.08] space-y-4">
                <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto text-purple-400">
                  <Search size={28} />
                </div>
                <h3 className="text-lg font-bold text-white">Không tìm thấy bộ phim phù hợp</h3>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
                  Hãy thử điều chỉnh lại thể loại, quốc gia, năm phát hành hoặc từ khóa tìm kiếm để khám phá nhiều tựa phim hơn.
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  <RotateCcw size={13} />
                  <span>Khôi phục tất cả bộ lọc</span>
                </button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pt-6 flex justify-center">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={24}
                  onPageChange={(newPage) => {
                    setPage(newPage);
                    window.scrollTo({ top: 260, behavior: "smooth" });
                  }}
                />
              </div>
            )}
          </section>
        ) : (
          /* ── UNIVERSE TOPICS & RECOMMENDED MARQUEE ── */
          <>
            {/* ── DẢI BĂNG CÁC PHIM ĐỀ XUẤT LIÊN QUAN (ĐỒNG MÀU BACKGROUND WEB #141414) ── */}
            <section
              aria-label="Dải băng phim đề xuất"
              className="overflow-hidden"
            >
              <div className="relative w-full overflow-hidden py-1 bg-transparent">
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#141414] to-transparent z-10" />
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#141414] to-transparent z-10" />

                <div className="animate-marquee-rtl gap-3 px-3">
                  {[...recommendedFilms, ...recommendedFilms].map(
                    (film: any, idx) => {
                      const poster = film.thumb_url?.startsWith("http")
                        ? film.thumb_url
                        : film.poster_url?.startsWith("http")
                          ? film.poster_url
                          : film.thumb_url
                            ? `https://phimimg.com/${film.thumb_url}`
                            : "https://image.tmdb.org/t/p/w300/3yEHM2HT2vrUtO93YzTJNgEfiZG.jpg";

                      return (
                        <Link
                          key={`${film.slug || idx}-${idx}`}
                          href={`/film/${film.slug}`}
                          className="group flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-[#181a22] border border-white/[0.08] hover:bg-[#202330] hover:border-purple-500/40 transition-all flex-shrink-0 cursor-pointer shadow-sm"
                        >
                          <div className="relative h-10 w-7 rounded-md overflow-hidden bg-neutral-900 flex-shrink-0 shadow-md">
                            <Image
                              src={poster}
                              alt={film.name || film.origin_name || "Phim"}
                              fill
                              sizes="32px"
                              className="object-cover group-hover:scale-110 transition-transform duration-300"
                              unoptimized
                            />
                          </div>
                          <div className="max-w-[160px] text-left">
                            <p className="text-xs font-bold text-neutral-200 truncate group-hover:text-purple-300 transition-colors">
                              {film.name}
                            </p>
                            <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                              {film.year || film.origin_name || "Tuyển chọn"} •{" "}
                              <span className="text-purple-400 font-semibold">
                                {film.quality || "HD"}
                              </span>
                            </p>
                          </div>
                        </Link>
                      );
                    },
                  )}
                </div>
              </div>
            </section>

            {/* ── CINEMA UNIVERSE TILES (FULL-BLEED ARTWORK & GRADIENT SCRIM) ── */}
            <section
              aria-label="Danh sách chủ đề phim"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5"
            >
              {TOPICS.map((topic) => (
                <Link
                  key={topic.slug}
                  href={topic.href}
                  className="group relative flex flex-col justify-end min-h-[185px] sm:min-h-[205px] overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#16171e] p-5 transition-all duration-500 hover:-translate-y-1.5 hover:border-purple-500/40 hover:shadow-[0_20px_45px_rgba(0,0,0,0.85)] cursor-pointer select-none transform-gpu will-change-transform"
                >
                  <div
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                    aria-hidden="true"
                  >
                    <Image
                      src={topic.image}
                      alt={topic.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover object-center brightness-[0.72] contrast-[1.08] transition-all duration-700 group-hover:scale-110 group-hover:brightness-95 transform-gpu"
                      loading="lazy"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e0f14] via-[#0e0f14]/70 to-black/25 group-hover:via-[#0e0f14]/50 transition-colors duration-500" />
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at bottom left, ${topic.accent}35 0%, transparent 70%)`,
                      }}
                    />
                  </div>

                  <div className="relative z-10 self-end mb-auto">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 border border-white/10 text-neutral-300 transition-all duration-300 group-hover:bg-purple-600 group-hover:border-purple-400 group-hover:text-white group-hover:scale-110">
                      <ArrowUpRight size={14} strokeWidth={2.5} />
                    </div>
                  </div>

                  <div className="relative z-10 mt-auto pt-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md text-white shadow-sm"
                        style={{
                          backgroundColor: topic.accent,
                        }}
                      >
                        {topic.badge}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-[19px] font-extrabold text-white tracking-tight leading-snug [text-shadow:_0_2px_8px_rgba(0,0,0,0.9)] group-hover:text-purple-200 transition-colors">
                      {topic.title}
                    </h2>
                    <p className="mt-1 text-[11px] leading-relaxed text-neutral-300 line-clamp-1 [text-shadow:_0_1px_4px_rgba(0,0,0,0.9)]">
                      {topic.description}
                    </p>
                  </div>
                </Link>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
