'use client';

import { FileText, Layers, MessageSquare, Target } from 'lucide-react';
import type { WorkbenchMode } from '@/stores/workspace-store';

interface ModeSelectorProps {
  value: WorkbenchMode;
  onChange: (mode: WorkbenchMode) => void;
}

const MODES: { value: WorkbenchMode; label: string; icon: typeof Target }[] = [
  { value: 'test_point_driven', label: '测试点驱动', icon: Target },
  { value: 'document_driven', label: '文档驱动', icon: FileText },
  { value: 'dialogue', label: '对话引导', icon: MessageSquare },
  { value: 'template', label: '模板填充', icon: Layers },
];

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-bg1">
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const isActive = value === mode.value;
        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-colors ${
              isActive
                ? 'text-sy-accent bg-sy-accent/8'
                : 'text-text3 hover:text-text2 hover:bg-bg2'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {mode.label}
            {isActive && (
              <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-sy-accent rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
