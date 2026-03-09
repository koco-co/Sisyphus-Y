'use client';

import { BookOpen, RefreshCw, Search, Upload } from 'lucide-react';
import { useState } from 'react';
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
          <select
            className="input"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">全部类型</option>
            <option value="md">Markdown</option>
            <option value="docx">Word</option>
            <option value="pdf">PDF</option>
            <option value="txt">文本</option>
          </select>

          {/* Status filter */}
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">全部状态</option>
            <option value="completed">已完成</option>
            <option value="processing">处理中</option>
            <option value="failed">失败</option>
            <option value="pending">待处理</option>
          </select>

          <div className="spacer" />

          <button
            type="button"
            className="btn"
            onClick={fetchDocuments}
          >
            <RefreshCw size={14} />
            刷新
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowUpload(true)}
          >
            <Upload size={14} />
            上传文档
          </button>
        </div>

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
        />
      </div>
    </div>
  );
}
