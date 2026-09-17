'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PlayerServerItem {
  index: number;
  name: string;
  source?: string;
  type?: string;
  episodesCount: number;
  streamUrl?: string;
  isCurrent: boolean;
}

export interface PlayerServerHealthPanelProps {
  isOpen: boolean;
  onClose: () => void;
  servers: PlayerServerItem[];
  currentServerIndex: number;
  onSwitchServer: (index: number) => void;
  portalContainer: HTMLElement | null;
}

/**
 * Pings a streaming URL or origin via HEAD fetch with no-cors.
 * Returns network round-trip latency in milliseconds.
 */
async function testStreamLatency(url?: string): Promise<number> {
  if (!url) return 999;
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    // HEAD request in no-cors mode to capture true edge CDN round-trip time
    await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const elapsed = Math.round(performance.now() - start);
    return Math.max(18, elapsed);
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return 1200;
    }
    const elapsed = Math.round(performance.now() - start);
    if (elapsed < 800) {
      return Math.max(25, elapsed);
    }
    return Math.min(1500, elapsed);
  }
}

/**
 * 3-bar signal strength icon matching ChoPhim
 * Green: Mượt (<350ms)
 * Lime: Ổn (350-600ms)
 * Amber: Chậm (600-900ms)
 * Red: Lag (>=900ms)
 */
export function SignalStrengthBadge({
  latency,
  isTesting,
}: {
  latency?: number;
  isTesting?: boolean;
}) {
  let level = 2;
  let barColor = '#10b981';

  if (latency !== undefined && latency > 0) {
    if (latency < 350) {
      level = 3;
      barColor = '#10b981';
    } else if (latency < 600) {
      level = 2;
      barColor = '#84cc16';
    } else if (latency < 900) {
      level = 1;
      barColor = '#fbbf24';
    } else {
      level = 1;
      barColor = '#ef4444';
    }
  } else if (!isTesting) {
    level = 2;
    barColor = '#10b981';
  }

  return (
    <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* Bar 1 */}
        <rect
          x="2"
          y="11"
          width="3"
          height="5"
          rx="1"
          fill={level >= 1 ? barColor : 'rgba(255,255,255,0.15)'}
          className={isTesting ? 'animate-pulse' : ''}
        />
        {/* Bar 2 */}
        <rect
          x="7.5"
          y="7"
          width="3"
          height="9"
          rx="1"
          fill={level >= 2 ? barColor : 'rgba(255,255,255,0.15)'}
          className={isTesting ? 'animate-pulse' : ''}
          style={isTesting ? { animationDelay: '150ms' } : undefined}
        />
        {/* Bar 3 */}
        <rect
          x="13"
          y="3"
          width="3"
          height="13"
          rx="1"
          fill={level >= 3 ? barColor : 'rgba(255,255,255,0.15)'}
          className={isTesting ? 'animate-pulse' : ''}
          style={isTesting ? { animationDelay: '300ms' } : undefined}
        />
      </svg>
    </div>
  );
}

export function getHealthDetails(latency?: number, isTesting?: boolean) {
  if (isTesting && latency === undefined) {
    return {
      label: 'Đang đo...',
      labelClass: 'text-neutral-400',
      pingClass: 'text-neutral-400',
    };
  }
  if (latency === undefined || latency <= 0) {
    return {
      label: 'Chưa đo',
      labelClass: 'text-neutral-400',
      pingClass: 'text-neutral-400',
    };
  }
  if (latency < 350) {
    return {
      label: 'Mượt',
      labelClass: 'text-emerald-400',
      pingClass: 'text-emerald-400',
    };
  }
  if (latency < 600) {
    return {
      label: 'Ổn',
      labelClass: 'text-lime-400',
      pingClass: 'text-lime-400',
    };
  }
  if (latency < 900) {
    return {
      label: 'Chậm',
      labelClass: 'text-amber-400',
      pingClass: 'text-amber-400',
    };
  }
  return {
    label: 'Lag',
    labelClass: 'text-red-400',
    pingClass: 'text-red-400',
  };
}

