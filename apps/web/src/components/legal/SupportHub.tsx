"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  HelpCircle,
  ShieldCheck,
  FileText,
  Mail,
  ArrowLeft,
  ChevronRight,
  Sparkles,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { cardFont } from "@/lib/fonts";
import { useToast } from "@/providers/ToastProvider";

export type SupportTab = "report" | "privacy" | "terms" | "contact";

interface SupportHubProps {
  initialTab?: SupportTab;
}

const TABS: { id: SupportTab; label: string; icon: React.ElementType }[] = [
  { id: "report", label: "Báo lỗi", icon: HelpCircle },
  { id: "privacy", label: "Chính sách bảo mật", icon: ShieldCheck },
  { id: "terms", label: "Điều khoản sử dụng", icon: FileText },
  { id: "contact", label: "Liên hệ", icon: Mail },
];

const ISSUE_CATEGORIES = [
  { id: "playback", label: "Video không phát / Link hỏng", icon: Film },
  { id: "subtitles", label: "Lỗi phụ đề / Sai Vietsub", icon: Subtitles },
  { id: "audio", label: "Lệch tiếng / Mất âm thanh", icon: Volume2 },
  { id: "lag", label: "Giật lag / Tải chậm 4K", icon: WifiOff },
  { id: "duplicate", label: "Trùng tập / Thiếu tập phim", icon: RefreshCw },
  { id: "ui_bug", label: "Lỗi giao diện / Tính năng web", icon: Sliders },
];

const CONTACT_TOPICS = [
  { id: "support", label: "Hỗ trợ tài khoản & kỹ thuật" },
  { id: "feedback", label: "Đóng góp ý kiến & Đề xuất phim" },
  { id: "ads", label: "Hợp tác quảng cáo & Truyền thông" },
  { id: "dmca", label: "Khiếu nại bản quyền DMCA" },
  { id: "other", label: "Vấn đề khác" },
];

