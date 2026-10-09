"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  IconWorldDownload,
  IconDownload,
  IconMovie,
  IconPlayerPlay,
  IconRefresh,
  IconCheck,
  IconAlertCircle,
  IconServer,
  IconLayersLinked,
  IconListCheck,
  IconClock,
  IconX,
  IconUpload,
  IconExternalLink,
  IconActivity,
  IconFlame,
} from "@tabler/icons-react";
import { adminFetch } from "@/lib/admin-api";

type CrawlerJob = {
  id: string;
  provider: string;
  category: string;
  startPage: number;
  endPage: number;
  currentPage: number;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  deep: boolean;
  totalMoviesFound: number;
  moviesProcessed: number;
  moviesCreated: number;
  moviesUpdated: number;
  episodesImported: number;
  errors: string[];
  logs: string[];
  startedAt: string;
  finishedAt?: string;
};

type SingleResult = {
  success: boolean;
  provider: string;
  slug: string;
  title: string;
  created: boolean;
  episodeCount: number;
  servers: string[];
  movie: {
    id: string;
    title: string;
    originName?: string;
    year?: number;
    posterUrl?: string;
    genres?: string[];
    quality?: string;
  };
};

type MediaJob = {
  id: string;
  movieId: string;
  episodeKey: string;
  serverName: string;
  status: string;
  progress: number;
  sourceWidth?: number;
  sourceHeight?: number;
  manifestUrl?: string;
  errorMessage?: string;
  createdAt: string;
};

