'use client';

import { CheckCircle, FileText, Image, Loader2, Upload, X } from 'lucide-react';
import { type ClipboardEvent, type DragEvent, useCallback, useRef, useState } from 'react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  previewUrl?: string;
  errorMsg?: string;
}

interface FileUploadProps {
  onUpload?: (file: File) => Promise<unknown>;
  accept?: string;
  maxSizeMB?: number;
}

const ACCEPT_DEFAULT = '.docx,.doc,.pdf,.md,.txt,.png,.jpg,.jpeg,.gif';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({ onUpload, accept = ACCEPT_DEFAULT, maxSizeMB = 20 }: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        const entry: UploadedFile = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          progress: 0,
          status: 'error',
          errorMsg: `文件超过 ${maxSizeMB}MB 限制`,
        };
        setFiles((prev) => [...prev, entry]);
        return;
      }

      const id = crypto.randomUUID();
      const isImage = file.type.startsWith('image/');
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;

      const entry: UploadedFile = {
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'uploading',
        previewUrl,
      };

      setFiles((prev) => [...prev, entry]);

      // Simulate progress
      const progressTimer = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id && f.status === 'uploading' && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f,
          ),
        );
      }, 150);

      try {
        if (onUpload) {
          await onUpload(file);
        }
        clearInterval(progressTimer);
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, progress: 100, status: 'done' } : f)),
        );
      } catch (err) {
        clearInterval(progressTimer);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? { ...f, status: 'error', errorMsg: err instanceof Error ? err.message : '上传失败' }
              : f,
          ),
        );
      }
    },
    [onUpload, maxSizeMB],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      for (const f of droppedFiles) processFile(f);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      for (const f of selected) processFile(f);
      if (inputRef.current) inputRef.current.value = '';
    },
    [processFile],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) processFile(file);
        }
      }
    },
    [processFile],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  return (
    <div onPaste={handlePaste}>
      {/* Drop zone */}
      <button
        type="button"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors
          ${
            dragging
              ? 'border-accent bg-accent/5'
              : 'border-border hover:border-border2 hover:bg-bg2'
          }
        `}
      >
        <Upload size={24} className={dragging ? 'text-accent' : 'text-text3'} />
        <div className="text-center">
          <p className="text-[12.5px] text-text2">
            拖拽文件到此处，或 <span className="text-accent font-medium">点击上传</span>
          </p>
          <p className="text-[11px] text-text3 mt-1">
            支持 docx、pdf、md、txt、图片，最大 {maxSizeMB}MB
          </p>
          <p className="text-[10.5px] text-text3 mt-0.5">也可直接粘贴剪贴板中的图片</p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 p-2.5 bg-bg2 border border-border rounded-lg"
            >
              {/* Preview / Icon */}
              {f.previewUrl ? (
                <div
                  role="img"
                  aria-label={f.name}
                  className="w-10 h-10 rounded object-cover shrink-0 border border-border bg-cover bg-center"
                  style={{ backgroundImage: `url("${f.previewUrl}")` }}
                />
              ) : (
                <div className="w-10 h-10 rounded bg-bg3 border border-border flex items-center justify-center shrink-0">
                  {f.type.startsWith('image/') ? (
                    <Image size={16} className="text-text3" />
                  ) : (
                    <FileText size={16} className="text-text3" />
                  )}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-text truncate">{f.name}</span>
                  <span className="text-[10px] text-text3 font-mono shrink-0">
                    {formatSize(f.size)}
                  </span>
                </div>
                {f.status === 'uploading' && (
                  <div className="progress-bar mt-1.5">
                    <div className="progress-fill" style={{ width: `${f.progress}%` }} />
                  </div>
                )}
                {f.status === 'error' && (
                  <p className="text-[10.5px] text-red mt-0.5">{f.errorMsg}</p>
                )}
              </div>

              {/* Status icon */}
              <div className="shrink-0">
                {f.status === 'uploading' && (
                  <Loader2 size={14} className="text-accent animate-spin" />
                )}
                {f.status === 'done' && <CheckCircle size={14} className="text-accent" />}
                {f.status === 'error' && (
                  <button
                    type="button"
                    onClick={() => removeFile(f.id)}
                    className="text-text3 hover:text-red transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Remove */}
              {f.status !== 'error' && (
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  className="text-text3 hover:text-text transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
