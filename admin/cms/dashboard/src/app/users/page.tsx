"use client";

import { useMemo, useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  History,
  Lock,
  Monitor,
  Search,
  ShieldCheck,
  Smartphone,
  Unlock,
  UserCheck,
  Users,
  X,
} from "lucide-react";

type User = {
  id: string; username: string; email: string; displayName: string; role: "USER" | "ADMIN"; isBanned: boolean; isEmailVerified: boolean; createdAt: string;
  watchHistories: { id: string; title: string; episode: string; watchedAt: string }[];
  watchlist: { id: string; title: string }[];
  activeSessions: { id: string; device: string; ip: string; lastActive: string }[];
};

const INITIAL_USERS: User[] = [
  { id: "usr-001", username: "john_doe", email: "john@gmail.com", displayName: "John Doe", role: "USER", isBanned: false, isEmailVerified: true, createdAt: "2026-01-15", watchHistories: [{ id: "h1", title: "Bố Già", episode: "Tập Full", watchedAt: "10 phút trước" }, { id: "h2", title: "One Piece Film Red", episode: "Tập Full", watchedAt: "2 giờ trước" }], watchlist: [{ id: "w1", title: "Bọ Ngựa" }, { id: "w2", title: "Chuyến Tàu Sinh Tử" }], activeSessions: [{ id: "s1", device: "Chrome / Windows 11", ip: "118.69.182.10", lastActive: "Vừa xong" }, { id: "s2", device: "Safari / iPhone 15 Pro", ip: "118.69.182.11", lastActive: "1 ngày trước" }] },
  { id: "usr-002", username: "bad_actor", email: "spam@bot.com", displayName: "Spammer Bot", role: "USER", isBanned: true, isEmailVerified: false, createdAt: "2026-03-20", watchHistories: [], watchlist: [], activeSessions: [] },
  { id: "usr-003", username: "admin_master", email: "admin@cineverse.com", displayName: "Administrator", role: "ADMIN", isBanned: false, isEmailVerified: true, createdAt: "2025-12-01", watchHistories: [{ id: "h3", title: "Bố Vợ Tôi Là Mafia", episode: "Tập 12", watchedAt: "1 ngày trước" }], watchlist: [], activeSessions: [{ id: "s3", device: "Edge / Windows 11", ip: "127.0.0.1", lastActive: "Vừa xong" }] },
  { id: "usr-004", username: "linh.tran", email: "linh.tran@gmail.com", displayName: "Linh Trần", role: "USER", isBanned: false, isEmailVerified: true, createdAt: "2026-06-08", watchHistories: [{ id: "h4", title: "Thám Tử Sugar", episode: "Tập 02", watchedAt: "Hôm qua" }], watchlist: [{ id: "w3", title: "Disclosure Day" }], activeSessions: [{ id: "s4", device: "Chrome / Android", ip: "113.161.25.9", lastActive: "3 giờ trước" }] },
];

