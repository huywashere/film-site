"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconEye,
  IconClick,
  IconPlayerPlay,
  IconPhoto,
  IconCode,
  IconToggleLeft,
  IconToggleRight,
  IconCalendar,
  IconFilter,
  IconRefresh,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import { adminFetch } from "@/lib/admin-api";

type AdItem = {
  id: string;
  title: string;
  type: "BANNER_TOP" | "BANNER_BOTTOM" | "BANNER_PLAYER" | "VIDEO_PREROLL" | "POPUNDER" | "CUSTOM_HTML";
  imageUrl?: string | null;
  targetUrl?: string | null;
  htmlContent?: string | null;
  videoVastUrl?: string | null;
  videoDuration?: number;
  skipOffsetSec?: number;
  categories: string[];
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  impressions: number;
  clicks: number;
  createdAt: string;
};

const AD_TYPE_CONFIG = {
  BANNER_TOP: { label: "Banner Đầu Trang", icon: IconPhoto, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  BANNER_PLAYER: { label: "Banner Dưới Player", icon: IconPhoto, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  BANNER_BOTTOM: { label: "Banner Chân Trang", icon: IconPhoto, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
  VIDEO_PREROLL: { label: "Video Ads Trước Khi Xem (Pre-roll)", icon: IconPlayerPlay, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  POPUNDER: { label: "Popunder / Tab Mới", icon: IconCode, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  CUSTOM_HTML: { label: "Mã Script / HTML Tùy Chỉnh", icon: IconCode, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
};

export default function AdsManagementPage() {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState<AdItem | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    type: "BANNER_TOP" as AdItem["type"],
    imageUrl: "",
    targetUrl: "",
    htmlContent: "",
    videoVastUrl: "",
    videoDuration: 15,
    skipOffsetSec: 5,
    categories: [] as string[],
    isActive: true,
    startDate: "",
    endDate: "",
  });

  const loadAds = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch<AdItem[]>("ads");
      setAds(Array.isArray(data) ? data : []);
      setError("");
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh sách quảng cáo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAds();
  }, [loadAds]);

  const handleOpenCreate = () => {
    setEditingAd(null);
    setFormData({
      title: "",
      type: "BANNER_TOP",
      imageUrl: "",
      targetUrl: "",
      htmlContent: "",
      videoVastUrl: "",
      videoDuration: 15,
      skipOffsetSec: 5,
      categories: [],
      isActive: true,
      startDate: "",
      endDate: "",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (ad: AdItem) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      type: ad.type,
      imageUrl: ad.imageUrl || "",
      targetUrl: ad.targetUrl || "",
      htmlContent: ad.htmlContent || "",
      videoVastUrl: ad.videoVastUrl || "",
      videoDuration: ad.videoDuration || 15,
      skipOffsetSec: ad.skipOffsetSec || 5,
      categories: ad.categories || [],
      isActive: ad.isActive,
      startDate: ad.startDate ? ad.startDate.slice(0, 10) : "",
      endDate: ad.endDate ? ad.endDate.slice(0, 10) : "",
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (editingAd) {
        await adminFetch(`ads/${editingAd.id}`, {
          method: "PATCH",
          body: JSON.stringify(formData),
        });
        setSuccess("Đã cập nhật quảng cáo thành công!");
      } else {
        await adminFetch("ads", {
          method: "POST",
          body: JSON.stringify(formData),
        });
        setSuccess("Đã tạo quảng cáo mới thành công!");
      }
      setShowModal(false);
      await loadAds();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi lưu quảng cáo");
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await adminFetch(`ads/${id}/toggle`, { method: "POST" });
      await loadAds();
    } catch (err: any) {
      setError(err?.message || "Không thể đổi trạng thái");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa quảng cáo "${title}"?`)) return;
    try {
      await adminFetch(`ads/${id}`, { method: "DELETE" });
      setSuccess("Đã xóa quảng cáo thành công!");
      await loadAds();
    } catch (err: any) {
      setError(err?.message || "Không thể xóa quảng cáo");
    }
  };

  return (
    <div className="admin-fade-in space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            DOANH THU & QUẢNG CÁO
          </p>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
            Quản Lý Vị Trí Quảng Cáo
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Thiết lập banner đầu trang, video pre-roll đếm ngược, popunder và đặt lịch hẹn giờ theo danh mục.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadAds}
            className="admin-secondary-button inline-flex items-center gap-1.5 px-3 py-2 text-xs"
          >
            <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="admin-primary-button inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold"
          >
            <IconPlus size={15} />
            Thêm Vị Trí Quảng Cáo
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
      {success && (
        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <IconCheck size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="admin-card p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Tổng Vị Trí</span>
          <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{ads.length}</p>
        </div>
        <div className="admin-card p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Đang Hoạt Động</span>
          <p className="text-2xl font-black text-emerald-500 mt-1">
            {ads.filter((a) => a.isActive).length}
          </p>
        </div>
        <div className="admin-card p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Tổng Lượt Hiển Thị</span>
          <p className="text-2xl font-black text-blue-500 mt-1">
            {ads.reduce((s, a) => s + (a.impressions || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="admin-card p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Tổng Lượt Click (CTR)</span>
          <p className="text-2xl font-black text-purple-500 mt-1">
            {ads.reduce((s, a) => s + (a.clicks || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Ads List */}
      <div className="admin-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--admin-line)] flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">
            Danh Sách Banner & Video Ads
          </h2>
          <span className="text-xs text-slate-400">{ads.length} vị trí được cấu hình</span>
        </div>

        {ads.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Chưa có vị trí quảng cáo nào. Bấm "Thêm Vị Trí Quảng Cáo" để tạo banner hoặc video ads đầu tiên!
          </div>
        ) : (
          <div className="divide-y divide-[var(--admin-line)]">
            {ads.map((ad) => {
              const typeCfg = AD_TYPE_CONFIG[ad.type] || AD_TYPE_CONFIG.BANNER_TOP;
              const IconComp = typeCfg.icon;

              return (
                <div
                  key={ad.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-500/[0.02] transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className={`p-2.5 rounded-xl border shrink-0 ${typeCfg.color}`}>
                      <IconComp size={20} />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm font-bold text-slate-800 dark:text-white">
                          {ad.title}
                        </strong>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${typeCfg.color}`}
                        >
                          {typeCfg.label}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ad.isActive
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                          }`}
                        >
                          {ad.isActive ? "Đang Bật" : "Tạm Tắt"}
                        </span>
                      </div>

                      {/* Details & Target */}
                      <p className="text-xs text-slate-500 truncate">
                        {ad.targetUrl ? (
                          <span>Link: <span className="font-mono text-blue-500">{ad.targetUrl}</span></span>
                        ) : ad.videoVastUrl ? (
                          <span>VAST/Video: <span className="font-mono text-amber-500">{ad.videoVastUrl}</span> (Bỏ qua sau {ad.skipOffsetSec}s)</span>
                        ) : (
                          <span>Mã HTML tùy chỉnh</span>
                        )}
                      </p>

                      {/* Dates & Categories */}
                      <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap pt-0.5">
                        <span className="flex items-center gap-1">
                          <IconCalendar size={12} />
                          {ad.startDate || ad.endDate
                            ? `${ad.startDate ? new Date(ad.startDate).toLocaleDateString("vi-VN") : "Từ đầu"} - ${ad.endDate ? new Date(ad.endDate).toLocaleDateString("vi-VN") : "Vô hạn"}`
                            : "Hiển thị liên tục"}
                        </span>
                        <span className="flex items-center gap-1">
                          <IconFilter size={12} />
                          {ad.categories.length > 0 ? ad.categories.join(", ") : "Tất cả chuyên mục"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Metrics & Actions */}
                  <div className="flex items-center gap-6 self-end md:self-auto shrink-0">
                    <div className="flex items-center gap-4 text-center">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Lượt xem</span>
                        <strong className="text-xs text-slate-700 dark:text-slate-300">
                          {(ad.impressions || 0).toLocaleString()}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Lượt Click</span>
                        <strong className="text-xs text-purple-600 dark:text-purple-400">
                          {(ad.clicks || 0).toLocaleString()}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(ad.id)}
                        className="p-1.5 rounded-lg border border-[var(--admin-line)] hover:bg-slate-500/10 transition-colors"
                        title={ad.isActive ? "Tạm tắt quảng cáo" : "Kích hoạt quảng cáo"}
                      >
                        {ad.isActive ? (
                          <IconToggleRight size={20} className="text-emerald-500" />
                        ) : (
                          <IconToggleLeft size={20} className="text-slate-400" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(ad)}
                        className="p-1.5 rounded-lg border border-[var(--admin-line)] hover:bg-slate-500/10 text-blue-500 transition-colors"
                        title="Chỉnh sửa quảng cáo"
                      >
                        <IconEdit size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(ad.id, ad.title)}
                        className="p-1.5 rounded-lg border border-[var(--admin-line)] hover:bg-rose-500/10 text-rose-500 transition-colors"
                        title="Xóa quảng cáo"
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-[var(--admin-line)] rounded-2xl shadow-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--admin-line)] pb-3">
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                {editingAd ? "Chỉnh Sửa Vị Trí Quảng Cáo" : "Thêm Vị Trí Quảng Cáo Mới"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên / Tiêu đề quảng cáo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Banner Game Tết 2026"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="admin-control w-full px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Loại vị trí hiển thị
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="admin-control w-full px-3 py-2 text-xs font-semibold"
                  >
                    <option value="BANNER_TOP">Banner Đầu Trang (Top)</option>
                    <option value="BANNER_PLAYER">Banner Dưới Trình Phát</option>
                    <option value="BANNER_BOTTOM">Banner Chân Trang</option>
                    <option value="VIDEO_PREROLL">Video Ads Trước Khi Xem (Pre-roll)</option>
                    <option value="POPUNDER">Popunder (Mở tab mới)</option>
                    <option value="CUSTOM_HTML">Mã HTML / Script Tùy Chỉnh</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Trạng thái kích hoạt
                  </label>
                  <select
                    value={formData.isActive ? "true" : "false"}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "true" })}
                    className="admin-control w-full px-3 py-2 text-xs font-semibold"
                  >
                    <option value="true">Bật ngay (Active)</option>
                    <option value="false">Tạm tắt (Inactive)</option>
                  </select>
                </div>
              </div>

              {/* Conditional fields based on type */}
              {formData.type === "VIDEO_PREROLL" ? (
                <div className="space-y-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Link Video MP4 hoặc VAST Tag URL
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://domain.com/ad-video.mp4 hoặc VAST XML URL"
                      value={formData.videoVastUrl}
                      onChange={(e) => setFormData({ ...formData, videoVastUrl: e.target.value })}
                      className="admin-control w-full px-3 py-2 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Thời lượng tối đa (giây)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={formData.videoDuration}
                        onChange={(e) => setFormData({ ...formData, videoDuration: Number(e.target.value) })}
                        className="admin-control w-full px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Hiện nút Bỏ qua sau (giây)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={formData.skipOffsetSec}
                        onChange={(e) => setFormData({ ...formData, skipOffsetSec: Number(e.target.value) })}
                        className="admin-control w-full px-3 py-2 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ) : formData.type === "CUSTOM_HTML" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Đoạn mã HTML / Script chèn trực tiếp
                  </label>
                  <textarea
                    rows={4}
                    placeholder="<script>...</script> hoặc <div>...</div>"
                    value={formData.htmlContent}
                    onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                    className="admin-control w-full px-3 py-2 text-xs font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Link ảnh Banner (URL)
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://example.com/banner-728x90.png"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="admin-control w-full px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Link đích khi người dùng Click vào
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://doitac.com/dang-ky"
                      value={formData.targetUrl}
                      onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                      className="admin-control w-full px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Schedule Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày bắt đầu hiển thị
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="admin-control w-full px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày kết thúc (Để trống nếu vô hạn)
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="admin-control w-full px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--admin-line)]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="admin-secondary-button px-4 py-2 text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="admin-primary-button px-5 py-2 text-xs font-bold"
                >
                  {editingAd ? "Lưu Thay Đổi" : "Tạo Quảng Cáo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
