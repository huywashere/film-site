"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  IconDeviceFloppy as Save,
  IconExternalLink as ExternalLink,
  IconRefresh as RefreshCw,
  IconSparkles,
  IconChevronRight,
  IconCheck,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { adminFetch } from "@/lib/admin-api";
import { configurationUpdatePayload } from "@/lib/configuration-payload";
import { HeroBannerStudio } from "@/components/HeroBannerStudio";

type Configuration = {
  maintenanceMode: boolean;
  maintenanceNotice: string | null;
  announcementText: string | null;
  announcementLink: string | null;
  homePopupEnabled: boolean;
  homePopupTitle: string | null;
  homePopupBody: string | null;
  homePopupLink: string | null;
  homePopupLinkLabel: string | null;
  homePopupDismissLabel: string | null;
  homePopupVersion: number;
  heroMovieSlugs: string[];
  providerPriority: string[];
  autoSkipIntro: boolean;
  watchPartyEnabled: boolean;
  homeTop10Slugs: string[];
  homeSectionOrder: string[];
  homeHiddenSections: string[];
  homeFeaturedRows?: Record<string, unknown> | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  cacheVersion?: number;
  updatedAt?: string;
};

export default function HeroBannerPage() {
  const [config, setConfig] = useState<Configuration | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const current = await adminFetch<Configuration>("configuration");
      setConfig(current);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không tải được cấu hình",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (nextSlugs?: string[]) => {
    if (!config) return;
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const payloadConfig = nextSlugs
        ? { ...config, heroMovieSlugs: nextSlugs }
        : config;
      const updated = await adminFetch<Configuration>("configuration", {
        method: "PATCH",
        body: JSON.stringify(configurationUpdatePayload(payloadConfig)),
      });
      setConfig(updated);
      setNotice("Đã cập nhật danh sách Hero Banner thành công! Trang chủ Web đã đồng bộ.");
      setTimeout(() => setNotice(""), 4500);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không lưu được Hero Banner",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateSlugs = (slugs: string[]) => {
    if (!config) return;
    setConfig({ ...config, heroMovieSlugs: slugs });
  };

  return (
    <div className="admin-fade-in space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-extrabold text-[#31334a] dark:text-white">
              Hero Banner Studio
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-700 dark:text-blue-300">
              <IconSparkles size={12} /> Trang chủ Web
            </span>
          </div>
          <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
            Tùy biến phim nổi bật trình chiếu trên đầu trang chủ FlexPhim với hình ảnh backdrop 4K và hiệu ứng cinematic.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-[12px] font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <ExternalLink size={14} /> Xem thử Trang Chủ
          </a>

          <button
            onClick={() => void save()}
            disabled={saving || !config}
            className="admin-primary-button flex items-center gap-2 px-4 py-2 text-[12px]"
          >
            {saving ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            Lưu thay đổi
          </button>
        </div>
      </header>

      {/* Alerts */}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-4 py-3 text-[12px] font-semibold text-emerald-800 dark:text-emerald-300">
          <IconCheck size={18} className="shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 px-4 py-3 text-[12px] font-semibold text-rose-800 dark:text-rose-300">
          <IconAlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero Banner Studio Component */}
      {config && (
        <div className="space-y-6">
          <HeroBannerStudio
            heroMovieSlugs={config.heroMovieSlugs}
            onChange={(slugs) => {
              updateSlugs(slugs);
              void save(slugs);
            }}
          />

          <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/60 p-4">
            <div className="text-[12px] text-slate-500 dark:text-slate-400">
              Mẹo: Phim đầu tiên <strong className="text-blue-600 dark:text-blue-400">#1 LCP Hero</strong> sẽ được tối ưu tải trước (preload) để đạt điểm số tốc độ Google Core Web Vitals cao nhất.
            </div>
            <Link
              href="/configuration"
              className="text-[12px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              Cấu hình các thành phần khác <IconChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
