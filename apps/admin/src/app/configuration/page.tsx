"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconSpeakerphone,
  IconRefresh,
  IconRestore,
  IconDeviceFloppy,
  IconAdjustmentsHorizontal,
  IconAlertTriangle,
  IconExternalLink,
  IconX,
  IconCheck,
  IconChevronUp,
  IconChevronDown,
  IconGripVertical,
  IconPlayerPlay,
  IconCode,
  IconHistory,
  IconCopy,
  IconBrandGoogle,
  IconLayoutDashboard,
  IconSparkles,
  IconInfoCircle,
} from "@tabler/icons-react";
import { adminFetch } from "@/lib/admin-api";
import { configurationUpdatePayload } from "@/lib/configuration-payload";
import { HeroBannerStudio } from "@/components/HeroBannerStudio";

type Configuration = {
  maintenanceMode: boolean;
  maintenanceNotice: string | null;
  announcementText: string | null;
  announcementLink: string | null;
  homePopupEnabled: boolean;
  homePopupTitle: string | null;
  homePopupBody: string | null;
  homePopupLink: string | null;
  homePopupLinkLabel: string | null;
  homePopupDismissLabel: string | null;
  homePopupVersion: number;
  heroMovieSlugs: string[];
  providerPriority: string[];
  autoSkipIntro: boolean;
  watchPartyEnabled: boolean;
  homeTop10Slugs: string[];
  homeSectionOrder: string[];
  homeHiddenSections: string[];
  homeFeaturedRows?: Record<string, unknown> | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  cacheVersion?: number;
  updatedAt?: string;
};

type ConfigurationRevision = {
  id: string;
  snapshot: Configuration;
  changedBy: string;
  createdAt: string;
};

