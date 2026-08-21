"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconLock as Lock,
  IconDeviceDesktop as Monitor,
  IconSearch as Search,
  IconShieldCheck as ShieldCheck,
  IconLockOpen as Unlock,
  IconX as X,
} from "@tabler/icons-react";
import { adminFetch, queryString } from "@/lib/admin-api";

type UserRow = {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  role: "USER" | "MODERATOR" | "ADMIN";
  isBanned: boolean;
  isLocked?: boolean;
  isEmailVerified: boolean;
  twoFactorEnabled?: boolean;
  createdAt: string;
};
type UserDetail = UserRow & {
  watchHistories: {
    id: string;
    movieTitle: string;
    episode?: string;
    updatedAt: string;
  }[];
  watchlist: { id: string; movie: { title: string } }[];
  refreshTokens: {
    id: string;
    userAgent?: string;
    ipAddress?: string;
    lastUsedAt: string;
    expiresAt: string;
  }[];
};
type PageData = {
  items: UserRow[];
  pagination: { page: number; total: number; totalPages: number };
};
const roleLabels: Record<UserRow["role"], string> = {
  USER: "Người dùng",
  MODERATOR: "Kiểm duyệt viên",
  ADMIN: "Quản trị viên",
};

export default function UsersPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(
        await adminFetch<PageData>(
          `users?${queryString({ page, limit: 15, search, status })}`,
        ),
      );
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải người dùng",
      );
    }
  }, [page, search, status]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const open = async (id: string) => {
    setBusy(`detail:${id}`);
    try {
      setSelected(await adminFetch<UserDetail>(`users/${id}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải hồ sơ");
    } finally {
      setBusy("");
    }
  };
  const action = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
      await load();
      if (selected)
        setSelected(await adminFetch<UserDetail>(`users/${selected.id}`));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Thao tác thất bại");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="admin-fade-in space-y-6">
      <header>
        <p className="text-[11px] font-semibold text-slate-400">
          CỘNG ĐỒNG / TÀI KHOẢN
        </p>
        <h1 className="mt-2 text-[29px] font-bold tracking-[-.045em] text-slate-800">
          Người dùng và phiên đăng nhập
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Khóa tài khoản, phân quyền và thu hồi phiên trực tiếp.
        </p>
      </header>
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700">
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
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="admin-control w-full bg-slate-50 pl-9 pr-3 text-[12px]"
              placeholder="Tìm email, username..."
            />
          </label>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="admin-control px-3 text-[12px]"
          >
            <option value="">Mọi trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="banned">Đã khóa</option>
            <option value="unverified">Chưa xác minh</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3">Người dùng</th>
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Đăng ký</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-line)]">
              {data?.items.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3">
                    <button
                      onClick={() => void open(user.id)}
                      className="text-left"
                    >
                      <strong className="block text-[12px] text-slate-700">
                        {user.displayName || user.username}
                      </strong>
                      <small className="text-[10px] text-slate-400">
                        {user.email} · @{user.username}
                      </small>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-700">
                      {roleLabels[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px]">
                    {user.isBanned ? (
                      <span className="text-rose-600">Đã cấm</span>
                    ) : user.isLocked ? (
                      <span className="text-amber-600">Khóa bảo mật</span>
                    ) : user.isEmailVerified ? (
                      <span className="text-emerald-600">Đã xác minh</span>
                    ) : (
                      <span className="text-slate-400">Chưa xác minh</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[10px] text-slate-400">
                    {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => void open(user.id)}
                        className="admin-control h-8 px-3 text-[10px]"
                      >
                        Chi tiết
                      </button>
                      {user.role !== "ADMIN" && (
                        <button
                          disabled={busy === `ban:${user.id}`}
                          onClick={() =>
                            void action(`ban:${user.id}`, () =>
                              adminFetch(`users/${user.id}/ban`, {
                                method: "PATCH",
                              }),
                            )
                          }
                          className="admin-icon-button !h-8 !w-8"
                          title={user.isBanned ? "Mở cấm" : "Cấm tài khoản"}
                        >
                          {user.isBanned ? (
                            <Unlock size={14} />
                          ) : (
                            <Lock size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!data?.items.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-14 text-center text-[12px] text-slate-400"
                  >
                    Không có tài khoản phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex items-center justify-between border-t border-[var(--admin-line)] px-5 py-3 text-[11px] text-slate-400">
          <span>{data?.pagination.total || 0} tài khoản</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((v) => v - 1)}
              className="admin-control px-3 disabled:opacity-40"
            >
              Trước
            </button>
            <span>
              {page}/{Math.max(1, data?.pagination.totalPages || 1)}
            </span>
            <button
              disabled={page >= (data?.pagination.totalPages || 1)}
              onClick={() => setPage((v) => v + 1)}
              className="admin-control px-3 disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </footer>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
          <aside className="h-full w-full max-w-[520px] overflow-y-auto bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-[var(--admin-line)] px-6 py-5">
              <div>
                <p className="text-[10px] font-bold text-slate-400">
                  HỒ SƠ VẬN HÀNH
                </p>
                <h2 className="mt-1 text-[18px] font-bold text-slate-800">
                  {selected.displayName || selected.username}
                </h2>
                <p className="text-[11px] text-slate-400">{selected.email}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="admin-icon-button"
              >
                <X size={18} />
              </button>
            </header>
            <div className="space-y-6 p-6">
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-[12px] font-bold text-slate-700">
                  <ShieldCheck size={15} className="text-blue-600" />
                  Quyền và trạng thái
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={selected.role}
                    disabled={selected.role === "ADMIN"}
                    onChange={(event) =>
                      void action(`role:${selected.id}`, () =>
                        adminFetch(`users/${selected.id}/role`, {
                          method: "PATCH",
                          body: JSON.stringify({ role: event.target.value }),
                        }),
                      )
                    }
                    className="admin-control px-3 text-[11px]"
                  >
                    <option value="USER">Người dùng</option>
                    <option value="MODERATOR">Kiểm duyệt viên</option>
                    <option value="ADMIN">Quản trị viên</option>
                  </select>
                  <button
                    disabled={selected.role === "ADMIN"}
                    onClick={() =>
                      void action(`lock:${selected.id}`, () =>
                        adminFetch(`users/${selected.id}/lock`, {
                          method: "PATCH",
                          body: JSON.stringify({ locked: !selected.isLocked }),
                        }),
                      )
                    }
                    className="admin-control px-3 text-[11px]"
                  >
                    {selected.isLocked ? "Mở khóa bảo mật" : "Khóa bảo mật"}
                  </button>
                  <button
                    disabled={selected.role === "ADMIN"}
                    onClick={() =>
                      void action(`verify:${selected.id}`, () =>
                        adminFetch(`users/${selected.id}/verification`, {
                          method: "PATCH",
                          body: JSON.stringify({
                            locked: !selected.isEmailVerified,
                          }),
                        }),
                      )
                    }
                    className="admin-control px-3 text-[11px]"
                  >
                    {selected.isEmailVerified
                      ? "Hủy xác minh email"
                      : "Xác minh email"}
                  </button>
                  <button
                    disabled={
                      selected.role === "ADMIN" || !selected.twoFactorEnabled
                    }
                    onClick={() => {
                      if (
                        !window.confirm(
                          "Đặt lại 2FA và thu hồi toàn bộ phiên đăng nhập?",
                        )
                      )
                        return;
                      void action(`2fa:${selected.id}`, () =>
                        adminFetch(`users/${selected.id}/two-factor`, {
                          method: "DELETE",
                        }),
                      );
                    }}
                    className="admin-control px-3 text-[11px] disabled:opacity-40"
                  >
                    {selected.twoFactorEnabled ? "Đặt lại 2FA" : "Chưa bật 2FA"}
                  </button>
                </div>
              </section>
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-[12px] font-bold text-slate-700">
                  <Monitor size={15} className="text-blue-600" />
                  Phiên đang hoạt động
                </h3>
                <div className="space-y-2">
                  {selected.refreshTokens.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 rounded-xl border border-[var(--admin-line)] p-3"
                    >
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-[10px] text-slate-600">
                          {session.userAgent || "Thiết bị chưa xác định"}
                        </strong>
                        <small className="text-[9px] text-slate-400">
                          {session.ipAddress || "IP không có"} ·{" "}
                          {new Date(session.lastUsedAt).toLocaleString("vi-VN")}
                        </small>
                      </span>
                      <button
                        onClick={() =>
                          void action(`session:${session.id}`, () =>
                            adminFetch(
                              `users/${selected.id}/sessions/${session.id}`,
                              { method: "DELETE" },
                            ),
                          )
                        }
                        className="text-[10px] font-semibold text-rose-600"
                      >
                        Thu hồi
                      </button>
                    </div>
                  ))}
                  {!selected.refreshTokens.length && (
                    <p className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-400">
                      Không có phiên hoạt động.
                    </p>
                  )}
                </div>
              </section>
              <section>
                <h3 className="mb-3 text-[12px] font-bold text-slate-700">
                  Lịch sử xem gần đây
                </h3>
                <div className="space-y-2">
                  {selected.watchHistories.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg bg-slate-50 p-3 text-[10px] text-slate-500"
                    >
                      <strong className="block text-slate-700">
                        {item.movieTitle}
                      </strong>
                      {item.episode || "Full"} ·{" "}
                      {new Date(item.updatedAt).toLocaleString("vi-VN")}
                    </div>
                  ))}
                  {!selected.watchHistories.length && (
                    <p className="text-[11px] text-slate-400">
                      Chưa có lịch sử.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
