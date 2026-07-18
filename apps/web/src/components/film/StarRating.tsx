'use client';
import { useState } from 'react';

interface StarRatingProps {
  value?: number;       // 0.5 - 5.0
  onChange?: (val: number) => void;
  readonly?: boolean;
  size?: number;
  showValue?: boolean;
}

export function StarRating({ value = 0, onChange, readonly = false, size = 20, showValue = false }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const displayValue = hovered !== null ? hovered : value;
  const stars = [1, 2, 3, 4, 5];

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <div className="star-rating" style={{ gap: 2 }}>
        {stars.map((star) => {
          const filled = displayValue >= star;
          const halfFilled = displayValue >= star - 0.5 && displayValue < star;

          return (
            <button
              key={star}
              disabled={readonly}
              onClick={() => !readonly && onChange?.(star)}
              onMouseEnter={() => !readonly && setHovered(star)}
              onMouseLeave={() => !readonly && setHovered(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: readonly ? 'default' : 'pointer',
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
                    fill={filled ? 'var(--star-color)' : 'var(--border)'}
                    stroke="none"
                  />
                )}
              </svg>
            </button>
          );
        })}
      </div>
      {showValue && value > 0 && (
        <span style={{ fontSize: '0.82rem', color: 'var(--star-color)', fontWeight: 600 }}>
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
