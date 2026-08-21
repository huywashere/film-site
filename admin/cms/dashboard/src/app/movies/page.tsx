"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  IconCheck as Check,
  IconEdit as Edit3,
  IconEye as Eye,
  IconEyeOff as EyeOff,
  IconMovie as Film,
  IconPlus as Plus,
  IconRefresh as RefreshCw,
  IconSearch as Search,
  IconTrash as Trash,
  IconX as X,
} from "@tabler/icons-react";
import { adminFetch, queryString } from "@/lib/admin-api";

type PlaybackSource = {
  id?: string;
  provider: string;
  providerSlug: string;
  episodeKey: string;
  episodeName?: string;
  serverName: string;
  streamUrl?: string;
  subtitleUrls?: Record<string, string>;
  introStart?: number;
  introEnd?: number;
  outroStart?: number;
  adCuePoints: number[];
  priority: number;
  healthStatus?: string;
};
type Movie = {
  id: string;
  title: string;
  originName?: string;
  posterUrl?: string;
  year?: number;
  type: string;
  quality?: string;
  language?: string;
  sources: string[];
  isHidden: boolean;
  description?: string;
  trailerUrl?: string;
  genres: string[];
  countries: string[];
  actors: string[];
  directors: string[];
  releaseSchedule?: Record<string, unknown>;
  _count?: { playbackSources: number };
  updatedAt: string;
};
type PageData = {
  items: Movie[];
  pagination: { page: number; total: number; totalPages: number };
};
type SyncJob = {
  id: string;
  source: string;
  status: string;
  processedCount: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  requestedPages: number;
  currentPage: number;
  retryCount: number;
  heartbeatAt?: string;
  errorMessage?: string;
  createdAt: string;
};
const syncStatusLabels: Record<string, string> = {
  QUEUED: "Đang chờ",
  RUNNING: "Đang đồng bộ",
  COMPLETED: "Hoàn tất",
  FAILED: "Thất bại",
};

