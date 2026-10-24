'use client';

import { useState, useEffect } from 'react';
import { RotateCcw, Heart, MonitorSmartphone, BookmarkCheck, LogIn } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAuthModalStore } from '@/store/authModalStore';
import { useTranslation } from '@/store/langStore';
import { cardFont } from '@/lib/fonts';
import { cn } from '@/lib/utils';

interface AuthHistoryCalloutBannerProps {
  className?: string;
}

const CDN_BASE = process.env.NEXT_PUBLIC_CDN_ASSETS_URL?.replace(/\/$/, '') || '';
const MASCOT_IMG_PATH =
  '/Folder-Background/form%20login/bzvn-review-phim-ga-kim-thoa-ban-chuyen-the-khong-khop-voi-tinh-than-cua-nguyen-tac-thumb.png';
const MASCOT_IMG_SRC = `${CDN_BASE}${MASCOT_IMG_PATH}`;

export function AuthHistoryCalloutBanner({ className }: AuthHistoryCalloutBannerProps) {
  const [mounted, setMounted] = useState(false);
  const { user } = useAuthStore();
  const openAuthModal = useAuthModalStore((state) => state.openModal);
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only render for unauthenticated / guest visitors once mounted
  if (!mounted || user) {
    return null;
  }

  return (
    <section
      data-auth-history-banner="true"
      aria-label={t('auth.bannerAriaLabel', 'Đăng nhập để lưu tiến trình xem phim')}
      className={cn(
        'relative overflow-hidden rounded-xl',
        'bg-[#1a1b20] border border-[#2c2d36]',
        'px-4 py-3.5 sm:px-6 sm:py-4 md:px-7 md:py-4.5',
        cardFont.className,
        className,
      )}
    >
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-6 lg:gap-8">
        {/* Left Column: Title, Subtitle, CTA Button */}
        <div className="w-full md:w-auto md:max-w-sm lg:max-w-md xl:max-w-lg shrink-0 pr-16 sm:pr-0">
          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white leading-snug">
            {t('auth.bannerTitle', 'Đăng nhập để lưu phim xem tiếp')}
          </h3>

          <p className="text-xs lg:text-sm text-neutral-400 mt-1 leading-relaxed max-w-md">
            {t(
              'auth.bannerSubtitle',
              'Lưu phim đang xem, đồng bộ trên nhiều thiết bị, tạo danh sách riêng — hoàn toàn miễn phí.',
            )}
          </p>

          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="mt-3 inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-xs sm:text-sm transition-colors cursor-pointer active:scale-95"
          >
            <LogIn className="w-3.5 h-3.5 text-neutral-900" />
            <span>{t('auth.login', 'Đăng nhập')}</span>
          </button>
        </div>

        {/* Center Column: 4 Feature Items Centered in the available space */}
        <div className="flex-1 flex items-center justify-start md:justify-center px-0 md:px-4 lg:px-8">
          <div className="grid grid-cols-2 gap-x-5 sm:gap-x-8 lg:gap-x-10 xl:gap-x-12 gap-y-2.5 sm:gap-y-3">
            <div className="flex items-center gap-2.5 text-xs lg:text-[13px] text-neutral-300">
              <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300 shrink-0">
                <RotateCcw className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
              </div>
              <span className="whitespace-nowrap">{t('auth.benefitProgress', 'Lưu tiến trình xem')}</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs lg:text-[13px] text-neutral-300">
              <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300 shrink-0">
                <Heart className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
              </div>
              <span className="whitespace-nowrap">{t('auth.benefitFavorite', 'Thêm phim yêu thích')}</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs lg:text-[13px] text-neutral-300">
              <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300 shrink-0">
                <MonitorSmartphone className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
              </div>
              <span className="whitespace-nowrap">{t('auth.benefitSync', 'Đồng bộ đa thiết bị')}</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs lg:text-[13px] text-neutral-300">
              <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300 shrink-0">
                <BookmarkCheck className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
              </div>
              <span className="whitespace-nowrap">{t('auth.benefitWatchlist', 'Tạo danh sách riêng')}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Costume Characters Mascot (Desktop/Tablet) - Balanced Proportion */}
        <div className="relative shrink-0 hidden sm:flex items-end justify-center self-end -mb-3.5 sm:-mb-4 md:-mb-4.5 -mr-3 sm:-mr-4 md:-mr-5">
          <img
            src={MASCOT_IMG_SRC}
            alt="Mascot"
            onError={(e) => {
              if (e.currentTarget.src !== MASCOT_IMG_PATH) {
                e.currentTarget.src = MASCOT_IMG_PATH;
              }
            }}
            className="h-36 sm:h-40 md:h-44 lg:h-48 w-auto object-contain object-bottom select-none pointer-events-none"
            loading="lazy"
          />
        </div>

        {/* Mobile Top-Right Costume Characters Mascot */}
        <div
          aria-hidden="true"
          className="sm:hidden absolute top-1 right-2 w-20 h-20 pointer-events-none flex items-start justify-end"
        >
          <img
            src={MASCOT_IMG_SRC}
            alt=""
            onError={(e) => {
              if (e.currentTarget.src !== MASCOT_IMG_PATH) {
                e.currentTarget.src = MASCOT_IMG_PATH;
              }
            }}
            className="h-20 w-auto object-contain object-right-top"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
