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

      {/* Horizontal scroll tuned for 4 movies per view on mobile without overlap */}
      <div className="overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex gap-3 sm:gap-4 px-1">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="w-[calc(25%-9px)] min-w-[78px] sm:w-[160px] md:w-[190px] lg:w-[210px] flex-shrink-0"
                >
                  <FilmCardSkeleton hideDetails={false} />
                </div>
              ))
            : films.slice(0, 16).map((film) => (
                <div
                  key={film.slug}
                  className="w-[calc(25%-9px)] min-w-[78px] sm:w-[160px] md:w-[190px] lg:w-[210px] flex-shrink-0"
                >
                  <FilmCard
                    film={film}
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
