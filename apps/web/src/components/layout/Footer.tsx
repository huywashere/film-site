"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Clapperboard } from "lucide-react";
import { resolveImageUrl } from "@/components/film/FilmCard";

// ── Cat random images ────────────────────────────────────────────────────────
const CAT_IMAGES = [
  "/images/cat1.gif",
  "/images/cat2.gif",
  "/images/cat3.gif",
  "/images/cat4.gif",
];

function getRandomCat() {
  return CAT_IMAGES[Math.floor(Math.random() * CAT_IMAGES.length)];
}

// ── HOT MOVIES FOR MARQUEE TICKER ────────────────────────────────────────────
const HOT_MARQUEE_MOVIES = [
  {
    slug: "deadpool-va-wolverine",
    name: "Deadpool & Wolverine",
    year: 2024,
    rating: 8.5,
    poster: "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
  },
  {
    slug: "nguoi-nhen-khong-con-nha",
    name: "Spider-Man: No Way Home",
    year: 2021,
    rating: 8.3,
    poster: "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
  },
  {
    slug: "hanh-tinh-cat-phan-hai",
    name: "Dune: Part Two",
    year: 2024,
    rating: 8.6,
    poster: "https://image.tmdb.org/t/p/w500/1pdfLPoLMag8StABMwM2FiCShjE.jpg",
  },
  {
    slug: "ky-si-bong-dem",
    name: "The Dark Knight",
    year: 2008,
    rating: 9.0,
    poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  },
  {
    slug: "biet-doi-sieu-anh-hung-ket-thuc",
    name: "Avengers: Endgame",
    year: 2019,
    rating: 8.9,
    poster: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9vtnW3vScO.jpg",
  },
  {
    slug: "ho-den-tu-than",
    name: "Interstellar",
    year: 2014,
    rating: 8.7,
    poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBv9B.jpg",
  },
  {
    slug: "the-batman",
    name: "The Batman",
    year: 2022,
    rating: 8.4,
    poster: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
  },
  {
    slug: "phu-thuy-toi-thuong-trong-da-vu-tru-hon-loan",
    name: "Doctor Strange",
    year: 2022,
    rating: 8.1,
    poster: "https://image.tmdb.org/t/p/w500/9G0z19726rmtWFuVJXRV8FjFBKV.jpg",
  },
  {
    slug: "ve-binh-dai-ngan-ha-3",
    name: "Guardians of the Galaxy 3",
    year: 2023,
    rating: 8.5,
    poster: "https://image.tmdb.org/t/p/w500/r2J02Z2OpNTctZOSN1YUYiiA1Im.jpg",
  },
  {
    slug: "avatar-dong-chay-cua-nuoc",
    name: "Avatar: The Way Of Water",
    year: 2022,
    rating: 8.8,
    poster: "https://image.tmdb.org/t/p/w500/t6HIfvMGNVChmFutvUt2E8R9DsM.jpg",
  },
];

// ── FOOTER LINK COLUMNS ──────────────────────────────────────────────────────
const FOOTER_LINKS = [
  {
    heading: "NỘI DUNG",
    links: [
      { label: "Phim mới nhất", href: "/films" },
      { label: "Phim bộ", href: "/films/series" },
      { label: "Phim lẻ", href: "/films/single" },
      { label: "Hoạt hình", href: "/films/hoat-hinh" },
    ],
  },
  {
    heading: "THỂ LOẠI",
    links: [
      { label: "Hành động", href: "/genre/hanh-dong" },
      { label: "Tình cảm", href: "/genre/tinh-cam" },
      { label: "Khoa học viễn tưởng", href: "/genre/khoa-hoc-vien-tuong" },
      { label: "Kinh dị", href: "/genre/kinh-di" },
    ],
  },
  {
    heading: "QUỐC GIA",
    links: [
      { label: "Phim Hàn Quốc", href: "/country/han-quoc" },
      { label: "Phim Trung Quốc", href: "/country/trung-quoc" },
      { label: "Phim Âu Mỹ", href: "/country/au-my" },
      { label: "Phim Nhật Bản", href: "/country/nhat-ban" },
    ],
  },
  {
    heading: "VỀ CHÚNG TÔI",
    links: [
      { label: "Điều khoản", href: "/terms" },
      { label: "Quyền riêng tư", href: "/privacy" },
      { label: "Báo cáo nội dung", href: "/report" },
      { label: "Liên hệ", href: "/contact" },
    ],
  },
];

