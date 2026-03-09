'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

interface DiffViewProps {
  diffText: string;
  additions?: number;
  deletions?: number;
  className?: string;
}

interface DiffLine {
  type: 'add' | 'del' | 'ctx';
  content: string;
  oldNum: number | null;
  newNum: number | null;
}

function parseDiffLines(text: string): DiffLine[] {
  const raw = text.split('\n');
  const lines: DiffLine[] = [];
  let oldNum = 0;
  let newNum = 0;

  for (const line of raw) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldNum = Number.parseInt(match[1], 10) - 1;
        newNum = Number.parseInt(match[2], 10) - 1;
      }
      lines.push({ type: 'ctx', content: line, oldNum: null, newNum: null });
      continue;
    }

    if (line.startsWith('+')) {
      newNum++;
      lines.push({ type: 'add', content: line, oldNum: null, newNum });
    } else if (line.startsWith('-')) {
      oldNum++;
      lines.push({ type: 'del', content: line, oldNum, newNum: null });
    } else {
      oldNum++;
      newNum++;
      lines.push({ type: 'ctx', content: line, oldNum, newNum });
    }
  }
  return lines;
}

function groupContextChunks(lines: DiffLine[], threshold = 6) {
  const groups: { lines: DiffLine[]; collapsible: boolean }[] = [];
  let contextBuffer: DiffLine[] = [];

  const flushContext = () => {
    if (contextBuffer.length === 0) return;
    if (contextBuffer.length > threshold) {
      groups.push({ lines: contextBuffer, collapsible: true });
    } else {
      groups.push({ lines: contextBuffer, collapsible: false });
    }
    contextBuffer = [];
  };

  for (const line of lines) {
    if (line.type === 'ctx') {
      contextBuffer.push(line);
    } else {
      flushContext();
      groups.push({ lines: [line], collapsible: false });
    }
  }
  flushContext();
  return groups;
}

function CollapsibleChunk({
  lines,
}: { lines: DiffLine[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 w-full px-3 py-1 text-[11px] text-text3 bg-bg2 hover:bg-bg3 transition-colors border-y border-border cursor-pointer"
      >
        <ChevronRight className="w-3 h-3" />
        <span className="font-mono">展开 {lines.length} 行上下文...</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="flex items-center gap-1.5 w-full px-3 py-0.5 text-[11px] text-text3 bg-bg2 hover:bg-bg3 transition-colors cursor-pointer"
      >
        <ChevronDown className="w-3 h-3" />
        <span className="font-mono">折叠</span>
      </button>
      {lines.map((line, i) => (
        <DiffLineRow key={`ctx-${line.oldNum}-${i}`} line={line} />
      ))}
    </>
  );
}

function DiffLineRow({ line }: { line: DiffLine }) {
  const bgClass =
    line.type === 'add'
      ? 'bg-accent/8'
      : line.type === 'del'
        ? 'bg-red/8'
        : '';
  const textClass =
    line.type === 'add'
      ? 'text-accent'
      : line.type === 'del'
        ? 'text-red'
        : 'text-text3';

  return (
    <div className={`flex font-mono text-[12px] leading-[1.7] ${bgClass}`}>
      <span className="w-10 shrink-0 text-right pr-2 text-text3/50 select-none text-[11px]">
        {line.oldNum ?? ''}
      </span>
      <span className="w-10 shrink-0 text-right pr-2 text-text3/50 select-none text-[11px]">
        {line.newNum ?? ''}
      </span>
      <span className={`flex-1 px-2 whitespace-pre-wrap break-all ${textClass}`}>
        {line.content}
      </span>
    </div>
  );
}

export function DiffView({
  diffText,
  additions = 0,
  deletions = 0,
  className = '',
}: DiffViewProps) {
  const parsed = useMemo(() => parseDiffLines(diffText), [diffText]);
  const groups = useMemo(() => groupContextChunks(parsed), [parsed]);

  return (
    <div
      className={`border border-border rounded-lg overflow-hidden bg-bg1 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg1">
        <span className="text-[12px] font-medium text-text2">Diff 详情</span>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-accent">+{additions}</span>
          <span className="text-red">−{deletions}</span>
        </div>
      </div>

      {/* Line number header */}
      <div className="flex font-mono text-[10px] text-text3/50 bg-bg2 border-b border-border px-0 py-0.5">
        <span className="w-10 text-right pr-2">旧</span>
        <span className="w-10 text-right pr-2">新</span>
        <span className="flex-1 px-2" />
      </div>

      {/* Diff body */}
      <div className="max-h-[480px] overflow-y-auto bg-bg">
        {groups.map((group, gi) => {
          if (group.collapsible) {
            return <CollapsibleChunk key={`g-${gi}`} lines={group.lines} />;
          }
          return group.lines.map((line, li) => (
            <DiffLineRow
              key={`l-${gi}-${li}`}
              line={line}
            />
          ));
        })}
      </div>
    </div>
  );
}
