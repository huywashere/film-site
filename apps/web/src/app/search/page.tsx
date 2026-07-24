'use client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { Search, X, Loader2, RotateCcw, Filter, ChevronDown, Check } from 'lucide-react';
import { useRef, useEffect } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

function CustomSelect({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: string;
  options: SelectOption[];
  placeholder: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-[#0b0e11] border border-white/10 hover:border-white/20 rounded-xl px-2.5 py-1.5 text-xs text-neutral-200 flex items-center justify-between cursor-pointer focus:outline-none transition-colors select-none"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={13} className={`ml-1 text-neutral-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#12161a] border border-white/15 rounded-xl py-1 shadow-2xl max-h-60 overflow-y-auto scrollbar-none">
          <div
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className={`px-3 py-1.5 text-xs cursor-pointer transition-colors flex items-center justify-between ${
              !value ? 'bg-white/15 text-white font-bold' : 'text-neutral-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>{placeholder}</span>
            {!value && <Check size={12} className="text-white shrink-0 ml-1" />}
          </div>
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`px-3 py-1.5 text-xs cursor-pointer transition-colors flex items-center justify-between ${
                  isSelected ? 'bg-white/15 text-white font-bold' : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={12} className="text-white shrink-0 ml-1" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const TYPE_OPTIONS = [
  { value: 'single', label: 'Phim Lẻ' },
  { value: 'series', label: 'Phim Bộ' },
  { value: 'anime', label: 'Hoạt Hình' },
  { value: 'tvshows', label: 'TV Shows' },
];

const YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => 2024 - i).map((y) => ({
  value: String(y),
  label: `Năm ${y}`,
}));
import { movieApi } from '@/lib/api';
import { FilmCard, FilmItem, FilmCardSkeleton } from '@/components/film/FilmCard';
import { Pagination } from '@/components/film/Pagination';
import { VoiceSearchButton } from '@/components/search/VoiceSearchButton';
import { SearchHistory, searchHistoryStorage } from '@/components/search/SearchHistory';
import { GENRES_LIST, COUNTRIES_LIST } from '@/components/layout/Navbar';
import { cn } from '@/lib/utils';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [input, setInput] = useState(searchParams.get('q') || '');
  const query = searchParams.get('q') || '';
  const page = Number(searchParams.get('page') || 1);
  const type = searchParams.get('type') || '';
  const year = searchParams.get('year') || '';
  const genre = searchParams.get('genre') || '';
  const country = searchParams.get('country') || '';
  const sort = searchParams.get('sort') || 'modified.time desc';

  const isFilterOnly = !query && Boolean(type || year || genre || country || sort !== 'modified.time desc');

  const { data, isLoading } = useQuery({
    queryKey: ['search-v3', query, type, year, genre, country, sort, page],
    queryFn: () => {
      if (isFilterOnly) {
        return movieApi.getFiltered({
          type: type || undefined,
          year: year ? Number(year) : undefined,
          category: genre || undefined,
          country: country || undefined,
          sort_field: sort.includes('year') ? 'year' : 'modified.time',
          sort_type: sort.endsWith('asc') ? 'asc' : 'desc',
          page,
        }).then((r) => r.data);
      }
      return movieApi.search(query, page, 36).then((r) => r.data);
    },
    enabled: Boolean(query) || isFilterOnly,
  });

  const films: FilmItem[] = data?.data?.items || data?.items || [];
  const rawTotal = data?.data?.params?.pagination?.totalPages || data?.params?.pagination?.totalPages || data?.paginate?.total_page;
  const totalPages: number = rawTotal && rawTotal > 1 ? rawTotal : (films.length > 0 ? 50 : 1);

  const handleSearchSubmit = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const clean = searchQuery.trim();
    searchHistoryStorage.add(clean);
    setInput(clean);

    const params = new URLSearchParams();
    params.set('q', clean);
    if (type) params.set('type', type);
    if (year) params.set('year', year);
    if (sort) params.set('sort', sort);
    router.push(`/search?${params.toString()}`);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchSubmit(input);
  };

  const handleVoiceResult = (text: string) => {
    setInput(text);
    handleSearchSubmit(text);
  };

  const handleResetFilters = () => {
    setInput('');
    router.push('/search');
  };

  return (
    <div className="container mx-auto px-4 md:px-8 max-w-7xl pt-24 pb-16">
      {/* Search Header & Form Container (Centered & Minimalist) */}
      <div className="max-w-3xl mx-auto mb-8 md:mb-12">
        <h1 className="text-2xl md:text-4xl font-extrabold text-white text-center mb-2 tracking-tight">
          Khám phá Phim
        </h1>
        <p className="text-center text-neutral-400 max-w-xl mx-auto mb-6 text-xs sm:text-sm">
          Tìm phim theo tên, diễn viên hoặc bộ lọc nâng cao
        </p>

        {/* Compact Unified Search Input Bar */}
        <form onSubmit={handleFormSubmit} className="relative mb-5 max-w-2xl mx-auto">
          <div className="relative flex items-center bg-[#12161a] border border-white/10 hover:border-white/20 focus-within:border-white/30 rounded-2xl p-1.5 shadow-xl transition-all">
            <Search
              size={18}
              className="ml-3 text-neutral-400 shrink-0"
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tìm phim, diễn viên..."
              className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none"
            />
            <div className="flex items-center space-x-1.5 pr-1 shrink-0">
              <VoiceSearchButton onResult={handleVoiceResult} />
              {input && (
                <button
                  type="button"
                  onClick={() => setInput('')}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={15} />
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Search size={14} />
                <span>Tìm kiếm</span>
              </button>
            </div>
          </div>
        </form>

        {/* Centered Minimalist Multi-Facet Filter Bar */}
        <div className="bg-[#12161a]/80 border border-white/10 rounded-2xl p-3.5 backdrop-blur-md max-w-2xl mx-auto shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-neutral-300">
              <Filter size={13} className="text-neutral-400" />
              <span>Bộ lọc tìm kiếm</span>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-semibold text-neutral-400 hover:text-white transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw size={11} />
              <span>Xóa bộ lọc</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Loại Phim */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Loại Phim</label>
              <CustomSelect
                value={type}
                placeholder="Tất cả loại phim"
                options={TYPE_OPTIONS}
                onChange={(newVal) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (newVal) params.set('type', newVal);
                  else params.delete('type');
                  router.push(`/search?${params.toString()}`);
                }}
              />
            </div>

            {/* Thể Loại */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Thể Loại</label>
              <CustomSelect
                value={genre}
                placeholder="Tất cả thể loại"
                options={GENRES_LIST.map((g) => ({ value: g.slug, label: g.label }))}
                onChange={(newVal) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (newVal) params.set('genre', newVal);
                  else params.delete('genre');
                  router.push(`/search?${params.toString()}`);
                }}
              />
            </div>

            {/* Quốc Gia */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Quốc Gia</label>
              <CustomSelect
                value={country}
                placeholder="Tất cả quốc gia"
                options={COUNTRIES_LIST.map((c) => ({ value: c.slug, label: c.label }))}
                onChange={(newVal) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (newVal) params.set('country', newVal);
                  else params.delete('country');
                  router.push(`/search?${params.toString()}`);
                }}
              />
            </div>

            {/* Năm Phát Hành */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Năm Phát Hành</label>
              <CustomSelect
                value={year}
                placeholder="Tất cả các năm"
                options={YEAR_OPTIONS}
                onChange={(newVal) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (newVal) params.set('year', newVal);
                  else params.delete('year');
                  router.push(`/search?${params.toString()}`);
                }}
              />
            </div>
          </div>
        </div>

        {/* Search History & Hot Keywords when no query */}
        {!query && !isFilterOnly && (
          <div className="mt-4">
            <SearchHistory onSelectQuery={handleSearchSubmit} />
          </div>
        )}
      </div>

      {/* Results Section */}
      {(query || isFilterOnly) && (
        <div className="flex flex-col space-y-6">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
              {isLoading ? (
                <span className="flex items-center space-x-1.5">
                  <Loader2 size={12} className="animate-spin text-netflixRed" />
                  <span>Đang tải kết quả tìm kiếm...</span>
                </span>
              ) : query ? (
                `Kết quả tìm kiếm cho "${query}" (${films.length} phim)`
              ) : (
                `Kết quả lọc phim (${films.length} phim)`
              )}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <FilmCardSkeleton key={i} />
              ))}
            </div>
          ) : films.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center justify-center space-y-3 bg-[#1c2228]/40 border border-white/5 rounded-3xl">
              <span className="text-6xl">🎬</span>
              <p className="text-white font-bold">Không tìm thấy kết quả nào phù hợp</p>
              <p className="text-neutral-400 text-xs max-w-sm">
                Hãy thử lại với từ khóa khác hoặc xóa bộ lọc để mở rộng phạm vi tìm kiếm.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 px-5 py-2 bg-netflixRed text-white text-xs font-bold rounded-xl hover:bg-[#C11119] transition-colors"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6 animate-in fade-in duration-300">
                {films.map((film) => (
                  <FilmCard key={film.slug} film={film} />
                ))}
              </div>

              {/* Full Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(p) => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('page', p.toString());
                    router.push(`/search?${params.toString()}`);
                  }}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 md:px-8 max-w-7xl pt-24 pb-16 flex flex-col space-y-6">
          <div className="h-6 bg-white/5 rounded w-48 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <FilmCardSkeleton key={i} />
            ))}
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
