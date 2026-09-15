"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed or installed in this session
    const isDismissed = sessionStorage.getItem("netphim_pwa_dismissed");
    if (isDismissed) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone;

    if (iosDevice && !isStandalone) {
      setIsIos(true);
      // Show banner after 3 seconds for iOS
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // Listen for beforeinstallprompt event on Android / Chrome / Edge / Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted PWA installation");
    }

    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("netphim_pwa_dismissed", "true");
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed bottom-20 left-4 right-4 sm:right-auto sm:left-6 sm:bottom-6 z-50 max-w-md bg-[#0e1117]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-white"
      >
        <div className="flex items-start gap-3.5">
          {/* App Icon */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-purple-600 p-0.5 shrink-0 shadow-lg shadow-rose-500/20">
            <div className="w-full h-full bg-[#141414] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-rose-400" />
            </div>
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-white tracking-tight">
                Cài đặt FlexPhim App
              </h4>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                PWA
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Thêm vào màn hình chính để xem phim 4K mượt mà như ứng dụng cài sẵn.
            </p>

            {/* iOS Guide Popup */}
            {showIosGuide && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-white/10 border border-white/15 text-[11px] text-neutral-300 space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <Smartphone size={14} className="text-rose-400" /> Trên iPhone / iPad:
                </p>
                <p>1. Bấm biểu tượng <strong>Chia sẻ (Share)</strong> ở góc trình duyệt Safari.</p>
                <p>2. Chọn <strong>"Thêm vào Màn hình chính" (Add to Home Screen)</strong>.</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Download size={14} />
                <span>{isIos ? "Hướng dẫn cài" : "Cài đặt ngay"}</span>
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-400 hover:text-white font-semibold text-xs transition-all cursor-pointer"
              >
                Để sau
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3.5 right-3.5 text-neutral-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
