"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconFlame,
  IconMovie,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSparkles,
  IconTrash,
  IconX,
  IconFileCode,
  IconBolt,
  IconPlayerPlay,
  IconLoader2,
} from "@tabler/icons-react";
import { adminFetch, queryString } from "@/lib/admin-api";

type MovieItem = {
  id: string;
  slug?: string;
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

const CURATED_SAMPLE_HEROES: (MovieItem & { slug: string; badge: string })[] = [
  {
    id: "oppenheimer",
    slug: "oppenheimer",
    title: "Oppenheimer",
    originName: "Oppenheimer",
    year: 2023,
    badge: "Oscar 2024",
    posterUrl: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    thumbUrl: "https://image.tmdb.org/t/p/w1280/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg",
    quality: "4K UHD",
    description: "Câu chuyện về cuộc đời và sự nghiệp của nhà vật lý lý thuyết J. Robert Oppenheimer, người lãnh đạo Dự án Manhattan phát triển bom nguyên tử.",
  },
  {
    id: "dune-hanh-tinh-cat-2",
    slug: "dune-hanh-tinh-cat-2",
    title: "Dune: Hành Tinh Cát 2",
    originName: "Dune: Part Two",
    year: 2024,
    badge: "Sci-Fi 4K",
    posterUrl: "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
    thumbUrl: "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    quality: "4K IMAX",
    description: "Paul Atreides hợp lực cùng Chani và tộc người Fremen khi anh tìm kiếm sự trả thù chống lại những kẻ đã hủy hoại gia đình mình.",
  },
  {
    id: "avatar-2-dong-chay-cua-nuoc",
    slug: "avatar-2-dong-chay-cua-nuoc",
    title: "Avatar 2: Dòng Chảy Nước",
    originName: "Avatar: The Way of Water",
    year: 2022,
    badge: "Bom Tấn",
    posterUrl: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
    thumbUrl: "https://image.tmdb.org/t/p/w1280/8sMmAmwhTNPrjjKj7qE81h4yMvs.jpg",
    quality: "4K 3D",
    description: "Jake Sully và Ney'tiri lập gia đình và nỗ lực hết mình để ở bên nhau. Tuy nhiên, họ phải rời khỏi nhà và khám phá các vùng đất của Pandora.",
  },
  {
    id: "ho-den-tu-than",
    slug: "ho-den-tu-than",
    title: "Hố Đen Tử Thần (Interstellar)",
    originName: "Interstellar",
    year: 2014,
    badge: "Kiệt Tác",
    posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    thumbUrl: "https://image.tmdb.org/t/p/w1280/rAiYTsqhk0n0GeDM365u0aY7mO4.jpg",
    quality: "4K IMAX",
    description: "Khi thời gian của Trái Đất sắp kết thúc, một nhóm nhà thám hiểm thực hiện sứ mệnh quan trọng nhất trong lịch sử nhân loại để tìm kiếm sự sống ngoài vũ trụ.",
  },
  {
    id: "ky-si-bong-dem",
    slug: "ky-si-bong-dem",
    title: "Kỵ Sĩ Bóng Đêm (The Dark Knight)",
    originName: "The Dark Knight",
    year: 2008,
    badge: "Huyền Thoại",
    posterUrl: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    thumbUrl: "https://image.tmdb.org/t/p/w1280/dqK9Hag1054tghRQSqLSfrkvQnA.jpg",
    quality: "4K UHD",
    description: "Khi hiểm họa mang tên Joker tàn phá thành phố Gotham, Người Dơi phải chấp nhận một trong những thử thách tâm lý và thể chất lớn nhất để chống lại sự bất công.",
  },
  {
    id: "biet-doi-sieu-anh-hung-4-hoi-ket",
    slug: "biet-doi-sieu-anh-hung-4-hoi-ket",
    title: "Avengers: Hồi Kết (Endgame)",
    originName: "Avengers: Endgame",
    year: 2019,
    badge: "Marvel",
    posterUrl: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    thumbUrl: "https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    quality: "4K HDR",
    description: "Sau những sự kiện tàn khốc của Infinity War, vũ trụ bị hủy hoại. Với sự giúp đỡ của các đồng minh còn lại, các Avengers tập hợp một lần nữa để đảo ngược hành động của Thanos.",
  },
  {
    id: "nguoi-nhen-khong-con-nha",
    slug: "nguoi-nhen-khong-con-nha",
    title: "Spider-Man: Không Còn Nhà",
    originName: "Spider-Man: No Way Home",
    year: 2021,
    badge: "Marvel",
    posterUrl: "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
    thumbUrl: "https://image.tmdb.org/t/p/w1280/14QbnygCuTO0vl7CAFmPf1fgZfV.jpg",
    quality: "4K UHD",
    description: "Lần đầu tiên trong lịch sử điện ảnh của Người Nhện, danh tính người anh hùng thân thiện của khu phố bị lộ diện, khiến trách nhiệm Siêu anh hùng xung đột với cuộc sống bình thường.",
  },
  {
    id: "phi-cong-sieu-dang-maverick",
    slug: "phi-cong-sieu-dang-maverick",
    title: "Top Gun: Maverick",
    originName: "Top Gun: Maverick",
    year: 2022,
    badge: "Hành Động",
    posterUrl: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
    thumbUrl: "https://image.tmdb.org/t/p/w1280/odJ4hx6g6vBt4lBWKFD1tI8WS4x.jpg",
    quality: "4K IMAX",
    description: "Sau hơn 30 năm phục vụ với tư cách một trong những phi công hàng đầu của Hải quân, Pete 'Maverick' Mitchell đào tạo một biệt đội tốt nghiệp Top Gun cho một nhiệm vụ chuyên biệt.",
  },
  {
    id: "ke-danh-cap-giac-mo",
    slug: "ke-danh-cap-giac-mo",
    title: "Inception",
    originName: "Inception",
    year: 2010,
    badge: "Khoa Học",
    posterUrl: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    thumbUrl: "https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
    quality: "4K UHD",
    description: "Một tên trộm lành nghề có khả năng thâm nhập vào tiềm thức của người khác để đánh cắp bí mật được trao cơ hội xóa sạch hồ sơ tội phạm nếu thực hiện thành công việc cấy ghép ý niệm.",
  },
  {
    id: "nguoi-doi-2022",
    slug: "nguoi-doi-2022",
    title: "The Batman",
    originName: "The Batman",
    year: 2022,
    badge: "DC Cinema",
    posterUrl: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
    thumbUrl: "https://image.tmdb.org/t/p/w1280/5P8SmMzSNYikXpxil6BYz9G660E.jpg",
    quality: "4K UHD",
    description: "Khi một kẻ giết người hàng loạt nhắm vào tầng lớp tinh hoa của Gotham với một loạt các mưu đồ tàn bạo, một chuỗi các manh mối bí ẩn đưa thám tử vĩ đại nhất thế giới vào cuộc điều tra.",
  },
  {
    id: "titanic",
    slug: "titanic",
    title: "Titanic",
    originName: "Titanic",
    year: 1997,
    badge: "Kinh Điển",
    posterUrl: "https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg",
    thumbUrl: "https://image.tmdb.org/t/p/w1280/yDI6D5ZQh67YU4r2ms8qcSbAviZ.jpg",
    quality: "4K Remastered",
    description: "Một thành viên quý tộc mười bảy tuổi phải lòng một nghệ sĩ tốt bụng nhưng nghèo khổ trên con tàu sang trọng Titanic xấu số.",
  },
  {
    id: "joker",
    slug: "joker",
    title: "Joker",
    originName: "Joker",
    year: 2019,
    badge: "Tâm Lý",
    posterUrl: "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
    thumbUrl: "https://image.tmdb.org/t/p/w1280/n6bUvigpRFqSwmPp1m2YADdbRBc.jpg",
    quality: "4K UHD",
    description: "Một diễn viên hài độc thoại thất bại bị cô lập, bắt nạt và xem thường bởi xã hội đã rơi vào vòng xoáy điên loạn và trở thành biểu tượng tội phạm Joker.",
  },
];

const HERO_SLUG_ALIASES: Record<string, string> = {
  "hope-vung-tu-dia": "vung-tu-dia",
  "joker-2019": "joker",
  "the-batman": "nguoi-doi-2022",
  "batman-2022": "nguoi-doi-2022",
  "avengers-hoi-ket": "biet-doi-sieu-anh-hung-4-hoi-ket",
  "avengers-endgame": "biet-doi-sieu-anh-hung-4-hoi-ket",
  "avengers-cuoc-chien-vo-cuc": "biet-doi-sieu-anh-hung-3-cuoc-chien-vo-cuc",
  "avengers-infinity-war": "biet-doi-sieu-anh-hung-3-cuoc-chien-vo-cuc",
  "the-dark-knight": "ky-si-bong-dem",
  "top-gun-maverick": "phi-cong-sieu-dang-maverick",
  "inception": "ke-danh-cap-giac-mo",
  "interstellar": "ho-den-tu-than",
  "avatar-2": "avatar-2-dong-chay-cua-nuoc",
  "spider-man-no-way-home": "nguoi-nhen-khong-con-nha",
  "dune-2": "dune-hanh-tinh-cat-2",
  "the-wolf-of-wall-street": "soi-gia-pho-wall",
  "the-revenant": "nguoi-ve-tu-coi-chet",
  "once-upon-a-time-in-hollywood": "chuyen-ngay-xua-o-hollywood",
  "the-irishman": "nguoi-dan-ong-xu-ireland",
  "the-departed": "ke-di-san",
};

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
        const alias = HERO_SLUG_ALIASES[slug] || slug;
        const sample = CURATED_SAMPLE_HEROES.find(
          (s) => s.slug === slug || s.id === slug || s.slug === alias || s.id === alias,
        );
        if (sample && sample.thumbUrl) {
          updates[slug] = { ...sample, id: slug, slug };
          continue;
        }

        try {
          const res = await adminFetch<{ items?: MovieItem[] }>(
            `movies/catalog-search?${queryString({ slug, limit: 1 })}`,
          ).catch(() =>
            adminFetch<{ items?: MovieItem[] }>(
              `movies?${queryString({ search: slug, limit: 1 })}`,
            ),
          );
          if (res?.items?.[0]) {
            updates[slug] = res.items[0];
          } else if (sample) {
            updates[slug] = sample;
          }
        } catch {
          if (sample) updates[slug] = sample;
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

  // Live search debounced across the entire website catalog
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
          `movies/catalog-search?${queryString({ search: clean, limit: 8 })}`,
        ).catch(() =>
          adminFetch<{ items: MovieItem[] }>(
            `movies?${queryString({ search: clean, limit: 8 })}`,
          ),
        );
        const items = res?.items || [];
        const lowerClean = clean.toLowerCase();
        const alias = HERO_SLUG_ALIASES[lowerClean];
        const curatedMatches = CURATED_SAMPLE_HEROES.filter(
          (c) =>
            (c.title.toLowerCase().includes(lowerClean) ||
              (c.originName && c.originName.toLowerCase().includes(lowerClean)) ||
              c.slug.includes(lowerClean) ||
              (alias && c.slug.includes(alias))) &&
            !items.some((it) => it.id === c.id),
        );
        setSearchResults([...curatedMatches, ...items]);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
  };

  const addSlug = async (slugToAdd: string) => {
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
    setPreviewSlug(clean);

    if (!movieMetaMap[clean]) {
      const alias = HERO_SLUG_ALIASES[clean] || clean;
      const sample = CURATED_SAMPLE_HEROES.find(
        (s) => s.slug === clean || s.id === clean || s.slug === alias || s.id === alias,
      );
      if (sample && sample.thumbUrl) {
        setMovieMetaMap((prev) => ({ ...prev, [clean]: { ...sample, id: clean, slug: clean } }));
      } else {
        try {
          const res = await adminFetch<{ items?: MovieItem[] }>(
            `movies/catalog-search?${queryString({ slug: clean, limit: 1 })}`,
          );
          const item = res?.items?.[0];
          if (item) {
            setMovieMetaMap((prev) => ({ ...prev, [clean]: item }));
          }
        } catch {}
      }
    }
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

  const currentPreviewMovie = previewSlug
    ? movieMetaMap[previewSlug] ||
      (HERO_SLUG_ALIASES[previewSlug] ? movieMetaMap[HERO_SLUG_ALIASES[previewSlug]] : null) ||
      CURATED_SAMPLE_HEROES.find(
        (s) =>
          s.slug === previewSlug ||
          s.id === previewSlug ||
          (HERO_SLUG_ALIASES[previewSlug] &&
            (s.slug === HERO_SLUG_ALIASES[previewSlug] || s.id === HERO_SLUG_ALIASES[previewSlug])),
      ) ||
      null
    : null;

  return (
    <section className="admin-card overflow-hidden">
      {/* Paces Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--admin-line)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--admin-surface-muted)] border border-[var(--admin-line)] text-[var(--admin-brand)]">
            <IconSparkles size={20} stroke={1.8} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">
                Hero Banner Trang Chủ
              </h2>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80">
                {heroMovieSlugs.length} / 12 phim đang ghim
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              Quản lý danh sách phim nổi bật trình chiếu đầu trang chủ với hình ảnh 4K HDR và tối ưu LCP.
            </p>
          </div>
        </div>

        {/* Paces Segmented Tab Switcher */}
        <div className="inline-flex items-center rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface-muted)] p-1 text-[11px]">
          <button
            type="button"
            onClick={() => setMode("visual")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-all cursor-pointer ${
              mode === "visual"
                ? "bg-[var(--admin-surface)] text-[var(--admin-brand)] shadow-xs font-bold"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <IconSparkles size={13} />
            <span>Studio trực quan</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("raw")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-all cursor-pointer ${
              mode === "raw"
                ? "bg-[var(--admin-surface)] text-[var(--admin-brand)] shadow-xs font-bold"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <IconFileCode size={13} />
            <span>Danh sách Slug (Text)</span>
          </button>
        </div>
      </div>

      {mode === "raw" ? (
        <div className="p-5">
          <label className="block">
            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
              Nhập danh sách slug (mỗi dòng một slug)
            </span>
            <small className="mt-1 block text-[11px] text-slate-400">
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
              className="admin-control mt-2 min-h-48 w-full resize-y px-3 py-2.5 font-mono text-[12px] leading-relaxed"
              placeholder={"oppenheimer\ndune-hanh-tinh-cat-2\navatar-2-dong-chay-cua-nuoc"}
            />
          </label>
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* Quick Search & Add Bar */}
          <div className="space-y-2">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <IconSearch size={16} stroke={1.8} />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (searchResults.length > 0) {
                      const movie = searchResults[0];
                      setMovieMetaMap((prev) => ({ ...prev, [movie.id]: movie }));
                      addSlug(movie.id);
                    } else if (search.trim()) {
                      addSlug(search.trim());
                    }
                  }
                }}
                placeholder="Tìm kiếm phim theo tên tiếng Việt, tên gốc hoặc nhập trực tiếp slug phim..."
                className="admin-control w-full pl-10 pr-16 py-2 text-[13px] bg-[var(--admin-surface)] transition-all rounded-lg"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-1.5">
                {searching && (
                  <IconLoader2 size={16} className="animate-spin text-[var(--admin-brand)]" />
                )}
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setSearchResults([]);
                    }}
                    className="flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    <IconX size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Direct slug add quick action if user types something */}
            {search.trim() && (
              <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-500">
                <span>
                  Đang tìm kiếm: <strong className="text-slate-700 dark:text-slate-200">&ldquo;{search.trim()}&rdquo;</strong>
                </span>
                <button
                  type="button"
                  onClick={() => addSlug(search.trim())}
                  disabled={heroMovieSlugs.includes(search.trim())}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-brand)] hover:text-white text-[var(--admin-brand)] px-2.5 py-1 font-semibold transition-colors cursor-pointer border border-[var(--admin-line)]"
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

            {/* Empty state when searching has finished with 0 results */}
            {search.trim() && !searching && searchResults.length === 0 && (
              <div className="rounded-lg border border-dashed border-[var(--admin-line)] bg-[var(--admin-surface)] p-3 text-center text-[12px] text-slate-500">
                Không tìm thấy phim có từ khóa &ldquo;{search.trim()}&rdquo; trong kho dữ liệu. Bạn có thể bấm nút &ldquo;Ghim trực tiếp slug&rdquo; bên trên để thêm phim này vào Hero Banner.
              </div>
            )}

            {/* Search Results Dropdown List */}
            {searchResults.length > 0 && (
              <div className="rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface)] shadow-lg max-h-72 overflow-y-auto divide-y divide-[var(--admin-line)] z-20">
                {searchResults.map((movie) => {
                  const isPinned = heroMovieSlugs.includes(movie.id);
                  return (
                    <div
                      key={movie.id}
                      onClick={() => {
                        if (!isPinned) {
                          setMovieMetaMap((prev) => ({ ...prev, [movie.id]: movie }));
                          addSlug(movie.id);
                        }
                      }}
                      className={`flex items-center justify-between gap-3 p-3 transition-colors ${
                        isPinned ? "bg-[var(--admin-surface)] opacity-70" : "hover:bg-[var(--admin-surface-muted)] cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-slate-100 dark:bg-slate-800 border border-[var(--admin-line)]">
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
                          <h4 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {movie.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {movie.originName || movie.id} · {movie.year || "N/A"} ·{" "}
                            {movie.type === "series" ? "Phim bộ" : "Phim lẻ"}
                          </p>
                          <span className="font-mono text-[10px] text-[var(--admin-brand)] bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
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
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
                          isPinned
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                            : "bg-[var(--admin-brand)] hover:bg-[var(--admin-brand-strong)] text-white shadow-xs"
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

          {/* Curated Masterpiece Suggestions (Paces Clean Chips Showcase) */}
          <div className="rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface-muted)] p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                <IconFlame size={14} className="text-amber-500" />
                Gợi ý Bom Tấn Tuyển Chọn (4K Masterpieces)
              </span>
              <span className="text-[11px] text-slate-400">
                Click để ghim nhanh vào danh sách phát
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {CURATED_SAMPLE_HEROES.map((item) => {
                const isPinned = heroMovieSlugs.includes(item.slug);
                return (
                  <button
                    key={item.slug}
                    type="button"
                    disabled={isPinned}
                    onClick={() => addSlug(item.slug)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all border ${
                      isPinned
                        ? "bg-slate-100/60 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200/60 dark:border-slate-700/40 cursor-default"
                        : "bg-[var(--admin-surface)] hover:border-[var(--admin-brand)] hover:text-[var(--admin-brand)] text-slate-700 dark:text-slate-200 border-[var(--admin-line)] shadow-2xs hover:-translate-y-0.5 cursor-pointer"
                    }`}
                  >
                    <span>{item.title}</span>
                    <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
                      {item.badge}
                    </span>
                    {isPinned ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        <IconCheck size={12} stroke={2.5} /> Đã ghim
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--admin-brand)] font-bold">
                        <IconPlus size={12} stroke={2.5} /> Ghim
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Hero Playlist & Live Preview Grid */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            {/* Left Column: Reorderable List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[12px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Thứ tự phát trên Web
                  </h3>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.2 text-[10px] font-semibold text-slate-500">
                    {heroMovieSlugs.length} phim
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleApplySampleHeroes}
                    className="text-[11px] text-[var(--admin-brand)] hover:text-[var(--admin-brand-strong)] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Khôi phục danh sách chuẩn 6 phim bom tấn 4K"
                  >
                    <IconRefresh size={12} /> Khôi phục 6 phim mẫu
                  </button>

                  {heroMovieSlugs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Bạn có chắc chắn muốn xóa tất cả phim khỏi Hero Banner?")) {
                          onChange([]);
                        }
                      }}
                      className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <IconTrash size={12} /> Xóa toàn bộ
                    </button>
                  )}
                </div>
              </div>

              {heroMovieSlugs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed border-[var(--admin-line)] bg-[var(--admin-surface-muted)] text-center space-y-3">
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-[var(--admin-surface)] text-[var(--admin-brand)] border border-[var(--admin-line)]">
                    <IconMovie size={22} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-700 dark:text-slate-200">
                      Chưa có phim nào được ghim
                    </h4>
                    <p className="mt-1 text-[11px] text-slate-400 max-w-sm">
                      Khi để trống, trang chủ sẽ tự động phát danh sách bom tấn Hollywood tuyển chọn mặc định.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplySampleHeroes}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--admin-brand)] hover:bg-[var(--admin-brand-strong)] text-white px-3.5 py-2 text-[11px] font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <IconSparkles size={13} />
                    <span>Áp dụng nhanh 6 phim mẫu</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {heroMovieSlugs.map((slug, index) => {
                    const meta = movieMetaMap[slug];
                    const isFirst = index === 0;
                    const isLast = index === heroMovieSlugs.length - 1;
                    const isPreviewing = previewSlug === slug;

                    return (
                      <div
                        key={slug}
                        onClick={() => setPreviewSlug(slug)}
                        className={`group flex items-center justify-between gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                          isPreviewing
                            ? "bg-[var(--admin-surface-muted)] border-[var(--admin-brand)] shadow-xs ring-1 ring-[var(--admin-brand)]"
                            : "bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] border-[var(--admin-line)]"
                        } ${isFirst ? "border-l-4 border-l-amber-500" : ""}`}
                      >
                        {/* Order & 16:9 Thumbnail Poster */}
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-md font-mono text-[11px] font-bold transition-colors ${
                              isFirst
                                ? "bg-amber-500 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            }`}
                            title={isFirst ? "Slide đầu tiên (LCP Banner)" : `Vị trí #${index + 1}`}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>

                          <div className="relative h-10 w-16 aspect-video shrink-0 overflow-hidden rounded bg-slate-900 border border-[var(--admin-line)]">
                            {meta?.thumbUrl || meta?.posterUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={meta.thumbUrl || meta.posterUrl}
                                alt={meta.title}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-slate-400">
                                <IconMovie size={14} />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                                {meta?.title || slug}
                              </h4>
                              {isFirst && (
                                <span className="rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.2 text-[9px] font-bold shrink-0">
                                  LCP Hero
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-slate-400 truncate">
                              slug: {slug}
                            </p>
                          </div>
                        </div>

                        {/* Actions (Move Up, Move Down, Delete) */}
                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => moveSlug(index, "up")}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--admin-line)] bg-[var(--admin-surface)] text-slate-500 hover:text-[var(--admin-brand)] hover:border-[var(--admin-brand)] disabled:opacity-25 disabled:pointer-events-none transition-colors"
                            title="Di chuyển lên trên"
                          >
                            <IconArrowUp size={13} stroke={2} />
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => moveSlug(index, "down")}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--admin-line)] bg-[var(--admin-surface)] text-slate-500 hover:text-[var(--admin-brand)] hover:border-[var(--admin-brand)] disabled:opacity-25 disabled:pointer-events-none transition-colors"
                            title="Di chuyển xuống dưới"
                          >
                            <IconArrowDown size={13} stroke={2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSlug(slug)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-rose-200 dark:border-rose-900/40 bg-[var(--admin-surface)] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Xóa khỏi Hero Banner"
                          >
                            <IconX size={13} stroke={2} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Live 16:9 Cinematic Preview Monitor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[12px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Mô phỏng hiển thị trên Web
                </h3>
                {previewSlug && (
                  <span className="text-[10.5px] font-semibold text-[var(--admin-brand)]">
                    Đang xem: {previewSlug}
                  </span>
                )}
              </div>

              {/* 16:9 Cinematic Monitor */}
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-[#07090e] p-4 text-white shadow-xl flex flex-col justify-end">
                {/* Background Artwork */}
                {currentPreviewMovie?.thumbUrl || currentPreviewMovie?.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentPreviewMovie.thumbUrl || currentPreviewMovie.posterUrl}
                    alt={currentPreviewMovie.title}
                    className="absolute inset-0 h-full w-full object-cover opacity-50 scale-105 filter blur-[0.3px]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-950/60 via-purple-950/30 to-slate-900/80" />
                )}

                {/* Multi-layer Cinematic Vignette Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#07090e]/95 via-[#07090e]/40 to-transparent" />

                {/* Content Overlay */}
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[8.5px] font-bold text-amber-300 uppercase tracking-wider">
                      ★ TOP HERO SLIDE
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[8.5px] font-semibold text-slate-300">
                      {currentPreviewMovie?.quality || "4K UHD"}
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[8.5px] font-semibold text-slate-300">
                      DOLBY ATMOS
                    </span>
                  </div>

                  <h3 className="text-[16px] md:text-[18px] font-extrabold tracking-tight text-white line-clamp-1 drop-shadow-md">
                    {currentPreviewMovie?.title || (previewSlug ? previewSlug : "Chưa chọn phim")}
                  </h3>

                  <p className="text-[11px] text-slate-300 line-clamp-2 drop-shadow leading-relaxed">
                    {currentPreviewMovie?.description ||
                      "Trải nghiệm xem phim đỉnh cao với âm thanh sống động và chất lượng hình ảnh sắc nét trên FlexPhim."}
                  </p>

                  <div className="flex items-center gap-2 pt-1.5">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md bg-[var(--admin-brand)] px-3 py-1.5 text-[11px] font-bold text-white shadow-md shadow-blue-600/30 cursor-default"
                    >
                      <IconPlayerPlay size={12} fill="currentColor" /> Xem Phim
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/90 backdrop-blur-sm cursor-default"
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
                        previewSlug === s ? "w-4 bg-[var(--admin-brand)]" : "w-1.5 bg-white/30"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Paces Structured Metric Info Tiles */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface-muted)] p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    <IconBolt size={14} className="text-amber-500 shrink-0" />
                    <span>LCP Web Vitals</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-normal">
                    Phim ở vị trí #01 được trình duyệt preload backdrop 4K ngay lập tức, tối ưu điểm Google Core Web Vitals.
                  </p>
                </div>

                <div className="rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface-muted)] p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    <IconRefresh size={14} className="text-blue-500 shrink-0" />
                    <span>Đồng bộ tức thì</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-normal">
                    Sau khi bấm &ldquo;Lưu thay đổi&rdquo;, Edge CDN và Redis cache sẽ được xóa để cập nhật ngay trên website.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
