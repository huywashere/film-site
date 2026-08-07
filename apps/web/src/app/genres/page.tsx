"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Flame,
  Swords,
  Heart,
  Ghost,
  Compass,
  GraduationCap,
  Smile,
  Baby,
  Trophy,
  Wand2,
  Music,
  ShieldAlert,
  Tv,
  Film,
  Zap,
  ChevronRight,
  Search,
  Skull,
  Star,
  Clapperboard,
  Layers,
} from "lucide-react";
import { GENRES_LIST } from "@/components/layout/Navbar";

// ── Top 6 Featured Topic Collections with Ambient Backdrop Artworks & Glass Refraction ──
const FEATURED_TOPICS = [
  {
    id: "co-trang",
    title: "Cổ Trang Hoa Ngữ",
    subtitle: "Võ hiệp, tiên hiệp & cung đấu tranh quyền hấp dẫn nhất",
    badge: "1000+ PHIM",
    accentColor: "from-neutral-800/40 via-neutral-900/60 to-neutral-950",
    borderColor: "group-hover:border-white/30",
    glowColor: "group-hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]",
    badgeBg: "bg-white/10 text-neutral-300 border-white/15",
    icon: Swords,
    link: "/genre/co-trang",
    backdrop:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop",
    fallbackBackdrop:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop",
    featuredTag: "Siêu Phẩm",
    rating: "9.8",
  },
  {
    id: "han-quoc",
    title: "K-Drama Hàn Quốc",
    subtitle: "Tình cảm lãng mạn, kịch tính & góc nhìn học đường",
    badge: "HOT TREND",
    accentColor: "from-neutral-800/40 via-neutral-900/60 to-neutral-950",
    borderColor: "group-hover:border-white/30",
    glowColor: "group-hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]",
    badgeBg: "bg-white/10 text-neutral-300 border-white/15",
    icon: Heart,
    link: "/country/han-quoc",
    backdrop:
      "https://images.unsplash.com/photo-1538485399081-7191377e8241?q=80&w=1200&auto=format&fit=crop",
    fallbackBackdrop:
      "https://images.unsplash.com/photo-1538485399081-7191377e8241?q=80&w=1200&auto=format&fit=crop",
    featuredTag: "Bảng Xếp Hạng #1",
    rating: "9.6",
  },
  {
    id: "hoat-hinh",
    title: "Anime & Hoạt Hình 4K",
    subtitle: "Thế giới huyền ảo, Manga chuyển thể & bom tấn Ghibli",
    badge: "VŨ TRỤ ANIME",
    accentColor: "from-neutral-800/40 via-neutral-900/60 to-neutral-950",
    borderColor: "group-hover:border-white/30",
    glowColor: "group-hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]",
    badgeBg: "bg-white/10 text-neutral-300 border-white/15",
    icon: Wand2,
    link: "/films/anime",
    backdrop:
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop",
    fallbackBackdrop:
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop",
    featuredTag: "Full HD / 4K",
    rating: "9.7",
  },
  {
    id: "kinh-di",
    title: "Kinh Dị & Giật Gân",
    subtitle: "Hồi hộp, rùng rợn & thót tim với những bí ẩn đen tối",
    badge: "KINH DỊ",
    accentColor: "from-neutral-800/40 via-neutral-900/60 to-neutral-950",
    borderColor: "group-hover:border-white/30",
    glowColor: "group-hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]",
    badgeBg: "bg-white/10 text-neutral-300 border-white/15",
    icon: Ghost,
    link: "/genre/kinh-di",
    backdrop:
      "https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=1200&auto=format&fit=crop",
    fallbackBackdrop:
      "https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=1200&auto=format&fit=crop",
    featuredTag: "Thriller",
    rating: "9.2",
  },
  {
    id: "hanh-dong",
    title: "Bom Tấn Hành Động",
    subtitle: "Kỹ xảo Marvel/DC đỉnh cao, rượt đuổi & mãn nhãn",
    badge: "MỚI CẬP NHẬT",
    accentColor: "from-neutral-800/40 via-neutral-900/60 to-neutral-950",
    borderColor: "group-hover:border-white/30",
    glowColor: "group-hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]",
    badgeBg: "bg-white/10 text-neutral-300 border-white/15",
    icon: Zap,
    link: "/genre/hanh-dong",
    backdrop:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop",
    fallbackBackdrop:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop",
    featuredTag: "Blockbuster 2026",
    rating: "9.9",
  },
  {
    id: "vien-tuong",
    title: "Khoa Học Viễn Tưởng",
    subtitle: "Khám phá vũ trụ sâu thẫm, du hành thời gian & tương lai",
    badge: "VŨ TRỤ CINEMA",
    accentColor: "from-neutral-800/40 via-neutral-900/60 to-neutral-950",
    borderColor: "group-hover:border-white/30",
    glowColor: "group-hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]",
    badgeBg: "bg-white/10 text-neutral-300 border-white/15",
    icon: Compass,
    link: "/genre/vien-tuong",
    backdrop:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop",
    fallbackBackdrop:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop",
    featuredTag: "Masterpiece",
    rating: "9.9",
  },
];

