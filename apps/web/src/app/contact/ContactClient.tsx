"use client";

import React, { useState } from "react";
import { LegalPageLayout, TOCItem } from "@/components/legal/LegalPageLayout";
import {
  Mail,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  SendHorizontal,
  Clock,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/ToastProvider";

const TOC: TOCItem[] = [
  { id: "channels", title: "1. Các kênh hỗ trợ chính thức" },
  { id: "contact-form", title: "2. Biểu mẫu gửi tin nhắn liên hệ" },
  { id: "partnership", title: "3. Hợp tác quảng cáo & Bản quyền" },
  { id: "faq", title: "4. Câu hỏi thường gặp" },
];

const CONTACT_TOPICS = [
  { id: "support", label: "Hỗ trợ tài khoản & kỹ thuật" },
  { id: "feedback", label: "Đóng góp ý kiến & Đề xuất phim" },
  { id: "ads", label: "Hợp tác quảng cáo & Truyền thông" },
  { id: "dmca", label: "Khiếu nại bản quyền DMCA" },
  { id: "other", label: "Vấn đề khác" },
];

export function ContactClient() {
  const { toast } = useToast();
  const [topic, setTopic] = useState("support");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !email.trim()) {
      toast("Vui lòng điền đầy đủ email và nội dung tin nhắn", "error");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      toast("Tin nhắn của bạn đã được gửi thành công đến ban quản trị NetPhim!", "success");
    }, 1000);
  };

  return (
    <LegalPageLayout
      badge="Kết Nối & Hỗ Trợ"
      badgeIcon={<MessageSquare size={14} className="text-violet-400" />}
      title="Liên Hệ Ban Quản Trị & Hỗ Trợ"
      description="Chúng tôi luôn sẵn sàng lắng nghe mọi ý kiến đóng góp, hỗ trợ giải đáp thắc mắc và kết nối hợp tác từ các đối tác và người dùng NetPhim."
      lastUpdated="19/08/2026"
      readTime="3 phút đọc & gửi tin"
      toc={TOC}
    >
      {/* Section 1: Official Channels */}
      <section id="channels" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">1.</span> Các kênh hỗ trợ chính thức
        </h2>
        <p className="text-neutral-300">
          Để nhận được phản hồi nhanh nhất, bạn có thể kết nối với chúng tôi qua các kênh dưới đây:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
          <div className="rounded-2xl border border-neutral-800 bg-[#161a26] p-5 space-y-2.5 hover:border-violet-500/40 transition-all">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
                <Mail size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Hòm thư điện tử (Email)</h4>
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

          <div className="rounded-2xl border border-neutral-800 bg-[#161a26] p-5 space-y-2.5 hover:border-violet-500/40 transition-all">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                <MessageCircle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Telegram Hỗ Trợ 24/7</h4>
                <p className="text-xs text-neutral-400">Phản hồi nhanh các sự cố trực tuyến</p>
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
      </section>

      {/* Section 2: Interactive Contact Form */}
      <section id="contact-form" className="scroll-mt-24 space-y-6 pt-4 border-t border-neutral-800">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300 mb-2">
            <Sparkles size={13} />
            <span>Biểu mẫu liên hệ trực tuyến</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="text-violet-400">2.</span> Gửi tin nhắn trực tiếp đến ban quản trị
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-neutral-400">
            Điền thông tin và lời nhắn của bạn vào biểu mẫu bên dưới. Chúng tôi sẽ phản hồi qua email trong vòng 24 giờ.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] p-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Đã gửi tin nhắn thành công!</h3>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-md mx-auto leading-relaxed">
              Cảm ơn bạn đã liên hệ với NetPhim. Đội ngũ phụ trách sẽ xem xét và phản hồi đến email <strong>{email}</strong> sớm nhất có thể.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setMessage("");
                setSubject("");
              }}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer"
            >
              <SendHorizontal size={13} />
              Gửi thêm tin nhắn khác
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-neutral-800/80 bg-[#161a26] p-5 sm:p-7">
            {/* Topic Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2.5">
                Chủ đề liên hệ <span className="text-violet-400">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {CONTACT_TOPICS.map((item) => {
                  const isSelected = topic === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTopic(item.id)}
                      className={cn(
                        "p-2.5 rounded-xl border text-xs font-semibold transition-all text-left truncate cursor-pointer",
                        isSelected
                          ? "border-violet-500 bg-violet-600/20 text-violet-200 shadow-sm"
                          : "border-neutral-800 bg-[#1b202c] text-neutral-400 hover:text-white hover:border-neutral-700",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Họ và tên của bạn
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full rounded-xl border border-neutral-700/70 bg-[#1b202c] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Địa chỉ Email nhận phản hồi <span className="text-violet-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-neutral-700/70 bg-[#1b202c] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/20 transition-all"
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
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Tóm tắt ngắn gọn nội dung cần liên hệ..."
                className="w-full rounded-xl border border-neutral-700/70 bg-[#1b202c] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/20 transition-all"
              />
            </div>

            {/* Message Content */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                Nội dung chi tiết <span className="text-violet-400">*</span>
              </label>
              <textarea
                rows={5}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nhập nội dung lời nhắn, góp ý hoặc câu hỏi của bạn..."
                className="w-full rounded-xl border border-neutral-700/70 bg-[#1b202c] p-3.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/20 transition-all resize-y"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-violet-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang gửi tin nhắn...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Gửi tin nhắn</span>
                </>
              )}
            </button>
          </form>
        )}
      </section>

      {/* Section 3: Partnership */}
      <section id="partnership" className="scroll-mt-24 space-y-4 pt-4 border-t border-neutral-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">3.</span> Hợp tác quảng cáo & Bản quyền
        </h2>
        <p className="text-neutral-300">
          Đối với các vấn đề liên quan đến hợp tác truyền thông, tài trợ hoặc khiếu nại bản quyền nội dung DMCA, xin vui lòng gửi thư trực tiếp đến các địa chỉ chuyên trách:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div className="p-3.5 rounded-xl border border-neutral-800 bg-[#161a26]">
            <span className="text-xs text-neutral-400 block mb-1">Hợp tác kinh doanh & Ads:</span>
            <a href="mailto:business@netphim.tv" className="text-sm font-bold text-violet-400 hover:underline">
              business@netphim.tv
            </a>
          </div>
          <div className="p-3.5 rounded-xl border border-neutral-800 bg-[#161a26]">
            <span className="text-xs text-neutral-400 block mb-1">Ban pháp chế & Bản quyền DMCA:</span>
            <a href="mailto:dmca@netphim.tv" className="text-sm font-bold text-violet-400 hover:underline">
              dmca@netphim.tv
            </a>
          </div>
        </div>
      </section>

      {/* Section 4: FAQ */}
      <section id="faq" className="scroll-mt-24 space-y-4 pt-4 border-t border-neutral-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">4.</span> Câu hỏi thường gặp (FAQ)
        </h2>
        <div className="space-y-3">
          <div className="rounded-xl border border-neutral-800 bg-[#161a26] p-4">
            <h4 className="text-sm font-bold text-white mb-1">NetPhim có thu phí người dùng khi xem phim không?</h4>
            <p className="text-xs text-neutral-400">
              Không. NetPhim cung cấp dịch vụ xem phim hoàn toàn miễn phí cho tất cả mọi người với chất lượng lên tới 4K Ultra HD.
            </p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-[#161a26] p-4">
            <h4 className="text-sm font-bold text-white mb-1">Làm thế nào để yêu cầu thêm bộ phim tôi muốn xem?</h4>
            <p className="text-xs text-neutral-400">
              Bạn có thể sử dụng biểu mẫu phía trên, chọn chủ đề <em>&quot;Đóng góp ý kiến &amp; Đề xuất phim&quot;</em> và gửi tên bộ phim cùng năm phát hành.
            </p>
          </div>
        </div>
      </section>
    </LegalPageLayout>
  );
}
