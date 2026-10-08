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
  IconUpload as Upload,
  IconX as X,
  IconBolt as Zap,
  IconSparkles as Sparkles,
  IconPin as Pin,
} from "@tabler/icons-react";
import { adminFetch, queryString } from "@/lib/admin-api";
import { configurationUpdatePayload } from "@/lib/configuration-payload";

export type SubtitleItem = {
  label: string;
  url: string;
  language: string;
  default?: boolean;
};

export const normalizeSubtitles = (raw: any): SubtitleItem[] => {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) {
    return raw.map((item) => ({
      label: item.label || item.name || "Phụ đề",
      url: item.url || item.link || "",
      language: item.language || item.lang || "vi",
      default: Boolean(item.default),
    }));
  }
  if (typeof raw === "object" && raw !== null) {
    return Object.entries(raw).map(([key, val], idx) => ({
      label: key.toUpperCase(),
      url: String(val),
      language: key.toLowerCase(),
      default: idx === 0,
    }));
  }
  return [];
};

type PlaybackSource = {
  id?: string;
  provider: string;
  providerSlug: string;
  episodeKey: string;
  episodeName?: string;
  serverName: string;
  streamUrl?: string;
  subtitleUrls?: any;
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
type MediaUploadJob = {
  id: string;
  movieId: string;
  episodeKey: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  manifestUrl?: string;
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
  const [mediaJobs, setMediaJobs] = useState<MediaUploadJob[]>([]);
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
  const [pinnedHeroSlugs, setPinnedHeroSlugs] = useState<string[]>([]);

  const initialNewMovieState = {
    title: "",
    originName: "",
    slug: "",
    type: "single",
    year: new Date().getFullYear(),
    quality: "FHD",
    language: "Vietsub",
    posterUrl: "",
    trailerUrl: "",
    genres: "Hành Động, Viễn Tưởng",
    countries: "Hàn Quốc",
    description: "",
    serverName: "Server FP",
    episodeKey: "full",
    episodeName: "Tập Full",
    streamUrl: "",
    subtitles: [] as SubtitleItem[],
  };

  const [isCreating, setIsCreating] = useState(false);
  const [newMovie, setNewMovie] = useState(initialNewMovieState);
  const [newMovieFile, setNewMovieFile] = useState<File | null>(null);
  const [tmdbLookupQuery, setTmdbLookupQuery] = useState("");
  const [isFetchingTmdb, setIsFetchingTmdb] = useState(false);
  const [tmdbLookupError, setTmdbLookupError] = useState("");
  const [tmdbLookupSuccess, setTmdbLookupSuccess] = useState("");
  const [tmdbCandidates, setTmdbCandidates] = useState<any[]>([]);

    const handleTmdbLookup = async (overrideQuery?: string, pickFirst?: boolean) => {
    const q = (overrideQuery || tmdbLookupQuery).trim();
    if (!q) {
      setTmdbLookupError("Vui lòng nhập TMDB ID, link TMDB hoặc tên phim");
      return;
    }
    setIsFetchingTmdb(true);
    setTmdbLookupError("");
    setTmdbLookupSuccess("");
    setTmdbCandidates([]);

    try {
      const url = `/api/tmdb-lookup?query=${encodeURIComponent(q)}${pickFirst ? "&pick=first" : ""}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Không tìm thấy dữ liệu từ TMDB");
      }

      if (json.hasMultiple && Array.isArray(json.candidates) && json.candidates.length > 0) {
        setTmdbCandidates(json.candidates);
        setTmdbLookupSuccess(`Tìm thấy ${json.candidates.length} kết quả phù hợp. Hãy chọn đúng phim bên dưới:`);
        return;
      }

      if (json.success && json.data) {
        const d = json.data;
        setNewMovie((prev) => ({
          ...prev,
          title: d.title || prev.title,
          originName: d.originName || prev.originName,
          slug: d.slug || prev.slug,
          type: d.type || prev.type,
          year: d.year || prev.year,
          quality: d.quality || prev.quality,
          language: d.language || prev.language,
          posterUrl: d.posterUrl || prev.posterUrl,
          trailerUrl: d.trailerUrl || prev.trailerUrl,
          genres: d.genres || prev.genres,
          countries: d.countries || prev.countries,
          description: d.description || prev.description,
        }));
        setTmdbCandidates([]);
        setTmdbLookupSuccess(`Đã tự động điền thành công: "${d.title}" (${d.year})!`);
      }
    } catch (err: any) {
      setTmdbLookupError(err.message || "Lỗi khi lấy thông tin từ TMDB");
    } finally {
      setIsFetchingTmdb(false);
    }
  };

  const openCreateModal = () => {
    setNewMovie({
      ...initialNewMovieState,
      year: new Date().getFullYear(),
    });
    setNewMovieFile(null);
    setTmdbLookupQuery("");
    setTmdbLookupError("");
    setTmdbLookupSuccess("");
    setTmdbCandidates([]);
    setIsCreating(true);
  };

  const handleCreateMovie = async () => {
    if (!newMovie.title.trim()) {
      setError("Vui lòng nhập tên phim");
      return;
    }
    if (newMovieFile && newMovie.streamUrl.trim()) {
      setError("Chỉ chọn một nguồn ban đầu: tệp video hoặc link HLS.");
      return;
    }
    await mutate(
      "create-movie",
      async () => {
        const created = await adminFetch<{ id: string }>("movies", {
          method: "POST",
          body: JSON.stringify({
            title: newMovie.title.trim(),
            originName: newMovie.originName.trim() || undefined,
            id: newMovie.slug.trim() || undefined,
            type: newMovie.type,
            year: Number(newMovie.year) || new Date().getFullYear(),
            quality: newMovie.quality.trim() || "FHD",
            language: newMovie.language.trim() || "Vietsub",
            posterUrl: newMovie.posterUrl.trim() || undefined,
            trailerUrl: newMovie.trailerUrl.trim() || undefined,
            genres: newMovie.genres.split(",").map((s) => s.trim()).filter(Boolean),
            countries: newMovie.countries.split(",").map((s) => s.trim()).filter(Boolean),
            description: newMovie.description.trim() || undefined,
            sources: ["manual"],
          }),
        });

        if (newMovie.streamUrl.trim()) {
          const activeSubtitles = newMovie.subtitles
            .map((sub) => ({
              label: sub.label.trim() || "Phụ đề",
              url: sub.url.trim(),
              language: sub.language.trim() || "vi",
              default: Boolean(sub.default),
            }))
            .filter((sub) => Boolean(sub.url));

          await adminFetch(`movies/${created.id}/playback-sources`, {
            method: "PATCH",
            body: JSON.stringify({
              items: [
                {
                  provider: "custom",
                  providerSlug: created.id,
                  episodeKey: newMovie.episodeKey.trim() || "full",
                  episodeName:
                    newMovie.episodeName.trim() ||
                    (newMovie.type === "single" ? "Tập Full" : "Tập 01"),
                  serverName: newMovie.serverName.trim() || "FlexPhim VIP",
                  streamUrl: newMovie.streamUrl.trim(),
                  subtitleUrls: activeSubtitles.length ? activeSubtitles : undefined,
                  adCuePoints: [],
                  priority: 0,
                },
              ],
            }),
          });
        }
        if (newMovieFile) {
          const form = new FormData();
          form.set("file", newMovieFile);
          form.set("movieId", created.id);
          form.set("episodeKey", newMovie.episodeKey.trim() || "full");
          form.set(
            "episodeName",
            newMovie.episodeName.trim() ||
              (newMovie.type === "single" ? "Tập Full" : "Tập 01"),
          );
          form.set("serverName", newMovie.serverName.trim() || "FlexPhim VIP");
          await adminFetch("media/uploads", { method: "POST", body: form });
        }
        setIsCreating(false);
      },
      newMovieFile
        ? `Đã nhận phim "${newMovie.title}". Hệ thống đang chuyển mã HLS nền.`
        : `Đã tạo phim "${newMovie.title}" thành công.`,
    );
  };

  const load = useCallback(async () => {
    setError("");
    try {
      const [movies, syncJobs, uploads, siteConfig] = await Promise.all([
        adminFetch<PageData>(
          `movies?${queryString({ page, limit: 15, search, type, isHidden: hidden })}`,
        ),
        adminFetch<SyncJob[]>("sync-jobs?limit=8"),
        adminFetch<MediaUploadJob[]>("media/uploads"),
        adminFetch<{ heroMovieSlugs?: string[] }>("configuration").catch(() => null),
      ]);
      setData(movies);
      setJobs(syncJobs);
      setMediaJobs(uploads);
      if (Array.isArray(siteConfig?.heroMovieSlugs)) {
        setPinnedHeroSlugs(siteConfig.heroMovieSlugs);
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải thư viện",
      );
    }
  }, [hidden, page, search, type]);

  const togglePinHero = async (movie: Movie) => {
    setBusy(`pin:${movie.id}`);
    try {
      const config = await adminFetch<any>("configuration");
      const current = Array.isArray(config.heroMovieSlugs) ? config.heroMovieSlugs : [];
      const isPinned = current.includes(movie.id);
      if (!isPinned && current.length >= 12) {
        throw new Error("Đã đạt tối đa 12 phim trên Hero Banner. Vui lòng gỡ bớt phim cũ trước.");
      }
      const updated = isPinned
        ? current.filter((s: string) => s !== movie.id)
        : [...current, movie.id];

      await adminFetch("configuration", {
        method: "PATCH",
        body: JSON.stringify(configurationUpdatePayload({ ...config, heroMovieSlugs: updated })),
      });
      setPinnedHeroSlugs(updated);
      setNotice(
        isPinned
          ? `Đã bỏ ghim "${movie.title}" khỏi Hero Banner.`
          : `Đã ghim "${movie.title}" lên Hero Banner trang chủ!`,
      );
    } catch (err: any) {
      setError(err?.message || "Không thể cập nhật Hero Banner");
    } finally {
      setBusy("");
    }
  };

  useEffect(() => {
    if (!mediaJobs.some((job) => job.status === "QUEUED" || job.status === "PROCESSING")) return;
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load, mediaJobs]);

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
          ? structured.map((s) => ({
              ...s,
              subtitleUrls: normalizeSubtitles(s.subtitleUrls),
            }))
          : movie.sources.map((provider, index) => ({
              provider,
              providerSlug: movie.id,
              episodeKey: "catalog",
              episodeName: "Chờ đồng bộ chi tiết",
              serverName: provider.toUpperCase(),
              adCuePoints: [],
              priority: index,
              subtitleUrls: [],
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
                subtitleUrls: normalizeSubtitles(item.subtitleUrls).filter((s) => Boolean(s.url)),
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3.5 text-[12px] font-semibold text-white hover:bg-emerald-700 shadow-sm transition"
          >
            <Plus size={15} /> Tạo phim mới
          </button>
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

      {mediaJobs.length > 0 && (
        <section className="admin-card overflow-hidden">
          <div className="border-b border-[var(--admin-line)] px-5 py-4">
            <h2 className="text-[14px] font-bold text-slate-800">Tải lên và chuyển mã HLS</h2>
            <p className="mt-1 text-[11px] text-slate-400">
              Phim chỉ xuất hiện công khai sau khi playlist và toàn bộ segment đã tải lên thành công.
            </p>
          </div>
          <div className="divide-y divide-[var(--admin-line)]">
            {mediaJobs.slice(0, 12).map((job) => (
              <div key={job.id} className="grid gap-2 px-5 py-3 text-[11px] sm:grid-cols-[1fr_120px_2fr]">
                <div>
                  <strong className="text-slate-700">{job.movieId}</strong>
                  <span className="ml-2 text-slate-400">{job.episodeKey}</span>
                </div>
                <span className={job.status === "FAILED" ? "text-rose-600" : job.status === "COMPLETED" ? "text-emerald-600" : "text-violet-600"}>
                  {job.status === "QUEUED" ? "Đang chờ" : job.status === "PROCESSING" ? "Đang xử lý" : job.status === "COMPLETED" ? "Đã công bố" : "Thất bại"}
                </span>
                <div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${Math.max(0, Math.min(job.progress, 100))}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                    <span>{job.errorMessage || `${job.progress}%`}</span>
                    <time>{new Date(job.createdAt).toLocaleString("vi-VN")}</time>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
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
                        disabled={busy === `pin:${movie.id}`}
                        onClick={() => void togglePinHero(movie)}
                        className={`admin-icon-button !h-8 !w-8 transition-colors ${
                          pinnedHeroSlugs.includes(movie.id)
                            ? "!text-amber-500 !bg-amber-50 hover:!bg-amber-100"
                            : "text-slate-400 hover:text-amber-500"
                        }`}
                        title={
                          pinnedHeroSlugs.includes(movie.id)
                            ? "Đang ghim trên Hero Banner (bấm để gỡ)"
                            : "Ghim lên Hero Banner trang chủ"
                        }
                      >
                        <Pin
                          size={14}
                          className={pinnedHeroSlugs.includes(movie.id) ? "fill-amber-500 text-amber-500" : ""}
                        />
                      </button>
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
              {/* TMDB 1-Click Auto-Fill Tool */}
              <div className="sm:col-span-2 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-slate-50 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-sm">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-bold text-slate-800">
                        ⚡ Công cụ Tự Động Lấy Thông Tin Phim từ TMDB (1-Click)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Nhập TMDB ID (ví dụ: <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[10px]">1022789</code>), link phim TMDB hoặc tên phim. Hệ thống sẽ tự động điền tiêu đề, áp phích, trailer, thể loại, quốc gia, tóm tắt và tên tiếng Anh.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={tmdbLookupQuery}
                      onChange={(e) => setTmdbLookupQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleTmdbLookup();
                        }
                      }}
                      placeholder="Nhập TMDB ID (1022789), link TMDB hoặc tên phim (Inside Out 2, Squid Game...)"
                      className="admin-control w-full pl-8 pr-3 text-[12px] bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleTmdbLookup()}
                    disabled={isFetchingTmdb || !tmdbLookupQuery.trim()}
                    className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-blue-600 px-4 text-[12px] font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-sm shrink-0 cursor-pointer"
                  >
                    {isFetchingTmdb ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Sparkles size={13} />
                    )}
                    {isFetchingTmdb ? "Đang tải TMDB..." : "Lấy thông tin TMDB"}
                  </button>
                </div>

                {/* Example Quick Chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="font-semibold">Gợi ý thử:</span>
                  {[
                    { label: "Inside Out 2 (1022789)", q: "1022789" },
                    { label: "Arcane (94605)", q: "tv/94605" },
                    { label: "Lật Mặt 7", q: "Lat Mat 7" },
                  ].map((chip) => (
                    <button
                      key={chip.q}
                      type="button"
                      onClick={() => {
                        setTmdbLookupQuery(chip.q);
                        void handleTmdbLookup(chip.q, true);
                      }}
                      className="rounded bg-white px-2 py-0.5 border border-slate-200 hover:border-blue-400 hover:text-blue-600 transition cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Success Notice */}
                {tmdbLookupSuccess && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-[11px] font-medium text-emerald-800 flex items-center gap-2">
                    <Check size={14} className="text-emerald-600 shrink-0" />
                    <span>{tmdbLookupSuccess}</span>
                  </div>
                )}

                {/* Error Notice */}
                {tmdbLookupError && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-[11px] font-medium text-rose-700 flex items-center gap-2">
                    <X size={14} className="text-rose-500 shrink-0" />
                    <span>{tmdbLookupError}</span>
                  </div>
                )}

                {/* Candidate Selection Cards */}
                {tmdbCandidates.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-blue-200/60">
                    <p className="text-[11px] font-bold text-slate-700">
                      Chọn đúng phim từ danh sách TMDB:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                      {tmdbCandidates.map((cand) => (
                        <div
                          key={`${cand.mediaType}-${cand.id}`}
                          onClick={() => void handleTmdbLookup(`${cand.mediaType}/${cand.id}`)}
                          className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/50 transition cursor-pointer"
                        >
                          {cand.posterUrl ? (
                            <img
                              src={cand.posterUrl}
                              alt={cand.title}
                              className="w-10 h-14 object-cover rounded shrink-0 shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-14 bg-slate-100 rounded shrink-0 flex items-center justify-center text-[10px] text-slate-400">
                              No Art
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-bold text-slate-800 truncate">
                              {cand.title}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {cand.originName || cand.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                              <span className="font-semibold text-blue-600">
                                {cand.mediaType === "tv" ? "Phim bộ" : "Phim lẻ"}
                              </span>
                              <span>•</span>
                              <span>{cand.year || "N/A"}</span>
                              {cand.voteAverage > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-500 font-bold">★ {cand.voteAverage.toFixed(1)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="px-2.5 py-1 text-[10px] font-bold rounded bg-blue-600 text-white hover:bg-blue-700 shrink-0"
                          >
                            Chọn
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPlaybackSources((items) => [
                          ...items,
                          {
                            provider: "custom",
                            providerSlug: editing.id,
                            episodeKey: editing.type === "single" ? "full" : String(items.length + 1).padStart(2, "0"),
                            episodeName: editing.type === "single" ? "Tập Full" : `Tập ${String(items.length + 1).padStart(2, "0")}`,
                            serverName: "Server FP",
                            adCuePoints: [],
                            priority: 0,
                          },
                        ])
                      }
                      className="admin-control inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 border-amber-300 hover:bg-amber-100 transition cursor-pointer"
                    >
                      <Zap size={13} className="fill-amber-500 text-amber-500" /> + Server FP (Độc quyền)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPlaybackSources((items) => [
                          ...items,
                          {
                            provider: "custom",
                            providerSlug: editing.id,
                            episodeKey: editing.type === "single" ? "full" : String(items.length + 1).padStart(2, "0"),
                            episodeName: editing.type === "single" ? "Tập Full" : `Tập ${String(items.length + 1).padStart(2, "0")}`,
                            serverName: "Server Dự Phòng",
                            adCuePoints: [],
                            priority: items.length + 10,
                          },
                        ])
                      }
                      className="admin-control inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold cursor-pointer"
                    >
                      <Plus size={14} /> Thêm nguồn khác
                    </button>
                  </div>
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
                        <div className="sm:col-span-4 mt-2 rounded-lg border border-slate-200 bg-white p-2.5">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="text-[11px] font-bold text-slate-700">Phụ đề VTT (Tùy chọn)</span>
                              <p className="text-[10px] text-slate-400">Nạp link file phụ đề .vtt rời cho tập phim này</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setPlaybackSources((items) =>
                                  items.map((sourceItem, itemIndex) => {
                                    if (itemIndex !== index) return sourceItem;
                                    const subs = normalizeSubtitles(sourceItem.subtitleUrls);
                                    return {
                                      ...sourceItem,
                                      subtitleUrls: [
                                        ...subs,
                                        { label: "Vietsub", url: "", language: "vi", default: subs.length === 0 },
                                      ],
                                    };
                                  }),
                                );
                              }}
                              className="admin-control inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-blue-600"
                            >
                              <Plus size={12} /> Thêm phụ đề
                            </button>
                          </div>
                          {normalizeSubtitles(item.subtitleUrls).length === 0 ? (
                            <p className="text-[10px] italic text-slate-400">Chưa có phụ đề rời (mặc định hiển thị sub cứng của video nếu có).</p>
                          ) : (
                            <div className="space-y-2">
                              {normalizeSubtitles(item.subtitleUrls).map((sub, subIdx) => (
                                <div key={subIdx} className="flex flex-wrap items-center gap-2 rounded border border-slate-100 bg-slate-50/70 p-2 text-[11px]">
                                  <input
                                    value={sub.label}
                                    placeholder="Tên nhãn (Vietsub / English...)"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPlaybackSources((items) =>
                                        items.map((sourceItem, itemIndex) => {
                                          if (itemIndex !== index) return sourceItem;
                                          const subs = [...normalizeSubtitles(sourceItem.subtitleUrls)];
                                          subs[subIdx] = { ...subs[subIdx], label: val };
                                          return { ...sourceItem, subtitleUrls: subs };
                                        }),
                                      );
                                    }}
                                    className="admin-control w-32 px-2 text-[11px]"
                                  />
                                  <input
                                    value={sub.url}
                                    placeholder="HTTPS link file .vtt"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPlaybackSources((items) =>
                                        items.map((sourceItem, itemIndex) => {
                                          if (itemIndex !== index) return sourceItem;
                                          const subs = [...normalizeSubtitles(sourceItem.subtitleUrls)];
                                          subs[subIdx] = { ...subs[subIdx], url: val };
                                          return { ...sourceItem, subtitleUrls: subs };
                                        }),
                                      );
                                    }}
                                    className="admin-control min-w-[200px] flex-1 px-2 text-[11px]"
                                  />
                                  <input
                                    value={sub.language}
                                    placeholder="vi / en"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPlaybackSources((items) =>
                                        items.map((sourceItem, itemIndex) => {
                                          if (itemIndex !== index) return sourceItem;
                                          const subs = [...normalizeSubtitles(sourceItem.subtitleUrls)];
                                          subs[subIdx] = { ...subs[subIdx], language: val };
                                          return { ...sourceItem, subtitleUrls: subs };
                                        }),
                                      );
                                    }}
                                    className="admin-control w-16 px-2 text-center text-[11px]"
                                  />
                                  <label className="flex items-center gap-1 text-[10px] font-medium text-slate-600 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(sub.default)}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setPlaybackSources((items) =>
                                          items.map((sourceItem, itemIndex) => {
                                            if (itemIndex !== index) return sourceItem;
                                            const subs = normalizeSubtitles(sourceItem.subtitleUrls).map((s, sIdx) => ({
                                              ...s,
                                              default: sIdx === subIdx ? checked : false,
                                            }));
                                            return { ...sourceItem, subtitleUrls: subs };
                                          }),
                                        );
                                      }}
                                      className="rounded text-blue-600"
                                    />
                                    Mặc định
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPlaybackSources((items) =>
                                        items.map((sourceItem, itemIndex) => {
                                          if (itemIndex !== index) return sourceItem;
                                          const subs = normalizeSubtitles(sourceItem.subtitleUrls).filter((_, sIdx) => sIdx !== subIdx);
                                          return { ...sourceItem, subtitleUrls: subs };
                                        }),
                                      );
                                    }}
                                    className="text-rose-500 hover:text-rose-700 p-1"
                                    title="Xóa phụ đề"
                                  >
                                    <Trash size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
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

      {isCreating && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-[var(--admin-line)] px-5 py-4">
              <div>
                <h2 className="text-[16px] font-bold text-slate-800">
                  Tạo phim mới / Phim tải lên riêng
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Thêm phim thủ công, thiết lập máy chủ phát riêng và phụ đề VTT rời
                </p>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="admin-icon-button"
              >
                <X size={17} />
              </button>
            </header>
            <div className="grid max-h-[72vh] gap-4 overflow-y-auto p-5 sm:grid-cols-2">
              <label className="block text-[11px] font-semibold text-slate-600 sm:col-span-2">
                Tên phim <span className="text-rose-500">*</span>
                <input
                  value={newMovie.title}
                  placeholder="Ví dụ: Vực Thẳm Vô Tận (Bản Chiếu Rạp)"
                  onChange={(event) =>
                    setNewMovie({ ...newMovie, title: event.target.value })
                  }
                  className="admin-control mt-1.5 w-full px-3"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Mã định danh URL / Slug (tự động tạo nếu để trống)
                <input
                  value={newMovie.slug}
                  placeholder="vuc-tham-vo-tan"
                  onChange={(event) =>
                    setNewMovie({ ...newMovie, slug: event.target.value })
                  }
                  className="admin-control mt-1.5 w-full px-3"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Tên gốc / Tên tiếng Anh
                <input
                  value={newMovie.originName}
                  placeholder="The Endless Abyss"
                  onChange={(event) =>
                    setNewMovie({ ...newMovie, originName: event.target.value })
                  }
                  className="admin-control mt-1.5 w-full px-3"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Định dạng phim
                <select
                  value={newMovie.type}
                  onChange={(event) => {
                    const nextType = event.target.value;
                    setNewMovie({
                      ...newMovie,
                      type: nextType,
                      episodeKey: nextType === "single" ? "full" : "01",
                      episodeName: nextType === "single" ? "Tập Full" : "Tập 01",
                    });
                  }}
                  className="admin-control mt-1.5 w-full px-3"
                >
                  <option value="single">Phim lẻ</option>
                  <option value="series">Phim bộ</option>
                  <option value="hoathinh">Hoạt hình</option>
                  <option value="tvshows">TV Show</option>
                </select>
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Năm phát hành
                <input
                  type="number"
                  value={newMovie.year}
                  onChange={(event) =>
                    setNewMovie({
                      ...newMovie,
                      year: Number(event.target.value) || new Date().getFullYear(),
                    })
                  }
                  className="admin-control mt-1.5 w-full px-3"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Chất lượng
                <input
                  value={newMovie.quality}
                  placeholder="FHD, 4K, HD"
                  onChange={(event) =>
                    setNewMovie({ ...newMovie, quality: event.target.value })
                  }
                  className="admin-control mt-1.5 w-full px-3"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Ngôn ngữ / Bản dịch
                <input
                  value={newMovie.language}
                  placeholder="Vietsub, Thuyết minh, Lồng tiếng"
                  onChange={(event) =>
                    setNewMovie({ ...newMovie, language: event.target.value })
                  }
                  className="admin-control mt-1.5 w-full px-3"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600 sm:col-span-2">
                Poster ảnh đại diện (HTTPS URL)
                <input
                  value={newMovie.posterUrl}
                  placeholder="https://images.unsplash.com/... hoặc link ảnh"
                  onChange={(event) =>
                    setNewMovie({ ...newMovie, posterUrl: event.target.value })
                  }
                  className="admin-control mt-1.5 w-full px-3"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600 sm:col-span-2">
                Trailer YouTube (HTTPS URL)
                <input
                  value={newMovie.trailerUrl}
                  placeholder="https://www.youtube.com/watch?v=..."
                  onChange={(event) =>
                    setNewMovie({ ...newMovie, trailerUrl: event.target.value })
                  }
                  className="admin-control mt-1.5 w-full px-3"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Thể loại (phân cách bằng dấu phẩy)
                <input
                  value={newMovie.genres}
                  placeholder="Hành Động, Khoa Học Viễn Tưởng"
                  onChange={(event) =>
                    setNewMovie({ ...newMovie, genres: event.target.value })
                  }
                  className="admin-control mt-1.5 w-full px-3"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Quốc gia (phân cách bằng dấu phẩy)
                <input
                  value={newMovie.countries}
                  placeholder="Hàn Quốc, Trung Quốc, Âu Mỹ"
                  onChange={(event) =>
                    setNewMovie({ ...newMovie, countries: event.target.value })
                  }
                  className="admin-control mt-1.5 w-full px-3"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600 sm:col-span-2">
                Mô tả / Tóm tắt nội dung
                <textarea
                  value={newMovie.description}
                  placeholder="Tóm tắt cốt truyện phim..."
                  onChange={(event) =>
                    setNewMovie({ ...newMovie, description: event.target.value })
                  }
                  className="mt-1.5 min-h-24 w-full rounded-lg border border-[var(--admin-line)] p-3 text-[12px]"
                />
              </label>

              {/* Initial Playback Source */}
              <section className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[13px] font-bold text-slate-800">
                      Cấu hình máy chủ phát ban đầu (HLS Stream)
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Điền link m3u8 và phụ đề để phim có thể phát ngay lập tức
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Tên server phát
                    <input
                      value={newMovie.serverName}
                      placeholder="FlexPhim VIP"
                      onChange={(e) =>
                        setNewMovie({ ...newMovie, serverName: e.target.value })
                      }
                      className="admin-control mt-1 w-full px-2.5 text-[11px]"
                    />
                  </label>
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Mã tập
                    <input
                      value={newMovie.episodeKey}
                      placeholder="full hoặc 01"
                      onChange={(e) =>
                        setNewMovie({ ...newMovie, episodeKey: e.target.value })
                      }
                      className="admin-control mt-1 w-full px-2.5 text-[11px]"
                    />
                  </label>
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Tên hiển thị tập
                    <input
                      value={newMovie.episodeName}
                      placeholder="Tập Full hoặc Tập 01"
                      onChange={(e) =>
                        setNewMovie({ ...newMovie, episodeName: e.target.value })
                      }
                      className="admin-control mt-1 w-full px-2.5 text-[11px]"
                    />
                  </label>
                  <label className="block text-[11px] font-semibold text-slate-600 sm:col-span-3">
                    Tải tệp video gốc để hệ thống tự tạo HLS
                    <span className="mt-1 flex min-h-20 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-violet-300 bg-violet-50 px-4 py-3 text-violet-700">
                      <Upload size={20} />
                      <span className="min-w-0">
                        <span className="block truncate font-bold">
                          {newMovieFile?.name || "Chọn MP4, MKV, WebM, MOV hoặc AVI"}
                        </span>
                        <span className="block text-[10px] font-normal text-slate-500">
                          Upload xong sẽ chạy FFmpeg nền, tạo 480p/720p/1080p rồi mới công bố.
                        </span>
                      </span>
                    </span>
                    <input
                      type="file"
                      accept="video/mp4,video/x-matroska,video/webm,video/quicktime,video/x-msvideo,video/mpeg"
                      className="sr-only"
                      onChange={(event) => setNewMovieFile(event.target.files?.[0] || null)}
                    />
                  </label>
                  <div className="sm:col-span-3 flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="h-px flex-1 bg-slate-200" /> hoặc dùng nguồn có sẵn <span className="h-px flex-1 bg-slate-200" />
                  </div>
                  <label className="block text-[11px] font-semibold text-slate-600 sm:col-span-3">
                    Link phát HLS HTTPS (stream URL .m3u8)
                    <input
                      value={newMovie.streamUrl}
                      placeholder="https://your-domain.com/hls/master.m3u8"
                      onChange={(e) =>
                        setNewMovie({ ...newMovie, streamUrl: e.target.value })
                      }
                      className="admin-control mt-1 w-full px-2.5 text-[11px]"
                      disabled={Boolean(newMovieFile)}
                    />
                  </label>
                </div>

                {/* Subtitle track list for new movie */}
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-[11px] font-bold text-slate-700">Phụ đề VTT rời</span>
                      <p className="text-[10px] text-slate-400">File phụ đề rời định dạng WebVTT (.vtt)</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setNewMovie({
                          ...newMovie,
                          subtitles: [
                            ...newMovie.subtitles,
                            { label: "Vietsub", url: "", language: "vi", default: newMovie.subtitles.length === 0 },
                          ],
                        })
                      }
                      className="admin-control inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-blue-600"
                    >
                      <Plus size={12} /> Thêm phụ đề
                    </button>
                  </div>

                  {newMovie.subtitles.length === 0 ? (
                    <p className="text-[10px] italic text-slate-400">Chưa thêm phụ đề rời.</p>
                  ) : (
                    <div className="space-y-2">
                      {newMovie.subtitles.map((sub, sIdx) => (
                        <div key={sIdx} className="flex flex-wrap items-center gap-2 rounded border border-slate-100 bg-slate-50/70 p-2 text-[11px]">
                          <input
                            value={sub.label}
                            placeholder="Tên nhãn (Vietsub / Engsub...)"
                            onChange={(e) => {
                              const val = e.target.value;
                              const subs = [...newMovie.subtitles];
                              subs[sIdx] = { ...subs[sIdx], label: val };
                              setNewMovie({ ...newMovie, subtitles: subs });
                            }}
                            className="admin-control w-32 px-2 text-[11px]"
                          />
                          <input
                            value={sub.url}
                            placeholder="HTTPS link file .vtt"
                            onChange={(e) => {
                              const val = e.target.value;
                              const subs = [...newMovie.subtitles];
                              subs[sIdx] = { ...subs[sIdx], url: val };
                              setNewMovie({ ...newMovie, subtitles: subs });
                            }}
                            className="admin-control min-w-[200px] flex-1 px-2 text-[11px]"
                          />
                          <input
                            value={sub.language}
                            placeholder="vi / en"
                            onChange={(e) => {
                              const val = e.target.value;
                              const subs = [...newMovie.subtitles];
                              subs[sIdx] = { ...subs[sIdx], language: val };
                              setNewMovie({ ...newMovie, subtitles: subs });
                            }}
                            className="admin-control w-16 px-2 text-center text-[11px]"
                          />
                          <label className="flex items-center gap-1 text-[10px] font-medium text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(sub.default)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const subs = newMovie.subtitles.map((s, idx) => ({
                                  ...s,
                                  default: idx === sIdx ? checked : false,
                                }));
                                setNewMovie({ ...newMovie, subtitles: subs });
                              }}
                              className="rounded text-blue-600"
                            />
                            Mặc định
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const subs = newMovie.subtitles.filter((_, idx) => idx !== sIdx);
                              setNewMovie({ ...newMovie, subtitles: subs });
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1"
                            title="Xóa phụ đề"
                          >
                            <Trash size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
            <footer className="flex justify-end gap-2 border-t border-[var(--admin-line)] px-5 py-4">
              <button
                onClick={() => setIsCreating(false)}
                className="admin-control px-4"
              >
                Hủy
              </button>
              <button
                onClick={() => void handleCreateMovie()}
                disabled={busy === "create-movie"}
                className="inline-flex items-center gap-2 h-9 rounded-lg bg-emerald-600 px-5 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition shadow-sm"
              >
                {busy === "create-movie" ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Tạo phim
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
