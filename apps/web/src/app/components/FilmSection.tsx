"use client";

import Link from "next/link";
import {
  ChevronRight,
  Clock,
  Tv,
  Clapperboard,
  TrendingUp,
} from "lucide-react";
import {
  FilmCard,
  FilmCardSkeleton,
  FilmItem,
} from "@/components/film/FilmCard";
import { useTranslation } from "@/store/langStore";
import dynamic from "next/dynamic";

// Lazy load Swiper
const Swiper = dynamic(() => import("swiper/react").then((mod) => mod.Swiper), {
  ssr: false,
});
const SwiperSlide = dynamic(
  () => import("swiper/react").then((mod) => mod.SwiperSlide),
  {
    ssr: false,
  },
);

const icons = {
  Clock,
  Tv,
  Clapperboard,
  TrendingUp,
};

interface FilmSectionProps {
  title: string;
  icon: keyof typeof icons;
  films: FilmItem[];
  isLoading: boolean;
  href: string;
}

export default function FilmSection({
  title,
  icon,
  films,
  isLoading,
  href,
}: FilmSectionProps) {
  const { t } = useTranslation();
  const Icon = icons[icon];

  return (
    <section className="relative mb-10 md:mb-14">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center space-x-2">
          <Icon size={18} className="text-netflixRed" />
          <span>{title}</span>
        </h2>
        <Link
          href={href}
          className="text-xs text-neutral-400 hover:text-foreground font-bold uppercase tracking-wider flex items-center space-x-1 transition-colors"
        >
          <span>{t("home.viewAll")}</span>
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* Simple horizontal scroll instead of Swiper for better performance */}
      <div className="overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex gap-4 px-1">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  style={{ width: "200px", flexShrink: 0 }}
                >
                  <FilmCardSkeleton width={200} hideDetails={false} />
                </div>
              ))
            : films.slice(0, 12).map((film) => (
                <div key={film.slug} style={{ width: "200px", flexShrink: 0 }}>
                  <FilmCard
                    film={film}
                    width={200}
                    variant="standard"
                    hideDetails={false}
                  />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
