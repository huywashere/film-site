'use client';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] bg-[#14181c] text-white flex flex-col items-center justify-center px-6 py-16 text-center select-none font-sans">
      {/* Big Metallic Gradient 404 */}
      <h1 className="text-8xl sm:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-300 to-neutral-600 leading-none mb-4">
        404
      </h1>

      {/* Subtitle */}
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
        Không tìm thấy trang
      </h2>

      {/* Description */}
      <p className="text-xs sm:text-sm text-neutral-400 max-w-sm mx-auto mb-8 leading-relaxed">
        Oops! Có vẻ như trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
      </p>

      {/* Clean Pill Action Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-[#242c34] hover:bg-[#2c3440] text-neutral-200 hover:text-white border border-[#2c3440] hover:border-[#00e054]/40 font-semibold text-xs px-6 py-2.5 rounded-full transition-all duration-200 shadow-md active:scale-95"
      >
        <ChevronLeft size={14} />
        <span>Về trang chủ</span>
      </Link>
    </div>
  );
}
