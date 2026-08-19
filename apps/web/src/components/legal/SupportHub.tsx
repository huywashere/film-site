"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { cardFont } from "@/lib/fonts";
import { useToast } from "@/providers/ToastProvider";

export type SupportTab = "report" | "privacy" | "terms" | "contact";

interface SupportHubProps {
  initialTab?: SupportTab;
}

const TABS: { id: SupportTab; label: string; icon: React.ElementType; color: string }[] = [
  { id: "report", label: "Báo lỗi", icon: HelpCircle, color: "from-pink-500 to-rose-500" },
  { id: "privacy", label: "Chính sách bảo mật", icon: ShieldCheck, color: "from-cyan-500 to-blue-600" },
  { id: "terms", label: "Điều khoản sử dụng", icon: FileText, color: "from-amber-400 to-orange-500" },
  { id: "contact", label: "Liên hệ", icon: Mail, color: "from-violet-500 to-purple-600" },
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

  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div
      className={cn(
        cardFont.className,
        "bg-background min-h-screen text-foreground overflow-hidden pb-16 pt-20 sm:pt-24",
      )}
    >
      {/* Container aligned with Home Page Grid (pl-4 lg:pl-24 pr-4 md:pr-10) */}
      <div className="w-full pl-4 lg:pl-24 pr-4 md:pr-10 relative z-30 max-w-[1400px] mx-auto">
        {/* Top Breadcrumb */}
        <nav className="mb-5 flex items-center gap-2 text-xs text-neutral-400">
          <Link
            href="/"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.12] text-white/90 hover:text-white text-xs font-medium transition-all"
          >
            <ArrowLeft size={12} />
            Trang chủ
          </Link>
          <ChevronRight size={13} className="text-neutral-600" />
          <span className="text-neutral-400">Hỗ trợ & Bản quyền</span>
          <ChevronRight size={13} className="text-neutral-600" />
          <span className="font-semibold text-white">
            {currentTab.label}
          </span>
        </nav>

        {/* Section Header Title matching Home Page Gradient Style */}
        <div className="mb-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1
              className={cn(
                cardFont.className,
                "bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-300 bg-clip-text text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-[-0.025em] text-transparent leading-tight",
              )}
            >
              Hỗ Trợ & Bản Quyền
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Báo cáo sự cố phát video, tìm hiểu chính sách bảo mật dữ liệu, điều khoản bản quyền DMCA hoặc gửi thư trực tiếp đến NetPhim.
            </p>
          </div>
        </div>

        {/* ── 4 Pill Tabs Switcher (Identical design to Home page filters & buttons) ── */}
        <div className="mb-8 flex flex-wrap items-center gap-2 p-1.5 rounded-2xl sm:rounded-full bg-white/[0.05] border border-white/[0.08] backdrop-blur-md">
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-xl sm:rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none",
                  isSelected
                    ? "bg-white text-black font-extrabold shadow-lg shadow-white/10 scale-[1.02]"
                    : "text-neutral-400 hover:text-white hover:bg-white/[0.08]",
                )}
              >
                <tab.icon size={15} className={isSelected ? "text-black" : "text-neutral-400"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Content Container: Sleek Dark Card matching Home layout ── */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#0e1017]/90 backdrop-blur-2xl p-5 sm:p-8 md:p-10 shadow-2xl">
          {/* ════════ TAB 1: BÁO LỖI ════════ */}
          {activeTab === "report" && (
            <div className="space-y-8 animate-in fade-in duration-150">
              {/* Quick Troubleshooting Banner */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
                <h3 className="text-sm sm:text-base font-extrabold bg-gradient-to-r from-pink-400 to-rose-300 bg-clip-text text-transparent mb-3 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-pink-400" />
                  Mẹo khắc phục nhanh trước khi gửi báo cáo:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-neutral-300">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <strong className="text-white block mb-1">1. Đổi Server phát</strong>
                    Bấm chọn Server 2 hoặc Server VIP ngay dưới khung video.
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <strong className="text-white block mb-1">2. Xóa Cache nhanh</strong>
                    Nhấn phím <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">Ctrl + F5</kbd> để tải lại toàn bộ luồng phát.
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <strong className="text-white block mb-1">3. Tắt chặn quảng cáo</strong>
                    Một số extension adblock có thể vô tình chặn luồng phụ đề Vietsub .vtt.
                  </div>
                </div>
              </div>

              {/* Form Section */}
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-1.5">
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
                      className="mt-2 inline-flex items-center gap-2 rounded-full bg-white text-black hover:bg-neutral-200 px-5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95"
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
                        1. Loại sự cố gặp phải <span className="text-pink-400">*</span>
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
                                "flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all text-left cursor-pointer",
                                isSelected
                                  ? "border-pink-500/80 bg-pink-500/15 text-pink-200 shadow-sm font-bold"
                                  : "border-white/[0.08] bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.06] hover:border-white/20",
                              )}
                            >
                              <cat.icon size={15} className={isSelected ? "text-pink-400" : "text-neutral-400"} />
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
                          placeholder="Ví dụ: Spider-Man, Avengers..."
                          className="w-full rounded-xl border border-white/[0.1] bg-black/50 px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
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
                          placeholder="Ví dụ: Tập 03, phút 15:20..."
                          className="w-full rounded-xl border border-white/[0.1] bg-black/50 px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
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
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
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
                        className="w-full rounded-xl border border-white/[0.1] bg-black/50 px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        4. Mô tả chi tiết vấn đề <span className="text-pink-400">*</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={reportDesc}
                        onChange={(e) => setReportDesc(e.target.value)}
                        placeholder="Mô tả cụ thể sự cố bạn gặp phải (ví dụ: màn hình đen khi tua, phụ đề bị nhảy dòng, âm thanh bị rè...)"
                        className="w-full rounded-xl border border-white/[0.1] bg-black/50 p-3.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all resize-y"
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
                        className="w-full rounded-xl border border-white/[0.1] bg-black/50 px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingReport}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-neutral-200 text-black px-8 py-3.5 text-xs sm:text-sm font-extrabold shadow-lg shadow-white/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingReport ? (
                        <>
                          <Loader2 size={16} className="animate-spin text-black" />
                          <span>Đang gửi báo cáo...</span>
                        </>
                      ) : (
                        <>
                          <Send size={15} />
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
            <div className="space-y-8 text-neutral-300 text-xs sm:text-sm leading-relaxed animate-in fade-in duration-150">
              <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.06] p-5 sm:p-6">
                <div className="flex items-center gap-2 text-cyan-300 font-extrabold text-sm mb-2">
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
                <h3 className="text-base sm:text-lg font-extrabold bg-gradient-to-r from-cyan-400 to-sky-300 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="text-cyan-400 font-extrabold">1.</span> Thông tin thu thập
                </h3>
                <p>
                  Chúng tôi chỉ thu thập dữ liệu tối thiểu cần thiết gồm: Email, Username, Tên hiển thị, Lịch sử xem gần đây (để hỗ trợ tua tiếp), và Danh sách phim yêu thích của bạn.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <strong className="text-white block mb-1 flex items-center gap-1.5 text-xs">
                      <UserCheck size={14} className="text-cyan-400" /> Tài khoản cá nhân
                    </strong>
                    <span className="text-neutral-400 text-xs">Email, tên tài khoản và mật khẩu đã mã hóa.</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <strong className="text-white block mb-1 flex items-center gap-1.5 text-xs">
                      <Database size={14} className="text-cyan-400" /> Tiến trình xem phim
                    </strong>
                    <span className="text-neutral-400 text-xs">Thời điểm dừng phim để bạn có thể xem tiếp đa thiết bị.</span>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-extrabold bg-gradient-to-r from-cyan-400 to-sky-300 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="text-cyan-400 font-extrabold">2.</span> Bảo mật & Mã hóa đường truyền
                </h3>
                <p>
                  Mọi kết nối giữa thiết bị của bạn và hệ thống máy chủ NetPhim đều được mã hóa bằng chuẩn <strong>SSL/TLS 1.3</strong>. Mật khẩu không bao giờ được lưu dưới dạng văn bản thô.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-extrabold bg-gradient-to-r from-cyan-400 to-sky-300 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="text-cyan-400 font-extrabold">3.</span> Cookie & Bộ nhớ trình duyệt
                </h3>
                <p>
                  NetPhim sử dụng Cookie và LocalStorage để lưu phiên đăng nhập an toàn, âm lượng mặc định và tùy chọn phụ đề của bạn. Bạn có thể xóa dữ liệu này trong Cài đặt trình duyệt bất cứ lúc nào.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-extrabold bg-gradient-to-r from-cyan-400 to-sky-300 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="text-cyan-400 font-extrabold">4.</span> Quyền của người dùng
                </h3>
                <p>
                  Bạn có toàn quyền chỉnh sửa thông tin, yêu cầu trích xuất dữ liệu lịch sử hoặc xóa vĩnh viễn tài khoản qua trang Cài Đặt hoặc liên hệ qua email <a href="mailto:privacy@netphim.tv" className="text-cyan-400 underline font-semibold">privacy@netphim.tv</a>.
                </p>
              </section>
            </div>
          )}

          {/* ════════ TAB 3: ĐIỀU KHOẢN SỬ DỤNG ════════ */}
          {activeTab === "terms" && (
            <div className="space-y-8 text-neutral-300 text-xs sm:text-sm leading-relaxed animate-in fade-in duration-150">
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5 sm:p-6">
                <div className="flex items-center gap-2 text-amber-300 font-extrabold text-sm mb-2">
                  <AlertTriangle size={18} />
                  <span>Tuyên bố miễn trừ trách nhiệm nội dung</span>
                </div>
                <p className="text-neutral-300">
                  NetPhim là nền tảng chia sẻ và chỉ mục siêu liên kết từ các nguồn bên thứ ba công khai trên Internet. Chúng tôi không trực tiếp tải lên, lưu trữ hoặc sở hữu bản quyền các video phát hành. Chúng tôi cam kết tôn trọng luật bản quyền DMCA.
                </p>
              </div>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-extrabold bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="text-amber-400 font-extrabold">1.</span> Chấp thuận điều khoản
                </h3>
                <p>
                  Bằng việc truy cập hoặc sử dụng NetPhim, bạn đồng ý tuân thủ toàn bộ các điều khoản và quy định tại đây. Nếu không đồng ý, vui lòng dừng sử dụng dịch vụ.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base sm:text-lg font-extrabold bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="text-amber-400 font-extrabold">2.</span> Chính sách bản quyền & DMCA Takedown
                </h3>
                <p>
                  Nếu bạn là chủ sở hữu bản quyền hợp pháp và phát hiện nội dung vi phạm, vui lòng gửi email yêu cầu gỡ bỏ tới hòm thư chuyên trách:
                </p>
                <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-neutral-400 block">Hòm thư tiếp nhận khiếu nại bản quyền:</span>
                    <strong className="text-amber-300 text-sm">dmca@netphim.tv</strong>
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
                <h3 className="text-base sm:text-lg font-extrabold bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="text-amber-400 font-extrabold">3.</span> Quy tắc ứng xử của thành viên
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-red-500/20 bg-red-500/[0.04]">
                    <Ban size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <span>Không spam quảng cáo, cờ bạc, lừa đảo trong phần bình luận.</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-red-500/20 bg-red-500/[0.04]">
                    <Ban size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <span>Không xúc phạm thành viên khác, phân biệt vùng miền hay quấy rối.</span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ════════ TAB 4: LIÊN HỆ ════════ */}
          {activeTab === "contact" && (
            <div className="space-y-8 animate-in fade-in duration-150">
              {/* Channels Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-2 hover:border-violet-400/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600/20 text-violet-400">
                      <Mail size={18} />
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

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-2 hover:border-sky-400/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/20 text-sky-400">
                      <MessageCircle size={18} />
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
                <h2 className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-violet-400 to-fuchsia-300 bg-clip-text text-transparent mb-1.5">
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
                      className="mt-2 inline-flex items-center gap-2 rounded-full bg-white text-black hover:bg-neutral-200 px-5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95"
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
                                  ? "border-violet-500/80 bg-violet-500/15 text-violet-200 shadow-sm font-bold"
                                  : "border-white/[0.08] bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.06] hover:border-white/20",
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
                          placeholder="Nguyễn Văn A"
                          className="w-full rounded-xl border border-white/[0.1] bg-black/50 px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                          Email nhận phản hồi <span className="text-violet-400">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full rounded-xl border border-white/[0.1] bg-black/50 px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
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
                        placeholder="Tóm tắt ngắn gọn nội dung liên hệ..."
                        className="w-full rounded-xl border border-white/[0.1] bg-black/50 px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        Nội dung chi tiết <span className="text-violet-400">*</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Nhập nội dung lời nhắn, câu hỏi hoặc đề xuất hợp tác của bạn..."
                        className="w-full rounded-xl border border-white/[0.1] bg-black/50 p-3.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all resize-y"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingContact}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-neutral-200 text-black px-8 py-3.5 text-xs sm:text-sm font-extrabold shadow-lg shadow-white/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingContact ? (
                        <>
                          <Loader2 size={16} className="animate-spin text-black" />
                          <span>Đang gửi tin nhắn...</span>
                        </>
                      ) : (
                        <>
                          <Send size={15} />
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
