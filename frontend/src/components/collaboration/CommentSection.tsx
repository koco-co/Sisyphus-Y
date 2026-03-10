'use client';

import { Loader2, MessageSquare, Send, User } from 'lucide-react';
import { type KeyboardEvent, useCallback, useRef, useState } from 'react';

export interface Comment {
  id: string;
  author: string;
  avatar_url?: string;
  content: string;
  created_at: string;
}

interface CommentSectionProps {
  comments: Comment[];
  currentUser?: string;
  loading?: boolean;
  onSubmit: (content: string) => Promise<void> | void;
  mentionableUsers?: string[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

function highlightMentions(text: string) {
  const parts = text.split(/(@\w+)/g);
  let cursor = 0;
  return parts.map((part) => {
    const key = `${part}-${cursor}`;
    cursor += part.length;
    if (part.startsWith('@')) {
      return (
        <span key={key} className="text-sy-accent font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}

export function CommentSection({
  comments,
  currentUser = '当前用户',
  loading = false,
  onSubmit,
  mentionableUsers = [],
}: CommentSectionProps) {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const filteredUsers = mentionableUsers.filter((u) =>
    u.toLowerCase().includes(mentionFilter.toLowerCase()),
  );

  const handleInputChange = (val: string) => {
    setInput(val);

    const atMatch = val.match(/@(\w*)$/);
    if (atMatch) {
      setShowMentions(true);
      setMentionFilter(atMatch[1]);
    } else {
      setShowMentions(false);
      setMentionFilter('');
    }
  };

  const insertMention = (user: string) => {
    const before = input.replace(/@\w*$/, '');
    setInput(`${before}@${user} `);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setInput('');
    } finally {
      setSubmitting(false);
    }
  }, [input, submitting, onSubmit]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-sy-border">
        <MessageSquare size={14} className="text-sy-accent" />
        <span className="text-[12px] font-semibold text-sy-text-2">评论 ({comments.length})</span>
      </div>

      {/* Comment list */}
      <ul className="flex-1 overflow-y-auto p-3 space-y-3" aria-label="评论列表">
        {loading ? (
          <li className="flex justify-center py-6">
            <Loader2 size={20} className="animate-spin text-sy-text-3" />
          </li>
        ) : comments.length === 0 ? (
          <li className="text-center py-6 text-[12px] text-sy-text-3">暂无评论</li>
        ) : (
          comments.map((c) => (
            <li key={c.id} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-sy-bg-3 border border-sy-border flex items-center justify-center shrink-0">
                {c.avatar_url ? (
                  <div
                    role="img"
                    aria-label={`${c.author} 头像`}
                    className="w-full h-full rounded-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${c.avatar_url}")` }}
                  />
                ) : (
                  <User size={13} className="text-sy-text-3" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] font-semibold text-sy-text">{c.author}</span>
                  <span className="text-[10px] font-mono text-sy-text-3">
                    {timeAgo(c.created_at)}
                  </span>
                </div>
                <p className="text-[12.5px] text-sy-text-2 mt-0.5 leading-relaxed break-words whitespace-pre-wrap">
                  {highlightMentions(c.content)}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>

      {/* Input area */}
      <div className="px-3 pb-3 pt-1 border-t border-sy-border relative">
        {/* Mention dropdown */}
        {showMentions && filteredUsers.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-sy-bg-1 border border-sy-border rounded-md shadow-lg max-h-[120px] overflow-y-auto z-10">
            {filteredUsers.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => insertMention(u)}
                className="w-full text-left px-3 py-1.5 text-[12px] text-sy-text-2 hover:bg-sy-bg-2 transition-colors"
              >
                @{u}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`${currentUser}，输入评论... 按 @ 提及用户`}
            rows={2}
            className="input flex-1 resize-none text-[12.5px] min-h-[56px]"
            aria-label="评论输入框"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || submitting}
            className="flex items-center justify-center w-8 h-8 rounded-md bg-sy-accent text-black disabled:opacity-40 hover:bg-sy-accent-2 transition-colors shrink-0"
            aria-label="发送评论"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p className="text-[10px] text-sy-text-3 mt-1">Ctrl+Enter 发送</p>
      </div>
    </div>
  );
}
