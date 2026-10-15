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

      try {
        await adminFetch("cache/revalidate", {
          method: "POST",
          body: JSON.stringify({ paths: ["/"] }),
        });
      } catch {
        // Revalidation is non-blocking
      }

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
    <div className="admin-fade-in space-y-5">
      {/* Paces Style Breadcrumb & Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <Link href="/" className="hover:text-[var(--admin-brand)] transition-colors">
              Quản lý
            </Link>
            <IconChevronRight size={12} className="opacity-60" />
            <span className="text-slate-600 dark:text-slate-300">Hero Banner Studio</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[20px] font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Hero Banner Studio
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live on Web
            </span>
          </div>

          <p className="text-[12.5px] text-slate-500 dark:text-slate-400">
            Tùy biến danh sách phim nổi bật trình chiếu đầu trang chủ với hình ảnh backdrop 4K HDR và tối ưu LCP.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-[38px] items-center gap-1.5 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface)] px-3.5 text-[12px] font-semibold text-slate-700 hover:text-[var(--admin-brand)] hover:border-[var(--admin-brand)] dark:text-slate-200 shadow-sm transition-all"
          >
            <ExternalLink size={14} />
            <span>Xem thử Trang Chủ</span>
          </a>

          <button
            onClick={() => void save()}
            disabled={saving || !config}
            className="admin-primary-button !h-[38px] px-4 text-[12px] font-semibold shadow-sm"
          >
            {saving ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </header>

      {/* Alerts */}
      {notice && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/20 dark:border-emerald-800/60 px-4 py-3 text-[12px] font-semibold text-emerald-800 dark:text-emerald-300 shadow-xs">
          <IconCheck size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50/80 dark:bg-rose-950/20 dark:border-rose-800/60 px-4 py-3 text-[12px] font-semibold text-rose-800 dark:text-rose-300 shadow-xs">
          <IconAlertTriangle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero Banner Studio Component */}
      {config && (
        <div className="space-y-5">
          <HeroBannerStudio
            heroMovieSlugs={config.heroMovieSlugs}
            onChange={(slugs) => {
              updateSlugs(slugs);
              void save(slugs);
            }}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface)] p-3.5 text-[12px]">
            <div className="text-slate-500 dark:text-slate-400">
              Mẹo vận hành: Phim đầu tiên <strong className="text-[var(--admin-brand)]">#01 Primary LCP</strong> sẽ tự động được preload hình ảnh chất lượng cao để đạt tốc độ hiển thị nhanh nhất.
            </div>
            <Link
              href="/configuration"
              className="font-semibold text-[var(--admin-brand)] hover:underline inline-flex items-center gap-1 text-[12px]"
            >
              Cấu hình các thành phần khác <IconChevronRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
