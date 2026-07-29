"use client";

import { useState } from "react";
import {
  Film,
  Search,
  Filter,
  Eye,
  EyeOff,
  Edit,
  Layers,
  RefreshCw,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  Plus,
  Trash2,
} from "lucide-react";

// Mock Movie Items (Server-side paginated)
const INITIAL_MOVIES = [
  {
    id: "bo-gia",
    title: "Bố Già",
    originName: "Dad, I'm Sorry",
    posterUrl: "https://img.phimapi.com/upload/vod/20240101/bo-gia.jpg",
    year: 2021,
    type: "single",
    sources: ["kkphim", "ophim"],
    isHidden: false,
    description: "Bộ phim điện ảnh tâm lý tình cảm gia đình nổi tiếng của Trấn Thành.",
  },
  {
    id: "bo-ngua",
    title: "Bọ Ngựa",
    originName: "Queen Mantis",
    posterUrl: "https://img.phimapi.com/upload/vod/20250101/bo-ngua.jpg",
    year: 2025,
    type: "series",
    sources: ["kkphim", "nguonc"],
    isHidden: false,
    description: "Phim truyền hình giật gân kịch tính mới nhất.",
  },
  {
    id: "bong-ma-bao-thu",
    title: "Bóng Ma Báo Thù",
    originName: "M.I.A.",
    posterUrl: "https://img.phimapi.com/upload/vod/20260101/bong-ma.jpg",
    year: 2026,
    type: "series",
    sources: ["kkphim", "ophim", "nguonc"],
    isHidden: true,
    description: "Hành trình báo thù ly kỳ trong bóng tối.",
  },
  {
    id: "bo-vo-toi-la-mafia",
    title: "Bố Vợ Tôi Là Mafia",
    originName: "Bapa Mentuaku Mafia",
    posterUrl: "https://img.phimapi.com/upload/vod/20260101/bo-vo.jpg",
    year: 2026,
    type: "series",
    sources: ["kkphim"],
    isHidden: false,
    description: "Phim hài hước hành động đặc sắc.",
  },
];

