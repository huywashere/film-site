"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, TrendingUp } from "lucide-react";
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
  borderClass: string;
  bgGradient: string;
  image: string;
}

// 16 Chủ đề đặc sắc hoàn toàn ĐỘC BẢN - Mỗi phần 1 màu sắc riêng biệt & Hình ảnh TMDB chuẩn xác 100%
const TOPICS: TopicItem[] = [
  {
    slug: "phim-han-quoc",
    title: "Phim Hàn Quốc",
    description: "K-Drama & K-Movie đỉnh cao xứ kim chi",
    href: "/country/han-quoc",
    accent: "#f43f5e",
    badge: "K-Drama Hot",
    borderClass: "border-rose-500/25 hover:border-rose-500/60 hover:shadow-rose-950/40",
    bgGradient: "from-rose-950/40 via-[#16171e] to-[#121318]",
    image: "https://image.tmdb.org/t/p/w780/vbkpl0ps4s5tMTUnC7SFXNzWmVr.jpg", // Lovely Runner
  },
  {
    slug: "phim-trung-quoc",
    title: "Phim Trung Quốc",
    description: "Cổ trang tiên hiệp, kiếm hiệp & ngôn tình",
    href: "/country/trung-quoc",
    accent: "#f59e0b",
    badge: "Hoa Ngữ",
    borderClass: "border-amber-500/25 hover:border-amber-500/60 hover:shadow-amber-950/40",
    bgGradient: "from-amber-950/40 via-[#16171e] to-[#121318]",
    image: "https://image.tmdb.org/t/p/w780/aJxMvBSaUdbIkY8nqFkuEarrgcx.jpg", // Thương Lan Quyết
  },
  {
    slug: "dien-anh-au-my",
    title: "Điện Ảnh Âu Mỹ",
    description: "Bom tấn Hollywood 4K & siêu anh hùng",
    href: "/country/au-my",
    accent: "#0ea5e9",
    badge: "Hollywood",
    borderClass: "border-sky-500/25 hover:border-sky-500/60 hover:shadow-sky-950/40",
    bgGradient: "from-sky-950/40 via-[#16171e] to-[#121318]",
    image: "https://image.tmdb.org/t/p/w780/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg", // Avengers: Endgame
  },
  {
    slug: "anime-nhat-ban",
    title: "Anime Nhật Bản",
    description: "Thế giới hoạt hình & phép thuật xứ Phù Tang",
    href: "/films/anime",
    accent: "#a855f7",
    badge: "Anime 4K",
    borderClass: "border-purple-500/25 hover:border-purple-500/60 hover:shadow-purple-950/40",
    bgGradient: "from-purple-950/40 via-[#16171e] to-[#121318]",
    image: "https://image.tmdb.org/t/p/w780/8x9iKH8kWA0zdkgNdpAew7OstYe.jpg", // Your Name (Kimi no Na wa)
  },
  {
    slug: "co-trang-tien-hiep",
    title: "Cổ Trang Tiên Hiệp",
    description: "Kiếm hiệp kỳ ảo, tu tiên & thần thoại",
    href: "/country/trung-quoc",
    accent: "#10b981",
    badge: "Tiên Hiệp",
    borderClass: "border-emerald-500/25 hover:border-emerald-500/60 hover:shadow-emerald-950/40",
    bgGradient: "from-emerald-950/40 via-[#16171e] to-[#121318]",
    image: "https://image.tmdb.org/t/p/w780/ampkwvfwO7o5YMwYAVPKx1PLDaB.jpg", // Trần Tình Lệnh
  },
  {
    slug: "thanh-xuan-vuon-truong",
    title: "Thanh Xuân Vườn Trường",
    description: "Tuổi trẻ, tình bạn & hoài niệm thanh xuân",
    href: "/genre/tinh-cam",
    accent: "#14b8a6",
    badge: "Thanh Xuân",
    borderClass: "border-teal-500/25 hover:border-teal-500/60 hover:shadow-teal-950/40",
    bgGradient: "from-teal-950/40 via-[#16171e] to-[#121318]",
    image: "https://image.tmdb.org/t/p/w780/wNSLw756U5JQSpG6POYxHKL2KDH.jpg", // Tinh Hán Xán Lạn
  },
  {
    slug: "tinh-yeu-lang-man",
    title: "Tình Cảm & Lãng Mạn",
    description: "Ngọt ngào, say đắm & rung động trái tim",
    href: "/genre/tinh-cam",
    accent: "#ec4899",
    badge: "Lãng Mạn",
    borderClass: "border-pink-500/25 hover:border-pink-500/60 hover:shadow-pink-950/40",
    bgGradient: "from-pink-950/40 via-[#16171e] to-[#121318]",
    image: "https://image.tmdb.org/t/p/w780/3yEHM2HT2vrUtO93YzTJNgEfiZG.jpg", // Hạ Cánh Nơi Anh
  },
  {
    slug: "chua-lanh-tam-hon",
    title: "Phim \"Chữa Lành Tâm Hồn\"",
    description: "Nhẹ nhàng, ấm áp, bình yên & gia đình",
    href: "/genre/gia-dinh",
    accent: "#84cc16",
    badge: "Healing",
    borderClass: "border-lime-500/25 hover:border-lime-500/60 hover:shadow-lime-950/40",
    bgGradient: "from-lime-950/40 via-[#16171e] to-[#121318]",
    image: "https://image.tmdb.org/t/p/w780/1QUrjFNKgVchKktX4N6DaegfPbP.jpg", // Đi Đến Nơi Có Gió
  },
  {
    slug: "phim-cong-so",
    title: "Phim Công Sở & Đô Thị",
    description: "Tình cảm, sự nghiệp & cuộc sống thành thị",
    href: "/genre/tam-ly",
    accent: "#6366f1",
    badge: "Đô Thị",
    borderClass: "border-indigo-500/25 hover:border-indigo-500/60 hover:shadow-indigo-950/40",
    bgGradient: "from-indigo-950/40 via-[#16171e] to-[#121318]",
    image: "https://image.tmdb.org/t/p/w780/hMJZCkmdaC2ZMzjP76a9TPNQFsS.jpg", // Hẹn Hò Chốn Công Sở
  },
  {
    slug: "hinh-su-toi-pham",
    title: "Hình Sự & Trinh Thám",
    description: "Phá án gay cấn, truy lùng tội phạm kịch tính",
    href: "/genre/bi-an",
    accent: "#06b6d4",
    badge: "Trinh Thám",
    borderClass: "border-cyan-500/25 hover:border-cyan-500/60 hover:shadow-cyan-950/40",
    bgGradient: "from-cyan-950/40 via-[#16171e] to-[#121318]",
    image: "https://image.tmdb.org/t/p/w780/i1SyUHsi45psSH1xy9sM0in8FKJ.jpg", // Taxi Driver / Ẩn Danh
  },
  {
    slug: "phim-chieu-rap-4k",
    title: "Chiếu Rạp & Bom Tấn 4K",
    description: "Tuyển chọn phim rạp kỹ xảo âm thanh đỉnh cao",
    href: "/search?q=chieu%20rap",
    accent: "#eab308",
    badge: "4K Cinema",
    borderClass: "border-yellow-500/25 hover:border-yellow-500/60 hover:shadow-yellow-950/40",
    bgGradient: "from-yellow-950/40 via-[#16171e] to-[#121318]",
    image: "https://image.tmdb.org/t/p/w780/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg", // Oppenheimer
  },
  {
    slug: "hanh-dong-nghet-tho",
    title: "Hành Động Nghẹt Thở",
    description: "Đấu súng mãn nhãn, tốc độ cao & kịch tính",
    href: "/genre/hanh-dong",
    accent: "#ef4444",
    badge: "Hành Động",
    borderClass: "border-red-500/25 hover:border-red-500/60 hover:shadow-red-950/40",
    bgGradient: "from-red-950/40 via-[#16171e] to-[#121318]",
    image: "https://image.tmdb.org/t/p/w780/7I6VUdPj6tQECNHdviJkUHD2u89.jpg", // John Wick 4
  },
  {
    slug: "khoa-hoc-vien-tuong",
    title: "Thế Giới Viễn Tưởng",
    description: "Du hành vũ trụ, tương lai & đa vũ trụ",
    href: "/genre/vien-tuong",
    accent: "#3b82f6",
    badge: "Sci-Fi",
    borderClass: "border-blue-500/25 hover:border-blue-500/60 hover:shadow-blue-950/40",
    bgGradient: "from-blue-950/40 via-[#16171e] to-[#121318]",
    image: "https://image.tmdb.org/t/p/w780/vgnoBSVzWAV9sNQUORaDGvDp7wx.jpg", // Interstellar
  },
  {
    slug: "kinh-di-dem-khuya",
    title: "Kinh Dị Đêm Khuya",
    description: "Ám ảnh tâm linh, ma quái & thót tim hồi hộp",
    href: "/genre/kinh-di",
    accent: "#dc2626",
    badge: "Kinh Dị",
    borderClass: "border-rose-700/30 hover:border-rose-700/70 hover:shadow-rose-950/50",
    bgGradient: "from-rose-950/50 via-[#16171e] to-[#121318]",
    image: "https://image.tmdb.org/t/p/w780/ecKQlAEG95k62SMGhvX83oEqANK.jpg", // The Conjuring
  },
  {
    slug: "hai-huoc-xa-stress",
    title: "Hài Hước Xả Stress",
    description: "Tiếng cười sảng khoái, duyên dáng & dí dỏm",
    href: "/genre/hai-huoc",
    accent: "#f97316",
    badge: "Hài Hước",
    borderClass: "border-orange-500/25 hover:border-orange-500/60 hover:shadow-orange-950/40",
    bgGradient: "from-orange-950/40 via-[#16171e] to-[#121318]",
    image: "https://image.tmdb.org/t/p/w780/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg", // Deadpool & Wolverine
  },
  {
    slug: "tam-ly-chinh-kich",
    title: "Tâm Lý & Chính Kịch",
    description: "Xung đột nội tâm sâu sắc & số phận nhân vật",
    href: "/genre/tam-ly",
    accent: "#d946ef",
    badge: "Chính Kịch",
    borderClass: "border-fuchsia-500/25 hover:border-fuchsia-500/60 hover:shadow-fuchsia-950/40",
    bgGradient: "from-fuchsia-950/40 via-[#16171e] to-[#121318]",
    image: "https://image.tmdb.org/t/p/w780/5qVLF9WTdBDA08fsZ9H5clJ6umI.jpg", // Parasite
  },
];

