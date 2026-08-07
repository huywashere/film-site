"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function InitialSplashLoader() {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    try {
      const shown = sessionStorage.getItem("cinephim-splash-shown");
      if (!shown) {
        setShowSplash(true);
        sessionStorage.setItem("cinephim-splash-shown", "true");
        const timer = setTimeout(() => {
          setShowSplash(false);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch (_e) {
      // Fallback
    }
  }, []);

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden"
        >
          {/* Ambient Background Glowing Aura */}
          <div className="absolute w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />

          {/* Logo Animation Block */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-4 relative z-10"
          >
            {/* Glowing Logo Icon Container */}
            <div className="relative flex items-center justify-center p-3 rounded-3xl bg-neutral-950/80 border border-purple-500/30 shadow-[0_0_60px_rgba(168,85,247,0.35)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cinephim-logo.png"
                alt="CinePhim"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[0_0_20px_rgba(168,85,247,0.6)]"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/logo.png";
                }}
              />
            </div>

            {/* Animated Brand Text */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex items-center gap-2"
            >
              <span className="text-3xl sm:text-4xl font-black tracking-tight lowercase text-white font-sans drop-shadow-md">
                cinephim
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-mono font-bold tracking-widest uppercase">
                4K
              </span>
            </motion.div>

            {/* Subtle Progress Bar */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "120px" }}
              transition={{ duration: 0.9, ease: "easeInOut" }}
              className="h-1 rounded-full bg-gradient-to-r from-purple-500 via-purple-300 to-white mt-2 shadow-[0_0_12px_rgba(168,85,247,0.8)]"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
