'use client';

import Link from 'next/link';
import { ChevronRight, Clock, Tv, Clapperboard, TrendingUp } from 'lucide-react';
import { FilmCard, FilmCardSkeleton, FilmItem } from '@/components/film/FilmCard';
import { useTranslation } from '@/store/langStore';

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

export default function FilmSection({ title, icon, films, isLoading, href }: FilmSectionProps) {
  const { t } = useTranslation();
  const Icon = icons[icon];

  return (
    <section className="relative mb-12 md:mb-16">
      <div className="mb-4 flex items-end justify-between px-1 sm:mb-5">
        <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center space-x-2">
          <Icon size={18} className="text-netflixRed" />
          <span>{title}</span>
        </h2>
        <Link
          href={href}
          className="group/link ml-4 inline-flex shrink-0 select-none items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white sm:text-sm"
        >
          <span>{t('home.viewAll', 'Xem tất cả')}</span>
          <ChevronRight
            size={14}
            className="stroke-[2.2] text-white/60 group-hover/link:text-white transition-transform group-hover/link:translate-x-0.5"
          />
        </Link>
      </div>

      {/* Horizontal scroll tuned for 4 movies per view on mobile without overlap */}
      <div className="overflow-x-auto pb-4 scrollbar-hide" aria-busy={isLoading}>
        <div className="flex gap-3.5 px-1 sm:gap-[18px]">
          {isLoading
            ? Array.from({ length: 14 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="w-[28vw] min-w-[88px] max-w-[132px] flex-shrink-0 sm:w-[164px] sm:max-w-none md:w-[18%] lg:w-[calc((100%-6*1rem)/7)] xl:w-[calc((100%-6*1rem)/7)]"
                >
                  <FilmCardSkeleton hideDetails={false} />
                </div>
              ))
            : films.slice(0, 14).map((film) => (
                <div
                  key={film.slug}
                  className="w-[28vw] min-w-[88px] max-w-[132px] flex-shrink-0 sm:w-[164px] sm:max-w-none md:w-[18%] lg:w-[calc((100%-6*1rem)/7)] xl:w-[calc((100%-6*1rem)/7)]"
                >
                  <FilmCard film={film} variant="standard" hideDetails={false} preferHighQuality />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
