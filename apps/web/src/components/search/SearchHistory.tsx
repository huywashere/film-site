"use client";
import { useState, useEffect } from "react";
import { Clock, X, Trash2, TrendingUp } from "lucide-react";

const STORAGE_KEY = "cineverse_search_history";

const HOT_KEYWORDS = [
  "Biệt Đội Marvel",
  "One Piece",
  "Conan",
  "Naruto",
  "Dragon Ball",
  "Phim Hàn Quốc",
  "Anime 2024",
  "Chuyến Tàu Sinh Tử",
];

export const searchHistoryStorage = {
  get: (): string[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  add: (query: string) => {
    if (typeof window === "undefined" || !query.trim()) return;
    try {
      const clean = query.trim();
      const current = searchHistoryStorage.get();
      const filtered = current.filter(
        (q) => q.toLowerCase() !== clean.toLowerCase(),
      );
      filtered.unshift(clean);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, 10)));
    } catch (e) {
      console.error("Failed to save search query:", e);
    }
  },

  remove: (query: string) => {
    if (typeof window === "undefined") return;
    try {
      const current = searchHistoryStorage.get();
      const filtered = current.filter((q) => q !== query);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error("Failed to remove search query:", e);
    }
  },

  clear: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  },
};

interface SearchHistoryProps {
  onSelectQuery: (query: string) => void;
}

export function SearchHistory({ onSelectQuery }: SearchHistoryProps) {
  const [history, setHistory] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHistory(searchHistoryStorage.get());

    const handleCleared = () => {
      setHistory([]);
    };

    window.addEventListener("search_history_cleared", handleCleared);
    return () => {
      window.removeEventListener("search_history_cleared", handleCleared);
    };
  }, []);

  if (!mounted) return null;

  const handleRemove = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    searchHistoryStorage.remove(item);
    setHistory(searchHistoryStorage.get());
  };

  const handleClearAll = () => {
    searchHistoryStorage.clear();
    setHistory([]);
  };

  return (
    <div className="space-y-6 my-4">
      {/* Recent History */}
      {history.length > 0 && (
        <div className="bg-[#1c2228]/80 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-neutral-300">
              <Clock size={14} className="text-netflixRed" />
              <span>Tìm kiếm gần đây</span>
            </div>
            <button
              onClick={handleClearAll}
              className="text-[11px] font-semibold text-neutral-400 hover:text-netflixRed transition-colors flex items-center space-x-1"
            >
              <Trash2 size={12} />
              <span>Xóa lịch sử</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((item) => (
              <div
                key={item}
                onClick={() => onSelectQuery(item)}
                className="group flex items-center space-x-1.5 bg-white/5 hover:bg-netflixRed/20 border border-white/10 hover:border-netflixRed/40 text-neutral-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200"
              >
                <span>{item}</span>
                <button
                  onClick={(e) => handleRemove(e, item)}
                  className="text-neutral-500 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hot Trending Keywords */}
      <div className="bg-[#1c2228]/80 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center space-x-2 text-xs font-bold text-neutral-300 mb-3">
          <TrendingUp size={14} className="text-netflixRed" />
          <span>Từ khóa nổi bật & Xu hướng</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {HOT_KEYWORDS.map((tag) => (
            <button
              key={tag}
              onClick={() => onSelectQuery(tag)}
              className="bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105"
            >
              🔥 {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
