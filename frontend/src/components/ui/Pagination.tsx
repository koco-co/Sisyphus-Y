'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  current: number;
  total: number;
  pageSize?: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  current,
  total,
  pageSize = 20,
  onChange,
  className = '',
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= current - 1 && i <= current + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className={`flex items-center justify-center gap-1 mt-4 ${className}`}>
      <button
        type="button"
        disabled={current <= 1}
        onClick={() => onChange(current - 1)}
        className="p-1.5 rounded border border-border bg-bg2 text-text3 hover:bg-bg3 hover:text-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      {pages.map((page, idx) =>
        page === '...' ? (
          <span
            key={`ellipsis-${pages[idx - 1] ?? 'start'}-${pages[idx + 1] ?? 'end'}`}
            className="px-1.5 text-[12px] text-text3"
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onChange(page)}
            className={`px-2.5 py-1 rounded text-[12px] border transition-colors ${
              page === current
                ? 'bg-accent text-white border-accent font-medium'
                : 'border-border bg-bg2 text-text3 hover:bg-bg3 hover:text-text'
            }`}
          >
            {page}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={current >= totalPages}
        onClick={() => onChange(current + 1)}
        className="p-1.5 rounded border border-border bg-bg2 text-text3 hover:bg-bg3 hover:text-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
