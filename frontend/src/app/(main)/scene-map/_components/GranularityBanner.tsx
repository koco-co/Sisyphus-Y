'use client';

import { AlertTriangle, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import type { GranularityWarning } from '@/stores/scene-map-store';

interface GranularityBannerProps {
  warnings: GranularityWarning[];
}

export function GranularityBanner({ warnings }: GranularityBannerProps) {
  const [expanded, setExpanded] = useState(false);

  if (warnings.length === 0) return null;

  return (
    <div className="mx-4 mt-3 rounded-lg border border-sy-warn/30 bg-sy-warn/8 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left"
      >
        <AlertTriangle size={14} className="text-sy-warn shrink-0" />
        <span className="flex-1 text-[12.5px] font-medium text-sy-warn">
          粒度告警：{warnings.length} 个测试点可能需要调整粒度
        </span>
        {expanded ? (
          <ChevronUp size={14} className="text-sy-warn" />
        ) : (
          <ChevronDown size={14} className="text-sy-warn" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {warnings.map((w) => (
            <div
              key={w.id}
              className="flex items-start gap-2 p-2.5 rounded-md bg-sy-bg-1/60 border border-sy-warn/15"
            >
              <Lightbulb size={12} className="text-sy-warn mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-sy-text-2">{w.message}</p>
                <p className="text-[11px] text-sy-warn mt-0.5">{w.suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
