"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { cardFont } from "@/lib/fonts";
import {
  tmdbApi,
  tmdbPoster,
  tmdbBackdrop,
  type TmdbDiscoverOptions,
  type TmdbMovie,
} from "@/lib/tmdb";

type MovieTopic = {
  slug: string;
  title: string;
  description: string;
  href: string;
  tone: string;
  accent: string;
  staticImage?: string;
  discover: TmdbDiscoverOptions;
};

const TOPICS: MovieTopic[] = [
  {
    slug: "hanh-dong",
    title: "Hành Động Nghẹt Thở",
    description: "Đối đầu, truy đuổi và những trận chiến tốc độ cao.",
    href: "/genre/hanh-dong",
    tone: "#251a19",
    accent: "#fb7185",
    discover: { with_genres: "28", sort_by: "popularity.desc" },
  },
  {
    slug: "vien-tuong",
    title: "Thế Giới Viễn Tưởng",
    description:
      "Không gian, tương lai và những công nghệ ngoài sức tưởng tượng.",
    href: "/genre/vien-tuong",
    tone: "#172231",
    accent: "#60a5fa",
    discover: { with_genres: "878", sort_by: "popularity.desc" },
  },
  {
    slug: "kinh-di",
    title: "Kinh Dị Đêm Khuya",
    description: "Bầu không khí ám ảnh và những bí mật đáng sợ.",
    href: "/genre/kinh-di",
    tone: "#25171c",
    accent: "#c084fc",
    discover: { with_genres: "27", sort_by: "popularity.desc" },
  },
  {
    slug: "tinh-cam",
    title: "Tình Yêu Và Cảm Xúc",
    description: "Những mối quan hệ chạm đến trái tim người xem.",
    href: "/genre/tinh-cam",
    tone: "#2b1d27",
    accent: "#f9a8d4",
    discover: { with_genres: "10749", sort_by: "popularity.desc" },
  },
  {
    slug: "hai-huoc",
    title: "Cười Thả Ga",
    description: "Nhẹ nhàng, duyên dáng và đầy khoảnh khắc bất ngờ.",
    href: "/genre/hai-huoc",
    tone: "#292517",
    accent: "#facc15",
    discover: { with_genres: "35", sort_by: "popularity.desc" },
  },
  {
    slug: "phieu-luu",
    title: "Phiêu Lưu Kỳ Thú",
    description: "Những chuyến đi xa, vùng đất lạ và thử thách lớn.",
    href: "/genre/phieu-luu",
    tone: "#17302c",
    accent: "#5eead4",
    discover: { with_genres: "12", sort_by: "popularity.desc" },
  },
  {
    slug: "gia-dinh",
    title: "Gia Đình Cuối Tuần",
    description: "Ấm áp, vui vẻ và phù hợp để xem cùng nhau.",
    href: "/genre/gia-dinh",
    tone: "#203025",
    accent: "#86efac",
    discover: { with_genres: "10751", sort_by: "popularity.desc" },
  },
  {
    slug: "bi-an",
    title: "Bí Ẩn Chưa Lời Giải",
    description: "Manh mối, cú lật và những câu hỏi chưa có đáp án.",
    href: "/genre/bi-an",
    tone: "#22202e",
    accent: "#a5b4fc",
    discover: { with_genres: "9648", sort_by: "popularity.desc" },
  },
  {
    slug: "anime-nhat-ban",
    title: "Anime Nhật Bản",
    description: "Hoạt hình Nhật với thế giới và phong cách kể chuyện riêng.",
    href: "/films/anime",
    tone: "#2b1d32",
    accent: "#d8b4fe",
    discover: {
      with_genres: "16",
      with_original_language: "ja",
      sort_by: "popularity.desc",
    },
  },
  {
    slug: "lich-su",
    title: "Sử Thi Và Lịch Sử",
    description: "Những thời đại lớn, chiến trường và nhân vật có thật.",
    href: "/genre/lich-su",
    tone: "#30271d",
    accent: "#fbbf24",
    discover: { with_genres: "36", sort_by: "popularity.desc" },
  },
  {
    slug: "tai-lieu",
    title: "Tài Liệu Đời Thật",
    description: "Câu chuyện thật về con người, thiên nhiên và xã hội.",
    href: "/genre/tai-lieu",
    tone: "#1e2c2a",
    accent: "#67e8f9",
    discover: { with_genres: "99", sort_by: "popularity.desc" },
  },
  {
    slug: "am-nhac",
    title: "Âm Nhạc Và Sân Khấu",
    description: "Giai điệu, nghệ sĩ và những màn trình diễn đáng nhớ.",
    href: "/genre/am-nhac",
    tone: "#2c1f2a",
    accent: "#f0abfc",
    discover: { with_genres: "10402", sort_by: "popularity.desc" },
  },
  {
    slug: "phim-han-quoc",
    title: "Điện Ảnh Hàn Quốc",
    description: "K-Drama lãng mạn, kịch tính và các siêu phẩm truyền hình xứ kim chi.",
    href: "/country/han-quoc",
    tone: "#2d1b28",
    accent: "#f472b6",
    staticImage: "/korean-cinema-banner.jpg",
    discover: { with_origin_country: "KR", sort_by: "popularity.desc" },
  },
  {
    slug: "phim-trung-quoc",
    title: "Điện Ảnh Trung Quốc",
    description: "Cổ trang tiên hiệp, ngôn tình lãng mạn và bom tấn kiếm hiệp đỉnh cao.",
    href: "/country/trung-quoc",
    tone: "#2f1b18",
    accent: "#fb923c",
    staticImage: "/chinese-cinema-banner.jpg",
    discover: { with_origin_country: "CN", sort_by: "popularity.desc" },
  },
];

