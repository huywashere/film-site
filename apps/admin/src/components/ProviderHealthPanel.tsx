'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ProviderHealthPayload, ProviderStatus } from '@netphim/shared-types';
import {
  IconAlertTriangle as AlertTriangle,
  IconCircleCheck as CheckCircle2,
  IconClock as Clock3,
  IconRefresh as RefreshCw,
  IconServerOff as ServerOff,
  IconFlame as Flame,
} from '@tabler/icons-react';

const STATUS_STYLE: Record<ProviderStatus, { label: string; dot: string; badge: string }> = {
  operational: {
    label: 'Ổn định',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  },
  degraded: {
    label: 'Phản hồi chậm',
    dot: 'bg-amber-500',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  },
  down: {
    label: 'Mất kết nối',
    dot: 'bg-rose-500',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
  },
};

function checkedTime(value?: string) {
  if (!value) return 'Chưa kiểm tra';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

export function ProviderHealthPanel() {
  const [data, setData] = useState<ProviderHealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/provider-health${force ? '?force=1' : ''}`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setData((await response.json()) as ProviderHealthPayload);
    } catch {
      setError('Không thể tải trạng thái nguồn phim từ máy chủ quản trị.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const summaryTone =
    data?.status === 'operational'
      ? 'text-emerald-500'
      : data?.status === 'degraded'
        ? 'text-amber-500'
        : 'text-rose-500';

  return (
    <section className="admin-card overflow-hidden" aria-live="polite">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-line)] px-5 py-4">
        <div>
          <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">
            Sức khỏe nguồn phim & API
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Kiểm tra qua proxy website mỗi 60 giây
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span
              className={`hidden items-center gap-1 text-[10px] font-bold sm:inline-flex ${summaryTone}`}
            >
              {data.status === 'operational' ? (
                <CheckCircle2 size={13} />
              ) : data.status === 'degraded' ? (
                <AlertTriangle size={13} />
              ) : (
                <ServerOff size={13} />
              )}
              {data.summary.operational}/{data.summary.total} ổn định
            </span>
          )}
          <button
            type="button"
            onClick={() => void refresh(true)}
            disabled={loading}
            className="admin-icon-button !h-8 !w-8 disabled:opacity-50"
            aria-label="Kiểm tra lại các nguồn phim"
            title="Kiểm tra lại"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="p-5">
        {data?.proxy?.status === 'down' && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] leading-5 text-amber-500">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>{data.proxy.message}</span>
          </div>
        )}
        {loading && !data ? (
          <div className="space-y-3" aria-label="Đang kiểm tra nguồn phim">
            {Array.from({ length: 7 }, (_, index) => (
              <div
                key={index}
                className="h-[52px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/50"
              />
            ))}
          </div>
        ) : error && !data ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
            <div className="flex items-start gap-2 text-[11px] leading-5 text-rose-500 dark:text-rose-400">
              <ServerOff size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => void refresh(true)}
              className="mt-3 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
            >
              Thử kiểm tra lại
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--admin-line)]">
            {data?.providers.map((provider) => {
              const style = STATUS_STYLE[provider.status];
              const quota = provider.quota;
              const isQuotaExhausted = quota && quota.remaining <= 0;
              const isQuotaLow = quota && quota.remaining > 0 && quota.remaining < 100;

              return (
                <div key={provider.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${isQuotaExhausted ? 'bg-rose-500' : style.dot}`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="truncate text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                            {provider.name}
                          </span>
                          {quota && (
                            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 bg-blue-500/10 border border-blue-500/20 text-[9px] font-semibold text-blue-600 dark:text-blue-400">
                              <Flame size={10} /> Quota: {quota.usedToday}/{quota.dailyLimit}
                            </span>
                          )}
                        </div>
                        <span className="block truncate text-[10px] text-slate-400">
                          {provider.role}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                          isQuotaExhausted
                            ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            : isQuotaLow
                              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                              : style.badge
                        }`}
                        title={provider.message}
                      >
                        {isQuotaExhausted
                          ? 'Hết Quota'
                          : isQuotaLow
                            ? 'Sắp Hết Quota'
                            : style.label}
                      </span>
                      <span className="mt-1 block font-mono text-[10px] text-slate-400">
                        {provider.httpStatus ? `HTTP ${provider.httpStatus} · ` : ''}
                        {provider.latencyMs}ms
                      </span>
                    </div>
                  </div>

                  {/* Enhanced Quota Bar for OMDb / Quota-limited APIs */}
                  {quota && (
                    <div className="mt-2.5 rounded-lg border border-slate-700/30 bg-slate-800/30 p-2 text-[10px]">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="font-medium text-slate-400">
                          Đã dùng hôm nay:{' '}
                          <strong className="text-slate-200">{quota.usedToday}</strong> /{' '}
                          {quota.dailyLimit} requests (Còn lại:{' '}
                          <span
                            className={
                              quota.remaining < 100
                                ? 'font-bold text-amber-400'
                                : 'font-bold text-emerald-400'
                            }
                          >
                            {quota.remaining}
                          </span>
                          )
                        </span>
                        <span className="font-mono text-[9px] text-slate-400">
                          {quota.percentUsed}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-700/40">
                        <div
                          className={`h-full transition-all duration-300 ${
                            quota.percentUsed > 90
                              ? 'bg-rose-500'
                              : quota.percentUsed > 70
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${quota.percentUsed}%` }}
                        />
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-400">
                        <span>
                          ⏳ Reset quota:{' '}
                          <span className="font-semibold text-slate-300">
                            {quota.nextResetFormatted}
                          </span>
                        </span>
                        <span>
                          💾 Tiết kiệm từ cache:{' '}
                          <span className="font-semibold text-blue-400">
                            {quota.cacheHits || 0} lượt
                          </span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--admin-line)] pt-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Clock3 size={13} /> Cập nhật lúc {checkedTime(data?.checkedAt)}
          </span>
          {error && data && <span className="text-rose-500">{error}</span>}
        </div>
      </div>
    </section>
  );
}
