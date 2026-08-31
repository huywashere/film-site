"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Layers,
  X,
  Grid3X3,
  ListFilter,
  Flame,
  Film,
  Compass,
  Play,
  TrendingUp,
  Clapperboard,
} from "lucide-react";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { movieApi } from "@/lib/api";
import { FilmCard, FilmCardSkeleton, type FilmItem } from "@/components/film/FilmCard";
import { Pagination } from "@/components/film/Pagination";
import { GENRES_LIST, COUNTRIES_LIST } from "@/components/layout/Navbar";

interface TopicItem {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  accent: string;
  gradient: string;
  badge: string;
  image: string;
  tagline: string;
}

// 16 Cinema Universes curated with cinematic backdrops & ambient lighting
const TOPICS: TopicItem[] = [
  {
    slug: "phim-han-quoc",
    title: "Phim Hàn Quốc",
    subtitle: "K-Drama & K-Movie",
    description: "Những siêu phẩm truyền hình lôi cuốn, melodrama ngọt ngào và trinh thám gay cấn xứ Kim Chi.",
    href: "/country/han-quoc",
    accent: "#f43f5e",
    gradient: "from-rose-600/30 via-rose-950/20 to-transparent",
    badge: "K-Drama Hot",
    image: "https://image.tmdb.org/t/p/w1280/vbkpl0ps4s5tMTUnC7SFXNzWmVr.jpg", // Lovely Runner
    tagline: "240+ Phim • FHD/4K",
  },
  {
    slug: "phim-trung-quoc",
    title: "Phim Trung Quốc",
    subtitle: "Hoa Ngữ & Cổ Trang",
    description: "Cổ trang tiên hiệp, kiếm hiệp giang hồ, cung đấu huyền huyễn và ngôn tình hiện đại.",
    href: "/country/trung-quoc",
    accent: "#f59e0b",
    gradient: "from-amber-600/30 via-amber-950/20 to-transparent",
    badge: "Hoa Ngữ",
    image: "https://image.tmdb.org/t/p/w1280/aJxMvBSaUdbIkY8nqFkuEarrgcx.jpg", // Thương Lan Quyết
    tagline: "310+ Phim • Tiên Hiệp",
  },
  {
    slug: "dien-anh-au-my",
    title: "Điện Ảnh Âu Mỹ",
    subtitle: "Hollywood & Blockbusters",
    description: "Vũ trụ siêu anh hùng, bom tấn hành động kỹ xảo mãn nhãn và phim đoạt giải Oscar.",
    href: "/country/au-my",
    accent: "#0ea5e9",
    gradient: "from-sky-600/30 via-sky-950/20 to-transparent",
    badge: "Hollywood 4K",
    image: "https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg", // Avengers: Endgame
    tagline: "4K Dolby Vision",
  },
  {
    slug: "anime-nhat-ban",
    title: "Anime Nhật Bản",
    subtitle: "Thế Giới Phù Tang",
    description: "Thế giới phép thuật, Shonen hành động kịch tính và những thước phim hoạt họa giàu cảm xúc.",
    href: "/films/anime",
    accent: "#a855f7",
    gradient: "from-purple-600/30 via-purple-950/20 to-transparent",
    badge: "Anime 4K",
    image: "https://image.tmdb.org/t/p/w1280/8x9iKH8kWA0zdkgNdpAew7OstYe.jpg", // Your Name
    tagline: "Shonen & Isekai",
  },
  {
    slug: "co-trang-tien-hiep",
    title: "Cổ Trang Tiên Hiệp",
    subtitle: "Kiếm Hiệp Kỳ Ảo",
    description: "Tu tiên vấn đạo, giang hồ nghĩa hiệp và những mối tình truyền kiếp chốn tam giới.",
    href: "/search?genre=co-trang&country=trung-quoc",
    accent: "#10b981",
    gradient: "from-emerald-600/30 via-emerald-950/20 to-transparent",
    badge: "Tiên Hiệp",
    image: "https://image.tmdb.org/t/p/w1280/ampkwvfwO7o5YMwYAVPKx1PLDaB.jpg", // Trần Tình Lệnh
    tagline: "Huyền Huyễn • Cung Đấu",
  },
  {
    slug: "thanh-xuan-vuon-truong",
    title: "Thanh Xuân Vườn Trường",
    subtitle: "Tuổi Trẻ & Hoài Niệm",
    description: "Những năm tháng thanh xuân trong sáng, tình bạn rực rỡ và tình đầu ngây ngô khó phai.",
    href: "/search?genre=hoc-duong",
    accent: "#14b8a6",
    gradient: "from-teal-600/30 via-teal-950/20 to-transparent",
    badge: "Thanh Xuân",
    image: "https://image.tmdb.org/t/p/w1280/3nWfjIBUyYUCABI7Fsl1AhNhDAr.jpg", // Khi Anh Chạy Về Phía Em
    tagline: "Học Đường • Ngọt Ngào",
  },
  {
    slug: "tinh-yeu-lang-man",
    title: "Tình Cảm Lãng Mạn",
    subtitle: "Say Đắm & Chữa Lành",
    description: "Những chuyện tình lay động lòng người, rung cảm sâu sắc và mang lại cảm giác bình yên.",
    href: "/genre/tinh-cam",
    accent: "#ec4899",
    gradient: "from-pink-600/30 via-pink-950/20 to-transparent",
    badge: "Lãng Mạn",
    image: "https://image.tmdb.org/t/p/w1280/3yEHM2HT2vrUtO93YzTJNgEfiZG.jpg", // Hạ Cánh Nơi Anh
    tagline: "Chữa Lành • Tâm Lý",
  },
  {
    slug: "gia-dinh-doi-thuong",
    title: "Gia Đình & Đời Thường",
    subtitle: "Ấm Áp & Bình Yên",
    description: "Những câu chuyện dung dị, tình thân gắn kết và những lát cắt đời thường chạm đến trái tim.",
    href: "/genre/gia-dinh",
    accent: "#84cc16",
    gradient: "from-lime-600/30 via-lime-950/20 to-transparent",
    badge: "Gia Đình",
    image: "https://image.tmdb.org/t/p/w1280/1QUrjFNKgVchKktX4N6DaegfPbP.jpg", // Đi Đến Nơi Có Gió
    tagline: "Tình Thân • Nhân Văn",
  },
  {
    slug: "phim-cong-so",
    title: "Công Sở & Đô Thị",
    subtitle: "Hiện Đại & Bản Lĩnh",
    description: "Cuộc sống thành thị năng động, sự nghiệp thăng trầm và tình yêu nơi chốn công sở hiện đại.",
    href: "/search?q=phim%20cong%20so",
    accent: "#6366f1",
    gradient: "from-indigo-600/30 via-indigo-950/20 to-transparent",
    badge: "Đô Thị",
    image: "https://image.tmdb.org/t/p/w1280/lq0YqJuffMuZhoKTiC5xDqvtCSn.jpg", // Hẹn Hò Chốn Công Sở
    tagline: "Thương Trường • Tình Yêu",
  },
  {
    slug: "hinh-su-toi-pham",
    title: "Hình Sự & Trinh Thám",
    subtitle: "Căng Thẳng & Phá Án",
    description: "Cuộc đấu trí nghẹt thở giữa cảnh sát và tội phạm, những vụ án bí ẩn dần được vén màn.",
    href: "/genre/hinh-su",
    accent: "#06b6d4",
    gradient: "from-cyan-600/30 via-cyan-950/20 to-transparent",
    badge: "Trinh Thám",
    image: "https://image.tmdb.org/t/p/w1280/i1SyUHsi45psSH1xy9sM0in8FKJ.jpg", // Taxi Driver
    tagline: "Tâm Lý Tội Phạm",
  },
  {
    slug: "phim-chieu-rap-4k",
    title: "Chiếu Rạp & Bom Tấn",
    subtitle: "Âm Thanh Vòm & Kỹ Xảo",
    description: "Tuyển tập những tác phẩm điện ảnh đình đám từng làm mưa làm gió tại các phòng vé toàn cầu.",
    href: "/search?q=chieu%20rap",
    accent: "#eab308",
    gradient: "from-yellow-600/30 via-yellow-950/20 to-transparent",
    badge: "Cinema 4K",
    image: "https://image.tmdb.org/t/p/w1280/7I6VUdPj6tQECNHdviJkUHD2u89.jpg", // John Wick 4
    tagline: "Dolby Atmos 4K",
  },
  {
    slug: "kinh-di-tam-linh",
    title: "Kinh Dị & Siêu Nhiên",
    subtitle: "Rùng Rợn & Ám Ảnh",
    description: "Những hiện tượng huyền bí, thế lực tà ác và nỗi sợ hãi tột cùng len lỏi qua từng khung hình.",
    href: "/genre/kinh-di",
    accent: "#ef4444",
    gradient: "from-red-600/30 via-red-950/20 to-transparent",
    badge: "Kinh Dị",
    image: "https://image.tmdb.org/t/p/w1280/709O9e0mEq45bB60bX7oP462l6w.jpg", // Exhuma
    tagline: "Giật Gân • Tâm Linh",
  },
  {
    slug: "hai-huoc-giai-tri",
    title: "Hài Hước & Thư Giãn",
    subtitle: "Sảng Khoái & Vui Nhộn",
    description: "Tiếng cười giải trí bất tận, những tình huống dở khóc dở cười giúp xua tan mọi mệt mỏi.",
    href: "/genre/hai-huoc",
    accent: "#fb923c",
    gradient: "from-orange-600/30 via-orange-950/20 to-transparent",
    badge: "Hài Hước",
    image: "https://image.tmdb.org/t/p/w1280/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg", // Deadpool & Wolverine
    tagline: "Gia Đình • Hài Kịch",
  },
  {
    slug: "khoa-hoc-vien-tuong",
    title: "Khoa Học Viễn Tưởng",
    subtitle: "Tương Lai & Đa Vũ Trụ",
    description: "Khám phá không gian vũ trụ vô tận, thế giới tương lai và những công nghệ vượt tầm thời đại.",
    href: "/genre/vien-tuong",
    accent: "#3b82f6",
    gradient: "from-blue-600/30 via-blue-950/20 to-transparent",
    badge: "Sci-Fi",
    image: "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg", // Interstellar
    tagline: "Du Hành Không Gian",
  },
  {
    slug: "chien-tranh-lich-su",
    title: "Chiến Tranh & Lịch Sử",
    subtitle: "Hào Hùng & Bi Tráng",
    description: "Những trận đánh lịch sử quy mô lớn, tinh thần quả cảm và những trang sử vẻ vang của nhân loại.",
    href: "/genre/chien-tranh",
    accent: "#a1a1aa",
    gradient: "from-zinc-600/30 via-zinc-950/20 to-transparent",
    badge: "Lịch Sử",
    image: "https://image.tmdb.org/t/p/w1280/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg", // Oppenheimer
    tagline: "Sử Thi • Chính Kịch",
  },
  {
    slug: "am-nhac-nghe-thuat",
    title: "Âm Nhạc & Nghệ Thuật",
    subtitle: "Giai Điệu Thăng Hoa",
    description: "Những bản nhạc bất hủ, vũ điệu say mê và hành trình nghệ thuật chạm tới đỉnh cao danh vọng.",
    href: "/genre/am-nhac",
    accent: "#d946ef",
    gradient: "from-fuchsia-600/30 via-fuchsia-950/20 to-transparent",
    badge: "Âm Nhạc",
    image: "https://image.tmdb.org/t/p/w1280/q8793iKq1KqQj42h4u4wE1P1e4q.jpg", // La La Land
    tagline: "Nhạc Kịch • Vũ Đạo",
  },
];

