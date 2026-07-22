'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, X, Clock, RotateCcw } from 'lucide-react';
import { watchProgressStorage, WatchProgressEntry, formatTime } from '@/lib/watch-progress';

export function ContinueWatchingRow() {
  const [entries, setEntries] = useState<WatchProgressEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEntries(watchProgressStorage.getEntries());
  }, []);

  if (!mounted || entries.length === 0) return null;

  const handleRemove = (e: React.MouseEvent, slug: string, epSlug: string) => {
    e.preventDefault();
    e.stopPropagation();
    watchProgressStorage.removeEntry(slug, epSlug);
    setEntries(watchProgressStorage.getEntries());
  };

  return (
    <section className="container mx-auto px-4 md:px-8 max-w-7xl my-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#00e054]/15 border border-[#00e054]/30 flex items-center justify-center text-[#00e054] shadow-sm">
            <Clock size={16} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-wide">
              Tiếp Tục Xem
            </h2>
            <p className="text-xs text-neutral-400 font-semibold">
              Các bộ phim bạn chưa xem xong
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-neutral-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
          {entries.length} phim
        </span>
      </div>

      {/* Grid Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {entries.map((item) => {
          const percent = Math.min(100, Math.max(0, Math.round((item.currentTime / item.duration) * 100)));
          const cleanEpNumber = item.epName.replace(/^(tập|tap)\s*-?\s*/i, '').trim();
          const epLabel = cleanEpNumber ? `Tập ${cleanEpNumber}` : 'Tập 1';

          return (
            <div
              key={`${item.slug}-${item.epSlug}`}
              className="group relative bg-[#1c2228] border border-[#2c3440] rounded-2xl overflow-hidden shadow-xl hover:border-[#00e054]/50 transition-all duration-300 flex flex-col"
            >
              {/* Thumbnail Container */}
              <Link href={`/watch/${item.slug}?ep=${item.epSlug}`} className="relative aspect-[16/9] w-full bg-neutral-900 overflow-hidden block">
                {item.poster ? (
                  <img
                    src={item.poster}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 brightness-90 group-hover:brightness-100"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-600">
                    <Play size={24} />
                  </div>
                )}

                {/* Play Icon Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <div className="w-11 h-11 rounded-full bg-[#00e054] text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play size={18} className="fill-current ml-0.5" />
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={(e) => handleRemove(e, item.slug, item.epSlug)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-[#00e054] text-neutral-300 hover:text-black flex items-center justify-center backdrop-blur-sm border border-white/10 transition-colors z-20"
                  title="Xóa khỏi danh sách"
                >
                  <X size={14} />
                </button>

                {/* Progress Bar Container */}
                <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/60">
                  <div
                    style={{ width: `${percent}%` }}
                    className="h-full bg-[#00e054] rounded-r-full shadow-[0_0_8px_rgba(0,224,84,0.8)]"
                  />
                </div>
              </Link>

              {/* Info Container */}
              <div className="p-3 flex flex-col justify-between flex-1">
                <div>
                  <Link href={`/watch/${item.slug}?ep=${item.epSlug}`}>
                    <h3 className="font-extrabold text-xs text-white truncate group-hover:text-[#00e054] transition-colors">
                      {item.title}
                    </h3>
                  </Link>
                  <div className="flex items-center space-x-2 mt-1.5">
                    <span className="bg-[#00e054]/15 text-[#00e054] border border-[#00e054]/30 text-[10px] font-black px-2 py-0.5 rounded-md">
                      {epLabel}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-semibold truncate">
                      {formatTime(item.currentTime)} / {formatTime(item.duration)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3.5 pt-2 border-t border-white/5">
                  <span className="text-[10px] text-neutral-400 font-bold">
                    Đã xem {percent}%
                  </span>
                  <Link
                    href={`/watch/${item.slug}?ep=${item.epSlug}`}
                    className="flex items-center space-x-1 text-[11px] font-extrabold text-[#00e054] hover:underline"
                  >
                    <span>Xem tiếp</span>
                    <Play size={10} className="fill-current" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
