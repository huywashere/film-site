"use client";
import { useState } from "react";

const TMDB_POSTERS = [
  "https://image.tmdb.org/t/p/w342/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  "https://image.tmdb.org/t/p/w342/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
  "https://image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  "https://image.tmdb.org/t/p/w342/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
  "https://image.tmdb.org/t/p/w342/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
  "https://image.tmdb.org/t/p/w342/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
  "https://image.tmdb.org/t/p/w342/wqGZVSCUSXE92WH2zyol2REaqT4.jpg",
  "https://image.tmdb.org/t/p/w342/lH8k9uCWYn2b2gsYleqYBDPbWa8.jpg",
  "https://image.tmdb.org/t/p/w342/duXkWKOLS7hHAddyjBwk35YY6U.jpg",
  "https://image.tmdb.org/t/p/w342/7876PK6gosE13Uq1B6nRxf7AJLT.jpg",
  "https://image.tmdb.org/t/p/w342/15qLAM3QM8DoPL9Fps4JOTdqWqt.jpg",
  "https://image.tmdb.org/t/p/w342/7uabN7xF4209cDUdBuMvkVcpkN2.jpg",
  "https://image.tmdb.org/t/p/w342/hhCEHR0OKeVJUiQLtiI6GBbUeAe.jpg",
  "https://image.tmdb.org/t/p/w342/gf7EeEQe22Zu1u55wRT8EAnav93.jpg",
  "https://image.tmdb.org/t/p/w342/nI4uPl4E3No8674XnyY8zJpceBS.jpg",
  "https://image.tmdb.org/t/p/w342/r30blmL8bB7WFzdAcXu7gJMUYk8.jpg",
  "https://image.tmdb.org/t/p/w342/3zJKDkvyTz3g6VpCS6RtaufYV0j.jpg",
  "https://image.tmdb.org/t/p/w342/nV99ACeAa8fFFso0tQZ3HktEf5X.jpg",
];

function AuthPosterItem({ url, idx }: { url: string; idx: number }) {
  const candidates = [
    url,
    `https://wsrv.nl/?url=${encodeURIComponent(url)}`,
    `/api/image-proxy?url=${encodeURIComponent(url)}`,
  ];
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
