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
    try {
      return calculateNextAirInfo(film, episodes);
    } catch {
      return null;
    }
  }, [film, episodes]);

  if (!airInfo) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm select-none',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-400 shadow-sm">
        <Bell size={15} className="text-neutral-300 animate-bell-ring" />
      </div>

      <p className="flex-1 min-w-0 text-xs sm:text-sm text-neutral-300 leading-relaxed m-0">
        <span className="font-semibold text-white">{airInfo.episodeLabel}</span>
        <span className="text-neutral-400"> sẽ phát sóng </span>
        <span className="font-semibold text-white">ngày {airInfo.airDateStr}</span>
        <span className="text-neutral-400">. Các bạn nhớ đón xem nhé!</span>
      </p>
    </div>
  );
}
