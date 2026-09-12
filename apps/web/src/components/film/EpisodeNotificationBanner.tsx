'use client';

import React, { useMemo } from 'react';
import { Bell } from 'lucide-react';
import { calculateNextAirInfo } from '@/lib/episode-air-schedule';
import { cn } from '@/lib/utils';

interface EpisodeNotificationBannerProps {
  film: any;
  episodes?: any[];
  className?: string;
}

export function EpisodeNotificationBanner({
  film,
  episodes,
  className,
}: EpisodeNotificationBannerProps) {
  const airInfo = useMemo(() => {
    return calculateNextAirInfo(film, episodes);
  }, [film, episodes]);

  if (!airInfo) return null;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl sm:rounded-2xl p-3 sm:px-5 sm:py-3.5',
        'bg-gradient-to-r from-[#2c4adb] via-[#4d3cd5] to-[#8a33cc]',
        'border border-white/15 shadow-[0_8px_25px_rgba(44,74,219,0.3)]',
        'flex items-center gap-3 sm:gap-4 select-none',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {/* Subtle ambient light highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -left-10 h-24 w-24 rounded-full bg-white/20 blur-xl"
      />

      {/* Bell icon in circular dark badge */}
      <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-[#1b2563] border border-white/15 shadow-inner">
        <Bell size={18} className="text-[#fbb03b] fill-[#fbb03b]" />
      </div>

      {/* Notification text */}
      <p className="relative flex-1 min-w-0 text-xs sm:text-sm text-white/95 leading-relaxed tracking-wide m-0">
        <strong className="font-extrabold text-white">{airInfo.episodeLabel}</strong>
        <span> sẽ phát sóng </span>
        <strong className="font-extrabold text-white">ngày {airInfo.airDateStr}.</strong>
        <span> Các bạn nhớ đón xem nhé </span>
        <span className="inline-block align-middle ml-0.5 text-sm sm:text-base">😚</span>
      </p>
    </div>
  );
}
