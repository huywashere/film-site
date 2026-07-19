'use client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { movieApi } from '@/lib/api';
import { FilmCard, FilmItem, FilmCardSkeleton } from '@/components/film/FilmCard';
import { cn } from '@/lib/utils';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [input, setInput] = useState(searchParams.get('q') || '');
  const query = searchParams.get('q') || '';
  const page = Number(searchParams.get('page') || 1);

  const { data, isLoading } = useQuery({
    queryKey: ['search', query, page],
    queryFn: () => movieApi.search(query, page).then((r) => r.data),
    enabled: !!query,
  });

  const films: FilmItem[] = data?.data?.items || [];
  const totalPages: number = data?.data?.params?.pagination?.totalPages || 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      router.push(`/search?q=${encodeURIComponent(input.trim())}`);
    }
  };

  return (
    <div className="container mx-auto px-4 md:px-8 max-w-7xl pt-24 pb-16">
      {/* Search Header */}
      <div className="max-w-2xl mx-auto mb-10 md:mb-14">
        <h1 className="text-2xl md:text-3xl font-black text-white text-center mb-6 tracking-wide">
          Tìm kiếm kho phim
        </h1>
        <form onSubmit={handleSearch} className="flex space-x-2">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tên phim, diễn viên, đạo diễn..."
              className="w-full h-11 bg-neutral-900 border border-white/10 rounded-l pl-10 pr-4 text-sm text-white placeholder:text-neutral-500 focus:border-netflixRed focus:ring-1 focus:ring-netflixRed transition-all"
            />
          </div>
          <button
            type="submit"
            className="bg-netflixRed hover:bg-[#C11119] text-white font-bold text-sm px-6 rounded-r transition-colors flex items-center justify-center space-x-1.5"
          >
            <span>Tìm</span>
          </button>
        </form>
      </div>

      {query && (
        <div className="flex flex-col space-y-6">
          <div className="border-b border-white/5 pb-2">
            <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
              {isLoading ? (
                <span className="flex items-center space-x-1.5">
                  <Loader2 size={12} className="animate-spin text-netflixRed" />
                  <span>Đang tải kết quả tìm kiếm...</span>
                </span>
              ) : (
                `Kết quả tìm kiếm cho "${query}" (${films.length} kết quả)`
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
            <div className="text-center py-20 flex flex-col items-center justify-center space-y-3">
              <span className="text-6xl">🎬</span>
              <p className="text-neutral-400 text-sm">Không tìm thấy kết quả nào phù hợp cho từ khóa "{query}"</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
                {films.map((film) => (
                  <FilmCard key={film.slug} film={film} />
                ))}
              </div>

              {/* Custom Pagination Buttons */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-1.5 pt-10">
                  {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      className={cn(
                        "w-9 h-9 rounded text-xs font-bold border transition-colors flex items-center justify-center",
                        p === page
                          ? "bg-netflixRed border-netflixRed text-white"
                          : "bg-neutral-900 border-white/10 text-neutral-400 hover:text-white hover:border-white/20"
                      )}
                      onClick={() =>
                        router.push(`/search?q=${encodeURIComponent(query)}&page=${p}`)
                      }
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!query && (
        <div className="text-center py-24 flex flex-col items-center justify-center space-y-4 text-neutral-500">
          <Search size={54} className="text-neutral-700 opacity-50 animate-bounce duration-1000" />
          <p className="text-sm font-semibold max-w-xs leading-relaxed">
            Nhập tên phim, diễn viên hoặc đạo diễn để tìm nhanh phim của bạn.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-24 text-center">
          <Loader2 className="animate-spin text-netflixRed mx-auto mb-2" size={32} />
          <p className="text-neutral-400 text-sm">Đang tải trang tìm kiếm...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
