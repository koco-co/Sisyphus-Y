'use client';

import { FileUp, Loader2, Upload, X } from 'lucide-react';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';

const ACCEPTED_TYPES = ['.md', '.docx', '.pdf', '.txt'];
const ACCEPT_STRING = '.md,.docx,.pdf,.txt';
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<boolean>;
  isUploading: boolean;
  uploadProgress: number;
  uploadError?: string | null;
}

export default function UploadDialog({
  open,
  onClose,
  onUpload,
  isUploading,
  uploadProgress,
  uploadError,
}: UploadDialogProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!ACCEPTED_TYPES.includes(ext)) {
      return `不支持的文件类型：${ext}，请上传 ${ACCEPTED_TYPES.join(' / ')} 格式`;
    }
    if (file.size > MAX_SIZE) {
      return `文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），最大支持 50MB`;
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const err = validateFile(file);
      if (err) {
        setError(err);
        setSelectedFile(null);
        return;
      }
      setError(null);
      setSelectedFile(file);
    },
    [validateFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleSubmit = useCallback(async () => {
    if (!selectedFile) return;
    const success = await onUpload(selectedFile);
    if (success) {
      setSelectedFile(null);
      onClose();
    }
  }, [selectedFile, onUpload, onClose]);

  const handleClose = useCallback(() => {
    if (isUploading) return;
    setSelectedFile(null);
    setError(null);
    onClose();
  }, [isUploading, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="关闭上传弹窗"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 200,
          border: 'none',
          padding: 0,
        }}
        onClick={handleClose}
      />

      {/* Dialog */}
      <div
        className="card fade-in"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 201,
          width: 500,
          maxWidth: '90vw',
          padding: 24,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={16} style={{ color: '#00d9a3' }} />
            <span style={{ fontSize: 15, fontWeight: 600 }}>上传知识文档</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#566577',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Drop zone */}
        <button
          type="button"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? '#00d9a3' : '#353d4a'}`,
            borderRadius: 10,
            padding: '40px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s',
            background: dragOver ? 'rgba(0, 217, 163, 0.1)' : '#1a1e24',
            width: '100%',
          }}
        >
          <FileUp
            size={36}
            style={{
              color: dragOver ? '#00d9a3' : '#566577',
              marginBottom: 12,
            }}
          />
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#94a3b8',
              marginBottom: 4,
            }}
          >
            {selectedFile ? selectedFile.name : '拖拽文件到此处，或点击选择'}
          </div>
          <div style={{ fontSize: 11, color: '#566577' }}>
            支持 {ACCEPTED_TYPES.join(' / ')}，最大 50MB
          </div>

          {selectedFile && (
            <div className="pill pill-green" style={{ marginTop: 12 }}>
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_STRING}
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {/* Error */}
        {(error || uploadError) && (
          <div
            style={{
              marginTop: 12,
              padding: '8px 12px',
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              borderRadius: 6,
              fontSize: 12,
              color: '#f43f5e',
            }}
          >
            {error || uploadError}
          </div>
        )}

        {/* Upload progress */}
        {isUploading && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6,
              }}
            >
              <Loader2
                size={14}
                style={{
                  color: '#00d9a3',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <span style={{ fontSize: 12, color: '#94a3b8' }}>上传中 {uploadProgress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            marginTop: 20,
          }}
        >
          <button type="button" className="btn" onClick={handleClose} disabled={isUploading}>
            取消
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                上传中...
              </>
            ) : (
              <>
                <Upload size={14} />
                开始上传
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
