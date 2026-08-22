"use client";

import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import React from "react";

// ── 1. FLAME ANIMATION (Ngọn lửa bốc cháy chân thực) ──────────────────────────
const flameFlicker = keyframes`
  0% {
    transform: scale(1) rotate(-1.5deg);
    filter: drop-shadow(0 0 4px #ff1744) drop-shadow(0 0 10px #ff5252);
  }
  20% {
    transform: scale(1.08, 0.94) rotate(1deg) translateY(-0.5px);
    filter: drop-shadow(0 0 7px #ff1744) drop-shadow(0 0 14px #ff5252);
  }
  40% {
    transform: scale(0.95, 1.05) rotate(-2deg) translateY(-1px);
    filter: drop-shadow(0 0 5px #ff1744) drop-shadow(0 0 11px #ff1744);
  }
  60% {
    transform: scale(1.06, 0.96) rotate(2deg) translateY(-0.5px);
    filter: drop-shadow(0 0 8px #ff1744) drop-shadow(0 0 16px #ff5252);
  }
  80% {
    transform: scale(0.97, 1.03) rotate(-1deg) translateY(-1px);
    filter: drop-shadow(0 0 6px #ff1744) drop-shadow(0 0 12px #ff1744);
  }
  100% {
    transform: scale(1) rotate(-1.5deg);
    filter: drop-shadow(0 0 4px #ff1744) drop-shadow(0 0 10px #ff5252);
  }
`;

const emberRise1 = keyframes`
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.3);
  }
  30% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(-3px, -15px) scale(1);
  }
`;

const emberRise2 = keyframes`
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.3);
  }
  40% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(4px, -18px) scale(0.9);
  }
`;

const FlameContainer = styled.div<{ $size: number }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  flex-shrink: 0;
  user-select: none;
`;

const FlameSvg = styled.svg`
  width: 100%;
  height: 100%;
  transform-origin: 50% 90%;
  animation: ${flameFlicker} 1.2s ease-in-out infinite;
`;

const EmberSpark1 = styled.span`
  position: absolute;
  top: 15%;
  left: 20%;
  width: 2.5px;
  height: 2.5px;
  border-radius: 50%;
  background: #ff80ab;
  box-shadow: 0 0 4px #ff1744;
  animation: ${emberRise1} 1.1s ease-out infinite;
  pointer-events: none;
`;

const EmberSpark2 = styled.span`
  position: absolute;
  top: 25%;
  right: 20%;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #ff4081;
  box-shadow: 0 0 4px #f50057;
  animation: ${emberRise2} 1.4s ease-out 0.35s infinite;
  pointer-events: none;
`;

export function EmotionBurningFlame({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <FlameContainer $size={size} className={className}>
      <FlameSvg viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="neonRedFlameOuter" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#880e4f" />
            <stop offset="35%" stopColor="#d50000" />
            <stop offset="70%" stopColor="#ff1744" />
            <stop offset="100%" stopColor="#ff4081" />
          </linearGradient>
          <linearGradient id="neonRedFlameInner" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#c51162" />
            <stop offset="40%" stopColor="#ff1744" />
            <stop offset="75%" stopColor="#ff80ab" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        {/* Outer flame silhouette */}
        <path
          d="M12 1.5C10.8 4 9.5 6 10.2 7.8C8 5.8 7.2 4.2 7.2 4.2C4.5 7.5 4 10.8 4.6 13.5C5.2 17.8 8.6 22 12 22C15.4 22 18.8 17.8 19.4 13.5C20 9.2 17.2 5.5 14 3.2C14 5 13.2 6.2 11.8 6.8C12.5 5 12.5 3.2 12 1.5Z"
          fill="url(#neonRedFlameOuter)"
        />

        {/* Inner intense flame core */}
        <path
          d="M12 7.5C11.1 9.2 10.4 10.8 10.9 12.2C9.4 10.5 8.7 9.3 8.7 9.3C6.8 11.5 6.5 13.8 6.9 15.6C7.3 18.6 9.5 20.6 12 20.6C14.5 20.6 16.7 18.6 17.1 15.6C17.5 12.7 15.6 10.1 13.4 8.7C13.4 9.8 12.9 10.7 11.9 11C12.3 9.8 12.3 8.7 12 7.5Z"
          fill="url(#neonRedFlameInner)"
        />
      </FlameSvg>
      <EmberSpark1 />
      <EmberSpark2 />
    </FlameContainer>
  );
}

// ── 2. ADMIN GOLDEN AVATAR AURA & BADGES ─────────────────────────────────────

const rotateAura = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const goldGlowPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.4), 0 0 20px rgba(255, 170, 0, 0.2);
  }
  50% {
    box-shadow: 0 0 18px rgba(255, 220, 50, 0.75), 0 0 30px rgba(255, 140, 0, 0.4);
  }
`;

// Khung viền vàng kim hoàng gia bao quanh avatar của Admin
const AdminAvatarContainer = styled.div<{ $size?: number }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${(props) => props.$size || 34}px;
  height: ${(props) => props.$size || 34}px;
  border-radius: 50%;
  padding: 2.5px;
  flex-shrink: 0;
  animation: ${goldGlowPulse} 3s ease-in-out infinite;

  &::before {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      #ffd700 0deg,
      #ffaa00 90deg,
      #fff8dc 180deg,
      #ff8c00 270deg,
      #ffd700 360deg
    );
    animation: ${rotateAura} 4s linear infinite;
    z-index: 0;
  }
`;

const AdminAvatarImgWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background: #111;
  z-index: 1;
  border: 1px solid rgba(0, 0, 0, 0.6);
`;

export function EmotionAdminAvatar({
  src,
  alt,
  size = 32,
}: {
  src: string;
  alt: string;
  size?: number;
}) {
  return (
    <AdminAvatarContainer $size={size}>
      <AdminAvatarImgWrapper>
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              `https://ui-avatars.com/api/?name=${encodeURIComponent(alt)}&background=d97706&color=ffffff&size=64`;
          }}
        />
      </AdminAvatarImgWrapper>
    </AdminAvatarContainer>
  );
}

// ── 3. ADMIN YELLOW PILL BADGE ──────────────────────────────────────────────

const AdminPillBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 5px;
  border-radius: 4px;
  background: #facc15; /* Yellow-400 */
  color: #000000;
  font-size: 9.5px;
  font-weight: 900;
  letter-spacing: 0.04em;
  line-height: 1.2;
  text-transform: uppercase;
  box-shadow: 0 1px 4px rgba(250, 204, 21, 0.4);
  user-select: none;
`;

export function EmotionAdminBadge({ label = "ADMIN" }: { label?: string }) {
  return <AdminPillBadge>{label}</AdminPillBadge>;
}
