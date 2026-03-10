'use client';

import type { ReactNode } from 'react';

interface ThreeColLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  leftWidth?: string;
  rightWidth?: string;
  subNavHeight?: number;
  className?: string;
}

export function ThreeColLayout({
  left,
  center,
  right,
  leftWidth = '240px',
  rightWidth = '340px',
  subNavHeight = 0,
  className = '',
}: ThreeColLayoutProps) {
  const height = `calc(100vh - 49px - ${subNavHeight}px)`;

  return (
    <div
      className={`grid overflow-hidden rounded-lg border border-border bg-bg1 shadow-sm ${className}`}
      style={{
        gridTemplateColumns: `${leftWidth} 1fr ${rightWidth}`,
        height,
        minHeight: '600px',
      }}
    >
      <div className="overflow-y-auto border-r border-border">{left}</div>
      <div className="overflow-y-auto bg-bg">{center}</div>
      <div className="overflow-y-auto border-l border-border">{right}</div>
    </div>
  );
}