const ALL_PROVIDERS = [
  { id: "kkphim", name: "KKPhim (Hà Nội VIP)", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  { id: "ophim", name: "OPhim (Sài Gòn VIP)", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  { id: "nguonc", name: "NguonC (CDN Edge)", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  { id: "vsmov", name: "Vsmov (Dự phòng quốc tế)", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
];

const AVAILABLE_SECTIONS = [
  "top10",
  "continue",
  "schedule",
  "latest",
  "vfx",
  "usuk-series",
  "action",
  "scifi",
  "horror",
  "historical",
  "theatrical",
];

export default function ConfigurationPage() {
  const [config, setConfig] = useState<Configuration | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [revisions, setRevisions] = useState<ConfigurationRevision[]>([]);
  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isDirty = useMemo(() => {
    if (!config || !savedSnapshot) return false;
    return JSON.stringify(config) !== savedSnapshot;
  }, [config, savedSnapshot]);

  const load = useCallback(async () => {
    try {
      const [current, history] = await Promise.all([
        adminFetch<Configuration>("configuration"),
        adminFetch<ConfigurationRevision[]>("configuration/revisions?limit=20"),
      ]);
      setConfig(current);
      setSavedSnapshot(JSON.stringify(current));
      setRevisions(history);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được cấu hình hệ thống");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const showNotification = (msg: string) => {
    setNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(""), 5000);
  };

  const save = useCallback(async () => {
    if (!config || saving) return;
    setSaving(true);
    try {
      const updated = await adminFetch<Configuration>("configuration", {
        method: "PATCH",
        body: JSON.stringify(configurationUpdatePayload(config)),
      });
      setConfig(updated);
      setSavedSnapshot(JSON.stringify(updated));
      showNotification("Đã lưu và áp dụng cấu hình vận hành thành công.");
      setRevisions(await adminFetch<ConfigurationRevision[]>("configuration/revisions?limit=20"));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được cấu hình");
    } finally {
      setSaving(false);
    }
  }, [config, saving]);

  // Global Ctrl+S shortcut to save configuration instantly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [save]);

  const restore = async (revision: ConfigurationRevision) => {
    const timeFormatted = new Date(revision.createdAt).toLocaleString("vi-VN");
    if (!window.confirm(`Bạn có chắc muốn khôi phục lại cấu hình lúc ${timeFormatted}?`)) {
      return;
    }
    setSaving(true);
    try {
      const restored = await adminFetch<Configuration>(
        `configuration/revisions/${revision.id}/restore`,
        { method: "POST" },
      );
      setConfig(restored);
      setSavedSnapshot(JSON.stringify(restored));
      showNotification(`Đã khôi phục thành công phiên bản ${timeFormatted}.`);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể khôi phục cấu hình");
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    if (!savedSnapshot) return;
    try {
      setConfig(JSON.parse(savedSnapshot));
      showNotification("Đã hoàn tác các thay đổi chưa lưu.");
    } catch {}
  };

  const update = <K extends keyof Configuration>(key: K, value: Configuration[K]) =>
    setConfig((current) => (current ? { ...current, [key]: value } : current));

  // Provider Priority Reordering Helpers
  const moveProvider = (index: number, direction: "up" | "down") => {
    if (!config) return;
    const currentList = [...config.providerPriority];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;
    const temp = currentList[index];
    currentList[index] = currentList[targetIndex];
    currentList[targetIndex] = temp;
    update("providerPriority", currentList);
  };

  const toggleProvider = (id: string) => {
    if (!config) return;
    const current = config.providerPriority;
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    update("providerPriority", next);
  };

  if (!config) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-[#0d121c] p-8 text-center text-slate-400 shadow-xl">
        <IconRefresh size={32} className="animate-spin text-blue-500" />
        <p className="text-sm font-medium">{error || "Đang tải dữ liệu cấu hình vận hành..."}</p>
      </div>
    );
  }

  return (
    <div className="admin-fade-in relative space-y-6 pb-24">
      {/* ── Page Header ────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-400">
            <span>HỆ THỐNG</span>
            <span>/</span>
            <span className="text-blue-400">CẤU HÌNH VẬN HÀNH</span>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-blue-400 border border-blue-500/20">
              Paces Theme Standard
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            Điều khiển nội dung toàn site
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Cấu hình bảo trì, ưu tiên nguồn phát, popup thông báo, bố cục trang chủ và SEO toàn diện.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void load()}
            className="flex h-9 items-center gap-2 rounded-xl border border-slate-800 bg-[#121722] px-3.5 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:bg-[#181f2e] hover:text-white transition-all shadow-sm"
            title="Tải lại từ máy chủ"
          >
            <IconRefresh size={15} />
            <span>Tải lại</span>
          </button>

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className={`flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-bold text-white transition-all shadow-lg ${
              isDirty
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-blue-500/25 ring-2 ring-blue-500/40"
                : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20"
            }`}
          >
            {saving ? (
              <IconRefresh size={16} className="animate-spin" />
            ) : (
              <IconDeviceFloppy size={16} />
            )}
            <span>{saving ? "Đang lưu..." : "Lưu cấu hình"}</span>
            <kbd className="hidden rounded bg-black/25 px-1.5 py-0.5 text-[9px] font-mono sm:inline-block">
              Ctrl+S
            </kbd>
          </button>
        </div>
      </header>

      {/* ── Status Alerts ─────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs font-medium text-rose-300 shadow-lg shadow-rose-950/20">
          <IconAlertTriangle size={18} className="shrink-0 text-rose-400" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-rose-400 hover:text-white"
          >
            <IconX size={16} />
          </button>
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs font-medium text-emerald-300 shadow-lg shadow-emerald-950/20">
          <IconCheck size={18} className="shrink-0 text-emerald-400" />
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="text-emerald-400 hover:text-white"
          >
            <IconX size={16} />
          </button>
        </div>
      )}

      {/* ── Section 1: Home Announcement Popup ──────────────────── */}
      <section className="rounded-2xl border border-slate-800/80 bg-[#0d121c] shadow-xl overflow-hidden backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 bg-slate-900/40 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-400">
              <IconSpeakerphone size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100">Thông báo nổi tại trang chủ</h2>
                <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[9px] font-bold text-violet-300">
                  Home Popup Modal
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Hiển thị bản tin quan trọng dạng modal sang trọng khi khách truy cập vào trang chủ.
              </p>
            </div>
          </div>

          <ModernToggle
            label="Kích hoạt popup trang chủ"
            checked={config.homePopupEnabled}
            onChange={(val) => update("homePopupEnabled", val)}
          />
        </div>

        <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <div className="grid content-start gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField
                label="Tiêu đề thông báo"
                value={config.homePopupTitle || ""}
                onChange={(val) => update("homePopupTitle", val)}
                placeholder="VD: Chào mừng bạn đến với FlexPhim Control Room"
                maxLength={180}
              />
            </div>

            <div className="sm:col-span-2">
              <FormField
                label="Nội dung chi tiết"
                detail="Xuống dòng 2 lần để tách đoạn văn mới"
                value={config.homePopupBody || ""}
                onChange={(val) => update("homePopupBody", val)}
                placeholder={"Viết nội dung muốn gửi tới người xem.\nXuống dòng để tách thành đoạn mới."}
                multiline
                rows={4}
                maxLength={4000}
              />
            </div>

            <FormField
              label="Nhãn liên kết (Action Link Text)"
              value={config.homePopupLinkLabel || ""}
              onChange={(val) => update("homePopupLinkLabel", val)}
              placeholder="VD: Xem chi tiết"
              maxLength={80}
            />

            <FormField
              label="Nhãn nút đóng (Dismiss Label)"
              value={config.homePopupDismissLabel || ""}
              onChange={(val) => update("homePopupDismissLabel", val)}
              placeholder="VD: Đã hiểu"
              maxLength={80}
            />

            <div className="sm:col-span-2">
              <FormField
                label="Liên kết đính kèm (URL)"
                detail="Không bắt buộc — mở khi bấm vào nút xem chi tiết"
                value={config.homePopupLink || ""}
                onChange={(val) => update("homePopupLink", val)}
                placeholder="https://... hoặc /duong-dan-noi-bo"
                maxLength={2048}
              />
            </div>
          </div>

          <div className="flex flex-col">
            <AnnouncementPreview config={config} />
          </div>
        </div>
      </section>

      {/* ── Section 2: Maintenance & Playback Controls ─────────── */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Card: Thông báo & Bảo trì */}
        <section className="rounded-2xl border border-slate-800/80 bg-[#0d121c] shadow-xl overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 border-b border-slate-800/80 bg-slate-900/40 px-5 py-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
              <IconAlertTriangle size={20} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Thông báo và chế độ bảo trì</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Kiểm soát khóa truy cập bảo trì khẩn cấp và dòng tin broadcast toàn trang.
              </p>
            </div>
          </div>

          <div className="p-5 space-y-5 flex-1">
            {/* Maintenance Guard Card */}
            <div
              className={`rounded-2xl border p-4.5 transition-all ${
                config.maintenanceMode
                  ? "border-rose-500/50 bg-rose-950/20 shadow-lg shadow-rose-950/30"
                  : "border-slate-800 bg-[#090d16]"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-bold text-slate-100">
                      Chế độ bảo trì toàn bộ website (Full Site Shutdown)
                    </strong>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                        config.maintenanceMode
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {config.maintenanceMode ? "ĐANG BẬT" : "TẮT"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                    Khi BẬT, toàn bộ website sẽ tạm khóa và hiển thị màn hình bảo trì toàn phần cho
                    tất cả khách xem phim. Chỉ tài khoản Quản trị viên (Admin) mới có quyền truy cập.
                  </p>
                </div>
                <ModernToggle
                  label="Bảo trì"
                  checked={config.maintenanceMode}
                  onChange={(val) => update("maintenanceMode", val)}
                  danger
                />
              </div>

              {config.maintenanceMode && (
                <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-900/30 p-3 text-xs text-rose-300 flex items-start gap-3">
                  <span className="relative flex h-3 w-3 shrink-0 mt-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                  </span>
                  <div className="text-[11px] leading-relaxed">
                    <strong className="block text-rose-200 font-bold mb-0.5">
                      CẢNH BÁO: Website đang ở chế độ bảo trì toàn phần
                    </strong>
                    Toàn bộ khách truy cập sẽ thấy màn hình thông báo bảo trì và không thể xem phim.
                    Hãy bấm nút <strong>&quot;Lưu cấu hình&quot;</strong> để đồng bộ.
                  </div>
                </div>
              )}

              <div className="mt-4">
                <FormField
                  label="Nội dung thông báo bảo trì (hiển thị trên màn hình khóa)"
                  value={config.maintenanceNotice || ""}
                  onChange={(val) => update("maintenanceNotice", val)}
                  placeholder="Để trống để hiển thị thông báo mặc định của FlexPhim..."
                  multiline
                  rows={2}
                />
              </div>
            </div>

            <FormField
              label="Dòng tin nhắn toàn site (Announcement Marquee)"
              detail="Hiển thị dải tin trên thanh header trang web"
              value={config.announcementText || ""}
              onChange={(val) => update("announcementText", val)}
              placeholder="VD: Chúc mừng năm mới! Cập nhật máy chủ phát video 4K siêu mượt..."
            />

            <FormField
              label="Liên kết dòng tin nhắn"
              value={config.announcementLink || ""}
              onChange={(val) => update("announcementLink", val)}
              placeholder="https://... hoặc /the-loai/han-quoc"
            />
          </div>
        </section>

        {/* Card: Player & Ưu tiên nguồn phát */}
        <section className="rounded-2xl border border-slate-800/80 bg-[#0d121c] shadow-xl overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 border-b border-slate-800/80 bg-slate-900/40 px-5 py-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <IconPlayerPlay size={20} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Player và ưu tiên nguồn phát</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Điều phối chuỗi fallback phát video & tính năng phòng xem chung.
              </p>
            </div>
          </div>

          <div className="p-5 space-y-5 flex-1">
            {/* Watch Party Toggle Card */}
            <div className="rounded-2xl border border-slate-800 bg-[#090d16] p-4 flex items-center justify-between gap-4">
              <div>
                <strong className="block text-xs font-bold text-slate-200">
                  Cho phép tính năng Watch Party (Phòng xem chung)
                </strong>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Bật để người dùng có thể tạo phòng xem phim cùng nhau với chat thời gian thực.
                </p>
              </div>
              <ModernToggle
                label="Watch Party"
                checked={config.watchPartyEnabled}
                onChange={(val) => update("watchPartyEnabled", val)}
              />
            </div>

            {/* Provider Priority Ordered Stack */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Thứ tự ưu tiên nguồn phát (Stream Fallback Chain)
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Sử dụng các nút mũi tên để thay đổi thứ tự ưu tiên khi player tải phim.
                  </p>
                </div>
                <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[9px] font-mono text-blue-400">
                  {config.providerPriority.length} nguồn kích hoạt
                </span>
              </div>

              {/* Providers List Cards (Sleek Dark Paces Design - No Stark White Buttons!) */}
              <div className="space-y-2 mt-2">
                {config.providerPriority.map((providerId, index) => {
                  const meta =
                    ALL_PROVIDERS.find((p) => p.id === providerId) || {
                      id: providerId,
                      name: providerId,
                      color: "text-slate-300 bg-slate-800 border-slate-700",
                    };
                  const isFirst = index === 0;
                  const isLast = index === config.providerPriority.length - 1;

                  return (
                    <div
                      key={providerId}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#080c14] hover:bg-[#0c121e] hover:border-slate-700 p-3 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="cursor-grab text-slate-600 group-hover:text-slate-400">
                          <IconGripVertical size={16} />
                        </span>

                        <span
                          className={`grid h-6 w-6 place-items-center rounded-lg text-[10px] font-black ${
                            index === 0
                              ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          #{index + 1}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-xs font-bold text-slate-100 uppercase">
                              {meta.name}
                            </strong>
                            {index === 0 && (
                              <span className="rounded-md bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                                Ưu tiên chính (Primary)
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            ID: {providerId}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => moveProvider(index, "up")}
                          disabled={isFirst}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-900 transition-colors"
                          title="Tăng độ ưu tiên (Lên trước)"
                        >
                          <IconChevronUp size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => moveProvider(index, "down")}
                          disabled={isLast}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-900 transition-colors"
                          title="Giảm độ ưu tiên (Xuống sau)"
                        >
                          <IconChevronDown size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleProvider(providerId)}
                          className="ml-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 px-2 py-1 rounded-lg hover:bg-rose-500/10"
                          title="Tạm tắt nguồn này"
                        >
                          Tắt
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Available unassigned providers */}
                {ALL_PROVIDERS.filter((p) => !config.providerPriority.includes(p.id)).length > 0 && (
                  <div className="pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Nguồn chưa kích hoạt (Bấm để thêm vào chuỗi fallback):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ALL_PROVIDERS.filter((p) => !config.providerPriority.includes(p.id)).map(
                        (prov) => (
                          <button
                            key={prov.id}
                            type="button"
                            onClick={() => toggleProvider(prov.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:border-blue-500 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
                          >
                            <span>+ Thêm {prov.name}</span>
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Simulation Note */}
              <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-950/20 p-3 text-[11px] text-blue-300">
                <IconInfoCircle size={15} className="shrink-0 mt-0.5 text-blue-400" />
                <p className="leading-relaxed">
                  Khi người xem bắt đầu phát video, hệ thống ArtPlayer sẽ nạp nguồn theo thứ tự từ
                  trên xuống dưới (<strong>#1 &rarr; #2 &rarr; #3 &rarr; #4</strong>). Nếu nguồn đầu
                  tiên buffer &gt; 4s hoặc lỗi luồng m3u8, player sẽ tự động tráo nguồn mượt mà.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Section 3: Hero Banner Studio Component ──────────── */}
      <HeroBannerStudio
        heroMovieSlugs={config.heroMovieSlugs}
        onChange={(slugs) => update("heroMovieSlugs", slugs)}
      />

      {/* ── Section 4: Home Layout, Sections & SEO ───────────── */}
      <section className="rounded-2xl border border-slate-800/80 bg-[#0d121c] shadow-xl overflow-hidden backdrop-blur-md">
        <div className="flex items-center gap-3 border-b border-slate-800/80 bg-slate-900/40 px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <IconLayoutDashboard size={20} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">Bố cục và nội dung trang chủ</h2>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                Layout & SEO Engine
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Điều khiển thứ tự các section phim, ghim Top 10 thịnh hành, hàng nội dung mở rộng và SEO Google.
            </p>
          </div>
        </div>

        <div className="p-5 grid gap-6 lg:grid-cols-2">
          {/* Top 10 Pinned Slugs */}
          <CodeListField
            label="Top 10 được ghim"
            badge="Tối đa 10 slug"
            detail="Mỗi dòng một slug phim. Các vị trí thiếu được hệ thống tự động bổ sung dựa trên lượt xem cao nhất."
            value={config.homeTop10Slugs}
            limit={10}
            onChange={(val) => update("homeTop10Slugs", val)}
            placeholder={"oppenheimer\ndune-hanh-tinh-cat-2\navatar-2-dong-chay-cua-nuoc"}
          />

          {/* Section Order */}
          <div>
            <CodeListField
              label="Thứ tự hiển thị Section"
              badge={`${config.homeSectionOrder.length} hàng`}
              detail="Thứ tự xuất hiện từ trên xuống dưới trên trang chủ FlexPhim."
              value={config.homeSectionOrder}
              limit={30}
              onChange={(val) => update("homeSectionOrder", val)}
              placeholder={"top10\ncontinue\nschedule\nlatest\nvfx\naction"}
            />
            {/* Quick Preset Badges */}
            <div className="mt-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Các ID section hợp lệ (Bấm để chèn nhanh):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_SECTIONS.map((sec) => {
                  const isPresent = config.homeSectionOrder.includes(sec);
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        if (!isPresent) {
                          update("homeSectionOrder", [...config.homeSectionOrder, sec]);
                        }
                      }}
                      className={`rounded-lg border px-2 py-0.5 text-[10px] font-mono transition-colors ${
                        isPresent
                          ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                          : "border-slate-800 bg-[#080c14] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      {sec} {isPresent && "✓"}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Hidden Sections */}
          <CodeListField
            label="Ẩn section khỏi trang chủ"
            badge={`${config.homeHiddenSections.length} section bị ẩn`}
            detail="Mỗi dòng một ID section cần tạm thời ẩn mà không cần xóa khỏi danh sách cấu hình."
            value={config.homeHiddenSections}
            limit={30}
            onChange={(val) => update("homeHiddenSections", val)}
            placeholder="VD: theatrical"
          />

          {/* Custom JSON Content Rows */}
          <JsonEditorField
            label="Hàng nội dung tùy chỉnh (Custom Featured Rows)"
            detail="Cấu hình JSON cho các hàng phim bộ sưu tập hoặc tuyển tập đặc biệt."
            value={config.homeFeaturedRows || {}}
            onChange={(val) => update("homeFeaturedRows", val)}
          />

          {/* SEO Title with Live Google Snippet Preview */}
          <div className="lg:col-span-2 space-y-4 pt-3 border-t border-slate-800/80">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <FormField
                  label="SEO Title trang chủ"
                  detail={`${(config.seoTitle || "").length} / 180 ký tự`}
                  value={config.seoTitle || ""}
                  onChange={(val) => update("seoTitle", val)}
                  placeholder="FlexPhim - Xem phim trực tuyến đa nguồn chất lượng cao"
                  maxLength={180}
                />

                <FormField
                  label="SEO Meta Description"
                  detail={`${(config.seoDescription || "").length} / 500 ký tự`}
                  value={config.seoDescription || ""}
                  onChange={(val) => update("seoDescription", val)}
                  placeholder="Kho phim trực tuyến đa nguồn tốc độ cao, cập nhật liên tục các bộ phim mới nhất, chuẩn 4K HDR và phụ đề song ngữ AI."
                  multiline
                  rows={3}
                  maxLength={500}
                />
              </div>

              {/* Google Search Snippet Preview */}
              <div className="flex flex-col justify-center rounded-2xl border border-slate-800 bg-[#070a10] p-4.5 shadow-inner">
                <div className="flex items-center gap-2 mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <IconBrandGoogle size={14} className="text-blue-400" />
                  <span>Xem trước kết quả tìm kiếm Google (SERP Preview)</span>
                </div>

                <div className="rounded-xl border border-slate-800/70 bg-[#0c1018] p-4 space-y-1">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-blue-600 text-[8px] font-black text-white">
                      F
                    </span>
                    <span className="truncate">https://flexphim.top</span>
                    <span className="text-slate-600">&rsaquo; home</span>
                  </div>

                  <h4 className="text-[14px] font-semibold text-blue-400 hover:underline cursor-pointer truncate">
                    {config.seoTitle || "FlexPhim - Xem phim trực tuyến"}
                  </h4>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {config.seoDescription ||
                      "Kho phim trực tuyến đa nguồn, cập nhật liên tục với độ phân giải cao và phụ đề song ngữ."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Configuration Revisions History ────────── */}
      <section className="rounded-2xl border border-slate-800/80 bg-[#0d121c] shadow-xl overflow-hidden backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/40 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <IconHistory size={20} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Lịch sử phiên bản cấu hình</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Tự động lưu snapshot mỗi lần áp dụng. Khôi phục lại trạng thái cũ chỉ với một cú nhấp chuột.
              </p>
            </div>
          </div>

          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-mono text-slate-400">
            {revisions.length} bản lưu trữ
          </span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {revisions.map((rev) => {
            const dateStr = new Date(rev.createdAt).toLocaleString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            return (
              <div
                key={rev.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-900/40 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-[11px] font-black text-slate-300">
                    {rev.changedBy.slice(0, 2).toUpperCase() || "AD"}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-semibold text-slate-200">
                        {rev.changedBy}
                      </strong>
                      <time className="text-[10px] font-mono text-slate-400">{dateStr}</time>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400">
                      <span
                        className={`rounded px-1.5 py-0.2 font-bold ${
                          rev.snapshot.maintenanceMode
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {rev.snapshot.maintenanceMode ? "Đang bảo trì" : "Hoạt động bình thường"}
                      </span>
                      <span>·</span>
                      <span>{rev.snapshot.heroMovieSlugs?.length || 0} phim hero</span>
                      <span>·</span>
                      <span>{rev.snapshot.providerPriority?.length || 0} nguồn phát</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void restore(rev)}
                  disabled={saving}
                  className="flex h-8 items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 px-3 text-xs font-semibold text-slate-200 hover:border-blue-500/50 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                >
                  <IconRestore size={14} />
                  <span>Khôi phục</span>
                </button>
              </div>
            );
          })}

          {!revisions.length && (
            <div className="p-8 text-center text-xs text-slate-400">
              Chưa có phiên bản lịch sử nào được ghi nhận.
            </div>
          )}
        </div>
      </section>

      {/* ── Sticky Action Floating Bar ────────────────────────── */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-2xl border border-blue-500/40 bg-[#0d121c]/95 px-5 py-3 shadow-2xl backdrop-blur-xl ring-4 ring-black/40 animate-bounce-subtle">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
            <span className="text-xs font-bold text-slate-200">
              Bạn có thay đổi chưa lưu
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetChanges}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Hoàn tác
            </button>

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/30 transition-all"
            >
              {saving ? (
                <IconRefresh size={14} className="animate-spin" />
              ) : (
                <IconDeviceFloppy size={14} />
              )}
              <span>Lưu ngay</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Supporting Subcomponents (Paces Design System) ─────────────────

function ModernToggle({
  label,
  checked,
  onChange,
  danger = false,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  danger?: boolean;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 hidden sm:inline">
        {checked ? "Bật" : "Tắt"}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
        aria-label={label}
      />
      <div
        className={`relative h-6 w-11 rounded-full border transition-all ${
          checked
            ? danger
              ? "border-rose-500 bg-rose-600 shadow-md shadow-rose-600/30"
              : "border-blue-500 bg-blue-600 shadow-md shadow-blue-600/30"
            : "border-slate-700 bg-slate-800"
        }`}
      >
        <span
          className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-[21px]" : "translate-x-0.5"
          }`}
        />
      </div>
    </label>
  );
}

function FormField({
  label,
  detail,
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 3,
  maxLength,
}: {
  label: string;
  detail?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
          {label}
        </span>
        {detail && <span className="text-[10px] text-slate-400 font-mono">{detail}</span>}
      </div>

      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          className="admin-custom-scroll w-full rounded-xl border border-slate-800 bg-[#080c14] px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-colors leading-relaxed resize-y"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="h-10 w-full rounded-xl border border-slate-800 bg-[#080c14] px-3.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-colors"
        />
      )}
    </label>
  );
}

function CodeListField({
  label,
  badge,
  detail,
  value,
  limit,
  onChange,
  placeholder,
}: {
  label: string;
  badge?: string;
  detail: string;
  value: string[];
  limit: number;
  onChange: (val: string[]) => void;
  placeholder?: string;
}) {
  const [copyNotice, setCopyNotice] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(value.join("\n"));
    setCopyNotice(true);
    setTimeout(() => setCopyNotice(false), 2000);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            {label}
          </span>
          {badge && (
            <span className="rounded-md bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 text-[9px] font-mono text-blue-400">
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-slate-200"
            title="Sao chép toàn bộ"
          >
            <IconCopy size={12} />
            <span>{copyNotice ? "Đã chép!" : "Sao chép"}</span>
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] font-mono text-rose-400 hover:text-rose-300"
            title="Xóa trắng danh sách"
          >
            Xóa
          </button>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">{detail}</p>

      <textarea
        value={value.join("\n")}
        onChange={(e) => {
          const items = Array.from(
            new Set(
              e.target.value
                .split(/\r?\n/)
                .map((s) => s.trim())
                .filter(Boolean),
            ),
          ).slice(0, limit);
          onChange(items);
        }}
        placeholder={placeholder}
        rows={6}
        className="admin-custom-scroll w-full rounded-xl border border-slate-800 bg-[#070a10] p-3 font-mono text-xs text-sky-300 placeholder:text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-colors leading-relaxed resize-y"
      />
    </div>
  );
}

function JsonEditorField({
  label,
  detail,
  value,
  onChange,
}: {
  label: string;
  detail: string;
  value: Record<string, unknown>;
  onChange: (val: Record<string, unknown>) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [hasError, setHasError] = useState(false);

  // Sync if value changes externally
  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
    setHasError(false);
  }, [value]);

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(text);
      setText(JSON.stringify(parsed, null, 2));
      onChange(parsed);
      setHasError(false);
    } catch {
      setHasError(true);
    }
  };

  const handleInsertSample = () => {
    const sample = {
      "de-cu": {
        title: "FlexPhim Đề Cử 4K",
        slugs: ["oppenheimer", "dune-hanh-tinh-cat-2"],
        href: "/films",
      },
    };
    setText(JSON.stringify(sample, null, 2));
    onChange(sample);
    setHasError(false);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            {label}
          </span>
          <span
            className={`rounded-md px-1.5 py-0.2 text-[9px] font-mono font-bold ${
              hasError
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            }`}
          >
            {hasError ? "Lỗi cú pháp JSON" : "Cú pháp JSON hợp lệ"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFormat}
            className="flex items-center gap-1 text-[10px] font-mono text-blue-400 hover:text-blue-300"
            title="Định dạng lại thụt lề chuẩn"
          >
            <IconCode size={12} />
            <span>Format</span>
          </button>
          <button
            type="button"
            onClick={handleInsertSample}
            className="text-[10px] font-mono text-purple-400 hover:text-purple-300"
            title="Chèn mẫu cấu hình có sẵn"
          >
            Chèn mẫu
          </button>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">{detail}</p>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            const parsed = JSON.parse(e.target.value);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              onChange(parsed);
              setHasError(false);
            } else {
              setHasError(true);
            }
          } catch {
            setHasError(true);
          }
        }}
        rows={6}
        className={`admin-custom-scroll w-full rounded-xl border p-3 font-mono text-xs text-amber-300 placeholder:text-slate-700 focus:outline-none transition-colors leading-relaxed resize-y ${
          hasError
            ? "border-rose-500/80 bg-rose-950/20 focus:ring-1 focus:ring-rose-500"
            : "border-slate-800 bg-[#070a10] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40"
        }`}
      />

      <span className="mt-1.5 text-[10px] text-slate-400 leading-relaxed">
        Gợi ý: Mỗi khối khóa chính (ví dụ <code>&quot;de-cu&quot;</code>) sẽ tạo thành hàng phim có ID{" "}
        <code className="text-blue-300">featured:de-cu</code> để sắp xếp vị trí hoặc ẩn.
      </span>
    </div>
  );
}

function AnnouncementPreview({ config }: { config: Configuration }) {
  const paragraphs = (config.homePopupBody || "")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  const webAssetBase = (
    process.env.NEXT_PUBLIC_NETPHIM_WEB_URL || "https://film-site-web.vercel.app"
  ).replace(/\/$/, "");
  const catNumber = ((config.homePopupVersion || 1) % 4) + 1;

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-800 bg-[#070a10] p-4 shadow-inner">
      <div className="mb-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span className="flex items-center gap-1.5">
          <IconSparkles size={14} className="text-violet-400" />
          <span>Xem trước modal trang chủ</span>
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
            config.homePopupEnabled
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          {config.homePopupEnabled ? "Đang phát trực tiếp" : "Bản nháp ẩn"}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-[#10141e] p-5 shadow-2xl">
        <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />

        <div className="flex items-start gap-4">
          <div className="relative h-16 w-16 shrink-0 rotate-[-2deg] overflow-hidden rounded-xl border border-violet-500/30 bg-black p-0.5 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${webAssetBase}/images/cat${catNumber}.gif`}
              alt="Mèo đưa tin"
              className="h-full w-full rounded-lg object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400">
              FlexPhim Thông Báo
            </span>
            <h3 className="mt-1 text-sm font-extrabold text-white leading-snug truncate">
              {config.homePopupTitle || "Thông báo mới từ ban quản trị"}
            </h3>
          </div>
        </div>

        <div className="mt-3.5 space-y-2 text-xs leading-relaxed text-slate-300 max-h-36 overflow-y-auto admin-custom-scroll pr-1">
          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => <p key={i}>{p}</p>)
          ) : (
            <p className="italic text-slate-400">Nội dung thông báo sẽ xuất hiện tại đây...</p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800/80 pt-3">
          {config.homePopupLink ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:underline">
              <span>{config.homePopupLinkLabel || "Xem chi tiết"}</span>
              <IconExternalLink size={12} />
            </span>
          ) : (
            <span />
          )}

          <span className="rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-md">
            {config.homePopupDismissLabel || "Đã hiểu"}
          </span>
        </div>
      </div>
    </div>
  );
}