const YEARS = Array.from({ length: 25 }, (_, i) => 2026 - i);

const TYPES = [
  { label: "Tất cả", value: "all", icon: Clapperboard },
  { label: "Phim Bộ", value: "series", icon: Film },
  { label: "Phim Lẻ", value: "single", icon: Film },
  { label: "Anime / Hoạt Hình", value: "anime", icon: Sparkles },
  { label: "TV Shows", value: "tv-shows", icon: TrendingUp },
];

const SORTS = [
  { label: "Mới cập nhật", value: "modified.time" },
  { label: "Năm phát hành", value: "year" },
  { label: "Lượt xem cao", value: "view" },
];

export default function GenresPage() {
  const router = useRouter();

  // Active View Tab ("universe" | "filter")
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

  return (
    <main
      className={cn(
        cardFont.className,
        "relative min-h-[100dvh] bg-[#0c0d12] text-white pb-32 pt-20 sm:pt-24",
      )}
    >
      {/* ── Background Ambient Glow ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-purple-900/15 via-indigo-900/10 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-1/3 -left-60 w-[500px] h-[500px] bg-purple-900/10 blur-[130px] rounded-full" />
        <div className="absolute top-2/3 -right-60 w-[500px] h-[500px] bg-indigo-900/10 blur-[130px] rounded-full" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* ── CINEMATIC HEADER ── */}
        <header className="relative flex flex-col items-center text-center space-y-4">
          {/* Back Action */}
          <div className="w-full flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-300 hover:text-white transition-all cursor-pointer px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] backdrop-blur-md shadow-sm active:scale-95"
            >
              <ArrowLeft size={14} className="text-purple-400" />
              <span>Quay lại</span>
            </button>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold tracking-wide">
              <Sparkles size={13} className="text-purple-400 animate-pulse" />
              <span>Vũ Trụ Điện Ảnh & Lọc Phim Chuyên Sâu</span>
            </div>
          </div>

          <div className="max-w-2xl mx-auto space-y-2 pt-2">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-100 to-purple-200">
              Thế Giới Phim
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-lg mx-auto">
              Khám phá 16 vũ trụ điện ảnh đặc sắc, các chủ đề thịnh hành và bộ lọc đa tiêu chí chuẩn rạp chiếu.
            </p>
          </div>

          {/* Mode Switcher Segmented Tabs */}
          <div className="flex items-center p-1 rounded-2xl bg-[#141622]/90 border border-white/[0.08] backdrop-blur-xl shadow-xl">
            <button
              type="button"
              onClick={() => setActiveTab("universe")}
              className={cn(
                "relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer select-none",
                activeTab === "universe" && !isFiltered
                  ? "text-white"
                  : "text-neutral-400 hover:text-neutral-200",
              )}
            >
              {activeTab === "universe" && !isFiltered && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md shadow-purple-900/40 border border-purple-400/30"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <Layers size={14} className="relative z-10" />
              <span className="relative z-10">Vũ Trụ Điện Ảnh (16 Chủ Đề)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("filter")}
              className={cn(
                "relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer select-none",
                activeTab === "filter" || isFiltered
                  ? "text-white"
                  : "text-neutral-400 hover:text-neutral-200",
              )}
            >
              {(activeTab === "filter" || isFiltered) && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md shadow-purple-900/40 border border-purple-400/30"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <SlidersHorizontal size={14} className="relative z-10" />
              <span className="relative z-10">Bộ Lọc Phim Chuyên Sâu</span>
              {isFiltered && (
                <span className="relative z-10 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
          </div>
        </header>

        {/* ── ADVANCED CINEMA FILTER HUB ── */}
        <section
          aria-label="Bộ lọc phim chuyên sâu"
          className="rounded-3xl border border-white/[0.08] bg-[#12141e]/85 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-5"
        >
          {/* Format Quick Chips */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 pr-1 select-none">
                <Flame size={13} className="text-purple-400" />
                <span>Định dạng:</span>
              </span>
              {TYPES.map((t) => {
                const isActive = selectedType === t.value;
                const IconComponent = t.icon;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleFilterChange(setSelectedType, t.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none active:scale-95",
                      isActive
                        ? "bg-purple-600 text-white shadow-md shadow-purple-900/40 border border-purple-400/40 font-bold"
                        : "bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]",
                    )}
                  >
                    <IconComponent size={12} className={isActive ? "text-white" : "text-purple-400/80"} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* View Mode & Reset Button */}
            <div className="flex items-center gap-2.5">
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw size={12} />
                  <span>Xóa bộ lọc</span>
                </button>
              )}

              <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  title="Dạng lưới"
                  className={cn(
                    "p-1.5 rounded-lg transition-all cursor-pointer",
                    viewMode === "grid"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-neutral-400 hover:text-white",
                  )}
                >
                  <Grid3X3 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("compact")}
                  title="Dạng gọn"
                  className={cn(
                    "p-1.5 rounded-lg transition-all cursor-pointer",
                    viewMode === "compact"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-neutral-400 hover:text-white",
                  )}
                >
                  <ListFilter size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* 4 Inputs Control Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Live Search Input */}
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Tìm tên phim, diễn viên..."
                value={search}
                onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                className="w-full bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] pl-10 pr-9 py-2.5 text-xs text-white placeholder-neutral-500 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-[#161826] focus:ring-2 focus:ring-purple-500/30 transition-all font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => handleFilterChange(setSearch, "")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* 2. Thể Loại (Genre) */}
            <div className="relative">
              <select
                value={selectedGenre}
                onChange={(e) => handleFilterChange(setSelectedGenre, e.target.value)}
                className="w-full appearance-none bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] px-4 py-2.5 text-xs text-neutral-200 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-[#161826] focus:ring-2 focus:ring-purple-500/30 cursor-pointer font-medium transition-all"
              >
                <option value="" className="bg-[#12141e] text-neutral-400">
                  Tất cả thể loại ({GENRES_LIST.length})
                </option>
                {GENRES_LIST.map((g) => (
                  <option key={g.slug} value={g.slug} className="bg-[#12141e] text-white">
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
                className="w-full appearance-none bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] px-4 py-2.5 text-xs text-neutral-200 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-[#161826] focus:ring-2 focus:ring-purple-500/30 cursor-pointer font-medium transition-all"
              >
                <option value="" className="bg-[#12141e] text-neutral-400">
                  Tất cả quốc gia ({COUNTRIES_LIST.length})
                </option>
                {COUNTRIES_LIST.map((c) => (
                  <option key={c.slug} value={c.slug} className="bg-[#12141e] text-white">
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
                  className="w-full appearance-none bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-xs text-neutral-200 rounded-xl focus:outline-none focus:border-purple-500 cursor-pointer font-medium transition-all"
                >
                  <option value="" className="bg-[#12141e] text-neutral-400">
                    Tất cả năm
                  </option>
                  {YEARS.map((y) => (
                    <option key={y} value={y} className="bg-[#12141e] text-white">
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
                  className="w-full appearance-none bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-xs text-neutral-200 rounded-xl focus:outline-none focus:border-purple-500 cursor-pointer font-medium transition-all"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-[#12141e] text-white">
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

          {/* Active Filter Badges Summary */}
          {isFiltered && (
            <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-white/[0.06] text-xs">
              <span className="text-neutral-400 font-semibold">Đang lọc:</span>
              {search.trim() && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium">
                  Từ khóa: &ldquo;{search}&rdquo;
                  <button onClick={() => setSearch("")} className="hover:text-white cursor-pointer ml-0.5">✕</button>
                </span>
              )}
              {selectedType !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium">
                  Loại: {TYPES.find((t) => t.value === selectedType)?.label}
                  <button onClick={() => setSelectedType("all")} className="hover:text-white cursor-pointer ml-0.5">✕</button>
                </span>
              )}
              {selectedGenre && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium">
                  Thể loại: {GENRES_LIST.find((g) => g.slug === selectedGenre)?.label}
                  <button onClick={() => setSelectedGenre("")} className="hover:text-white cursor-pointer ml-0.5">✕</button>
                </span>
              )}
              {selectedCountry && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium">
                  Quốc gia: {COUNTRIES_LIST.find((c) => c.slug === selectedCountry)?.label}
                  <button onClick={() => setSelectedCountry("")} className="hover:text-white cursor-pointer ml-0.5">✕</button>
                </span>
              )}
              {selectedYear && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium">
                  Năm: {selectedYear}
                  <button onClick={() => setSelectedYear("")} className="hover:text-white cursor-pointer ml-0.5">✕</button>
                </span>
              )}
            </div>
          )}
        </section>

        {/* ── MAIN CONTENT (UNIVERSE BENTO vs LIVE FILTER RESULTS) ── */}
        <AnimatePresence mode="wait">
          {activeTab === "filter" || isFiltered ? (
            /* ── LIVE FILTER RESULTS ── */
            <motion.section
              key="filter-results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              aria-label="Kết quả lọc phim"
              className="space-y-6 pt-2"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                  <h2 className="text-lg sm:text-xl font-extrabold text-white">
                    {isLoading
                      ? "Đang tìm kiếm phim..."
                      : `Tìm thấy ${totalItems} bộ phim phù hợp`}
                  </h2>
                </div>
                <span className="text-xs font-semibold text-neutral-400 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.06]">
                  Trang {page} / {totalPages}
                </span>
              </div>

              {/* Film Grid */}
              {isLoading ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <FilmCardSkeleton key={i} />
                  ))}
                </div>
              ) : filteredFilms.length > 0 ? (
                <div
                  className={cn(
                    "grid gap-4",
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
                <div className="py-20 text-center rounded-3xl bg-[#12141e]/60 border border-white/[0.08] backdrop-blur-xl space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
                    <Search size={28} />
                  </div>
                  <h3 className="text-lg font-extrabold text-white">Không tìm thấy bộ phim phù hợp</h3>
                  <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
                    Hãy thử điều chỉnh lại thể loại, quốc gia, năm phát hành hoặc từ khóa tìm kiếm để khám phá nhiều tựa phim hơn.
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg shadow-purple-900/40 active:scale-95"
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
                      window.scrollTo({ top: 320, behavior: "smooth" });
                    }}
                  />
                </div>
              )}
            </motion.section>
          ) : (
            /* ── 16 CINEMA UNIVERSE TILES (BENTO GRID) ── */
            <motion.section
              key="universe-grid"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              aria-label="Danh sách 16 chủ đề điện ảnh"
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass size={18} className="text-purple-400" />
                  <h2 className="text-xl font-extrabold tracking-tight text-white">
                    Vũ Trụ Điện Ảnh Nổi Bật
                  </h2>
                </div>
                <span className="text-xs text-neutral-400">16 Tuyển Tập Chuẩn Rạp</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {TOPICS.map((topic) => (
                  <Link
                    key={topic.slug}
                    href={topic.href}
                    className="group relative flex flex-col justify-between min-h-[220px] sm:min-h-[240px] overflow-hidden rounded-3xl border border-white/[0.08] hover:border-white/[0.22] bg-[#12141f] p-5 sm:p-6 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_25px_60px_rgba(0,0,0,0.85)] cursor-pointer select-none transform-gpu will-change-transform"
                  >
                    {/* Background Backdrop Artwork */}
                    <div
                      className="pointer-events-none absolute inset-0 overflow-hidden"
                      aria-hidden="true"
                    >
                      <Image
                        src={topic.image}
                        alt={topic.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover object-center brightness-[0.6] contrast-[1.08] transition-all duration-700 group-hover:scale-110 group-hover:brightness-85 transform-gpu"
                        loading="lazy"
                        unoptimized
                      />
                      {/* Gradient Scrim */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d14] via-[#0c0d14]/75 to-black/35 group-hover:via-[#0c0d14]/55 transition-colors duration-500" />

                      {/* Ambient Accent Radial Glow */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{
                          background: `radial-gradient(circle at bottom left, ${topic.accent}40 0%, transparent 70%)`,
                        }}
                      />
                    </div>

                    {/* Top Row: Badge & Arrow Action */}
                    <div className="relative z-10 flex items-center justify-between gap-2">
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-sm border border-white/20 backdrop-blur-md"
                        style={{
                          backgroundColor: `${topic.accent}cc`,
                        }}
                      >
                        {topic.badge}
                      </span>

                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 border border-white/10 text-neutral-300 transition-all duration-300 group-hover:bg-purple-600 group-hover:border-purple-400 group-hover:text-white group-hover:scale-110 shadow-md">
                        <ArrowUpRight size={14} strokeWidth={2.5} />
                      </div>
                    </div>

                    {/* Bottom Row: Title, Subtitle, Description */}
                    <div className="relative z-10 space-y-1.5 mt-auto pt-6">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-snug [text-shadow:_0_2px_8px_rgba(0,0,0,0.9)] group-hover:text-purple-200 transition-colors">
                          {topic.title}
                        </h3>
                      </div>

                      <p className="text-[11px] font-medium text-neutral-300/90 line-clamp-2 leading-relaxed [text-shadow:_0_1px_4px_rgba(0,0,0,0.9)]">
                        {topic.description}
                      </p>

                      <div className="pt-2 flex items-center justify-between text-[10px] font-bold text-neutral-400 group-hover:text-purple-300 transition-colors">
                        <span>{topic.tagline}</span>
                        <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <span>Khám phá</span>
                          <Play size={10} className="fill-current" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
