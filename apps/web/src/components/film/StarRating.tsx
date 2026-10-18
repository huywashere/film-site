"use client";

import { useState, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import { useToast } from "@/providers/ToastProvider";

interface StarRatingProps {
  value?: number; // 0.5 - 5.0
  onChange?: (val: number) => void;
  readonly?: boolean;
  size?: number;
  showValue?: boolean;
}

export function StarRating({
  value = 0,
  onChange,
  readonly = false,
  size = 20,
  showValue = false,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthModalStore((s) => s.openModal);
  const { toast } = useToast();
  const lastPromptRef = useRef(0);

  const requireAuth = () => {
    if (!user && !readonly) {
      const now = Date.now();
      if (now - lastPromptRef.current > 2500) {
        lastPromptRef.current = now;
        toast("Vui lòng đăng nhập để đánh giá phim.", "warning");
        openAuthModal("login");
      }
      return true;
    }
    return false;
  };

  const displayValue = hovered !== null ? hovered : value;
  const stars = [1, 2, 3, 4, 5];

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <style>{`
        @keyframes star-shake {
          0% { transform: rotate(0deg) scale(1.1); }
          25% { transform: rotate(-8deg) scale(1.1); }
          75% { transform: rotate(8deg) scale(1.1); }
          100% { transform: rotate(0deg) scale(1.1); }
        }
        .star-rating-btn {
          transition: all 0.15s ease;
        }
        .star-rating-btn:hover {
          animation: star-shake 0.3s ease-in-out infinite;
        }
        .star-rating-btn:hover svg path {
          fill: #fbbf24 !important;
          filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.8));
        }
      `}</style>
      <div className="star-rating" style={{ display: "inline-flex", gap: 2 }}>
        {stars.map((star) => {
          const filled = displayValue >= star;
          const halfFilled = displayValue >= star - 0.5 && displayValue < star;

          return (
            <button
              key={star}
              disabled={readonly}
              onClick={() => {
                if (!readonly) {
                  if (requireAuth()) return;
                  onChange?.(star);
                }
              }}
              onMouseEnter={() => {
                if (!readonly) {
                  if (requireAuth()) return;
                  setHovered(star);
                }
              }}
              onMouseLeave={() => !readonly && setHovered(null)}
              className={!readonly ? "star-rating-btn" : ""}
              style={{
                background: "none",
                border: "none",
                cursor: readonly ? "default" : "pointer",
                padding: 0,
                lineHeight: 1,
              }}
              title={`${star} sao`}
            >
              <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                {halfFilled ? (
                  <>
                    <defs>
                      <linearGradient id={`half-${star}`}>
                        <stop offset="50%" stopColor="var(--star-color)" />
                        <stop offset="50%" stopColor="var(--border)" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                      fill={`url(#half-${star})`}
                      stroke="none"
                    />
                  </>
                ) : (
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill={filled ? "var(--star-color)" : "var(--border)"}
                    stroke="none"
                  />
                )}
              </svg>
            </button>
          );
        })}
      </div>
      {showValue && value > 0 && (
        <span
          style={{
            fontSize: "0.82rem",
            color: "var(--star-color)",
            fontWeight: 600,
          }}
        >
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
