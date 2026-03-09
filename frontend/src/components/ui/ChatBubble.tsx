interface ChatBubbleProps {
  role: 'ai' | 'user';
  content: string;
  time?: string;
  isStreaming?: boolean;
}

export function ChatBubble({
  role,
  content,
  time,
  isStreaming,
}: ChatBubbleProps) {
  const isAI = role === 'ai';
  return (
    <div className={`flex gap-2.5 mb-3.5 ${isAI ? '' : 'flex-row-reverse'}`}>
      <div
        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-bold ${
          isAI
            ? 'bg-[linear-gradient(135deg,rgba(0,217,163,0.1),rgba(59,130,246,0.15))] border border-[rgba(0,217,163,0.3)] text-accent'
            : 'bg-bg3 border border-border text-text2'
        }`}
      >
        {isAI ? 'AI' : 'U'}
      </div>
      <div>
        <div
          className={`rounded-lg px-3 py-2.5 max-w-[480px] text-[12.5px] leading-relaxed ${
            isAI
              ? 'bg-[rgba(0,217,163,0.04)] border border-[rgba(0,217,163,0.2)] text-text'
              : 'bg-bg2 border border-border text-text'
          }`}
        >
          {content}
          {isStreaming && (
            <span className="inline-block w-[2px] h-3 bg-accent ml-0.5 animate-[blink_1s_infinite]" />
          )}
        </div>
        {time && (
          <div className="text-[10px] text-text3 mt-1 font-mono">{time}</div>
        )}
      </div>
    </div>
  );
}
