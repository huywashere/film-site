"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  Edit3,
  Eye,
  EyeOff,
  Film,
  Layers3,
  MoreHorizontal,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

type Movie = {
  id: string;
  title: string;
  originName: string;
  posterUrl: string;
  year: number;
  type: "single" | "series" | "anime";
  sources: string[];
  isHidden: boolean;
  description: string;
};

const INITIAL_MOVIES: Movie[] = [
  { id: "bo-gia", title: "Bố Già", originName: "Dad, I'm Sorry", posterUrl: "https://img.phimapi.com/upload/vod/20240101/bo-gia.jpg", year: 2021, type: "single", sources: ["KKPhim", "OPhim"], isHidden: false, description: "Bộ phim điện ảnh tâm lý tình cảm gia đình." },
  { id: "bo-ngua", title: "Bọ Ngựa", originName: "Queen Mantis", posterUrl: "https://img.phimapi.com/upload/vod/20250101/bo-ngua.jpg", year: 2025, type: "series", sources: ["KKPhim", "NguonC"], isHidden: false, description: "Phim truyền hình giật gân kịch tính mới nhất." },
  { id: "bong-ma-bao-thu", title: "Bóng Ma Báo Thù", originName: "M.I.A.", posterUrl: "https://img.phimapi.com/upload/vod/20260101/bong-ma.jpg", year: 2026, type: "series", sources: ["KKPhim", "OPhim", "NguonC"], isHidden: true, description: "Hành trình báo thù ly kỳ trong bóng tối." },
  { id: "bo-vo-toi-la-mafia", title: "Bố Vợ Tôi Là Mafia", originName: "Bapa Mentuaku Mafia", posterUrl: "https://img.phimapi.com/upload/vod/20260101/bo-vo.jpg", year: 2026, type: "series", sources: ["KKPhim"], isHidden: false, description: "Phim hài hước hành động đặc sắc." },
  { id: "one-piece-red", title: "One Piece Film: Red", originName: "One Piece Film Red", posterUrl: "", year: 2022, type: "anime", sources: ["OPhim", "NguonC"], isHidden: false, description: "Cuộc phiêu lưu âm nhạc của băng hải tặc Mũ Rơm." },
];

const sourceClass: Record<string, string> = { KKPhim: "bg-blue-50 text-blue-700", OPhim: "bg-violet-50 text-violet-700", NguonC: "bg-amber-50 text-amber-700" };

export default function MovieManagementPage() {
  return <Suspense fallback={<div className="admin-card h-80 animate-pulse" />}><MovieManagementContent /></Suspense>;
}

