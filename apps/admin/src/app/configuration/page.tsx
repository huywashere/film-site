"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconSpeakerphone as Megaphone,
  IconRefresh as RefreshCw,
  IconRestore as Restore,
  IconDeviceFloppy as Save,
  IconAdjustmentsHorizontal as SlidersHorizontal,
  IconAlertTriangle as TriangleAlert,
  IconExternalLink as ExternalLink,
  IconX as X,
} from "@tabler/icons-react";
import { adminFetch } from "@/lib/admin-api";
import { configurationUpdatePayload } from "@/lib/configuration-payload";

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

const PROVIDERS = ["kkphim", "ophim", "nguonc", "vsmov"];

export default function ConfigurationPage() {
  const [config, setConfig] = useState<Configuration | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [revisions, setRevisions] = useState<ConfigurationRevision[]>([]);

  const load = useCallback(async () => {
    try {
      const [current, history] = await Promise.all([
        adminFetch<Configuration>("configuration"),
        adminFetch<ConfigurationRevision[]>("configuration/revisions?limit=20"),
      ]);
      setConfig(current);
      setRevisions(history);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không tải được cấu hình",
      );
    }
  }, []);
  useEffect(() => void load(), [load]);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const updated = await adminFetch<Configuration>("configuration", {
        method: "PATCH",
        // The GET response also contains server-owned fields such as `id`,
        // timestamps and `homePopupVersion`. Sending the full object makes the
        // API's strict DTO validation reject the entire update.
        body: JSON.stringify(configurationUpdatePayload(config)),
      });
      setConfig(updated);
      setNotice("Đã áp dụng cấu hình vận hành.");
      setRevisions(
        await adminFetch<ConfigurationRevision[]>(
          "configuration/revisions?limit=20",
        ),
      );
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không lưu được cấu hình",
      );
    } finally {
      setSaving(false);
    }
  };

  const restore = async (revision: ConfigurationRevision) => {
    if (
      !window.confirm(
        `Khôi phục cấu hình lúc ${new Date(revision.createdAt).toLocaleString("vi-VN")}?`,
      )
    )
      return;
    setSaving(true);
    try {
      setConfig(
        await adminFetch<Configuration>(
          `configuration/revisions/${revision.id}/restore`,
          { method: "POST" },
        ),
      );
      setNotice("Đã khôi phục phiên bản cấu hình đã chọn.");
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể khôi phục cấu hình",
      );
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof Configuration>(
    key: K,
    value: Configuration[K],
  ) =>
    setConfig((current) => (current ? { ...current, [key]: value } : current));

  if (!config)
    return (
      <div className="admin-card p-8 text-sm text-slate-500">
        {error || "Đang tải cấu hình…"}
      </div>
    );

  return (
    <div className="admin-fade-in space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-slate-400">
            VẬN HÀNH / CẤU HÌNH
          </p>
          <h1 className="mt-2 text-[29px] font-bold tracking-[-.045em] text-slate-800">
            Điều khiển nội dung toàn site
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Thay đổi được lưu vào database và phát qua API công khai.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            className="admin-icon-button"
            aria-label="Tải lại"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="admin-primary-button"
          >
            <Save size={15} />
            {saving ? "Đang lưu…" : "Lưu cấu hình"}
          </button>
        </div>
      </header>
      {error && (
        <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700">
          <TriangleAlert size={16} />
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-emerald-700">
          {notice}
        </div>
      )}
      <section className="admin-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-line)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/10 text-violet-500">
              <Megaphone size={18} />
            </span>
            <div>
              <h2 className="text-[14px] font-bold text-slate-800">
                Thông báo nổi tại trang chủ
              </h2>
              <p className="mt-0.5 text-[10px] text-slate-400">
                Bản tin mới sẽ hiện lại với cả người đã đóng bản tin cũ.
              </p>
            </div>
          </div>
          <Toggle
            label="Hiển thị popup tại trang chủ"
            detail={
              config.homePopupEnabled
                ? "Đang bật — người dùng sẽ thấy bản tin này."
                : "Đang tắt — nội dung chỉ được lưu dưới dạng bản nháp."
            }
            checked={config.homePopupEnabled}
            onChange={(value) => update("homePopupEnabled", value)}
            compact
          />
        </div>
        <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.86fr)]">
          <div className="grid content-start gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field
                label="Tiêu đề"
                value={config.homePopupTitle || ""}
                onChange={(value) => update("homePopupTitle", value)}
                placeholder="Thông báo từ FlexPhim"
                maxLength={180}
              />
            </div>
            <div className="sm:col-span-2">
              <Field
                label="Nội dung"
                value={config.homePopupBody || ""}
                onChange={(value) => update("homePopupBody", value)}
                placeholder={"Viết nội dung muốn gửi tới người xem.\nXuống dòng để tách thành đoạn mới."}
                multiline
                maxLength={4000}
              />
            </div>
            <Field
              label="Nhãn liên kết"
              value={config.homePopupLinkLabel || ""}
              onChange={(value) => update("homePopupLinkLabel", value)}
              placeholder="Xem chi tiết"
              maxLength={80}
            />
            <Field
              label="Nút xác nhận"
              value={config.homePopupDismissLabel || ""}
              onChange={(value) => update("homePopupDismissLabel", value)}
              placeholder="Đã hiểu"
              maxLength={80}
            />
            <div className="sm:col-span-2">
              <Field
                label="Liên kết (không bắt buộc)"
                value={config.homePopupLink || ""}
                onChange={(value) => update("homePopupLink", value)}
                placeholder="https://… hoặc /duong-dan"
                maxLength={2048}
              />
            </div>
          </div>
          <AnnouncementPreview config={config} />
        </div>
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <article className="admin-card p-5">
          <div className="flex items-center gap-2">
            <Megaphone size={17} className="text-blue-600" />
            <h2 className="text-[14px] font-bold text-slate-800">
              Thông báo và bảo trì
            </h2>
          </div>
          <div className="mt-5 space-y-4">
            <Toggle
              label="Chế độ bảo trì"
              detail="Hiện cảnh báo ưu tiên cao trên giao diện người xem."
              checked={config.maintenanceMode}
              onChange={(value) => update("maintenanceMode", value)}
            />
            <Field
              label="Nội dung bảo trì"
              value={config.maintenanceNotice || ""}
              onChange={(value) => update("maintenanceNotice", value)}
              multiline
            />
            <Field
              label="Thông báo toàn site"
              value={config.announcementText || ""}
              onChange={(value) => update("announcementText", value)}
              multiline
            />
            <Field
              label="Liên kết thông báo"
              value={config.announcementLink || ""}
              onChange={(value) => update("announcementLink", value)}
              placeholder="https://… hoặc /duong-dan"
            />
          </div>
        </article>
        <article className="admin-card p-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={17} className="text-blue-600" />
            <h2 className="text-[14px] font-bold text-slate-800">
              Player và tính năng
            </h2>
          </div>
          <div className="mt-5 space-y-4">
            <Toggle
              label="Cho phép Watch Party"
              detail="Tắt nút tạo phòng mới khi cần cô lập sự cố."
              checked={config.watchPartyEnabled}
              onChange={(value) => update("watchPartyEnabled", value)}
            />
            <div>
              <label className="text-[11px] font-bold text-slate-600">
                Ưu tiên nguồn phát
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {PROVIDERS.map((provider) => (
                  <button
                    type="button"
                    key={provider}
                    onClick={() => {
                      const next = config.providerPriority.includes(provider)
                        ? config.providerPriority.filter(
                            (item) => item !== provider,
                          )
                        : [...config.providerPriority, provider];
                      update("providerPriority", next);
                    }}
                    className={`rounded-xl border px-3 py-2 text-left text-[11px] font-bold ${config.providerPriority.includes(provider) ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-400"}`}
                  >
                    {config.providerPriority.indexOf(provider) >= 0
                      ? `${config.providerPriority.indexOf(provider) + 1}. `
                      : ""}
                    {provider}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </article>
      </section>
      <section className="admin-card p-5">
        <h2 className="text-[14px] font-bold text-slate-800">
          Hero banner được ghim
        </h2>
        <p className="mt-1 text-[11px] text-slate-400">
          Mỗi dòng một slug phim, tối đa 12. Để trống để hệ thống tự chọn.
        </p>
        <textarea
          value={config.heroMovieSlugs.join("\n")}
          onChange={(event) =>
            update(
              "heroMovieSlugs",
              event.target.value
                .split(/\r?\n/)
                .map((item) => item.trim())
                .filter(Boolean)
                .slice(0, 12),
            )
          }
          className="admin-control mt-4 min-h-36 w-full resize-y px-3 py-3 font-mono text-[12px]"
          placeholder={"slug-phim-1\nslug-phim-2"}
        />
      </section>
      <section className="admin-card p-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={17} className="text-blue-600" />
          <div>
            <h2 className="text-[14px] font-bold text-slate-800">Bố cục và nội dung trang chủ</h2>
            <p className="mt-1 text-[11px] text-slate-400">Điều khiển thứ tự section, Top 10, hàng nội dung và SEO. Mỗi lần lưu sẽ tăng cache version.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <ListField
            label="Top 10 được ghim"
            detail="Mỗi dòng một slug, tối đa 10. Các vị trí thiếu được tự bổ sung theo lượt xem."
            value={config.homeTop10Slugs}
            limit={10}
            onChange={(value) => update("homeTop10Slugs", value)}
          />
          <ListField
            label="Thứ tự section"
            detail="ID hỗ trợ: top10, continue, schedule, latest, vfx, usuk-series, action, scifi, horror, historical, theatrical và featured:<mã hàng>."
            value={config.homeSectionOrder}
            limit={30}
            onChange={(value) => update("homeSectionOrder", value)}
          />
          <ListField
            label="Ẩn section"
            detail="Mỗi dòng một ID section cần tạm ẩn khỏi trang chủ."
            value={config.homeHiddenSections}
            limit={30}
            onChange={(value) => update("homeHiddenSections", value)}
          />
          <JsonEditor
            label="Hàng nội dung tùy chỉnh"
            value={config.homeFeaturedRows || {}}
            onChange={(value) => update("homeFeaturedRows", value)}
          />
          <p className="self-end text-[11px] leading-5 text-slate-400">
            Mẫu: {`{"de-cu":{"title":"FlexPhim đề cử","slugs":["slug-phim-1"],"href":"/films"}}`}. Hàng này có ID <code>featured:de-cu</code> để sắp xếp hoặc ẩn.
          </p>
          <Field label="SEO title trang chủ" value={config.seoTitle || ""} onChange={(value) => update("seoTitle", value)} maxLength={180} />
          <Field label="SEO description" value={config.seoDescription || ""} onChange={(value) => update("seoDescription", value)} multiline maxLength={500} />
        </div>
      </section>
      <section className="admin-card overflow-hidden">
        <div className="border-b border-[var(--admin-line)] px-5 py-4">
          <h2 className="text-[14px] font-bold text-slate-800">
            Lịch sử cấu hình
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Mỗi lần lưu đều giữ trạng thái trước đó để có thể khôi phục.
          </p>
        </div>
        <div className="divide-y divide-[var(--admin-line)]">
          {revisions.map((revision) => (
            <div
              key={revision.id}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <div>
                <strong className="block text-[11px] text-slate-700">
                  {revision.changedBy}
                </strong>
                <time className="text-[10px] text-slate-400">
                  {new Date(revision.createdAt).toLocaleString("vi-VN")}
                </time>
                <p className="mt-1 text-[10px] text-slate-400">
                  {revision.snapshot.maintenanceMode
                    ? "Đang bảo trì"
                    : "Hoạt động"}
                  {` · ${revision.snapshot.heroMovieSlugs?.length || 0} hero · ${revision.snapshot.providerPriority?.length || 0} nguồn`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void restore(revision)}
                disabled={saving}
                className="admin-control inline-flex items-center gap-1.5 px-3 text-[11px] font-semibold"
              >
                <Restore size={14} /> Khôi phục
              </button>
            </div>
          ))}
          {!revisions.length && (
            <p className="p-8 text-center text-[11px] text-slate-400">
              Chưa có phiên bản cấu hình cũ.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Toggle({
  label,
  detail,
  checked,
  onChange,
  compact = false,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  compact?: boolean;
}) {
  return (
    <label className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-slate-50 ${compact ? "px-3 py-2" : "p-3"}`}>
      <span>
        <strong className="block text-[12px] text-slate-700">{label}</strong>
        <small className="text-[10px] text-slate-400">{detail}</small>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span
          className={`text-[9px] font-black uppercase tracking-[.12em] ${checked ? "text-emerald-600" : "text-slate-400"}`}
        >
          {checked ? "Bật" : "Tắt"}
        </span>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`relative h-6 w-11 rounded-full border transition-colors ${checked ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-slate-200"}`}
        >
          <span
            className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[20px]" : "translate-x-0.5"}`}
          />
        </span>
      </span>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-slate-600">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={maxLength}
          className="admin-control mt-2 min-h-20 w-full resize-y px-3 py-2 text-[12px]"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={maxLength}
          className="admin-control mt-2 w-full px-3 text-[12px]"
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

function ListField({ label, detail, value, limit, onChange }: { label: string; detail: string; value: string[]; limit: number; onChange: (value: string[]) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-slate-600">{label}</span>
      <small className="mt-1 block text-[10px] text-slate-400">{detail}</small>
      <textarea
        value={value.join("\n")}
        onChange={(event) => onChange(Array.from(new Set(event.target.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))).slice(0, limit))}
        className="admin-control mt-2 min-h-32 w-full resize-y px-3 py-2 font-mono text-[11px]"
      />
    </label>
  );
}

function JsonEditor({ label, value, onChange }: { label: string; value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [invalid, setInvalid] = useState(false);
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-slate-600">{label}</span>
      <small className="mt-1 block text-[10px] text-slate-400">JSON dành cho các hàng nội dung mở rộng.</small>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          try {
            const parsed = JSON.parse(text);
            if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
            onChange(parsed);
            setInvalid(false);
          } catch { setInvalid(true); }
        }}
        className={`admin-control mt-2 min-h-32 w-full resize-y px-3 py-2 font-mono text-[11px] ${invalid ? "!border-rose-400" : ""}`}
      />
      {invalid && <small className="mt-1 block text-[10px] text-rose-600">JSON chưa hợp lệ, dữ liệu cũ chưa bị thay đổi.</small>}
    </label>
  );
}

function AnnouncementPreview({ config }: { config: Configuration }) {
  const paragraphs = (config.homePopupBody || "")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  const webAssetBase = (
    process.env.NEXT_PUBLIC_NETPHIM_WEB_URL ||
    "https://film-site-web.vercel.app"
  ).replace(/\/$/, "");
  const catNumber = ((config.homePopupVersion || 1) % 4) + 1;

  return (
    <div className="rounded-2xl border border-[var(--admin-line)] bg-[#09090d] p-3 shadow-inner sm:p-5">
      <div className="mb-3 flex items-center justify-between px-1 text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">
        <span>Xem trước trang chủ</span>
        <span>{config.homePopupEnabled ? "Đang bật" : "Bản nháp"}</span>
      </div>
      <div className="relative overflow-hidden rounded-[24px] border border-white/[.12] bg-[#111116] shadow-2xl">
        <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/70 to-transparent" />
        <span className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/20 text-slate-500">
          <X size={14} />
        </span>
        <div className="relative px-5 pb-5 pt-5">
          <div className="flex items-start gap-4 pr-9">
            <span className="relative h-[76px] w-[90px] shrink-0 rotate-[-2deg] overflow-hidden rounded-[18px] border border-violet-300/25 bg-black p-1 shadow-xl">
              <span className="absolute inset-0 grid place-items-center text-3xl">🐱</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${webAssetBase}/images/cat${catNumber}.gif`}
                alt="Mèo đưa tin FlexPhim"
                className="absolute inset-1 h-[calc(100%-8px)] w-[calc(100%-8px)] rounded-[14px] object-cover"
              />
              <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-wider text-amber-200">
                Tin mới
              </span>
            </span>
            <div className="min-w-0 pt-1">
              <span className="block text-[8px] font-black uppercase tracking-[.2em] text-violet-300">
                FlexPhim nhắn bạn
              </span>
              <h3 className="mt-2 text-[17px] font-extrabold leading-snug tracking-[-.025em] text-white">
                {config.homePopupTitle || "Có một thông báo mới"}
              </h3>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-[12px] leading-6 text-slate-300">
            {paragraphs.length ? (
              paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
            ) : (
              <p className="italic text-slate-600">Nội dung thông báo sẽ hiện tại đây.</p>
            )}
          </div>
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[.08] pt-4">
            {config.homePopupLink ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-300">
                {config.homePopupLinkLabel || "Xem chi tiết"}
                <ExternalLink size={12} />
              </span>
            ) : (
              <span />
            )}
            <span className="rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 px-5 py-2 text-[9px] font-black uppercase tracking-wide text-slate-950">
              {config.homePopupDismissLabel || "Đã hiểu"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