export function SupportHub({ initialTab = "report" }: SupportHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const tabParam = searchParams.get("tab") as SupportTab | null;
  const [activeTab, setActiveTab] = useState<SupportTab>(
    tabParam && ["report", "privacy", "terms", "contact"].includes(tabParam)
      ? tabParam
      : initialTab,
  );

  // Sync tab with URL parameter when it changes
  useEffect(() => {
    if (tabParam && ["report", "privacy", "terms", "contact"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const switchTab = (tab: SupportTab) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `/${tab}`);
  };

  // ── Form States for Báo Lỗi ──
  const [reportCategory, setReportCategory] = useState("playback");
  const [filmTitle, setFilmTitle] = useState("");
  const [episode, setEpisode] = useState("");
  const [deviceInfo, setDeviceInfo] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportEmail, setReportEmail] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // ── Form States for Liên Hệ ──
  const [contactTopic, setContactTopic] = useState("support");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Auto-detect device for Report form
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent;
      const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
      const os = isMobile ? "Điện thoại / Di động" : "Máy tính Desktop";
      setDeviceInfo(`${os} — ${navigator.platform || "Web Browser"}`);
    }
  }, []);

  const handleAutoDetectDevice = () => {
    if (typeof window !== "undefined") {
      setDeviceInfo(
        `${navigator.userAgent} (Màn hình: ${window.innerWidth}x${window.innerHeight})`,
      );
      toast("Đã tự động nhận diện thiết bị của bạn", "success");
    }
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDesc.trim()) {
      toast("Vui lòng nhập chi tiết mô tả lỗi", "error");
      return;
    }

    setIsSubmittingReport(true);
    setTimeout(() => {
      setIsSubmittingReport(false);
      setReportSubmitted(true);
      toast(
        "Báo cáo sự cố đã được gửi thành công đến đội ngũ kỹ thuật!",
        "success",
      );
    }, 900);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim() || !contactEmail.trim()) {
      toast("Vui lòng điền email và nội dung tin nhắn", "error");
      return;
    }

    setIsSubmittingContact(true);
    setTimeout(() => {
      setIsSubmittingContact(false);
      setContactSubmitted(true);
      toast(
        "Tin nhắn liên hệ đã được gửi thành công đến ban quản trị NetPhim!",
        "success",
      );
    }, 900);
  };

  return (
    <div
      className={cn(
        cardFont.className,
        "min-h-[100dvh] w-full bg-[#0c0d14] text-neutral-200 pt-20 sm:pt-24 pb-20",
      )}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Top Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-neutral-400">
          <Link
            href="/"
            className="flex items-center gap-1 font-medium text-neutral-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={13} />
            Trang chủ
          </Link>
          <ChevronRight size={13} className="text-neutral-600" />
          <span className="text-neutral-400">Hỗ trợ & Bản quyền</span>
          <ChevronRight size={13} className="text-neutral-600" />
          <span className="font-semibold text-violet-400">
            {TABS.find((t) => t.id === activeTab)?.label}
          </span>
        </nav>

        {/* Header Title Section */}
        <div className="mb-8">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
            <Sparkles size={13} />
            <span>Trung Tâm Hỗ Trợ & Pháp Lý</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white font-[family-name:var(--font-manrope)]">
            Hỗ Trợ & Bản Quyền
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-2xl">
            Báo cáo sự cố phát video, tìm hiểu chính sách bảo mật dữ liệu, điều khoản bản quyền DMCA hoặc gửi thư liên hệ trực tiếp đến NetPhim.
          </p>
        </div>

        {/* ── 4 Main Tabs Switcher (Identical design to Home / Site components) ── */}
        <div className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-white/[0.08] bg-[#141824] p-1.5 shadow-xl">
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={cn(
                  "relative flex flex-1 min-w-[130px] items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs sm:text-sm font-bold transition-all cursor-pointer select-none",
                  isSelected
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30 font-extrabold"
                    : "text-neutral-400 hover:text-white hover:bg-white/[0.04]",
                )}
              >
                <tab.icon size={16} className={isSelected ? "text-white" : "text-neutral-400"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content Panels ── */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#141824] p-5 sm:p-8 md:p-10 shadow-2xl">
          {/* ════════ TAB 1: BÁO LỖI ════════ */}
          {activeTab === "report" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Quick Troubleshooting Banner */}
              <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-5 sm:p-6">
                <h3 className="text-sm sm:text-base font-bold text-white mb-3 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-violet-400" />
                  Mẹo khắc phục nhanh trước khi gửi báo cáo:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-neutral-300">
                  <div className="p-3 rounded-xl bg-[#1b2030] border border-white/[0.06]">
                    <strong className="text-violet-300 block mb-1">1. Đổi Server phát</strong>
                    Bấm chọn Server 2 hoặc Server VIP ngay dưới khung video.
                  </div>
                  <div className="p-3 rounded-xl bg-[#1b2030] border border-white/[0.06]">
                    <strong className="text-violet-300 block mb-1">2. Xóa Cache nhanh</strong>
                    Nhấn phím <kbd className="px-1 py-0.5 rounded bg-neutral-800 text-[10px]">Ctrl + F5</kbd> để tải lại toàn bộ luồng phát.
                  </div>
                  <div className="p-3 rounded-xl bg-[#1b2030] border border-white/[0.06]">
                    <strong className="text-violet-300 block mb-1">3. Tắt chặn quảng cáo</strong>
                    Một số adblocker có thể chặn nhầm tệp phụ đề Vietsub .vtt.
                  </div>
                </div>
              </div>

              {/* Form Section */}
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white mb-1.5">
                  Biểu Mẫu Gửi Báo Cáo Sự Cố
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mb-6">
                  Nếu các bước trên không giải quyết được, vui lòng điền thông tin bên dưới. Kỹ thuật viên sẽ kiểm tra và fix link trong vòng 1-6 giờ.
                </p>

                {reportSubmitted ? (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] p-8 text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                    <h3 className="text-lg font-bold text-white">Đã tiếp nhận báo cáo sự cố!</h3>
                    <p className="text-xs sm:text-sm text-neutral-300 max-w-md mx-auto leading-relaxed">
                      Cảm ơn bạn đã hỗ trợ xây dựng NetPhim! Kỹ thuật viên đang kiểm tra lại nguồn phát của tập phim.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setReportSubmitted(false);
                        setReportDesc("");
                      }}
                      className="mt-2 inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-xs font-bold text-white transition-all cursor-pointer"
                    >
                      <RefreshCw size={13} />
                      Gửi báo cáo khác
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleReportSubmit} className="space-y-5">
                    {/* Category Selector */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                        1. Loại sự cố gặp phải <span className="text-violet-400">*</span>
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
                                "flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all text-left cursor-pointer",
                                isSelected
                                  ? "border-violet-500 bg-violet-600/20 text-violet-200 shadow-sm"
                                  : "border-white/[0.06] bg-[#1b2030] text-neutral-400 hover:text-white hover:border-neutral-600",
                              )}
                            >
                              <cat.icon size={15} className={isSelected ? "text-violet-400" : "text-neutral-500"} />
                              <span className="truncate">{cat.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Movie & Episode */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                          2. Tên phim gặp sự cố
                        </label>
                        <input
                          type="text"
                          value={filmTitle}
                          onChange={(e) => setFilmTitle(e.target.value)}
                          placeholder="Ví dụ: Spider-Man, Avengers..."
                          className="w-full rounded-xl border border-white/[0.1] bg-[#1b2030] px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                          Tập phim / Mốc thời gian
                        </label>
                        <input
                          type="text"
                          value={episode}
                          onChange={(e) => setEpisode(e.target.value)}
                          placeholder="Ví dụ: Tập 03, phút 15:20..."
                          className="w-full rounded-xl border border-white/[0.1] bg-[#1b2030] px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
                        />
                      </div>
                    </div>

                    {/* Device info */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                          3. Thiết bị & Trình duyệt
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoDetectDevice}
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
                        placeholder="Chrome trên Windows 11, Safari iPhone..."
                        className="w-full rounded-xl border border-white/[0.1] bg-[#1b2030] px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
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
                        value={reportDesc}
                        onChange={(e) => setReportDesc(e.target.value)}
                        placeholder="Mô tả cụ thể sự cố bạn gặp phải (ví dụ: màn hình đen khi tua, phụ đề bị nhảy dòng, âm thanh bị rè...)"
                        className="w-full rounded-xl border border-white/[0.1] bg-[#1b2030] p-3.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all resize-y"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                        5. Email nhận thông báo kết quả (tùy chọn)
                      </label>
                      <input
                        type="email"
                        value={reportEmail}
                        onChange={(e) => setReportEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full rounded-xl border border-white/[0.1] bg-[#1b2030] px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingReport}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-7 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-violet-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingReport ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Đang gửi báo cáo...</span>
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          <span>Gửi Báo Cáo Sự Cố</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* ════════ TAB 2: CHÍNH SÁCH BẢO MẬT ════════ */}
          {activeTab === "privacy" && (
            <div className="space-y-8 text-neutral-300 text-xs sm:text-sm leading-relaxed animate-in fade-in duration-200">
              <div className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.06] p-5 sm:p-6">
                <div className="flex items-center gap-2 text-violet-300 font-bold text-sm mb-2">
                  <FileCheck size={18} />
                  <span>Tóm tắt nhanh chính sách bảo mật (TL;DR)</span>
                </div>
                <ul className="space-y-1.5 list-disc list-inside text-neutral-300">
                  <li><strong>Không thương mại hóa dữ liệu:</strong> NetPhim tuyệt đối không bán hay cho thuê thông tin cá nhân cho bên thứ ba.</li>
                  <li><strong>Mã hóa chuẩn cao:</strong> Mật khẩu được băm một chiều an toàn (Argon2id/Bcrypt) và đường truyền được bảo vệ bằng SSL/TLS 1.3.</li>
                  <li><strong>Toàn quyền quản lý:</strong> Bạn có thể xuất dữ liệu hoặc yêu cầu xóa vĩnh viễn tài khoản bất kỳ lúc nào.</li>
                </ul>
              </div>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-violet-400 font-extrabold">1.</span> Thông tin thu thập
                </h3>
                <p>
                  Chúng tôi chỉ thu thập dữ liệu tối thiểu cần thiết gồm: Email, Username, Tên hiển thị, Lịch sử xem gần đây (để hỗ trợ tua tiếp), và Danh sách phim yêu thích của bạn.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl border border-white/[0.06] bg-[#1b2030]">
                    <strong className="text-white block mb-1 flex items-center gap-1.5 text-xs">
                      <UserCheck size={14} className="text-violet-400" /> Tài khoản cá nhân
                    </strong>
                    <span className="text-neutral-400 text-xs">Email, tên tài khoản và mật khẩu đã mã hóa.</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-white/[0.06] bg-[#1b2030]">
                    <strong className="text-white block mb-1 flex items-center gap-1.5 text-xs">
                      <Database size={14} className="text-violet-400" /> Tiến trình xem phim
                    </strong>
                    <span className="text-neutral-400 text-xs">Thời điểm dừng phim để bạn có thể xem tiếp đa thiết bị.</span>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-violet-400 font-extrabold">2.</span> Bảo mật & Mã hóa đường truyền
                </h3>
                <p>
                  Mọi kết nối giữa thiết bị của bạn và hệ thống máy chủ NetPhim đều được mã hóa bằng chuẩn <strong>SSL/TLS 1.3</strong>. Mật khẩu không bao giờ được lưu dưới dạng văn bản thô.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-violet-400 font-extrabold">3.</span> Cookie & Bộ nhớ trình duyệt
                </h3>
                <p>
                  NetPhim sử dụng Cookie và LocalStorage để lưu phiên đăng nhập an toàn, âm lượng mặc định và tùy chọn phụ đề của bạn. Bạn có thể xóa dữ liệu này trong Cài đặt trình duyệt bất cứ lúc nào.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-violet-400 font-extrabold">4.</span> Quyền của người dùng
                </h3>
                <p>
                  Bạn có toàn quyền chỉnh sửa thông tin, yêu cầu trích xuất dữ liệu lịch sử hoặc xóa vĩnh viễn tài khoản qua trang Cài Đặt hoặc liên hệ qua email <a href="mailto:privacy@netphim.tv" className="text-violet-400 underline font-semibold">privacy@netphim.tv</a>.
                </p>
              </section>
            </div>
          )}

          {/* ════════ TAB 3: ĐIỀU KHOẢN SỬ DỤNG ════════ */}
          {activeTab === "terms" && (
            <div className="space-y-8 text-neutral-300 text-xs sm:text-sm leading-relaxed animate-in fade-in duration-200">
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-5 sm:p-6">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm mb-2">
                  <AlertTriangle size={18} />
                  <span>Tuyên bố miễn trừ trách nhiệm nội dung</span>
                </div>
                <p className="text-neutral-300">
                  NetPhim là nền tảng chia sẻ và chỉ mục siêu liên kết từ các nguồn bên thứ ba công khai trên Internet. Chúng tôi không trực tiếp tải lên, lưu trữ hoặc sở hữu bản quyền các video phát hành. Chúng tôi cam kết tôn trọng luật bản quyền DMCA.
                </p>
              </div>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-violet-400 font-extrabold">1.</span> Chấp thuận điều khoản
                </h3>
                <p>
                  Bằng việc truy cập hoặc sử dụng NetPhim, bạn đồng ý tuân thủ toàn bộ các điều khoản và quy định tại đây. Nếu không đồng ý, vui lòng dừng sử dụng dịch vụ.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-violet-400 font-extrabold">2.</span> Chính sách bản quyền & DMCA Takedown
                </h3>
                <p>
                  Nếu bạn là chủ sở hữu bản quyền hợp pháp và phát hiện nội dung vi phạm, vui lòng gửi email yêu cầu gỡ bỏ tới hòm thư chuyên trách:
                </p>
                <div className="p-4 rounded-xl border border-white/[0.06] bg-[#1b2030] flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-neutral-400 block">Hòm thư tiếp nhận khiếu nại bản quyền:</span>
                    <strong className="text-violet-400 text-sm">dmca@netphim.tv</strong>
                  </div>
                  <a
                    href="mailto:dmca@netphim.tv"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition-colors"
                  >
                    Gửi email DMCA
                  </a>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-violet-400 font-extrabold">3.</span> Quy tắc ứng xử của thành viên
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl border border-red-500/20 bg-red-500/[0.04]">
                    <Ban size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <span>Không spam quảng cáo, cờ bạc, lừa đảo trong phần bình luận.</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl border border-red-500/20 bg-red-500/[0.04]">
                    <Ban size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <span>Không xúc phạm thành viên khác, phân biệt vùng miền hay quấy rối.</span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ════════ TAB 4: LIÊN HỆ ════════ */}
          {activeTab === "contact" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Channels Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/[0.06] bg-[#1b2030] p-5 space-y-2 hover:border-violet-500/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
                      <Mail size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Email Ban Quản Trị</h4>
                      <p className="text-xs text-neutral-400">Hỗ trợ chung & Giải đáp thắc mắc</p>
                    </div>
                  </div>
                  <a
                    href="mailto:support@netphim.tv"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 underline pt-1"
                  >
                    support@netphim.tv
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-[#1b2030] p-5 space-y-2 hover:border-violet-500/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                      <MessageCircle size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Telegram Trực Tuyến 24/7</h4>
                      <p className="text-xs text-neutral-400">Phản hồi nhanh sự cố dịch vụ</p>
                    </div>
                  </div>
                  <a
                    href="https://t.me/netphim_support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 underline pt-1"
                  >
                    @netphim_support
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* Message Form */}
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white mb-1.5">
                  Gửi Tin Nhắn Đến Ban Quản Trị
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mb-6">
                  Điền lời nhắn vào biểu mẫu bên dưới. Chúng tôi sẽ phản hồi lại email của bạn trong vòng 24 giờ.
                </p>

                {contactSubmitted ? (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] p-8 text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                    <h3 className="text-lg font-bold text-white">Đã gửi tin nhắn thành công!</h3>
                    <p className="text-xs sm:text-sm text-neutral-300 max-w-md mx-auto leading-relaxed">
                      Cảm ơn bạn đã liên hệ! Chúng tôi đã nhận được thông điệp và sẽ phản hồi đến <strong>{contactEmail}</strong> sớm nhất.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setContactSubmitted(false);
                        setContactMessage("");
                      }}
                      className="mt-2 inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-xs font-bold text-white transition-all cursor-pointer"
                    >
                      <SendHorizontal size={13} />
                      Gửi tin nhắn khác
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-5">
                    {/* Topic */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                        Chủ đề liên hệ <span className="text-violet-400">*</span>
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
                                "p-3 rounded-xl border text-xs font-semibold transition-all text-left truncate cursor-pointer",
                                isSelected
                                  ? "border-violet-500 bg-violet-600/20 text-violet-200 shadow-sm"
                                  : "border-white/[0.06] bg-[#1b2030] text-neutral-400 hover:text-white hover:border-neutral-600",
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
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                          Họ và tên
                        </label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Nguyễn Văn A"
                          className="w-full rounded-xl border border-white/[0.1] bg-[#1b2030] px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                          Email nhận phản hồi <span className="text-violet-400">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full rounded-xl border border-white/[0.1] bg-[#1b2030] px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                        Tiêu đề thư
                      </label>
                      <input
                        type="text"
                        value={contactSubject}
                        onChange={(e) => setContactSubject(e.target.value)}
                        placeholder="Tóm tắt ngắn gọn nội dung liên hệ..."
                        className="w-full rounded-xl border border-white/[0.1] bg-[#1b2030] px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                        Nội dung chi tiết <span className="text-violet-400">*</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Nhập nội dung lời nhắn, câu hỏi hoặc đề xuất hợp tác của bạn..."
                        className="w-full rounded-xl border border-white/[0.1] bg-[#1b2030] p-3.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all resize-y"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingContact}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-7 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-violet-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingContact ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Đang gửi tin nhắn...</span>
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          <span>Gửi Tin Nhắn</span>
                        </>
                      )}
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
