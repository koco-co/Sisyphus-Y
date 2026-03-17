'use client';

import { useMemo } from 'react';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

const HEADER_WIDTHS = [100, 120, 80, 140, 90, 110, 75, 130];
const CELL_WIDTHS = [
  [80, 110, 60, 130, 95, 70, 120, 85],
  [105, 75, 135, 90, 115, 65, 100, 140],
  [70, 125, 95, 80, 110, 130, 60, 105],
  [120, 85, 70, 115, 65, 100, 135, 90],
  [90, 130, 110, 75, 140, 80, 95, 120],
];

export function TableSkeleton({ rows = 5, cols = 4 }: TableSkeletonProps) {
  const headerWidths = useMemo(
    () => Array.from({ length: cols }, (_, i) => HEADER_WIDTHS[i % HEADER_WIDTHS.length]),
    [cols],
  );
  const cellWidths = useMemo(
    () =>
      Array.from({ length: rows }, (_, ri) => {
        const row = CELL_WIDTHS[ri % CELL_WIDTHS.length];
        return Array.from({ length: cols }, (_, ci) => row[ci % row.length]);
      }),
    [rows, cols],
  );

  return (
    <div className="p-4 space-y-3 animate-pulse">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-border">
        {headerWidths.map((w, i) => (
          <div
            key={`h-${i.toString()}`}
            className="h-3 bg-bg3 rounded"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>
      {/* Rows */}
      {cellWidths.map((rowWidths, ri) => (
        <div key={`r-${ri.toString()}`} className="flex gap-4 py-2">
          {rowWidths.map((w, ci) => (
            <div
              key={`c-${ci.toString()}`}
              className="h-3 bg-bg3/60 rounded"
              style={{ width: `${w}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
