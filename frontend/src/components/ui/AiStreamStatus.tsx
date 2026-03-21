'use client';
import { useStreamStore } from '@/stores/stream-store';

/**
 * 在 AI 流式输出期间显示当前阶段标签（思考中 / 生成中 / 整理中）。
 * 仅在 isStreaming=true 时渲染，phase 为 idle 或 done 时自动隐藏。
 */
export function AiStreamStatus() {
  const { isStreaming, phase, phaseLabel } = useStreamStore();

  if (!isStreaming || phase === 'idle' || phase === 'done') return null;

  const dotClass =
    phase === 'thinking'
      ? 'bg-sy-warn animate-pulse'
      : phase === 'organizing'
        ? 'bg-sy-text-3 animate-[blink_1s_infinite]'
        : 'bg-sy-accent animate-pulse';

  return (
    <div className="flex items-center gap-2 text-[12px] text-sy-text-2 py-1">
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <span>{phaseLabel}</span>
    </div>
  );
}
