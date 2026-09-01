'use client';

import React, { useState, useEffect } from 'react';
import { LegalPageLayout, TOCItem } from '@/components/legal/LegalPageLayout';
import {
  AlertCircle,
  HelpCircle,
  Film,
  Laptop,
  CheckCircle2,
  Send,
  Loader2,
  RefreshCw,
  Sliders,
  Volume2,
  Subtitles,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastProvider';
import { reportsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useAuthModalStore } from '@/store/authModalStore';

const TOC: TOCItem[] = [
  { id: 'troubleshoot-guide', title: '1. Hướng dẫn khắc phục sự cố nhanh' },
  { id: 'common-issues', title: '2. Các lỗi thường gặp & Giải pháp' },
  { id: 'report-form', title: '3. Biểu mẫu gửi báo cáo sự cố' },
  { id: 'support-sla', title: '4. Thời gian xử lý & Phản hồi' },
];

const ISSUE_CATEGORIES = [
  { id: 'playback', label: 'Video không phát / Link hỏng', icon: Film },
  { id: 'subtitles', label: 'Lỗi phụ đề / Sai Vietsub', icon: Subtitles },
  { id: 'audio', label: 'Lệch tiếng / Mất âm thanh', icon: Volume2 },
  { id: 'lag', label: 'Giật lag / Tải chậm 4K', icon: WifiOff },
  { id: 'duplicate', label: 'Trùng tập / Thiếu tập phim', icon: RefreshCw },
  { id: 'ui_bug', label: 'Lỗi giao diện / Tính năng web', icon: Sliders },
];

export function ReportClient() {
  const { toast } = useToast();
  const user = useAuthStore((state) => state.user);
  const openAuthModal = useAuthModalStore((state) => state.openModal);
  const [category, setCategory] = useState('playback');
  const [filmTitle, setFilmTitle] = useState('');
  const [episode, setEpisode] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');
  const [description, setDescription] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Auto-detect browser/OS info
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent;
      const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
      const os = isMobile ? 'Mobile Device' : 'Desktop Computer';
      setDeviceInfo(`${os} · ${navigator.platform || 'Web Browser'}`);
    }
  }, []);

  const handleAutoDetect = () => {
    if (typeof window !== 'undefined') {
      const info = `${navigator.userAgent} (${window.innerWidth}x${window.innerHeight})`;
      setDeviceInfo(info);
      toast('Đã tự động nhận diện thiết bị của bạn', 'success');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast('Vui lòng đăng nhập để gửi báo cáo', 'error');
      openAuthModal('login');
      return;
    }
    if (!description.trim()) {
      toast('Vui lòng nhập chi tiết mô tả lỗi', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await reportsApi.create({
        category,
        filmTitle: filmTitle.trim() || undefined,
        episode: episode.trim() || undefined,
        deviceInfo: deviceInfo.trim() || undefined,
        description: description.trim(),
        screenshotUrl: screenshotUrl.trim() || undefined,
        email: email.trim() || undefined,
      });
      setIsSubmitting(false);
      setSubmitted(true);
      toast('Báo cáo của bạn đã được gửi thành công đến đội ngũ kỹ thuật!', 'success');
    } catch {
      setIsSubmitting(false);
      toast('Không thể gửi báo cáo lúc này. Vui lòng thử lại sau.', 'error');
    }
  };

  return (
    <LegalPageLayout
      badge="Trung Tâm Hỗ Trợ Kỹ Thuật"
      badgeIcon={<HelpCircle size={14} className="text-violet-400" />}
      title="Báo Cáo Sự Cố & Khắc Phục Lỗi"
      description="Gặp sự cố khi xem phim? Xem qua các bước xử lý nhanh hoặc gửi biểu mẫu báo lỗi chi tiết để đội ngũ kỹ thuật NetPhim kiểm tra và khắc phục kịp thời."
      lastUpdated="19/08/2026"
      readTime="5 phút đọc & gửi form"
      toc={TOC}
    >
      {/* Section 1: Quick Guide */}
      <section id="troubleshoot-guide" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">1.</span> Hướng dẫn khắc phục sự cố nhanh
        </h2>
        <p className="text-neutral-300">
          Hầu hết các sự cố thường gặp (màn hình đen, giật lag, không tải được tập phim) có thể được
          giải quyết ngay lập tức bằng các mẹo nhanh sau đây:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3">
          <div className="rounded-xl border border-neutral-800 bg-[#161a26] p-4 space-y-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600/20 text-violet-400 font-bold text-xs">
              01
            </span>
            <h4 className="text-sm font-bold text-white">Đổi Server Dự Phòng</h4>
            <p className="text-xs text-neutral-400">
              Nhấp vào nút chọn Server (Server 1 / Server 2 / VIP) ngay bên dưới khung phát video để
              chuyển sang cụm máy chủ dự phòng có tốc độ tốt hơn.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-[#161a26] p-4 space-y-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600/20 text-violet-400 font-bold text-xs">
              02
            </span>
            <h4 className="text-sm font-bold text-white">Xóa Bộ Nhớ Cache</h4>
            <p className="text-xs text-neutral-400">
              Nhấn tổ hợp phím{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[10px]">
                Ctrl + F5
              </kbd>{' '}
              (hoặc{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[10px]">
                Cmd + Shift + R
              </kbd>{' '}
              trên Mac) để làm mới toàn bộ tài nguyên video.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-[#161a26] p-4 space-y-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600/20 text-violet-400 font-bold text-xs">
              03
            </span>
            <h4 className="text-sm font-bold text-white">Tắt Tiện Ích Chặn Quá Mức</h4>
            <p className="text-xs text-neutral-400">
              Một số extension chặn quảng cáo quá mức có thể vô tình chặn các tệp phụ đề .vtt hoặc
              phân đoạn luồng HLS m3u8 của phim.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Common Issues */}
      <section id="common-issues" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">2.</span> Các lỗi thường gặp & Giải pháp
        </h2>
        <div className="space-y-3">
          <div className="rounded-xl border border-neutral-800 bg-[#161a26] p-4">
            <h4 className="text-sm font-bold text-white mb-1">
              Video báo lỗi &quot;Media decode error / The media could not be loaded&quot;:
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Trình duyệt của bạn có thể đang tắt tính năng tăng tốc phần cứng (Hardware
              Acceleration). Hãy vào Cài đặt trình duyệt &gt; Hệ thống &gt; Bật &quot;Sử dụng khả
              năng tăng tốc đồ họa&quot;.
            </p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-[#161a26] p-4">
            <h4 className="text-sm font-bold text-white mb-1">
              Phụ đề tiếng Việt bị hiển thị ô vuông hoặc chậm tiếng:
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Nhấp vào biểu tượng Bánh răng &gt; Phụ đề trên thanh điều khiển trình phát video để
              chỉnh lại kích thước chữ hoặc độ trễ hiển thị (Subtitle Offset).
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Interactive Report Form */}
      <section id="report-form" className="scroll-mt-24 space-y-6 pt-4 border-t border-neutral-800">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300 mb-2">
            <Sparkles size={13} />
            <span>Biểu mẫu thông minh</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="text-violet-400">3.</span> Gửi biểu mẫu báo lỗi đến kỹ thuật viên
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-neutral-400">
            Nếu các bước trên không giải quyết được vấn đề, vui lòng điền thông tin bên dưới để
            chúng tôi fix ngay cho bạn.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] p-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Đã tiếp nhận báo cáo sự cố</h3>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-md mx-auto leading-relaxed">
              Cảm ơn bạn đã đóng góp! Đội ngũ kỹ thuật NetPhim đã nhận được thông tin và sẽ kiểm tra
              link phát của bộ phim trong thời gian sớm nhất.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setDescription('');
              }}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer"
            >
              <RefreshCw size={13} />
              Gửi báo cáo khác
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-neutral-800/80 bg-[#161a26] p-5 sm:p-7"
          >
            {/* Category Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2.5">
                1. Loại sự cố bạn gặp phải <span className="text-violet-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ISSUE_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={cn(
                        'flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all text-left cursor-pointer',
                        isSelected
                          ? 'border-violet-500 bg-violet-600/20 text-violet-200 shadow-sm'
                          : 'border-neutral-800 bg-[#1b202c] text-neutral-400 hover:text-white hover:border-neutral-700',
                      )}
                    >
                      <cat.icon
                        size={15}
                        className={isSelected ? 'text-violet-400' : 'text-neutral-500'}
                      />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Film Title & Episode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  2. Tên phim gặp lỗi
                </label>
                <input
                  type="text"
                  value={filmTitle}
                  onChange={(e) => setFilmTitle(e.target.value)}
                  placeholder="Ví dụ: Avengers: Endgame, Spider-Man..."
                  className="w-full rounded-xl border border-neutral-700/70 bg-[#1b202c] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Tập phim / Thời điểm bị lỗi
                </label>
                <input
                  type="text"
                  value={episode}
                  onChange={(e) => setEpisode(e.target.value)}
                  placeholder="Ví dụ: Tập 05, phút 24:30..."
                  className="w-full rounded-xl border border-neutral-700/70 bg-[#1b202c] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/20 transition-all"
                />
              </div>
            </div>

            {/* Device & Browser Info */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                  3. Thiết bị & Trình duyệt
                </label>
                <button
                  type="button"
                  onClick={handleAutoDetect}
                  className="text-[11px] text-violet-400 hover:text-violet-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Laptop size={12} />
                  Tự nhận diện
                </button>
              </div>
              <input
                type="text"
                value={deviceInfo}
                onChange={(e) => setDeviceInfo(e.target.value)}
                placeholder="Ví dụ: Chrome trên Windows 11, Safari iOS 18..."
                className="w-full rounded-xl border border-neutral-700/70 bg-[#1b202c] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/20 transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                4. Mô tả chi tiết vấn đề <span className="text-violet-400">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả cụ thể sự cố bạn gặp phải để kỹ thuật viên tái hiện và xử lý chính xác..."
                className="w-full rounded-xl border border-neutral-700/70 bg-[#1b202c] p-3.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/20 transition-all resize-y"
              />
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                5. Liên kết ảnh chụp màn hình
              </label>
              <input
                type="url"
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                placeholder="https://... (tùy chọn)"
                className="w-full rounded-xl border border-neutral-700/70 bg-[#1b202c] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/20 transition-all"
              />
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                6. Email của bạn (để nhận thông báo khi đã fix xong)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com (tùy chọn)"
                className="w-full rounded-xl border border-neutral-700/70 bg-[#1b202c] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/20 transition-all"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-violet-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang gửi báo cáo...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>{user ? 'Gửi báo cáo sự cố' : 'Đăng nhập để gửi báo cáo'}</span>
                </>
              )}
            </button>
          </form>
        )}
      </section>

      {/* Section 4: SLA */}
      <section id="support-sla" className="scroll-mt-24 space-y-4 pt-4 border-t border-neutral-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">4.</span> Thời gian xử lý & Phản hồi
        </h2>
        <p className="text-neutral-300">
          Các báo cáo lỗi hỏng link phát hoặc mất âm thanh được hệ thống giám sát tự động phân loại
          ưu tiên cao. Đội ngũ trực ca sẽ cập nhật lại nguồn phát trong vòng{' '}
          <strong>1 đến 6 giờ</strong> kể từ lúc nhận được báo cáo.
        </p>
      </section>
    </LegalPageLayout>
  );
}
