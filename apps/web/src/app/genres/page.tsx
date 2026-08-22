"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

interface TopicItem {
  slug: string;
  title: string;
  description?: string;
  href: string;
  tag?: string;
  image: string;
}

const TOPICS: TopicItem[] = [
  {
    slug: "phim-han-quoc",
    title: "Phim Hàn Quốc",
    description: "K-Drama & K-Movie đỉnh cao xứ kim chi",
    href: "/country/han-quoc",
    image: "https://image.tmdb.org/t/p/w780/vbkpl0ps4s5tMTUnC7SFXNzWmVr.jpg", // Lovely Runner
  },
  {
    slug: "phim-trung-quoc",
    title: "Phim Trung Quốc",
    description: "Cổ trang tiên hiệp, kiếm hiệp & ngôn tình",
    href: "/country/trung-quoc",
    image: "https://image.tmdb.org/t/p/w780/aJxMvBSaUdbIkY8nqFkuEarrgcx.jpg", // Thương Lan Quyết
  },
  {
    slug: "dien-anh-au-my",
    title: "Điện ảnh Âu Mỹ",
    description: "Bom tấn Hollywood 4K đỉnh cao",
    href: "/country/au-my",
    image: "https://image.tmdb.org/t/p/w780/xJHokMbljvjADYdit5fK5VQsXEG.jpg", // Interstellar
  },
  {
    slug: "anime-nhat-ban",
    title: "Anime Nhật Bản",
    description: "Thế giới hoạt hình xứ Phù Tang",
    href: "/films/anime",
    image: "https://image.tmdb.org/t/p/w780/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg", // Your Name
  },
  {
    slug: "co-trang-huyen-ao",
    title: "Cổ trang huyền ảo",
    description: "Tiên hiệp kỳ ảo & huyền huyễn",
    href: "/country/trung-quoc",
    image: "https://image.tmdb.org/t/p/w780/ampkwvfwO7o5YMwYAVPKx1PLDaB.jpg", // Trần Tình Lệnh
  },
  {
    slug: "thanh-xuan-vuon-truong",
    title: "Thanh xuân",
    description: "Tuổi trẻ, tình bạn & hoài niệm",
    href: "/genre/tinh-cam",
    image: "https://image.tmdb.org/t/p/w780/wNSLw756U5JQSpG6POYxHKL2KDH.jpg", // Tinh Hán Xán Lạn
  },
  {
    slug: "tinh-yeu-lang-man",
    title: "Tình Yêu & Lãng Mạn",
    description: "Ngọt ngào, rung động trái tim",
    href: "/genre/tinh-cam",
    image: "https://image.tmdb.org/t/p/w780/3yEHM2HT2vrUtO93YzTJNgEfiZG.jpg", // Crash Landing on You
  },
  {
    slug: "chua-lanh-tam-hon",
    title: "Phim \"chữa lành tâm hồn\"",
    description: "Nhẹ nhàng, ấm áp & bình yên",
    href: "/genre/gia-dinh",
    image: "https://image.tmdb.org/t/p/w780/1QUrjFNKgVchKktX4N6DaegfPbP.jpg", // Đi Đến Nơi Có Gió
  },
  {
    slug: "chuyen-the-van-hoc",
    title: "Phim chuyển thể từ tác phẩm văn học",
    description: "Tiểu thuyết kinh điển & ngôn tình",
    href: "/country/trung-quoc",
    image: "https://image.tmdb.org/t/p/w780/ampkwvfwO7o5YMwYAVPKx1PLDaB.jpg", // Trần Tình Lệnh
  },
  {
    slug: "phim-4k",
    title: "Phim 4K & Chiếu Rạp",
    description: "Chất lượng hình ảnh siêu nét",
    href: "/search?q=chieu%20rap",
    image: "https://image.tmdb.org/t/p/w780/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg", // Avengers / Blockbuster
  },
  {
    slug: "phim-cong-so",
    title: "Phim Công Sở",
    description: "Tình cảm & sự nghiệp đô thị",
    href: "/genre/tam-ly",
    image: "https://image.tmdb.org/t/p/w780/hMJZCkmdaC2ZMzjP76a9TPNQFsS.jpg", // Hẹn Hò Chốn Công Sở
  },
  {
    slug: "hinh-su-toi-pham",
    title: "Hình sự tội phạm Hàn Quốc",
    description: "Phá án gay cấn, truy lùng kịch tính",
    href: "/genre/bi-an",
    image: "https://image.tmdb.org/t/p/w780/smSbK5cd8T9XHcxEUcems23BDEF.jpg", // Goblin / Criminal K-Drama
  },
  {
    slug: "co-trang-huyen-huyen",
    title: "Phim Cổ Trang Huyền Huyễn Không Thể Bỏ Lỡ",
    description: "Thế giới thần tiên & kiếm hiệp",
    href: "/country/trung-quoc",
    image: "https://image.tmdb.org/t/p/w780/ttB7H1rF4W3iZ6pMyP6v5u9BMBm.jpg", // Em Là Niềm Kiêu Hãnh Của Anh
  },
  {
    slug: "dien-anh-au-my",
    title: "Điện ảnh Âu Mỹ",
    description: "Bom tấn Hollywood đỉnh cao",
    href: "/country/au-my",
    image: "https://image.tmdb.org/t/p/w780/xJHokMbljvjADYdit5fK5VQsXEG.jpg", // Interstellar / Iron Man
  },
  {
    slug: "anime-nhat-ban",
    title: "Anime Nhật Bản",
    description: "Thế giới hoạt hình xứ Phù Tang",
    href: "/films/anime",
    image: "https://image.tmdb.org/t/p/w780/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg", // Your Name
  },
  {
    slug: "hanh-dong-nghet-tho",
    title: "Hành Động Nghẹt Thở",
    description: "Truy đuổi, đối đầu & tốc độ cao",
    href: "/genre/hanh-dong",
    image: "https://image.tmdb.org/t/p/w780/fm6K9v6I7vdFGwfndakGtQ99Rov.jpg", // Oppenheimer / Action
  },
  {
    slug: "the-gioi-vien-tuong",
    title: "Thế Giới Viễn Tưởng",
    description: "Không gian, vũ trụ & tương lai",
    href: "/genre/vien-tuong",
    image: "https://image.tmdb.org/t/p/w780/8sNiqpwhvO4cdiXq7Srrqgz5pRx.jpg", // Sci-Fi
  },
  {
    slug: "kinh-di-dem-khuya",
    title: "Kinh Dị Đêm Khuya",
    description: "Ám ảnh, ma quái & thót tim",
    href: "/genre/kinh-di",
    image: "https://image.tmdb.org/t/p/w780/166r6yttqz8h8NQwNZT0I7y8fio.jpg", // Horror
  },
  {
    slug: "hai-huoc-xa-stress",
    title: "Hài Hước Xả Stress",
    description: "Tiếng cười sảng khoái & duyên dáng",
    href: "/genre/hai-huoc",
    image: "https://image.tmdb.org/t/p/w780/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg", // Comedy
  },
];

