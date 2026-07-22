'use client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { Search, X, Loader2, RotateCcw, Filter } from 'lucide-react';
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
      {/* Search Header */}
      <div className="max-w-4xl mx-auto mb-10 md:mb-14">
        <h1 className="text-3xl md:text-5xl font-black text-white text-center mb-4 tracking-wide">
          Khám phá Phim Thông Minh
        </h1>
        <p className="text-center text-neutral-400 max-w-2xl mx-auto mb-8 text-sm">
          Tìm phim theo tên, diễn viên, giọng nói hoặc sử dụng bộ lọc đa năng để tìm nhanh nhất.
        </p>

        {/* Input Form with Voice Button */}
        <form onSubmit={handleFormSubmit} className="relative flex items-center mb-6">
          <div className="relative flex-1">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập tên phim, diễn viên, đạo diễn..."
              className="w-full h-14 bg-[#14181c] border border-white/15 rounded-3xl pl-12 pr-28 text-base text-white placeholder:text-neutral-500 focus:border-netflixRed focus:ring-1 focus:ring-netflixRed shadow-2xl transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              <VoiceSearchButton onResult={handleVoiceResult} />
              {input && (
                <button
                  type="button"
                  onClick={() => setInput('')}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          <button
            type="submit"
            className="ml-3 h-14 px-7 bg-netflixRed hover:bg-[#C11119] text-white font-extrabold text-sm rounded-3xl transition-colors flex items-center justify-center space-x-2 shadow-lg"
          >
            <Search size={16} />
            <span className="hidden sm:inline">Tìm kiếm</span>
          </button>
        </form>

        {/* Multi-Facet Filter Bar */}
        <div className="bg-[#1c2228]/80 border border-white/10 rounded-2xl p-4 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
              <Filter size={14} className="text-netflixRed" />
              <span>Bộ lọc tìm kiếm nâng cao</span>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-neutral-400 hover:text-netflixRed transition-colors flex items-center space-x-1"
            >
              <RotateCcw size={12} />
              <span>Xóa bộ lọc</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Loại Phim */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">Loại Phim</label>
              <select
                value={type}
                onChange={(e) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (e.target.value) params.set('type', e.target.value);
                  else params.delete('type');
                  router.push(`/search?${params.toString()}`);
                }}
                className="w-full bg-[#14181c] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-netflixRed"
              >
                <option value="">Tất cả loại phim</option>
                <option value="single">Phim Lẻ</option>
                <option value="series">Phim Bộ</option>
                <option value="anime">Hoạt Hình</option>
                <option value="tvshows">TV Shows</option>
              </select>
            </div>

            {/* Thể Loại */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">Thể Loại</label>
              <select
                value={genre}
                onChange={(e) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (e.target.value) params.set('genre', e.target.value);
                  else params.delete('genre');
                  router.push(`/search?${params.toString()}`);
                }}
                className="w-full bg-[#14181c] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-netflixRed"
              >
                <option value="">Tất cả thể loại</option>
                {GENRES_LIST.map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quốc Gia */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">Quốc Gia</label>
              <select
                value={country}
                onChange={(e) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (e.target.value) params.set('country', e.target.value);
                  else params.delete('country');
                  router.push(`/search?${params.toString()}`);
                }}
                className="w-full bg-[#14181c] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-netflixRed"
              >
                <option value="">Tất cả quốc gia</option>
                {COUNTRIES_LIST.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Năm Phát Hành */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">Năm Phát Hành</label>
              <select
                value={year}
                onChange={(e) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (e.target.value) params.set('year', e.target.value);
                  else params.delete('year');
                  router.push(`/search?${params.toString()}`);
                }}
                className="w-full bg-[#14181c] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-netflixRed"
              >
                <option value="">Tất cả các năm</option>
                {Array.from({ length: 15 }, (_, i) => 2024 - i).map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Search History & Hot Keywords when no query */}
        {!query && !isFilterOnly && (
          <SearchHistory onSelectQuery={handleSearchSubmit} />
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
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
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
