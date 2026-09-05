"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconSpeakerphone,
  IconPlus,
  IconTrash,
  IconEdit,
  IconRefresh,
  IconCheck,
  IconAlertCircle,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconPin,
  IconSearch,
  IconTag,
  IconCalendar,
} from "@tabler/icons-react";
import { adminFetch } from "@/lib/admin-api";

type SystemNotificationItem = {
  id: string;
  title: string;
  message: string;
  tag?: string | null;
  link?: string | null;
  isActive: boolean;
  priority: number;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type NotificationListResponse = {
  items: SystemNotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const POPULAR_TAGS = [
  { label: "Tất cả", value: "all" },
  { label: "Hệ thống", value: "Hệ thống", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { label: "Tính năng", value: "Tính năng", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { label: "Watch Party", value: "Watch Party", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  { label: "Bảo trì", value: "Bảo trì", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { label: "Sự kiện", value: "Sự kiện", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
];

function getTagBadgeStyle(tag?: string | null) {
  switch (tag) {
    case "Tính năng":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "Watch Party":
      return "bg-pink-500/10 text-pink-400 border-pink-500/20";
    case "Bảo trì":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "Sự kiện":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    default:
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  }
}

export default function NotificationsManagementPage() {
  const [notifications, setNotifications] = useState<SystemNotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SystemNotificationItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    tag: "Hệ thống",
    link: "",
    priority: 0,
    isActive: true,
  });

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTag && selectedTag !== "all") params.set("tag", selectedTag);
      if (search.trim()) params.set("search", search.trim());
      params.set("limit", "50");

      const queryStr = params.toString() ? `?${params.toString()}` : "";
      const data = await adminFetch<NotificationListResponse>(`system-notifications${queryStr}`);
      setNotifications(data.items || []);
      setTotal(data.total || 0);
      setError("");
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh sách thông báo");
    } finally {
      setLoading(false);
    }
  }, [search, selectedTag]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadNotifications();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadNotifications]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      message: "",
      tag: "Hệ thống",
      link: "",
      priority: 0,
      isActive: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: SystemNotificationItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      message: item.message,
      tag: item.tag || "Hệ thống",
      link: item.link || "",
      priority: item.priority || 0,
      isActive: item.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      setError("Vui lòng điền đầy đủ tiêu đề và nội dung thông báo");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      if (editingItem) {
        await adminFetch(`system-notifications/${editingItem.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: formData.title,
            message: formData.message,
            tag: formData.tag,
            link: formData.link.trim() || null,
            priority: Number(formData.priority) || 0,
            isActive: formData.isActive,
          }),
        });
        setSuccess("Đã cập nhật thông báo hệ thống thành công");
      } else {
        await adminFetch("system-notifications", {
          method: "POST",
          body: JSON.stringify({
            title: formData.title,
            message: formData.message,
            tag: formData.tag,
            link: formData.link.trim() || null,
            priority: Number(formData.priority) || 0,
            isActive: formData.isActive,
          }),
        });
        setSuccess("Đã phát sóng thông báo hệ thống mới thành công");
      }

      setShowModal(false);
      void loadNotifications();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err?.message || "Thao tác thất bại, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (item: SystemNotificationItem) => {
    try {
      await adminFetch(`system-notifications/${item.id}/toggle`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isActive: !n.isActive } : n)),
      );
      setSuccess(`Đã ${item.isActive ? "ẩn" : "kích hoạt"} thông báo "${item.title}"`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err?.message || "Không thể thay đổi trạng thái thông báo");
    }
  };

  const handleDelete = async (item: SystemNotificationItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thông báo "${item.title}"?`)) {
      return;
    }
    try {
      await adminFetch(`system-notifications/${item.id}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((n) => n.id !== item.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setSuccess(`Đã xóa thông báo "${item.title}"`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err?.message || "Không thể xóa thông báo");
    }
  };

  const activeCount = notifications.filter((n) => n.isActive).length;
  const inactiveCount = notifications.filter((n) => !n.isActive).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <IconSpeakerphone size={22} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                Thông Báo Hệ Thống
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Quản lý các thông báo broadcast hiển thị trực tiếp tại thanh thông báo của người dùng
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadNotifications()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl transition-all"
          >
            <IconRefresh size={15} className={loading ? "animate-spin" : ""} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.98] rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            <IconPlus size={16} />
            <span>Tạo thông báo mới</span>
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-xs text-red-500 font-medium">
          <IconAlertCircle size={17} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-xs text-emerald-500 font-medium">
          <IconCheck size={17} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-white/[0.08] shadow-sm">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Tổng thông báo</p>
          <p className="text-2xl font-black text-neutral-900 dark:text-white mt-1">{total}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-white/[0.08] shadow-sm">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Đang phát sóng (Hiển thị)</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-white/[0.08] shadow-sm">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Tạm ẩn / Đang tắt</p>
          <p className="text-2xl font-black text-neutral-500 dark:text-neutral-400 mt-1">{inactiveCount}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-3 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-white/[0.08] rounded-2xl">
        {/* Tag Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {POPULAR_TAGS.map((tag) => (
            <button
              key={tag.value}
              type="button"
              onClick={() => setSelectedTag(tag.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedTag === tag.value
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề, nội dung..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800/80 border border-transparent focus:border-blue-500/50 rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-sm">
        {loading && notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-400 flex flex-col items-center justify-center gap-2">
            <IconRefresh size={24} className="animate-spin text-blue-500" />
            <span>Đang tải danh sách thông báo...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400 mb-3">
              <IconSpeakerphone size={24} />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Chưa có thông báo nào</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              Bấm nút &quot;Tạo thông báo mới&quot; ở góc trên để tạo thông báo broadcast đầu tiên cho trang xem phim.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
            {notifications.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Pill */}
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        item.isActive
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-neutral-400"}`} />
                      {item.isActive ? "Đang phát" : "Tạm ẩn"}
                    </span>

                    {/* Tag Badge */}
                    {item.tag && (
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getTagBadgeStyle(
                          item.tag,
                        )}`}
                      >
                        {item.tag}
                      </span>
                    )}

                    {/* Priority Badge */}
                    {item.priority > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                        <IconPin size={11} />
                        Ưu tiên +{item.priority}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white leading-snug">
                    {item.title}
                  </h4>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-3xl">
                    {item.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1">
                      <IconCalendar size={13} />
                      {new Date(item.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-blue-500 hover:underline"
                      >
                        <IconExternalLink size={13} />
                        <span>{item.link}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleToggle(item)}
                    title={item.isActive ? "Tạm ẩn thông báo này" : "Kích hoạt phát sóng"}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      item.isActive
                        ? "text-amber-500 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20"
                        : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20"
                    }`}
                  >
                    {item.isActive ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                    <span>{item.isActive ? "Ẩn" : "Bật"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(item)}
                    title="Chỉnh sửa thông báo"
                    className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-white/[0.08] transition-all cursor-pointer"
                  >
                    <IconEdit size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    title="Xóa vĩnh viễn"
                    className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-all cursor-pointer"
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Create / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/[0.1] rounded-3xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <IconSpeakerphone size={18} />
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {editingItem ? "Chỉnh sửa thông báo" : "Tạo thông báo mới"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Tiêu đề thông báo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ví dụ: Chào mừng bạn đến với NetPhim"
                  className="w-full px-3.5 py-2 text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-white/[0.08] rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Nội dung thông báo <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Nhập nội dung ngắn gọn, rõ ràng hiển thị trong popup..."
                  className="w-full px-3.5 py-2 text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-white/[0.08] rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-blue-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Phân loại / Tag
                  </label>
                  <select
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-white/[0.08] rounded-xl text-neutral-900 dark:text-white outline-none focus:border-blue-500"
                  >
                    <option value="Hệ thống">Hệ thống</option>
                    <option value="Tính năng">Tính năng</option>
                    <option value="Watch Party">Watch Party</option>
                    <option value="Bảo trì">Bảo trì</option>
                    <option value="Sự kiện">Sự kiện</option>
                    <option value="Khuyến mãi">Khuyến mãi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Độ ưu tiên ghim
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) || 0 })}
                    placeholder="0 = Mặc định"
                    className="w-full px-3.5 py-2 text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-white/[0.08] rounded-xl text-neutral-900 dark:text-white outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Số càng cao càng ghim lên trên</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Đường dẫn liên kết (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="Ví dụ: /films/series hoặc https://..."
                  className="w-full px-3.5 py-2 text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-white/[0.08] rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer">
                  Kích hoạt phát sóng ngay (Người dùng sẽ nhìn thấy thông báo này)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitting ? "Đang lưu..." : editingItem ? "Lưu thay đổi" : "Tạo & Phát sóng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
