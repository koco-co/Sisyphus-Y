'use client';

import {
  AlertOctagon,
  Check,
  EyeOff,
  Edit3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import type { TestPointItem } from '@/stores/scene-map-store';

interface PendingAlertsProps {
  testPoints: TestPointItem[];
  isLocked: boolean;
  onConfirm: (id: string) => void;
  onIgnore: (id: string) => void;
  onSelect: (id: string) => void;
}

export function PendingAlerts({
  testPoints,
  isLocked,
  onConfirm,
  onIgnore,
  onSelect,
}: PendingAlertsProps) {
  const [expanded, setExpanded] = useState(true);

  const missingPoints = testPoints.filter(
    (p) => p.source === 'missing' && p.status !== 'confirmed' && p.status !== 'ignored',
  );

  if (missingPoints.length === 0) return null;

  return (
    <div className="mx-4 mt-3 rounded-lg border border-sy-danger/30 bg-sy-danger/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left"
      >
        <AlertOctagon size={14} className="text-sy-danger shrink-0" />
        <span className="flex-1 text-[12.5px] font-semibold text-sy-danger">
          {missingPoints.length} 个缺失测试点需要处理
        </span>
        {expanded ? (
          <ChevronUp size={14} className="text-sy-danger" />
        ) : (
          <ChevronDown size={14} className="text-sy-danger" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-1.5">
          {missingPoints.map((tp) => (
            <div
              key={tp.id}
              className="flex items-center gap-2 p-2.5 rounded-md bg-sy-bg-1/60 border border-sy-danger/15"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-sy-danger shrink-0" />
              <span className="flex-1 text-[12px] text-sy-text truncate">
                {tp.title}
              </span>
              {!isLocked && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onConfirm(tp.id)}
                    className="p-1 rounded text-sy-accent hover:bg-sy-accent/10 transition-colors"
                    title="确认"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onIgnore(tp.id)}
                    className="p-1 rounded text-sy-text-3 hover:bg-sy-bg-3 transition-colors"
                    title="忽略"
                  >
                    <EyeOff size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelect(tp.id)}
                    className="p-1 rounded text-sy-info hover:bg-sy-info/10 transition-colors"
                    title="编辑"
                  >
                    <Edit3 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
