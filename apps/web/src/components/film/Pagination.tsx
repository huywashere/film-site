'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: PaginationProps) {
  const [jumpPage, setJumpPage] = useState('');

  if (totalPages <= 1) return null;

  // Compute smart page window (e.g. 1 2 3 4 5 6 7)
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return { pages, startPage, endPage };
  };

  const { pages, startPage, endPage } = getPageNumbers();

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPage, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      onPageChange(p);
      setJumpPage('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 pt-10 pb-6 w-full">
      {/* Header Info */}
      <div className="flex items-center space-x-2 text-xs text-neutral-400 font-medium">
        <span>Trang <strong className="text-white">{currentPage}</strong> trên <strong className="text-white">{totalPages}</strong></span>
        {totalItems && (
          <>
            <span className="text-neutral-600">•</span>
            <span>Tổng cộng <strong className="text-white">{totalItems.toLocaleString()}</strong> phim</span>
          </>
        )}
      </div>

      {/* Main Buttons Row */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-card/40 border border-border/40 text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all text-xs font-semibold flex items-center space-x-1"
          title="Trang đầu"
        >
          <ChevronsLeft size={16} />
          <span className="hidden sm:inline">Đầu</span>
        </button>

        {/* Prev Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-card/40 border border-border/40 text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all text-xs font-semibold flex items-center space-x-1"
          title="Trang trước"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Trước</span>
        </button>

        {/* Start ellipsis */}
        {startPage > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-card/40 border border-border/40 text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-xs font-bold"
            >
              1
            </button>
            {startPage > 2 && <span className="text-neutral-500 px-1 text-xs">...</span>}
          </>
        )}

        {/* Visible Page Numbers */}
        {pages.map((p) => {
          const isActive = p === currentPage;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs font-bold transition-all duration-200 shadow-sm ${
                isActive
                  ? 'bg-gradient-to-r from-[#524cf8] to-[#7c77ff] text-white border border-[#7c77ff]/60 shadow-lg shadow-[#524cf8]/30 scale-105'
                  : 'bg-card/40 border border-border/40 text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/20'
              }`}
            >
              {p}
            </button>
          );
        })}

        {/* End ellipsis */}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-neutral-500 px-1 text-xs">...</span>}
            <button
              onClick={() => onPageChange(totalPages)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-card/40 border border-border/40 text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-xs font-bold"
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-card/40 border border-border/40 text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all text-xs font-semibold flex items-center space-x-1"
          title="Trang sau"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight size={16} />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-card/40 border border-border/40 text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all text-xs font-semibold flex items-center space-x-1"
          title="Trang cuối"
        >
          <span className="hidden sm:inline">Cuối</span>
          <ChevronsRight size={16} />
        </button>
      </div>

      {/* Quick Jump Input */}
      {totalPages > 5 && (
        <form onSubmit={handleJumpSubmit} className="flex items-center space-x-2 pt-1 text-xs text-neutral-400">
          <span>Đến trang:</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            placeholder="#"
            className="w-14 h-8 bg-card/60 border border-white/10 rounded-lg text-center text-white text-xs focus:border-[#7c77ff] outline-none"
          />
          <button
            type="submit"
            className="px-3 h-8 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg text-xs font-bold transition-all"
          >
            Đi
          </button>
        </form>
      )}
    </div>
  );
}
