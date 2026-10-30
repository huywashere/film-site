"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconBox,
  IconCloudUpload,
  IconDatabase,
  IconDeviceTv,
  IconEye,
  IconMovie,
  IconRefresh,
  IconUsers,
} from "@tabler/icons-react";
import { adminFetch } from "@/lib/admin-api";
import { PerformancePanel } from "@/components/PerformancePanel";
import { ProviderHealthPanel } from "@/components/ProviderHealthPanel";

type Stats = {
  totalUsers: number;
  totalMovies: number;
  activeUsers: number;
  viewsToday: number;
  viewsWeek: number;
  viewsMonth: number;
  range: string;
  rangeViews: number;
  activeWatchParties: number;
  openReports: number;
  catalog: { visibleMovies: number; hiddenMovies: number; moviesWithoutPlayback: number };
  operations: {
    activeSyncJobs: number;
    failedSyncJobs: number;
    queuedMediaUploads: number;
    failedMediaUploads: number;
    openIncidents: number;
    latestBackup: { status: string; createdAt: string; finishedAt?: string | null; errorMessage?: string | null } | null;
    recentSyncJobs: { id: string; source: string; status: string; processedCount: number; failedCount: number; updatedAt: string; errorMessage?: string | null }[];
  };
  dailyChartData: { date: string; views: number }[];
  topMovies: { id: string; title: string; views: number; year?: number; status: string; sourceCount: number }[];
  recentActivity: { id: string; action: string; adminEmail: string; details?: string; createdAt: string }[];
};