export function Footer() {
  const [catSrc, setCatSrc] = useState<string>("");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    setCatSrc(getRandomCat());
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="relative w-full overflow-hidden bg-background py-10 md:py-14 pl-4 lg:pl-28 pr-4 lg:pr-12 z-20">
      {/* ── Main Rounded Minimalist Card Container ── */}
      <div className="relative z-10 w-full max-w-[1500px] mx-auto bg-neutral-950/90 border border-white/10 rounded-[32px] md:rounded-[40px] overflow-hidden shadow-2xl">
        
        {/* ── Top Section: Ticker Marquee ── */}
        <div className="border-b border-white/10 py-5 px-4 relative overflow-hidden bg-white/[0.02]">
          {/* Left & Right gradient fade masks */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-r from-neutral-950 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-l from-neutral-950 to-transparent z-10" />

          {/* Infinite Marquee Track (Right to Left) */}
          <div className="overflow-hidden w-full flex">
            <div
              className={`flex gap-4 shrink-0 ${
                isPaused ? "[animation-play-state:paused]" : ""
              }`}
              style={{
                animation: "marquee-rtl 60s linear infinite",
              }}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {[
                ...HOT_MARQUEE_MOVIES,
                ...HOT_MARQUEE_MOVIES,
                ...HOT_MARQUEE_MOVIES,
              ].map((movie, idx) => {
                const imgProxyUrl = resolveImageUrl(movie.poster);

                return (
                  <Link
                    key={`${movie.slug}-${idx}`}
                    href={`/watch/${movie.slug}`}
                    className="group flex items-center gap-3 p-2 pr-4 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800/90 border border-white/10 hover:border-white/30 transition-all duration-200 shrink-0 hover:scale-105 shadow-md cursor-pointer"
                  >
                    <div className="w-10 h-14 rounded-xl overflow-hidden bg-neutral-900 border border-white/10 shrink-0 relative flex items-center justify-center">
                      {imgProxyUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={imgProxyUrl}
                          alt={movie.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <Clapperboard size={14} className="text-neutral-500" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-left">
                      <span className="text-xs font-bold text-white group-hover:text-neutral-200 transition-colors line-clamp-1 max-w-[160px]">
                        {movie.name}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                        <span className="text-amber-400 font-bold">★ {movie.rating}</span>
                        <span>•</span>
                        <span>{movie.year}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Middle Section: Newsletter + Link Columns */}
        <div className="grid lg:grid-cols-[1fr_1.35fr] divide-y lg:divide-y-0 lg:divide-x divide-white/10">
          {/* Left: Newsletter Box */}
          <div className="p-8 md:p-12 relative flex flex-col justify-between overflow-hidden bg-neutral-900/30">
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

            <div>
              <h4 className="text-lg md:text-xl font-bold text-white mb-2 tracking-tight">
                Want to stay in touch?
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mb-6 font-mono">
                Join our newsletter to get the latest news, updates and special movie offers.
              </p>

              <form onSubmit={handleSubscribe} className="relative max-w-sm">
                <div className="flex items-center rounded-2xl bg-neutral-900 border border-white/15 p-1.5 focus-within:border-white/40 transition-colors shadow-inner">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ENTER YOUR E-MAIL"
                    className="w-full bg-transparent px-3 py-2 text-xs font-mono text-white placeholder:text-neutral-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="shrink-0 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold font-mono transition-all hover:scale-105 active:scale-95 border border-white/15 shadow-md cursor-pointer"
                  >
                    {subscribed ? "Subscribed!" : "Subscribe"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right: 4 Footer Columns */}
          <div className="p-8 md:p-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {FOOTER_LINKS.map((col) => (
              <div key={col.heading}>
                <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-neutral-500 uppercase mb-4">
                  {col.heading}
                </p>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        target={(link as any).external ? "_blank" : undefined}
                        rel={(link as any).external ? "noopener noreferrer" : undefined}
                        className="text-xs font-mono text-neutral-400 hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom copyright bar inside card */}
        <div className="border-t border-white/10 px-8 md:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono tracking-widest text-neutral-500 uppercase bg-black/40">
          <span>RELEASED UNDER MIT LICENSE / COPYRIGHT © 2024 - {year} CINEVERSE</span>
          <span>DESIGNED BY TEAM CINEVERSE / HOSTED ON VERCEL</span>
        </div>
      </div>

      {/* ── Cat GIF Meme Section ── */}
      {catSrc && (
        <div className="relative z-10 flex justify-center pt-8 pb-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="group cursor-pointer"
            onClick={() => setCatSrc(getRandomCat())}
            title="Click để đổi mèo ngẫu nhiên!"
          >
            <Image
              src={catSrc}
              alt="Mèo meme ngẫu nhiên"
              width={90}
              height={90}
              className="rounded-xl object-cover border border-white/15 shadow-lg group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
          </motion.div>
        </div>
      )}
    </footer>
  );
}
