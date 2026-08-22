"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { movieApi } from "@/lib/api";

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
    href: "/country/trung-quoc",
    accent: "#10b981",
    badge: "Tiên Hiệp",
    image: "https://image.tmdb.org/t/p/w1280/ampkwvfwO7o5YMwYAVPKx1PLDaB.jpg", // Trần Tình Lệnh
  },
  {
    slug: "thanh-xuan-vuon-truong",
    title: "Thanh Xuân Vườn Trường",
    description: "Tuổi trẻ, tình bạn & hoài niệm học đường",
    href: "/genre/tinh-cam",
    accent: "#14b8a6",
    badge: "Thanh Xuân",
    image: "https://image.tmdb.org/t/p/w1280/wNSLw756U5JQSpG6POYxHKL2KDH.jpg", // Tinh Hán Xán Lạn
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
    slug: "chua-lanh-tam-hon",
    title: "Phim \"Chữa Lành Tâm Hồn\"",
    description: "Nhẹ nhàng, ấm áp, bình yên & gia đình",
    href: "/genre/gia-dinh",
    accent: "#84cc16",
    badge: "Healing",
    image: "https://image.tmdb.org/t/p/w1280/1QUrjFNKgVchKktX4N6DaegfPbP.jpg", // Đi Đến Nơi Có Gió
  },
  {
    slug: "phim-cong-so",
    title: "Phim Công Sở & Đô Thị",
    description: "Tình cảm, sự nghiệp & cuộc sống hiện đại",
    href: "/genre/tam-ly",
    accent: "#6366f1",
    badge: "Đô Thị",
    image: "https://image.tmdb.org/t/p/w1280/hMJZCkmdaC2ZMzjP76a9TPNQFsS.jpg", // Hẹn Hò Chốn Công Sở
  },
  {
    slug: "hinh-su-toi-pham",
    title: "Hình Sự & Trinh Thám",
    description: "Phá án gay cấn, truy lùng tội phạm kịch tính",
    href: "/genre/bi-an",
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
    image: "https://image.tmdb.org/t/p/w1280/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg", // Oppenheimer
  },
  {
    slug: "hanh-dong-nghet-tho",
    title: "Hành Động Nghẹt Thở",
    description: "Đấu súng mãn nhãn, võ thuật & tốc độ cao",
    href: "/genre/hanh-dong",
    accent: "#ef4444",
    badge: "Hành Động",
    image: "https://image.tmdb.org/t/p/w1280/7I6VUdPj6tQECNHdviJkUHD2u89.jpg", // John Wick 4
  },
  {
    slug: "khoa-hoc-vien-tuong",
    title: "Thế Giới Viễn Tưởng",
    description: "Khám phá vũ trụ, tương lai & du hành thời gian",
    href: "/genre/vien-tuong",
    accent: "#3b82f6",
    badge: "Sci-Fi",
    image: "https://image.tmdb.org/t/p/w1280/vgnoBSVzWAV9sNQUORaDGvDp7wx.jpg", // Interstellar
  },
  {
    slug: "kinh-di-dem-khuya",
    title: "Kinh Dị Đêm Khuya",
    description: "Ám ảnh tâm linh, ma quái & thót tim hồi hộp",
    href: "/genre/kinh-di",
    accent: "#dc2626",
    badge: "Kinh Dị",
    image: "https://image.tmdb.org/t/p/w1280/ecKQlAEG95k62SMGhvX83oEqANK.jpg", // The Conjuring
  },
  {
    slug: "hai-huoc-xa-stress",
    title: "Hài Hước Xả Stress",
    description: "Tiếng cười sảng khoái, duyên dáng & vui nhộn",
    href: "/genre/hai-huoc",
    accent: "#f97316",
    badge: "Hài Hước",
    image: "https://image.tmdb.org/t/p/w1280/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg", // Deadpool & Wolverine
  },
  {
    slug: "tam-ly-chinh-kich",
    title: "Tâm Lý & Chính Kịch",
    description: "Xung đột nội tâm sâu sắc & số phận nhân vật",
    href: "/genre/tam-ly",
    accent: "#d946ef",
    badge: "Chính Kịch",
    image: "https://image.tmdb.org/t/p/w1280/5qVLF9WTdBDA08fsZ9H5clJ6umI.jpg", // Parasite
  },
];