// ── Icons & Color Themes for 26 Genres ──
const GENRE_CONFIG: Record<
  string,
  { icon: any; color: string; badge: string }
> = {
  "bi-an": { icon: Ghost, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Bí Ẩn" },
  "chien-tranh": { icon: ShieldAlert, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Chiến Tranh" },
  "chinh-kich": { icon: Film, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Drama" },
  "co-trang": { icon: Swords, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Võ Hiệp" },
  "gia-dinh": { icon: Heart, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Ấm Áp" },
  "hai-huoc": { icon: Smile, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Giải Trí" },
  "hanh-dong": { icon: Zap, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Mãn Nhãn" },
  "hinh-su": { icon: Skull, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Trinh Thám" },
  "hoc-duong": { icon: GraduationCap, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Tuổi Trẻ" },
  "khoa-hoc": { icon: Compass, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Sci-Fi" },
  "kinh-di": { icon: Ghost, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Rùng Rợn" },
  "kinh-dien": { icon: Clapperboard, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Bất Hủ" },
  "lich-su": { icon: Swords, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Lịch Sử" },
  "mien-tay": { icon: Flame, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Cowboy" },
  "phim-18": { icon: Flame, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "18+" },
  "phim-ngan": { icon: Tv, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Ngắn" },
  "phieu-luu": { icon: Compass, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Thám Hiểm" },
  "than-thoai": { icon: Wand2, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Thần Thoại" },
  "the-thao": { icon: Trophy, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Thể Thao" },
  "tre-em": { icon: Baby, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Thiếu Nhi" },
  "tai-lieu": { icon: Tv, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Tài Liệu" },
  "tam-ly": { icon: Heart, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Sâu Sắc" },
  "tinh-cam": { icon: Heart, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Lãng Mạn" },
  "vien-tuong": { icon: Zap, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Tương Lai" },
  "vo-thuat": { icon: Swords, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Kung Fu" },
  "am-nhac": { icon: Music, color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10", badge: "Âm Nhạc" },
};

export default function GenresTopicsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGenres = useMemo(() => {
    if (!searchQuery.trim()) return GENRES_LIST;
    const q = searchQuery.toLowerCase().trim();
    return GENRES_LIST.filter(
      (g) => g.label.toLowerCase().includes(q) || g.slug.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  return (
    <div className="w-full pl-4 lg:pl-24 pr-4 md:pr-10 pt-20 sm:pt-24 pb-24 bg-background min-h-screen text-foreground select-none font-sans overflow-x-hidden">
      {/* ── DESIGN READ HEADER (Ultra-Minimalist Dark) ── */}
      <header className="mb-12 text-center max-w-3xl mx-auto relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-neutral-400 text-xs font-mono font-bold tracking-widest uppercase mb-4">
          <Sparkles size={14} className="text-neutral-400" />
          <span>THỂ LOẠI & VŨ TRỤ PHIM</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none text-white drop-shadow-2xl">
          Khám Phá Theo Chủ Đề
        </h1>

        <p className="text-xs sm:text-sm md:text-base text-neutral-400 mt-3.5 max-w-xl mx-auto leading-relaxed">
          Hơn 50,000+ bộ phim 4K tuyển chọn theo thể loại, vũ trụ điện ảnh & xu hướng thưởng thức đỉnh cao của bạn.
        </p>
      </header>

      {/* ── FEATURED TOPIC BENTO SHOWCASE ── */}
      <section className="mb-16 relative z-10 cv-section-auto">
        <div className="flex items-center justify-between mb-6 px-1">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-neutral-300 flex items-center gap-2.5">
            <Flame size={18} className="text-neutral-400" />
            <span>BỘ SƯU TẬP CHỦ ĐỀ HOT NHẤT</span>
          </h2>
          <span className="text-[11px] font-mono text-neutral-500 font-semibold hidden sm:inline-block">
            6 THỂ LOẠI THỊNH HÀNH 2026
          </span>
        </div>

        {/* Bento Grid with Ambient Poster Backdrops & Hover Physics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURED_TOPICS.map((topic, index) => {
            const Icon = topic.icon;
            return (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link
                  href={topic.link}
                  className={`group relative overflow-hidden rounded-3xl p-6 border border-white/10 ${topic.borderColor} ${topic.glowColor} transition-all duration-500 shadow-2xl flex flex-col justify-between min-h-[220px] sm:min-h-[240px] bg-neutral-950 transform-gpu hover:-translate-y-1.5`}
                >
                  {/* Ambient Backdrop Image with Zoom & Dark Gradient Scrim */}
                  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={topic.backdrop}
                      alt={topic.title}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== topic.fallbackBackdrop) {
                          target.src = topic.fallbackBackdrop;
                        }
                      }}
                      className="w-full h-full object-cover object-center brightness-50 group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                    {/* Multi-layer Gradient Scrim for Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#060709] via-[#060709]/80 to-transparent z-10" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#060709]/90 via-transparent to-[#060709]/60 z-10" />
                  </div>

                  {/* Top Glass Tags & Glyph */}
                  <div className="relative z-20 flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md shadow-md ${topic.badgeBg}`}>
                        {topic.badge}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-black/60 border border-white/15 text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1 backdrop-blur-md">
                        <Star size={10} className="fill-amber-400" />
                        <span>{topic.rating}</span>
                      </span>
                    </div>

                    <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-white group-hover:text-black transition-all shadow-lg">
                      <Icon size={18} />
                    </div>
                  </div>

                  {/* Middle Content */}
                  <div className="relative z-20 space-y-1.5 mt-auto">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400 block">
                      {topic.featuredTag}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-white transition-colors drop-shadow-md">
                      {topic.title}
                    </h3>
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed font-medium">
                      {topic.subtitle}
                    </p>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="relative z-20 flex items-center justify-between pt-4 border-t border-white/10 mt-4 text-xs font-bold text-neutral-400 group-hover:text-white transition-colors">
                    <span className="flex items-center gap-1">
                      <span>Khám phá bộ sưu tập</span>
                    </span>
                    <div className="w-7 h-7 rounded-full bg-white/10 group-hover:bg-white group-hover:text-black flex items-center justify-center transition-all">
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── ALL 26 GENRES GRID WITH SEARCH FILTER ── */}
      <section className="relative z-10 cv-section-auto">
        {/* Section Header & Interactive Search Input */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-1">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-neutral-300 flex items-center gap-2.5">
            <Layers size={18} className="text-neutral-400" />
            <span>TẤT CẢ THỂ LOẠI PHIM ({filteredGenres.length})</span>
          </h2>

          {/* Quick Search Filter Input */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Tìm nhanh thể loại..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-white/10 focus:border-white/30 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-white placeholder-neutral-500 focus:outline-none transition-all shadow-inner"
            />
          </div>
        </div>

        {/* 26 Genre Pill Card Grid */}
        {filteredGenres.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {filteredGenres.map((genre) => {
              const cfg = GENRE_CONFIG[genre.slug] || {
                icon: Film,
                color: "from-white/10 to-neutral-900 text-neutral-300 border-white/10",
                badge: "Phim",
              };
              const Icon = cfg.icon;

              return (
                <Link
                  key={genre.slug}
                  href={`/genre/${genre.slug}`}
                  className="group relative bg-neutral-950 border border-white/10 hover:border-white/30 rounded-2xl p-4 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1.5 shadow-xl backdrop-blur-md overflow-hidden cursor-pointer"
                >
                  {/* Subtle Top Ambient Glow Accent */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-white/20 opacity-40 group-hover:opacity-100 transition-opacity" />

                  {/* Glyph Icon Capsule */}
                  <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-neutral-300 group-hover:scale-110 group-hover:bg-white group-hover:text-black transition-all duration-300 shadow-md">
                    <Icon size={20} />
                  </div>

                  {/* Genre Title */}
                  <h3 className="font-extrabold text-xs text-white group-hover:text-white transition-colors line-clamp-1">
                    {genre.label}
                  </h3>

                  {/* Genre Badge Pill */}
                  <span className="text-[9px] font-mono font-bold text-neutral-400 group-hover:text-neutral-200 mt-1 uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 group-hover:bg-white/10 border border-white/5 transition-colors">
                    {cfg.badge}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-neutral-950 border border-white/10 rounded-3xl p-8 space-y-3">
            <Search size={32} className="mx-auto text-neutral-500 animate-bounce" />
            <p className="text-sm font-bold text-neutral-400">
              Không tìm thấy thể loại phù hợp với từ khóa &quot;{searchQuery}&quot;
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer"
            >
              Xóa bộ lọc tìm kiếm
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