export default function MovieManagementPage() {
  const [movies, setMovies] = useState(INITIAL_MOVIES);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Edit Modal State
  const [editingMovie, setEditingMovie] = useState<any>(null);
  // Source Merge/Split Modal State
  const [sourcesMovie, setSourcesMovie] = useState<any>(null);
  // Sync Toast State
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Filter movies
  const filteredMovies = movies.filter((m) => {
    if (search && !m.title.toLowerCase().includes(search.toLowerCase()) && !m.originName.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (typeFilter !== "all" && m.type !== typeFilter) return false;
    if (sourceFilter !== "all" && !m.sources.includes(sourceFilter)) return false;
    if (statusFilter === "hidden" && !m.isHidden) return false;
    if (statusFilter === "visible" && m.isHidden) return false;
    return true;
  });

  // Toggle Hide/Unhide
  const handleToggleHide = (id: string) => {
    setMovies((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isHidden: !m.isHidden } : m))
    );
  };

  // Trigger Manual Sync
  const handleTriggerSync = (sourceName: string) => {
    setSyncStatus(`Đã phát lệnh kích hoạt job BullMQ đồng bộ cho nguồn [${sourceName.toUpperCase()}]!`);
    setTimeout(() => setSyncStatus(null), 4000);
  };

  // Save Metadata Edit
  const handleSaveMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovie) return;
    setMovies((prev) =>
      prev.map((m) => (m.id === editingMovie.id ? editingMovie : m))
    );
    setEditingMovie(null);
  };

  // Save Sources Merge/Split
  const handleSaveSources = (newSources: string[]) => {
    if (!sourcesMovie) return;
    setMovies((prev) =>
      prev.map((m) => (m.id === sourcesMovie.id ? { ...m, sources: newSources } : m))
    );
    setSourcesMovie(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#30363d] pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Film size={22} className="text-purple-400" />
            <span>Quản Lý Danh Sách Phim</span>
            <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded font-mono font-medium">
              GIAI ĐOẠN 1
            </span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Kiểm tra nguồn hợp nhất, đồng bộ BullMQ thủ công, ẩn/hiện và sửa metadata phim
          </p>
        </div>

        {/* ── Manual Sync Buttons per Source ── */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 font-bold uppercase mr-1">Đồng bộ ngay:</span>
          {["kkphim", "ophim", "nguonc"].map((src) => (
            <button
              key={src}
              onClick={() => handleTriggerSync(src)}
              className="flex items-center gap-1.5 bg-[#161b22] hover:bg-blue-600/20 text-neutral-300 hover:text-blue-400 border border-[#30363d] hover:border-blue-500/40 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw size={12} />
              <span className="uppercase">{src}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sync Status Alert Toast */}
      {syncStatus && (
        <div className="bg-blue-600/15 border border-blue-500/30 text-blue-300 p-3 rounded-lg text-xs font-semibold flex items-center justify-between animate-fade-in">
          <span>⚡ {syncStatus}</span>
          <button onClick={() => setSyncStatus(null)}><X size={14} /></button>
        </div>
      )}

      {/* ── Filter & Search Toolbar ── */}
      <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên phim, tên gốc..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-neutral-300 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="all">Tất cả loại phim</option>
            <option value="series">Phim Bộ</option>
            <option value="single">Phim Lẻ</option>
            <option value="hoathinh">Hoạt Hình</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-neutral-300 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="all">Tất cả nguồn (3 APIs)</option>
            <option value="kkphim">KKPhim</option>
            <option value="ophim">OPhim</option>
            <option value="nguonc">NguonC</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-neutral-300 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="visible">Đang hiển thị</option>
            <option value="hidden">Đã ẩn (Khoá)</option>
          </select>
        </div>
      </div>

      {/* ── Server-Side Paginated Table ── */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#30363d] text-neutral-400 uppercase text-[10px] tracking-wider bg-[#0d1117]/60">
              <th className="py-3.5 px-4 font-bold">Phim</th>
              <th className="py-3.5 px-4 font-bold w-24">Loại</th>
              <th className="py-3.5 px-4 font-bold w-32">Nguồn Tích Hợp</th>
              <th className="py-3.5 px-4 font-bold w-28">Trạng Thái</th>
              <th className="py-3.5 px-4 font-bold w-36 text-right">Thao Tác Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262d]">
            {filteredMovies.map((film) => (
              <tr key={film.id} className={`hover:bg-white/[0.02] transition-colors ${film.isHidden ? "opacity-60 bg-red-500/[0.02]" : ""}`}>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-14 bg-neutral-900 rounded overflow-hidden shrink-0 border border-white/10 relative">
                      {film.posterUrl ? (
                        <img src={film.posterUrl} alt={film.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600">🎬</div>
                      )}
                      {film.isHidden && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-red-400">
                          <EyeOff size={14} />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm line-clamp-1">{film.title}</h4>
                      <p className="text-[11px] text-neutral-400">{film.originName} ({film.year})</p>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-semibold text-neutral-300 capitalize">
                  {film.type === "series" ? "Phim Bộ" : "Phim Lẻ"}
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex flex-wrap gap-1">
                    {film.sources.map((src) => (
                      <span
                        key={src}
                        className="bg-blue-600/15 border border-blue-500/30 text-blue-400 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase"
                      >
                        {src}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  {film.isHidden ? (
                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1">
                      <EyeOff size={10} /> Đã Ẩn
                    </span>
                  ) : (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1">
                      <Eye size={10} /> Hiển Thị
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Inspect/Tách Gộp Sources */}
                    <button
                      onClick={() => setSourcesMovie(film)}
                      className="p-1.5 bg-[#0d1117] hover:bg-blue-600/20 text-neutral-400 hover:text-blue-400 border border-[#30363d] rounded-lg transition-colors"
                      title="Quản lý mảng nguồn Sources (Tách/Gộp thủ công)"
                    >
                      <Layers size={14} />
                    </button>

                    {/* Edit Metadata */}
                    <button
                      onClick={() => setEditingMovie({ ...film })}
                      className="p-1.5 bg-[#0d1117] hover:bg-white/10 text-neutral-400 hover:text-white border border-[#30363d] rounded-lg transition-colors"
                      title="Sửa metadata thủ công"
                    >
                      <Edit size={14} />
                    </button>

                    {/* Toggle Hide/Unhide */}
                    <button
                      onClick={() => handleToggleHide(film.id)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        film.isHidden
                          ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-600/30"
                          : "bg-red-600/20 text-red-400 border-red-500/40 hover:bg-red-600/30"
                      }`}
                      title={film.isHidden ? "Mở hiển thị lại cho User" : "Ẩn/Khoá phim khỏi User"}
                    >
                      {film.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Server Pagination Footer */}
        <div className="p-4 border-t border-[#30363d] bg-[#0d1117]/40 flex items-center justify-between text-xs text-neutral-400">
          <span>Hiển thị <strong>{filteredMovies.length}</strong> / <strong>{movies.length}</strong> phim</span>
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

      {/* ── Modal: Sửa Metadata Thủ Công ── */}
      {editingMovie && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit size={16} className="text-blue-400" />
                Sửa Metadata Thủ Công
              </h3>
              <button onClick={() => setEditingMovie(null)}><X size={16} className="text-neutral-400" /></button>
            </div>

            <form onSubmit={handleSaveMetadata} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Tên Phim</label>
                <input
                  type="text"
                  value={editingMovie.title}
                  onChange={(e) => setEditingMovie({ ...editingMovie, title: e.target.value })}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">URL Poster / Thumbnail</label>
                <input
                  type="text"
                  value={editingMovie.posterUrl}
                  onChange={(e) => setEditingMovie({ ...editingMovie, posterUrl: e.target.value })}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Mô tả Phim</label>
                <textarea
                  rows={4}
                  value={editingMovie.description}
                  onChange={(e) => setEditingMovie({ ...editingMovie, description: e.target.value })}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => setEditingMovie(null)}
                  className="px-4 py-2 bg-transparent text-neutral-400 hover:text-white font-semibold rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Xem Chi Tiết & Tách/Gộp Nguồn Sources ── */}
      {sourcesMovie && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers size={16} className="text-blue-400" />
                Mảng Nguồn Phim (Sources)
              </h3>
              <button onClick={() => setSourcesMovie(null)}><X size={16} className="text-neutral-400" /></button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-neutral-400">
                Phim <strong>{sourcesMovie.title}</strong> hiện hợp nhất dữ liệu từ các nguồn sau:
              </p>

              <div className="space-y-2">
                {["kkphim", "ophim", "nguonc"].map((src) => {
                  const isChecked = sourcesMovie.sources.includes(src);
                  return (
                    <label
                      key={src}
                      className="flex items-center justify-between bg-[#0d1117] border border-[#30363d] p-3 rounded-lg cursor-pointer hover:border-blue-500/50 transition-colors"
                    >
                      <span className="font-bold text-white uppercase">{src}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const nextSources = isChecked
                            ? sourcesMovie.sources.filter((s: string) => s !== src)
                            : [...sourcesMovie.sources, src];
                          setSourcesMovie({ ...sourcesMovie, sources: nextSources });
                        }}
                        className="w-4 h-4 accent-blue-600 rounded"
                      />
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30363d]">
                <button
                  onClick={() => handleSaveSources(sourcesMovie.sources)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow"
                >
                  Xác nhận Tách / Gộp Nguồn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
