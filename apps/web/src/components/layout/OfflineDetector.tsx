'use client';
import { useEffect, useState } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';

export function OfflineDetector() {
  const [isOffline, setIsOffline] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set initial state
    setIsOffline(!window.navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setShowNotification(true);
      toast('Mất kết nối mạng. Bạn đang ở chế độ ngoại tuyến.', 'error');
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowNotification(true);
      toast('Đã kết nối lại Internet thành công!', 'success');
      // Hide banner after 3 seconds on reconnect
      const timer = setTimeout(() => setShowNotification(false), 3000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [toast]);

  if (!isOffline && !showNotification) return null;

  return (
    <div
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-3 px-5 py-3.5 rounded-lg shadow-2xl border transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
        isOffline
          ? 'bg-amber-600 border-amber-500 text-white'
          : 'bg-green-600 border-green-500 text-white'
      }`}
    >
      {isOffline ? (
        <>
          <WifiOff size={18} className="animate-pulse flex-shrink-0" />
          <div className="text-xs font-semibold whitespace-nowrap">
            Bạn đang ngoại tuyến. Vui lòng kiểm tra lại đường truyền!
          </div>
        </>
      ) : (
        <>
          <Wifi size={18} className="flex-shrink-0" />
          <div className="text-xs font-semibold whitespace-nowrap">
            Đã kết nối lại Internet. Đang đồng bộ...
          </div>
        </>
      )}
      <button
        onClick={() => setShowNotification(false)}
        className="hover:bg-white/10 p-0.5 rounded transition-colors focus:outline-none"
      >
        <X size={14} />
      </button>
    </div>
  );
}
