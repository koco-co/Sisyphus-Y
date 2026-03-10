'use client';

import { BookOpen, RefreshCw, Search, Upload } from 'lucide-react';
import { useState } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useKnowledge } from '@/hooks/useKnowledge';
import DocTable from './_components/DocTable';
import RAGBanner from './_components/RAGBanner';
import RAGTestPanel from './_components/RAGTestPanel';
import UploadDialog from './_components/UploadDialog';

export default function KnowledgePage() {
  const [showUpload, setShowUpload] = useState(false);

  const {
    documents,
    total,
    loading,
    error,
    typeFilter,
    statusFilter,
    searchQuery,
    isUploading,
    uploadProgress,
    ragQuery,
    ragResults,
    ragSearching,
    setTypeFilter,
    setStatusFilter,
    setSearchQuery,
    setRagQuery,
    fetchDocuments,
    uploadFile,
    deleteDocument,
    rebuildIndex,
    searchRAG,
  } = useKnowledge();

  return (
    <div className="no-sidebar">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div className="topbar">
          <BookOpen size={20} style={{ color: 'var(--accent)' }} />
          <h1>知识库</h1>
          <span className="sub">Knowledge Base</span>
          <span className="pill pill-green" style={{ marginLeft: 4 }}>
            {total}
          </span>
          <div className="spacer" />
          <span className="page-watermark">M11 · KNOWLEDGE</span>
        </div>

        {/* RAG Banner */}
        <RAGBanner />

        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 20,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative' }}>
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文档..."
              style={{ width: 200, paddingLeft: 32 }}
            />
          </div>

          {/* Type filter */}
          <CustomSelect
            value={typeFilter}
            onChange={(value) => setTypeFilter(value)}
            options={[
              { value: '', label: '全部类型' },
              { value: 'md', label: 'Markdown' },
              { value: 'docx', label: 'Word' },
              { value: 'pdf', label: 'PDF' },
              { value: 'txt', label: '文本' },
            ]}
            size="sm"
          />

          {/* Status filter */}
          <CustomSelect
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            options={[
              { value: '', label: '全部状态' },
              { value: 'completed', label: '已完成' },
              { value: 'processing', label: '处理中' },
              { value: 'failed', label: '失败' },
              { value: 'pending', label: '待处理' },
            ]}
            size="sm"
          />

          <div className="spacer" />

          <button type="button" className="btn" onClick={fetchDocuments}>
            <RefreshCw size={14} />
            刷新
          </button>

          <button type="button" className="btn btn-primary" onClick={() => setShowUpload(true)}>
            <Upload size={14} />
            上传文档
          </button>
        </div>

        {error && (
          <div
            className="card"
            style={{
              marginBottom: 16,
              border: '1px solid rgba(244, 63, 94, 0.28)',
              background: 'rgba(244, 63, 94, 0.08)',
              color: 'var(--red)',
            }}
          >
            {error}
          </div>
        )}

        {/* Document Table */}
        <DocTable
          documents={documents}
          loading={loading}
          onDelete={deleteDocument}
          onRebuildIndex={rebuildIndex}
        />

        {/* RAG Test Panel */}
        <RAGTestPanel
          query={ragQuery}
          results={ragResults}
          searching={ragSearching}
          onQueryChange={setRagQuery}
          onSearch={searchRAG}
        />

        {/* Upload Dialog */}
        <UploadDialog
          open={showUpload}
          onClose={() => setShowUpload(false)}
          onUpload={uploadFile}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          uploadError={error}
        />
      </div>
    </div>
  );
}
