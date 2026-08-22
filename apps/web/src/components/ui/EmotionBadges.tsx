"use client";

import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import React from "react";

// Keyframe 1: Ngọn lửa bập bùng, uốn lượn liên tục
const flameDance = keyframes`
  0% {
    transform: scale(1) rotate(-1deg);
    filter: drop-shadow(0 0 6px rgba(255, 69, 0, 0.7)) drop-shadow(0 0 12px rgba(255, 140, 0, 0.5));
  }
  25% {
    transform: scale(1.08, 0.95) rotate(2deg) translateY(-1px);
    filter: drop-shadow(0 0 10px rgba(255, 50, 0, 0.9)) drop-shadow(0 0 18px rgba(255, 165, 0, 0.7));
  }
  50% {
    transform: scale(0.96, 1.06) rotate(-2deg) translateY(-2px);
    filter: drop-shadow(0 0 8px rgba(255, 80, 0, 0.8)) drop-shadow(0 0 15px rgba(255, 120, 0, 0.6));
  }
  75% {
    transform: scale(1.05, 0.98) rotate(1.5deg) translateY(-1px);
    filter: drop-shadow(0 0 12px rgba(255, 40, 0, 0.95)) drop-shadow(0 0 20px rgba(255, 180, 0, 0.8));
  }
  100% {
    transform: scale(1) rotate(-1deg);
    filter: drop-shadow(0 0 6px rgba(255, 69, 0, 0.7)) drop-shadow(0 0 12px rgba(255, 140, 0, 0.5));
  }
`;

// Keyframe 2: Đốm tàn lửa bay lên
const emberFly = keyframes`
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.4);
  }
  40% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(-3px, -14px) scale(1.1);
  }
`;

const emberFlyRight = keyframes`
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.4);
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(4px, -16px) scale(0.9);
  }
`;

// Container chứa ngọn lửa
const FlameWrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  user-select: none;
  flex-shrink: 0;
`;

// SVG Ngọn lửa chính có hiệu ứng bùng cháy
const AnimatedFlameSvg = styled.svg`
  width: 100%;
  height: 100%;
  transform-origin: 50% 90%;
  animation: ${flameDance} 1.4s ease-in-out infinite;
`;

// Tàn lửa bay 1
const Ember1 = styled.span`
  position: absolute;
  top: 4px;
  left: 6px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #ffcc00;
  box-shadow: 0 0 4px #ff6600;
  animation: ${emberFly} 1.2s ease-out infinite;
  pointer-events: none;
`;

// Tàn lửa bay 2
const Ember2 = styled.span`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 2.5px;
  height: 2.5px;
  border-radius: 50%;
  background: #ff4500;
  box-shadow: 0 0 4px #ff3300;
  animation: ${emberFlyRight} 1.5s ease-out 0.4s infinite;
  pointer-events: none;
`;

/**
 * Component icon ngọn lửa rực cháy (Burning Animated Flame) bằng Emotion JS
 */
export function EmotionBurningFlame({ size = 22 }: { size?: number }) {
  return (
    <FlameWrapper style={{ width: size, height: size }}>
      <AnimatedFlameSvg viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="fireOuterGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="45%" stopColor="#ff4500" />
            <stop offset="80%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="fireInnerGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ff1e00" />
            <stop offset="50%" stopColor="#ff7700" />
            <stop offset="100%" stopColor="#fffbeb" />
          </linearGradient>
        </defs>

        {/* Ngọn lửa ngoài */}
        <path
          d="M12 2C10.5 4.5 10 6.5 10.5 8C8.5 6 7.5 4.5 7.5 4.5C5 7.5 4.5 10.5 5 13C5.5 17 8.5 21 12 21C15.5 21 18.5 17 19 13C19.5 9 17 5.5 14 3.5C14 5 13.5 6 12 6.5C12.5 5 12.5 3.5 12 2Z"
          fill="url(#fireOuterGrad)"
        />

        {/* Lõi lửa sáng bên trong */}
        <path
          d="M12 8C11.2 9.5 10.8 10.8 11.2 12C9.8 10.5 9.2 9.5 9.2 9.5C7.5 11.5 7.2 13.5 7.5 15.2C7.8 18 9.8 19.8 12 19.8C14.2 19.8 16.2 18 16.5 15.2C16.8 12.5 15.2 10.2 13.2 9C13.2 10 12.8 10.8 12 11C12.2 10 12.2 9 12 8Z"
          fill="url(#fireInnerGrad)"
        />
      </AnimatedFlameSvg>
      <Ember1 />
      <Ember2 />
    </FlameWrapper>
  );
}
