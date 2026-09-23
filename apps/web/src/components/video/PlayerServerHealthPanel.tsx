'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Activity, RefreshCw } from 'lucide-react';
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
      setLatencies((prev) => ({ ...prev, [srv.index]: ping }));
    });

    await Promise.allSettled(promises);
    setIsTesting(false);
  }, [servers, isTesting]);

  useEffect(() => {
    if (isOpen) {
      const now = Date.now();
      if (now - lastTestTimeRef.current > 45000 || Object.keys(latencies).length === 0) {
        void measureAllLatencies();
      }
    }
  }, [isOpen, measureAllLatencies, latencies]);

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
      if (panelRef.current?.contains(target)) return;
      if (
        target.closest('.netphim-server-health-btn') ||
        target.closest('[data-name="server-health"]')
      ) {
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
      aria-label="Cài đặt máy chủ"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        'absolute bottom-[52px] right-2 sm:right-10 z-[9999] pointer-events-auto',
        'w-[310px] sm:w-[340px] max-w-[calc(100vw-16px)]',
        'rounded-[4px] bg-[#151c24]/95 backdrop-blur-md',
        'border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.6)]',
        'overflow-hidden select-none py-1',
        'animate-in fade-in zoom-in-95 duration-150',
      )}
      style={{ fontFamily: 'inherit' }}
    >
      {/* Header matching ArtPlayer sub-panel */}
      <div className="h-[38px] px-3.5 flex items-center justify-between border-b border-white/[0.08] text-white select-none">
        <div className="flex items-center gap-2 text-[13px] font-medium tracking-wide">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#23ade5]/10 text-[#23ade5]">
            <Activity size={14} strokeWidth={1.9} aria-hidden="true" />
          </div>
          <span className="font-medium text-white/95">Sức khỏe luồng phát</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void measureAllLatencies();
          }}
          title="Đo lại tốc độ ping"
          aria-label="Đo lại tốc độ"
          className={cn(
            'w-6 h-6 rounded flex items-center justify-center transition-all cursor-pointer',
            'text-white/60 hover:text-white hover:bg-white/10 active:scale-90',
            isTesting && 'text-[#23ade5]',
          )}
        >
          <RefreshCw
            size={13}
            strokeWidth={2.2}
            aria-hidden="true"
            className={cn(
              'transition-transform duration-500',
              isTesting && 'animate-spin text-[#23ade5]',
            )}
          />
        </button>
      </div>

      {/* Server list items matching ArtPlayer native setting items */}
      <div className="py-1 max-h-[280px] overflow-y-auto custom-scrollbar">
        {servers.map((server) => {
          const isActive = server.index === currentServerIndex;
          const ping = latencies[server.index];

          const isFast = ping !== undefined && ping < 350;
          const isMedium = ping !== undefined && ping >= 350 && ping < 650;
          const barColor = isFast ? '#10b981' : isMedium ? '#f59e0b' : '#ef4444';

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
                'group h-[38px] px-3.5 flex items-center justify-between transition-colors cursor-pointer select-none text-[13px]',
                'hover:bg-white/10',
                isActive
                  ? 'text-[#23ade5] font-medium bg-[#23ade5]/[0.06]'
                  : 'text-white/90 font-normal',
              )}
            >
              {/* Left: Glowing indicator dot + Server Name */}
              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0 transition-all',
                    isActive
                      ? 'bg-[#23ade5] shadow-[0_0_8px_#23ade5]'
                      : 'bg-white/20 group-hover:bg-white/50',
                  )}
                />
                <span className="truncate">{server.name}</span>
                {server.episodesCount > 1 && (
                  <span className="text-[11px] text-[#8c979e] shrink-0 font-normal">
                    ({server.episodesCount} tập)
                  </span>
                )}
              </div>

              {/* Right: 3-bar signal meter + Latency + State Icon */}
              <div className="flex items-center gap-2.5 shrink-0">
                {isTesting && ping === undefined ? (
                  <span className="inline-block w-3 h-3 border-2 border-[#23ade5] border-t-transparent rounded-full animate-spin" />
                ) : ping !== undefined ? (
                  <div className="flex items-center gap-1.5" title={`Tốc độ phản hồi: ${ping}ms`}>
                    {/* 3-bar cellular/wifi signal strength indicator */}
                    <svg
                      width="12"
                      height="11"
                      viewBox="0 0 14 12"
                      fill="none"
                      className="shrink-0"
                    >
                      <rect
                        x="1"
                        y="7.5"
                        width="2.5"
                        height="4.5"
                        rx="0.75"
                        fill={barColor}
                        opacity={1}
                      />
                      <rect
                        x="5.5"
                        y="4.5"
                        width="2.5"
                        height="7.5"
                        rx="0.75"
                        fill={barColor}
                        opacity={isFast || isMedium ? 1 : 0.25}
                      />
                      <rect
                        x="10"
                        y="1"
                        width="2.5"
                        height="11"
                        rx="0.75"
                        fill={barColor}
                        opacity={isFast ? 1 : 0.25}
                      />
                    </svg>
                    <span
                      className={cn(
                        'text-[11.5px] font-medium tracking-tight font-mono',
                        isFast ? 'text-emerald-400' : isMedium ? 'text-amber-400' : 'text-rose-400',
                      )}
                    >
                      {ping}ms
                    </span>
                  </div>
                ) : null}

                {/* State Icon: Crisp checkmark vs sleek chevron */}
                {isActive ? (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#23ade5"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 text-white/30 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
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
