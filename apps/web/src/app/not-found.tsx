"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#111a24] text-white flex flex-col items-center justify-center px-4 py-16 text-center select-none font-sans relative overflow-hidden">
      {/* ── Stake.com Signature 404 Watermark with Floating Mascot Vector ── */}
      <div className="relative flex items-center justify-center font-black tracking-tighter text-[#1e2a39] select-none text-[140px] sm:text-[220px] md:text-[280px] lg:text-[340px] leading-none mb-6">
        <span className="font-extrabold text-[#1c2736]">4</span>

        {/* Stake Mascot Portal inside the 0 */}
        <div className="relative w-28 h-28 sm:w-44 sm:h-44 md:w-56 md:h-56 lg:w-64 lg:h-64 rounded-full bg-[#131c27] border-[8px] sm:border-[12px] border-[#1c2736] flex items-center justify-center overflow-hidden shadow-2xl mx-1 sm:mx-2 shrink-0">
          <motion.div
            animate={{ y: [-5, 5, -5], rotate: [-3, 3, -3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
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
                <circle cx="21" cy="10" r="2" fill="#1e2a39" />
              </g>

              {/* Saturn Planet with Rings */}
              <g transform="translate(135, 125)">
                <ellipse
                  cx="15"
                  cy="15"
                  rx="22"
                  ry="7"
                  fill="none"
                  stroke="#3e536c"
                  strokeWidth="3"
                  transform="rotate(-20 15 15)"
                />
                <circle cx="15" cy="15" r="11" fill="#2d3d52" />
                <path
                  d="M -3 18 A 22 7 0 0 0 32 10"
                  fill="none"
                  stroke="#4e6785"
                  strokeWidth="3"
                  transform="rotate(-20 15 15)"
                />
              </g>

              {/* Meteor with Tail */}
              <g transform="translate(48, 48)">
                <path
                  d="M 0 0 L -14 -14 M -4 5 L -18 -9 M 5 -4 L -9 -18"
                  stroke="#3e536c"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="2" cy="2" r="5" fill="#3e536c" />
                <circle cx="0" cy="0" r="1.5" fill="#1e2a39" />
              </g>

              {/* Scattered Stars */}
              <circle cx="95" cy="30" r="1.5" fill="#587394" />
              <circle cx="155" cy="55" r="2" fill="#587394" />
              <circle cx="130" cy="85" r="1" fill="#587394" />
              <circle cx="70" cy="80" r="1.5" fill="#587394" />
              <circle cx="105" cy="165" r="1.5" fill="#587394" />

              {/* Stake Mascot Character (Cute floating upside-down mascot) */}
              <g transform="translate(100, 95) rotate(-15)">
                {/* Ears */}
                <path
                  d="M -16 -18 C -22 -30, -8 -28, -8 -18 Z"
                  fill="#445b77"
                />
                <path d="M 16 -18 C 22 -30, 8 -28, 8 -18 Z" fill="#445b77" />

                {/* Antenna */}
                <path d="M 0 -22 L 0 -30" stroke="#445b77" strokeWidth="2.5" />
                <circle cx="0" cy="-31" r="2.5" fill="#607d9b" />

                {/* Body */}
                <path
                  d="M -22 -8 C -25 -24, 25 -24, 22 -8 C 26 14, -26 14, -22 -8 Z"
                  fill="#445b77"
                />

                {/* Paws */}
                <circle cx="-20" cy="2" r="4.5" fill="#445b77" />
                <circle cx="20" cy="2" r="4.5" fill="#445b77" />
                <circle cx="-10" cy="12" r="4" fill="#445b77" />
                <circle cx="10" cy="12" r="4" fill="#445b77" />

                {/* Eye socket */}
                <circle
                  cx="0"
                  cy="-5"
                  r="9"
                  fill="#131c27"
                  stroke="#607d9b"
                  strokeWidth="2.5"
                />
                {/* Pupil */}
                <circle cx="-1" cy="-5" r="4" fill="#607d9b" />
                <circle cx="1" cy="-7" r="1.5" fill="#ffffff" />

                {/* Mouth */}
                <path
                  d="M -3 4 Q 0 7 3 4"
                  fill="none"
                  stroke="#131c27"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            </svg>
          </motion.div>
        </div>

        <span className="font-extrabold text-[#1c2736]">4</span>
      </div>

      {/* ── Stake.com Title & Subtitle ── */}
      <div className="space-y-1.5 max-w-md mx-auto z-10">
        <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
          Oops! Trang web bạn tìm kiếm không tồn tại.
        </h1>
        <p className="text-xs text-neutral-400 font-medium leading-relaxed">
          Có thể bạn đã nhập sai địa chỉ <br className="hidden sm:block" />
          hoặc trang web đã di chuyển.
        </p>
      </div>

      {/* ── Stake.com Action Button ── */}
      <div className="mt-6 z-10">
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
