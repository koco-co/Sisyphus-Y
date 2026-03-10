'use client';

import { FileText, Loader2, Search, Sparkles } from 'lucide-react';
import type React from 'react';
import type { RAGSearchResult } from '@/stores/knowledge-store';

interface RAGTestPanelProps {
  query: string;
  results: RAGSearchResult[];
  searching: boolean;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
}

export default function RAGTestPanel({
  query,
  results,
  searching,
  onQueryChange,
  onSearch,
}: RAGTestPanelProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query);
  };

  return (
    <div className="card" style={{ marginTop: 24 }}>
      {/* Header */}
      <div className="sec-header">
        <span className="frame-label">RAG TEST</span>
        <span className="sec-title" style={{ marginLeft: 8 }}>
          检索效果验证
        </span>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
        输入查询文本，验证知识库的语义检索效果。返回最相关的知识片段及相似度评分。
      </p>

      {/* Search form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text3)',
            }}
          />
          <input
            className="input"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="输入查询内容，例如：数据导入失败如何处理..."
            style={{ width: '100%', paddingLeft: 32 }}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={!query.trim() || searching}>
          {searching ? (
            <>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              检索中
            </>
          ) : (
            <>
              <Sparkles size={14} />
              检索
            </>
          )}
        </button>
      </form>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {results.map((result, idx) => (
            <div
              key={result.id}
              style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 14,
                transition: 'border-color 0.15s',
              }}
            >
              {/* Result header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--accent)',
                    background: 'var(--accent-d)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  #{idx + 1}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: scoreColor(result.score),
                  }}
                >
                  {(result.score * 100).toFixed(1)}% 相似度
                </span>
                <div className="spacer" />
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    color: 'var(--text3)',
                  }}
                >
                  <FileText size={11} />
                  {result.source_doc}
                  {result.chunk_index > 0 && ` · Chunk ${result.chunk_index}`}
                </span>
              </div>

              {/* Content */}
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.7,
                  color: 'var(--text2)',
                  borderLeft: '2px solid var(--accent)',
                  paddingLeft: 12,
                  maxHeight: 120,
                  overflow: 'hidden',
                }}
              >
                {result.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state after search */}
      {!searching && results.length === 0 && query.trim() && (
        <div
          style={{
            textAlign: 'center',
            padding: 24,
            color: 'var(--text3)',
            fontSize: 12,
          }}
        >
          未找到匹配的知识片段，请尝试调整查询内容
        </div>
      )}
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 0.8) return 'var(--accent)';
  if (score >= 0.6) return 'var(--amber)';
  return 'var(--red)';
}
