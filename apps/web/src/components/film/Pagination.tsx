"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  // Recompute total pages if totalItems is provided, ensuring safe positive integer
  const totalPages = useMemo(() => {
    if (totalItems !== undefined && totalItems > 0 && pageSize > 0) {
      return Math.max(1, Math.ceil(totalItems / pageSize));
    }
    return Math.max(1, propTotalPages || 1);
  }, [propTotalPages, totalItems, pageSize]);

  // Clamp current 1-based page between 1 and totalPages
  const currentPageClamped = Math.max(1, Math.min(currentPage, totalPages));

  // Generate page range with ellipsis (...) standing in for collapsed range
  const pageRange = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPageClamped <= 3) {
        pages.push(1, 2, 3, "ellipsis", totalPages);
      } else if (currentPageClamped >= totalPages - 2) {
        pages.push(1, "ellipsis", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(
          1,
          "ellipsis",
          currentPageClamped - 1,
          currentPageClamped,
          currentPageClamped + 1,
          "ellipsis",
          totalPages,
        );
      }
    }
    return pages;
  }, [currentPageClamped, totalPages]);

  // Calculate 5 dot indicators for visual progress (matching Image 1)
  const numDots = Math.min(5, totalPages);
  const activeDotIndex = useMemo(() => {
    if (totalPages <= 1) return 0;
    if (totalPages <= 5) return currentPageClamped - 1;
    const ratio = (currentPageClamped - 1) / (totalPages - 1);
    return Math.min(
      numDots - 1,
      Math.max(0, Math.round(ratio * (numDots - 1))),
    );
  }, [currentPageClamped, totalPages, numDots]);

  if (totalPages <= 1) return null;

  const handlePageClick = (page: number) => {
    if (page !== currentPageClamped && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  return (
    <div className={`w-full flex justify-center py-6 ${className}`}>
      <nav
        aria-label="pagination"
        className="flex items-center space-x-1 sm:space-x-1.5"
      >
        {/* Previous Page Link */}
        <button
          onClick={() => handlePageClick(currentPageClamped - 1)}
          disabled={currentPageClamped === 1}
          aria-label="Trang trước"
          title="Trang trước"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors duration-150 cursor-pointer"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Page Numbers & Ellipsis */}
        {pageRange.map((item, idx) => {
          if (item === "ellipsis") {
            return (
              <span
                key={`ellipsis-${idx}`}
                aria-hidden="true"
                className="w-7 h-9 sm:w-8 sm:h-10 flex items-center justify-center text-neutral-500 font-bold text-xs select-none"
              >
                ...
              </span>
            );
          }

          const isCurrent = item === currentPageClamped;
          return (
            <button
              key={item}
              onClick={() => handlePageClick(item)}
              aria-current={isCurrent ? "page" : undefined}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer flex items-center justify-center ${
                isCurrent
                  ? "bg-white/15 text-white border border-white/20 shadow-md font-extrabold"
                  : "text-neutral-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {item}
            </button>
          );
        })}

        {/* Next Page Link */}
        <button
          onClick={() => handlePageClick(currentPageClamped + 1)}
          disabled={currentPageClamped === totalPages}
          aria-label="Trang tiếp"
          title="Trang tiếp"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors duration-150 cursor-pointer"
        >
          <ChevronRight size={18} />
        </button>
      </nav>
    </div>
  );
}
