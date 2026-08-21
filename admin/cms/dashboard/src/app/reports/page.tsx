"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconAlertTriangle as AlertTriangle,
  IconCircleCheck as CheckCircle2,
  IconExternalLink as ExternalLink,
  IconHistory as History,
  IconSearch as Search,
  IconX as X,
} from "@tabler/icons-react";
import { adminFetch, queryString } from "@/lib/admin-api";

type Report = {
  id: string;
  category: string;
  filmTitle?: string;
  movieSlug?: string;
  episode?: string;
  serverName?: string;
  deviceInfo?: string;
  description: string;
  email?: string;
  status: "NEW" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  adminNote?: string;
  assignedTo?: string;
  resolutionMessage?: string;
  screenshotUrl?: string;
  events?: Array<{
    id: string;
    actorEmail: string;
    action: string;
    fromStatus?: string;
    toStatus?: string;
    note?: string;
    createdAt: string;
  }>;
  createdAt: string;
};
type PageData = { items: Report[]; pagination: { total: number } };
const statusLabels: Record<Report["status"], string> = {
  NEW: "Mới",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã giải quyết",
  REJECTED: "Đã từ chối",
};
const priorityLabels: Record<Report["priority"], string> = {
  LOW: "Thấp",
  NORMAL: "Bình thường",
  HIGH: "Cao",
  CRITICAL: "Khẩn cấp",
};

