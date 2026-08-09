"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function LogoSplashIntro() {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    // Show splash screen once per session load
    if (typeof window !== "undefined") {
      const hasSeen = sessionStorage.getItem("cinephim-intro-seen");
      if (!hasSeen) {
        setShowIntro(true);
        sessionStorage.setItem("cinephim-intro-seen", "true");
        const timer = setTimeout(() => {
          setShowIntro(false);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  return (
    <AnimatePresence>
      {showIntro && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.45, ease: "easeInOut" },
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0c10] select-none pointer-events-none contain-strict"
        >
          {/* Animated Purple Glow Background */}
          <div className="absolute w-[320px] h-[320px] rounded-full bg-purple-600/25 blur-[110px] animate-pulse" />

          {/* Central Animated Logo */}
          <motion.div
            initial={{ scale: 0.65, opacity: 0 }}
            animate={{ scale: [0.65, 1.05, 1], opacity: 1 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-3.5 relative z-10"
          >
            <div className="relative">
              { }
              <motion.img
                src="/cinephim-logo.png"
                alt="CinePhim Logo"
                animate={{ rotate: [0, 4, -4, 0] }}
                transition={{
                  duration: 2.2,
                  ease: "easeInOut",
                  repeat: Infinity,
                }}
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-[0_0_40px_rgba(168,85,247,0.75)]"
              />
            </div>

            <motion.div
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.55 }}
              className="flex items-center gap-1 text-2xl sm:text-4xl font-black lowercase tracking-tight"
            >
              <span className="bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(168,85,247,0.6)] font-sans">
                cinephim
              </span>
            </motion.div>

            {/* Subtle Loading Bouncing Dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-1.5 pt-1"
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
