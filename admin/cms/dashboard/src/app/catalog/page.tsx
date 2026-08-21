"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { IconArrowsJoin, IconCalendarClock, IconMovie, IconPlus, IconTrash } from "@tabler/icons-react";
import { adminFetch } from "@/lib/admin-api";

type Duplicate = { key: string; confidence: string; items: Array<{ id: string; title: string; year?: number; sources: string[]; _count: { viewLogs: number } }> };
type Schedule = { id: string; name: string; source: string; cron: string; pages: number; nextRunAt: string };

export default function CatalogPage() {
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [movie, setMovie] = useState({ id: "", title: "", type: "single" });
  const [schedule, setSchedule] = useState({ name: "Đồng bộ hằng giờ", source: "kkphim", intervalMinutes: 60, pages: 5, enabled: true });
  const load = useCallback(async () => {
    try {
      const [duplicateItems, scheduleItems] = await Promise.all([
        adminFetch<Duplicate[]>("movies/duplicates"), adminFetch<Schedule[]>("sync-schedules"),
      ]);
      setDuplicates(duplicateItems); setSchedules(scheduleItems); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu"); }
  }, []);
  useEffect(() => void load(), [load]);
  async function run(task: () => Promise<unknown>, success: string) {
    try { await task(); setMessage(success); setError(""); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Thao tác thất bại"); }
  }
  function createMovie(event: FormEvent) { event.preventDefault(); void run(() => adminFetch("movies", { method: "POST", body: JSON.stringify(movie) }), "Đã tạo phim thủ công."); }
  function createSchedule(event: FormEvent) { event.preventDefault(); void run(() => adminFetch("sync-schedules", { method: "POST", body: JSON.stringify(schedule) }), "Đã lưu lịch đồng bộ."); }
  return <div className="admin-fade-in space-y-5">
    <header><p className="text-[10px] font-bold text-slate-400">DỮ LIỆU / CATALOG</p><h1>Phim trùng và lịch đồng bộ</h1><p className="mt-1 text-[12px] text-slate-500">Tạo, xóa, gộp bản ghi và lập lịch lấy dữ liệu từ nguồn.</p></header>
    {error && <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-700">{error}</p>}{message && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-700">{message}</p>}
    <section className="grid gap-5 xl:grid-cols-2">
      <form onSubmit={createMovie} className="admin-card p-5"><Title icon={<IconMovie size={17}/>} text="Tạo phim thủ công"/><div className="mt-4 grid gap-3 sm:grid-cols-2"><Input label="Slug" value={movie.id} onChange={(id) => setMovie({...movie,id})}/><Input label="Tên phim" value={movie.title} onChange={(title) => setMovie({...movie,title})}/><label><span className="text-[10px] font-bold text-slate-600">Loại phim</span><select className="admin-control mt-1 w-full px-3" value={movie.type} onChange={(event) => setMovie({...movie,type:event.target.value})}><option value="single">Phim lẻ</option><option value="series">Phim bộ</option><option value="hoathinh">Hoạt hình</option></select></label></div><button className="admin-primary-button mt-4"><IconPlus size={14}/> Tạo phim</button></form>
      <form onSubmit={createSchedule} className="admin-card p-5"><Title icon={<IconCalendarClock size={17}/>} text="Lịch đồng bộ"/><div className="mt-4 grid gap-3 sm:grid-cols-2"><Input label="Tên lịch" value={schedule.name} onChange={(name) => setSchedule({...schedule,name})}/><label><span className="text-[10px] font-bold text-slate-600">Nguồn</span><select className="admin-control mt-1 w-full px-3" value={schedule.source} onChange={(event) => setSchedule({...schedule,source:event.target.value})}>{["kkphim","ophim","nguonc","vsmov"].map((source)=><option key={source}>{source}</option>)}</select></label><Input label="Chu kỳ (phút)" value={String(schedule.intervalMinutes)} onChange={(value) => setSchedule({...schedule,intervalMinutes:Number(value)})}/><Input label="Số trang" value={String(schedule.pages)} onChange={(value) => setSchedule({...schedule,pages:Number(value)})}/></div><button className="admin-primary-button mt-4"><IconPlus size={14}/> Thêm lịch</button></form>
    </section>
    <section className="admin-card overflow-hidden"><div className="border-b border-[var(--admin-line)] px-5 py-4"><Title icon={<IconCalendarClock size={17}/>} text="Lịch đang chạy"/></div><div className="divide-y divide-[var(--admin-line)]">{schedules.map((item)=><div key={item.id} className="flex items-center justify-between px-5 py-3"><div><strong className="block text-[11px] text-slate-700">{item.name}</strong><span className="text-[10px] text-slate-400">{item.source} / {item.cron} / {item.pages} trang / lần tới {new Date(item.nextRunAt).toLocaleString("vi-VN")}</span></div><button onClick={() => void run(() => adminFetch(`sync-schedules/${item.id}`, {method:"DELETE"}), "Đã xóa lịch.")} className="admin-icon-button" aria-label="Xóa lịch"><IconTrash size={14}/></button></div>)}</div></section>
    <section className="admin-card overflow-hidden"><div className="border-b border-[var(--admin-line)] px-5 py-4"><Title icon={<IconArrowsJoin size={17}/>} text={`Nhóm phim trùng (${duplicates.length})`}/></div><div className="divide-y divide-[var(--admin-line)]">{duplicates.map((group)=><div key={group.key} className="p-5"><div className="mb-3 flex items-center justify-between"><strong className="text-[11px] text-slate-700">{group.items[0]?.title} ({group.items[0]?.year || "?"})</strong><span className="text-[9px] text-slate-400">Độ tin cậy {group.confidence}</span></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{group.items.map((item,index)=><div key={item.id} className="rounded-md border border-[var(--admin-line)] p-3"><strong className="block truncate text-[10px] text-slate-700">{index===0?"Giữ: ":"Gộp: "}{item.id}</strong><span className="text-[9px] text-slate-400">{item.sources.join(", ") || "không nguồn"} / {item._count.viewLogs} lượt xem</span></div>)}</div><button onClick={() => { if(confirm(`Gộp ${group.items.length-1} bản ghi vào ${group.items[0].id}?`)) void run(() => adminFetch("movies/duplicates/merge", {method:"POST",body:JSON.stringify({canonicalId:group.items[0].id,sourceIds:group.items.slice(1).map((item)=>item.id)})}), "Đã gộp phim trùng."); }} className="admin-primary-button mt-3"><IconArrowsJoin size={14}/> Gộp vào bản đầu</button></div>)}</div></section>
    <section className="admin-card p-5"><Title icon={<IconTrash size={17}/>} text="Xóa phim vĩnh viễn"/><p className="mt-2 text-[10px] text-slate-400">Thao tác sẽ xóa cả lịch sử, nguồn phát và dữ liệu liên quan. Nhập slug để tiếp tục.</p><button onClick={() => { const id=prompt("Slug phim cần xóa"); if(!id)return; const confirmation=prompt(`Nhập DELETE ${id}`); if(confirmation) void run(() => adminFetch(`movies/${encodeURIComponent(id)}`, {method:"DELETE",body:JSON.stringify({confirmation})}), "Đã xóa phim."); }} className="admin-control mt-3 inline-flex items-center gap-2 px-3 text-[11px] text-rose-600"><IconTrash size={14}/> Xóa theo slug</button></section>
  </div>;
}
function Title({icon,text}:{icon:React.ReactNode;text:string}){return <div className="flex items-center gap-2 text-blue-600">{icon}<h2 className="text-[13px] font-bold text-slate-800">{text}</h2></div>}
function Input({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){return <label><span className="text-[10px] font-bold text-slate-600">{label}</span><input required className="admin-control mt-1 w-full px-3" value={value} onChange={(event)=>onChange(event.target.value)}/></label>}
