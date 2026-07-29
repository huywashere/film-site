"use client";

import { useState } from "react";
import {
  Users,
  Search,
  Filter,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  History,
  Bookmark,
  Monitor,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldAlert,
} from "lucide-react";

// Mock User Items (Server-side paginated)
const INITIAL_USERS = [
  {
    id: "usr-001",
    username: "john_doe",
    email: "john@gmail.com",
    displayName: "John Doe",
    role: "USER",
    isBanned: false,
    isEmailVerified: true,
    createdAt: "2026-01-15",
    watchHistories: [
      { id: "h1", title: "Bố Già", episode: "Tập Full", watchedAt: "10 phút trước" },
      { id: "h2", title: "One Piece Film Red", episode: "Tập Full", watchedAt: "2 giờ trước" },
    ],
    watchlist: [
      { id: "w1", title: "Bọ Ngựa" },
      { id: "w2", title: "Chuyến Tàu Sinh Tử" },
    ],
    activeSessions: [
      { id: "s1", device: "Chrome / Windows 11", ip: "118.69.182.10", lastActive: "Vừa xong" },
      { id: "s2", device: "Safari / iPhone 15 Pro", ip: "118.69.182.11", lastActive: "1 ngày trước" },
    ],
  },
  {
    id: "usr-002",
    username: "bad_actor",
    email: "spam@bot.com",
    displayName: "Spammer Bot",
    role: "USER",
    isBanned: true,
    isEmailVerified: false,
    createdAt: "2026-03-20",
    watchHistories: [],
    watchlist: [],
    activeSessions: [],
  },
  {
    id: "usr-003",
    username: "admin_master",
    email: "admin@cineverse.com",
    displayName: "Administrator",
    role: "ADMIN",
    isBanned: false,
    isEmailVerified: true,
    createdAt: "2025-12-01",
    watchHistories: [
      { id: "h3", title: "Bố Vợ Tôi Là Mafia", episode: "Tập 12", watchedAt: "1 ngày trước" },
    ],
    watchlist: [],
    activeSessions: [
      { id: "s3", device: "Edge / Windows 11", ip: "127.0.0.1", lastActive: "Vừa xong" },
    ],
  },
];

