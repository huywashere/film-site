"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconFlame,
  IconMovie,
  IconPin,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSparkles,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { adminFetch, queryString } from "@/lib/admin-api";

type MovieItem = {
  id: string;
  title: string;
  originName?: string;
  posterUrl?: string;
  thumbUrl?: string;
  year?: number;
  type?: string;
  quality?: string;
  genres?: string[];
  description?: string;
};

const CURATED_SAMPLE_HEROES = [
  { slug: "oppenheimer", title: "Oppenheimer", year: 2023, badge: "Oscar 2024" },
  { slug: "dune-hanh-tinh-cat-2", title: "Dune: Hành Tinh Cát 2", year: 2024, badge: "Sci-Fi 4K" },
  { slug: "avatar-2-dong-chay-cua-nuoc", title: "Avatar 2: Dòng Chảy Nước", year: 2022, badge: "Siêu Bom Tấn" },
  { slug: "ho-den-tu-than", title: "Hố Đen Tử Thần (Interstellar)", year: 2014, badge: "Kiệt Tác" },
  { slug: "ky-si-bong-dem", title: "Kỵ Sĩ Bóng Đêm (The Dark Knight)", year: 2008, badge: "Huyền Thoại" },
  { slug: "avengers-hoi-ket", title: "Avengers: Hồi Kết (Endgame)", year: 2019, badge: "Marvel" },
  { slug: "nguoi-nhen-khong-con-nha", title: "Spider-Man: Không Còn Nhà", year: 2021, badge: "Marvel" },
  { slug: "phi-cong-sieu-dang-maverick", title: "Top Gun: Maverick", year: 2022, badge: "Hành Động" },
  { slug: "ke-danh-cap-giac-mo", title: "Inception", year: 2010, badge: "Khoa Học" },
  { slug: "the-batman", title: "The Batman", year: 2022, badge: "DC Cinematic" },
  { slug: "titanic", title: "Titanic", year: 1997, badge: "Kinh Điển" },
  { slug: "joker-2019", title: "Joker", year: 2019, badge: "Tâm Lý" },
];

