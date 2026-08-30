"use client";

import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import React from "react";

// ── 1. CINEMATIC TRENDING FLAME (Sắc nét, Hiện đại, Chuẩn rạp phim) ───────────
const flameFlicker = keyframes`
  0%, 100% {
    transform: scale(1) translateY(0) rotate(0deg);
    filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.5));
  }
  25% {
    transform: scale(1.04, 0.98) translateY(-0.5px) rotate(0.8deg);
    filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.65));
  }
  50% {
    transform: scale(0.98, 1.03) translateY(-1px) rotate(-0.8deg);
    filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.7));
  }
  75% {
    transform: scale(1.03, 0.99) translateY(-0.5px) rotate(0.5deg);
    filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.6));
  }
`;

const innerCorePulse = keyframes`
  0%, 100% {
    transform: scale(1) translateY(0);
    opacity: 0.95;
  }
  50% {
    transform: scale(1.08, 0.95) translateY(-0.6px);
    opacity: 1;
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
  animation: ${flameFlicker} 1.8s ease-in-out infinite;
`;

const InnerPath = styled.path`
  transform-origin: 50% 85%;
  animation: ${innerCorePulse} 1.4s ease-in-out infinite;
`;

export function EmotionBurningFlame({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <FlameContainer $size={size} className={className}>
      <FlameSvg viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient
            id="netphimFlameGrad"
            x1="0%"
            y1="100%"
            x2="0%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#b91c1c" />
            <stop offset="40%" stopColor="#ef4444" />
            <stop offset="80%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>

          <linearGradient
            id="netphimFlameInnerGrad"
            x1="0%"
            y1="100%"
            x2="0%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="90%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        {/* Outer sharp stylized flame path */}
        <path
          d="M12 2C11.3 4.2 10.1 5.9 10.6 7.6C8.7 5.7 8.2 4.1 8.2 4.1C5.6 7.3 5 10.4 5.5 13.1C6.2 17.2 9 21.5 12 21.5C15 21.5 17.8 17.2 18.5 13.1C19.1 8.8 16.5 5.2 13.8 3C13.8 4.7 13.1 5.9 11.8 6.5C12.4 4.8 12.4 3.5 12 2Z"
          fill="url(#netphimFlameGrad)"
        />

        {/* Inner intense luminous core */}
        <InnerPath
          d="M12 8.5C11.3 10 10.6 11.4 11 12.6C9.7 11 9.1 9.9 9.1 9.9C7.4 11.9 7.2 13.9 7.5 15.6C7.9 18.2 9.8 20 12 20C14.2 20 16.1 18.2 16.5 15.6C16.8 13 15.2 10.7 13.3 9.4C13.3 10.4 12.8 11.2 11.9 11.5C12.3 10.4 12.3 9.5 12 8.5Z"
          fill="url(#netphimFlameInnerGrad)"
        />
      </FlameSvg>
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
    box-shadow: 0 0 8px rgba(251, 191, 36, 0.35);
  }
  50% {
    box-shadow: 0 0 14px rgba(251, 191, 36, 0.6);
  }
`;

const AdminAvatarContainer = styled.div<{ $size?: number }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${(props) => props.$size || 34}px;
  height: ${(props) => props.$size || 34}px;
  border-radius: 50%;
  padding: 1.5px;
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
      #f59e0b 90deg,
      #fff8dc 180deg,
      #d97706 270deg,
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

// ── 3. ADMIN PILL BADGE ──────────────────────────────────────────────────────

const AdminPillBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 6px;
  border-radius: 9999px;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.3);
  color: #fcd34d;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  line-height: 1.2;
  text-transform: uppercase;
  user-select: none;
`;

export function EmotionAdminBadge({ label = "ADMIN" }: { label?: string }) {
  return <AdminPillBadge>{label}</AdminPillBadge>;
}
