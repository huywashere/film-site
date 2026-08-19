"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages: propTotalPages,
  totalItems,
  pageSize = 24,
  onPageChange,
  className = "",
}: PaginationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");

  // Correctly extract and sanitize positive totalPages
  const totalPages = useMemo(() => {
    if (propTotalPages && propTotalPages > 0) {
      return Math.max(1, propTotalPages);
    }
    if (totalItems !== undefined && totalItems > 0 && pageSize > 0) {
      return Math.max(1, Math.ceil(totalItems / pageSize));
    }
    return 1;
  }, [propTotalPages, totalItems, pageSize]);

  // Clamp current 1-based page between 1 and totalPages
  const currentPageClamped = Math.max(1, Math.min(currentPage, totalPages));

  if (totalPages <= 1) return null;

  const handlePageClick = (page: number) => {
    if (page !== currentPageClamped && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(inputVal, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      onPageChange(parsed);
    }
    setIsEditing(false);
    setInputVal("");
  };

  return (
    <div className={cn("w-full flex justify-center py-8", className)}>
      <nav
        aria-label="Chuyển trang"
        className="flex items-center gap-3 sm:gap-4 select-none"
      >
        {/* Nút lùi trang tròn */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPageClamped - 1)}
          disabled={currentPageClamped <= 1}
          aria-label="Trang trước"
          title="Trang trước"
          className="w-10 h-10 rounded-full bg-[#1e2330] hover:bg-[#282f42] text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-lg disabled:opacity-25 disabled:pointer-events-none active:scale-95 border border-white/[0.08]"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Thanh con nhộng ở giữa hiển thị Trang [ hiện tại ] / tổng số */}
        <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-[#1e2330] border border-white/[0.08] shadow-lg text-sm font-bold text-white">
          <span className="text-white font-extrabold tracking-wide">Trang</span>

          {isEditing ? (
            <form onSubmit={handleInputSubmit} className="inline-block">
              <input
                type="number"
                min={1}
                max={totalPages}
                autoFocus
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onBlur={() => setIsEditing(false)}
                className="w-12 px-1.5 py-0.5 rounded-lg border border-white/40 bg-white/10 text-white font-black text-sm text-center focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setInputVal(String(currentPageClamped));
                setIsEditing(true);
              }}
              title="Bấm để nhập số trang cần đến"
              className="px-3.5 py-1 rounded-xl border border-white/20 bg-white/[0.04] hover:bg-white/[0.1] text-white font-black text-sm min-w-[36px] text-center shadow-inner transition-colors cursor-pointer"
            >
              {currentPageClamped}
            </button>
          )}

          <span className="text-neutral-400 font-bold">/ {totalPages}</span>
        </div>

        {/* Nút tới trang tròn */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPageClamped + 1)}
          disabled={currentPageClamped >= totalPages}
          aria-label="Trang tiếp"
          title="Trang tiếp"
          className="w-10 h-10 rounded-full bg-[#1e2330] hover:bg-[#282f42] text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-lg disabled:opacity-25 disabled:pointer-events-none active:scale-95 border border-white/[0.08]"
        >
          <ChevronRight size={18} />
        </button>
      </nav>
    </div>
  );
}
