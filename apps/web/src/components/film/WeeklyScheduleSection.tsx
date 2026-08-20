"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Radio,
  ChevronRight,
  Play,
  Film,
} from "lucide-react";
import { FilmCard, type FilmItem } from "@/components/film/FilmCard";
import { cn } from "@/lib/utils";

interface WeeklyScheduleSectionProps {
  items: FilmItem[];
  title?: string;
}

const DAYS = [
  { id: "mon", dayIndex: 1, label: "Thứ 2", fullLabel: "Thứ Hai" },
  { id: "tue", dayIndex: 2, label: "Thứ 3", fullLabel: "Thứ Ba" },
  { id: "wed", dayIndex: 3, label: "Thứ 4", fullLabel: "Thứ Tư" },
  { id: "thu", dayIndex: 4, label: "Thứ 5", fullLabel: "Thứ Năm" },
  { id: "fri", dayIndex: 5, label: "Thứ 6", fullLabel: "Thứ Sáu" },
  { id: "sat", dayIndex: 6, label: "Thứ 7", fullLabel: "Thứ Bảy" },
  { id: "sun", dayIndex: 0, label: "CN", fullLabel: "Chủ Nhật" },
];

const TIME_SLOTS = ["19:00", "20:15", "21:00", "22:30"];

export function WeeklyScheduleSection({
  items,
  title = "Lịch Chiếu Phim Hôm Nay",
}: WeeklyScheduleSectionProps) {
  // Current Day of week (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const currentDayIndex = useMemo(() => new Date().getDay(), []);
  const todayConfig = useMemo(
    () => DAYS.find((d) => d.dayIndex === currentDayIndex) || DAYS[0],
    [currentDayIndex],
  );

  const [activeDayId, setActiveDayId] = useState<string>(todayConfig.id);

  const selectedDay = useMemo(
    () => DAYS.find((d) => d.id === activeDayId) || todayConfig,
    [activeDayId, todayConfig],
  );

  // Partition films into the selected day
  const dayFilms = useMemo(() => {
    if (!items || !items.length) return [];

    const targetDayIndex = selectedDay.dayIndex;
    return items
      .filter((film) => {
        const seed = (film.slug || film.name || "")
          .split("")
          .reduce((acc, char) => acc + char.charCodeAt(0), 0);

        const lowerSlug = (film.slug || "").toLowerCase();
        let assignedDay = seed % 7;
        if (lowerSlug.includes("one-piece")) assignedDay = 0;
        if (lowerSlug.includes("conan")) assignedDay = 6;
        if (lowerSlug.includes("sat-thu")) assignedDay = 3;

        return assignedDay === targetDayIndex;
      })
      .slice(0, 6);
  }, [items, selectedDay]);

  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-4 pt-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <CalendarDays size={20} className="text-purple-400" />
              <span>{title}</span>
            </h2>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
            {selectedDay.fullLabel}
          </span>
        </div>

        <Link
          href="/schedule"
          className="inline-flex items-center gap-1 text-xs font-bold text-neutral-400 hover:text-white transition-colors group self-start sm:self-auto"
        >
          <span>Xem trọn tuần</span>
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Weekday Switcher Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {DAYS.map((day) => {
          const isSelected = activeDayId === day.id;
          const isToday = day.dayIndex === currentDayIndex;

          return (
            <button
              key={day.id}
              type="button"
              onClick={() => setActiveDayId(day.id)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border select-none",
                isSelected
                  ? "bg-purple-600 text-white border-purple-500 font-extrabold shadow-md scale-[1.03]"
                  : isToday
                    ? "bg-purple-950/40 text-purple-200 border-purple-500/30 hover:bg-purple-900/40"
                    : "bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.08] border-white/[0.06]",
              )}
            >
              {isToday && (
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isSelected ? "bg-white animate-ping" : "bg-purple-400"
                )} />
              )}
              <span>{day.label}</span>
              {isToday && <span className="text-[10px] opacity-80">(Nay)</span>}
            </button>
          );
        })}
      </div>

      {/* Films list for the selected day */}
      {dayFilms.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center text-xs text-neutral-400">
          Chưa có tập phim mới vào ngày {selectedDay.fullLabel}.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {dayFilms.map((film, index) => {
            const timeSlot = TIME_SLOTS[index % TIME_SLOTS.length];
            return (
              <div key={film.slug} className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-400 px-1">
                  <span className="inline-flex items-center gap-1 text-purple-400 font-extrabold">
                    <Clock size={10} />
                    {timeSlot}
                  </span>
                  <span className="text-neutral-500 text-[9px]">
                    {film.episode_current || "Tập mới"}
                  </span>
                </div>
                <FilmCard film={film} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
