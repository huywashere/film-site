"use client";

import { useCallback, useEffect, useState } from "react";
import { IconAlertTriangle, IconCloudUpload, IconDatabase, IconRefresh, IconRestore, IconTrash } from "@tabler/icons-react";
import { adminFetch } from "@/lib/admin-api";

type Backup = { id: string; status: string; filename?: string; fileSizeBytes?: string; createdAt: string; errorMessage?: string };
type Incident = { id: string; title: string; message: string; severity: string; status: string; occurrenceCount: number; lastSeenAt: string };
type Cache = { backend: string; hitRate: number; namespaces: Array<{ name: string; keys: number }> };

export default function OperationsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [cache, setCache] = useState<Cache | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const [backupItems, incidentItems, cacheState] = await Promise.all([
        adminFetch<Backup[]>("backups"),
        adminFetch<Incident[]>("incidents"),
        adminFetch<Cache>("cache"),
      ]);
      setBackups(backupItems); setIncidents(incidentItems); setCache(cacheState); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu vận hành"); }
  }, []);
  useEffect(() => void load(), [load]);
  async function action(task: () => Promise<unknown>, success: string) {
    setBusy(true); setError("");
    try { await task(); setMessage(success); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Thao tác thất bại"); }
    finally { setBusy(false); }
  }
  return <div className="admin-fade-in space-y-5">
    <header className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold text-slate-400">HỆ THỐNG / VẬN HÀNH</p><h1>Backup, cache và cảnh báo</h1><p className="mt-1 text-[12px] text-slate-500">Công cụ khôi phục dữ liệu và xử lý sự cố production.</p></div><button onClick={() => void load()} className="admin-icon-button" aria-label="Tải lại"><IconRefresh size={16}/></button></header>
    {error && <Notice tone="error">{error}</Notice>}{message && <Notice tone="success">{message}</Notice>}
    <section className="grid gap-5 xl:grid-cols-2">
      <article className="admin-card overflow-hidden"><CardHeader icon={<IconDatabase size={18}/>} title="PostgreSQL backup" action={<button disabled={busy} onClick={() => void action(() => adminFetch("backups", { method: "POST" }), "Đã đưa backup vào hàng đợi.")} className="admin-primary-button"><IconCloudUpload size={15}/> Tạo backup</button>}/><div className="divide-y divide-[var(--admin-line)]">{backups.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3"><div className="min-w-0"><strong className="block truncate text-[11px] text-slate-700">{item.filename || item.id}</strong><span className="text-[10px] text-slate-400">{item.status} / {item.fileSizeBytes ? `${Math.round(Number(item.fileSizeBytes)/1024/1024)} MB` : "đang xử lý"} / {new Date(item.createdAt).toLocaleString("vi-VN")}</span>{item.errorMessage && <p className="mt-1 text-[10px] text-rose-600">{item.errorMessage}</p>}</div>{item.status === "COMPLETED" && <button disabled={busy} onClick={() => { const confirmation = prompt(`Nhập RESTORE ${item.id}`); if (confirmation) void action(() => adminFetch(`backups/${item.id}/restore`, { method: "POST", body: JSON.stringify({ confirmation }) }), "Đã khôi phục database."); }} className="admin-control inline-flex items-center gap-1 px-3 text-[10px]"><IconRestore size={13}/> Khôi phục</button>}</div>)}{!backups.length && <Empty text="Chưa có bản backup."/>}</div></article>
      <article className="admin-card overflow-hidden"><CardHeader icon={<IconAlertTriangle size={18}/>} title="Cảnh báo sự cố"/><div className="divide-y divide-[var(--admin-line)]">{incidents.map((item) => <div key={item.id} className="px-5 py-3"><div className="flex items-start justify-between gap-3"><div><strong className="text-[11px] text-slate-700">{item.title}</strong><p className="mt-1 text-[10px] text-slate-500">{item.message}</p><small className="text-[9px] text-slate-400">{item.severity} / {item.occurrenceCount} lần / {new Date(item.lastSeenAt).toLocaleString("vi-VN")}</small></div>{item.status !== "RESOLVED" && <div className="flex gap-1"><button onClick={() => void action(() => adminFetch(`incidents/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: "ACKNOWLEDGED" }) }), "Đã tiếp nhận sự cố.")} className="admin-control px-2 text-[9px]">Tiếp nhận</button><button onClick={() => void action(() => adminFetch(`incidents/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: "RESOLVED" }) }), "Đã đóng sự cố.")} className="admin-control px-2 text-[9px]">Đã xử lý</button></div>}</div></div>)}{!incidents.length && <Empty text="Không có sự cố mở."/>}</div></article>
    </section>
    <section className="admin-card overflow-hidden"><CardHeader icon={<IconTrash size={18}/>} title={`Cache ${cache?.backend || "..."}`} action={<button disabled={busy} onClick={() => void action(() => adminFetch("cache/revalidate", { method: "POST", body: JSON.stringify({ paths: ["/"] }) }), "Đã revalidate trang chủ.")} className="admin-primary-button">Revalidate trang chủ</button>}/><div className="grid gap-px bg-[var(--admin-line)] sm:grid-cols-2 lg:grid-cols-4">{cache?.namespaces.map((item) => <div key={item.name} className="flex items-center justify-between bg-[var(--admin-surface)] p-4"><div><strong className="block text-[11px] text-slate-700">{item.name}</strong><span className="text-[10px] text-slate-400">{item.keys} keys</span></div><button disabled={busy} onClick={() => { if (confirm(`Xóa cache namespace ${item.name}?`)) void action(() => adminFetch("cache", { method: "DELETE", body: JSON.stringify({ namespace: item.name }) }), `Đã xóa cache ${item.name}.`); }} className="admin-icon-button" aria-label={`Xóa ${item.name}`}><IconTrash size={14}/></button></div>)}</div></section>
  </div>;
}

function CardHeader({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) { return <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-line)] px-5 py-4"><div className="flex items-center gap-2 text-blue-600">{icon}<h2 className="text-[13px] font-bold text-slate-800">{title}</h2></div>{action}</div>; }
function Notice({ tone, children }: { tone: "error"|"success"; children: React.ReactNode }) { return <div className={`rounded-md border p-3 text-[11px] ${tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{children}</div>; }
function Empty({ text }: { text: string }) { return <p className="p-8 text-center text-[11px] text-slate-400">{text}</p>; }