function buildTopicArtwork(
  topicResults: (TmdbMovie[] | undefined)[],
): (string | null)[] {
  const usedMovieIds = new Set<number>();

  return topicResults.map((items, topicIndex) => {
    const topic = TOPICS[topicIndex] as typeof TOPICS[number] & { staticImage?: string };
    if (topic?.staticImage) {
      return topic.staticImage;
    }
    const candidates = (items || []).filter((item) =>
      Boolean(item.backdrop_path || item.poster_path),
    );
    if (!candidates.length) return null;

    const rotated = candidates
      .slice(topicIndex % candidates.length)
      .concat(candidates.slice(0, topicIndex % candidates.length));
    const movie =
      rotated.find((candidate) => !usedMovieIds.has(candidate.id)) ||
      rotated[0];

    usedMovieIds.add(movie.id);
    // Prefer wide 16:9 backdrop for landscape genre cards
    if (movie.backdrop_path) {
      return tmdbBackdrop(movie.backdrop_path, "w780");
    }
    return tmdbPoster(movie.poster_path, "w500");
  });
}

export default function GenresTopicsPage() {
  const router = useRouter();
  const [loadRemainingTopics, setLoadRemainingTopics] = useState(false);

  useEffect(() => {
    const start = () => setLoadRemainingTopics(true);
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(start, { timeout: 1200 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timer = globalThis.setTimeout(start, 350);
    return () => globalThis.clearTimeout(timer);
  }, []);

  const topicQueries = useQueries({
    queries: TOPICS.map((topic, index) => ({
      queryKey: ["movie-world-topic", topic.slug, topic.discover],
      queryFn: async () => {
        const response = await tmdbApi.discoverMovies(topic.discover);
        return response?.results || [];
      },
      staleTime: 60 * 60 * 1000,
      gcTime: 6 * 60 * 60 * 1000,
      enabled: index < 6 || loadRemainingTopics,
    })),
  });
  const topicArtwork = buildTopicArtwork(
    topicQueries.map((query) => query.data),
  );

  return (
    <main
      className={`${cardFont.className} relative min-h-[100dvh] overflow-hidden bg-background px-4 pb-28 pt-24 text-white md:pr-8 lg:pl-24`}
    >
      <div className="relative mx-auto w-full max-w-[1720px]">
        <header className="mb-9 sm:mb-11">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-neutral-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
          <h1 className="text-3xl font-extrabold tracking-[-0.045em] text-white sm:text-4xl">
            Thế Giới Phim
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-400">
            Chọn đúng không khí bạn muốn xem. Mỗi chủ đề mở ra một danh sách
            phim tương ứng.
          </p>
        </header>

        <section
          aria-label="Danh sách chủ đề phim"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
        >
          {TOPICS.map((topic, index) => {
            const artworkUrl = topicArtwork[index];
            const isLoaded = Boolean(artworkUrl);

            return (
              <Link
                key={topic.slug}
                href={topic.href}
                className="group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[24px] border border-white/[0.1] bg-[#12141a] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_16px_40px_rgba(0,0,0,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                {/* Background Artwork (Vivid & Clearly Visible) */}
                {artworkUrl && (
                  <div
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                    aria-hidden="true"
                  >
                    <Image
                      src={artworkUrl}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover object-center opacity-65 brightness-[0.9] transition-all duration-500 group-hover:scale-105 group-hover:opacity-85 group-hover:brightness-105"
                      priority={index < 6}
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e14] via-[#0c0e14]/65 to-black/20 group-hover:from-[#0c0e14]/90 group-hover:via-[#0c0e14]/40 group-hover:to-transparent transition-colors duration-300" />
                  </div>
                )}

                {/* Shimmer Placeholder if not loaded */}
                {!isLoaded && (
                  <div
                    className="pointer-events-none absolute inset-0 animate-pulse bg-white/[0.04]"
                    aria-hidden="true"
                  />
                )}

                {/* Top Accent Pill + Arrow */}
                <div className="relative z-10 flex items-center justify-between">
                  <span
                    className="inline-block h-1.5 w-8 rounded-full transition-all duration-300 group-hover:w-12 shadow-sm"
                    style={{ backgroundColor: topic.accent }}
                  />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90 transition-all duration-300 group-hover:bg-white group-hover:text-black group-hover:shadow-[0_0_12px_rgba(255,255,255,0.4)]">
                    <ArrowUpRight size={15} />
                  </div>
                </div>

                {/* Title & Description */}
                <div className="relative z-10 mt-auto pt-8">
                  <h2 className="text-xl font-black tracking-[-0.03em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] transition-colors duration-200">
                    {topic.title}
                  </h2>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-neutral-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    {topic.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
