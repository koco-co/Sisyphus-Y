'use client';

import { Activity, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { StreamCursor } from '@/components/workspace/StreamCursor';
import type { ChatMessage } from '@/lib/api';

interface DiagnosisChatProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamContent: string;
  streamThinking: string;
  reqTitle: string;
  hasRequirement: boolean;
}

interface DiagnosisDimension {
  title: string;
  description: string;
  risk_level: 'high' | 'medium' | 'low';
  suggestion: string;
}

interface DiagnosisJsonResult {
  overall_health_score?: number;
  dimensions?: DiagnosisDimension[];
  [key: string]: unknown;
}

const riskConfig: Record<string, { label: string; className: string }> = {
  high: { label: '高风险', className: 'text-sy-danger font-semibold' },
  medium: { label: '中风险', className: 'text-sy-warn font-semibold' },
  low: { label: '低风险', className: 'text-sy-info font-semibold' },
};

function RenderDiagnosisJson({ json }: { json: DiagnosisJsonResult }) {
  return (
    <>
      {json.overall_health_score !== undefined && (
        <div className="mb-3 p-2 px-3 bg-sy-bg-2 rounded-lg flex items-center gap-2">
          <span className="text-[11px] text-sy-text-3">总体健康评分</span>
          <span
            className={`text-[20px] font-bold font-mono ${
              json.overall_health_score >= 70
                ? 'text-sy-accent'
                : json.overall_health_score >= 50
                  ? 'text-sy-warn'
                  : 'text-sy-danger'
            }`}
          >
            {json.overall_health_score}
          </span>
          <span className="text-[11px] text-sy-text-3">/100</span>
        </div>
      )}
      {Array.isArray(json.dimensions) && (
        <div className="flex flex-col gap-2">
          {json.dimensions.map((dim) => {
            const risk = riskConfig[dim.risk_level] ?? {
              label: dim.risk_level,
              className: 'text-sy-text-2',
            };
            return (
              <div key={dim.title} className="p-2.5 px-3 rounded-md bg-sy-bg-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[12.5px] font-semibold text-sy-text">{dim.title}</span>
                  <span className={`text-[11px] ${risk.className}`}>{risk.label}</span>
                </div>
                <p className="text-[12px] text-sy-text-2 mb-1">{dim.description}</p>
                <p className="text-[11.5px] text-sy-text-3">
                  <strong>建议：</strong>
                  {dim.suggestion}
                </p>
              </div>
            );
          })}
        </div>
      )}
      {json.overall_health_score === undefined && !Array.isArray(json.dimensions) && (
        <pre className="text-[11px] text-sy-text-2 whitespace-pre-wrap">
          {JSON.stringify(json, null, 2)}
        </pre>
      )}
    </>
  );
}

function renderTextSegments(text: string): ReactNode[] {
  const segments: ReactNode[] = [];
  let idx = 0;

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      segments.push(
        <h3 key={idx++} className="text-[13px] font-semibold text-sy-text mt-2 mb-1">
          {applyInlineFormatting(line.slice(4))}
        </h3>,
      );
    } else if (line.startsWith('## ')) {
      segments.push(
        <h2 key={idx++} className="text-[14px] font-bold text-sy-text mt-2 mb-1">
          {applyInlineFormatting(line.slice(3))}
        </h2>,
      );
    } else if (line.startsWith('- ')) {
      const listItems: ReactNode[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        listItems.push(<li key={idx++}>{applyInlineFormatting(lines[i].slice(2))}</li>);
        i++;
      }
      i--;
      segments.push(
        <ul key={idx++} className="list-disc pl-4 space-y-0.5">
          {listItems}
        </ul>,
      );
    } else if (line.trim() === '') {
      segments.push(<br key={idx++} />);
    } else {
      segments.push(
        <p key={idx++} className="mb-1">
          {applyInlineFormatting(line)}
        </p>,
      );
    }
  }
  return segments;
}

function applyInlineFormatting(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let remaining = text;
  let idx = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    let firstMatch: { index: number; length: number; node: ReactNode } | null = null;

    if (boldMatch?.index !== undefined) {
      firstMatch = {
        index: boldMatch.index,
        length: boldMatch[0].length,
        node: (
          <strong key={idx++} className="font-semibold">
            {boldMatch[1]}
          </strong>
        ),
      };
    }

    if (codeMatch?.index !== undefined && (!firstMatch || codeMatch.index < firstMatch.index)) {
      firstMatch = {
        index: codeMatch.index,
        length: codeMatch[0].length,
        node: (
          <code key={idx++} className="px-1 py-0.5 bg-sy-bg-3 rounded text-[11px] font-mono">
            {codeMatch[1]}
          </code>
        ),
      };
    }

    if (!firstMatch) {
      parts.push(remaining);
      break;
    }

    if (firstMatch.index > 0) {
      parts.push(remaining.slice(0, firstMatch.index));
    }
    parts.push(firstMatch.node);
    remaining = remaining.slice(firstMatch.index + firstMatch.length);
  }

  return parts.length === 1 ? parts[0] : parts;
}

