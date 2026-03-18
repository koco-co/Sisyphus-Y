'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

interface DiffViewProps {
  diffText: string;
  additions?: number;
  deletions?: number;
  className?: string;
}

interface SideBySideLine {
  type: 'add' | 'del' | 'ctx' | 'modified';
  left: string | null;
  right: string | null;
  leftNum: number | null;
  rightNum: number | null;
}

function getDiffLineKey(line: SideBySideLine, idx: number): string {
  return `sbsl-${idx}-${line.type}-${line.leftNum ?? 'x'}-${line.rightNum ?? 'y'}`;
}

export function parseSideBySide(unifiedDiff: string): SideBySideLine[] {
  const raw = unifiedDiff.split('\n');
  const result: SideBySideLine[] = [];
  let oldNum = 0;
  let newNum = 0;

  // Collect pending del/add pairs to merge as 'modified'
  const pendingDels: { content: string; num: number }[] = [];
  const pendingAdds: { content: string; num: number }[] = [];

  const flushPending = () => {
    const maxLen = Math.max(pendingDels.length, pendingAdds.length);
    for (let i = 0; i < maxLen; i++) {
      const del = pendingDels[i];
      const add = pendingAdds[i];
      if (del && add) {
        result.push({
          type: 'modified',
          left: del.content,
          right: add.content,
          leftNum: del.num,
          rightNum: add.num,
        });
      } else if (del) {
        result.push({
          type: 'del',
          left: del.content,
          right: null,
          leftNum: del.num,
          rightNum: null,
        });
      } else if (add) {
        result.push({
          type: 'add',
          left: null,
          right: add.content,
          leftNum: null,
          rightNum: add.num,
        });
      }
    }
    pendingDels.length = 0;
    pendingAdds.length = 0;
  };

  for (const line of raw) {
    if (line.startsWith('@@')) {
      flushPending();
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldNum = Number.parseInt(match[1], 10) - 1;
        newNum = Number.parseInt(match[2], 10) - 1;
      }
      result.push({ type: 'ctx', left: line, right: line, leftNum: null, rightNum: null });
    } else if (line.startsWith('+')) {
      newNum++;
      pendingAdds.push({ content: line.slice(1), num: newNum });
    } else if (line.startsWith('-')) {
      oldNum++;
      pendingDels.push({ content: line.slice(1), num: oldNum });
    } else {
      flushPending();
      oldNum++;
      newNum++;
      result.push({
        type: 'ctx',
        left: line.slice(1),
        right: line.slice(1),
        leftNum: oldNum,
        rightNum: newNum,
      });
    }
  }
  flushPending();
  return result;
}

// Group consecutive ctx lines (not hunk headers) for collapsing
function groupForCollapse(
  lines: SideBySideLine[],
  threshold = 3,
): { lines: SideBySideLine[]; collapsible: boolean }[] {
  const groups: { lines: SideBySideLine[]; collapsible: boolean }[] = [];
  let ctxBuffer: SideBySideLine[] = [];

  const flushCtx = () => {
    if (ctxBuffer.length === 0) return;
    // Only collapse non-hunk ctx runs longer than threshold
    const isHunkOnly = ctxBuffer.every((l) => l.left?.startsWith('@@'));
    if (!isHunkOnly && ctxBuffer.length > threshold) {
      groups.push({ lines: ctxBuffer, collapsible: true });
    } else {
      groups.push({ lines: ctxBuffer, collapsible: false });
    }
    ctxBuffer = [];
  };

  for (const line of lines) {
    if (line.type === 'ctx') {
      ctxBuffer.push(line);
    } else {
      flushCtx();
      groups.push({ lines: [line], collapsible: false });
    }
  }
  flushCtx();
  return groups;
}

// ── Side-by-side row ──