export default function ReportsPage() {
  const [items, setItems] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const data = await adminFetch<PageData>(
        `reports?${queryString({ limit: 50, status, search })}`,
      );
      setItems(data.items);
      setTotal(data.pagination.total);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải báo cáo",
      );
    }
  }, [search, status]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const reportId = new URLSearchParams(window.location.search).get("report");
    if (!reportId) return;
    void adminFetch<Report>(`reports/${reportId}`)
      .then(setSelected)
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Không thể mở báo cáo",
        ),
      );
  }, []);
  const openReport = async (item: Report) => {
    setSelected(item);
    try {
      setSelected(await adminFetch<Report>(`reports/${item.id}`));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể tải lịch sử báo cáo",
      );
    }
  };
  const save = async () => {
    if (!selected) return;
    try {
      const updated = await adminFetch<Report>(`reports/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: selected.status,
          priority: selected.priority,
          adminNote: selected.adminNote || "",
          assignedTo: selected.assignedTo || "",
          resolutionMessage: selected.resolutionMessage || "",
        }),
      });
      setSelected(await adminFetch<Report>(`reports/${updated.id}`));
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể lưu báo cáo",
      );
    }
  };
  const tone: Record<string, string> = {
    NEW: "bg-rose-50 text-rose-700",
    IN_PROGRESS: "bg-amber-50 text-amber-700",
    RESOLVED: "bg-emerald-50 text-emerald-700",
    REJECTED: "bg-slate-100 text-slate-500",
  };
  return (
    <div className="admin-fade-in space-y-6">
      <header>
        <p className="text-[11px] font-semibold text-slate-400">
          HỖ TRỢ / SỰ CỐ
        </p>
        <h1 className="mt-2 flex items-center gap-2 text-[29px] font-bold tracking-[-.045em] text-slate-800">
          <AlertTriangle className="text-amber-500" />
          Báo cáo từ người xem
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Phân loại, ghi chú và đóng vòng phản hồi lỗi phim.
        </p>
      </header>
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700">
          {error}
        </div>
      )}
      <section className="admin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--admin-line)] p-5 sm:flex-row">
          <label className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-control w-full bg-slate-50 pl-9 pr-3 text-[12px]"
              placeholder="Tìm phim, email hoặc nội dung..."
            />
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="admin-control px-3 text-[12px]"
          >
            <option value="">Mọi trạng thái</option>
            <option value="NEW">Mới</option>
            <option value="IN_PROGRESS">Đang xử lý</option>
            <option value="RESOLVED">Đã giải quyết</option>
            <option value="REJECTED">Từ chối</option>
          </select>
        </div>
        <div className="divide-y divide-[var(--admin-line)]">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => void openReport(item)}
              className="grid w-full gap-2 px-5 py-4 text-left hover:bg-slate-50 sm:grid-cols-[130px_minmax(0,1fr)_120px_auto]"
            >
              <span>
                <span
                  className={`rounded-md px-2 py-1 text-[9px] font-bold ${tone[item.status]}`}
                >
                  {statusLabels[item.status]}
                </span>
                <small className="mt-2 block text-[9px] font-bold text-slate-400">
                  {priorityLabels[item.priority]}
                </small>
              </span>
              <span>
                <strong className="block text-[12px] text-slate-700">
                  {item.filmTitle || "Lỗi hệ thống chung"}{" "}
                  {item.episode ? `· ${item.episode}` : ""}
                </strong>
                <small className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-400">
                  {item.description}
                </small>
              </span>
              <span className="text-[10px] text-slate-400">
                {item.category}
                <small className="block">{item.serverName}</small>
              </span>
              <time className="text-[9px] text-slate-400">
                {new Date(item.createdAt).toLocaleString("vi-VN")}
              </time>
            </button>
          ))}
          {!items.length && (
            <p className="p-14 text-center text-[12px] text-slate-400">
              Không có báo cáo phù hợp.
            </p>
          )}
        </div>
        <footer className="border-t border-[var(--admin-line)] px-5 py-3 text-[10px] text-slate-400">
          {total} báo cáo
        </footer>
      </section>
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
          <aside className="h-full w-full max-w-[540px] overflow-y-auto bg-white">
            <header className="flex items-start justify-between border-b border-[var(--admin-line)] p-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400">
                  BÁO CÁO {selected.id}
                </p>
                <h2 className="mt-1 text-[18px] font-bold text-slate-800">
                  {selected.filmTitle || "Sự cố hệ thống"}
                </h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="admin-icon-button"
              >
                <X size={18} />
              </button>
            </header>
            <div className="space-y-5 p-6">
              <div className="rounded-xl bg-slate-50 p-4 text-[12px] leading-6 text-slate-600">
                {selected.description}
              </div>
              <dl className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <dt className="text-slate-400">Tập / server</dt>
                  <dd className="font-semibold text-slate-700">
                    {selected.episode || "Không có"} /{" "}
                    {selected.serverName || "Không có"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Liên hệ</dt>
                  <dd className="font-semibold text-slate-700">
                    {selected.email || "Ẩn danh"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-400">Thiết bị</dt>
                  <dd className="break-words text-slate-600">
                    {selected.deviceInfo || "Không có"}
                  </dd>
                </div>
              </dl>
              {selected.screenshotUrl && (
                <a
                  href={selected.screenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-control inline-flex items-center gap-2 px-3 text-[11px] font-semibold text-blue-600"
                >
                  <ExternalLink size={14} /> Mở ảnh chụp sự cố
                </a>
              )}
              <div className="grid grid-cols-2 gap-3">
                <label className="text-[11px] font-semibold text-slate-600">
                  Trạng thái
                  <select
                    value={selected.status}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        status: e.target.value as Report["status"],
                      })
                    }
                    className="admin-control mt-1.5 w-full px-3"
                  >
                    <option value="NEW">Mới</option>
                    <option value="IN_PROGRESS">Đang xử lý</option>
                    <option value="RESOLVED">Đã giải quyết</option>
                    <option value="REJECTED">Đã từ chối</option>
                  </select>
                </label>
                <label className="text-[11px] font-semibold text-slate-600">
                  Ưu tiên
                  <select
                    value={selected.priority}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        priority: e.target.value as Report["priority"],
                      })
                    }
                    className="admin-control mt-1.5 w-full px-3"
                  >
                    <option value="LOW">Thấp</option>
                    <option value="NORMAL">Bình thường</option>
                    <option value="HIGH">Cao</option>
                    <option value="CRITICAL">Khẩn cấp</option>
                  </select>
                </label>
              </div>
              <label className="block text-[11px] font-semibold text-slate-600">
                Người phụ trách
                <input
                  value={selected.assignedTo || ""}
                  onChange={(e) =>
                    setSelected({ ...selected, assignedTo: e.target.value })
                  }
                  placeholder="Email hoặc tên quản trị viên"
                  className="admin-control mt-1.5 w-full px-3"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Ghi chú xử lý
                <textarea
                  value={selected.adminNote || ""}
                  onChange={(e) =>
                    setSelected({ ...selected, adminNote: e.target.value })
                  }
                  className="mt-1.5 min-h-32 w-full rounded-xl border border-[var(--admin-line)] p-3 text-[12px]"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Kết quả phản hồi người xem
                <textarea
                  value={selected.resolutionMessage || ""}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      resolutionMessage: e.target.value,
                    })
                  }
                  className="mt-1.5 min-h-24 w-full rounded-xl border border-[var(--admin-line)] p-3 text-[12px]"
                />
              </label>
              <section>
                <h3 className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <History size={15} /> Lịch sử xử lý
                </h3>
                <div className="mt-3 space-y-2">
                  {selected.events?.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-xl border border-[var(--admin-line)] p-3"
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px]">
                        <strong className="text-slate-600">
                          {event.actorEmail}
                        </strong>
                        <time className="text-slate-400">
                          {new Date(event.createdAt).toLocaleString("vi-VN")}
                        </time>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {event.action}
                        {event.fromStatus !== event.toStatus
                          ? ` · ${event.fromStatus || "Mới"} → ${event.toStatus}`
                          : ""}
                      </p>
                      {event.note && (
                        <p className="mt-1 text-[11px] text-slate-600">
                          {event.note}
                        </p>
                      )}
                    </div>
                  ))}
                  {!selected.events?.length && (
                    <p className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-400">
                      Chưa có thao tác xử lý nào.
                    </p>
                  )}
                </div>
              </section>
              <button
                onClick={() => void save()}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--admin-brand)] text-[12px] font-semibold text-white"
              >
                <CheckCircle2 size={15} />
                Lưu trạng thái
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
