'use client';

import Image from 'next/image';
import { memo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cardFont } from '@/lib/fonts';

export interface VerticalTabsHeroBannerProps {
  badge?: string;
  badgeIcon?: React.ReactNode;
  title?: string;
  highlightText?: string;
  highlightClassName?: string;
  description?: string;
  variant?: 'large' | 'compact';
  pureCover?: boolean;
  showTitle?: boolean;
  imageSrc?: string;
  blurDataURL?: string;
  objectPosition?: string;
  imageClassName?: string;
  onBack?: () => void;
  backText?: string;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

const DEFAULT_HERO_BG_PATH = '/img-backtop/tab-genres.webp';
const DEFAULT_HERO_BLUR_DATA_URL =
  'data:image/webp;base64,UklGRrwAAABXRUJQVlA4ILAAAABQBQCdASogABIAPzmEuFOvKCUisAgB4CcJYwC/7BQ3v5mBu5etyb2XlLK7ybl4WESn/QAA/j/WrGUZKzfMd+2yJUlM3f/lUeMbv2wHHabRl4JoRomOqnDTkQi0dpnNG9JvC6KC8ucO+OUFgVo3llWbpnTXTbBvfHHrMxVonbWS+cJlEEoVTj137ze8CNoYSmrzVYqsv4ErsfQDBGM21iB57pPMK1Nm+c+/GolHi60AAA==';

function VerticalTabsHeroBannerComponent({
  badge,
  badgeIcon,
  title,
  highlightText,
  highlightClassName,
  description,
  variant = 'large',
  pureCover = false,
  showTitle = true,
  imageSrc: customImageSrc,
  blurDataURL: customBlurDataURL,
  objectPosition = 'center 15%',
  imageClassName,
  onBack,
  backText = 'Quay lại',
  children,
  className,
  contentClassName,
}: VerticalTabsHeroBannerProps) {
  const isCompact = variant === 'compact';
  const targetImageSrc = customImageSrc || DEFAULT_HERO_BG_PATH;
  const targetBlurDataURL = customBlurDataURL || DEFAULT_HERO_BLUR_DATA_URL;
  const [imageSrc, setImageSrc] = useState(targetImageSrc);

  return (
    <section
      data-hero-banner="true"
      aria-label={title || 'Ảnh bìa chủ đề điện ảnh'}
      className={cn(
        'relative w-full select-none overflow-hidden bg-[#0a0b10]',
        // Balanced cinematic height so faces and characters are visible while content is raised up nicely
        isCompact
          ? 'h-[32svh] min-h-[260px] sm:h-[35vh] sm:min-h-[280px] md:h-[38vh] md:min-h-[310px] lg:h-[40vh] lg:min-h-[340px]'
          : 'h-[44svh] min-h-[360px] sm:h-[44vh] sm:min-h-[360px] md:h-[48vh] md:min-h-[400px] lg:h-[50vh] lg:min-h-[440px] xl:h-[52vh] xl:min-h-[480px]',
        className,
      )}
    >
      {/* ── Layer 1: Hardware-Accelerated Poster Collage / Artwork Background (Edge-to-Edge) ── */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <Image
          src={imageSrc}
          alt={title || 'Cinematic movie backdrop'}
          fill
          priority
          fetchPriority="high"
          loading="eager"
          decoding="async"
          unoptimized
          sizes="100vw"
          placeholder="blur"
          blurDataURL={targetBlurDataURL}
          className={cn(
            'w-full h-full object-cover select-none transition-transform duration-300',
            // Lower image down on mobile so character heads and faces are not hidden behind navbar or top edge
            'translate-y-[84px] sm:translate-y-0 scale-[1.08] sm:scale-100',
            imageClassName,
          )}
          style={{ objectPosition, imageRendering: '-webkit-optimize-contrast' }}
        />
      </div>

      {/* ── Layer 2: Multi-Directional Soft Protective Overlays ── */}
      {/* Top navbar protection gradient */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 sm:h-28 bg-gradient-to-b from-[#0a0b10]/90 via-[#0a0b10]/35 to-transparent z-10"
        aria-hidden="true"
      />

      {/* Directional left reading gradient for crystal-clear typography on the left while artwork shines on the right */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a0b10]/95 via-[#0a0b10]/75 via-45% to-black/20 z-10"
        aria-hidden="true"
      />

      {/* Deep bottom-to-top gradient that dissolves the banner seamlessly into the body background (#0a0b10) */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-36 sm:h-48 md:h-56 bg-gradient-to-t from-[#0a0b10] via-[#0a0b10]/85 via-40% to-transparent z-10"
        aria-hidden="true"
      />

      {/* Atmospheric ambient studio glow */}
      <div
        className="pointer-events-none absolute -bottom-10 left-1/4 w-[500px] h-[250px] bg-sky-500/10 blur-[130px] rounded-full z-10"
        aria-hidden="true"
      />

      {/* ── Layer 3: Foreground Content (Embedded cleanly with navbar clearance) ── */}
      {(showTitle || !pureCover) && (title || children) && (
        <div
          className={cn(
            'relative z-20 w-full h-full flex flex-col justify-end px-3.5 sm:px-6 md:pl-20 lg:pl-24 pr-3.5 sm:pr-6 md:pr-10 pt-24 sm:pt-28 md:pt-32 pb-6 sm:pb-8',
            contentClassName,
          )}
        >
          <div className="max-w-4xl space-y-2 sm:space-y-2.5">
            {/* Optional Back Button */}
            {onBack && (
              <div className="mb-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-neutral-300 hover:text-white transition-all cursor-pointer active:scale-95 group shadow-sm backdrop-blur-md"
                >
                  <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
                  <span>{backText}</span>
                </button>
              </div>
            )}

            {/* Optional Badge */}
            {badge && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/15 backdrop-blur-md shadow-sm">
                {badgeIcon && (
                  <span className="text-sky-400 shrink-0">{badgeIcon}</span>
                )}
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white">
                  {badge}
                </span>
              </div>
            )}

            {/* Title & Highlight */}
            {title && (
              <h1
                className={cn(
                  cardFont.className,
                  'text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]',
                )}
              >
                {title}{' '}
                {highlightText && (
                  <span
                    className={
                      highlightClassName ||
                      'bg-gradient-to-r from-white via-sky-100 to-sky-300 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(35,173,229,0.35)]'
                    }
                  >
                    {highlightText}
                  </span>
                )}
              </h1>
            )}

            {/* Description / Stats Subtitle */}
            {description && (
              <p className="text-xs sm:text-sm md:text-base text-neutral-300 font-medium max-w-2xl leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                {description}
              </p>
            )}

            {/* Children Slot: Sub-Tabs & Actions embedded directly into the banner baseline */}
            {children && <div className="pt-2 sm:pt-3">{children}</div>}
          </div>
        </div>
      )}
    </section>
  );
}

export const VerticalTabsHeroBanner = memo(VerticalTabsHeroBannerComponent);
