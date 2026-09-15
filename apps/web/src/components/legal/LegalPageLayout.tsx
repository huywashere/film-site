"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ArrowLeft,
  Calendar,
  Clock,
  Shield,
  FileText,
  HelpCircle,
  Mail,
  Share2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TOCItem {
  id: string;
  title: string;
  level?: number;
}

interface LegalPageLayoutProps {
  badge: string;
  badgeIcon?: React.ReactNode;
  title: string;
  description: string;
  lastUpdated: string;
  readTime: string;
  toc?: TOCItem[];
  children: React.ReactNode;
}

export function LegalPageLayout({
  badge,
  badgeIcon,
  title,
  description,
  lastUpdated,
  readTime,
  toc = [],
  children,
}: LegalPageLayoutProps) {
  const [activeSection, setActiveSection] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Track active TOC section on scroll
  useEffect(() => {
    if (toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-100px 0px -60% 0px" },
    );

    toc.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navLinks = [
    { label: "Báo lỗi", href: "/report", icon: HelpCircle, disabled: true },
    { label: "Chính sách bảo mật", href: "/privacy", icon: Shield, disabled: true },
    { label: "Điều khoản sử dụng", href: "/terms", icon: FileText, disabled: true },
    { label: "Liên hệ", href: "/contact", icon: Mail, disabled: true },
  ];

  return (
    <div className="min-h-screen bg-background text-neutral-200 pb-20">
      {/* Header Banner Background */}
      <div className="relative overflow-hidden border-b border-white/[0.08] pt-24 pb-12 sm:pt-28 sm:pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-neutral-400 mb-6">
            <Link
              href="/"
              className="hover:text-white transition-colors flex items-center gap-1 font-medium"
            >
              <ArrowLeft size={13} />
              Trang chủ
            </Link>
            <ChevronRight size={13} className="text-neutral-600" />
            <span className="text-neutral-500">Hỗ trợ & Bản quyền</span>
            <ChevronRight size={13} className="text-neutral-600" />
            <span className="text-white font-semibold truncate">
              {title}
            </span>
          </nav>

          {/* Badge & Title */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-neutral-400 mb-4 shadow-sm">
              {badgeIcon || <Shield size={13} />}
              <span>{badge}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-[1.15]">
              {title}
            </h1>

            <p className="mt-4 text-sm sm:text-base text-neutral-400 leading-relaxed max-w-2xl">
              {description}
            </p>

            {/* Metadata Bar */}
            <div className="mt-6 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-neutral-400 border-t border-white/[0.08] pt-4">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-neutral-400" />
                Cập nhật lần cuối: <strong className="text-neutral-200">{lastUpdated}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-neutral-400" />
                Thời gian đọc: <strong className="text-neutral-200">{readTime}</strong>
              </span>

              <button
                type="button"
                onClick={handleShare}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    <span className="text-emerald-400">Đã sao chép link</span>
                  </>
                ) : (
                  <>
                    <Share2 size={13} />
                    <span>Chia sẻ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: 2 Columns on Desktop */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-10 sm:mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 xl:gap-12 items-start">
          {/* Sidebar Nav & Table of Contents */}
          <aside className="hidden lg:block sticky top-24 space-y-6">
            {/* Quick Switch Section Navigation */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-3 px-2">
                Hỗ trợ & Pháp lý
              </p>
              <div className="space-y-1">
                {navLinks.map((link) => {
                  if (link.disabled) {
                    return (
                      <div
                        key={link.href}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-500 cursor-not-allowed select-none opacity-60"
                        title="Tính năng đang tạm đóng để nâng cấp"
                      >
                        <link.icon size={15} className="text-neutral-600 shrink-0" />
                        <span>{link.label}</span>
                      </div>
                    );
                  }

                  const isCurrent =
                    typeof window !== "undefined" &&
                    window.location.pathname.startsWith(link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                        isCurrent
                          ? "bg-white text-black font-extrabold shadow-sm"
                          : "text-neutral-400 hover:text-white hover:bg-white/[0.04]",
                      )}
                    >
                      <link.icon size={15} />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Table of Contents (if provided) */}
            {toc.length > 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-3 px-2 flex items-center gap-1.5">
                  <FileText size={13} />
                  Mục lục nội dung
                </p>
                <nav className="space-y-0.5 text-xs max-h-[350px] overflow-y-auto pr-1">
                  {toc.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className={cn(
                          "block py-1.5 px-2.5 rounded-lg transition-all line-clamp-1",
                          item.level === 2 && "pl-5 text-[11.5px]",
                          isActive
                            ? "font-bold text-white bg-white/10 border-l-2 border-white"
                            : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.02]",
                        )}
                      >
                        {item.title}
                      </a>
                    );
                  })}
                </nav>
              </div>
            )}
          </aside>

          {/* Main Article Document */}
          <main className="min-w-0">
            <article className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-10 shadow-sm space-y-10 leading-relaxed text-sm sm:text-base">
              {children}
            </article>

            {/* Bottom Support Callout */}
            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="font-bold text-white text-base sm:text-lg">
                  Bạn có câu hỏi hoặc cần giải đáp thêm?
                </h4>
                <p className="text-xs sm:text-sm text-neutral-400">
                  Đội ngũ chăm sóc và pháp lý của FlexPhim luôn sẵn sàng hỗ trợ phản hồi trong vòng 24h.
                </p>
              </div>
              <Link
                href="/contact"
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-white hover:bg-neutral-200 text-black px-5 py-3 text-xs font-bold shadow-sm transition-all active:scale-95"
              >
                <Mail size={15} />
                <span>Liên hệ hỗ trợ</span>
              </Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
