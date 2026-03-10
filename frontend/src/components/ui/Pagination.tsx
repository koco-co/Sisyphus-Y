'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useState } from 'react';

interface PaginationProps {
  current: number;
  total: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
  showTotal?: boolean;
  showPageSizeChanger?: boolean;
  showQuickJumper?: boolean;
}

export function Pagination({
  current,
  total,
  pageSize = 20,
  pageSizeOptions = [10, 20, 50, 100],
  onChange,
  onPageSizeChange,
  className = '',
  showTotal = true,
  showPageSizeChanger = true,
  showQuickJumper = true,
}: PaginationProps) {
  const [jumpValue, setJumpValue] = useState('');
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1 && !showTotal) return null;

  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= current - 1 && i <= current + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  const btnBase =
    'p-1.5 rounded border border-sy-border bg-sy-bg-2 text-sy-text-3 hover:bg-sy-bg-3 hover:text-sy-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

  const handleJump = () => {
    const page = Number.parseInt(jumpValue, 10);
    if (page >= 1 && page <= totalPages) {
      onChange(page);
    }
    setJumpValue('');
  };

  return (
    <div className={`flex items-center justify-between gap-3 mt-4 ${className}`}>
      {showTotal && (
        <span className="text-[12px] text-sy-text-3 whitespace-nowrap">共 {total} 条</span>
      )}

      <div className="flex items-center gap-1">
        {/* First page */}
        <button
          type="button"
          disabled={current <= 1}
          onClick={() => onChange(1)}
          className={btnBase}
          title="首页"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous */}
        <button
          type="button"
          disabled={current <= 1}
          onClick={() => onChange(current - 1)}
          className={btnBase}
          title="上一页"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Page numbers */}
        {pages.map((page, idx) =>
          page === '...' ? (
            <span
              key={`ellipsis-${pages[idx - 1] ?? 'start'}-${pages[idx + 1] ?? 'end'}`}
              className="px-1.5 text-[12px] text-sy-text-3"
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
                  ? 'bg-sy-accent text-white border-sy-accent font-medium'
                  : 'border-sy-border bg-sy-bg-2 text-sy-text-3 hover:bg-sy-bg-3 hover:text-sy-text'
              }`}
            >
              {page}
            </button>
          ),
        )}

        {/* Next */}
        <button
          type="button"
          disabled={current >= totalPages}
          onClick={() => onChange(current + 1)}
          className={btnBase}
          title="下一页"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last page */}
        <button
          type="button"
          disabled={current >= totalPages}
          onClick={() => onChange(totalPages)}
          className={btnBase}
          title="末页"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Page size changer */}
        {showPageSizeChanger && onPageSizeChange && (
          <div className="flex items-center gap-1">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 rounded border border-sy-border bg-sy-bg-2 text-sy-text text-[12px] px-1.5 appearance-none cursor-pointer hover:border-sy-border-2 transition-colors"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} 条/页
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quick jumper */}
        {showQuickJumper && totalPages > 5 && (
          <div className="flex items-center gap-1 text-[12px] text-sy-text-3">
            <span>跳至</span>
            <input
              type="text"
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleJump()}
              onBlur={handleJump}
              className="w-10 h-7 rounded border border-sy-border bg-sy-bg-2 text-sy-text text-center text-[12px] focus:border-sy-accent focus:outline-none transition-colors"
              placeholder=""
            />
            <span>页</span>
          </div>
        )}
      </div>
    </div>
  );
}
