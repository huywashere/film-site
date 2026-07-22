'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, ChevronLeft } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('System Error:', error);
  }, [error]);

  return (
    <div className="min-h-[75vh] bg-[#14181c] text-white flex flex-col items-center justify-center px-6 py-16 text-center select-none font-sans">
      {/* Big Metallic Gradient 500 */}
      <h1 className="text-8xl sm:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-red-400 via-neutral-200 to-neutral-600 leading-none mb-4">
        500
      </h1>

      {/* Subtitle */}
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
        Đã xảy ra lỗi hệ thống
      </h2>

      {/* Description */}
      <p className="text-xs sm:text-sm text-neutral-400 max-w-sm mx-auto mb-8 leading-relaxed">
        Oops! Máy chủ tạm thời gặp sự cố. Bạn vui lòng thử lại hoặc quay về trang chủ.
      </p>

      {/* Buttons */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 bg-[#00e054] hover:bg-[#00c749] text-black font-bold text-xs px-5 py-2.5 rounded-full transition-all duration-200 shadow-md active:scale-95 cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>Thử lại</span>
        </button>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 bg-[#242c34] hover:bg-[#2c3440] text-neutral-200 hover:text-white border border-[#2c3440] font-semibold text-xs px-5 py-2.5 rounded-full transition-all duration-200 shadow-md active:scale-95"
        >
          <ChevronLeft size={14} />
          <span>Về trang chủ</span>
        </Link>
      </div>
    </div>
  );
}
