'use client';

import { Loader2, Send, Square } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!text.trim() || isStreaming || disabled) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, isStreaming, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, []);

  return (
    <div className="border-t border-border bg-bg1 px-4 py-3 shrink-0">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="输入指令生成测试用例... (Shift+Enter 换行)"
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-bg2 border border-border rounded-lg px-3 py-2.5 text-[13px] text-text placeholder:text-text3 outline-none focus:border-sy-accent transition-colors disabled:opacity-50"
          style={{ minHeight: '42px', maxHeight: '150px' }}
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-sy-danger text-white font-semibold hover:opacity-90 transition-opacity"
            title="停止生成"
          >
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || !text.trim()}
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-sy-accent text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sy-accent-2 transition-colors"
          >
            {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
