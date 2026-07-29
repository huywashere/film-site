"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("System Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#111a24] text-white flex flex-col items-center justify-center px-4 py-16 text-center select-none font-sans relative overflow-hidden">
      {/* ── Stake.com Signature 500 Watermark with Floating Mascot Vector ── */}
      <div className="relative flex items-center justify-center font-black tracking-tighter text-[#1e2a39] select-none text-[140px] sm:text-[220px] md:text-[280px] lg:text-[340px] leading-none mb-6">
        <span className="font-extrabold text-[#1c2736]">5</span>

        {/* Stake Mascot Portal inside the first 0 */}
        <div className="relative w-28 h-28 sm:w-44 sm:h-44 md:w-56 md:h-56 lg:w-64 lg:h-64 rounded-full bg-[#131c27] border-[8px] sm:border-[12px] border-[#1c2736] flex items-center justify-center overflow-hidden shadow-2xl mx-1 sm:mx-2 shrink-0">
          <motion.div
            animate={{ y: [-5, 5, -5], rotate: [3, -3, 3] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full flex items-center justify-center"
          >
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full p-2 select-none"
            >
              {/* Cratered Moon */}
              <g transform="translate(35, 125)">
                <circle cx="15" cy="15" r="14" fill="#2d3d52" />
                <circle cx="10" cy="12" r="3" fill="#1e2a39" />
                <circle cx="18" cy="20" r="2.5" fill="#1e2a39" />
              </g>

              {/* Satellite */}
              <g transform="translate(135, 120)">
                <rect
                  x="5"
                  y="10"
                  width="20"
                  height="10"
                  fill="#3e536c"
                  rx="2"
                />
                <line
                  x1="15"
                  y1="10"
                  x2="15"
                  y2="4"
                  stroke="#4e6785"
                  strokeWidth="2"
                />
                <circle cx="15" cy="3" r="2" fill="#e11d48" />
              </g>

              {/* Meteor */}
              <g transform="translate(48, 48)">
                <path
                  d="M 0 0 L -14 -14 M -4 5 L -18 -9 M 5 -4 L -9 -18"
                  stroke="#e11d48"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="2" cy="2" r="5" fill="#e11d48" />
              </g>

              {/* Stars */}
              <circle cx="95" cy="30" r="1.5" fill="#587394" />
              <circle cx="155" cy="55" r="2" fill="#587394" />

              {/* Stake Mascot Character */}
              <g transform="translate(100, 95) rotate(10)">
                <path
                  d="M -16 -18 C -22 -30, -8 -28, -8 -18 Z"
                  fill="#445b77"
                />
                <path d="M 16 -18 C 22 -30, 8 -28, 8 -18 Z" fill="#445b77" />
                <path d="M 0 -22 L 0 -30" stroke="#445b77" strokeWidth="2.5" />
                <circle cx="0" cy="-31" r="2.5" fill="#e11d48" />
                <path
                  d="M -22 -8 C -25 -24, 25 -24, 22 -8 C 26 14, -26 14, -22 -8 Z"
                  fill="#445b77"
                />
                <circle cx="-20" cy="2" r="4.5" fill="#445b77" />
                <circle cx="20" cy="2" r="4.5" fill="#445b77" />
                <circle
                  cx="0"
                  cy="-5"
                  r="9"
                  fill="#131c27"
                  stroke="#607d9b"
                  strokeWidth="2.5"
                />
                <circle cx="-1" cy="-5" r="4" fill="#607d9b" />
                <circle cx="1" cy="-7" r="1.5" fill="#ffffff" />
                <path
                  d="M -4 4 Q 0 1 4 4"
                  fill="none"
                  stroke="#131c27"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            </svg>
          </motion.div>
        </div>

        <span className="font-extrabold text-[#1c2736]">0</span>
      </div>

      {/* ── Stake.com Title & Subtitle ── */}
      <div className="space-y-1.5 max-w-md mx-auto z-10">
        <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
          Oops! Đã xảy ra lỗi hệ thống.
        </h1>
        <p className="text-xs text-neutral-400 font-medium leading-relaxed">
          Có thể hệ thống đang bảo trì <br className="hidden sm:block" />
          hoặc gặp sự cố tạm thời.
        </p>
      </div>

      {/* ── Stake.com Action Buttons ── */}
      <div className="mt-6 z-10 flex items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 bg-[#00e054] hover:bg-[#00c749] text-black font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all duration-200 active:scale-95 cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>Thử lại</span>
        </button>

        <Link
          href="/"
          className="inline-flex items-center justify-center bg-[#2f455c] hover:bg-[#3b5570] text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md border border-white/10 transition-all duration-200 active:scale-95 cursor-pointer"
        >
          Đi tới trang chủ
        </Link>
      </div>
    </div>
  );
}
