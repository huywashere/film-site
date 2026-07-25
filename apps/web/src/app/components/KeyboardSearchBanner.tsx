"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const SpotlightSearchModal = dynamic(
  () => import("@/components/search/SpotlightSearchModal").then(mod => mod.SpotlightSearchModal),
  { ssr: false }
);

export function KeyboardSearchBanner() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <div
        onClick={() => setIsSearchOpen(true)}
        className="fixed bottom-6 left-6 z-50 hidden sm:flex items-center space-x-2 bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-neutral-300 text-[11px] select-none shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer"
      >
        <span className="font-semibold text-neutral-200">Press</span>
        <kbd className="bg-white/15 border border-white/25 px-2 py-0.5 rounded-md text-[11px] text-white font-mono font-black">
          ⌘K
        </kbd>
        <span className="font-semibold text-neutral-200">to search</span>
      </div>

      {isSearchOpen && (
        <SpotlightSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          suggestions={[]}
        />
      )}
    </>
  );
}
