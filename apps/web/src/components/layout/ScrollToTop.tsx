"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[#14181c]/90 border border-white/15 hover:border-blue-500/40 text-white/80 hover:text-white hover:bg-blue-600 shadow-xl transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95 group backdrop-blur-md"
      aria-label="Cuộn lên đầu trang"
      title="Cuộn lên đầu trang"
    >
      <ArrowUp
        size={18}
        className="text-white/80 group-hover:text-white transition-colors"
      />
    </button>
  );
}
