'use client';

import { Eye, FileText, HardDrive, Loader2, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { KnowledgeDocument, VectorStatus } from '@/stores/knowledge-store';

const STATUS_CONFIG: Record<VectorStatus, { label: string; pillClass: string }> = {
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
  onPreviewChunks?: (docId: string, docTitle: string) => void;
  onVersionUploaded?: () => void;
}

interface UploadVersionState {
  docId: string;
  docTitle: string;
  versionCount: number;
}

export default function DocTable({
  documents,
  loading,
  onDelete,
  onRebuildIndex,
  onPreviewChunks,
  onVersionUploaded,
}: DocTableProps) {
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [confirmVersion, setConfirmVersion] = useState<UploadVersionState | null>(null);
  const [uploadingVersionId, setUploadingVersionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingVersionDocId = useRef<string | null>(null);

  const handleDeleteClick = useCallback((doc: KnowledgeDocument) => {
    setConfirmDelete({ id: doc.id, name: doc.file_name });
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!confirmDelete) return;
    onDelete(confirmDelete.id);
    setConfirmDelete(null);
  }, [confirmDelete, onDelete]);

  const handleNewVersionClick = useCallback((doc: KnowledgeDocument) => {
    setConfirmVersion({
      docId: doc.id,
      docTitle: doc.file_name,
      versionCount: doc.version_count ?? (doc.version ?? 1),
    });
  }, []);

  const handleVersionConfirm = useCallback(() => {
    if (!confirmVersion) return;
    pendingVersionDocId.current = confirmVersion.docId;
    setConfirmVersion(null);
    fileInputRef.current?.click();
  }, [confirmVersion]);

  const handleVersionFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const docId = pendingVersionDocId.current;
      e.target.value = '';
      if (!file || !docId) return;

      setUploadingVersionId(docId);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`/api/knowledge/${docId}/new-version`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.detail ?? `上传失败 (${res.status})`);
        }
        toast.success('新版本上传成功，旧版本已停用');
        onVersionUploaded?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '上传失败，请重试');
      } finally {
        setUploadingVersionId(null);
        pendingVersionDocId.current = null;
      }
    },
    [onVersionUploaded],
  );

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
        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>加载文档列表...</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <HardDrive size={48} />
          <p style={{ fontWeight: 500 }}>暂无知识库文档</p>
          <p>上传 .md / .docx / .pdf / .txt 文件构建知识库，或手动添加条目</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>文件名</th>
              <th>类型</th>
              <th>版本</th>
              <th>大小</th>
              <th>向量化状态</th>
              <th>分块数</th>
              <th>上传时间</th>
              <th style={{ textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const ext = doc.file_name.split('.').pop()?.toLowerCase() || '';
              const statusCfg = STATUS_CONFIG[doc.vector_status] || STATUS_CONFIG.pending;
              const isManual = doc.entry_type === 'manual';
              const versionCount = doc.version_count ?? (doc.version ?? 1);
              const isUploadingVersion = uploadingVersionId === doc.id;

              return (
                <tr key={doc.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      <span
                        style={{
                          fontWeight: 500,
                          color: 'var(--text)',
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {doc.file_name}
                      </span>
                      {isManual && (
                        <span
                          className="font-mono"
                          style={{
                            fontSize: 10,
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: 'var(--bg3)',
                            border: '1px solid var(--border2)',
                            color: 'var(--text2)',
                            flexShrink: 0,
                          }}
                        >
                          手动
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="pill pill-gray">
                      {isManual ? '条目' : (TYPE_LABELS[ext] || ext.toUpperCase())}
                    </span>
                  </td>
                  <td>
                    <span
                      className="font-mono"
                      style={{ fontSize: 11, color: 'var(--text3)' }}
                    >
                      v{doc.version ?? 1}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 11 }}>
                      {isManual ? '—' : formatFileSize(doc.file_size)}
                    </span>
                  </td>
                  <td>
                    <span className={statusCfg.pillClass}>
                      {doc.vector_status === 'processing' && (
                        <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                      )}
                      {statusCfg.label}
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
                      {/* 查看分块 */}
                      {onPreviewChunks && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => onPreviewChunks(doc.id, doc.file_name)}
                          title="查看分块"
                          disabled={doc.vector_status !== 'completed'}
                        >
                          <Eye size={12} />
                        </button>
                      )}

                      {/* 上传新版本（仅文件类型）*/}
                      {!isManual && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleNewVersionClick(doc)}
                          title={
                            versionCount >= 3
                              ? `上传新版本（将自动清理最旧版本，当前共 ${versionCount} 版）`
                              : '上传新版本'
                          }
                          disabled={isUploadingVersion || doc.vector_status === 'processing'}
                        >
                          {isUploadingVersion ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Upload size={12} />
                          )}
                        </button>
                      )}

                      {/* 重建索引 */}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onRebuildIndex(doc.id)}
                        title="重建索引"
                        disabled={doc.vector_status === 'processing'}
                      >
                        <RotateCcw size={12} />
                      </button>

                      {/* 删除 */}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-danger"
                        onClick={() => handleDeleteClick(doc)}
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

      {/* Hidden file input for new version upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.docx,.pdf,.txt"
        style={{ display: 'none' }}
        onChange={handleVersionFileChange}
      />

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <ConfirmDialog
          open={true}
          title="删除文档"
          description={`确定删除「${confirmDelete.name}」？删除后向量数据也会清除，不可恢复。`}
          confirmText="删除"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* New version confirm dialog */}
      {confirmVersion && (
        <ConfirmDialog
          open={true}
          title="上传新版本"
          description={
            confirmVersion.versionCount >= 3
              ? `此操作将停用当前版本并上传新版本。当前已有 ${confirmVersion.versionCount} 个版本，将自动清理最旧版本。是否继续？`
              : '此操作将停用当前版本，是否继续？'
          }
          confirmText="继续上传"
          variant="warning"
          onConfirm={handleVersionConfirm}
          onCancel={() => setConfirmVersion(null)}
        />
      )}
    </>
  );
}
