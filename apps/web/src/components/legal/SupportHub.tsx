'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  HelpCircle,
  ShieldCheck,
  FileText,
  Mail,
  ArrowLeft,
  ChevronRight,
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
  Scale,
  Copyright,
  AlertTriangle,
  Ban,
  Lock,
  EyeOff,
  UserCheck,
  Database,
  ExternalLink,
  MessageCircle,
  FileCheck,
  SendHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { cardFont } from '@/lib/fonts';
import { useToast } from '@/providers/ToastProvider';
import { contactApi, reportsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useAuthModalStore } from '@/store/authModalStore';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';

export type SupportTab = 'report' | 'privacy' | 'terms' | 'contact';

interface SupportHubProps {
  initialTab?: SupportTab;
}

const TABS: { id: SupportTab; label: string; icon: React.ElementType }[] = [
  { id: 'report', label: 'Báo lỗi', icon: HelpCircle },
  { id: 'privacy', label: 'Chính sách bảo mật', icon: ShieldCheck },
  { id: 'terms', label: 'Điều khoản sử dụng', icon: FileText },
  { id: 'contact', label: 'Liên hệ', icon: Mail },
];

const ISSUE_CATEGORIES = [
  { id: 'playback', label: 'Video không phát / Link hỏng', icon: Film },
  { id: 'subtitles', label: 'Lỗi phụ đề / Sai Vietsub', icon: Subtitles },
  { id: 'audio', label: 'Lệch tiếng / Mất âm thanh', icon: Volume2 },
  { id: 'lag', label: 'Giật lag / Tải chậm 4K', icon: WifiOff },
  { id: 'duplicate', label: 'Trùng tập / Thiếu tập phim', icon: RefreshCw },
  { id: 'ui_bug', label: 'Lỗi giao diện / Tính năng web', icon: Sliders },
];

const CONTACT_TOPICS = [
  { id: 'support', label: 'Hỗ trợ tài khoản & kỹ thuật' },
  { id: 'feedback', label: 'Đóng góp ý kiến & Đề xuất phim' },
  { id: 'ads', label: 'Hợp tác quảng cáo & Truyền thông' },
  { id: 'dmca', label: 'Khiếu nại bản quyền DMCA' },
  { id: 'other', label: 'Vấn đề khác' },
];