function MovieManagementContent() {
  const params = useSearchParams();
  const [movies, setMovies] = useState<Movie[]>(INITIAL_MOVIES);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<Movie | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setSearch(params.get("search") ?? ""), [params]);

  const filteredMovies = useMemo(() => movies.filter((movie) => {
    const keyword = search.trim().toLowerCase();
    if (keyword && !movie.title.toLowerCase().includes(keyword) && !movie.originName.toLowerCase().includes(keyword)) return false;
    if (typeFilter !== "all" && movie.type !== typeFilter) return false;
    if (statusFilter === "visible" && movie.isHidden) return false;
    if (statusFilter === "hidden" && !movie.isHidden) return false;
    return true;
  }), [movies, search, statusFilter, typeFilter]);

  const sync = () => {
    setSyncing(true);
    window.setTimeout(() => { setSyncing(false); setNotice("Đã tạo yêu cầu đồng bộ nguồn phim."); }, 700);
  };
  const toggleVisibility = (id: string) => setMovies((items) => items.map((movie) => movie.id === id ? { ...movie, isHidden: !movie.isHidden } : movie));
  const save = () => {
    if (!editing) return;
    setMovies((items) => items.map((movie) => movie.id === editing.id ? editing : movie));
    setEditing(null);
    setNotice("Đã lưu thay đổi phim.");
  };

  return (
    <div className="admin-fade-in space-y-6">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div><div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400"><span>Nội dung</span><span className="text-slate-300">/</span><span className="text-slate-600">Thư viện phim</span></div><h1 className="mt-2 text-[29px] font-bold tracking-[-.045em] text-slate-800">Thư viện phim</h1><p className="mt-1 text-[13px] text-slate-500">Kiểm soát metadata, nguồn phát và trạng thái xuất bản.</p></div>
        <button onClick={sync} disabled={syncing} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[var(--admin-brand)] px-3.5 text-[12px] font-semibold text-white shadow-[0_6px_14px_rgba(36,107,254,.18)] transition-colors hover:bg-[var(--admin-brand-strong)] disabled:opacity-70"><RefreshCw size={15} className={syncing ? "animate-spin" : ""} />{syncing ? "Đang tạo yêu cầu" : "Đồng bộ nguồn"}</button>
      </header>

      {notice && <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[12px] font-medium text-emerald-700"><span className="flex items-center gap-2"><Check size={16} /> {notice}</span><button onClick={() => setNotice(null)} aria-label="Đóng thông báo"><X size={16} /></button></div>}

      <section className="admin-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[var(--admin-line)] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-[14px] font-bold text-slate-800">Danh mục nội dung</h2><p className="mt-0.5 text-[11px] text-slate-400">{filteredMovies.length} kết quả trong danh sách hiện tại</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-[250px]"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="admin-control w-full bg-slate-50 pl-9 pr-3 text-[12px] placeholder:text-slate-400" placeholder="Tìm theo tên phim..." /></label>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="admin-control px-3 text-[12px]"><option value="all">Tất cả định dạng</option><option value="series">Phim bộ</option><option value="single">Phim lẻ</option><option value="anime">Hoạt hình</option></select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="admin-control px-3 text-[12px]"><option value="all">Mọi trạng thái</option><option value="visible">Đang hiển thị</option><option value="hidden">Đã ẩn</option></select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-[.07em] text-slate-400"><tr><th className="px-5 py-3">Nội dung</th><th className="px-4 py-3">Định dạng</th><th className="px-4 py-3">Nguồn phát</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Cập nhật</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead>
            <tbody className="divide-y divide-[var(--admin-line)]">
              {filteredMovies.map((movie) => <tr key={movie.id} className="transition-colors hover:bg-slate-50/70"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="grid h-12 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-gradient-to-br from-[#dce6fa] to-[#bdcbe5] text-slate-500">{movie.posterUrl ? <img src={movie.posterUrl} alt="" className="h-full w-full object-cover" /> : <Film size={15} />}</div><div className="min-w-0"><p className="max-w-[240px] truncate text-[12px] font-semibold text-slate-700">{movie.title}</p><p className="mt-0.5 max-w-[240px] truncate text-[11px] text-slate-400">{movie.originName} · {movie.year}</p></div></div></td><td className="px-4 py-3.5"><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{movie.type === "series" ? "Phim bộ" : movie.type === "single" ? "Phim lẻ" : "Hoạt hình"}</span></td><td className="px-4 py-3.5"><div className="flex flex-wrap gap-1">{movie.sources.map((source) => <span key={source} className={`rounded-md px-1.5 py-1 text-[10px] font-semibold ${sourceClass[source]}`}>{source}</span>)}</div></td><td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${movie.isHidden ? "text-slate-400" : "text-emerald-600"}`}><i className={`h-1.5 w-1.5 rounded-full ${movie.isHidden ? "bg-slate-300" : "bg-emerald-500"}`} />{movie.isHidden ? "Đã ẩn" : "Đang hiển thị"}</span></td><td className="px-4 py-3.5 text-[11px] text-slate-400">Hôm nay, 09:42</td><td className="px-5 py-3.5"><div className="flex justify-end gap-1"><button onClick={() => setEditing({ ...movie })} className="admin-icon-button !h-8 !w-8" title="Chỉnh sửa"><Edit3 size={15} /></button><button onClick={() => toggleVisibility(movie.id)} className="admin-icon-button !h-8 !w-8" title={movie.isHidden ? "Hiện phim" : "Ẩn phim"}>{movie.isHidden ? <Eye size={15} /> : <EyeOff size={15} />}</button><button className="admin-icon-button !h-8 !w-8" title="Tùy chọn"><MoreHorizontal size={17} /></button></div></td></tr>)}
              {!filteredMovies.length && <tr><td colSpan={6} className="px-5 py-14 text-center text-[12px] text-slate-400">Không tìm thấy nội dung phù hợp.</td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="flex items-center justify-between border-t border-[var(--admin-line)] px-5 py-3"><span className="text-[11px] text-slate-400">Hiển thị {filteredMovies.length} trên 12.850 phim</span><div className="flex gap-1"><button className="admin-icon-button !h-8 !w-8" disabled aria-label="Trang trước"><ChevronLeft size={16} /></button><button className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--admin-brand)] text-[11px] font-bold text-white">1</button><button className="grid h-8 w-8 place-items-center rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-slate-100">2</button><button className="admin-icon-button !h-8 !w-8" aria-label="Trang sau"><ChevronRight size={16} /></button></div></footer>
      </section>

      <section className="grid gap-4 md:grid-cols-3"><div className="admin-card flex items-center gap-3 p-4"><span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600"><Database size={17} /></span><span><strong className="block text-[14px] text-slate-700">3 nguồn đang hoạt động</strong><small className="text-[11px] text-slate-400">Đồng bộ metadata theo lịch</small></span></div><div className="admin-card flex items-center gap-3 p-4"><span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-50 text-violet-600"><Layers3 size={17} /></span><span><strong className="block text-[14px] text-slate-700">1.420 phim đã gộp</strong><small className="text-[11px] text-slate-400">Tránh lặp nội dung giữa nguồn</small></span></div><div className="admin-card flex items-center gap-3 p-4"><span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><Check size={17} /></span><span><strong className="block text-[14px] text-slate-700">99,2% metadata hợp lệ</strong><small className="text-[11px] text-slate-400">Đã kiểm tra trong 24 giờ</small></span></div></section>

      {editing && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-[2px]"><div role="dialog" aria-modal="true" aria-labelledby="edit-film-title" className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[var(--admin-line)] px-5 py-4"><div><h2 id="edit-film-title" className="text-[15px] font-bold text-slate-800">Chỉnh sửa phim</h2><p className="mt-0.5 text-[11px] text-slate-400">Cập nhật metadata hiển thị trong thư viện.</p></div><button onClick={() => setEditing(null)} className="admin-icon-button !h-8 !w-8" aria-label="Đóng"><X size={17} /></button></div><div className="space-y-4 p-5"><label className="block text-[11px] font-semibold text-slate-600">Tên phim<input value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} className="admin-control mt-1.5 w-full px-3 text-[13px]" /></label><label className="block text-[11px] font-semibold text-slate-600">Tên gốc<input value={editing.originName} onChange={(event) => setEditing({ ...editing, originName: event.target.value })} className="admin-control mt-1.5 w-full px-3 text-[13px]" /></label><label className="block text-[11px] font-semibold text-slate-600">Mô tả<textarea value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} className="mt-1.5 min-h-24 w-full rounded-lg border border-[var(--admin-line)] px-3 py-2 text-[13px] text-slate-600 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50" /></label></div><div className="flex justify-end gap-2 border-t border-[var(--admin-line)] px-5 py-4"><button onClick={() => setEditing(null)} className="h-9 rounded-lg px-3.5 text-[12px] font-semibold text-slate-500 hover:bg-slate-100">Hủy</button><button onClick={save} className="h-9 rounded-lg bg-[var(--admin-brand)] px-3.5 text-[12px] font-semibold text-white hover:bg-[var(--admin-brand-strong)]">Lưu thay đổi</button></div></div></div>}
    </div>
  );
}
