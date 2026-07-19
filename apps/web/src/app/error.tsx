'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, ServerCrash } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console
    console.error('System Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 py-12 bg-background text-foreground transition-colors duration-300">
      <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-full mb-6 inline-flex items-center justify-center">
        <ServerCrash size={48} className="text-red-500 animate-pulse" />
      </div>
      
      <h1 className="text-7xl font-black text-red-500 tracking-tighter leading-none mb-2">
        500
      </h1>
      
      <h2 className="text-xl md:text-2xl font-bold mb-3">
        Đã Xảy Ra Lỗi Hệ Thống
      </h2>
      
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
        Máy chủ đã gặp sự cố không mong muốn hoặc HMR dev-cache bị quá tải. Hãy nhấn nút thử lại bên dưới hoặc quay về trang chủ.
      </p>
      
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 bg-netflixRed hover:bg-[#C11119] text-white font-bold text-sm px-6 py-3 rounded shadow transition-all cursor-pointer"
        >
          <RefreshCw size={15} />
          <span>Thử Lại</span>
        </button>
        
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border font-bold text-sm px-6 py-3 rounded shadow transition-all"
        >
          <Home size={15} />
          <span>Về Trang Chủ</span>
        </Link>
      </div>
    </div>
  );
}
