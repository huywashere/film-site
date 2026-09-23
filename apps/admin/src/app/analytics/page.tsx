'use client';

import { useEffect, useState } from 'react';
import {
  IconActivity,
  IconChartBar,
  IconDatabase,
  IconSearch,
  IconUsers,
} from '@tabler/icons-react';
import { adminFetch } from '@/lib/admin-api';

type DatabaseQuery = {
  calls: number;
  totalExecMs: number;
  meanExecMs: number;
  returnedRows: number;
  sharedBlocksHit: number;
  sharedBlocksRead: number;
  tempBlocksWritten: number;
  query: string;
};

type Analytics = {
  activeUsers: number;
  totalViews: number;
  topMovies: Array<{ id: string; title?: string; views: number }>;
  searches: Array<{ query: string; count: number; averageResults: number }>;
  playbackErrors: Array<{ code: string; count: number }>;
  buffering: { averageMs: number };
  providers: Array<{
    provider: string;
    events: number;
    averageBufferMs: number;
  }>;
  cache: { hitRate: number };
  database: {
    enabled: boolean;
    reason: string | null;
    cacheHitRate?: number;
    topQueries: DatabaseQuery[];
  };
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [range, setRange] = useState('30');
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    adminFetch<Analytics>(`analytics/advanced?range=${range}`)
      .then(setData)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Không tải được analytics'),
      );
  }, [range]);

  return (
    <div className="admin-fade-in space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-400">PHÂN TÍCH / NÂNG CAO</p>
          <h1>Analytics nội dung và hệ thống</h1>
          <p className="mt-1 text-[12px] text-slate-500">
            Lượt xem, tìm kiếm, player, cache và truy vấn PostgreSQL.
          </p>
        </div>
        <select
          value={range}
          onChange={(event) => setRange(event.target.value)}
          className="admin-control px-3"
        >
          <option value="7">7 ngày</option>
          <option value="30">30 ngày</option>
          <option value="90">90 ngày</option>
        </select>
      </header>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-700">
          {error}
        </p>
      )}

      {!data ? (
        <div className="admin-card p-8 text-[11px] text-slate-400">Đang tổng hợp dữ liệu...</div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric icon={<IconActivity />} label="Lượt xem" value={data.totalViews} />
            <Metric icon={<IconUsers />} label="Người dùng hoạt động" value={data.activeUsers} />
            <Metric
              icon={<IconChartBar />}
              label="Buffer trung bình"
              value={`${Math.round(data.buffering.averageMs)} ms`}
            />
            <Metric
              icon={<IconSearch />}
              label="Cache ứng dụng"
              value={`${Math.round(data.cache.hitRate * 100)}%`}
            />
            <Metric
              icon={<IconDatabase />}
              label="Cache PostgreSQL"
              value={
                data.database.enabled
                  ? `${Math.round((data.database.cacheHitRate || 0) * 100)}%`
                  : 'Chưa bật'
              }
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <Table
              title="Phim được xem nhiều"
              rows={data.topMovies.map((item) => [item.title || item.id, `${item.views} lượt`])}
            />
            <Table
              title="Từ khóa tìm kiếm"
              rows={data.searches.map((item) => [
                item.query,
                `${item.count} lần / TB ${item.averageResults.toFixed(1)} kết quả`,
              ])}
            />
            <Table
              title="Hiệu quả nguồn phát"
              rows={data.providers.map((item) => [
                item.provider,
                `${item.events} event / buffer ${Math.round(item.averageBufferMs)} ms`,
              ])}
            />
            <Table
              title="Lỗi player"
              rows={data.playbackErrors.map((item) => [item.code, `${item.count} lần`])}
            />
          </section>

          <DatabasePanel database={data.database} />
        </>
      )}
    </div>
  );
}

function DatabasePanel({ database }: { database: Analytics['database'] }) {
  if (!database.enabled) {
    return (
      <article className="admin-card p-5">
        <div className="flex items-center gap-2 text-[13px] font-bold text-slate-800">
          <IconDatabase size={18} /> Truy vấn PostgreSQL
        </div>
        <p className="mt-2 text-[11px] text-amber-600">
          {database.reason || 'pg_stat_statements chưa sẵn sàng.'}
        </p>
      </article>
    );
  }

  return (
    <Table
      title="Truy vấn PostgreSQL tốn thời gian nhất"
      rows={database.topQueries.map((item) => [
        item.query,
        `${item.calls.toFixed(0)} lần · TB ${item.meanExecMs.toFixed(1)} ms · tổng ${item.totalExecMs.toFixed(0)} ms`,
      ])}
    />
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <article className="admin-card flex items-center gap-3 p-4">
      <span className="grid h-9 w-9 place-items-center rounded-md bg-blue-50 text-blue-600">
        {icon}
      </span>
      <div>
        <span className="block text-[10px] text-slate-400">{label}</span>
        <strong className="text-[19px] text-slate-800">{value}</strong>
      </div>
    </article>
  );
}

function Table({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <article className="admin-card overflow-hidden">
      <h2 className="border-b border-[var(--admin-line)] px-5 py-4 text-[13px] font-bold text-slate-800">
        {title}
      </h2>
      <div className="divide-y divide-[var(--admin-line)]">
        {rows.slice(0, 12).map((row, index) => (
          <div
            key={`${row[0]}-${index}`}
            className="flex justify-between gap-3 px-5 py-3 text-[10px]"
          >
            <strong className="min-w-0 truncate text-slate-700" title={row[0]}>
              {row[0]}
            </strong>
            <span className="shrink-0 text-slate-400">{row[1]}</span>
          </div>
        ))}
        {!rows.length && (
          <p className="p-7 text-center text-[10px] text-slate-400">Chưa có dữ liệu.</p>
        )}
      </div>
    </article>
  );
}
