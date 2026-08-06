"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface DashPaginationProps {
  swiper: any;
  totalDashes?: number;
}

export function DashPagination({
  swiper,
  totalDashes = 5,
}: DashPaginationProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!swiper) return;

    const handleSlideChange = () => {
      try {
        const progress = swiper.progress ?? 0;
        const maxIdx = totalDashes - 1;
        const idx = Math.min(
          maxIdx,
          Math.max(0, Math.round(progress * maxIdx)),
        );
        setActiveIndex(idx);
      } catch {
        // Fallback
      }
    };

    // Initial check
    handleSlideChange();

    swiper.on("slideChange", handleSlideChange);
    swiper.on("snapIndexChange", handleSlideChange);
    swiper.on("setTranslate", handleSlideChange);

    return () => {
      swiper.off("slideChange", handleSlideChange);
      swiper.off("snapIndexChange", handleSlideChange);
      swiper.off("setTranslate", handleSlideChange);
    };
  }, [swiper, totalDashes]);

  const handleDashClick = (dashIdx: number) => {
    if (!swiper) return;
    try {
      const maxIdx = totalDashes - 1;
      const ratio = dashIdx / maxIdx;

      if (swiper.snapGrid && swiper.snapGrid.length > 0) {
        const targetSnapIndex = Math.round(
          (swiper.snapGrid.length - 1) * ratio,
        );
        swiper.slideTo(
          swiper.snapGrid[targetSnapIndex] ? targetSnapIndex : 0,
          400,
        );
      } else {
        const totalSlides = swiper.slides ? swiper.slides.length : 10;
        const targetSlide = Math.round((totalSlides - 1) * ratio);
        swiper.slideTo(targetSlide, 400);
      }
    } catch {
      // Fallback slide
      swiper.slideTo(dashIdx * 2, 400);
    }
  };

  return (
    <div className="hidden sm:flex items-center gap-1.5 opacity-90 transition-opacity">
      {Array.from({ length: totalDashes }).map((_, idx) => {
        const isActive = activeIndex === idx;
        return (
          <button
            key={idx}
            onClick={() => handleDashClick(idx)}
            title={`Chuyển đến trang ${idx + 1}`}
            aria-label={`Chuyển đến trang ${idx + 1}`}
            className={cn(
              "h-0.5 rounded-full transition-all duration-300 cursor-pointer",
              isActive
                ? "w-5 bg-white"
                : "w-2 bg-white/30 hover:bg-white/70 hover:w-3",
            )}
          />
        );
      })}
    </div>
  );
}
