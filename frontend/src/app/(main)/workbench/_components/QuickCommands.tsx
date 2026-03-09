'use client';

import { AlertTriangle, ListChecks, Sparkles, Wand2 } from 'lucide-react';

interface QuickCommandsProps {
  onCommand: (text: string) => void;
  disabled?: boolean;
}

const COMMANDS = [
  { label: '生成全部', icon: ListChecks, message: '请根据所有测试点生成完整测试用例' },
  { label: '补充边界', icon: Sparkles, message: '请补充边界值相关的测试用例' },
  { label: '增加异常', icon: AlertTriangle, message: '请增加异常场景的测试用例' },
  { label: '优化描述', icon: Wand2, message: '请优化现有用例的步骤描述，使其更清晰准确' },
];

export function QuickCommands({ onCommand, disabled }: QuickCommandsProps) {
  return (
    <div className="flex gap-1.5 px-4 py-2 border-b border-border bg-bg1/50">
      {COMMANDS.map((cmd) => {
        const Icon = cmd.icon;
        return (
          <button
            key={cmd.label}
            type="button"
            onClick={() => onCommand(cmd.message)}
            disabled={disabled}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-bg2 border border-border text-text3 hover:text-text2 hover:border-border2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon className="w-3 h-3" />
            {cmd.label}
          </button>
        );
      })}
    </div>
  );
}