export default function CrawlerPage() {
  const [activeTab, setActiveTab] = useState<"single" | "batch" | "upload" | "storyboard" | "jobs">("single");

  // Single Ingest State
  const [singleInput, setSingleInput] = useState("");
  const [singleProvider, setSingleProvider] = useState("auto");
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleResult, setSingleResult] = useState<SingleResult | null>(null);

  // Batch Ingest State
  const [batchProvider, setBatchProvider] = useState("kkphim");
  const [batchCategory, setBatchCategory] = useState("phim-moi-cap-nhat");
  const [batchStartPage, setBatchStartPage] = useState(1);
  const [batchEndPage, setBatchEndPage] = useState(3);
  const [batchDeep, setBatchDeep] = useState(true);
  const [batchDelay, setBatchDelay] = useState(350);
  const [batchLoading, setBatchLoading] = useState(false);

  // Video Upload & Transcode State
  const [uploadMovieId, setUploadMovieId] = useState("");
  const [uploadEpisodeKey, setUploadEpisodeKey] = useState("full");
  const [uploadEpisodeName, setUploadEpisodeName] = useState("Tập Full");
  const [uploadServerName, setUploadServerName] = useState("FlexPhim HLS VIP");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [mediaJobs, setMediaJobs] = useState<MediaJob[]>([]);


  // Storyboard Generation State (0ms Scrubbing)
  const [sbMovieId, setSbMovieId] = useState("");
  const [sbEpisodeKey, setSbEpisodeKey] = useState("");
  const [sbInterval, setSbInterval] = useState(5);
  const [sbLoading, setSbLoading] = useState(false);
  const [sbResult, setSbResult] = useState<any>(null);

  // Jobs Monitor State
  const [jobs, setJobs] = useState<CrawlerJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<CrawlerJob | null>(null);

  // Global Alerts
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadJobs = useCallback(async () => {
    try {
      const data = await adminFetch<CrawlerJob[]>("crawler/jobs");
      if (Array.isArray(data)) {
        setJobs(data);
        if (selectedJob) {
          const updated = data.find((j) => j.id === selectedJob.id);
          if (updated) setSelectedJob(updated);
        }
      }
    } catch {
      // Quiet fail on polling
    }
  }, [selectedJob]);

  const loadMediaJobs = useCallback(async () => {
    try {
      const data = await adminFetch<MediaJob[]>("media/uploads");
      if (Array.isArray(data)) setMediaJobs(data);
    } catch {
      // Quiet fail
    }
  }, []);

  // Initial load
  useEffect(() => {
    void loadJobs();
    void loadMediaJobs();
  }, [loadJobs, loadMediaJobs]);

  // Polling when jobs or upload tab is active
  useEffect(() => {
    if (activeTab !== "jobs" && activeTab !== "upload") return;
    const interval = setInterval(() => {
      if (activeTab === "jobs") void loadJobs();
      if (activeTab === "upload") void loadMediaJobs();
    }, 3000);
    return () => clearInterval(interval);
  }, [activeTab, loadJobs, loadMediaJobs]);

  // Handler: Single Movie Crawl
  async function handleSingleCrawl(e: FormEvent) {
    e.preventDefault();
    if (!singleInput.trim()) {
      setError("Vui lòng nhập slug hoặc đường dẫn phim cần cào.");
      return;
    }
    setSingleLoading(true);
    setError("");
    setMessage("");
    setSingleResult(null);

    try {
      const res = await adminFetch<SingleResult>("crawler/single", {
        method: "POST",
        body: JSON.stringify({
          slugOrUrl: singleInput.trim(),
          provider: singleProvider === "auto" ? undefined : singleProvider,
        }),
      });
      setSingleResult(res);
      setMessage(
        `Đã cào phim '${res.title}' thành công! Bóc tách được ${res.episodeCount} tập phim từ ${res.servers.length} máy chủ.`
      );
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Cào phim thất bại");
    } finally {
      setSingleLoading(false);
    }
  }

  // Handler: Batch Crawl
  async function handleBatchCrawl(e: FormEvent) {
    e.preventDefault();
    setBatchLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await adminFetch<CrawlerJob>("crawler/batch", {
        method: "POST",
        body: JSON.stringify({
          provider: batchProvider,
          category: batchCategory,
          startPage: Number(batchStartPage),
          endPage: Number(batchEndPage),
          deep: batchDeep,
          delayMs: Number(batchDelay),
        }),
      });
      setMessage(`Đã khởi chạy tiến trình cào hàng loạt #${res.id}. Xem tiến độ ở tab Giám sát!`);
      setActiveTab("jobs");
      void loadJobs();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Khởi chạy cào hàng loạt thất bại");
    } finally {
      setBatchLoading(false);
    }
  }

  // Handler: Cancel Job
  async function handleCancelJob(id: string) {
    try {
      await adminFetch(`crawler/jobs/${id}/cancel`, { method: "POST" });
      setMessage(`Đã gửi lệnh hủy tiến trình #${id}`);
      void loadJobs();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Hủy tiến trình thất bại");
    }
  }


  // Handler: Generate Storyboard VTT & Sprites
  async function handleGenerateStoryboard(e?: FormEvent, targetMovieId?: string) {
    if (e) e.preventDefault();
    const movieSlug = targetMovieId || sbMovieId.trim();
    if (!movieSlug) {
      setError("Vui lòng nhập slug phim (Movie ID).");
      return;
    }

    setSbLoading(true);
    setError("");
    setMessage("");

    try {
      if (sbEpisodeKey.trim()) {
        const res = await adminFetch<any>("storyboard/generate", {
          method: "POST",
          body: JSON.stringify({
            movieId: movieSlug,
            episodeKey: sbEpisodeKey.trim(),
            intervalSeconds: Number(sbInterval) || 5,
          }),
        });
        setSbResult(res);
        setMessage(`Đã tạo thành công Storyboard tua nhanh cho ${movieSlug} (tập ${sbEpisodeKey})!`);
      } else {
        const res = await adminFetch<any>("storyboard/generate-movie", {
          method: "POST",
          body: JSON.stringify({ movieId: movieSlug }),
        });
        setSbResult(res);
        setMessage(res.message);
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Tạo storyboard thất bại");
    } finally {
      setSbLoading(false);
    }
  }

  // Handler: Video Upload & Transcode
  async function handleMediaUpload(e: FormEvent) {
    e.preventDefault();
    if (!uploadFile) {
      setError("Vui lòng chọn file video để tải lên.");
      return;
    }
    if (!uploadMovieId.trim()) {
      setError("Vui lòng nhập slug phim (Movie ID).");
      return;
    }

    setUploadLoading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("video", uploadFile);
      formData.append("movieId", uploadMovieId.trim());
      formData.append("episodeKey", uploadEpisodeKey.trim() || "full");
      formData.append("episodeName", uploadEpisodeName.trim() || "Tập Full");
      formData.append("serverName", uploadServerName.trim() || "FlexPhim HLS VIP");

      const res = await fetch("/api/v1/admin/media/uploads", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Tải lên thất bại với mã ${res.status}`);
      }

      setMessage("Video đã được tải lên! FFmpeg đang transcode ABR (1080p, 720p, 480p) ở nền.");
      setUploadFile(null);
      void loadMediaJobs();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Tải lên video thất bại");
    } finally {
      setUploadLoading(false);
    }
  }

  return (
    <div className="admin-fade-in space-y-6">
      {/* Page Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
              CRAWLER & INGESTION
            </span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Engine Online (KKPhim + NguonC + OPhim + OnFlix)
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            Trung tâm Cào phim & Xử lý Media
          </h1>
          <p className="text-[12px] text-slate-500">
            Công cụ bóc tách sâu toàn bộ metadata, máy chủ, danh sách tập và link phát HLS m3u8 tự động.
          </p>
        </div>

        <button
          onClick={() => {
            void loadJobs();
            void loadMediaJobs();
          }}
          className="admin-control inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium"
        >
          <IconRefresh size={14} /> Làm mới
        </button>
      </header>

      {/* Global Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300">
          <IconAlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300">
          <IconCheck size={16} className="shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--admin-line)] pb-3">
        <button
          onClick={() => setActiveTab("single")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold transition-colors ${
            activeTab === "single"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <IconFlame size={15} /> Cào nhanh theo Slug / Link
        </button>

        <button
          onClick={() => setActiveTab("batch")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold transition-colors ${
            activeTab === "batch"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <IconWorldDownload size={15} /> Cào hàng loạt theo dải trang
        </button>

        <button
          onClick={() => setActiveTab("upload")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold transition-colors ${
            activeTab === "upload"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <IconUpload size={15} /> Tải lên & Transcode HLS ABR (FFmpeg)
        </button>


        <button
          onClick={() => setActiveTab("storyboard")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold transition-colors ${
            activeTab === "storyboard"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <IconPlayerPlay size={15} /> Tạo Storyboard Tua 0ms (FFmpeg)
        </button>

        <button
          onClick={() => setActiveTab("jobs")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold transition-colors ${
            activeTab === "jobs"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <IconActivity size={15} />
          Giám sát Jobs ({jobs.filter((j) => j.status === "running").length} đang chạy)
        </button>
      </div>

      {/* ─────────────────── TAB 1: SINGLE CRAWL ─────────────────── */}
      {activeTab === "single" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="admin-card p-5 space-y-4">
              <div>
                <h2 className="text-[14px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <IconDownload size={18} className="text-blue-600" />
                  Cào tức thì một bộ phim (Deep Ingestion)
                </h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  Nhập slug phim hoặc dán thẳng đường dẫn URL từ KKPhim, NguonC hoặc OPhim.
                  Hệ thống tự động tải metadata, toàn bộ danh sách tập và lưu link phát m3u8 vào cơ sở dữ liệu.
                </p>
              </div>

              <form onSubmit={handleSingleCrawl} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Slug phim hoặc URL đầy đủ
                  </label>
                  <input
                    type="text"
                    value={singleInput}
                    onChange={(e) => setSingleInput(e.target.value)}
                    placeholder="Ví dụ: ngoi-truong-xac-song hoặc https://phimapi.com/phim/tan-thuoc"
                    className="w-full rounded-lg border border-[var(--admin-line)] bg-transparent p-2.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-slate-400">
                    <span>Gợi ý thử nghiệm:</span>
                    <button
                      type="button"
                      onClick={() => setSingleInput("tan-thuoc")}
                      className="text-blue-500 hover:underline"
                    >
                      tan-thuoc
                    </button>
                    •
                    <button
                      type="button"
                      onClick={() => setSingleInput("cuc-quan-ly-ky-uc-phan-1")}
                      className="text-blue-500 hover:underline"
                    >
                      cuc-quan-ly-ky-uc-phan-1
                    </button>
                    •
                    <button
                      type="button"
                      onClick={() => setSingleInput("squid-game")}
                      className="text-blue-500 hover:underline"
                    >
                      squid-game
                    </button>
                    •
                    <button
                      type="button"
                      onClick={() => setSingleInput("nguoi-nhen-khoi-dau-moi")}
                      className="text-emerald-500 font-medium hover:underline"
                    >
                      nguoi-nhen-khoi-dau-moi (OnFlix)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nguồn cung cấp (Provider)
                  </label>
                  <select
                    value={singleProvider}
                    onChange={(e) => setSingleProvider(e.target.value)}
                    className="w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface)] p-2.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="auto">Tự động nhận diện theo URL (Auto)</option>
                    <option value="onflix">OnFlix (onflix.lat) — Đa nguồn NC/OP/PA/SN + TMDB</option>
                    <option value="kkphim">KKPhim (phimapi.com) — Nguồn nhanh, ổn định</option>
                    <option value="nguonc">NguonC (phim.nguonc.com) — Đa dạng phim bộ</option>
                    <option value="ophim">OPhim (ophim1.com) — Kho phim kinh điển</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={singleLoading}
                  className="admin-primary-button w-full justify-center py-2.5 text-[12px] font-semibold shadow-sm"
                >
                  {singleLoading ? (
                    <span className="flex items-center gap-2">
                      <IconRefresh className="animate-spin" size={16} /> Đang bóc tách metadata và danh sách tập...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <IconDownload size={16} /> Bắt đầu Cào & Nạp Tập Phim
                    </span>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Preview Card */}
          <div className="lg:col-span-5">
            <div className="admin-card p-5 h-full">
              <h3 className="text-[13px] font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <IconMovie size={16} className="text-blue-500" />
                Kết quả bóc tách gần nhất
              </h3>

              {singleResult ? (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    {singleResult.movie.posterUrl ? (
                      <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                        <Image
                          src={singleResult.movie.posterUrl}
                          alt={singleResult.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="flex h-36 w-24 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
                        <IconMovie size={28} />
                      </div>
                    )}

                    <div className="min-w-0 space-y-1">
                      <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                        {singleResult.provider}
                      </span>
                      <h4 className="text-[14px] font-bold text-slate-800 dark:text-white truncate">
                        {singleResult.title}
                      </h4>
                      {singleResult.movie.originName && (
                        <p className="text-[11px] text-slate-400 truncate">
                          {singleResult.movie.originName}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500">
                        Năm: <strong>{singleResult.movie.year || "N/A"}</strong> • Chất lượng:{" "}
                        <strong>{singleResult.movie.quality || "HD"}</strong>
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
                        <IconCheck size={14} />
                        Đã nhập: {singleResult.episodeCount} tập phim
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-[var(--admin-line)] pt-3">
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Máy chủ phát hiện ({singleResult.servers.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {singleResult.servers.map((s, idx) => (
                        <span
                          key={idx}
                          className="rounded border border-[var(--admin-line)] bg-[var(--admin-surface)] px-2 py-1 text-[10px] font-medium text-slate-600 dark:text-slate-300"
                        >
                          <IconServer size={11} className="inline mr-1 text-blue-500" />
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <a
                      href={`http://localhost:3000/film/${singleResult.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-control inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-blue-600"
                    >
                      <IconExternalLink size={13} /> Mở trang Web
                    </a>
                    <a
                      href={`/movies?search=${encodeURIComponent(singleResult.slug)}`}
                      className="admin-control inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold"
                    >
                      Quản lý trong Thư viện
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex h-56 flex-col items-center justify-center text-center text-slate-400">
                  <IconLayersLinked size={36} className="text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-[12px]">Chưa có kết quả cào mới nào.</p>
                  <p className="text-[10px] text-slate-500">
                    Nhập slug và bấm &quot;Bắt đầu Cào&quot; để xem thông tin chi tiết.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 2: BATCH CRAWL ─────────────────── */}
      {activeTab === "batch" && (
        <div className="admin-card p-5 max-w-3xl space-y-4">
          <div>
            <h2 className="text-[14px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <IconWorldDownload size={18} className="text-blue-600" />
              Cào hàng loạt theo dải trang & danh mục (Bulk Crawler)
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              Tiến trình sẽ chạy ngầm không làm đơ giao diện. Hệ thống tự động điều tiết tốc độ (Rate Limit) để tránh bị chặn IP.
            </p>
          </div>

          <form onSubmit={handleBatchCrawl} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nguồn dữ liệu
                </label>
                <select
                  value={batchProvider}
                  onChange={(e) => setBatchProvider(e.target.value)}
                  className="w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface)] p-2.5 text-[12px]"
                >
                  <option value="onflix">OnFlix (Hơn 59.000 phim, Đa nguồn Stream NC/OP/PA/SN)</option>
                  <option value="kkphim">KKPhim (Hơn 20.000 phim, ổn định nhất)</option>
                  <option value="nguonc">NguonC (Nhiều phim bộ, cập nhật nhanh)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phân loại cào
                </label>
                <select
                  value={batchCategory}
                  onChange={(e) => setBatchCategory(e.target.value)}
                  className="w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface)] p-2.5 text-[12px]"
                >
                  <option value="phim-moi-cap-nhat">Phim mới cập nhật (Khuyên dùng)</option>
                  <option value="phim-bo">Phim bộ (Series)</option>
                  <option value="phim-le">Phim lẻ (Single Movies)</option>
                  <option value="hoat-hinh">Hoạt hình / Anime</option>
                  <option value="tv-shows">TV Shows</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Từ trang
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={batchStartPage}
                  onChange={(e) => setBatchStartPage(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--admin-line)] bg-transparent p-2 text-[12px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Đến trang
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={batchEndPage}
                  onChange={(e) => setBatchEndPage(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--admin-line)] bg-transparent p-2 text-[12px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Độ trễ mỗi phim (ms)
                </label>
                <input
                  type="number"
                  min={100}
                  max={3000}
                  step={50}
                  value={batchDelay}
                  onChange={(e) => setBatchDelay(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--admin-line)] bg-transparent p-2 text-[12px]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="batchDeep"
                checked={batchDeep}
                onChange={(e) => setBatchDeep(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="batchDeep" className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                Cào sâu chi tiết tập phim (Deep Crawl: Lấy toàn bộ link phát m3u8 và các máy chủ)
              </label>
            </div>

            <button
              type="submit"
              disabled={batchLoading}
              className="admin-primary-button w-full justify-center py-2.5 text-[12px] font-semibold shadow-sm"
            >
              {batchLoading ? (
                <span className="flex items-center gap-2">
                  <IconRefresh className="animate-spin" size={16} /> Đang khởi động tiến trình...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <IconWorldDownload size={16} /> Bắt đầu Cào Hàng Loạt
                </span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ─────────────────── TAB 3: VIDEO UPLOAD (FFMPEG ABR) ─────────────────── */}
      {activeTab === "upload" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="admin-card p-5 space-y-4">
              <div>
                <h2 className="text-[14px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <IconUpload size={18} className="text-blue-600" />
                  Tải lên Video & Transcode FFmpeg Adaptive Bitrate (ABR)
                </h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  Tải lên file video gốc (MP4, MKV). FFmpeg sẽ tự động phân giải thành đa luồng (1080p, 720p, 480p),
                  tạo file <code className="text-blue-500">master.m3u8</code> và gán trực tiếp vào tập phim.
                </p>
              </div>

              <form onSubmit={handleMediaUpload} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Slug phim (Movie ID)
                  </label>
                  <input
                    type="text"
                    value={uploadMovieId}
                    onChange={(e) => setUploadMovieId(e.target.value)}
                    placeholder="Ví dụ: squid-game"
                    className="w-full rounded-lg border border-[var(--admin-line)] bg-transparent p-2 text-[12px]"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mã tập (Episode Key)
                    </label>
                    <input
                      type="text"
                      value={uploadEpisodeKey}
                      onChange={(e) => setUploadEpisodeKey(e.target.value)}
                      placeholder="tap-1 hoặc full"
                      className="w-full rounded-lg border border-[var(--admin-line)] bg-transparent p-2 text-[12px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tên hiển thị tập
                    </label>
                    <input
                      type="text"
                      value={uploadEpisodeName}
                      onChange={(e) => setUploadEpisodeName(e.target.value)}
                      placeholder="Tập 1 hoặc Full HD"
                      className="w-full rounded-lg border border-[var(--admin-line)] bg-transparent p-2 text-[12px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên máy chủ (Server Name)
                  </label>
                  <input
                    type="text"
                    value={uploadServerName}
                    onChange={(e) => setUploadServerName(e.target.value)}
                    placeholder="FlexPhim HLS VIP"
                    className="w-full rounded-lg border border-[var(--admin-line)] bg-transparent p-2 text-[12px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    File Video gốc (.mp4, .mkv, .webm)
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full rounded-lg border border-dashed border-[var(--admin-line)] bg-[var(--admin-surface)] p-3 text-[11px]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploadLoading}
                  className="admin-primary-button w-full justify-center py-2.5 text-[12px] font-semibold shadow-sm"
                >
                  {uploadLoading ? (
                    <span className="flex items-center gap-2">
                      <IconRefresh className="animate-spin" size={16} /> Đang tải video lên server...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <IconUpload size={16} /> Tải lên & Khởi chạy Transcode ABR
                    </span>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="admin-card p-5 space-y-3">
              <h3 className="text-[13px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <IconPlayerPlay size={16} className="text-blue-500" />
                Danh sách tác vụ Transcode gần đây
              </h3>

              <div className="divide-y divide-[var(--admin-line)]">
                {mediaJobs.length === 0 ? (
                  <p className="p-6 text-center text-[11px] text-slate-400">
                    Chưa có video nào được tải lên trực tiếp.
                  </p>
                ) : (
                  mediaJobs.slice(0, 10).map((mj) => (
                    <div key={mj.id} className="py-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <strong className="text-[12px] text-slate-800 dark:text-white">
                          {mj.movieId} ({mj.episodeKey})
                        </strong>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            mj.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : mj.status === "FAILED"
                              ? "bg-rose-500/10 text-rose-600"
                              : "bg-blue-500/10 text-blue-600 animate-pulse"
                          }`}
                        >
                          {mj.status} {mj.status === "PROCESSING" && `${mj.progress}%`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Server: {mj.serverName}</span>
                        <span>{new Date(mj.createdAt).toLocaleTimeString("vi-VN")}</span>
                      </div>
                      {mj.manifestUrl && (
                        <div className="truncate text-[10px] text-blue-500 font-mono">
                          HLS: {mj.manifestUrl}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 4: LIVE JOBS MONITOR ─────────────────── */}
      {activeTab === "jobs" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Jobs List */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <IconListCheck size={18} className="text-blue-600" />
                Tiến trình cào phim ({jobs.length})
              </h2>
              <span className="text-[11px] text-slate-400">Tự động cập nhật mỗi 3 giây</span>
            </div>

            {jobs.length === 0 ? (
              <div className="admin-card p-8 text-center text-[12px] text-slate-400">
                Chưa có tiến trình cào nào được ghi nhận trong phiên này.
              </div>
            ) : (
              jobs.map((job) => {
                const totalPages = Math.max(1, job.endPage - job.startPage + 1);
                const currentProgress = Math.min(
                  100,
                  Math.round(((job.currentPage - job.startPage + 1) / totalPages) * 100)
                );
                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`admin-card p-4 cursor-pointer transition-all hover:border-blue-500/50 ${
                      selectedJob?.id === job.id ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-600">
                            {job.provider}
                          </span>
                          <span className="text-[12px] font-bold text-slate-800 dark:text-white">
                            {job.category}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">
                          Trang {job.currentPage}/{job.endPage} • Đã xử lý:{" "}
                          <strong className="text-slate-700 dark:text-slate-200">
                            {job.moviesProcessed} phim
                          </strong>{" "}
                          • Nạp được:{" "}
                          <strong className="text-emerald-600">{job.episodesImported} tập</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase ${
                            job.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : job.status === "failed"
                              ? "bg-rose-500/10 text-rose-600"
                              : job.status === "cancelled"
                              ? "bg-slate-500/10 text-slate-500"
                              : "bg-blue-500/10 text-blue-600 animate-pulse"
                          }`}
                        >
                          {job.status}
                        </span>

                        {job.status === "running" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleCancelJob(job.id);
                            }}
                            className="admin-icon-button text-rose-600 hover:bg-rose-50"
                            title="Hủy tiến trình"
                          >
                            <IconX size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-full transition-all duration-300 ${
                            job.status === "completed"
                              ? "bg-emerald-500"
                              : job.status === "failed"
                              ? "bg-rose-500"
                              : "bg-blue-600"
                          }`}
                          style={{ width: `${currentProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Real-time Log Console */}
          <div className="lg:col-span-5">
            <div className="admin-card p-4 h-full flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-line)] mb-3">
                <h3 className="text-[12px] font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <IconClock size={15} className="text-blue-500" />
                  Nhật ký chi tiết {selectedJob ? `#${selectedJob.id}` : ""}
                </h3>
                {selectedJob && (
                  <span className="text-[10px] text-slate-400">
                    {selectedJob.logs.length} dòng
                  </span>
                )}
              </div>

              {selectedJob ? (
                <div className="flex-1 overflow-y-auto max-h-[480px] rounded bg-slate-950 p-3 font-mono text-[10px] text-emerald-400 space-y-1">
                  {selectedJob.logs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed">
                      {log}
                    </div>
                  ))}
                  {selectedJob.errors.length > 0 && (
                    <div className="pt-2 text-rose-400 border-t border-slate-800">
                      <strong>Lỗi phát sinh:</strong>
                      {selectedJob.errors.map((err, idx) => (
                        <div key={idx}>• {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center p-8 text-[11px] text-slate-400">
                  Chọn một Job từ danh sách bên trái để xem nhật ký hoạt động thời gian thực.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
