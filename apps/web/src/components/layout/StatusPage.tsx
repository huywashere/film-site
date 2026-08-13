"use client";

import { useEffect } from "react";
import Link from "next/link";
import { recordTelemetry } from "@/lib/telemetry";

type StatusPageProps = {
  code: "404" | "500";
  onRetry?: () => void;
};

export function StatusPage({ code, onRetry }: StatusPageProps) {
  const isServerError = code === "500";

  useEffect(() => {
    document.body.dataset.statusPage = "true";
    recordTelemetry(
      `route.${code}`,
      { status: code },
      "warning",
    );

    return () => {
      delete document.body.dataset.statusPage;
    };
  }, [code, isServerError]);

  const title = isServerError
    ? "Rất tiếc! Hệ thống đang gặp sự cố tạm thời."
    : "Oops! Trang web bạn tìm kiếm không tồn tại.";

  const description1 = isServerError
    ? "Máy chủ đang quá tải hoặc đang bảo trì."
    : "Có thể bạn đã nhập sai địa chỉ";

  const description2 = isServerError
    ? "Vui lòng thử lại sau ít phút."
    : "hoặc trang web đã di chuyển.";

  return (
    <main className="status-page fixed inset-0 z-[1000] flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#141414] px-4 py-8 font-sans text-white select-none">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/[0.045] blur-[120px]" />
      
      <section className="relative z-10 flex w-full max-w-5xl flex-col items-center text-center">
        
        {/* ── STAKE.COM 100% PIXEL-PERFECT EXACT VECTOR GRAPHIC ── */}
        <div className="relative w-full max-w-[850px] h-[250px] sm:h-[320px] md:h-[390px] flex items-center justify-center mb-8">
          <svg
            viewBox="0 0 900 420"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full grayscale contrast-125 opacity-90"
          >
            <defs>
              {/* 3D Dark Block Color Matching Stake (#131e28) */}
              <linearGradient id="stakeNumGrad" x1="0" y1="0" x2="0" y2="420" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#141e28" />
                <stop offset="100%" stopColor="#111922" />
              </linearGradient>

              {/* Stake Mascot Monster Fill (#4f6f89) */}
              <linearGradient id="mascotGrad" x1="0" y1="0" x2="100" y2="120" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#557691" />
                <stop offset="100%" stopColor="#3d566c" />
              </linearGradient>

              {/* Space Objects Gradient */}
              <linearGradient id="spaceObjGrad" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3b546a" />
                <stop offset="100%" stopColor="#253746" />
              </linearGradient>
            </defs>

            {/* ── DIGIT 1 (4 or 5) ── */}
            {code[0] === "4" ? (
              <g id="digit-1-4">
                {/* 3D Side/Extrusion Depth */}
                <path
                  d="M 50,110 L 210,110 L 210,220 L 260,220 L 260,110 L 320,110 L 320,340 L 260,340 L 260,270 L 50,270 Z"
                  fill="#0c131a"
                />
                {/* Main Front Face */}
                <path
                  d="M 40,100 L 200,100 L 200,210 L 250,210 L 250,100 L 310,100 L 310,330 L 250,330 L 250,260 L 40,260 Z"
                  fill="url(#stakeNumGrad)"
                  stroke="#1b2a37"
                  strokeWidth="2"
                />
                {/* Inner Cutout Hole */}
                <polygon points="105,155 195,155 195,210 105,210" fill="#1b2a37" />
              </g>
            ) : (
              <g id="digit-1-5">
                <path d="M 40,100 H 310 V 160 H 120 V 210 H 310 V 330 H 40 V 260 H 250 V 250 H 40 Z" fill="url(#stakeNumGrad)" />
              </g>
            )}

            {/* ── CENTRAL ZERO (0) CONTAINING EXACT STAKE MASCOT ── */}
            <g id="digit-2-zero">
              {/* 3D Extrusion Back */}
              <ellipse cx="458" cy="218" rx="142" ry="168" fill="#0c131a" />
              {/* Outer Oval Front */}
              <ellipse cx="450" cy="210" rx="138" ry="162" fill="url(#stakeNumGrad)" stroke="#1b2a37" strokeWidth="2" />
              {/* Inner Hole Cutout (Matches Background #1b2a37) */}
              <ellipse cx="450" cy="210" rx="78" ry="108" fill="#1b2a37" />

              {/* ── INSIDE ZERO: SPACE OBJECTS & EXACT STAKE MONSTER MASCOT ── */}

              {/* 1. Top-Left Shooting Meteorite */}
              <g transform="translate(360, 105) rotate(-35)">
                <path d="M 0,15 Q 12,-6 32,0 Q 18,26 0,15 Z" fill="#2d4254" />
                <circle cx="6" cy="12" r="2" fill="#1b2a37" />
                <circle cx="14" cy="8" r="1.5" fill="#1b2a37" />
                <circle cx="-8" cy="24" r="3" fill="#2d4254" opacity="0.6" />
                <circle cx="-18" cy="32" r="2" fill="#2d4254" opacity="0.4" />
              </g>

              {/* 2. Bottom-Left Cratered Moon */}
              <g transform="translate(340, 240)">
                <path d="M 40,5 C 20,-5 5,15 10,40 C 15,65 35,75 55,65 C 75,55 70,30 60,18 Z" fill="url(#spaceObjGrad)" stroke="#1b2a37" strokeWidth="2" />
                <ellipse cx="28" cy="22" rx="7" ry="9" fill="#1b2a37" opacity="0.85" />
                <circle cx="42" cy="42" r="5.5" fill="#1b2a37" opacity="0.85" />
                <circle cx="20" cy="45" r="4" fill="#1b2a37" opacity="0.85" />
                <circle cx="48" cy="20" r="3" fill="#1b2a37" opacity="0.85" />
              </g>

              {/* 3. Bottom-Right Saturn Planet */}
              <g transform="translate(520, 255)">
                <ellipse cx="30" cy="30" rx="42" ry="12" fill="#233443" transform="rotate(-22 30 30)" />
                <circle cx="30" cy="30" r="22" fill="url(#spaceObjGrad)" stroke="#1b2a37" strokeWidth="2" />
                <path d="M -8 24 A 42 12 0 0 0 68 36" stroke="#48667f" strokeWidth="3.5" fill="none" transform="rotate(-22 30 30)" />
              </g>

              {/* 4. Top-Right Star Dot */}
              <circle cx="535" cy="135" r="4" fill="#364e62" />

              {/* 5. Bottom-Left Star Dot inside Zero */}
              <circle cx="395" cy="310" r="2.5" fill="#2d4254" />

              {/* 6. CENTER EXACT STAKE MONSTER MASCOT ── */}
              {/* Outer G anchors the exact center inside Zero (cx=450, cy=210) */}
              <g transform="translate(398, 140)">
                {/* Inner G performs the floating animation relative to anchor */}
                <g id="exact-stake-mascot" className="animate-float-mascot">
                  {/* Backpack / Oxygen Tank on Back Right */}
                  <rect x="80" y="48" width="16" height="34" rx="8" fill="#364f64" stroke="#141e28" strokeWidth="2" />
                  
                  {/* Zigzag Antenna coming out of top right of head */}
                  <path d="M 82,28 L 90,22 L 85,18 L 93,12" stroke="#4f6f89" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />

                  {/* Chubby Monster Body with 2 Cat/Devil Ears */}
                  <path
                    d="M 36,32 
                       C 32,20 28,14 26,12 C 24,10 32,24 38,30 
                       C 48,24 62,24 70,28 
                       C 76,22 84,10 82,12 C 80,14 76,20 74,30 
                       C 88,40 94,58 90,75 
                       C 86,90 78,102 68,108 
                       C 64,118 56,125 46,122 
                       C 38,120 34,110 32,104 
                       C 24,102 16,92 14,80 
                       C 12,65 20,42 36,32 Z"
                    fill="url(#mascotGrad)"
                    stroke="#141e28"
                    strokeWidth="2.5"
                  />

                  {/* Left Arm Raised High Waving Up */}
                  <path
                    d="M 28,52 C 16,42 8,24 16,18 C 24,14 28,28 32,44 Z"
                    fill="url(#mascotGrad)"
                    stroke="#141e28"
                    strokeWidth="2"
                  />
                  <circle cx="12" cy="20" r="4.5" fill="#557691" />

                  {/* Right Arm */}
                  <path
                    d="M 82,62 C 92,68 96,78 88,82 C 82,85 78,74 76,66 Z"
                    fill="url(#mascotGrad)"
                    stroke="#141e28"
                    strokeWidth="1.5"
                  />

                  {/* Left Stubby Foot */}
                  <path
                    d="M 28,100 C 18,105 12,115 16,122 C 22,128 33,124 36,112 Z"
                    fill="#45627a"
                    stroke="#141e28"
                    strokeWidth="2"
                  />

                  {/* Right Stubby Foot */}
                  <path
                    d="M 58,110 C 58,120 64,128 72,126 C 78,124 80,114 74,106 Z"
                    fill="#45627a"
                    stroke="#141e28"
                    strokeWidth="2"
                  />

                  {/* Big Single Eye in Middle of Face */}
                  <circle cx="56" cy="52" r="16" fill="#1b2a37" stroke="#253847" strokeWidth="2.5" />
                  <circle cx="56" cy="52" r="11" fill="#557691" />
                  <circle cx="56" cy="52" r="7" fill="#111922" />
                  <circle cx="53" cy="49" r="2.5" fill="#ffffff" />

                  {/* Small Frowning Mouth (⌒) below eye */}
                  <path d="M 50,76 Q 56,71 62,76" stroke="#182532" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                </g>
              </g>

            </g>

            {/* ── DIGIT 3 (4 or 0) ── */}
            {code[2] === "4" ? (
              <g id="digit-3-4">
                {/* 3D Extrusion Depth */}
                <path
                  d="M 590,110 L 750,110 L 750,220 L 800,220 L 800,110 L 860,110 L 860,340 L 800,340 L 800,270 L 590,270 Z"
                  fill="#0c131a"
                />
                {/* Main Front Face */}
                <path
                  d="M 580,100 L 740,100 L 740,210 L 790,210 L 790,100 L 850,100 L 850,330 L 790,330 L 790,260 L 580,260 Z"
                  fill="url(#stakeNumGrad)"
                  stroke="#1b2a37"
                  strokeWidth="2"
                />
                {/* Inner Cutout Hole */}
                <polygon points="645,155 735,155 735,210 645,210" fill="#1b2a37" />
              </g>
            ) : (
              <g id="digit-3-0">
                <ellipse cx="670" cy="210" rx="138" ry="162" fill="url(#stakeNumGrad)" stroke="#1b2a37" strokeWidth="2" />
                <ellipse cx="670" cy="210" rx="78" ry="108" fill="#1b2a37" />
              </g>
            )}

          </svg>
        </div>

        {/* ── STAKE.COM EXACT TEXT & BUTTON ── */}
        <div className="flex flex-col items-center max-w-lg px-2">
          {/* Title */}
          <h1 className="text-lg sm:text-xl font-bold tracking-normal text-white mb-2">
            {title}
          </h1>

          {/* Subtitle (2 lines matching Stake's exact layout) */}
          <p className="mb-6 text-xs leading-relaxed text-neutral-500 sm:text-[13px]">
            {description1}
            <br />
            {description2}
          </p>

          {/* Single Button matching Stake's exact design & color (#2f4558) */}
          {isServerError && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white px-6 text-xs font-bold text-black shadow-lg shadow-black/20 transition-colors hover:bg-neutral-200 sm:text-[13px]"
            >
              Thử lại ngay
            </button>
          ) : (
            <Link
              href="/"
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white px-6 text-xs font-bold text-black shadow-lg shadow-black/20 transition-colors hover:bg-neutral-200 sm:text-[13px]"
            >
              Đi tới trang chủ
            </Link>
          )}
        </div>

      </section>
    </main>
  );
}
