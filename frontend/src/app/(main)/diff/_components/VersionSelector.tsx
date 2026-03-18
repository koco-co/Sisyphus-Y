'use client';

import { ArrowLeftRight } from 'lucide-react';
import { useDiffStore } from '@/stores/diff-store';

interface VersionSelectorProps {
  className?: string;
}

export function VersionSelector({ className = '' }: VersionSelectorProps) {
  const { versionFrom, versionTo, setVersionFrom, setVersionTo, swapVersions } = useDiffStore();

  return (
    <div className={`flex items-end gap-2 ${className}`}>
      <div className="flex-1">
        <label
          htmlFor="diff-version-from"
          className="block text-[10px] font-semibold text-text3 uppercase tracking-wider mb-1"
        >
          旧版本
        </label>
        <input
          id="diff-version-from"
          type="number"
          min={1}
          value={versionFrom}
          onChange={(e) => setVersionFrom(Number(e.target.value))}
          className="w-full px-3 py-1.5 text-[12.5px] font-mono bg-bg2 border border-border rounded-md text-text outline-none focus:border-sy-accent transition-colors"
        />
      </div>

      <button
        type="button"
        onClick={swapVersions}
        className="flex items-center justify-center w-8 h-8 rounded-md border border-border bg-bg2 text-text3 hover:bg-bg3 hover:text-text transition-colors mb-px"
        title="交换版本"
      >
        <ArrowLeftRight className="w-3.5 h-3.5" />
      </button>

      <div className="flex-1">
        <label
          htmlFor="diff-version-to"
          className="block text-[10px] font-semibold text-text3 uppercase tracking-wider mb-1"
        >
          新版本
        </label>
        <input
          id="diff-version-to"
          type="number"
          min={1}
          value={versionTo}
          onChange={(e) => setVersionTo(Number(e.target.value))}
          className="w-full px-3 py-1.5 text-[12.5px] font-mono bg-bg2 border border-border rounded-md text-text outline-none focus:border-sy-accent transition-colors"
        />
      </div>
    </div>
  );
}
