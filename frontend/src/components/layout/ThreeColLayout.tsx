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
  rightWidth = '320px', // 统一右侧栏宽度
  subNavHeight = 0,
  className = '',
}: ThreeColLayoutProps) {
  const height = `calc(100vh - ${subNavHeight}px)`;

  // 右侧栏折叠交互（可选，后续可扩展为 useState 控制）
  // 这里先保留结构，后续如需折叠可加按钮和状态

  return (
    <div
      className={`grid overflow-hidden rounded-2xl border border-border bg-bg1 shadow-sm ${className}`}
      style={{
        gridTemplateColumns: `${leftWidth} 1fr ${rightWidth}`,
        height,
        minHeight: '600px',
      }}
    >
      <div className="overflow-y-auto border-r border-border bg-glass backdrop-blur-3xl">
        {left}
      </div>
      <div className="overflow-y-auto bg-bg">{center}</div>
      <aside className="overflow-y-auto border-l border-border bg-bg1 flex flex-col">
        {/* 右侧栏分区，可插入 Tab/卡片/折叠区块等 */}
        {right}
      </aside>
    </div>
  );
}