export default function PlayerServerHealthPanel({
  isOpen,
  onClose,
  servers,
  currentServerIndex,
  onSwitchServer,
  portalContainer,
}: PlayerServerHealthPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [latencies, setLatencies] = useState<Record<number, number>>({});
  const [isTesting, setIsTesting] = useState(false);
  const lastTestTimeRef = useRef<number>(0);

  const measureAllLatencies = useCallback(async () => {
    if (!servers || servers.length === 0 || isTesting) return;
    setIsTesting(true);
    lastTestTimeRef.current = Date.now();

    const results: Record<number, number> = {};
    const promises = servers.map(async (srv) => {
      const ping = await testStreamLatency(srv.streamUrl);
      results[srv.index] = ping;
      // Progressive update so users see numbers fill in in real time
      setLatencies((prev) => ({ ...prev, [srv.index]: ping }));
    });

    await Promise.allSettled(promises);
    setIsTesting(false);
  }, [servers, isTesting]);

  // Trigger test on open if never tested or if > 45 seconds old
  useEffect(() => {
    if (isOpen) {
      const now = Date.now();
      if (now - lastTestTimeRef.current > 45000 || Object.keys(latencies).length === 0) {
        void measureAllLatencies();
      }
    }
  }, [isOpen, measureAllLatencies, latencies]);

  // Click outside and Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // If clicking inside panel or on the toggle button, don't close
      if (panelRef.current?.contains(target)) return;
      if (target.closest('.netphim-server-health-btn') || target.closest('[data-name="server-health"]')) {
        return;
      }
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !portalContainer) return null;

  const content = (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Danh sách máy chủ và tốc độ"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        'absolute bottom-16 right-3 sm:right-14 z-[9999] pointer-events-auto',
        'w-[320px] sm:w-[350px] max-w-[calc(100vw-24px)]',
        'rounded-2xl bg-[#141518]/95 backdrop-blur-xl',
        'border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.85)]',
        'overflow-hidden select-none transition-all duration-200',
        'animate-in fade-in zoom-in-95',
      )}
      style={{ fontFamily: 'inherit' }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.08]">
        <h3 className="text-white font-bold text-[15px] tracking-wide">Máy chủ</h3>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void measureAllLatencies();
          }}
          title="Đo lại tốc độ ping"
          aria-label="Đo lại tốc độ"
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center transition-all',
            'bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white cursor-pointer',
            isTesting && 'text-[#fbbf24]',
          )}
        >
          <RefreshCw size={14} className={isTesting ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Server List */}
      <div className="p-2 max-h-[310px] overflow-y-auto space-y-1 custom-scrollbar">
        {servers.map((server) => {
          const isActive = server.index === currentServerIndex;
          const ping = latencies[server.index];
          const health = getHealthDetails(ping, isTesting);

          return (
            <div
              key={`srv-${server.index}-${server.name}`}
              role="button"
              tabIndex={0}
              onClick={() => {
                onSwitchServer(server.index);
                onClose();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSwitchServer(server.index);
                  onClose();
                }
              }}
              className={cn(
                'group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer border',
                isActive
                  ? 'bg-white/[0.08] border-white/[0.12] shadow-sm'
                  : 'bg-transparent hover:bg-white/[0.04] border-transparent',
              )}
            >
              {/* Left: Signal Strength Badge */}
              <SignalStrengthBadge latency={ping} isTesting={isTesting && ping === undefined} />

              {/* Middle: Name, Episode Count & Health Status */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'text-[13px] truncate',
                      isActive
                        ? 'text-[#fbbf24] font-semibold'
                        : 'text-neutral-200 font-medium group-hover:text-white',
                    )}
                  >
                    {server.name}
                  </span>
                  {isActive && (
                    <Check size={14} className="text-[#fbbf24] shrink-0 stroke-[2.5]" />
                  )}
                </div>

                <div className="text-[11.5px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                  <span>{server.episodesCount} tập</span>
                  <span className="text-white/20">•</span>
                  <span className={cn('font-medium', health.labelClass)}>
                    {health.label}
                  </span>
                </div>
              </div>

              {/* Right: Latency in ms */}
              <div className="shrink-0 text-right pl-2">
                {isTesting && ping === undefined ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-[#fbbf24] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className={cn('text-[13px] font-bold tracking-tight', health.pingClass)}>
                    {ping !== undefined ? `${ping} ms` : '-- ms'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return createPortal(content, portalContainer);
}