export default function MovieManagementPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [hidden, setHidden] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Movie | null>(null);
  const [playbackSources, setPlaybackSources] = useState<PlaybackSource[]>([]);
  const [scheduleJson, setScheduleJson] = useState("");
  const [source, setSource] = useState("kkphim");
  const [syncPages, setSyncPages] = useState(5);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const load = useCallback(async () => {
    setError("");
    try {
      const [movies, syncJobs] = await Promise.all([
        adminFetch<PageData>(
          `movies?${queryString({ page, limit: 15, search, type, isHidden: hidden })}`,
        ),
        adminFetch<SyncJob[]>("sync-jobs?limit=8"),
      ]);
      setData(movies);
      setJobs(syncJobs);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải thư viện",
      );
    }
  }, [hidden, page, search, type]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const mutate = async (
    key: string,
    action: () => Promise<unknown>,
    message: string,
  ) => {
    setBusy(key);
    setError("");
    try {
      await action();
      setNotice(message);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Thao tác thất bại");
    } finally {
      setBusy("");
    }
  };

  const openEditor = async (movie: Movie) => {
    setBusy(`open:${movie.id}`);
    try {
      const structured = await adminFetch<PlaybackSource[]>(
        `movies/${movie.id}/playback-sources`,
      );
      setPlaybackSources(
        structured.length
          ? structured
          : movie.sources.map((provider, index) => ({
              provider,
              providerSlug: movie.id,
              episodeKey: "catalog",
              episodeName: "Chờ đồng bộ chi tiết",
              serverName: provider.toUpperCase(),
              adCuePoints: [],
              priority: index,
            })),
      );
      setScheduleJson(
        movie.releaseSchedule
          ? JSON.stringify(movie.releaseSchedule, null, 2)
          : "",
      );
      setEditing({ ...movie });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải nguồn phát",
      );
    } finally {
      setBusy("");
    }
  };
  const save = async () => {
    if (!editing) return;
    let releaseSchedule: Record<string, unknown> | undefined;
    try {
      releaseSchedule = scheduleJson.trim()
        ? JSON.parse(scheduleJson)
        : undefined;
    } catch {
      setError("Lịch phát hành phải là JSON hợp lệ");
      return;
    }
    await mutate(
      `edit:${editing.id}`,
      () =>
        Promise.all([
          adminFetch(`movies/${editing.id}/metadata`, {
            method: "PATCH",
            body: JSON.stringify({
              title: editing.title,
              originName: editing.originName || undefined,
              posterUrl: editing.posterUrl || undefined,
              description: editing.description || undefined,
              year: editing.year || undefined,
              type: editing.type,
              quality: editing.quality || undefined,
              language: editing.language || undefined,
              trailerUrl: editing.trailerUrl || undefined,
              genres: editing.genres,
              countries: editing.countries,
              actors: editing.actors,
              directors: editing.directors,
              releaseSchedule,
            }),
          }),
          adminFetch(`movies/${editing.id}/playback-sources`, {
            method: "PATCH",
            body: JSON.stringify({
              items: playbackSources.map((item) => ({
                provider: item.provider,
                providerSlug: item.providerSlug,
                episodeKey: item.episodeKey,
                episodeName: item.episodeName || undefined,
                serverName: item.serverName,
                streamUrl: item.streamUrl || undefined,
                subtitleUrls: item.subtitleUrls,
                introStart: item.introStart,
                introEnd: item.introEnd,
                outroStart: item.outroStart,
                adCuePoints: item.adCuePoints,
                priority: item.priority,
              })),
            }),
          }),
        ]),
      "Đã lưu metadata, tập phim và nguồn phát.",
    );
    setEditing(null);
  };
  const sync = () =>
    mutate(
      "sync",
      () =>
        adminFetch("movies/sync", {
          method: "POST",
          body: JSON.stringify({ source, pages: syncPages }),
        }),
      `Đã xếp lịch đồng bộ ${source}.`,
    );
  const bulkVisibility = (isHidden: boolean) =>
    mutate(
      "bulk",
      () =>
        adminFetch("movies/bulk/visibility", {
          method: "PATCH",
          body: JSON.stringify({ ids: selected, hidden: isHidden }),
        }),
      `Đã ${isHidden ? "ẩn" : "hiện"} ${selected.length} phim.`,
    ).then(() => setSelected([]));

  return (
    <div className="admin-fade-in space-y-6">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-[11px] font-semibold text-slate-400">
            NỘI DUNG / THƯ VIỆN
          </p>
          <h1 className="mt-2 text-[29px] font-bold tracking-[-.045em] text-slate-800">
            Thư viện phim thật
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Metadata, nguồn phát và trạng thái xuất bản trong PostgreSQL.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="admin-control px-3 text-[12px]"
          >
            <option value="kkphim">KKPhim</option>
            <option value="ophim">OPhim</option>
            <option value="nguonc">NguonC</option>
            <option value="vsmov">VSMov</option>
          </select>
          <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            Số trang
            <input
              type="number"
              min={1}
              max={50}
              value={syncPages}
              onChange={(event) =>
                setSyncPages(
                  Math.min(50, Math.max(1, Number(event.target.value) || 1)),
                )
              }
              className="admin-control w-16 px-2 text-center text-[12px]"
            />
          </label>
          <button
            onClick={sync}
            disabled={busy === "sync"}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--admin-brand)] px-3.5 text-[12px] font-semibold text-white disabled:opacity-60"
          >
            <RefreshCw
              size={15}
              className={busy === "sync" ? "animate-spin" : ""}
            />{" "}
            Đồng bộ nguồn
          </button>
        </div>
      </header>
      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-700">
          <span className="flex items-center gap-2">
            <Check size={15} />
            {notice}
          </span>
          <button onClick={() => setNotice("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700">
          {error}
        </div>
      )}

      <section className="admin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--admin-line)] p-5 lg:flex-row">
          <label className="relative min-w-0 flex-1">
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
              placeholder="Tìm tên phim hoặc tên gốc..."
            />
          </label>
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
            className="admin-control px-3 text-[12px]"
          >
            <option value="">Mọi định dạng</option>
            <option value="series">Phim bộ</option>
            <option value="single">Phim lẻ</option>
            <option value="hoathinh">Hoạt hình</option>
          </select>
          <select
            value={hidden}
            onChange={(event) => {
              setHidden(event.target.value);
              setPage(1);
            }}
            className="admin-control px-3 text-[12px]"
          >
            <option value="">Mọi trạng thái</option>
            <option value="false">Đang hiển thị</option>
            <option value="true">Đã ẩn</option>
          </select>
          {selected.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-blue-700">
                {selected.length} đã chọn
              </span>
              <button
                disabled={busy === "bulk"}
                onClick={() => void bulkVisibility(false)}
                className="admin-control px-3 text-[11px]"
              >
                Hiện
              </button>
              <button
                disabled={busy === "bulk"}
                onClick={() => void bulkVisibility(true)}
                className="admin-control px-3 text-[11px]"
              >
                Ẩn
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={
                      Boolean(data?.items.length) &&
                      data!.items.every((movie) => selected.includes(movie.id))
                    }
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? data?.items.map((movie) => movie.id) || []
                          : [],
                      )
                    }
                    aria-label="Chọn tất cả phim trang này"
                  />
                </th>
                <th className="px-5 py-3">Nội dung</th>
                <th className="px-4 py-3">Định dạng</th>
                <th className="px-4 py-3">Nguồn</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-line)]">
              {data?.items.map((movie) => (
                <tr key={movie.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(movie.id)}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? Array.from(new Set([...current, movie.id]))
                            : current.filter((id) => id !== movie.id),
                        )
                      }
                      aria-label={`Chọn ${movie.title}`}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-100">
                        {movie.posterUrl ? (
                          <Image
                            src={movie.posterUrl}
                            alt=""
                            width={36}
                            height={48}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Film size={15} className="text-slate-400" />
                        )}
                      </div>
                      <span className="min-w-0">
                        <strong className="block max-w-[300px] truncate text-[12px] text-slate-700">
                          {movie.title}
                        </strong>
                        <small className="block max-w-[300px] truncate text-[10px] text-slate-400">
                          {movie.originName || movie.id}{" "}
                          {movie.year ? `· ${movie.year}` : ""}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">
                    {movie.type}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {movie.sources.map((item) => (
                        <span
                          key={item}
                          className="rounded bg-blue-50 px-1.5 py-1 text-[9px] font-bold text-blue-700"
                        >
                          {item}
                        </span>
                      ))}
                      <span className="text-[9px] text-slate-400">
                        {movie._count?.playbackSources || 0} cấu hình
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px]">
                    <span
                      className={
                        movie.isHidden ? "text-slate-400" : "text-emerald-600"
                      }
                    >
                      {movie.isHidden ? "Đã ẩn" : "Đang hiển thị"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        disabled={busy === `open:${movie.id}`}
                        onClick={() => void openEditor(movie)}
                        className="admin-icon-button !h-8 !w-8"
                        title="Chỉnh sửa"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        disabled={busy === `hide:${movie.id}`}
                        onClick={() =>
                          void mutate(
                            `hide:${movie.id}`,
                            () =>
                              adminFetch(`movies/${movie.id}/hide`, {
                                method: "PATCH",
                              }),
                            movie.isHidden ? "Đã hiện phim." : "Đã ẩn phim.",
                          )
                        }
                        className="admin-icon-button !h-8 !w-8"
                        title={movie.isHidden ? "Hiện phim" : "Ẩn phim"}
                      >
                        {movie.isHidden ? (
                          <Eye size={14} />
                        ) : (
                          <EyeOff size={14} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data?.items.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-14 text-center text-[12px] text-slate-400"
                  >
                    Chưa có phim trong database. Hãy chạy đồng bộ nguồn.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex items-center justify-between border-t border-[var(--admin-line)] px-5 py-3 text-[11px] text-slate-400">
          <span>{data ? `${data.pagination.total} phim` : "Đang tải..."}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              className="admin-control px-3 disabled:opacity-40"
            >
              Trước
            </button>
            <span>
              {page}/{Math.max(1, data?.pagination.totalPages || 1)}
            </span>
            <button
              disabled={page >= (data?.pagination.totalPages || 1)}
              onClick={() => setPage((value) => value + 1)}
              className="admin-control px-3 disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </footer>
      </section>

      <section className="admin-card overflow-hidden">
        <div className="border-b border-[var(--admin-line)] px-5 py-4">
          <h2 className="text-[14px] font-bold text-slate-800">
            Lịch sử đồng bộ
          </h2>
        </div>
        <div className="divide-y divide-[var(--admin-line)]">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="grid gap-2 px-5 py-3 text-[11px] sm:grid-cols-[100px_120px_1fr_auto]"
            >
              <strong className="uppercase text-slate-700">{job.source}</strong>
              <span
                className={
                  job.status === "FAILED"
                    ? "text-rose-600"
                    : job.status === "COMPLETED"
                      ? "text-emerald-600"
                      : "text-blue-600"
                }
              >
                {syncStatusLabels[job.status] || job.status}
              </span>
              <span className="text-slate-400">
                Trang {job.currentPage}/{job.requestedPages} ·{" "}
                {job.processedCount} xử lý · {job.createdCount} mới ·{" "}
                {job.updatedCount} cập nhật · {job.failedCount} lỗi
              </span>
              <div className="flex items-center justify-end gap-2">
                <time className="text-slate-400">
                  {new Date(job.createdAt).toLocaleString("vi-VN")}
                </time>
                {job.status === "FAILED" && (
                  <button
                    type="button"
                    disabled={busy === `retry:${job.id}`}
                    onClick={() =>
                      void mutate(
                        `retry:${job.id}`,
                        () =>
                          adminFetch(`sync-jobs/${job.id}/retry`, {
                            method: "POST",
                          }),
                        `Đã chạy lại job ${job.source}.`,
                      )
                    }
                    className="admin-control px-2 text-[10px] font-semibold text-blue-600"
                  >
                    Thử lại {job.retryCount ? `(${job.retryCount})` : ""}
                  </button>
                )}
              </div>
              {job.errorMessage && (
                <p className="sm:col-span-4 text-rose-600">
                  {job.errorMessage}
                </p>
              )}
            </div>
          ))}
          {!jobs.length && (
            <p className="p-5 text-[11px] text-slate-400">
              Chưa có job đồng bộ.
            </p>
          )}
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-[var(--admin-line)] px-5 py-4">
              <h2 className="text-[15px] font-bold text-slate-800">
                Chỉnh sửa phim và nguồn
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="admin-icon-button"
              >
                <X size={17} />
              </button>
            </header>
            <div className="grid max-h-[72vh] gap-4 overflow-y-auto p-5 sm:grid-cols-2">
              <label className="block text-[11px] font-semibold text-slate-600">
                Tên phim
                <input
                  value={editing.title}
                  onChange={(event) =>
                    setEditing({ ...editing, title: event.target.value })
                  }
                  className="admin-control mt-1.5 w-full px-3"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Tên gốc
                <input
                  value={editing.originName || ""}
                  onChange={(event) =>
                    setEditing({ ...editing, originName: event.target.value })
                  }
                  className="admin-control mt-1.5 w-full px-3"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Năm
                <input
                  type="number"
                  value={editing.year || ""}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      year: Number(event.target.value) || undefined,
                    })
                  }
                  className="admin-control mt-1.5 w-full px-3"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Định dạng
                <select
                  value={editing.type}
                  onChange={(event) =>
                    setEditing({ ...editing, type: event.target.value })
                  }
                  className="admin-control mt-1.5 w-full px-3"
                >
                  <option value="single">Phim lẻ</option>
                  <option value="series">Phim bộ</option>
                  <option value="hoathinh">Hoạt hình</option>
                  <option value="tvshows">TV Show</option>
                </select>
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Chất lượng
                <input
                  value={editing.quality || ""}
                  onChange={(event) =>
                    setEditing({ ...editing, quality: event.target.value })
                  }
                  className="admin-control mt-1.5 w-full px-3"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Ngôn ngữ
                <input
                  value={editing.language || ""}
                  onChange={(event) =>
                    setEditing({ ...editing, language: event.target.value })
                  }
                  className="admin-control mt-1.5 w-full px-3"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600 sm:col-span-2">
                Poster HTTPS
                <input
                  value={editing.posterUrl || ""}
                  onChange={(event) =>
                    setEditing({ ...editing, posterUrl: event.target.value })
                  }
                  className="admin-control mt-1.5 w-full px-3"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600 sm:col-span-2">
                Trailer HTTPS
                <input
                  value={editing.trailerUrl || ""}
                  onChange={(event) =>
                    setEditing({ ...editing, trailerUrl: event.target.value })
                  }
                  className="admin-control mt-1.5 w-full px-3"
                />
              </label>
              {(
                [
                  ["Thể loại", "genres"],
                  ["Quốc gia", "countries"],
                  ["Diễn viên", "actors"],
                  ["Đạo diễn", "directors"],
                ] as const
              ).map(([label, field]) => (
                <label
                  key={field}
                  className="block text-[11px] font-semibold text-slate-600"
                >
                  {label} (phân cách bằng dấu phẩy)
                  <input
                    value={(editing[field] || []).join(", ")}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        [field]: Array.from(
                          new Set(
                            event.target.value
                              .split(",")
                              .map((item) => item.trim())
                              .filter(Boolean),
                          ),
                        ),
                      })
                    }
                    className="admin-control mt-1.5 w-full px-3"
                  />
                </label>
              ))}
              <label className="block text-[11px] font-semibold text-slate-600 sm:col-span-2">
                Mô tả
                <textarea
                  value={editing.description || ""}
                  onChange={(event) =>
                    setEditing({ ...editing, description: event.target.value })
                  }
                  className="mt-1.5 min-h-28 w-full rounded-lg border border-[var(--admin-line)] p-3 text-[12px]"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600 sm:col-span-2">
                Lịch phát hành (JSON)
                <textarea
                  value={scheduleJson}
                  onChange={(event) => setScheduleJson(event.target.value)}
                  placeholder={
                    '{"weekday":"Thứ 6","time":"20:00","timezone":"Asia/Ho_Chi_Minh"}'
                  }
                  className="mt-1.5 min-h-24 w-full rounded-lg border border-[var(--admin-line)] p-3 font-mono text-[11px]"
                />
              </label>

              <section className="space-y-3 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[12px] font-bold text-slate-700">
                      Tập phim, máy chủ và nguồn phát
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Quản lý đường phát, mốc intro, outro và quảng cáo theo
                      từng nguồn.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPlaybackSources((items) => [
                        ...items,
                        {
                          provider: "custom",
                          providerSlug: editing.id,
                          episodeKey: "full",
                          episodeName: "Tập Full",
                          serverName: "Server mới",
                          adCuePoints: [],
                          priority: items.length,
                        },
                      ])
                    }
                    className="admin-control inline-flex items-center gap-1.5 px-3 text-[11px] font-semibold"
                  >
                    <Plus size={14} /> Thêm nguồn
                  </button>
                </div>
                {playbackSources.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--admin-line)] px-4 py-8 text-center text-[12px] text-slate-400">
                    Chưa có nguồn phát có cấu trúc.
                  </div>
                ) : (
                  playbackSources.map((item, index) => (
                    <div
                      key={
                        item.id ||
                        `${item.provider}-${item.episodeKey}-${index}`
                      }
                      className="rounded-xl border border-[var(--admin-line)] bg-slate-50/60 p-3"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600">
                          Nguồn #{index + 1}
                          {item.healthStatus ? ` · ${item.healthStatus}` : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setPlaybackSources((items) =>
                              items.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            )
                          }
                          className="admin-icon-button text-rose-500"
                          aria-label={`Xóa nguồn ${index + 1}`}
                        >
                          <Trash size={15} />
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-4">
                        <select
                          value={item.provider}
                          onChange={(event) =>
                            setPlaybackSources((items) =>
                              items.map((sourceItem, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...sourceItem,
                                      provider: event.target.value,
                                    }
                                  : sourceItem,
                              ),
                            )
                          }
                          className="admin-control px-2 text-[11px]"
                        >
                          {[
                            "kkphim",
                            "ophim",
                            "nguonc",
                            "vsmov",
                            "vidsrc",
                            "custom",
                          ].map((provider) => (
                            <option key={provider} value={provider}>
                              {provider}
                            </option>
                          ))}
                        </select>
                        {[
                          ["providerSlug", "Slug nguồn"],
                          ["episodeKey", "Mã tập"],
                          ["episodeName", "Tên tập"],
                          ["serverName", "Tên server"],
                        ].map(([field, placeholder]) => (
                          <input
                            key={field}
                            value={String(
                              item[field as keyof PlaybackSource] || "",
                            )}
                            placeholder={placeholder}
                            onChange={(event) =>
                              setPlaybackSources((items) =>
                                items.map((sourceItem, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...sourceItem,
                                        [field]: event.target.value,
                                      }
                                    : sourceItem,
                                ),
                              )
                            }
                            className="admin-control px-2 text-[11px]"
                          />
                        ))}
                        <input
                          value={item.streamUrl || ""}
                          placeholder="URL stream HTTPS"
                          onChange={(event) =>
                            setPlaybackSources((items) =>
                              items.map((sourceItem, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...sourceItem,
                                      streamUrl: event.target.value,
                                    }
                                  : sourceItem,
                              ),
                            )
                          }
                          className="admin-control px-2 text-[11px] sm:col-span-3"
                        />
                        <input
                          type="number"
                          min={0}
                          max={999}
                          value={item.priority}
                          placeholder="Ưu tiên"
                          onChange={(event) =>
                            setPlaybackSources((items) =>
                              items.map((sourceItem, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...sourceItem,
                                      priority: Number(event.target.value) || 0,
                                    }
                                  : sourceItem,
                              ),
                            )
                          }
                          className="admin-control px-2 text-[11px]"
                        />
                        {[
                          ["introStart", "Intro từ (giây)"],
                          ["introEnd", "Intro đến (giây)"],
                          ["outroStart", "Outro từ (giây)"],
                        ].map(([field, placeholder]) => (
                          <input
                            key={field}
                            type="number"
                            min={0}
                            value={
                              (item[field as keyof PlaybackSource] as
                                number | undefined) ?? ""
                            }
                            placeholder={placeholder}
                            onChange={(event) =>
                              setPlaybackSources((items) =>
                                items.map((sourceItem, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...sourceItem,
                                        [field]: event.target.value
                                          ? Number(event.target.value)
                                          : undefined,
                                      }
                                    : sourceItem,
                                ),
                              )
                            }
                            className="admin-control px-2 text-[11px]"
                          />
                        ))}
                        <input
                          value={item.adCuePoints.join(", ")}
                          placeholder="Mốc quảng cáo: 600, 1200"
                          onChange={(event) =>
                            setPlaybackSources((items) =>
                              items.map((sourceItem, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...sourceItem,
                                      adCuePoints: Array.from(
                                        new Set(
                                          event.target.value
                                            .split(",")
                                            .map((value) =>
                                              Number(value.trim()),
                                            )
                                            .filter(
                                              (value) =>
                                                Number.isInteger(value) &&
                                                value >= 0,
                                            ),
                                        ),
                                      ),
                                    }
                                  : sourceItem,
                              ),
                            )
                          }
                          className="admin-control px-2 text-[11px]"
                        />
                      </div>
                    </div>
                  ))
                )}
              </section>
            </div>
            <footer className="flex justify-end gap-2 border-t border-[var(--admin-line)] px-5 py-4">
              <button
                onClick={() => setEditing(null)}
                className="admin-control px-4"
              >
                Hủy
              </button>
              <button
                onClick={() => void save()}
                disabled={busy.startsWith("edit:")}
                className="h-9 rounded-lg bg-[var(--admin-brand)] px-4 text-[12px] font-semibold text-white disabled:opacity-60"
              >
                Lưu thay đổi
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
