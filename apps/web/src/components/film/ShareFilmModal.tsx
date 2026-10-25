'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Share2,
  Copy,
  Check,
  Send,
  Mail,
  QrCode,
  Sparkles,
  Smartphone,
  ExternalLink,
  MessageCircle,
  MessageSquare,
  Film,
} from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import { useTranslation } from '@/store/langStore';
import { cardFont } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import { resolveImageUrl, type FilmItem } from '@/components/film/FilmCard';

export interface ShareFilmModalProps {
  isOpen: boolean;
  onClose: () => void;
  film?: (FilmItem & {
    time?: string;
    episode_current?: string;
    lang?: string;
    category?: Array<{ name: string; slug?: string }>;
    content?: string;
    origin_name?: string;
  }) | null;
  posterUrl?: string | null;
  customUrl?: string;
}

const PRESET_MESSAGES = [
  'Phim này xem cuốn cực kỳ! 🔥',
  'Cùng cày phim này với mình nhé! 🍿',
  'Phim hành động đỉnh nóc kịch trần 🎬',
  'Đoạn kết bất ngờ lắm luôn! 😱',
];

export function ShareFilmModal({
  isOpen,
  onClose,
  film,
  posterUrl: directPosterUrl,
  customUrl,
}: ShareFilmModalProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  // Check native share availability
  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanNativeShare(true);
    }
  }, []);

  // Compute shareable URL
  const shareUrl = useMemo(() => {
    if (customUrl) return customUrl;
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return '';
  }, [customUrl]);

  const filmTitle = film?.name || film?.title || 'Phim Điện Ảnh';
  const filmOrigin = film?.origin_name || '';
  const filmYear = film?.year ? String(film.year) : '';
  const filmQuality = film?.quality || 'FHD';
  const filmEpOrTime = film?.episode_current || film?.time || '';
  const filmCategories = film?.category?.map((c) => c.name).slice(0, 2).join(' • ') || '';

  // Resolve best poster thumbnail
  const displayPoster = useMemo(() => {
    if (directPosterUrl) return resolveImageUrl(directPosterUrl);
    if (film?.poster_url) return resolveImageUrl(film.poster_url);
    if (film?.thumb_url) return resolveImageUrl(film.thumb_url);
    return null;
  }, [directPosterUrl, film]);

  // Computed share message text
  const computedText = useMemo(() => {
    const trimmed = message.trim();
    if (trimmed) {
      return `${trimmed} - Cùng xem phim "${filmTitle}" trên FlexPhim!`;
    }
    return `Xem phim "${filmTitle}" chất lượng cao trên FlexPhim!`;
  }, [message, filmTitle]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setShowQr(false);
      setCopied(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle Copy Link
  const handleCopyLink = useCallback(() => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast(t('film.copiedLink', 'Đã sao chép liên kết phim vào bộ nhớ tạm!'), 'success');
    setTimeout(() => setCopied(false), 2200);
  }, [shareUrl, toast, t]);

  // Handle Native Share
  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: filmTitle,
          text: computedText,
          url: shareUrl,
        });
      } catch {
        // User dismissed share sheet or aborted
      }
    }
  }, [filmTitle, computedText, shareUrl]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className={cn(
          cardFont.className,
          'fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200',
        )}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'w-full max-w-lg bg-[#0e1218] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.95)]',
            'rounded-t-[28px] sm:rounded-3xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden',
          )}
        >
          {/* ── HEADER ── */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#23ade5]/15 border border-[#23ade5]/30 flex items-center justify-center text-[#23ade5]">
                <Share2 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {t('film.shareFilm', 'Chia Sẻ Phim Trực Tiếp')}
                </h3>
                <p className="text-[11px] text-neutral-400">
                  {t('film.shareSubtitle', 'Gửi ngay cho bạn bè qua mạng xã hội và ứng dụng')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng form chia sẻ"
              className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* ── SCROLLABLE BODY CONTENT ── */}
          <div className="p-5 overflow-y-auto space-y-4 text-xs">
            {/* Film Preview Snippet */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              <div className="relative w-14 h-20 rounded-xl overflow-hidden bg-black/60 shrink-0 border border-white/10 shadow-md">
                {displayPoster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayPoster}
                    alt={filmTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-500">
                    <Film size={20} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h4 className="font-bold text-white text-sm truncate leading-snug">{filmTitle}</h4>
                {filmOrigin && (
                  <p className="text-[11px] text-neutral-400 truncate">{filmOrigin}</p>
                )}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {filmYear && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-neutral-300">
                      {filmYear}
                    </span>
                  )}
                  {filmQuality && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#23ade5]/15 text-[#23ade5] border border-[#23ade5]/30">
                      {filmQuality}
                    </span>
                  )}
                  {filmEpOrTime && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-neutral-300">
                      {filmEpOrTime}
                    </span>
                  )}
                  {filmCategories && (
                    <span className="text-[10px] text-neutral-400 truncate">
                      {filmCategories}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Message Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-neutral-300 font-semibold flex items-center gap-1.5 text-xs">
                  <MessageSquare size={13} className="text-[#23ade5]" />
                  <span>Lời nhắn gửi kèm (tùy chọn)</span>
                </label>
                {message && (
                  <button
                    type="button"
                    onClick={() => setMessage('')}
                    className="text-[10px] text-neutral-400 hover:text-white transition-colors"
                  >
                    Xóa lời nhắn
                  </button>
                )}
              </div>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nhập lời nhắn gửi đến bạn bè... (Ví dụ: Xem phim này cùng tao nhé!)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-[#23ade5] focus:bg-white/[0.08] transition-all text-xs"
              />

              {/* Quick suggestion chips */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {PRESET_MESSAGES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMessage(preset)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer border text-left',
                      message === preset
                        ? 'bg-[#23ade5]/20 text-[#23ade5] border-[#23ade5]/40 font-semibold'
                        : 'bg-white/[0.04] text-neutral-400 border-white/10 hover:bg-white/[0.08] hover:text-white',
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Send Platforms Grid */}
            <div className="space-y-2">
              <span className="text-neutral-400 font-semibold text-[11px] uppercase tracking-wider block">
                Gửi trực tiếp qua ứng dụng
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-medium">
                {/* Facebook */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(computedText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#1877F2]/15 hover:bg-[#1877F2]/25 text-[#1877F2] border border-[#1877F2]/30 transition-all active:scale-95 group"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#1877F2] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <span className="text-xs text-white font-semibold group-hover:text-white">Facebook</span>
                </a>

                {/* Zalo */}
                <a
                  href={`https://zalo.me/share?url=${encodeURIComponent(shareUrl)}&note=${encodeURIComponent(computedText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0068FF]/15 hover:bg-[#0068FF]/25 text-[#0068FF] border border-[#0068FF]/30 transition-all active:scale-95 group"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#0068FF] text-white flex items-center justify-center shrink-0 font-black text-[11px] shadow-sm">
                    Z
                  </div>
                  <span className="text-xs text-white font-semibold group-hover:text-white">Zalo</span>
                </a>

                {/* Telegram */}
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(computedText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#229ED9]/15 hover:bg-[#229ED9]/25 text-[#229ED9] border border-[#229ED9]/30 transition-all active:scale-95 group"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#229ED9] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Send size={13} className="translate-x-[1px]" />
                  </div>
                  <span className="text-xs text-white font-semibold group-hover:text-white">Telegram</span>
                </a>

                {/* WhatsApp */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(computedText + ' ' + shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 transition-all active:scale-95 group"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <MessageCircle size={13} />
                  </div>
                  <span className="text-xs text-white font-semibold group-hover:text-white">WhatsApp</span>
                </a>

                {/* Twitter / X */}
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(computedText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-200 border border-white/20 transition-all active:scale-95 group"
                >
                  <div className="w-6 h-6 rounded-lg bg-black text-white flex items-center justify-center shrink-0 border border-white/20 font-bold text-xs shadow-sm">
                    𝕏
                  </div>
                  <span className="text-xs text-white font-semibold group-hover:text-white">Twitter / X</span>
                </a>

                {/* Email */}
                <a
                  href={`mailto:?subject=${encodeURIComponent(`[FlexPhim] Gợi ý xem phim: ${filmTitle}`)}&body=${encodeURIComponent(`${message ? message + '\n\n' : ''}Cùng xem phim "${filmTitle}" chất lượng cao trên FlexPhim:\n${shareUrl}`)}`}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition-all active:scale-95 group"
                >
                  <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Mail size={13} />
                  </div>
                  <span className="text-xs text-white font-semibold group-hover:text-white">Email</span>
                </a>
              </div>
            </div>

            {/* Native OS Share Button (if available on mobile/tablet) */}
            {canNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-[#23ade5]/20 to-[#3b82f6]/20 hover:from-[#23ade5]/30 hover:to-[#3b82f6]/30 border border-[#23ade5]/40 text-[#23ade5] font-semibold text-xs transition-all active:scale-98 shadow-sm cursor-pointer"
              >
                <Smartphone size={15} />
                <span>Mở bảng chia sẻ hệ thống (AirDrop, Tin nhắn, Bluetooth...)</span>
              </button>
            )}

            {/* Copy Link & QR Code bar */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <span className="text-neutral-400 font-semibold text-[11px] uppercase tracking-wider block">
                Hoặc sao chép liên kết trực tiếp
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-neutral-300 font-mono text-[11px] focus:outline-none truncate select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 cursor-pointer border',
                    copied
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-[#23ade5] hover:bg-[#1fa0d4] text-black border-transparent shadow-sm hover:shadow-cyan-500/20',
                  )}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowQr((p) => !p)}
                  title="Hiện mã QR để quét"
                  aria-label="Hiện mã QR để quét"
                  className={cn(
                    'p-2 rounded-xl border transition-all cursor-pointer shrink-0',
                    showQr
                      ? 'bg-white/20 text-white border-white/30'
                      : 'bg-white/[0.05] text-neutral-400 border-white/10 hover:text-white hover:bg-white/[0.09]',
                  )}
                >
                  <QrCode size={16} />
                </button>
              </div>

              {/* QR Code Expansion */}
              <AnimatePresence>
                {showQr && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden pt-2"
                  >
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col items-center gap-2.5 text-center">
                      <div className="p-2 rounded-xl bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}&color=000000&bgcolor=ffffff`}
                          alt="QR Code chia sẻ phim"
                          className="w-36 h-36"
                        />
                      </div>
                      <p className="text-[11px] text-neutral-300">
                        Quét mã QR bằng camera điện thoại để xem phim ngay lập tức
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
