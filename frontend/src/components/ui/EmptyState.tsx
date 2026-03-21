'use client';

import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title = '这里还没有内容',
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}
    >
      <div className="text-sy-text-3 opacity-40 mb-4">{icon ?? <Inbox className="w-12 h-12" />}</div>
      <p className="text-[13px] font-medium text-sy-text-3">{title}</p>
      {description && <p className="text-[12px] text-sy-text-3/70 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