export function SupportHub({ initialTab = 'report' }: SupportHubProps) {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const user = useAuthStore((state) => state.user);
  const openAuthModal = useAuthModalStore((state) => state.openModal);

  const tabParam = searchParams.get('tab') as SupportTab | null;
  const [activeTab, setActiveTab] = useState<SupportTab>(
    tabParam && ['report', 'privacy', 'terms', 'contact'].includes(tabParam)
      ? tabParam
      : initialTab,
  );

  // Sync tab with URL parameter when it changes
  useEffect(() => {
    if (tabParam && ['report', 'privacy', 'terms', 'contact'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const switchTab = (tab: SupportTab) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `/${tab}`);
  };

  // ── Form States for Báo Lỗi ──
  const [reportCategory, setReportCategory] = useState('playback');
  const [filmTitle, setFilmTitle] = useState('');
  const [episode, setEpisode] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportEmail, setReportEmail] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // ── Form States for Liên Hệ ──
  const [contactTopic, setContactTopic] = useState('support');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactTurnstileToken, setContactTurnstileToken] = useState<string | null>(null);
  const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

  // Auto-detect device for Report form
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent;
      const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
      const os = isMobile ? 'Điện thoại / Di động' : 'Máy tính Desktop';
      setDeviceInfo(`${os} — ${navigator.platform || 'Web Browser'}`);
    }
  }, []);

  const handleAutoDetectDevice = () => {
    if (typeof window !== 'undefined') {
      setDeviceInfo(
        `${navigator.userAgent} (Màn hình: ${window.innerWidth}x${window.innerHeight})`,
      );
      toast('Đã tự động nhận diện thiết bị của bạn', 'success');
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast('Vui lòng đăng nhập để gửi báo cáo', 'error');
      openAuthModal('login');
      return;
    }
    if (reportDesc.trim().length < 10) {
      toast('Vui lòng nhập mô tả lỗi ít nhất 10 ký tự', 'error');
      return;
    }

    setIsSubmittingReport(true);
    try {
      await reportsApi.create({
        category: reportCategory,
        filmTitle: filmTitle.trim() || undefined,
        episode: episode.trim() || undefined,
        deviceInfo: deviceInfo.trim() || undefined,
        description: reportDesc.trim(),
        email: reportEmail.trim() || undefined,
      });
      setIsSubmittingReport(false);
      setReportSubmitted(true);
      toast('Báo cáo sự cố đã được gửi thành công đến đội ngũ kỹ thuật!', 'success');
    } catch {
      setIsSubmittingReport(false);
      toast('Không thể gửi báo cáo lúc này. Vui lòng thử lại sau.', 'error');
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contactMessage.trim().length < 10 || !contactEmail.trim()) {
      toast('Vui lòng nhập email và nội dung ít nhất 10 ký tự', 'error');
      return;
    }
    if (turnstileEnabled && !contactTurnstileToken) {
      toast('Vui lòng hoàn tất xác minh chống bot', 'error');
      return;
    }

    setIsSubmittingContact(true);
    try {
      await contactApi.create({
        topic: contactTopic,
        name: contactName.trim() || undefined,
        email: contactEmail.trim(),
        subject: contactSubject.trim() || undefined,
        message: contactMessage.trim(),
        turnstileToken: contactTurnstileToken || undefined,
      });
      setIsSubmittingContact(false);
      setContactSubmitted(true);
      toast('Tin nhắn liên hệ đã được gửi thành công đến ban quản trị NetPhim!', 'success');
    } catch {
      setIsSubmittingContact(false);
      toast('Không thể gửi tin nhắn lúc này. Vui lòng thử lại sau.', 'error');
    }
  };

  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div
      className={cn(
        cardFont.className,
        'bg-background min-h-screen text-foreground pb-20 pt-20 sm:pt-24',
      )}
    >
      <div className="w-full pl-4 lg:pl-24 pr-4 md:pr-10 relative z-10 max-w-[1400px] mx-auto space-y-8">
        {/* Top Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-neutral-400">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-300 hover:text-white text-xs font-semibold transition-all"
          >
            <ArrowLeft size={12} />
            Trang chủ
          </Link>
          <ChevronRight size={13} className="text-neutral-600" />
          <span className="text-neutral-500">Hỗ trợ & Bản quyền</span>
          <ChevronRight size={13} className="text-neutral-600" />
          <span className="font-semibold text-white">{currentTab.label}</span>
        </nav>

        {/* Section Header Title */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Hỗ Trợ & Bản Quyền
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-2xl">
            Báo cáo sự cố phát video, tìm hiểu chính sách bảo mật dữ liệu, điều khoản bản quyền DMCA
            hoặc gửi thư trực tiếp đến NetPhim.
          </p>
        </div>

        {/* ── 4 Pill Tabs Switcher ── */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl sm:rounded-full bg-white/[0.04] border border-white/[0.08]">
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-xl sm:rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none',
                  isSelected
                    ? 'bg-white text-black font-extrabold shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]',
                )}
              >
                <tab.icon size={15} className={isSelected ? 'text-black' : 'text-neutral-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Content Container: Seamless background layout ── */}
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-8 md:p-10">
          {/* ── Temporary Maintenance Notice ── */}
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs sm:text-sm font-medium">
            <AlertTriangle size={18} className="shrink-0 text-amber-400" />
            <p>
              <strong className="font-semibold text-amber-200">Thông báo:</strong>{' '}
              <span>Hệ thống biểu mẫu hỗ trợ và liên hệ đang tạm thời đóng để bảo trì và nâng cấp. Chức năng sẽ sớm được mở lại trong thời gian tới.</span>
            </p>
          </div>

          {/* ════════ TAB 1: BÁO LỖI ════════ */}
          {activeTab === 'report' && (
            <div className="space-y-8">
              {/* Quick Troubleshooting Banner */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
                <h3 className="text-sm sm:text-base font-bold text-white mb-3 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-neutral-400" />
                  Mẹo khắc phục nhanh trước khi gửi báo cáo:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-neutral-300">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <strong className="text-white block mb-1">1. Đổi Server phát</strong>
                    Bấm chọn Server 2 hoặc Server VIP ngay dưới khung video.
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <strong className="text-white block mb-1">2. Xóa Cache nhanh</strong>
                    Nhấn phím{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">
                      Ctrl + F5
                    </kbd>{' '}
                    để tải lại toàn bộ luồng phát.
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <strong className="text-white block mb-1">3. Tắt chặn quảng cáo</strong>
                    Một số extension adblock có thể vô tình chặn luồng phụ đề Vietsub .vtt.
                  </div>
                </div>
              </div>

              {/* Form Section */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-1">
                    Biểu Mẫu Gửi Báo Cáo Sự Cố
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400">
                    Nếu các bước trên không giải quyết được, vui lòng điền thông tin bên dưới. Kỹ
                    thuật viên sẽ kiểm tra và fix link trong vòng 1-6 giờ.
                  </p>
                </div>

                {reportSubmitted ? (
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-white mx-auto" />
                    <h3 className="text-lg font-bold text-white">Đã tiếp nhận báo cáo sự cố!</h3>
                    <p className="text-xs sm:text-sm text-neutral-300 max-w-md mx-auto leading-relaxed">
                      Cảm ơn bạn đã hỗ trợ xây dựng NetPhim! Kỹ thuật viên đang kiểm tra lại nguồn
                      phát của tập phim.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setReportSubmitted(false);
                        setReportDesc('');
                      }}
                      className="mt-2 inline-flex items-center gap-2 rounded-full bg-white text-black hover:bg-neutral-200 px-5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <RefreshCw size={13} />
                      Gửi báo cáo khác
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleReportSubmit} className="space-y-5">
                    {/* Category Selector */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                        1. Loại sự cố gặp phải <span className="text-neutral-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ISSUE_CATEGORIES.map((cat) => {
                          const isSelected = reportCategory === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setReportCategory(cat.id)}
                              className={cn(
                                'flex items-center gap-2.5 p-3 rounded-xl border text-xs transition-all text-left cursor-pointer',
                                isSelected
                                  ? 'border-white/30 bg-white/10 text-white font-bold'
                                  : 'border-white/[0.08] bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.06]',
                              )}
                            >
                              <cat.icon
                                size={15}
                                className={isSelected ? 'text-white' : 'text-neutral-400'}
                              />
                              <span className="truncate">{cat.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Movie & Episode */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                          2. Tên phim gặp sự cố
                        </label>
                        <input
                          type="text"
                          value={filmTitle}
                          onChange={(e) => setFilmTitle(e.target.value)}
                          maxLength={300}
                          placeholder="Ví dụ: Spider-Man, Avengers..."
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-white/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                          Tập phim / Mốc thời gian
                        </label>
                        <input
                          type="text"
                          value={episode}
                          onChange={(e) => setEpisode(e.target.value)}
                          maxLength={100}
                          placeholder="Ví dụ: Tập 03, phút 15:20..."
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-white/30 transition-all"
                        />
                      </div>
                    </div>

                    {/* Device info */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
                          3. Thiết bị & Trình duyệt
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoDetectDevice}
                          className="text-[11px] text-neutral-300 hover:text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Laptop size={12} />
                          Tự nhận diện
                        </button>
                      </div>
                      <input
                        type="text"
                        value={deviceInfo}
                        onChange={(e) => setDeviceInfo(e.target.value)}
                        maxLength={2000}
                        placeholder="Chrome trên Windows 11, Safari iPhone..."
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-white/30 transition-all"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        4. Mô tả chi tiết vấn đề <span className="text-neutral-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={reportDesc}
                        onChange={(e) => setReportDesc(e.target.value)}
                        minLength={10}
                        maxLength={10000}
                        placeholder="Mô tả cụ thể sự cố bạn gặp phải (ví dụ: màn hình đen khi tua, phụ đề bị nhảy dòng, âm thanh bị rè...)"
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] p-3.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-white/30 transition-all resize-y"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        5. Email nhận thông báo kết quả (tùy chọn)
                      </label>
                      <input
                        type="email"
                        value={reportEmail}
                        onChange={(e) => setReportEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-white/30 transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={true}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 text-neutral-400 px-8 py-3.5 text-xs sm:text-sm font-extrabold shadow-sm transition-all cursor-not-allowed border border-white/10"
                      title="Biểu mẫu đang tạm đóng để nâng cấp"
                    >
                      <Ban size={15} />
                      <span>Biểu mẫu đang tạm đóng</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* ════════ TAB 2: CHÍNH SÁCH BẢO MẬT ════════ */}
          {activeTab === 'privacy' && (
            <div className="space-y-8 text-neutral-300 text-xs sm:text-sm leading-relaxed">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
                <div className="flex items-center gap-2 text-white font-bold text-sm mb-2">
                  <FileCheck size={18} className="text-neutral-400" />
                  <span>Tóm tắt nhanh chính sách bảo mật (TL;DR)</span>
                </div>
                <ul className="space-y-1.5 list-disc list-inside text-neutral-400">
                  <li>
                    <strong className="text-neutral-200">Không thương mại hóa dữ liệu:</strong>{' '}
                    NetPhim tuyệt đối không bán hay cho thuê thông tin cá nhân cho bên thứ ba.
                  </li>
                  <li>
                    <strong className="text-neutral-200">Mã hóa chuẩn cao:</strong> Mật khẩu được
                    băm một chiều an toàn và đường truyền được bảo vệ bằng SSL/TLS 1.3.
                  </li>
                  <li>
                    <strong className="text-neutral-200">Toàn quyền quản lý:</strong> Bạn có thể
                    xuất dữ liệu hoặc yêu cầu xóa vĩnh viễn tài khoản bất kỳ lúc nào.
                  </li>
                </ul>
              </div>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-neutral-400">1.</span> Thông tin thu thập
                </h3>
                <p className="text-neutral-400">
                  Chúng tôi chỉ thu thập dữ liệu tối thiểu cần thiết gồm: Email, Username, Tên hiển
                  thị, Lịch sử xem gần đây (để hỗ trợ tua tiếp), và Danh sách phim yêu thích của
                  bạn.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <strong className="text-white block mb-1 flex items-center gap-1.5 text-xs">
                      <UserCheck size={14} className="text-neutral-400" /> Tài khoản cá nhân
                    </strong>
                    <span className="text-neutral-400 text-xs">
                      Email, tên tài khoản và mật khẩu đã mã hóa.
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <strong className="text-white block mb-1 flex items-center gap-1.5 text-xs">
                      <Database size={14} className="text-neutral-400" /> Tiến trình xem phim
                    </strong>
                    <span className="text-neutral-400 text-xs">
                      Thời điểm dừng phim để bạn có thể xem tiếp đa thiết bị.
                    </span>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-neutral-400">2.</span> Bảo mật & Mã hóa đường truyền
                </h3>
                <p className="text-neutral-400">
                  Mọi kết nối giữa thiết bị của bạn và hệ thống máy chủ NetPhim đều được mã hóa bằng
                  chuẩn <strong className="text-neutral-200">SSL/TLS 1.3</strong>. Mật khẩu không
                  bao giờ được lưu dưới dạng văn bản thô.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-neutral-400">3.</span> Cookie & Bộ nhớ trình duyệt
                </h3>
                <p className="text-neutral-400">
                  NetPhim sử dụng Cookie và LocalStorage để lưu phiên đăng nhập an toàn, âm lượng
                  mặc định và tùy chọn phụ đề của bạn. Bạn có thể xóa dữ liệu này trong Cài đặt
                  trình duyệt bất cứ lúc nào.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-neutral-400">4.</span> Quyền của người dùng
                </h3>
                <p className="text-neutral-400">
                  Bạn có toàn quyền chỉnh sửa thông tin, yêu cầu trích xuất dữ liệu lịch sử hoặc xóa
                  vĩnh viễn tài khoản qua trang Cài Đặt hoặc liên hệ qua email{' '}
                  <a href="mailto:privacy@netphim.tv" className="text-white underline font-medium">
                    privacy@netphim.tv
                  </a>
                  .
                </p>
              </section>
            </div>
          )}

          {/* ════════ TAB 3: ĐIỀU KHOẢN SỬ DỤNG ════════ */}
          {activeTab === 'terms' && (
            <div className="space-y-8 text-neutral-300 text-xs sm:text-sm leading-relaxed">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
                <div className="flex items-center gap-2 text-white font-bold text-sm mb-2">
                  <AlertTriangle size={18} className="text-neutral-400" />
                  <span>Tuyên bố miễn trừ trách nhiệm nội dung</span>
                </div>
                <p className="text-neutral-400">
                  NetPhim là nền tảng chia sẻ và chỉ mục siêu liên kết từ các nguồn bên thứ ba công
                  khai trên Internet. Chúng tôi không trực tiếp tải lên, lưu trữ hoặc sở hữu bản
                  quyền các video phát hành. Chúng tôi cam kết tôn trọng luật bản quyền DMCA.
                </p>
              </div>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-neutral-400">1.</span> Chấp thuận điều khoản
                </h3>
                <p className="text-neutral-400">
                  Bằng việc truy cập hoặc sử dụng NetPhim, bạn đồng ý tuân thủ toàn bộ các điều
                  khoản và quy định tại đây. Nếu không đồng ý, vui lòng dừng sử dụng dịch vụ.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-neutral-400">2.</span> Chính sách bản quyền & DMCA Takedown
                </h3>
                <p className="text-neutral-400">
                  Nếu bạn là chủ sở hữu bản quyền hợp pháp và phát hiện nội dung vi phạm, vui lòng
                  gửi email yêu cầu gỡ bỏ tới hòm thư chuyên trách:
                </p>
                <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-neutral-400 block">
                      Hòm thư tiếp nhận khiếu nại bản quyền:
                    </span>
                    <strong className="text-white text-sm">dmca@netphim.tv</strong>
                  </div>
                  <a
                    href="mailto:dmca@netphim.tv"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black font-bold text-xs transition-colors hover:bg-neutral-200"
                  >
                    Gửi email DMCA
                  </a>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-neutral-400">3.</span> Quy tắc ứng xử của thành viên
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <Ban size={16} className="text-neutral-400 shrink-0 mt-0.5" />
                    <span className="text-neutral-300">
                      Không spam quảng cáo, cờ bạc, lừa đảo trong phần bình luận.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <Ban size={16} className="text-neutral-400 shrink-0 mt-0.5" />
                    <span className="text-neutral-300">
                      Không xúc phạm thành viên khác, phân biệt vùng miền hay quấy rối.
                    </span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ════════ TAB 4: LIÊN HỆ ════════ */}
          {activeTab === 'contact' && (
            <div className="space-y-8">
              {/* Channels Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-2 hover:border-white/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white">
                      <Mail size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Email Ban Quản Trị</h4>
                      <p className="text-xs text-neutral-400">Hỗ trợ chung & Giải đáp thắc mắc</p>
                    </div>
                  </div>
                  <a
                    href="mailto:support@netphim.tv"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white underline pt-1"
                  >
                    support@netphim.tv
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-2 hover:border-white/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white">
                      <MessageCircle size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Telegram Trực Tuyến 24/7</h4>
                      <p className="text-xs text-neutral-400">Phản hồi nhanh sự cố dịch vụ</p>
                    </div>
                  </div>
                  <a
                    href="https://t.me/nguyenphuhuy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white underline pt-1"
                  >
                    @nguyenphuhuy
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* Message Form */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-1">
                    Gửi Tin Nhắn Đến Ban Quản Trị
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400">
                    Điền lời nhắn vào biểu mẫu bên dưới. Chúng tôi sẽ phản hồi lại email của bạn
                    trong vòng 24 giờ.
                  </p>
                </div>

                {contactSubmitted ? (
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-white mx-auto" />
                    <h3 className="text-lg font-bold text-white">Đã gửi tin nhắn thành công!</h3>
                    <p className="text-xs sm:text-sm text-neutral-300 max-w-md mx-auto leading-relaxed">
                      Cảm ơn bạn đã liên hệ! Chúng tôi đã nhận được thông điệp và sẽ phản hồi đến{' '}
                      <strong>{contactEmail}</strong> sớm nhất.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setContactSubmitted(false);
                        setContactMessage('');
                      }}
                      className="mt-2 inline-flex items-center gap-2 rounded-full bg-white text-black hover:bg-neutral-200 px-5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <SendHorizontal size={13} />
                      Gửi tin nhắn khác
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-5">
                    {/* Topic */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                        Chủ đề liên hệ <span className="text-neutral-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {CONTACT_TOPICS.map((t) => {
                          const isSelected = contactTopic === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setContactTopic(t.id)}
                              className={cn(
                                'p-3 rounded-xl border text-xs transition-all text-left truncate cursor-pointer',
                                isSelected
                                  ? 'border-white/30 bg-white/10 text-white font-bold'
                                  : 'border-white/[0.08] bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.06]',
                              )}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Name & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                          Họ và tên
                        </label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          maxLength={120}
                          placeholder="Nguyễn Văn A"
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-white/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                          Email nhận phản hồi <span className="text-neutral-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          maxLength={320}
                          placeholder="name@example.com"
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-white/30 transition-all"
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        Tiêu đề thư
                      </label>
                      <input
                        type="text"
                        value={contactSubject}
                        onChange={(e) => setContactSubject(e.target.value)}
                        maxLength={300}
                        placeholder="Tóm tắt ngắn gọn nội dung liên hệ..."
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-white/30 transition-all"
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        Nội dung chi tiết <span className="text-neutral-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        minLength={10}
                        maxLength={10000}
                        placeholder="Nhập nội dung lời nhắn, câu hỏi hoặc đề xuất hợp tác của bạn..."
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] p-3.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-white/30 transition-all resize-y"
                      />
                    </div>

                    {turnstileEnabled && (
                      <TurnstileWidget action="contact" onTokenChange={setContactTurnstileToken} />
                    )}

                    <button
                      type="submit"
                      disabled={true}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 text-neutral-400 px-8 py-3.5 text-xs sm:text-sm font-extrabold shadow-sm transition-all cursor-not-allowed border border-white/10"
                      title="Biểu mẫu đang tạm đóng để nâng cấp"
                    >
                      <Ban size={15} />
                      <span>Biểu mẫu đang tạm đóng</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