function initials(name: string) { return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase(); }

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const filteredUsers = useMemo(() => users.filter((user) => {
    const keyword = search.trim().toLowerCase();
    if (keyword && ![user.username, user.email, user.displayName].some((value) => value.toLowerCase().includes(keyword))) return false;
    if (status === "active" && user.isBanned) return false;
    if (status === "banned" && !user.isBanned) return false;
    if (status === "unverified" && user.isEmailVerified) return false;
    return true;
  }), [search, status, users]);

  const toggleBan = (id: string) => {
    const target = users.find((user) => user.id === id);
    setUsers((items) => items.map((user) => user.id === id ? { ...user, isBanned: !user.isBanned } : user));
    if (selected?.id === id) setSelected((user) => user ? { ...user, isBanned: !user.isBanned } : user);
    setNotice(target?.isBanned ? "Đã mở khóa tài khoản." : "Đã tạm khóa tài khoản.");
  };

  return (
    <div className="admin-fade-in space-y-6">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div><div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400"><span>Cộng đồng</span><span className="text-slate-300">/</span><span className="text-slate-600">Người dùng</span></div><h1 className="mt-2 text-[29px] font-bold tracking-[-.045em] text-slate-800">Người dùng</h1><p className="mt-1 text-[13px] text-slate-500">Theo dõi hồ sơ, trạng thái và dấu vết hoạt động của tài khoản.</p></div>
        <div className="grid grid-cols-3 gap-3"><div className="rounded-xl border border-[var(--admin-line)] bg-white px-4 py-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tổng</p><strong className="text-[17px] text-slate-700">1.428</strong></div><div className="rounded-xl border border-[var(--admin-line)] bg-white px-4 py-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Mới</p><strong className="text-[17px] text-emerald-600">+46</strong></div><div className="rounded-xl border border-[var(--admin-line)] bg-white px-4 py-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Khóa</p><strong className="text-[17px] text-rose-500">12</strong></div></div>
      </header>

      {notice && <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[12px] font-medium text-blue-700"><span className="flex items-center gap-2"><ShieldCheck size={16} /> {notice}</span><button onClick={() => setNotice(null)} aria-label="Đóng thông báo"><X size={16} /></button></div>}

      <section className="admin-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[var(--admin-line)] p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-[14px] font-bold text-slate-800">Danh sách tài khoản</h2><p className="mt-0.5 text-[11px] text-slate-400">{filteredUsers.length} kết quả phù hợp bộ lọc</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative min-w-[250px]"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="admin-control w-full bg-slate-50 pl-9 pr-3 text-[12px] placeholder:text-slate-400" placeholder="Tìm tên, email hoặc username..." /></label><select value={status} onChange={(event) => setStatus(event.target.value)} className="admin-control px-3 text-[12px]"><option value="all">Mọi trạng thái</option><option value="active">Đang hoạt động</option><option value="banned">Đã khóa</option><option value="unverified">Chưa xác minh</option></select></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-[.07em] text-slate-400"><tr><th className="px-5 py-3">Người dùng</th><th className="px-4 py-3">Vai trò</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Đăng ký</th><th className="px-4 py-3">Phiên gần nhất</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-[var(--admin-line)]">{filteredUsers.map((user) => <tr key={user.id} className="transition-colors hover:bg-slate-50/70"><td className="px-5 py-3.5"><button onClick={() => setSelected(user)} className="flex items-center gap-3 text-left"><span className={`grid h-9 w-9 place-items-center rounded-full text-[11px] font-bold ${user.role === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>{initials(user.displayName)}</span><span><span className="block text-[12px] font-semibold text-slate-700">{user.displayName}</span><span className="mt-0.5 block text-[11px] text-slate-400">{user.email}</span></span></button></td><td className="px-4 py-3.5"><span className={`rounded-md px-2 py-1 text-[10px] font-bold ${user.role === "ADMIN" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"}`}>{user.role === "ADMIN" ? "Quản trị viên" : "Thành viên"}</span></td><td className="px-4 py-3.5">{user.isBanned ? <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-500"><i className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Đã khóa</span> : user.isEmailVerified ? <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600"><i className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Đã xác minh</span> : <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600"><i className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Chờ xác minh</span>}</td><td className="px-4 py-3.5 text-[11px] text-slate-400">{new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(user.createdAt))}</td><td className="px-4 py-3.5 text-[11px] text-slate-400">{user.activeSessions[0]?.lastActive ?? "Chưa có phiên"}</td><td className="px-5 py-3.5"><div className="flex justify-end gap-2"><button onClick={() => setSelected(user)} className="h-8 rounded-lg border border-[var(--admin-line)] px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Chi tiết</button>{user.role !== "ADMIN" && <button onClick={() => toggleBan(user.id)} className={`admin-icon-button !h-8 !w-8 ${user.isBanned ? "!text-emerald-600 hover:!bg-emerald-50" : "!text-rose-500 hover:!bg-rose-50"}`} title={user.isBanned ? "Mở khóa" : "Khóa tài khoản"}>{user.isBanned ? <Unlock size={15} /> : <Lock size={15} />}</button>}</div></td></tr>)}{!filteredUsers.length && <tr><td colSpan={6} className="px-5 py-14 text-center text-[12px] text-slate-400">Không tìm thấy tài khoản phù hợp.</td></tr>}</tbody></table></div>
        <footer className="flex items-center justify-between border-t border-[var(--admin-line)] px-5 py-3"><span className="text-[11px] text-slate-400">Hiển thị {filteredUsers.length} trên 1.428 người dùng</span><div className="flex gap-1"><button className="admin-icon-button !h-8 !w-8" disabled aria-label="Trang trước"><ChevronLeft size={16} /></button><button className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--admin-brand)] text-[11px] font-bold text-white">1</button><button className="grid h-8 w-8 place-items-center rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-slate-100">2</button><button className="admin-icon-button !h-8 !w-8" aria-label="Trang sau"><ChevronRight size={16} /></button></div></footer>
      </section>

      {selected && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[2px]"><aside role="dialog" aria-modal="true" aria-label="Chi tiết người dùng" className="h-full w-full max-w-[480px] overflow-y-auto bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-[var(--admin-line)] px-6 py-5"><div><p className="text-[11px] font-semibold text-slate-400">HỒ SƠ NGƯỜI DÙNG</p><h2 className="mt-1 text-[18px] font-bold tracking-[-.03em] text-slate-800">{selected.displayName}</h2></div><button onClick={() => setSelected(null)} className="admin-icon-button" aria-label="Đóng chi tiết"><X size={19} /></button></header><div className="space-y-6 p-6"><div className="flex items-center gap-4"><span className={`grid h-14 w-14 place-items-center rounded-full text-[15px] font-bold ${selected.role === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>{initials(selected.displayName)}</span><div><p className="text-[14px] font-bold text-slate-700">@{selected.username}</p><p className="mt-0.5 text-[12px] text-slate-400">{selected.email}</p><span className="mt-2 inline-flex rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{selected.role === "ADMIN" ? "QUẢN TRỊ VIÊN" : "THÀNH VIÊN"}</span></div></div><DetailSection icon={History} title="Lịch sử xem"><div className="space-y-2">{selected.watchHistories.length ? selected.watchHistories.map((item) => <div key={item.id} className="flex justify-between rounded-lg bg-slate-50 p-3 text-[11px]"><span><strong className="block text-slate-600">{item.title}</strong><small className="text-slate-400">{item.episode}</small></span><span className="text-slate-400">{item.watchedAt}</span></div>) : <Empty text="Chưa có lịch sử xem" />}</div></DetailSection><DetailSection icon={Bookmark} title="Danh sách xem sau"><div className="flex flex-wrap gap-2">{selected.watchlist.length ? selected.watchlist.map((item) => <span key={item.id} className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700">{item.title}</span>) : <Empty text="Danh sách đang trống" />}</div></DetailSection><DetailSection icon={Monitor} title="Phiên hoạt động"><div className="space-y-2">{selected.activeSessions.length ? selected.activeSessions.map((session) => <div key={session.id} className="flex items-center gap-3 rounded-lg border border-[var(--admin-line)] p-3"><Smartphone size={16} className="text-slate-400" /><span className="min-w-0 flex-1"><strong className="block truncate text-[11px] text-slate-600">{session.device}</strong><small className="text-[10px] text-slate-400">{session.ip} · {session.lastActive}</small></span></div>) : <Empty text="Không có phiên hoạt động" />}</div></DetailSection></div>{selected.role !== "ADMIN" && <footer className="sticky bottom-0 border-t border-[var(--admin-line)] bg-white px-6 py-4"><button onClick={() => toggleBan(selected.id)} className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-[12px] font-semibold ${selected.isBanned ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-rose-500 text-white hover:bg-rose-600"}`}>{selected.isBanned ? <><Unlock size={16} /> Mở khóa tài khoản</> : <><Lock size={16} /> Tạm khóa tài khoản</>}</button></footer>}</aside></div>}
    </div>
  );
}

function DetailSection({ icon: Icon, title, children }: { icon: typeof History; title: string; children: React.ReactNode }) { return <section><h3 className="mb-3 flex items-center gap-2 text-[12px] font-bold text-slate-700"><Icon size={15} className="text-[var(--admin-brand)]" />{title}</h3>{children}</section>; }
function Empty({ text }: { text: string }) { return <p className="rounded-lg bg-slate-50 px-3 py-3 text-[11px] text-slate-400">{text}</p>; }