export default function GenresTopicsPage() {
  const router = useRouter();

  // Fetch real trending/recommended movies for the slow-running marquee ribbon
  const { data: marqueeData } = useQuery({
    queryKey: ["genres-marquee-recommendations"],
    queryFn: async () => {
      try {
        const res = (await movieApi.getLatest(1)) as any;
        return res?.items || res?.data?.items || [];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const recommendedFilms = (marqueeData && marqueeData.length > 0)
    ? marqueeData.slice(0, 16)
    : [
        { slug: "nu-hoang-nuoc-mat", name: "Nữ Hoàng Nước Mắt", year: 2024, quality: "FHD", thumb_url: "https://image.tmdb.org/t/p/w300/gwt4hJPSwAPxU6eFLhV0Dyb0tnY.jpg" },
        { slug: "ha-canh-noi-anh", name: "Hạ Cánh Nơi Anh", year: 2020, quality: "HD", thumb_url: "https://image.tmdb.org/t/p/w300/3yEHM2HT2vrUtO93YzTJNgEfiZG.jpg" },
        { slug: "cong-anh-ma-chay", name: "Cõng Anh Mà Chạy", year: 2024, quality: "FHD", thumb_url: "https://image.tmdb.org/t/p/w300/vbkpl0ps4s5tMTUnC7SFXNzWmVr.jpg" },
        { slug: "thuong-lan-quyet", name: "Thương Lan Quyết", year: 2022, quality: "FHD", thumb_url: "https://image.tmdb.org/t/p/w300/aJxMvBSaUdbIkY8nqFkuEarrgcx.jpg" },
        { slug: "tinh-han-xan-lan", name: "Tinh Hán Xán Lạn", year: 2022, quality: "HD", thumb_url: "https://image.tmdb.org/t/p/w300/wNSLw756U5JQSpG6POYxHKL2KDH.jpg" },
        { slug: "tran-tinh-lenh", name: "Trần Tình Lệnh", year: 2019, quality: "HD", thumb_url: "https://image.tmdb.org/t/p/w300/ampkwvfwO7o5YMwYAVPKx1PLDaB.jpg" },
        { slug: "oppenheimer", name: "Oppenheimer", year: 2023, quality: "4K", thumb_url: "https://image.tmdb.org/t/p/w300/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg" },
        { slug: "sat-thu-john-wick-4", name: "John Wick 4", year: 2023, quality: "4K", thumb_url: "https://image.tmdb.org/t/p/w300/7I6VUdPj6tQECNHdviJkUHD2u89.jpg" },
        { slug: "deadpool-va-wolverine", name: "Deadpool & Wolverine", year: 2024, quality: "4K", thumb_url: "https://image.tmdb.org/t/p/w300/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg" },
        { slug: "di-den-noi-co-gio", name: "Đi Đến Nơi Có Gió", year: 2023, quality: "FHD", thumb_url: "https://image.tmdb.org/t/p/w300/1QUrjFNKgVchKktX4N6DaegfPbP.jpg" },
      ];

  return (
    <main
      className={cn(
        cardFont.className,
        "relative min-h-[100dvh] bg-[#141414] text-white px-4 sm:px-6 pb-28 pt-20 md:pr-8 lg:pl-24",
      )}
    >
      <div className="relative mx-auto w-full max-w-[1720px]">
        {/* ── HEADER (CENTERED) ── */}
        <header className="relative mb-8 text-center">
          <div className="sm:absolute left-0 top-0 mb-4 sm:mb-0 text-left">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 transition-colors hover:text-white cursor-pointer px-3 py-1.5 rounded-xl bg-[#1e2029] border border-white/[0.08] hover:bg-[#252834]"
            >
              <ArrowLeft size={14} /> Quay lại
            </button>
          </div>

          <div className="pt-1 sm:pt-0">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              Thế Giới Phim
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto">
              Khám phá các vũ trụ điện ảnh và chủ đề phim hấp dẫn theo phong cách riêng của bạn.
            </p>
          </div>
        </header>

        {/* ── DẢI BĂNG CÁC PHIM ĐỀ XUẤT LIÊN QUAN CHẠY TỪ PHẢI QUA TRÁI (CHẬM & MƯỢT MÀ) ── */}
        <section aria-label="Dải băng phim đề xuất" className="mb-10 overflow-hidden">
          <div className="relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#181a20] py-3">
            {/* Smooth Edge Fades */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#181a20] to-transparent z-10" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#181a20] to-transparent z-10" />

            {/* Continuous Marquee Track (Slow Right to Left) */}
            <div className="animate-marquee-rtl gap-3 px-3">
              {[...recommendedFilms, ...recommendedFilms].map((film: any, idx) => {
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
                    className="group flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-[#20232c] border border-white/[0.06] hover:bg-[#272b36] hover:border-white/20 transition-all flex-shrink-0 cursor-pointer"
                  >
                    <div className="relative h-10 w-7 rounded-md overflow-hidden bg-neutral-800 flex-shrink-0">
                      <Image
                        src={poster}
                        alt={film.name || film.origin_name || "Phim"}
                        fill
                        sizes="32px"
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                        unoptimized
                      />
                    </div>
                    <div className="max-w-[155px] text-left">
                      <p className="text-xs font-semibold text-neutral-200 truncate group-hover:text-white transition-colors">
                        {film.name}
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                        {film.year || film.origin_name || "Tuyển chọn"} • <span className="text-amber-400 font-medium">{film.quality || "HD"}</span>
                      </p>
                    </div>
                  </Link>
                );
              })}
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
              className="group relative flex flex-col justify-end min-h-[175px] sm:min-h-[195px] overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#16171e] p-5 transition-all duration-500 hover:-translate-y-1.5 hover:border-white/25 hover:shadow-[0_20px_45px_rgba(0,0,0,0.85)] cursor-pointer select-none"
            >
              {/* Full-bleed HD Backdrop Artwork */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <Image
                  src={topic.image}
                  alt={topic.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover object-center brightness-[0.72] contrast-[1.08] transition-all duration-700 group-hover:scale-110 group-hover:brightness-95"
                  unoptimized
                />
                {/* Clean Bottom Gradient Scrim for crisp text contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e0f14] via-[#0e0f14]/70 to-black/25 group-hover:via-[#0e0f14]/50 transition-colors duration-500" />
                
                {/* Subtle colored accent glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at bottom left, ${topic.accent}30 0%, transparent 70%)`,
                  }}
                />
              </div>

              {/* Action Arrow Icon on Top Right */}
              <div className="relative z-10 self-end mb-auto">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 border border-white/10 text-neutral-300 transition-all duration-300 group-hover:bg-white group-hover:text-black group-hover:scale-110">
                  <ArrowUpRight size={14} strokeWidth={2.5} />
                </div>
              </div>

              {/* Bottom Content: Tag + Title + Description */}
              <div className="relative z-10 mt-auto pt-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md text-white shadow-sm"
                    style={{
                      backgroundColor: topic.accent,
                    }}
                  >
                    {topic.badge}
                  </span>
                </div>
                <h2 className="text-lg sm:text-[19px] font-extrabold text-white tracking-tight leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] group-hover:text-white transition-colors">
                  {topic.title}
                </h2>
                <p className="mt-1 text-[11px] leading-relaxed text-neutral-300 line-clamp-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  {topic.description}
                </p>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
