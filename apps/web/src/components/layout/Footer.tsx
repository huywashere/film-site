"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check, Mail, Play } from "lucide-react";

const FOOTER_LINKS = [
  {
    heading: "Khám phá",
    links: [
      { label: "Phim mới", href: "/films" },
      { label: "Phim bộ", href: "/films/series" },
      { label: "Phim lẻ", href: "/films/single" },
      { label: "Hoạt hình", href: "/films/hoat-hinh" },
    ],
  },
  {
    heading: "Thể loại",
    links: [
      { label: "Hành động", href: "/genre/hanh-dong" },
      { label: "Tình cảm", href: "/genre/tinh-cam" },
      { label: "Khoa học viễn tưởng", href: "/genre/khoa-hoc-vien-tuong" },
      { label: "Kinh dị", href: "/genre/kinh-di" },
    ],
  },
  {
    heading: "Quốc gia",
    links: [
      { label: "Hàn Quốc", href: "/country/han-quoc" },
      { label: "Trung Quốc", href: "/country/trung-quoc" },
      { label: "Âu Mỹ", href: "/country/au-my" },
      { label: "Nhật Bản", href: "/country/nhat-ban" },
    ],
  },
  {
    heading: "CinePhim",
    links: [
      { label: "Điều khoản", href: "/terms" },
      { label: "Quyền riêng tư", href: "/privacy" },
      { label: "Báo cáo nội dung", href: "/report" },
      { label: "Liên hệ", href: "/contact" },
    ],
  },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const year = new Date().getFullYear();

  const handleSubscribe = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer
      data-site-footer="true"
      className="relative z-20 w-full overflow-hidden bg-[#080a0e] px-4 pt-10 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pl-28 lg:pr-12 md:pt-16 lg:pb-14"
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-violet-700/20 via-transparent to-transparent" />

      <div
        data-footer-card="true"
        className="relative mx-auto w-full max-w-[1500px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1015] shadow-[0_30px_100px_rgba(0,0,0,0.38)]"
      >
        <div className="grid min-h-[410px] lg:grid-cols-[0.82fr_1.18fr]">
          <section
            data-footer-newsletter="true"
            className="relative overflow-hidden border-b border-white/10 p-7 sm:p-10 lg:border-b-0 lg:border-r lg:p-12"
          >
            <div className="pointer-events-none absolute -bottom-48 -left-28 h-[430px] w-[430px] rounded-full border border-white/[0.055]" />
            <div className="pointer-events-none absolute -bottom-56 -left-12 h-[430px] w-[430px] rounded-full border border-white/[0.045]" />
            <div className="pointer-events-none absolute -bottom-64 left-4 h-[430px] w-[430px] rounded-full border border-white/[0.035]" />

            <div className="relative flex h-full max-w-lg flex-col justify-between gap-14">
              <Link href="/" className="inline-flex w-fit items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/25 bg-violet-300/[0.1] text-violet-200 shadow-[0_10px_30px_rgba(109,40,217,0.18)]">
                  <Play size={17} fill="currentColor" />
                </span>
                <span className="text-xl font-black tracking-tight text-white">
                  cinephim
                </span>
              </Link>

              <div>
                <h2
                  data-footer-heading="true"
                  className="max-w-md text-2xl font-black tracking-tight text-white sm:text-3xl"
                >
                  Có phim hay, chúng tôi sẽ báo bạn biết.
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-neutral-400">
                  Nhận danh sách phim đáng xem và các cập nhật quan trọng. Không
                  gửi thư rác.
                </p>

                <form onSubmit={handleSubscribe} className="mt-7 max-w-md">
                  <label htmlFor="footer-email" className="sr-only">
                    Email nhận bản tin
                  </label>
                  <div
                    data-footer-input="true"
                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] p-1.5 shadow-inner transition-colors focus-within:border-violet-300/40"
                  >
                    <Mail
                      size={16}
                      className="ml-3 shrink-0 text-neutral-500"
                    />
                    <input
                      id="footer-email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Email của bạn"
                      className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm text-white outline-none placeholder:text-neutral-600"
                    />
                    <button
                      type="submit"
                      className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black transition-colors hover:bg-violet-100 active:scale-[0.98]"
                    >
                      {subscribed ? <Check size={14} /> : null}
                      {subscribed ? "Đã đăng ký" : "Đăng ký"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>

          <div className="flex min-w-0 flex-col">
            <div className="grid flex-1 grid-cols-2 gap-x-7 gap-y-10 p-7 sm:grid-cols-4 sm:p-10 lg:p-12">
              {FOOTER_LINKS.map((column) => (
                <div key={column.heading}>
                  <p className="mb-5 text-[11px] font-semibold text-neutral-500">
                    {column.heading}
                  </p>
                  <ul className="space-y-3.5">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          data-footer-link="true"
                          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-300 transition-colors hover:text-white"
                        >
                          {link.label}
                          <ArrowUpRight
                            size={12}
                            className="translate-y-0.5 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-70"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div
              data-footer-bottom="true"
              className="flex flex-col gap-3 border-t border-white/10 px-7 py-5 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-12"
            >
              <p>
                © 2024 - {year} CinePhim. Nội dung được tổng hợp từ các nguồn
                công khai.
              </p>
              <div className="flex items-center gap-4">
                <Link
                  href="/privacy"
                  className="transition-colors hover:text-white"
                >
                  Quyền riêng tư
                </Link>
                <Link
                  href="/terms"
                  className="transition-colors hover:text-white"
                >
                  Điều khoản
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
