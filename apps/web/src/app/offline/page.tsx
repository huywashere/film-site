'use client';
import Link from 'next/link';
import { WifiOff, RefreshCw, Home } from 'lucide-react';

export default function OfflinePage() {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 py-16 text-center bg-background text-foreground transition-colors duration-300">
      <div className="bg-card border border-border backdrop-blur-md shadow-2xl p-8 md:p-12 rounded-xl max-w-md w-full flex flex-col items-center">
        <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-full mb-6 inline-flex items-center justify-center">
          <WifiOff size={44} className="text-red-500 animate-bounce duration-2000" />
        </div>

        <h1 className="text-xl md:text-2xl font-black mb-3">
          Mất Kết Nối Internet
        </h1>

        <p className="text-xs text-muted-foreground leading-relaxed mb-8 max-w-sm">
          Ứng dụng CineVerse hiện không thể kết nối tới máy chủ. Vui lòng kiểm tra lại kết nối Wifi hoặc mạng dữ liệu di động của bạn để tiếp tục thưởng thức phim.
        </p>

        <div className="flex items-center justify-center gap-3 w-full flex-wrap sm:flex-nowrap">
          <button
            onClick={handleReload}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-netflixRed hover:bg-[#C11119] text-white font-bold text-xs px-5 py-3 rounded shadow transition-all cursor-pointer"
          >
            <RefreshCw size={15} />
            <span>Thử Lại</span>
          </button>
          
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border font-bold text-xs px-5 py-3 rounded shadow transition-all"
          >
            <Home size={15} />
            <span>Trang Chủ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
