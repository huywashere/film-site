"use client";

import Link from "next/link";
import { useTranslation } from "@/store/langStore";
import { wsrvPublicImageUrl } from "@/lib/image-cdn";

export default function TopicBanners() {
  const { t, lang } = useTranslation();

  const topics = [
    {
      title: "DC Universe",
      href: "/search?q=dc",
      image: "https://image.tmdb.org/t/p/w1280/dqK9Hag1054tghRQSqLSfrkvQnA.jpg",
      description:
        lang === "en"
          ? "Explore legendary superheroes from the DC Comics universe."
          : "Khám phá thế giới siêu anh hùng DC nổi tiếng.",
    },
    {
      title: "Marvel Cinematic",
      href: "/search?q=marvel",
      image: "https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
      description:
        lang === "en"
          ? "The complete Marvel Cinematic Universe blockbusters."
          : "Khám phá vũ trụ điện ảnh Marvel đỉnh cao.",
    },
    {
      title: "One Piece",
      href: "/films/anime",
      image: "https://image.tmdb.org/t/p/w1280/qD211Hb5XwFxrszzBBe5EUYJerh.jpg",
      description:
        lang === "en"
          ? "Join Luffy on his epic pirate journey across the seas."
          : "Khám phá One Piece và những hành trình hải tặc kỳ ảo.",
    },
    {
      title: lang === "en" ? "Trending Hot" : "Phim đang hot",
      href: "/search?q=hot",
      image: "https://image.tmdb.org/t/p/w1280/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg",
      description:
        lang === "en"
          ? "Top trending titles buzzing across cinema right now."
          : "Xem những bộ phim đang gây sốt ngay lúc này.",
    },
    {
      title: t("genres_list.co-trang", "Cổ Trang"),
      href: "/genre/co-trang",
      image: "https://image.tmdb.org/t/p/w1280/5fhS6Bh4VnF0SOZyZnhNpc0XHDb.jpg",
      description:
        lang === "en"
          ? "Breathtaking period costume dramas and mythical legends."
          : "Khám phá những siêu phẩm cổ trang Trung Quốc đầy kịch tính.",
    },
    {
      title: lang === "en" ? "Weekend Binge" : "Cày Phim Cuối Tuần",
      href: "/search?q=weekend",
      image: "https://image.tmdb.org/t/p/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg",
      description:
        lang === "en"
          ? "Plan your movie marathon with handpicked blockbusters."
          : "Lên lịch xem phim cuối tuần với những suất chiếu đáng chú ý.",
    },
  ];

  return (
    <div className="mb-10">
      <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-4 px-1">
        {t("home.exploreTopics", "Bạn đang quan tâm gì?")}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 px-1">
        {topics.map((topic, i) => (
          <Link
            key={i}
            href={topic.href}
            className="relative overflow-hidden rounded-[24px] sm:rounded-[28px] p-3.5 sm:p-4 flex flex-col justify-between shadow-2xl transition-all duration-300 hover:-translate-y-1 group cursor-pointer min-h-[160px] sm:min-h-[220px] md:min-h-[260px] bg-slate-900"
            style={{
              backgroundImage: `url('${wsrvPublicImageUrl(topic.image, "backdrop", { width: 640, height: null, quality: 75 }) || topic.image}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {topic.image && (
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent group-hover:from-slate-950/80 transition-colors duration-300" />
            )}
            <div className="relative z-10">
              <h4 className="text-base md:text-xl font-extrabold text-white leading-tight drop-shadow-2xl">
                {topic.title}
              </h4>
            </div>
            <div className="relative z-10 flex flex-col gap-2 text-[10px] uppercase tracking-widest md:text-[11px]">
              <span className="inline-flex items-center gap-2 font-semibold text-white/90">
                <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                {lang === "en" ? "Explore Topic" : "Xem chủ đề"}
              </span>
              <span className="text-xs text-white/70 max-w-[80%] leading-snug">
                {topic.description}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
