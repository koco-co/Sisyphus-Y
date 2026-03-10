'use client';
import { useState } from 'react';

interface ThinkingStreamProps {
  text: string;
  isStreaming: boolean;
}

export function ThinkingStream({ text, isStreaming }: ThinkingStreamProps) {
  const [collapsed, setCollapsed] = useState(false);
  if (!text && !isStreaming) return null;

  return (
    <div className="mb-3 rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-bg2 text-[11.5px] text-text3 hover:text-text2 transition-colors"
      >
        <span>🧠</span>
        <span>思考过程</span>
        {isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse ml-1" />}
        <span className="ml-auto">{collapsed ? '▼' : '▲'}</span>
      </button>
      {!collapsed && (
        <div className="px-3 py-2 bg-bg text-text3 text-[12px] font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
          {text}
          {isStreaming && (
            <span className="inline-block w-[2px] h-[13px] bg-text3 ml-0.5 animate-[blink_1s_infinite]" />
          )}
        </div>
      )}
    </div>
  );
}
