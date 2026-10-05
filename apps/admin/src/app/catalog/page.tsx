"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  IconArrowsJoin,
  IconCalendarClock,
  IconMovie,
  IconPlus,
  IconTrash,
  IconRefresh,
  IconPlayerPlay,
  IconServer,
  IconSubtitles,
  IconCheck,
  IconAlertCircle,
  IconToggleLeft,
  IconToggleRight,
  IconBolt,
  IconClock,
  IconFileText,
} from "@tabler/icons-react";
import { adminFetch } from "@/lib/admin-api";

type Duplicate = {
  key: string;
  confidence: string;
  items: Array<{
    id: string;
    title: string;
    year?: number;
    sources: string[];
    _count: { viewLogs: number };
  }>;
};

type Schedule = {
  id: string;
  name: string;
  source: string;
  cron: string;
  pages: number;
  enabled: boolean;
  nextRunAt: string;
  lastRunAt?: string | null;
  lastJobId?: string | null;
};

type SyncStats = {
  todayStats: {
    jobsCount: number;
    processedItems: number;
    createdItems: number;
    updatedItems: number;
  };
  activeSchedulesCount: number;
  recentJobs: Array<{
    id: string;
    source: string;
    status: string;
    createdCount: number;
    updatedCount: number;
    processedCount: number;
    startedAt: string;
    finishedAt?: string;
  }>;
};

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState<"sync" | "custom_source" | "duplicates">("sync");

  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null);

  // Form: Create Movie
  const [movie, setMovie] = useState({ id: "", title: "", type: "single" });

  // Form: Create Schedule
  const [scheduleForm, setScheduleForm] = useState({
    name: "Cập nhật KKPhim tự động",
    source: "kkphim",
    cron: "*/15 * * * *",
    pages: 3,
    enabled: true,
  });

  // Form: Custom Video Source & Subtitles
  const [customSource, setCustomSource] = useState({
    movieId: "",
    serverName: "Server FP",
    provider: "custom",
    episodeKey: "full",
    episodeName: "Full HD",
    streamUrl: "",
    subtitleUrl: "",
    subtitleLang: "vi",
    subtitleLabel: "Tiếng Việt (Vietsub chuẩn)",
    priority: 10,
  });

  const load = useCallback(async () => {
    try {
      const [duplicateItems, scheduleItems, statsData] = await Promise.all([
        adminFetch<Duplicate[]>("movies/duplicates"),
        adminFetch<Schedule[]>("sync/schedules"),
        adminFetch<SyncStats>("sync/stats"),
      ]);
      setDuplicates(Array.isArray(duplicateItems) ? duplicateItems : []);
      setSchedules(Array.isArray(scheduleItems) ? scheduleItems : []);
      setSyncStats(statsData || null);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runTask(task: () => Promise<unknown>, successText: string) {
    setLoading(true);
    try {
      await task();
      setMessage(successText);
      setError("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Thao tác thất bại");
    } finally {
      setLoading(false);
    }
  }

  function createMovie(event: FormEvent) {
    event.preventDefault();
    void runTask(
      () => adminFetch("movies", { method: "POST", body: JSON.stringify(movie) }),
      "Đã tạo phim thủ công thành công!",
    );
  }

  function handleCreateSchedule(event: FormEvent) {
    event.preventDefault();
    void runTask(
      () => adminFetch("sync/schedules", { method: "POST", body: JSON.stringify(scheduleForm) }),
      "Đã lưu lịch đồng bộ tự động mới!",
    );
  }

  async function handleToggleSchedule(id: string) {
    try {
      await adminFetch(`sync/schedules/${id}/toggle`, { method: "POST" });
      await load();
    } catch (err: any) {
      setError(err?.message || "Không thể đổi trạng thái lịch");
    }
  }

  async function handleRunScheduleNow(id: string, name: string) {
    setRunningScheduleId(id);
    setMessage(`Đang thực thi đồng bộ cho "${name}"...`);
    try {
      await adminFetch(`sync/schedules/${id}/run`, { method: "POST" });
      setMessage(`Đã hoàn tất đồng bộ tức thì cho "${name}"!`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi chạy đồng bộ");
    } finally {
      setRunningScheduleId(null);
    }
  }

  async function handleDeleteSchedule(id: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa lịch đồng bộ này?")) return;
    void runTask(
      () => adminFetch(`sync/schedules/${id}`, { method: "DELETE" }),
      "Đã xóa lịch đồng bộ!",
    );
  }

  async function handleSaveCustomSource(e: FormEvent) {
    e.preventDefault();
    if (!customSource.movieId.trim()) {
      setError("Vui lòng nhập Slug phim");
      return;
    }
    if (!customSource.streamUrl.trim()) {
      setError("Vui lòng nhập link video (.m3u8, .mp4, CDN...)");
      return;
    }

    const payload = {
      items: [
        {
          movieId: customSource.movieId.trim(),
          serverName: customSource.serverName.trim(),
          provider: "custom",
          providerSlug: "custom",
          episodeKey: customSource.episodeKey.trim() || "full",
          episodeName: customSource.episodeName.trim() || "Full HD",
          streamUrl: customSource.streamUrl.trim(),
          subtitleUrls: customSource.subtitleUrl.trim()
            ? [
                {
                  url: customSource.subtitleUrl.trim(),
                  lang: customSource.subtitleLang,
                  label: customSource.subtitleLabel,
                },
              ]
            : [],
          priority: Number(customSource.priority) || 10,
          healthStatus: "healthy",
        },
      ],
    };

    void runTask(
      () =>
        adminFetch(`movies/${encodeURIComponent(customSource.movieId.trim())}/playback-sources`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        }),
      `Đã thêm nguồn phát thủ công cho phim "${customSource.movieId}"!`,
    );
  }

  return (
    <div className="admin-fade-in space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            DỮ LIỆU & ĐỒNG BỘ PHIM
          </p>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
            Lịch Crawl Tự Động & Nguồn Video
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Hẹn giờ tự quét tập mới từ KKPhim/NguonC, thêm link video ngoài (.mp4/.m3u8/CDN) và gộp phim trùng.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-[var(--admin-line)]">
          <button
            type="button"
            onClick={() => setActiveTab("sync")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === "sync"
                ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <IconCalendarClock size={14} />
            Lịch Crawl Tự Động
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom_source")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === "custom_source"
                ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <IconServer size={14} />
            Thêm Nguồn Video Ngoài & Phụ Đề
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("duplicates")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === "duplicates"
                ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <IconArrowsJoin size={14} />
            Phim Trùng ({duplicates.length})
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
      {message && (
        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <IconCheck size={16} className="shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Tab 1: Sync Cronjob GUI */}
      {activeTab === "sync" && (
        <div className="space-y-6">
          {/* Today Stats */}
          {syncStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="admin-card p-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Tập Mới Hôm Nay
                </span>
                <p className="text-2xl font-black text-emerald-500 mt-1">
                  +{syncStats.todayStats.updatedItems.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-400">Đã tự động cập nhật</span>
              </div>
              <div className="admin-card p-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Phim Mới Thêm Hôm Nay
                </span>
                <p className="text-2xl font-black text-blue-500 mt-1">
                  +{syncStats.todayStats.createdItems.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-400">Nạp vào cơ sở dữ liệu</span>
              </div>
              <div className="admin-card p-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Lượt Quét Hôm Nay
                </span>
                <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                  {syncStats.todayStats.jobsCount}
                </p>
                <span className="text-[10px] text-slate-400">Phiên cronjob chạy</span>
              </div>
              <div className="admin-card p-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Lịch Đang Chạy
                </span>
                <p className="text-2xl font-black text-purple-500 mt-1">
                  {syncStats.activeSchedulesCount}
                </p>
                <span className="text-[10px] text-slate-400">Tự động kích hoạt</span>
              </div>
            </div>
          )}

          {/* Form & Running Schedules */}
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Create Schedule Form */}
            <form onSubmit={handleCreateSchedule} className="admin-card p-5 space-y-4 xl:col-span-1">
              <div className="flex items-center gap-2 text-blue-600">
                <IconCalendarClock size={18} />
                <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                  Thêm Lịch Crawl Tự Động
                </h2>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên lịch trình
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Quét tập mới KKPhim"
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                  className="admin-control w-full px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nguồn phim
                </label>
                <select
                  value={scheduleForm.source}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, source: e.target.value })}
                  className="admin-control w-full px-3 py-2 text-xs font-semibold"
                >
                  <option value="kkphim">KKPhim (API v1)</option>
                  <option value="nguonc">NguonC (Nguồn C)</option>
                  <option value="ophim">Ophim (Ổ Phim)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Chu kỳ quét tự động
                </label>
                <select
                  value={scheduleForm.cron}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, cron: e.target.value })}
                  className="admin-control w-full px-3 py-2 text-xs font-semibold"
                >
                  <option value="*/15 * * * *">Mỗi 15 phút (Khuyên dùng tập mới)</option>
                  <option value="*/30 * * * *">Mỗi 30 phút</option>
                  <option value="0 * * * *">Mỗi 1 giờ (Khuyên dùng phim mới)</option>
                  <option value="0 */6 * * *">Mỗi 6 giờ</option>
                  <option value="0 0 * * *">Mỗi ngày 1 lần (Nửa đêm)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Số trang quét mỗi lần (1 - 10 trang)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={scheduleForm.pages}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, pages: Number(e.target.value) })}
                  className="admin-control w-full px-3 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="admin-primary-button w-full py-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5"
              >
                <IconPlus size={15} />
                Lưu Lịch Đồng Bộ
              </button>
            </form>

            {/* Schedules List */}
            <div className="admin-card overflow-hidden xl:col-span-2">
              <div className="px-5 py-4 border-b border-[var(--admin-line)] flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                  Danh Sách Lịch Đang Chạy ({schedules.length})
                </h2>
                <button
                  type="button"
                  onClick={load}
                  className="admin-secondary-button inline-flex items-center gap-1 px-2.5 py-1 text-xs"
                >
                  <IconRefresh size={13} />
                  Làm mới
                </button>
              </div>

              {schedules.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Chưa có lịch crawl nào. Hãy thêm lịch ở form bên cạnh!
                </div>
              ) : (
                <div className="divide-y divide-[var(--admin-line)]">
                  {schedules.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-500/[0.02]"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-bold text-slate-800 dark:text-white">
                            {item.name}
                          </strong>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase bg-blue-500/10 text-blue-600 border border-blue-500/20">
                            {item.source}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.enabled
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                            }`}
                          >
                            {item.enabled ? "Đang Chạy" : "Tạm Dừng"}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400">
                          Quét {item.pages} trang • Lần tới:{" "}
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            {new Date(item.nextRunAt).toLocaleTimeString("vi-VN")}{" "}
                            {new Date(item.nextRunAt).toLocaleDateString("vi-VN")}
                          </span>
                          {item.lastRunAt && (
                            <span> • Lần trước: {new Date(item.lastRunAt).toLocaleTimeString("vi-VN")}</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleRunScheduleNow(item.id, item.name)}
                          disabled={runningScheduleId === item.id}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 transition-all inline-flex items-center gap-1.5"
                          title="Chạy đồng bộ tức thì"
                        >
                          <IconBolt size={14} className={runningScheduleId === item.id ? "animate-spin" : ""} />
                          Chạy ngay
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleSchedule(item.id)}
                          className="p-1.5 rounded-lg border border-[var(--admin-line)] hover:bg-slate-500/10 transition-colors"
                          title={item.enabled ? "Tạm dừng lịch" : "Kích hoạt lịch"}
                        >
                          {item.enabled ? (
                            <IconToggleRight size={20} className="text-emerald-500" />
                          ) : (
                            <IconToggleLeft size={20} className="text-slate-400" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(item.id)}
                          className="p-1.5 rounded-lg border border-[var(--admin-line)] hover:bg-rose-500/10 text-rose-500 transition-colors"
                          title="Xóa lịch"
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Custom Video Source & Subtitles */}
      {activeTab === "custom_source" && (
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Form: Add Custom Source */}
          <form onSubmit={handleSaveCustomSource} className="admin-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-purple-600">
              <IconServer size={18} />
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                Thêm Server Phim Thủ Công & Phụ Đề Rời
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Dành cho phim chiếu rạp, phim độc quyền, hoặc tải trực tiếp từ Cloudflare R2, BunnyCDN, Google Drive, Fshare.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Slug phim (ID phim trên web)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: lat-mat-7-mot-dieu-uoc"
                  value={customSource.movieId}
                  onChange={(e) => setCustomSource({ ...customSource, movieId: e.target.value })}
                  className="admin-control w-full px-3 py-2 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tên Server hiển thị
                  </label>
                  <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                    <IconBolt size={12} className="text-amber-500 fill-amber-500" />
                    Độc quyền FP
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  {[
                    { label: "⚡ Server FP (Độc quyền)", value: "Server FP" },
                    { label: "FlexPhim VIP", value: "FlexPhim VIP" },
                    { label: "VIP Server Direct #1", value: "VIP Server Direct #1" },
                  ].map((preset) => {
                    const isSelected = customSource.serverName === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setCustomSource({ ...customSource, serverName: preset.value })}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-amber-500/15 border-amber-500/50 text-amber-800 font-bold ring-1 ring-amber-500/30"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Server FP"
                  value={customSource.serverName}
                  onChange={(e) => setCustomSource({ ...customSource, serverName: e.target.value })}
                  className="admin-control w-full px-3 py-2 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mã tập (Episode Key)
                </label>
                <input
                  type="text"
                  required
                  placeholder="full, tap-1, tap-2..."
                  value={customSource.episodeKey}
                  onChange={(e) => setCustomSource({ ...customSource, episodeKey: e.target.value })}
                  className="admin-control w-full px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên tập hiển thị
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Full HD hoặc Tập 01"
                  value={customSource.episodeName}
                  onChange={(e) => setCustomSource({ ...customSource, episodeName: e.target.value })}
                  className="admin-control w-full px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Link Video Trực Tiếp (.m3u8, .mp4, HLS Stream, CDN URL, Embed)
              </label>
              <input
                type="url"
                required
                placeholder="https://cdn.example.com/movies/lat-mat-7.m3u8 hoặc .mp4"
                value={customSource.streamUrl}
                onChange={(e) => setCustomSource({ ...customSource, streamUrl: e.target.value })}
                className="admin-control w-full px-3 py-2 text-xs font-mono"
              />
            </div>

            {/* Subtitle Section */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[var(--admin-line)] space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <IconSubtitles size={15} />
                Phụ Đề Rời (.vtt / .srt) / Thuyết Minh
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Link file phụ đề (.vtt hoặc .srt)
                </label>
                <input
                  type="url"
                  placeholder="https://cdn.example.com/subs/lat-mat-7-vi.vtt"
                  value={customSource.subtitleUrl}
                  onChange={(e) => setCustomSource({ ...customSource, subtitleUrl: e.target.value })}
                  className="admin-control w-full px-3 py-2 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Nhãn hiển thị
                  </label>
                  <input
                    type="text"
                    value={customSource.subtitleLabel}
                    onChange={(e) => setCustomSource({ ...customSource, subtitleLabel: e.target.value })}
                    className="admin-control w-full px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Ngôn ngữ
                  </label>
                  <select
                    value={customSource.subtitleLang}
                    onChange={(e) => setCustomSource({ ...customSource, subtitleLang: e.target.value })}
                    className="admin-control w-full px-3 py-2 text-xs"
                  >
                    <option value="vi">Tiếng Việt (Vietsub)</option>
                    <option value="en">English (Engsub)</option>
                    <option value="tm">Lồng tiếng / Thuyết minh</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="admin-primary-button w-full py-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <IconServer size={15} />
              Lưu Nguồn Phát Thủ Công
            </button>
          </form>

          {/* Quick manual movie creation */}
          <form onSubmit={createMovie} className="admin-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <IconMovie size={18} />
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                Tạo Bản Ghi Phim Mới (Thủ công)
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Tạo bản ghi thông tin phim mới nếu phim chưa có sẵn trong danh mục trước khi gắn nguồn phát.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Slug phim (Mã định danh)
                </label>
                <input
                  type="text"
                  required
                  placeholder="lat-mat-7"
                  value={movie.id}
                  onChange={(e) => setMovie({ ...movie, id: e.target.value })}
                  className="admin-control w-full px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên phim tiếng Việt
                </label>
                <input
                  type="text"
                  required
                  placeholder="Lật Mặt 7: Một Điều Ước"
                  value={movie.title}
                  onChange={(e) => setMovie({ ...movie, title: e.target.value })}
                  className="admin-control w-full px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Loại phim
              </label>
              <select
                className="admin-control w-full px-3 py-2 text-xs font-semibold"
                value={movie.type}
                onChange={(e) => setMovie({ ...movie, type: e.target.value })}
              >
                <option value="single">Phim lẻ / Chiếu rạp</option>
                <option value="series">Phim bộ</option>
                <option value="hoathinh">Hoạt hình / Anime</option>
                <option value="tvshows">TV Shows / Chương trình</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="admin-primary-button w-full py-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <IconPlus size={15} />
              Tạo Phim Mới
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Duplicates Management */}
      {activeTab === "duplicates" && (
        <div className="space-y-6">
          <section className="admin-card overflow-hidden">
            <div className="border-b border-[var(--admin-line)] px-5 py-4">
              <div className="flex items-center gap-2 text-blue-600">
                <IconArrowsJoin size={18} />
                <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                  Nhóm Phim Trùng Khớp ({duplicates.length})
                </h2>
              </div>
            </div>

            {duplicates.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Không phát hiện bản ghi phim trùng nào trong cơ sở dữ liệu.
              </div>
            ) : (
              <div className="divide-y divide-[var(--admin-line)]">
                {duplicates.map((group) => (
                  <div key={group.key} className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-bold text-slate-800 dark:text-white">
                        {group.items[0]?.title} ({group.items[0]?.year || "?"})
                      </strong>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        Độ tin cậy {group.confidence}
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((item, index) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-[var(--admin-line)] p-3 bg-slate-50/50 dark:bg-slate-800/30"
                        >
                          <strong className="block truncate text-xs text-slate-800 dark:text-white">
                            {index === 0 ? "Giữ lại: " : "Gộp vào: "}
                            <span className="font-mono text-blue-600">{item.id}</span>
                          </strong>
                          <span className="text-[10px] text-slate-400">
                            {item.sources.join(", ") || "không nguồn"} / {item._count.viewLogs} lượt xem
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            `Gộp ${group.items.length - 1} bản ghi vào ${group.items[0].id}?`,
                          )
                        ) {
                          void runTask(
                            () =>
                              adminFetch("movies/duplicates/merge", {
                                method: "POST",
                                body: JSON.stringify({
                                  canonicalId: group.items[0].id,
                                  sourceIds: group.items.slice(1).map((item) => item.id),
                                }),
                              }),
                            "Đã gộp phim trùng thành công!",
                          );
                        }
                      }}
                      className="admin-primary-button inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold"
                    >
                      <IconArrowsJoin size={14} /> Gộp vào bản ghi đầu
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
