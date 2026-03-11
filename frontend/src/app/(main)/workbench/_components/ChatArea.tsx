'use client';

import { Bot, Loader2, User } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ThinkingStream } from '@/components/ui/ThinkingStream';
import { CaseCard } from '@/components/workspace/CaseCard';
import { StreamCursor } from '@/components/workspace/StreamCursor';
import type { WorkbenchMessage } from '@/stores/workspace-store';
import { CaseSkeleton } from './CaseSkeleton';

interface ChatAreaProps {
  messages: WorkbenchMessage[];
  streamingContent: string;
  streamingThinking: string;
  isStreaming: boolean;
}

function renderMarkdown(text: string): string {
  return text
    .replace(/### (.+)/g, '<h3 class="text-[13px] font-semibold text-text mt-3 mb-1">$1</h3>')
    .replace(/## (.+)/g, '<h2 class="text-[14px] font-semibold text-text mt-3 mb-1">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-text">$1</strong>')
    .replace(
      /`([^`]+)`/g,
      '<code class="px-1 py-0.5 rounded bg-bg3 text-accent font-mono text-[11px]">$1</code>',
    )
    .replace(/^- (.+)$/gm, '<li class="ml-3 text-[12.5px] text-text2 leading-relaxed">• $1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

/** 检测文本是否为 JSON 格式（LLM 返回的用例 JSON） */
function isJsonContent(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith('{') || t.startsWith('[');
}

/** 从流式 JSON 中粗略计数已完整解析出的用例数量 */
function countStreamedCases(text: string): number {
  const matches = text.match(/"case_id"\s*:/g);
  return matches ? matches.length : 0;
}

const AI_AVATAR = (
  <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-accent/15 to-blue/15 border border-accent/30">
    <Bot className="w-3.5 h-3.5 text-accent" />
  </div>
);

/** 流式 JSON 生成时的进度动画，替代裸 JSON 输出 */
function CaseGeneratingPanel({ caseCount }: { caseCount: number }) {
  return (
    <div className="rounded-xl rounded-bl-sm px-3.5 py-3 bg-accent/4 border border-accent/15">
      <div className="flex items-center gap-2 text-[12.5px] text-text2 mb-3">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-accent shrink-0" />
        <span>
          AI 正在生成测试用例
          {caseCount > 0 ? (
            <span className="ml-1 text-accent font-semibold">（已完成 {caseCount} 个）</span>
          ) : (
            <StreamCursor />
          )}
        </span>
      </div>
      <CaseSkeleton count={Math.max(caseCount, 1)} />
    </div>
  );
}

function MessageBubble({ message }: { message: WorkbenchMessage }) {
  const isAI = message.role === 'assistant';
  const [thinkingOpen, setThinkingOpen] = useState(false);

  // 如果 AI 消息内容是裸 JSON 但已有解析好的用例，隐藏 JSON 文本
  const hasCases = isAI && (message.cases?.length ?? 0) > 0;
  const contentIsJson = isAI && isJsonContent(message.content);
  const showRawContent = !contentIsJson || !hasCases;

  return (
    <div className={`flex gap-2.5 mb-4 ${isAI ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${
          isAI
            ? 'bg-gradient-to-br from-accent/15 to-blue/15 border border-accent/30'
            : 'bg-bg3 border border-border'
        }`}
      >
        {isAI ? (
          <Bot className="w-3.5 h-3.5 text-accent" />
        ) : (
          <User className="w-3.5 h-3.5 text-text2" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isAI ? 'max-w-[85%]' : 'max-w-[75%]'}`}>
        {/* Thinking block (collapsible) */}
        {isAI && message.thinking_content && (
          <div className="mb-2">
            <button
              type="button"
              onClick={() => setThinkingOpen(!thinkingOpen)}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] text-text3 bg-bg2 border border-border hover:border-border2 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple" />
              思考过程
              <span className="text-[10px]">{thinkingOpen ? '▲' : '▼'}</span>
            </button>
            {thinkingOpen && (
              <div className="mt-1.5 px-3 py-2 rounded-md bg-bg2 border border-border text-[11px] text-text3 font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                {message.thinking_content}
              </div>
            )}
          </div>
        )}

        {/* Message body — 纯 JSON 内容且已有解析用例时，仅显示摘要 */}
        <div
          className={`rounded-xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
            isAI
              ? 'bg-accent/4 border border-accent/15 text-text rounded-bl-sm'
              : 'bg-bg2 border border-border text-text rounded-br-sm'
          }`}
        >
          {isAI ? (
            showRawContent ? (
              <div
                className="prose-sm"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: markdown render of AI content
                dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
              />
            ) : (
              <span className="text-text2">
                AI 已生成 <span className="font-semibold text-accent">{message.cases?.length}</span>{' '}
                个测试用例
              </span>
            )
          ) : (
            <span className="whitespace-pre-wrap">{message.content}</span>
          )}
        </div>

        {/* Embedded test cases */}
        {hasCases && (
          <div className="mt-2 space-y-2">
            {message.cases?.map((tc) => (
              <CaseCard
                key={tc.id}
                caseId={tc.case_id}
                title={tc.title}
                priority={tc.priority}
                type={tc.case_type}
                status={tc.status}
                precondition={tc.precondition}
                steps={tc.steps}
                aiScore={tc.ai_score}
              />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className={`mt-1 text-[10px] text-text3 font-mono ${isAI ? '' : 'text-right'}`}>
          {message.created_at?.slice(11, 16)}
        </div>
      </div>
    </div>
  );
}

export function ChatArea({
  messages,
  streamingContent,
  streamingThinking,
  isStreaming,
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  // 用户是否主动向上滚动（为 true 时暂停自动跟随）
  const isUserScrolledUp = useRef(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserScrolledUp.current = distFromBottom > 80;
  }, []);

  // 流式输出期间用 instant，避免 smooth 持续接管用户滚动
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll must run on every content tick
  useEffect(() => {
    if (isUserScrolledUp.current) return;
    chatEndRef.current?.scrollIntoView({
      behavior: isStreaming ? 'instant' : 'smooth',
    });
  }, [messages.length, streamingContent, streamingThinking, isStreaming]);

  // 新消息到来（非流式）时强制回到底部并重置状态
  // biome-ignore lint/correctness/useExhaustiveDependencies: only reset on message count change
  useEffect(() => {
    isUserScrolledUp.current = false;
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <EmptyState
          title="开始对话，生成测试用例"
          description="试试输入：请根据测试点生成详细测试用例"
        />
      </div>
    );
  }

  const streamedCaseCount = countStreamedCases(streamingContent);
  const streamIsJson = isJsonContent(streamingContent);

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {/* Streaming thinking */}
      {isStreaming && streamingThinking && (
        <ThinkingStream text={streamingThinking} isStreaming={!streamingContent} />
      )}

      {/* Streaming content — JSON 时显示进度动画，否则渲染 Markdown */}
      {isStreaming && streamingContent && (
        <div className="flex gap-2.5 mb-4">
          {AI_AVATAR}
          <div className="flex-1 max-w-[85%]">
            {streamIsJson ? (
              <CaseGeneratingPanel caseCount={streamedCaseCount} />
            ) : (
              <div className="rounded-xl rounded-bl-sm px-3.5 py-2.5 bg-accent/4 border border-accent/15 text-[12.5px] leading-relaxed text-text">
                <div
                  className="prose-sm"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: streaming markdown content
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingContent) }}
                />
                <StreamCursor />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading indicator — 还没有任何内容时的等待状态 */}
      {isStreaming && !streamingContent && !streamingThinking && (
        <div className="flex gap-2.5 mb-4">
          {AI_AVATAR}
          <div className="rounded-xl rounded-bl-sm px-3.5 py-2.5 bg-accent/4 border border-accent/15 text-text">
            <div className="flex items-center gap-2 text-[12.5px] text-text2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
              AI 思考中...
            </div>
          </div>
        </div>
      )}

      <div ref={chatEndRef} />
    </div>
  );
}
