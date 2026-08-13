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
];

function buildTopicArtwork(
  topicResults: (TmdbMovie[] | undefined)[],
): (string | null)[] {
  const usedMovieIds = new Set<number>();

  return topicResults.map((items, topicIndex) => {
    const candidates = (items || []).filter((item) =>
      Boolean(item.poster_path),
    );
    if (!candidates.length) return null;

    const rotated = candidates
      .slice(topicIndex % candidates.length)
      .concat(candidates.slice(0, topicIndex % candidates.length));
    const movie =
      rotated.find((candidate) => !usedMovieIds.has(candidate.id)) ||
      rotated[0];

    usedMovieIds.add(movie.id);
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
      enabled: index < 4 || loadRemainingTopics,
    })),
  });
  const topicArtwork = buildTopicArtwork(
    topicQueries.map((query) => query.data),
  );

  return (
    <main
      className={`${cardFont.className} relative min-h-[100dvh] overflow-hidden bg-background px-4 pb-28 pt-24 text-white md:pr-8 lg:pl-24`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_28%_0%,rgba(62,124,155,0.15),transparent_60%)]"
      />

      <div className="relative mx-auto w-full max-w-[1720px]">
        <header className="mb-9 sm:mb-11">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-neutral-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
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

        <section aria-labelledby="movie-topics-title">
          <h2 id="movie-topics-title" className="sr-only">
            Danh sách chủ đề phim
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
            {TOPICS.map((topic, index) => {
              const image = topicArtwork[index];

              return (
                <Link
                  key={topic.slug}
                  href={topic.href}
                  aria-label={`Xem chủ đề ${topic.title}`}
                  className="group relative isolate min-h-[205px] overflow-hidden rounded-2xl border border-white/[0.09] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_22px_55px_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  style={{ backgroundColor: topic.tone }}
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 right-0 w-[68%] overflow-hidden"
                    style={{
                      WebkitMaskImage:
                        "linear-gradient(to left, black 58%, transparent 100%)",
                      maskImage:
                        "linear-gradient(to left, black 58%, transparent 100%)",
                    }}
                  >
                    {image ? (
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="(min-width: 1280px) 22vw, (min-width: 640px) 46vw, 68vw"
                        priority={index < 4}
                        className="object-cover object-top opacity-90 transition-transform duration-500 ease-out group-hover:scale-[1.035]"
                      />
                    ) : (
                      <div className="absolute inset-0 animate-pulse bg-white/[0.035] motion-reduce:animate-none" />
                    )}
                  </div>

                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"
                  />

                  <div className="relative z-10 flex min-h-[205px] max-w-[72%] flex-col justify-end p-5 sm:p-6">
                    <span
                      className="mb-3 h-1 w-8 rounded-full"
                      style={{ backgroundColor: topic.accent }}
                    />
                    <h3 className="text-lg font-extrabold leading-[1.2] tracking-[-0.025em] text-white sm:text-xl">
                      {topic.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-[12px] leading-[1.55] text-neutral-300/80">
                      {topic.description}
                    </p>
                    <ArrowUpRight
                      size={18}
                      className="absolute bottom-5 right-5 translate-y-1 text-white/50 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:text-white group-hover:opacity-100"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