export function HeroBannerStudio({
  heroMovieSlugs,
  onChange,
}: {
  heroMovieSlugs: string[];
  onChange: (slugs: string[]) => void;
}) {
  const [mode, setMode] = useState<"visual" | "raw">("visual");
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MovieItem[]>([]);
  const [movieMetaMap, setMovieMetaMap] = useState<Record<string, MovieItem>>({});
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync active preview slug
  useEffect(() => {
    if (heroMovieSlugs.length > 0) {
      if (!previewSlug || !heroMovieSlugs.includes(previewSlug)) {
        setPreviewSlug(heroMovieSlugs[0]);
      }
    } else {
      setPreviewSlug(null);
    }
  }, [heroMovieSlugs, previewSlug]);

  // Fetch metadata for pinned slugs in background to display rich cards
  useEffect(() => {
    if (!heroMovieSlugs.length) return;
    const missing = heroMovieSlugs.filter((slug) => !movieMetaMap[slug]);
    if (!missing.length) return;

    let active = true;
    const fetchMetadata = async () => {
      const updates: Record<string, MovieItem> = {};
      for (const slug of missing.slice(0, 12)) {
        try {
          const res = await adminFetch<{ items?: MovieItem[] }>(
            `movies?${queryString({ search: slug, limit: 1 })}`,
          );
          if (res?.items?.[0]) {
            updates[slug] = res.items[0];
          } else {
            // Check curated sample fallback
            const sample = CURATED_SAMPLE_HEROES.find((s) => s.slug === slug);
            if (sample) {
              updates[slug] = {
                id: slug,
                title: sample.title,
                year: sample.year,
                type: "single",
              };
            }
          }
        } catch {
          // ignore error for individual movie metadata
        }
      }
      if (active && Object.keys(updates).length > 0) {
        setMovieMetaMap((prev) => ({ ...prev, ...updates }));
      }
    };

    void fetchMetadata();
    return () => {
      active = false;
    };
  }, [heroMovieSlugs, movieMetaMap]);

  // Live search debounced
  const handleSearchChange = (query: string) => {
    setSearch(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const clean = query.trim();
    if (!clean) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await adminFetch<{ items: MovieItem[] }>(
          `movies?${queryString({ search: clean, limit: 8 })}`,
        );
        setSearchResults(res.items || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
  };

  const addSlug = (slugToAdd: string) => {
    const clean = slugToAdd.trim();
    if (!clean) return;
    if (heroMovieSlugs.includes(clean)) return;
    if (heroMovieSlugs.length >= 12) {
      alert("Đã đạt giới hạn tối đa 12 phim trên Hero Banner!");
      return;
    }
    const next = [...heroMovieSlugs, clean];
    onChange(next);
    setSearch("");
    setSearchResults([]);
  };

  const removeSlug = (slugToRemove: string) => {
    const next = heroMovieSlugs.filter((s) => s !== slugToRemove);
    onChange(next);
  };

  const moveSlug = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= heroMovieSlugs.length) return;
    const next = [...heroMovieSlugs];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    onChange(next);
  };

  const handleApplySampleHeroes = () => {
    const sampleSlugs = CURATED_SAMPLE_HEROES.slice(0, 6).map((item) => item.slug);
    onChange(sampleSlugs);
  };

  const currentPreviewMovie = previewSlug ? movieMetaMap[previewSlug] : null;

  return (
    <section className="admin-card overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-line)] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 text-amber-500 border border-amber-500/20">
            <IconFlame size={20} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-bold text-slate-800">
                Hero Banner Trang Chủ (Trình Quản Lý & Tùy Biến)
              </h2>
              <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-600">
                {heroMovieSlugs.length} / 12 phim đang ghim
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Ghim bất kỳ phim nào, tìm kiếm nhanh từ kho phim hoặc chọn bom tấn tuyển chọn và kéo thả thứ tự xuất hiện.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setMode("visual")}
            className={`rounded-md px-3 py-1 font-semibold transition-all ${
              mode === "visual"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Studio trực quan
          </button>
          <button
            type="button"
            onClick={() => setMode("raw")}
            className={`rounded-md px-3 py-1 font-semibold transition-all ${
              mode === "raw"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Danh sách Slug (Text)
          </button>
        </div>
      </div>

      {mode === "raw" ? (
        <div className="p-5">
          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">
              Nhập danh sách slug (mỗi dòng một slug)
            </span>
            <small className="mt-1 block text-[10px] text-slate-400">
              Tối đa 12 slug. Để trống để hệ thống tự động xoay tua danh sách bom tấn mặc định.
            </small>
            <textarea
              value={heroMovieSlugs.join("\n")}
              onChange={(e) =>
                onChange(
                  e.target.value
                    .split(/\r?\n/)
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .slice(0, 12),
                )
              }
              className="admin-control mt-2 min-h-44 w-full resize-y px-3 py-2 font-mono text-[12px]"
              placeholder={"oppenheimer\ndune-hanh-tinh-cat-2\navatar-2-dong-chay-cua-nuoc"}
            />
          </label>
        </div>
      ) : (
        <div className="p-5 space-y-6">
          {/* Quick Search & Add Bar */}
          <div className="space-y-2">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <IconSearch size={16} />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Tìm phim bất kỳ theo tên tiếng Việt, tên gốc hoặc nhập trực tiếp slug phim..."
                className="admin-control w-full pl-10 pr-10 py-2.5 text-[13px] bg-slate-50/50 focus:bg-white transition-all shadow-sm rounded-xl"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSearchResults([]);
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                >
                  <IconX size={15} />
                </button>
              )}
            </div>

            {/* Direct slug add quick action if user types something */}
            {search.trim() && (
              <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-500">
                <span>
                  Đang tìm kiếm cho:{" "}
                  <strong className="text-slate-700">&ldquo;{search.trim()}&rdquo;</strong>
                </span>
                <button
                  type="button"
                  onClick={() => addSlug(search.trim())}
                  disabled={heroMovieSlugs.includes(search.trim())}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 px-2.5 py-1 font-bold transition-colors cursor-pointer border border-blue-200"
                >
                  <IconPlus size={13} />
                  <span>
                    {heroMovieSlugs.includes(search.trim())
                      ? "Slug này đã có trong Hero"
                      : `Ghim trực tiếp slug "${search.trim()}"`}
                  </span>
                </button>
              </div>
            )}

            {/* Search Results Dropdown List */}
            {searchResults.length > 0 && (
              <div className="mt-2 rounded-xl border border-slate-200 bg-white shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150 z-20">
                {searchResults.map((movie) => {
                  const isPinned = heroMovieSlugs.includes(movie.id);
                  return (
                    <div
                      key={movie.id}
                      className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-slate-100 border border-slate-200">
                          {movie.posterUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={movie.posterUrl}
                              alt={movie.title}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-slate-400">
                              <IconMovie size={16} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[13px] font-bold text-slate-800 truncate">
                            {movie.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {movie.originName || movie.id} · {movie.year || "N/A"} ·{" "}
                            {movie.type === "series" ? "Phim bộ" : "Phim lẻ"}
                          </p>
                          <span className="font-mono text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                            slug: {movie.id}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isPinned}
                        onClick={() => {
                          setMovieMetaMap((prev) => ({ ...prev, [movie.id]: movie }));
                          addSlug(movie.id);
                        }}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                          isPinned
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        }`}
                      >
                        {isPinned ? (
                          <>
                            <IconCheck size={13} /> Đã có trên Hero
                          </>
                        ) : (
                          <>
                            <IconPlus size={13} /> Thêm vào Hero
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Curated Masterpiece Suggestions (1-Click Chips) */}
          <div className="rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50/60 to-orange-50/40 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                <IconSparkles size={14} className="text-amber-500" />
                Gợi ý 12 Bom Tấn Tuyển Chọn (4K Masterpieces)
              </span>
              <span className="text-[10px] text-amber-600 font-medium">
                Click để ghim ngay
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CURATED_SAMPLE_HEROES.map((item) => {
                const isPinned = heroMovieSlugs.includes(item.slug);
                return (
                  <button
                    key={item.slug}
                    type="button"
                    disabled={isPinned}
                    onClick={() => addSlug(item.slug)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                      isPinned
                        ? "bg-amber-100/50 text-amber-600/60 border-amber-200 cursor-default line-through"
                        : "bg-white hover:bg-amber-100 text-amber-900 border-amber-200/80 shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
                    }`}
                  >
                    <span>{item.title}</span>
                    <span className="text-[9px] font-mono text-amber-600">
                      ({item.badge})
                    </span>
                    {!isPinned && <IconPlus size={11} className="text-amber-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Hero Playlist & Mini Preview Grid */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            {/* Left Column: Reorderable List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Thứ tự phát Hero Banner ({heroMovieSlugs.length})
                </h3>
                {heroMovieSlugs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Bạn có chắc chắn muốn xóa tất cả phim khỏi Hero Banner?")) {
                        onChange([]);
                      }
                    }}
                    className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold transition-colors flex items-center gap-1"
                  >
                    <IconTrash size={12} /> Xóa toàn bộ
                  </button>
                )}
              </div>

              {heroMovieSlugs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-center space-y-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-500 border border-blue-100">
                    <IconMovie size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">
                      Chưa có phim nào được ghim
                    </h4>
                    <p className="mt-1 text-xs text-slate-400 max-w-sm">
                      Khi để trống, trang chủ sẽ tự động phát danh sách bom tấn Hollywood tuyển chọn mặc định.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplySampleHeroes}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <IconSparkles size={14} />
                    Áp dụng nhanh 6 phim mẫu
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {heroMovieSlugs.map((slug, index) => {
                    const meta = movieMetaMap[slug];
                    const isFirst = index === 0;
                    const isLast = index === heroMovieSlugs.length - 1;
                    const isPreviewing = previewSlug === slug;

                    return (
                      <div
                        key={slug}
                        onClick={() => setPreviewSlug(slug)}
                        className={`group flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          isPreviewing
                            ? "bg-blue-50/70 border-blue-300 shadow-sm ring-1 ring-blue-300"
                            : "bg-white hover:bg-slate-50 border-slate-200"
                        }`}
                      >
                        {/* Order & Poster */}
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black transition-colors ${
                              isFirst
                                ? "bg-amber-500 text-white shadow-xs"
                                : "bg-slate-100 text-slate-600"
                            }`}
                            title={isFirst ? "Slide đầu tiên (LCP Banner)" : `Vị trí #${index + 1}`}
                          >
                            #{index + 1}
                          </span>

                          <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-slate-100 border border-slate-200">
                            {meta?.posterUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={meta.posterUrl}
                                alt={meta.title}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-slate-400">
                                <IconMovie size={16} />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[13px] font-bold text-slate-800 truncate">
                                {meta?.title || slug}
                              </h4>
                              {isFirst && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-700">
                                  LCP Hero
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-slate-400 truncate">
                              {slug}
                            </p>
                          </div>
                        </div>

                        {/* Actions (Move Up, Move Down, Delete) */}
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => moveSlug(index, "up")}
                            className="admin-icon-button !h-7 !w-7 disabled:opacity-30 disabled:pointer-events-none text-slate-600 hover:text-blue-600"
                            title="Di chuyển lên trên"
                          >
                            <IconArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => moveSlug(index, "down")}
                            className="admin-icon-button !h-7 !w-7 disabled:opacity-30 disabled:pointer-events-none text-slate-600 hover:text-blue-600"
                            title="Di chuyển xuống dưới"
                          >
                            <IconArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSlug(slug)}
                            className="admin-icon-button !h-7 !w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            title="Xóa khỏi Hero Banner"
                          >
                            <IconX size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Live Hero Preview Card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mô phỏng giao diện Hero Banner
                </h3>
                {previewSlug && (
                  <span className="text-[10px] text-blue-600 font-semibold">
                    Đang xem: {previewSlug}
                  </span>
                )}
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#090b10] p-4 text-white shadow-2xl min-h-[280px] flex flex-col justify-end">
                {/* Background Artwork */}
                {currentPreviewMovie?.thumbUrl || currentPreviewMovie?.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentPreviewMovie.thumbUrl || currentPreviewMovie.posterUrl}
                    alt={currentPreviewMovie.title}
                    className="absolute inset-0 h-full w-full object-cover opacity-45 scale-105 filter blur-[0.5px]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-950/40 via-purple-950/20 to-slate-900/60" />
                )}

                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#090b10] via-[#090b10]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#090b10]/90 via-[#090b10]/40 to-transparent" />

                {/* Content Overlay */}
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[9px] font-black text-amber-300 uppercase tracking-wider">
                      ★ TOP HERO SLIDE
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-slate-300">
                      {currentPreviewMovie?.quality || "4K UHD"}
                    </span>
                  </div>

                  <h3 className="text-lg font-black tracking-tight text-white line-clamp-1 drop-shadow-md">
                    {currentPreviewMovie?.title || (previewSlug ? previewSlug : "Chưa chọn phim")}
                  </h3>

                  <p className="text-xs text-slate-300 line-clamp-2 drop-shadow">
                    {currentPreviewMovie?.description ||
                      "Trải nghiệm xem phim đỉnh cao với âm thanh sống động và chất lượng hình ảnh sắc nét trên FlexPhim."}
                  </p>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 cursor-default"
                    >
                      Xem Phim
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white/90 backdrop-blur-sm cursor-default"
                    >
                      Trailer
                    </button>
                  </div>
                </div>

                {/* Carousel indicator dots */}
                <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1">
                  {heroMovieSlugs.map((s) => (
                    <span
                      key={s}
                      className={`h-1.5 rounded-full transition-all ${
                        previewSlug === s ? "w-4 bg-blue-500" : "w-1.5 bg-white/30"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-[11px] text-blue-700 space-y-1">
                <p className="font-bold">Mẹo vận hành:</p>
                <p>
                  • Phim ở vị trí <strong>#1</strong> sẽ được tải ưu tiên (LCP) ngay khi khách truy cập trang chủ.
                </p>
                <p>
                  • Sau khi bấm <strong>&ldquo;Lưu cấu hình&rdquo;</strong> ở đầu trang, thay đổi sẽ có hiệu lực tức thì trên toàn website.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
