'use client';

import {
  FileText,
  HardDrive,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import type { KnowledgeDocument, VectorStatus } from '@/stores/knowledge-store';

const STATUS_CONFIG: Record<
  VectorStatus,
  { label: string; pillClass: string }
> = {
  completed: { label: '已完成', pillClass: 'pill pill-green' },
  processing: { label: '处理中', pillClass: 'pill pill-amber' },
  failed: { label: '失败', pillClass: 'pill pill-red' },
  pending: { label: '待处理', pillClass: 'pill pill-gray' },
};

const TYPE_LABELS: Record<string, string> = {
  md: 'Markdown',
  docx: 'Word',
  pdf: 'PDF',
  txt: '文本',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocTableProps {
  documents: KnowledgeDocument[];
  loading: boolean;
  onDelete: (id: string) => void;
  onRebuildIndex: (id: string) => void;
}

export default function DocTable({
  documents,
  loading,
  onDelete,
  onRebuildIndex,
}: DocTableProps) {
  if (loading) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <Loader2
          size={24}
          style={{
            color: 'var(--accent)',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
          加载文档列表...
        </p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <HardDrive size={48} />
          <p style={{ fontWeight: 500 }}>暂无知识库文档</p>
          <p>上传 .md / .docx / .pdf / .txt 文件构建知识库</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="tbl">
        <thead>
          <tr>
            <th>文件名</th>
            <th>类型</th>
            <th>大小</th>
            <th>向量化状态</th>
            <th>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Search size={10} />
                命中
              </span>
            </th>
            <th>分块数</th>
            <th>上传时间</th>
            <th style={{ textAlign: 'right' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const ext = doc.file_name.split('.').pop()?.toLowerCase() || '';
            const statusCfg = STATUS_CONFIG[doc.vector_status] || STATUS_CONFIG.pending;
            return (
              <tr key={doc.id}>
                <td>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <FileText
                      size={14}
                      style={{ color: 'var(--accent)', flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontWeight: 500,
                        color: 'var(--text)',
                        maxWidth: 240,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {doc.file_name}
                    </span>
                  </div>
                </td>
                <td>
                  <span className="pill pill-gray">
                    {TYPE_LABELS[ext] || ext.toUpperCase()}
                  </span>
                </td>
                <td>
                  <span className="mono" style={{ fontSize: 11 }}>
                    {formatFileSize(doc.file_size)}
                  </span>
                </td>
                <td>
                  <span className={statusCfg.pillClass}>
                    {doc.vector_status === 'processing' && (
                      <Loader2
                        size={10}
                        style={{ animation: 'spin 1s linear infinite' }}
                      />
                    )}
                    {statusCfg.label}
                  </span>
                </td>
                <td>
                  <span
                    className="mono"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color:
                        doc.hit_count > 0
                          ? 'var(--accent)'
                          : 'var(--text3)',
                    }}
                  >
                    {doc.hit_count}
                  </span>
                </td>
                <td>
                  <span className="mono" style={{ fontSize: 11 }}>
                    {doc.chunk_count}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {doc.uploaded_at?.slice(0, 10)}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => onRebuildIndex(doc.id)}
                      title="重建索引"
                      disabled={doc.vector_status === 'processing'}
                    >
                      <RotateCcw size={12} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-danger"
                      onClick={() => {
                        if (confirm('确定删除该文档？删除后向量数据也会清除。'))
                          onDelete(doc.id);
                      }}
                      title="删除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
