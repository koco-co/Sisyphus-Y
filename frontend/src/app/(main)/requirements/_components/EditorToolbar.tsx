'use client';

import {
  Bold,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
} from 'lucide-react';
import { useCallback } from 'react';

interface EditorToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onContentChange?: (value: string) => void;
}

type FormatAction = {
  icon: React.ReactNode;
  title: string;
  prefix: string;
  suffix?: string;
  block?: boolean;
};

const ACTIONS: FormatAction[] = [
  { icon: <Bold size={14} />, title: '加粗', prefix: '**', suffix: '**' },
  { icon: <Italic size={14} />, title: '斜体', prefix: '*', suffix: '*' },
  { icon: <Code size={14} />, title: '行内代码', prefix: '`', suffix: '`' },
  { icon: <Link size={14} />, title: '链接', prefix: '[', suffix: '](url)' },
];

const BLOCK_ACTIONS: FormatAction[] = [
  { icon: <Heading1 size={14} />, title: '一级标题', prefix: '# ', block: true },
  { icon: <Heading2 size={14} />, title: '二级标题', prefix: '## ', block: true },
  { icon: <Heading3 size={14} />, title: '三级标题', prefix: '### ', block: true },
  { icon: <Quote size={14} />, title: '引用', prefix: '> ', block: true },
  { icon: <List size={14} />, title: '无序列表', prefix: '- ', block: true },
  { icon: <ListOrdered size={14} />, title: '有序列表', prefix: '1. ', block: true },
  { icon: <CheckSquare size={14} />, title: '任务列表', prefix: '- [ ] ', block: true },
  { icon: <Minus size={14} />, title: '分割线', prefix: '\n---\n', block: true },
];

export function EditorToolbar({ textareaRef, onContentChange }: EditorToolbarProps) {
  const applyFormat = useCallback(
    (action: FormatAction) => {
      const el = textareaRef.current;
      if (!el) return;

      const start = el.selectionStart;
      const end = el.selectionEnd;
      const text = el.value;
      const selected = text.slice(start, end);

      let newText: string;
      let cursorPos: number;

      if (action.block) {
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        newText = text.slice(0, lineStart) + action.prefix + text.slice(lineStart);
        cursorPos = lineStart + action.prefix.length + (end - lineStart);
      } else {
        const suffix = action.suffix ?? '';
        const wrapped = `${action.prefix}${selected || '文本'}${suffix}`;
        newText = text.slice(0, start) + wrapped + text.slice(end);
        cursorPos = start + action.prefix.length + (selected ? selected.length : 2) + suffix.length;
      }

      el.value = newText;
      el.setSelectionRange(cursorPos, cursorPos);
      el.focus();
      onContentChange?.(newText);
    },
    [textareaRef, onContentChange],
  );

  return (
    <div className="flex items-center gap-0.5 flex-wrap px-3 py-1.5 bg-bg1 border border-border rounded-t-lg border-b-0">
      {/* Inline formatting */}
      {ACTIONS.map((action) => (
        <button
          key={action.title}
          type="button"
          title={action.title}
          onClick={() => applyFormat(action)}
          className="p-1.5 rounded text-text3 hover:text-text hover:bg-bg2 transition-colors"
        >
          {action.icon}
        </button>
      ))}

      <div className="w-px h-4 bg-border mx-1" />

      {/* Block formatting */}
      {BLOCK_ACTIONS.map((action) => (
        <button
          key={action.title}
          type="button"
          title={action.title}
          onClick={() => applyFormat(action)}
          className="p-1.5 rounded text-text3 hover:text-text hover:bg-bg2 transition-colors"
        >
          {action.icon}
        </button>
      ))}
    </div>
  );
}