export default function UserManagementPage() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Detail Drawer State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  // Audit Toast Alert
  const [auditAlert, setAuditAlert] = useState<string | null>(null);

  // Filter users
  const filteredUsers = users.filter((u) => {
    if (search && !u.username.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter === "active" && u.isBanned) return false;
    if (statusFilter === "banned" && !u.isBanned) return false;
    if (statusFilter === "unverified" && u.isEmailVerified) return false;
    return true;
  });

  // Toggle Ban / Unban Account
  const handleToggleBan = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextBanned = !u.isBanned;
          const actionText = nextBanned ? "Đã KHOÁ tài khoản" : "Đã MỞ KHOÁ tài khoản";
          setAuditAlert(`[AuditLog] ${actionText} "${u.username}" (${u.email})!`);
          setTimeout(() => setAuditAlert(null), 4000);
          return { ...u, isBanned: nextBanned };
        }
        return u;
      })
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#30363d] pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users size={22} className="text-blue-400" />
            <span>Quản Lý Người Dùng</span>
            <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono font-medium">
              GIAI ĐOẠN 1
            </span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Tra cứu thông tin, lịch sử xem, session đăng nhập và khoá/mở khoá tài khoản (isBanned)
          </p>
        </div>
      </div>

      {/* Audit Log Alert Toast */}
      {auditAlert && (
        <div className="bg-rose-600/15 border border-rose-500/30 text-rose-300 p-3 rounded-lg text-xs font-semibold flex items-center justify-between animate-fade-in">
          <span>🛡️ {auditAlert}</span>
          <button onClick={() => setAuditAlert(null)}><X size={14} /></button>
        </div>
      )}

      {/* ── Filter & Search Toolbar ── */}
      <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo username, email..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-neutral-300 focus:outline-none focus:border-blue-500 font-medium"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active font-bold">Tài khoản Hoạt động (Active)</option>
          <option value="banned">Tài khoản Bị Khoá (Banned)</option>
          <option value="unverified">Chưa Xác thực Email</option>
        </select>
      </div>

      {/* ── Server-Side Paginated Table ── */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#30363d] text-neutral-400 uppercase text-[10px] tracking-wider bg-[#0d1117]/60">
              <th className="py-3.5 px-4 font-bold">Người Dùng</th>
              <th className="py-3.5 px-4 font-bold w-28">Vai Trò</th>
              <th className="py-3.5 px-4 font-bold w-32">Xác Thực Email</th>
              <th className="py-3.5 px-4 font-bold w-32">Trạng Thái (isBanned)</th>
              <th className="py-3.5 px-4 font-bold w-32">Ngày Tham Gia</th>
              <th className="py-3.5 px-4 font-bold w-36 text-right">Thao Tác Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262d]">
            {filteredUsers.map((user) => (
              <tr key={user.id} className={`hover:bg-white/[0.02] transition-colors ${user.isBanned ? "bg-rose-500/[0.03]" : ""}`}>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-extrabold uppercase shrink-0">
                      {user.username.slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{user.displayName || user.username}</h4>
                      <p className="text-[11px] text-neutral-400 font-mono">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-bold">
                  {user.role === "ADMIN" ? (
                    <span className="bg-blue-600/20 text-blue-400 border border-blue-500/40 text-[10px] px-2 py-0.5 rounded uppercase font-mono">
                      ADMIN
                    </span>
                  ) : (
                    <span className="text-neutral-400 font-mono">USER</span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  {user.isEmailVerified ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle size={13} /> Verified
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1 font-semibold">
                      <XCircle size={13} /> Chưa Verify
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  {user.isBanned ? (
                    <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1">
                      <Lock size={10} /> BANNED (Khoá)
                    </span>
                  ) : (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1">
                      <Unlock size={10} /> ACTIVE
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-neutral-400 font-mono">{user.createdAt}</td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* View Detail Drawer */}
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="px-2.5 py-1.5 bg-[#0d1117] hover:bg-blue-600/20 text-neutral-300 hover:text-blue-400 border border-[#30363d] rounded-lg font-semibold transition-colors"
                      title="Xem lịch sử, watchlist & sessions"
                    >
                      Chi tiết
                    </button>

                    {/* Ban / Unban Toggle Button */}
                    <button
                      onClick={() => handleToggleBan(user.id)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        user.isBanned
                          ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-600/30"
                          : "bg-rose-600/20 text-rose-400 border-rose-500/40 hover:bg-rose-600/30"
                      }`}
                      title={user.isBanned ? "Mở khoá tài khoản này" : "Khoá tài khoản này (Set isBanned = true)"}
                    >
                      {user.isBanned ? <Unlock size={14} /> : <Lock size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Server Pagination Footer */}
        <div className="p-4 border-t border-[#30363d] bg-[#0d1117]/40 flex items-center justify-between text-xs text-neutral-400">
          <span>Hiển thị <strong>{filteredUsers.length}</strong> / <strong>{users.length}</strong> người dùng</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="p-1.5 bg-[#161b22] border border-[#30363d] rounded-lg disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-mono font-bold text-white">Trang {page} / 1</span>
            <button
              disabled
              className="p-1.5 bg-[#161b22] border border-[#30363d] rounded-lg disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Detail Drawer: Lịch sử xem, Watchlist & Session thiết bị ── */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-end">
          <div className="bg-[#161b22] border-l border-[#30363d] w-full max-w-md h-full p-6 space-y-6 overflow-y-auto shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-4">
              <div>
                <h3 className="text-sm font-bold text-white">{selectedUser.displayName || selectedUser.username}</h3>
                <p className="text-xs text-neutral-400 font-mono">{selectedUser.email}</p>
              </div>
              <button onClick={() => setSelectedUser(null)}><X size={18} className="text-neutral-400" /></button>
            </div>

            {/* Active Login Sessions */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Monitor size={14} className="text-blue-400" />
                Phiên Đăng Nhập & Thiết Bị (Sessions)
              </h4>
              <div className="space-y-2 text-xs">
                {selectedUser.activeSessions.length > 0 ? (
                  selectedUser.activeSessions.map((session: any) => (
                    <div key={session.id} className="bg-[#0d1117] border border-[#30363d] p-3 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-bold text-neutral-200">{session.device}</p>
                        <p className="text-[10px] text-neutral-500 font-mono">IP: {session.ip}</p>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {session.lastActive}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-neutral-500 text-xs italic">Không có phiên đăng nhập nào hoạt động</p>
                )}
              </div>
            </div>

            {/* Watch History */}
            <div className="space-y-3 border-t border-[#30363d] pt-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <History size={14} className="text-purple-400" />
                Lịch Sử Xem Gần Đây
              </h4>
              <div className="space-y-2 text-xs">
                {selectedUser.watchHistories.length > 0 ? (
                  selectedUser.watchHistories.map((h: any) => (
                    <div key={h.id} className="bg-[#0d1117] border border-[#30363d] p-2.5 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white">{h.title}</p>
                        <p className="text-[10px] text-neutral-400">{h.episode}</p>
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono">{h.watchedAt}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-neutral-500 text-xs italic">Chưa có lịch sử xem phim</p>
                )}
              </div>
            </div>

            {/* Watchlist */}
            <div className="space-y-3 border-t border-[#30363d] pt-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark size={14} className="text-amber-400" />
                Danh Sách Phim Yêu Thích (Watchlist)
              </h4>
              <div className="space-y-1.5 text-xs">
                {selectedUser.watchlist.length > 0 ? (
                  selectedUser.watchlist.map((w: any) => (
                    <div key={w.id} className="bg-[#0d1117] border border-[#30363d] px-3 py-2 rounded-lg font-semibold text-neutral-300">
                      🔖 {w.title}
                    </div>
                  ))
                ) : (
                  <p className="text-neutral-500 text-xs italic">Danh sách phim theo dõi trống</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