function SbsRow({ line, idx }: { line: SideBySideLine; idx: number }) {
  const leftBg =
    line.type === 'del'
      ? 'bg-sy-danger/10 border-l-2 border-sy-danger'
      : line.type === 'modified'
        ? 'bg-sy-warn/10'
        : '';
  const rightBg =
    line.type === 'add'
      ? 'bg-sy-accent/10 border-l-2 border-sy-accent'
      : line.type === 'modified'
        ? 'bg-sy-warn/10'
        : '';

  const leftText =
    line.type === 'del'
      ? 'text-sy-danger'
      : line.type === 'modified'
        ? 'text-sy-warn'
        : 'text-sy-text-2';
  const rightText =
    line.type === 'add'
      ? 'text-sy-accent'
      : line.type === 'modified'
        ? 'text-sy-warn'
        : 'text-sy-text-2';

  // Hunk header spans full width
  if (line.type === 'ctx' && line.left?.startsWith('@@')) {
    return (
      <div
        key={getDiffLineKey(line, idx)}
        className="col-span-2 flex font-mono text-[11px] bg-sy-bg-2 border-y border-sy-border/40 px-3 py-0.5 text-sy-text-3"
      >
        <span className="flex-1 truncate">{line.left}</span>
      </div>
    );
  }

  return (
    <>
      {/* Left cell */}
      <div className={`flex items-baseline gap-1 min-w-0 ${leftBg} px-0`}>
        <span className="w-8 shrink-0 text-right pr-1.5 text-sy-text-3/40 select-none text-[10px] font-mono">
          {line.leftNum ?? ''}
        </span>
        <span
          className={`flex-1 font-mono text-[11.5px] leading-[1.7] whitespace-pre-wrap break-all py-px ${leftText}`}
        >
          {line.left ?? ''}
        </span>
      </div>
      {/* Right cell */}
      <div
        className={`flex items-baseline gap-1 min-w-0 border-l border-sy-border/30 ${rightBg} px-0`}
      >
        <span className="w-8 shrink-0 text-right pr-1.5 text-sy-text-3/40 select-none text-[10px] font-mono">
          {line.rightNum ?? ''}
        </span>
        <span
          className={`flex-1 font-mono text-[11.5px] leading-[1.7] whitespace-pre-wrap break-all py-px ${rightText}`}
        >
          {line.right ?? ''}
        </span>
      </div>
    </>
  );
}

function CollapsibleChunk({ lines }: { lines: SideBySideLine[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <div className="col-span-2">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1.5 w-full px-3 py-1 text-[11px] text-sy-text-3 bg-sy-bg-2 hover:bg-sy-bg-3 transition-colors border-y border-sy-border cursor-pointer"
        >
          <ChevronRight className="w-3 h-3" />
          <span className="font-mono">展开 {lines.length} 行未变更内容</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="col-span-2">
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex items-center gap-1.5 w-full px-3 py-0.5 text-[11px] text-sy-text-3 bg-sy-bg-2 hover:bg-sy-bg-3 transition-colors cursor-pointer"
        >
          <ChevronDown className="w-3 h-3" />
          <span className="font-mono">折叠</span>
        </button>
      </div>
      {lines.map((line, i) => (
        <SbsRow key={getDiffLineKey(line, i)} line={line} idx={i} />
      ))}
    </>
  );
}

export function DiffView({
  diffText,
  additions = 0,
  deletions = 0,
  className = '',
}: DiffViewProps) {
  const parsed = useMemo(() => parseSideBySide(diffText), [diffText]);
  const groups = useMemo(() => groupForCollapse(parsed), [parsed]);

  return (
    <div className={`border border-sy-border rounded-lg overflow-hidden bg-sy-bg-1 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-sy-border bg-sy-bg-1">
        <span className="text-[12px] font-medium text-sy-text-2">Diff 详情（并排视图）</span>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-sy-accent">+{additions}</span>
          <span className="text-sy-danger">−{deletions}</span>
        </div>
      </div>

      {/* Column header */}
      <div className="grid grid-cols-2 border-b border-sy-border bg-sy-bg-2">
        <div className="px-3 py-1 text-[10px] font-semibold text-sy-text-3 uppercase tracking-wider">
          旧版本
        </div>
        <div className="px-3 py-1 text-[10px] font-semibold text-sy-text-3 uppercase tracking-wider border-l border-sy-border/30">
          新版本
        </div>
      </div>

      {/* Diff body */}
      <div className="max-h-[480px] overflow-y-auto bg-sy-bg">
        <div className="grid grid-cols-2">
          {groups.map((group, gi) => {
            const key = `group-${gi}`;
            if (group.collapsible) {
              return <CollapsibleChunk key={key} lines={group.lines} />;
            }
            return group.lines.map((line, li) => (
              <SbsRow key={getDiffLineKey(line, gi * 1000 + li)} line={line} idx={gi * 1000 + li} />
            ));
          })}
        </div>
      </div>
    </div>
  );
}