const formatNumber = (value = 0) => new Intl.NumberFormat("vi-VN", { notation: value > 99_999 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
const formatTime = (value?: string | null) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "Chưa có dữ liệu";
const rangeLabels: Record<string, string> = { "14d": "14 ngày", "30d": "30 ngày", "6m": "6 tháng", "1y": "1 năm" };

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [range, setRange] = useState("14d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError("");
    try {
      setStats(await adminFetch<Stats>(`stats?range=${range}`, { bypassCache: force }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải tổng quan vận hành");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { void refresh(false); }, [refresh]);

  const chart = useMemo(() => {
    const points = stats?.dailyChartData || [];
    if (!points.length) return "";
    const maximum = Math.max(...points.map((point) => point.views), 1);
    return points.map((point, index) => `${(index / Math.max(points.length - 1, 1)) * 100},${100 - (point.views / maximum) * 82 - 9}`).join(" ");
  }, [stats]);

  const attentionItems = [
    { count: stats?.operations.openIncidents || 0, label: "sự cố hệ thống đang mở", href: "/operations", tone: "rose" },
    { count: stats?.openReports || 0, label: "báo cáo người dùng cần xử lý", href: "/reports", tone: "amber" },
    { count: (stats?.operations.failedSyncJobs || 0) + (stats?.operations.failedMediaUploads || 0), label: "tác vụ đồng bộ hoặc ingest lỗi", href: "/crawler", tone: "rose" },
    { count: stats?.catalog.moviesWithoutPlayback || 0, label: "phim chưa có nguồn phát nội bộ", href: "/movies", tone: "slate" },
  ].filter((item) => item.count > 0);

  return (
    <div className="admin-fade-in space-y-5 pb-10">
      <header className="flex flex-col gap-4 border-b border-[var(--admin-line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--admin-muted)]">Điều hành / Tổng quan</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--admin-ink)]">Trạng thái vận hành FlexPhim</h1>
          <p className="mt-1 text-[12px] text-[var(--admin-muted)]">Theo dõi nội dung, lượt xem, nguồn phát và các tác vụ cần can thiệp.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={range} onChange={(event) => setRange(event.target.value)} className="admin-control h-9 px-3 text-[11px] font-semibold">
            {Object.entries(rangeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button onClick={() => void refresh(true)} disabled={loading} className="admin-icon-button" aria-label="Làm mới tổng quan"><IconRefresh size={16} className={loading ? "animate-spin" : ""} /></button>
        </div>
      </header>

      {error && <Notice tone="error">{error}</Notice>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={IconEye} label="Lượt xem hôm nay" value={formatNumber(stats?.viewsToday)} detail={`${formatNumber(stats?.viewsWeek)} trong 7 ngày`} href="/analytics" loading={loading} />
        <Metric icon={IconUsers} label="Người dùng hoạt động" value={formatNumber(stats?.activeUsers)} detail={`${formatNumber(stats?.totalUsers)} tài khoản tổng`} href="/users" loading={loading} />
        <Metric icon={IconMovie} label="Nội dung hiển thị" value={formatNumber(stats?.catalog.visibleMovies)} detail={`${formatNumber(stats?.catalog.hiddenMovies)} phim đang ẩn`} href="/movies" loading={loading} />
        <Metric icon={IconDeviceTv} label="Phòng xem chung" value={formatNumber(stats?.activeWatchParties)} detail={`${formatNumber(stats?.viewsMonth)} lượt xem 30 ngày`} href="/watch-party" loading={loading} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(330px,1fr)]">
        <article className="admin-card overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--admin-line)] px-5 py-4">
            <div><h2 className="text-[14px] font-bold text-[var(--admin-ink)]">Lượt xem theo thời gian</h2><p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">{formatNumber(stats?.rangeViews)} lượt xem trong {rangeLabels[range]}</p></div>
            <Link href="/analytics" className="admin-link"><span>Phân tích chi tiết</span><IconArrowRight size={14} /></Link>
          </div>
          <div className="p-5">
            <div className="h-48 rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface-muted)] p-3">
              {chart ? <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible" role="img" aria-label="Biểu đồ lượt xem"><defs><linearGradient id="view-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--admin-brand)" stopOpacity=".25"/><stop offset="1" stopColor="var(--admin-brand)" stopOpacity="0"/></linearGradient></defs><polygon points={`0,100 ${chart} 100,100`} fill="url(#view-area)"/><polyline points={chart} fill="none" stroke="var(--admin-brand)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/></svg> : <Empty text="Chưa có lượt xem trong khoảng thời gian đã chọn." />}
            </div>
            <div className="mt-3 flex justify-between text-[10px] text-[var(--admin-muted)]"><span>{stats?.dailyChartData[0]?.date || ""}</span><span>{stats?.dailyChartData.at(-1)?.date || ""}</span></div>
          </div>
        </article>

        <article className="admin-card overflow-hidden">
          <div className="border-b border-[var(--admin-line)] px-5 py-4"><h2 className="text-[14px] font-bold text-[var(--admin-ink)]">Cần chú ý</h2><p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">Các mục chưa được xử lý</p></div>
          <div className="divide-y divide-[var(--admin-line)]">
            {attentionItems.length ? attentionItems.map((item) => <Link key={item.label} href={item.href} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--admin-surface-muted)]"><span className={`grid h-8 min-w-8 place-items-center rounded-full text-[11px] font-bold ${item.tone === "rose" ? "bg-rose-500/10 text-rose-600" : item.tone === "amber" ? "bg-amber-500/10 text-amber-600" : "bg-slate-500/10 text-slate-600"}`}>{item.count}</span><span className="min-w-0 flex-1 text-[11px] font-medium text-[var(--admin-ink)]">{item.label}</span><IconArrowRight size={14} className="text-[var(--admin-muted)]" /></Link>) : <Empty text="Không có cảnh báo đang mở. Hệ thống đang ổn định." />}
          </div>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <ActionCard icon={IconBox} title="Catalog & nguồn phát" href="/movies" action="Mở thư viện">
          <StatusLine label="Tổng phim" value={formatNumber(stats?.totalMovies)} /><StatusLine label="Chưa có nguồn phát" value={formatNumber(stats?.catalog.moviesWithoutPlayback)} alert={Boolean(stats?.catalog.moviesWithoutPlayback)} /><StatusLine label="Phim đang ẩn" value={formatNumber(stats?.catalog.hiddenMovies)} />
        </ActionCard>
        <ActionCard icon={IconCloudUpload} title="Đồng bộ & ingest" href="/crawler" action="Quản lý tác vụ">
          <StatusLine label="Đang chạy / chờ" value={formatNumber((stats?.operations.activeSyncJobs || 0) + (stats?.operations.queuedMediaUploads || 0))} /><StatusLine label="Tác vụ lỗi" value={formatNumber((stats?.operations.failedSyncJobs || 0) + (stats?.operations.failedMediaUploads || 0))} alert={Boolean((stats?.operations.failedSyncJobs || 0) + (stats?.operations.failedMediaUploads || 0))} /><StatusLine label="Sync hoạt động" value={formatNumber(stats?.operations.activeSyncJobs)} />
        </ActionCard>
        <ActionCard icon={IconDatabase} title="Sao lưu dữ liệu" href="/operations" action="Mở vận hành">
          <StatusLine label="Trạng thái gần nhất" value={backupLabel(stats?.operations.latestBackup?.status)} alert={stats?.operations.latestBackup?.status === "FAILED"} /><StatusLine label="Hoàn tất lúc" value={formatTime(stats?.operations.latestBackup?.finishedAt || stats?.operations.latestBackup?.createdAt)} /><StatusLine label="Sự cố hệ thống" value={formatNumber(stats?.operations.openIncidents)} alert={Boolean(stats?.operations.openIncidents)} />
        </ActionCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-2"><ProviderHealthPanel /><PerformancePanel /></section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,1fr)]">
        <article className="admin-card overflow-hidden"><PanelHeader title="Phim được xem nhiều" detail={`Theo ${rangeLabels[range].toLowerCase()}`} href="/analytics" /><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead className="border-b border-[var(--admin-line)] bg-[var(--admin-surface-muted)] text-[10px] uppercase tracking-[.08em] text-[var(--admin-muted)]"><tr><th className="px-5 py-3">Phim</th><th className="px-5 py-3">Nguồn</th><th className="px-5 py-3">Lượt xem</th><th className="px-5 py-3">Trạng thái</th></tr></thead><tbody className="divide-y divide-[var(--admin-line)]">{stats?.topMovies.map((movie) => <tr key={movie.id} className="text-[11px]"><td className="px-5 py-3"><strong className="block max-w-[280px] truncate text-[var(--admin-ink)]">{movie.title}</strong><span className="text-[var(--admin-muted)]">{movie.year || "Chưa rõ năm"}</span></td><td className="px-5 py-3 font-semibold text-[var(--admin-ink)]">{movie.sourceCount}</td><td className="px-5 py-3 font-semibold text-[var(--admin-ink)]">{formatNumber(movie.views)}</td><td className="px-5 py-3"><StatusPill status={movie.status === "hidden" ? "Đã ẩn" : "Hiển thị"} tone={movie.status === "hidden" ? "slate" : "green"} /></td></tr>)}{!stats?.topMovies.length && <tr><td colSpan={4}><Empty text="Chưa ghi nhận lượt xem trong khoảng thời gian này." /></td></tr>}</tbody></table></div></article>
        <article className="admin-card overflow-hidden"><PanelHeader title="Đồng bộ gần đây" detail="Theo dõi tiến độ provider" href="/crawler" /><div className="divide-y divide-[var(--admin-line)]">{stats?.operations.recentSyncJobs.map((job) => <div key={job.id} className="px-5 py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-[11px] text-[var(--admin-ink)]">{job.source}</strong><span className="mt-0.5 block text-[10px] text-[var(--admin-muted)]">{formatNumber(job.processedCount)} mục · {formatTime(job.updatedAt)}</span>{job.errorMessage && <span className="mt-1 block truncate text-[10px] text-rose-600">{job.errorMessage}</span>}</div><StatusPill status={syncLabel(job.status)} tone={job.status === "FAILED" ? "red" : job.status === "COMPLETED" ? "green" : "amber"} /></div></div>)}{!stats?.operations.recentSyncJobs.length && <Empty text="Chưa có tác vụ đồng bộ." />}</div></article>
      </section>

      <section className="admin-card overflow-hidden"><PanelHeader title="Hoạt động quản trị gần đây" detail="Nhật ký thay đổi có thể truy vết" href="/audit" /><div className="divide-y divide-[var(--admin-line)]">{stats?.recentActivity.map((activity) => <div key={activity.id} className="grid gap-1 px-5 py-3 text-[11px] sm:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><strong className="text-[var(--admin-ink)]">{activity.action.replaceAll("_", " ")}</strong><span className="ml-2 text-[var(--admin-muted)]">{activity.details || activity.adminEmail}</span></div><time className="text-[10px] text-[var(--admin-muted)]">{formatTime(activity.createdAt)}</time></div>)}{!stats?.recentActivity.length && <Empty text="Chưa có hoạt động quản trị gần đây." />}</div></section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail, href, loading }: { icon: typeof IconEye; label: string; value: string; detail: string; href: string; loading: boolean }) { return <Link href={href} className="admin-card group p-4 transition-transform hover:-translate-y-0.5"><div className="flex items-start justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-[.08em] text-[var(--admin-muted)]">{label}</span><Icon size={17} className="text-[var(--admin-brand)]" /></div><strong className={`mt-4 block text-2xl tracking-[-.05em] text-[var(--admin-ink)] ${loading ? "animate-pulse" : ""}`}>{value}</strong><span className="mt-1 block text-[10px] text-[var(--admin-muted)]">{detail}</span></Link>; }
function ActionCard({ icon: Icon, title, href, action, children }: { icon: typeof IconBox; title: string; href: string; action: string; children: React.ReactNode }) { return <article className="admin-card overflow-hidden"><div className="flex items-center gap-2 border-b border-[var(--admin-line)] px-5 py-4"><Icon size={17} className="text-[var(--admin-brand)]" /><h2 className="text-[13px] font-bold text-[var(--admin-ink)]">{title}</h2></div><div className="space-y-3 px-5 py-4">{children}</div><Link href={href} className="admin-link border-t border-[var(--admin-line)] px-5 py-3"><span>{action}</span><IconArrowRight size={14} /></Link></article>; }
function StatusLine({ label, value, alert }: { label: string; value: string; alert?: boolean }) { return <div className="flex items-center justify-between gap-3 text-[11px]"><span className="text-[var(--admin-muted)]">{label}</span><strong className={alert ? "text-rose-600" : "text-[var(--admin-ink)]"}>{value}</strong></div>; }
function PanelHeader({ title, detail, href }: { title: string; detail: string; href: string }) { return <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-line)] px-5 py-4"><div><h2 className="text-[14px] font-bold text-[var(--admin-ink)]">{title}</h2><p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">{detail}</p></div><Link href={href} className="admin-link"><span>Xem tất cả</span><IconArrowRight size={14} /></Link></div>; }
function StatusPill({ status, tone }: { status: string; tone: "green" | "amber" | "red" | "slate" }) { const classes = { green: "bg-emerald-500/10 text-emerald-600", amber: "bg-amber-500/10 text-amber-600", red: "bg-rose-500/10 text-rose-600", slate: "bg-slate-500/10 text-slate-600" }; return <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${classes[tone]}`}>{status}</span>; }
function Notice({ tone, children }: { tone: "error"; children: React.ReactNode }) { return <div className={tone === "error" ? "rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-[11px] text-rose-600" : ""}>{children}</div>; }
function Empty({ text }: { text: string }) { return <p className="p-7 text-center text-[11px] text-[var(--admin-muted)]">{text}</p>; }
function backupLabel(status?: string) { return status === "COMPLETED" || status === "RESTORED" ? "Sẵn sàng" : status === "FAILED" ? "Thất bại" : status === "RUNNING" ? "Đang chạy" : status === "QUEUED" ? "Đang chờ" : "Chưa có"; }
function syncLabel(status: string) { return status === "COMPLETED" ? "Hoàn tất" : status === "FAILED" ? "Thất bại" : status === "RUNNING" ? "Đang chạy" : "Đang chờ"; }
