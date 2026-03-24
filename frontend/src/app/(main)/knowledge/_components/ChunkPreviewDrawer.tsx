'use client';

import { ChevronDown, ChevronUp, FileText, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ChunkItem {
  index: number;
  content: string;
  token_count: number;
}

interface ChunksResponse {
  items: ChunkItem[];
  total: number;
}

export interface ChunkPreviewDrawerProps {
  open: boolean;
  docId: string | null;
  docTitle: string;
  onClose: () => void;
}

const PAGE_SIZE = 50;

function ChunkCard({ chunk }: { chunk: ChunkItem }) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = chunk.content.length > 120;
  const displayText =
    expanded || !shouldTruncate ? chunk.content : `${chunk.content.slice(0, 120)}...`;

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2 bg-bg1 border-b border-border">
        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-bg3 text-text2 border border-border min-w-[36px] text-center">
          #{String(chunk.index + 1).padStart(2, '0')}
        </span>
        <span className="text-[11px] text-text3">约 {chunk.token_count} 词</span>
      </div>
      <div className="bg-bg2 px-3 py-2.5">
        <p className="text-[12.5px] text-text leading-relaxed whitespace-pre-wrap">{displayText}</p>
        {shouldTruncate && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="mt-1.5 flex items-center gap-1 text-[11px] text-sy-accent hover:text-sy-accent-2 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                收起
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                展开
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function SkeletonChunk() {
  return (
    <div className="border border-border rounded-md overflow-hidden animate-pulse">
      <div className="flex items-center gap-3 px-3 py-2 bg-bg1 border-b border-border">
        <div className="w-9 h-5 bg-bg3 rounded" />
        <div className="w-16 h-3.5 bg-bg3 rounded" />
      </div>
      <div className="bg-bg2 px-3 py-2.5 space-y-1.5">
        <div className="h-3 bg-bg3 rounded w-full" />
        <div className="h-3 bg-bg3 rounded w-3/4" />
        <div className="h-3 bg-bg3 rounded w-5/6" />
      </div>
    </div>
  );
}

export default function ChunkPreviewDrawer({
  open,
  docId,
  docTitle,
  onClose,
}: ChunkPreviewDrawerProps) {
  const [chunks, setChunks] = useState<ChunkItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const prevDocId = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchChunks = useCallback(async (id: string, currentOffset: number, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch(
        `/api/knowledge/${id}/chunks?limit=${PAGE_SIZE}&offset=${currentOffset}`,
      );
      if (!res.ok) throw new Error(`请求失败 (${res.status})`);
      const data: ChunksResponse = await res.json();
      if (append) {
        setChunks((prev) => [...prev, ...data.items]);
      } else {
        setChunks(data.items);
      }
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载分块失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (open && docId && docId !== prevDocId.current) {
      prevDocId.current = docId;
      setChunks([]);
      setTotal(0);
      setOffset(0);
      fetchChunks(docId, 0, false);
    }
    if (!open) {
      prevDocId.current = null;
    }
  }, [open, docId, fetchChunks]);

  const handleLoadMore = useCallback(() => {
    if (!docId) return;
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    fetchChunks(docId, newOffset, true);
  }, [docId, offset, fetchChunks]);

  if (!open) return null;

  const hasMore = total > chunks.length;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="关闭分块预览"
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-[640px] max-w-[95vw] bg-bg1 border-l border-border z-50 flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-4 h-4 text-sy-accent shrink-0" />
            <div className="min-w-0">
              <h3 className="text-[14px] font-semibold text-text truncate">{docTitle}</h3>
              {!loading && <p className="text-[11px] text-text3 mt-0.5">共 {total} 个分块</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text3 hover:text-text transition-colors shrink-0 ml-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading && (
            <>
              <SkeletonChunk />
              <SkeletonChunk />
              <SkeletonChunk />
            </>
          )}

          {!loading && error && (
            <div className="text-center py-8 text-[12.5px] text-sy-danger">{error}</div>
          )}

          {!loading && !error && chunks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-text3">
              <FileText className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-[12.5px]">该文档暂无分块，可能正在向量化中</p>
            </div>
          )}

          {!loading && chunks.map((chunk) => <ChunkCard key={chunk.index} chunk={chunk} />)}

          {/* Load more */}
          {!loading && hasMore && (
            <div className="pt-2 pb-1 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-4 py-2 rounded-md text-[12px] font-medium border border-border bg-bg2 text-text2 hover:bg-bg3 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    加载中...
                  </>
                ) : (
                  `加载更多（剩余 ${total - chunks.length} 个）`
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
