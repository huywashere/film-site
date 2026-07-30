"use client";

import Link from "next/link";
import {
  Sparkles,
  Flame,
  Swords,
  Heart,
  Skull,
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
} from "lucide-react";
import { GENRES_LIST } from "@/components/layout/Navbar";

const TOPIC_COLLECTIONS = [
  {
    id: "co-trang",
    title: "Cổ Trang Hoa Ngữ",
    subtitle: "Võ hiệp, tiên hiệp, cung đấu hấp dẫn nhất",
    gradient: "from-amber-600/30 via-red-900/40 to-neutral-950",
    badge: "1000+ Phim",
    icon: Swords,
    link: "/genre/co-trang",
  },
  {
    id: "han-quoc",
    title: "K-Drama Hàn Quốc",
    subtitle: "Tình cảm lãng mạn, giật gân, học đường",
    gradient: "from-pink-600/30 via-purple-900/40 to-neutral-950",
    badge: "Hot Trend",
    icon: Heart,
    link: "/country/han-quoc",
  },
  {
    id: "hoat-hinh",
    title: "Anime & Hoạt Hình",
    subtitle: "Thế giới huyền ảo, Manga chuyển thể",
    gradient: "from-blue-600/30 via-indigo-900/40 to-neutral-950",
    badge: "Thế Giới Anime",
    icon: Wand2,
    link: "/films/anime",
  },
  {
    id: "kinh-di",
    title: "Kinh Dị & Ma Cà Rồng",
    subtitle: "Hồi hộp, rùng rợn, giật gân thót tim",
    gradient: "from-red-600/40 via-neutral-900/60 to-neutral-950",
    badge: "Cấm Trẻ Em",
    icon: Ghost,
    link: "/genre/kinh-di",
  },
  {
    id: "hanh-dong",
    title: "Bom Tấn Hành Động",
    subtitle: "Kỹ xảo đỉnh cao, rượt đuổi nghẹt thở",
    gradient: "from-emerald-600/30 via-teal-900/40 to-neutral-950",
    badge: "Mới Cập Nhật",
    icon: Zap,
    link: "/genre/hanh-dong",
  },
  {
    id: "vien-tuong",
    title: "Khoa Học Viễn Tưởng",
    subtitle: "Vũ trụ, siêu anh hùng, tương lai",
    gradient: "from-cyan-600/30 via-blue-900/40 to-neutral-950",
    badge: "Vũ Trụ Cinema",
    icon: Compass,
    link: "/genre/vien-tuong",
  },
];

const GENRE_ICONS: Record<string, any> = {
  "bi-an": Ghost,
  "chien-tranh": ShieldAlert,
  "chinh-kich": Film,
  "co-trang": Swords,
  "gia-dinh": Heart,
  "hai-huoc": Smile,
  "hanh-dong": Zap,
  "hinh-su": Skull,
  "hoc-duong": GraduationCap,
  "khoa-hoc": Compass,
  "kinh-di": Ghost,
  "kinh-dien": Film,
  "lich-su": Swords,
  "mien-tay": Flame,
  "phim-18": Flame,
  "phim-ngan": Tv,
  "phieu-luu": Compass,
  "than-thoai": Wand2,
  "the-thao": Trophy,
  "tre-em": Baby,
  "tai-lieu": Tv,
  "tam-ly": Heart,
  "tinh-cam": Heart,
  "vien-tuong": Zap,
  "vo-thuat": Swords,
  "am-nhac": Music,
};

export default function GenresTopicsPage() {
  return (
    <div className="w-full pl-4 lg:pl-24 pr-4 md:pr-10 pt-20 sm:pt-24 pb-20 bg-background min-h-screen text-foreground select-none font-sans">
      {/* ── Header ── */}
      <div className="mb-10 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black uppercase tracking-widest mb-3">
          <Sparkles size={14} />
          <span>Bộ Bộ Thể Loại & Chủ Đề</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Khám Phá Theo Chủ Đề
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-2 leading-relaxed">
          Dễ dàng tìm thấy bộ phim yêu thích theo thể loại, vũ trụ phim hay xu
          hướng thưởng thức của bạn
        </p>
      </div>

      {/* ── Featured Topic Collections ── */}
      <div className="mb-14">
        <h2 className="text-sm font-black uppercase tracking-wider text-neutral-400 mb-5 flex items-center gap-2">
          <Flame size={16} className="text-red-500" />
          <span>Bộ Sưu Tập Chủ Đề Phổ Biến</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TOPIC_COLLECTIONS.map((topic) => {
            const Icon = topic.icon;
            return (
              <Link
                key={topic.id}
                href={topic.link}
                className={`relative overflow-hidden rounded-3xl p-6 border border-white/10 bg-gradient-to-br ${topic.gradient} hover:border-white/25 hover:scale-[1.02] transition-all duration-300 group shadow-2xl flex flex-col justify-between min-h-[160px]`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-md">
                      {topic.badge}
                    </span>
                    <Icon
                      className="text-white/60 group-hover:text-white transition-colors"
                      size={24}
                    />
                  </div>
                  <h3 className="text-xl font-black text-white group-hover:text-red-400 transition-colors">
                    {topic.title}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                    {topic.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-white/70 group-hover:text-white pt-4">
                  <span>Khám phá ngay</span>
                  <ChevronRight
                    size={14}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── All Categories Grid ── */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-wider text-neutral-400 mb-5 flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-400" />
          <span>Tất Cả Thể Loại Phim ({GENRES_LIST.length})</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {GENRES_LIST.map((genre) => {
            const Icon = GENRE_ICONS[genre.slug] || Film;
            return (
              <Link
                key={genre.slug}
                href={`/genre/${genre.slug}`}
                className="bg-[#10141b]/80 border border-white/8 hover:border-red-500/50 rounded-2xl p-4 flex flex-col items-center text-center transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/10 group backdrop-blur-md"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 group-hover:border-red-500/50 group-hover:bg-red-500/10 flex items-center justify-center mb-2.5 text-neutral-400 group-hover:text-red-400 transition-colors">
                  <Icon size={18} />
                </div>
                <h3 className="font-extrabold text-xs text-white group-hover:text-red-400 transition-colors">
                  {genre.label}
                </h3>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