function RenderMarkdown({ text }: { text: string }): ReactNode {
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    try {
      const parsed: DiagnosisJsonResult = JSON.parse(jsonBlockMatch[1]);
      const before = text.substring(0, text.indexOf('```json')).trim();
      const after = text.substring(text.indexOf('```', text.indexOf('```json') + 7) + 3).trim();
      return (
        <>
          {before && <div>{renderTextSegments(before)}</div>}
          <RenderDiagnosisJson json={parsed} />
          {after && <div>{renderTextSegments(after)}</div>}
        </>
      );
    } catch {
      // fall through to normal markdown
    }
  }

  return <>{renderTextSegments(text)}</>;
}

export function DiagnosisChat({
  messages,
  isStreaming,
  streamContent,
  streamThinking,
  reqTitle: _reqTitle,
  hasRequirement,
}: DiagnosisChatProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll must trigger on content changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamContent]);

  if (!hasRequirement) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-16 h-16 text-text3 opacity-20 mx-auto mb-4" />
          <p className="text-[15px] text-text3">从左侧选择需求后开始 AI 分析</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !isStreaming && (
          <div className="text-center py-8">
            <Activity className="w-10 h-10 text-text3 opacity-30 mx-auto mb-2.5" />
            <p className="text-[13px] text-text3">苏格拉底追问区</p>
            <p className="text-[11.5px] text-text3 opacity-60 mt-1">
              运行广度扫描后，可在此与 AI 深度追问
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id ?? `${msg.role}-${msg.created_at}`}
            className={`flex gap-2.5 mb-3.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-bold ${
                msg.role === 'user'
                  ? 'bg-bg3 border border-border text-text2'
                  : 'bg-[linear-gradient(135deg,rgba(0,217,163,0.1),rgba(59,130,246,0.15))] border border-sy-accent/30 text-sy-accent'
              }`}
            >
              {msg.role === 'user' ? 'U' : 'AI'}
            </div>
            <div>
              {msg.role === 'user' ? (
                <div className="rounded-lg px-3 py-2.5 max-w-[480px] text-[12.5px] leading-relaxed bg-bg2 border border-border text-text">
                  {msg.content}
                </div>
              ) : (
                <div className="rounded-lg px-3 py-2.5 max-w-[480px] text-[12.5px] leading-relaxed bg-sy-accent/4 border border-sy-accent/20 text-sy-text chat-bubble ai-bubble">
                  <RenderMarkdown text={msg.content} />
                </div>
              )}
              {msg.created_at && (
                <div className="text-[10px] text-text3 mt-1 font-mono">
                  {new Date(msg.created_at).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Thinking stream */}
        {isStreaming && streamThinking && !streamContent && (
          <div className="mb-3 rounded-lg border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-bg2 text-[11.5px] text-text3">
              <span className="w-1.5 h-1.5 rounded-full bg-sy-accent animate-pulse" />
              <span>思考中...</span>
            </div>
            <div className="px-3 py-2 bg-bg text-text3 text-[12px] font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {streamThinking}
              <StreamCursor />
            </div>
          </div>
        )}

        {/* Streaming content */}
        {isStreaming && streamContent && (
          <div className="flex gap-2.5 mb-3.5">
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-bold bg-[linear-gradient(135deg,rgba(0,217,163,0.1),rgba(59,130,246,0.15))] border border-sy-accent/30 text-sy-accent">
              AI
            </div>
            <div>
              <div className="rounded-lg px-3 py-2.5 max-w-[480px] text-[12.5px] leading-relaxed bg-sy-accent/4 border border-sy-accent/20 text-sy-text chat-bubble ai-bubble">
                <RenderMarkdown text={streamContent} />
              </div>
              <StreamCursor />
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isStreaming && !streamContent && !streamThinking && (
          <div className="flex gap-2.5 mb-3.5">
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-bold bg-[linear-gradient(135deg,rgba(0,217,163,0.1),rgba(59,130,246,0.15))] border border-sy-accent/30 text-sy-accent">
              AI
            </div>
            <div className="rounded-lg px-3 py-2.5 bg-sy-accent/4 border border-sy-accent/20 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-sy-accent animate-spin" />
              <span className="text-[13px] text-text3">AI 正在分析...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>
    </div>
  );
}
