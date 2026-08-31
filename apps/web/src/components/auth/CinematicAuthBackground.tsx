"use client";
import { useState } from "react";
import { buildArtworkCandidates } from "@/lib/image-cdn";

const TMDB_POSTERS = [
  // 4 Phim Ngôn Tình Hàn Quốc Đình Đám
  "/images/auth/queen-of-tears.webp",
  "/images/auth/crash-landing-on-you.webp",
  "/images/auth/goblin.webp",
  "/images/auth/its-okay-to-not-be-okay.webp",

  // Cinema & Blockbuster Backdrops
  "https://image.tmdb.org/t/p/w342/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  "https://image.tmdb.org/t/p/w342/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
  "https://image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  "https://image.tmdb.org/t/p/w342/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
  "https://image.tmdb.org/t/p/w342/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
  "https://image.tmdb.org/t/p/w342/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
];

function AuthPosterItem({ url, idx }: { url: string; idx: number }) {
  const candidates = buildArtworkCandidates([url], "card");
  const [candidateIdx, setCandidateIdx] = useState(0);

  return (
    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-neutral-900 shadow-xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={candidates[candidateIdx]}
        alt="TMDB Cinema Background"
        className="w-full h-full object-cover"
        loading={idx < 12 ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          if (candidateIdx < candidates.length - 1) {
            setCandidateIdx((i) => i + 1);
          }
        }}
      />
    </div>
  );
}

export function CinematicAuthBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#080a0f]">
      {/* TMDB Movie Posters Collage Grid Wall */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 scale-105 opacity-60 filter saturate-110">
        {TMDB_POSTERS.concat(TMDB_POSTERS).map((url, idx) => (
          <AuthPosterItem key={idx} url={url} idx={idx} />
        ))}
      </div>

      {/* Dark Gradient Overlay + Subtle Blur */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#040508] via-[#040508]/60 to-[#040508]/45 backdrop-blur-[2px]" />
    </div>
  );
}