export default function GenresTopicsPage() {
  const router = useRouter();

  return (
    <main
      className={cn(
        cardFont.className,
        "relative min-h-[100dvh] bg-[#141414] text-white px-4 sm:px-6 pb-28 pt-20 md:pr-8 lg:pl-24",
      )}
    >
      <div className="relative mx-auto w-full max-w-[1720px]">
        {/* ── HEADER (CENTERED) ── */}
        <header className="relative mb-10 text-center">
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
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Thế Giới Phim
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto">
              Khám phá các vũ trụ điện ảnh và chủ đề phim hấp dẫn theo phong cách riêng của bạn.
            </p>
          </div>
        </header>

        {/* ── CLEAN TOPIC CARDS GRID (AS IN REFERENCE) ── */}
        <section
          aria-label="Danh sách chủ đề phim"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {TOPICS.map((topic) => (
            <Link
              key={topic.slug}
              href={topic.href}
              className="group relative flex min-h-[135px] sm:min-h-[145px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#181a20] hover:bg-[#1e2029] p-5 transition-all duration-300 hover:border-white/20 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.6)] cursor-pointer select-none"
            >
              {/* Left Side: Title & Subtitle */}
              <div className="relative z-10 flex flex-col justify-center max-w-[62%] sm:max-w-[58%] my-auto">
                <div>
                  <h2 className="text-base sm:text-[17px] font-bold text-white leading-snug group-hover:text-white transition-colors">
                    {topic.title}
                  </h2>
                  {topic.description && (
                    <p className="mt-1.5 text-[11px] text-neutral-400 line-clamp-1">
                      {topic.description}
                    </p>
                  )}
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
                  <div className="absolute inset-0 bg-gradient-to-r from-[#181a20] via-[#181a20]/75 to-transparent group-hover:from-[#1e2029] group-hover:via-[#1e2029]/75 transition-colors duration-300" />
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