export default function GenresTopicsPage() {
  const router = useRouter();

  // Fetch real trending/recommended movies for the running marquee ribbon
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
              className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 transition-colors hover:text-white cursor-pointer px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08]"
            >
              <ArrowLeft size={14} /> Quay lại
            </button>
          </div>

          <div className="pt-1 sm:pt-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold text-neutral-300 bg-white/[0.05] border border-white/[0.08] mb-2.5">
              <Sparkles size={13} className="text-rose-400" />
              Khám Phá Thế Giới Điện Ảnh
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Thế Giới Phim
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto">
              Khám phá các vũ trụ điện ảnh và chủ đề phim hấp dẫn theo phong cách riêng của bạn.
            </p>
          </div>
        </header>

        {/* ── DẢI BĂNG CÁC PHIM ĐỀ XUẤT LIÊN QUAN CHẠY TỪ PHẢI QUA TRÁI ── */}
        <section aria-label="Dải băng phim đề xuất" className="mb-10 overflow-hidden">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <TrendingUp size={13} className="text-rose-400" />
                Phim Đề Xuất Nổi Bật
              </span>
            </div>
            <span className="text-[10px] text-neutral-500 hidden sm:inline">
              Rê chuột để tạm dừng • Cập nhật liên tục
            </span>
          </div>

          <div className="relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#171821]/80 py-3 backdrop-blur-md">
            {/* Smooth Edge Fades */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#171821] to-transparent z-10" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#171821] to-transparent z-10" />

            {/* Continuous Marquee Track (Right to Left) */}
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
                    className="group flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.09] hover:border-white/20 transition-all flex-shrink-0 cursor-pointer"
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

        {/* ── CLEAN TOPIC CARDS GRID (MỖI PHẦN 1 MÀU SẮC RIÊNG BIỆT) ── */}
        <section
          aria-label="Danh sách chủ đề phim"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {TOPICS.map((topic) => (
            <Link
              key={topic.slug}
              href={topic.href}
              className={cn(
                "group relative flex min-h-[140px] sm:min-h-[150px] overflow-hidden rounded-2xl border bg-gradient-to-r p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer select-none",
                topic.borderClass,
                topic.bgGradient,
              )}
            >
              {/* Left Side: Category Title & Description with Topic Accent */}
              <div className="relative z-10 flex flex-col justify-center max-w-[62%] sm:max-w-[58%] my-auto">
                <div>
                  <span
                    className="inline-block text-[10px] font-extrabold uppercase tracking-wider mb-1.5"
                    style={{ color: topic.accent }}
                  >
                    {topic.badge}
                  </span>
                  <h2 className="text-base sm:text-[17px] font-bold text-white leading-snug group-hover:text-white transition-colors">
                    {topic.title}
                  </h2>
                  <p className="mt-1 text-[11px] text-neutral-400 line-clamp-1">
                    {topic.description}
                  </p>
                </div>
              </div>

              {/* Right Side: Seamless Character / Cinema Artwork Blend */}
              <div className="absolute right-0 top-0 bottom-0 w-[52%] overflow-hidden pointer-events-none">
                <div className="relative h-full w-full">
                  <Image
                    src={topic.image}
                    alt={topic.title}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-108 brightness-95"
                    unoptimized
                  />
                  {/* Left-to-Right Dark Gradient Mask */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#14151b] via-[#14151b]/70 to-transparent transition-colors duration-300" />
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
