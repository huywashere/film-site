"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconDatabase,
  IconLock,
  IconRefresh,
  IconServer,
  IconShieldCheck,
  IconShieldLock,
  IconShieldOff,
  IconPlus,
  IconTrash,
  IconSearch,
  IconUserX,
  IconClock,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import { adminFetch } from "@/lib/admin-api";

type Health = {
  checkedAt: string;
  api: { status: string; uptimeSeconds: number };
  database: { status: string; latencyMs: number };
  cache: { backend: string; hits: number; misses: number; hitRate: number };
  security: {
    helmet: boolean;
    globalRateLimit: boolean;
    reviewRateLimitPath: string;
  };
};

type BlockedIp = {
  id: string;
  ipAddress: string;
  reason?: string;
  blockedBy: string;
  expiresAt?: string | null;
  createdAt: string;
};

type SuspiciousIp = {
  ipAddress: string;
  requestCount: number;
  lastAction: string;
  lastSeen: string;
  userAgent?: string | null;
  isBlocked: boolean;
};

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    operational: "Hoạt động tốt",
    protected: "Được bảo vệ",
    degraded: "Suy giảm",
    unavailable: "Không khả dụng",
  };
  return labels[status] || status;
};

export default function SystemPage() {
  const [activeTab, setActiveTab] = useState<"health" | "blacklist">("blacklist");

  // Health state
  const [health, setHealth] = useState<Health | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  // Blacklist state
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [suspiciousIps, setSuspiciousIps] = useState<SuspiciousIp[]>([]);
  const [loadingBlacklist, setLoadingBlacklist] = useState(false);
  const [searchIp, setSearchIp] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Block Modal
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockForm, setBlockForm] = useState({
    ipAddress: "",
    reason: "Gửi request spam / cào dữ liệu trái phép",
    durationHours: 24,
  });

  const loadHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      setHealth(await adminFetch<Health>("system"));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kiểm tra hệ thống thất bại");
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  const loadBlacklist = useCallback(async () => {
    setLoadingBlacklist(true);
    try {
      const [blockedRes, suspiciousRes] = await Promise.all([
        adminFetch<{ items: BlockedIp[] }>(`security/blocked-ips?search=${encodeURIComponent(searchIp)}`),
        adminFetch<SuspiciousIp[]>("security/suspicious-ips"),
      ]);
      setBlockedIps(blockedRes?.items || []);
      setSuspiciousIps(Array.isArray(suspiciousRes) ? suspiciousRes : []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được danh sách bảo mật");
    } finally {
      setLoadingBlacklist(false);
    }
  }, [searchIp]);

  useEffect(() => {
    void loadHealth();
    void loadBlacklist();
  }, [loadHealth, loadBlacklist]);

  const handleQuickBlock = async (ip: string, reason?: string) => {
    try {
      await adminFetch("security/block-ip", {
        method: "POST",
        body: JSON.stringify({
          ipAddress: ip,
          reason: reason || "Phát hiện gửi request bất thường / spam dồn dập",
          durationHours: 24,
        }),
      });
      setSuccess(`Đã khóa IP ${ip} thành công trong 24 giờ!`);
      await loadBlacklist();
    } catch (err: any) {
      setError(err?.message || "Không thể khóa IP");
    }
  };

  const handleManualBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminFetch("security/block-ip", {
        method: "POST",
        body: JSON.stringify(blockForm),
      });
      setSuccess(`Đã khóa IP ${blockForm.ipAddress} thành công!`);
      setShowBlockModal(false);
      setBlockForm({
        ipAddress: "",
        reason: "Gửi request spam / cào dữ liệu trái phép",
        durationHours: 24,
      });
      await loadBlacklist();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi khóa IP");
    }
  };

  const handleUnblock = async (id: string, ip: string) => {
    if (!confirm(`Bạn có chắc chắn muốn gỡ chặn cho IP: ${ip}?`)) return;
    try {
      await adminFetch(`security/unblock-ip/${id}`, { method: "DELETE" });
      setSuccess(`Đã mở khóa IP ${ip} thành công!`);
      await loadBlacklist();
    } catch (err: any) {
      setError(err?.message || "Không thể mở khóa IP");
    }
  };

  const cards = health
    ? [
        {
          label: "API NestJS",
          value: statusLabel(health.api.status),
          detail: `Đã chạy ${Math.round(health.api.uptimeSeconds / 60)} phút`,
          Icon: IconServer,
        },
        {
          label: "PostgreSQL",
          value: statusLabel(health.database.status),
          detail: `Độ trễ ${health.database.latencyMs} ms`,
          Icon: IconDatabase,
        },
        {
          label: "Bộ nhớ đệm Redis",
          value: health.cache.backend,
          detail: `${(health.cache.hitRate * 100).toFixed(1)}% truy cập trúng`,
          Icon: IconRefresh,
        },
        {
          label: "Bảo mật",
          value: statusLabel(
            health.security.helmet && health.security.globalRateLimit
              ? "protected"
              : "degraded",
          ),
          detail: health.security.reviewRateLimitPath,
          Icon: IconLock,
        },
      ]
    : [];

  return (
    <div className="admin-fade-in space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            HẠ TẦNG & BẢO VỆ TƯỜNG LỬA
          </p>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
            Bảo Mật & Trạng Thái Hệ Thống
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Giám sát tài nguyên máy chủ và chặn IP các botnet, scraper, spam request tức thì qua Redis & Layer 7.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-[var(--admin-line)]">
          <button
            type="button"
            onClick={() => setActiveTab("blacklist")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === "blacklist"
                ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <IconShieldLock size={14} />
            Quản Lý Chặn IP (Blacklist)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("health")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === "health"
                ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <IconServer size={14} />
            Trạng Thái Máy Chủ
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <IconAlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <IconCheck size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {activeTab === "blacklist" ? (
        <div className="space-y-6">
          {/* Top action bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <IconSearch size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm địa chỉ IP hoặc lý do..."
                value={searchIp}
                onChange={(e) => setSearchIp(e.target.value)}
                className="admin-control w-full pl-9 pr-3 py-2 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadBlacklist}
                className="admin-secondary-button inline-flex items-center gap-1.5 px-3 py-2 text-xs"
              >
                <IconRefresh size={14} className={loadingBlacklist ? "animate-spin" : ""} />
                Làm mới
              </button>
              <button
                type="button"
                onClick={() => setShowBlockModal(true)}
                className="admin-primary-button inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold"
              >
                <IconPlus size={15} />
                Chặn IP Thủ Công
              </button>
            </div>
          </div>

          {/* Suspicious IPs Card */}
          <div className="admin-card overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--admin-line)] flex items-center justify-between bg-amber-500/5">
              <div className="flex items-center gap-2">
                <IconAlertTriangle size={17} className="text-amber-500" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                  IP Đáng Ngờ (Spam / Tần Suất Cao Gần Đây)
                </h2>
              </div>
              <span className="text-xs font-semibold text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                {suspiciousIps.length} địa chỉ phát hiện
              </span>
            </div>

            {suspiciousIps.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Không phát hiện IP nào gửi request bất thường gần đây. Hệ thống an toàn!
              </div>
            ) : (
              <div className="divide-y divide-[var(--admin-line)]">
                {suspiciousIps.map((s) => (
                  <div
                    key={s.ipAddress}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-500/[0.02]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-mono font-bold text-slate-800 dark:text-white">
                          {s.ipAddress}
                        </strong>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          {s.requestCount} requests
                        </span>
                        {s.isBlocked && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
                            ĐÃ BỊ CHẶN
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Hành động: <span className="text-slate-600 dark:text-slate-300">{s.lastAction}</span> • Lần cuối: {new Date(s.lastSeen).toLocaleTimeString("vi-VN")}
                      </p>
                      {s.userAgent && (
                        <p className="text-[10px] text-slate-400 font-mono truncate max-w-xl">
                          UA: {s.userAgent}
                        </p>
                      )}
                    </div>

                    <div>
                      {s.isBlocked ? (
                        <button
                          type="button"
                          disabled
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed"
                        >
                          Đang bị chặn
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQuickBlock(s.ipAddress)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-500/20 transition-all inline-flex items-center gap-1.5"
                        >
                          <IconUserX size={14} />
                          1-Click Chặn IP
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Blocked IPs Table */}
          <div className="admin-card overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--admin-line)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconShieldLock size={17} className="text-rose-500" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                  Danh Sách IP Đang Bị Khóa ({blockedIps.length})
                </h2>
              </div>
              <span className="text-xs text-slate-400">Chặn tự động Layer 7 & Redis 0.05ms</span>
            </div>

            {blockedIps.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Chưa có IP nào trong danh sách đen (Blacklist).
              </div>
            ) : (
              <div className="divide-y divide-[var(--admin-line)]">
                {blockedIps.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-500/[0.02]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                          {b.ipAddress}
                        </strong>
                        <span className="text-[10px] text-slate-400">
                          Khóa bởi: <strong>{b.blockedBy}</strong>
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Lý do: {b.reason || "Không có lý do"}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>Ngày khóa: {new Date(b.createdAt).toLocaleString("vi-VN")}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <IconClock size={11} />
                          Hết hạn: {b.expiresAt ? new Date(b.expiresAt).toLocaleString("vi-VN") : "Vĩnh viễn"}
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnblock(b.id, b.ipAddress)}
                      className="admin-secondary-button inline-flex items-center gap-1 px-3 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20"
                    >
                      <IconShieldOff size={14} />
                      Mở khóa IP
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Health tab */
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, detail, Icon }) => (
              <article key={label} className="admin-card p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {label}
                  </span>
                  <Icon size={18} className="text-blue-600" />
                </div>
                <strong className="mt-4 flex items-center gap-2 text-[15px] uppercase text-slate-800 dark:text-white">
                  <IconCircleCheck size={16} className="text-emerald-600" /> {value}
                </strong>
                <p className="mt-1 text-[10px] text-slate-400">{detail}</p>
              </article>
            ))}
          </section>

          <section className="admin-card p-5">
            <h2 className="text-[14px] font-bold text-slate-800 dark:text-white">
              Các lớp bảo vệ đang áp dụng
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4 text-[11px] text-slate-600 dark:text-slate-300">
                <strong className="block text-slate-800 dark:text-white mb-1">Giới hạn API toàn cục</strong>
                100 yêu cầu/phút qua bộ giới hạn Redis Throttler
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4 text-[11px] text-slate-600 dark:text-slate-300">
                <strong className="block text-slate-800 dark:text-white mb-1">Timeout Protection</strong>
                Ngắt tự động kết nối sau 8-10 giây chống Slowloris
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4 text-[11px] text-slate-600 dark:text-slate-300">
                <strong className="block text-slate-800 dark:text-white mb-1">IP Blacklist Guard</strong>
                Chặn tức thì &lt;0.05ms mọi IP vi phạm lưu trong Redis Set
              </div>
            </div>
            {health && (
              <p className="mt-4 text-[10px] text-slate-400">
                Kiểm tra lúc {new Date(health.checkedAt).toLocaleString("vi-VN")}
              </p>
            )}
          </section>
        </div>
      )}

      {/* Manual Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-[var(--admin-line)] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--admin-line)] pb-3">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <IconShieldLock size={18} className="text-rose-500" />
                Chặn Địa Chỉ IP
              </h3>
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualBlock} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Địa chỉ IP cần chặn (IPv4 hoặc IPv6)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 192.168.1.100 hoặc 113.190.x.x"
                  value={blockForm.ipAddress}
                  onChange={(e) => setBlockForm({ ...blockForm, ipAddress: e.target.value })}
                  className="admin-control w-full px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lý do khóa IP
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Spam bình luận / Quét lỗ hổng"
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                  className="admin-control w-full px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Thời gian khóa
                </label>
                <select
                  value={blockForm.durationHours}
                  onChange={(e) => setBlockForm({ ...blockForm, durationHours: Number(e.target.value) })}
                  className="admin-control w-full px-3 py-2 text-xs font-semibold"
                >
                  <option value={1}>1 giờ</option>
                  <option value={6}>6 giờ</option>
                  <option value={24}>24 giờ (1 ngày)</option>
                  <option value={168}>7 ngày</option>
                  <option value={720}>30 ngày</option>
                  <option value={0}>Vĩnh viễn (Cho đến khi mở khóa tay)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--admin-line)]">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="admin-secondary-button px-4 py-2 text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="admin-primary-button px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Khóa IP Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
