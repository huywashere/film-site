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
    { label: "Báo lỗi", href: "/report", icon: HelpCircle },
    { label: "Chính sách bảo mật", href: "/privacy", icon: Shield },
    { label: "Điều khoản sử dụng", href: "/terms", icon: FileText },
    { label: "Liên hệ", href: "/contact", icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-neutral-200 pb-20">
      {/* Header Banner Background */}
      <div className="relative overflow-hidden border-b border-neutral-800/80 bg-gradient-to-b from-[#121622] via-[#0d1017] to-[#07090e] pt-24 pb-12 sm:pt-28 sm:pb-16">
        {/* Glow blur background circles */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-violet-600/10 blur-[130px] rounded-full" />
        <div className="pointer-events-none absolute top-10 right-10 w-[300px] h-[250px] bg-indigo-500/10 blur-[100px] rounded-full" />

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
            <span className="text-violet-400 font-semibold truncate">
              {title}
            </span>
          </nav>

          {/* Badge & Title */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300 mb-4 shadow-sm">
              {badgeIcon || <Shield size={13} />}
              <span>{badge}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white font-[family-name:var(--font-manrope)] leading-[1.15]">
              {title}
            </h1>

            <p className="mt-4 text-sm sm:text-base text-neutral-300 leading-relaxed max-w-2xl">
              {description}
            </p>

            {/* Metadata Bar */}
            <div className="mt-6 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-neutral-400 border-t border-neutral-800/80 pt-4">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-violet-400" />
                Cập nhật lần cuối: <strong className="text-neutral-200">{lastUpdated}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-violet-400" />
                Thời gian đọc: <strong className="text-neutral-200">{readTime}</strong>
              </span>

              <button
                type="button"
                onClick={handleShare}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-neutral-700/60 bg-[#161a24] px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
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
            <div className="rounded-2xl border border-neutral-800/80 bg-[#121622]/90 p-4 shadow-lg backdrop-blur-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-3 px-2">
                Hỗ trợ & Pháp lý
              </p>
              <div className="space-y-1">
                {navLinks.map((link) => {
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
                          ? "bg-violet-600 text-white shadow-md shadow-violet-600/25"
                          : "text-neutral-400 hover:text-white hover:bg-white/5",
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
              <div className="rounded-2xl border border-neutral-800/80 bg-[#121622]/90 p-4 shadow-lg backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-violet-400 mb-3 px-2 flex items-center gap-1.5">
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
                            ? "font-bold text-violet-300 bg-violet-500/10 border-l-2 border-violet-500"
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
            <article className="rounded-3xl border border-neutral-800/90 bg-[#121622] p-6 sm:p-10 shadow-2xl space-y-10 leading-relaxed text-sm sm:text-base">
              {children}
            </article>

            {/* Bottom Support Callout */}
            <div className="mt-8 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-950/30 via-[#161a28] to-[#121622] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="font-bold text-white text-base sm:text-lg">
                  Bạn có câu hỏi hoặc cần giải đáp thêm?
                </h4>
                <p className="text-xs sm:text-sm text-neutral-400">
                  Đội ngũ chăm sóc và pháp lý của NetPhim luôn sẵn sàng hỗ trợ phản hồi trong vòng 24h.
                </p>
              </div>
              <Link
                href="/contact"
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-violet-600/30 transition-all active:scale-95"
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
