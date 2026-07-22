'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Loader2,
  Clock,
  TrendingUp,
  Clapperboard,
  X,
  Play,
  ChevronRight,
} from 'lucide-react';
import { movieApi } from '@/lib/api';
import { resolveImageUrl, FilmItem } from '@/components/film/FilmCard';
import { VoiceSearchButton } from '@/components/search/VoiceSearchButton';
import { cn } from '@/lib/utils';

// ── Local storage helpers ─────────────────────────────────────────
const HISTORY_KEY = 'cineverse-search-history';
const MAX_HISTORY = 8;

function getHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(query: string) {
  const prev = getHistory().filter((q) => q !== query);
  const next = [query, ...prev].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

function removeFromHistory(query: string) {
  const next = getHistory().filter((q) => q !== query);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

// ── Highlight matching text ──────────────────────────────────────
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-transparent text-[#524cf8] font-extrabold not-italic"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

// ── Skeleton loader ──────────────────────────────────────────────
function SearchSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 p-2 rounded-xl">
          <div className="w-10 h-14 rounded-lg bg-white/5 flex-shrink-0" />
          <div className="flex flex-col justify-center gap-2 flex-1">
            <div
              className="h-3 bg-white/5 rounded-full shimmer"
              style={{ width: `${60 + (i % 3) * 15}%` }}
            />
            <div className="h-2 bg-white/5 rounded-full shimmer w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Preview panel ────────────────────────────────────────────────
function PreviewPanel({
  film,
  onClose,
}: {
  film: FilmItem | null;
  onClose: () => void;
}) {
  const poster = film
    ? resolveImageUrl(film.thumb_url) || resolveImageUrl(film.poster_url)
    : null;

  return (
    <div className="md:col-span-5 hidden md:flex flex-col p-6 bg-white/[0.01] items-center justify-center text-center">
      <AnimatePresence mode="wait">
        {film ? (
          <motion.div
            key={film.slug}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="w-full flex flex-col items-center space-y-4"
          >
            {/* Poster */}
            <div className="relative w-32 h-44 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-neutral-900 group">
              {poster ? (
                <img
                  src={poster}
                  alt={film.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Clapperboard size={36} className="opacity-20" />
                </div>
              )}
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                <div className="w-10 h-10 rounded-full bg-[#524cf8]/90 flex items-center justify-center shadow-lg">
                  <Play size={16} fill="white" className="text-white ml-0.5" />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-1.5 w-full px-2">
              <h3 className="font-extrabold text-sm text-white line-clamp-2 leading-snug">
                {film.name}
              </h3>
              {film.origin_name && (
                <p className="text-[10px] text-neutral-500 font-medium line-clamp-1">
                  {film.origin_name}
                </p>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
              {film.year && (
                <span className="bg-white/5 border border-white/10 text-[9px] font-bold text-neutral-300 px-2 py-0.5 rounded-md">
                  {film.year}
                </span>
              )}
              {film.quality && (
                <span className="bg-[#524cf8]/10 border border-[#524cf8]/20 text-[9px] font-bold text-[#7c77ff] px-2 py-0.5 rounded-md">
                  {film.quality}
                </span>
              )}
              {film.lang && (
                <span className="bg-white/5 border border-white/10 text-[9px] font-bold text-neutral-300 px-2 py-0.5 rounded-md">
                  {film.lang}
                </span>
              )}
              {film.type && (
                <span className="bg-white/5 border border-white/10 text-[9px] font-bold text-neutral-300 px-2 py-0.5 rounded-md">
                  {film.type === 'series' ? 'Phim Bộ' : 'Phim Lẻ'}
                </span>
              )}
            </div>

            {/* CTA button */}
            <Link
              href={`/film/${film.slug}`}
              onClick={onClose}
              className="group/btn flex items-center justify-center gap-2 bg-[#0d1117] hover:bg-[#524cf8] border border-[#524cf8]/40 hover:border-[#524cf8] text-[#7c77ff] hover:text-white font-extrabold text-[10px] uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all shadow-md shadow-[#524cf8]/10 hover:shadow-[#524cf8]/30 active:scale-95 mt-2 w-full max-w-[180px]"
            >
              <ChevronRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
              Xem Chi Tiết
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-neutral-600 text-xs flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
              <Clapperboard size={24} className="opacity-20" />
            </div>
            <span className="text-neutral-600 text-[11px]">Chọn phim để xem trước</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main SpotlightSearchModal ────────────────────────────────────
export function SpotlightSearchModal({
  isOpen,
  onClose,
  suggestions = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  suggestions?: FilmItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load history on open
  useEffect(() => {
    if (isOpen) {
      setHistory(getHistory());
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounce query 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery]);

  // Search API
  const { data: searchData, isFetching } = useQuery({
    queryKey: ['spotlight-search', debouncedQuery],
    queryFn: () => movieApi.search(debouncedQuery, 1).then((r) => r.data),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 1000 * 30,
  });

  // Genres for quick tags
  const { data: genresData } = useQuery({
    queryKey: ['spotlight-genres'],
    queryFn: () => movieApi.getGenres().then((r) => r.data),
    staleTime: 1000 * 60 * 10,
    enabled: isOpen,
  });

  const results: FilmItem[] = searchData?.data?.items || [];
  const isSearching = debouncedQuery.trim().length >= 2;
  const isTyping = query.trim().length > 0;

  // Genre quick tags — pick 6 from real data, fallback static
  const quickGenres: { label: string; slug: string }[] = (() => {
    const genres = (genresData as any)?.data || [];
    if (genres.length > 0) {
      return genres.slice(0, 6).map((g: any) => ({ label: g.name, slug: g.slug }));
    }
    return [
      { label: 'Hành Động', slug: 'hanh-dong' },
      { label: 'Kinh Dị', slug: 'kinh-di' },
      { label: 'Tình Cảm', slug: 'tinh-cam' },
      { label: 'Hài Hước', slug: 'hai-huoc' },
      { label: 'Viễn Tưởng', slug: 'vien-tuong' },
      { label: 'Hoạt Hình', slug: 'hoat-hinh' },
    ];
  })();

  // Active film for preview panel
  const activeFilm: FilmItem | null = isSearching
    ? results[selectedIndex] ?? null
    : suggestions[0] ?? null;

  const navSourceRef = useRef<'key' | 'mouse'>('mouse');

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isSearching) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navSourceRef.current = 'key';
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navSourceRef.current = 'key';
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        const film = results[selectedIndex];
        saveHistory(query.trim());
        onClose();
        router.push(`/film/${film.slug}`);
      }
    },
    [isSearching, results, selectedIndex, query, onClose, router]
  );

  // Global ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Scroll active item into view ONLY when navigating via keyboard
  useEffect(() => {
    if (navSourceRef.current === 'key') {
      const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleHistoryClick = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  const handleRemoveHistory = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    removeFromHistory(term);
    setHistory(getHistory());
  };

  const handleResultClick = (film: FilmItem) => {
    if (query.trim()) saveHistory(query.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xl z-[100] flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.97 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="bg-[#14181c]/95 border border-white/15 w-full max-w-3xl rounded-3xl overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.85)] flex flex-col backdrop-blur-3xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Input Bar ── */}
        <div className="flex items-center px-5 py-3.5 border-b border-white/[0.08] gap-3 bg-white/[0.02]">
          <Search size={18} className="text-[#00e054] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm phim, thể loại, diễn viên..."
            className="flex-1 bg-transparent border-none text-white text-base font-semibold placeholder:text-neutral-500 focus:outline-none focus:ring-0"
          />
          <div className="flex items-center gap-2 flex-shrink-0">
            <VoiceSearchButton onResult={(text) => setQuery(text)} />
            {isFetching && <Loader2 size={16} className="animate-spin text-[#00e054]" />}
            {query && (
              <button
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                className="text-neutral-500 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
              >
                <X size={14} />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[10px] font-extrabold text-neutral-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md hover:bg-white/10 transition-colors"
            >
              ESC
            </button>
          </div>
        </div>

        {/* ── Body Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-white/[0.08] min-h-[380px]">

          {/* Left Column */}
          <div
            ref={listRef}
            onWheel={(e) => e.stopPropagation()}
            className="md:col-span-7 max-h-[55vh] overflow-y-auto overscroll-contain p-4 flex flex-col gap-1 scrollbar-thin"
          >
            {/* ── IDLE STATE (empty query) ── */}
            {!isTyping && (
              <div className="flex flex-col gap-5">
                {/* Recent searches */}
                {history.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                        <Clock size={10} />
                        Tìm kiếm gần đây
                      </span>
                      <button
                        onClick={() => { localStorage.removeItem(HISTORY_KEY); setHistory([]); }}
                        className="text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors"
                      >
                        Xóa tất cả
                      </button>
                    </div>
                    <div className="flex flex-col gap-1">
                      {history.map((term) => (
                        <button
                          key={term}
                          onClick={() => handleHistoryClick(term)}
                          className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-left hover:bg-white/[0.04] group transition-colors"
                        >
                          <span className="text-xs text-neutral-400 group-hover:text-white transition-colors flex items-center gap-2">
                            <Clock size={11} className="text-neutral-600" />
                            {term}
                          </span>
                          <button
                            onClick={(e) => handleRemoveHistory(e, term)}
                            className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-neutral-300 transition-all p-1"
                          >
                            <X size={11} />
                          </button>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending genres */}
                <div>
                  <span className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2.5">
                    <TrendingUp size={10} />
                    Đang thịnh hành
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickGenres.map((g) => (
                      <Link
                        key={g.slug}
                        href={`/genre/${g.slug}`}
                        onClick={onClose}
                        className="bg-white/[0.04] hover:bg-[#524cf8]/15 hover:border-[#524cf8]/30 border border-white/8 px-2.5 py-1 rounded-lg text-[10px] font-bold text-neutral-400 hover:text-[#7c77ff] transition-all active:scale-95"
                      >
                        #{g.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Suggestions header */}
                {suggestions.length > 0 && (
                  <div>
                    <span className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2.5">
                      <TrendingUp size={10} />
                      Gợi ý cho bạn
                    </span>
                    <div className="flex flex-col gap-1">
                      {suggestions.slice(0, 5).map((item) => {
                        const poster = resolveImageUrl(item.thumb_url) || resolveImageUrl(item.poster_url);
                        return (
                          <Link
                            key={item.slug}
                            href={`/film/${item.slug}`}
                            onClick={onClose}
                            className="flex gap-3 p-2 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/8 group transition-all"
                          >
                            <div className="w-9 h-12 rounded-lg bg-white/5 overflow-hidden flex-shrink-0 border border-white/5">
                              {poster ? (
                                <img src={poster} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Clapperboard size={12} className="opacity-20" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col justify-center gap-0.5 min-w-0">
                              <span className="font-bold text-xs text-neutral-300 group-hover:text-white transition-colors line-clamp-1">{item.name}</span>
                              <span className="text-[10px] text-neutral-600 line-clamp-1">{item.origin_name} {item.year ? `(${item.year})` : ''}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TOO SHORT ── */}
            {isTyping && debouncedQuery.trim().length < 2 && query.trim().length < 2 && (
              <div className="flex items-center justify-center flex-1 py-16 text-neutral-600 text-xs">
                Nhập tối thiểu 2 ký tự...
              </div>
            )}

            {/* ── LOADING SKELETON ── */}
            {isSearching && isFetching && results.length === 0 && (
              <SearchSkeleton />
            )}

            {/* ── SEARCH RESULTS ── */}
            {isSearching && !isFetching && results.length > 0 && (
              <AnimatePresence mode="popLayout">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-1"
                >
                  <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-wider mb-1.5 px-1">
                    {results.length} kết quả cho "{debouncedQuery}"
                  </span>
                  {results.map((item, i) => {
                    const poster = resolveImageUrl(item.thumb_url) || resolveImageUrl(item.poster_url);
                    const isActive = i === selectedIndex;
                    return (
                      <Link
                        key={item._id || item.slug}
                        href={`/film/${item.slug}`}
                        data-index={i}
                        onClick={() => handleResultClick(item)}
                        onMouseEnter={() => {
                          navSourceRef.current = 'mouse';
                          setSelectedIndex(i);
                        }}
                        className={cn(
                          'flex gap-3 p-2 rounded-xl transition-all group border-l-[3px]',
                          isActive
                            ? 'bg-white/[0.08] border-l-[#00e054] border-r border-r-transparent border-y-transparent shadow-sm'
                            : 'border-l-transparent border border-transparent hover:bg-white/[0.04]'
                        )}
                      >
                        <div className="w-9 h-12 rounded-lg bg-white/5 overflow-hidden flex-shrink-0 border border-white/5 group-hover:border-white/10 shadow-sm">
                          {poster ? (
                            <img src={poster} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Clapperboard size={12} className="opacity-20" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col justify-center gap-0.5 min-w-0">
                          <span className={cn('font-bold text-xs line-clamp-1 transition-colors', isActive ? 'text-white' : 'text-neutral-300 group-hover:text-white')}>
                            <HighlightMatch text={item.name} query={debouncedQuery} />
                          </span>
                          <span className="text-[10px] text-neutral-600 line-clamp-1">
                            {item.origin_name} {item.year ? `(${item.year})` : ''}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}

            {/* ── EMPTY STATE ── */}
            {isSearching && !isFetching && results.length === 0 && (
              <div className="flex flex-col items-center justify-center flex-1 py-12 gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
                  <Clapperboard size={24} className="opacity-20" />
                </div>
                <div>
                  <p className="text-sm text-neutral-400 font-semibold mb-1">
                    Không tìm thấy phim nào
                  </p>
                  <p className="text-xs text-neutral-600 mb-4">
                    cho từ khóa &ldquo;<span className="text-neutral-400">{debouncedQuery}</span>&rdquo;
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-wider">Thử xem thể loại:</span>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {quickGenres.slice(0, 4).map((g) => (
                      <Link
                        key={g.slug}
                        href={`/genre/${g.slug}`}
                        onClick={onClose}
                        className="bg-white/[0.04] hover:bg-[#524cf8]/15 border border-white/8 hover:border-[#524cf8]/30 px-2.5 py-1 rounded-lg text-[10px] font-bold text-neutral-500 hover:text-[#7c77ff] transition-all"
                      >
                        #{g.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Preview */}
          <PreviewPanel film={activeFilm} onClose={onClose} />
        </div>

        {/* ── Footer hint ── */}
        <div className="px-5 py-2.5 border-t border-white/[0.04] flex items-center gap-4 text-[10px] text-neutral-700">
          <span className="flex items-center gap-1">
            <kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[9px] font-mono">↑↓</kbd>
            Điều hướng
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[9px] font-mono">↵</kbd>
            Mở phim
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[9px] font-mono">ESC</kbd>
            Đóng
          </span>
        </div>
      </motion.div>
    </div>
  );
}
