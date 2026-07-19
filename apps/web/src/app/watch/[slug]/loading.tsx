import { Loader2 } from 'lucide-react';

export default function WatchLoading() {
  return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center">
      <Loader2 className="w-12 h-12 text-[#E50914] animate-spin mb-4" />
      <p className="text-white/70 font-semibold tracking-wider uppercase text-sm animate-pulse">
        Đang tải dữ liệu phim...
      </p>
    </div>
  );
}
