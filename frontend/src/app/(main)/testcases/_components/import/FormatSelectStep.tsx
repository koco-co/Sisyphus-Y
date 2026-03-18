'use client';

import { Check, ChevronDown, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import type { FileFormat, FlatFolder } from './types';
import { ACCEPT_EXTENSIONS } from './types';

/* ------------------------------------------------------------------ */
/*  Template download config                                           */
/* ------------------------------------------------------------------ */

const TEMPLATE_LINKS: Record<string, { href: string; label: string; colorClass: string }> = {
  xlsx: { href: '/templates/用例导入模板.xlsx', label: 'Excel 模板', colorClass: 'text-sy-info' },
  csv: { href: '/templates/用例导入模板.csv', label: 'CSV 模板', colorClass: 'text-sy-accent' },
  xmind: {
    href: '/templates/用例导入模板.xmind',
    label: 'XMind 模板',
    colorClass: 'text-sy-purple',
  },
  json: { href: '/templates/用例导入模板.json', label: 'JSON 模板', colorClass: 'text-sy-warn' },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface FormatSelectStepProps {
  file: File | null;
  format: FileFormat;
  uploading: boolean;
  folderId: string | null;
  folderList: FlatFolder[];
  folderOpen: boolean;
  selectedFolderName: string;
  onFolderToggle: () => void;
  onFolderSelect: (id: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  dropRef: React.RefObject<HTMLDivElement | null>;
  onFileSelect: (f: File) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FormatSelectStep({
  file,
  format,
  uploading,
  folderId,
  folderList,
  folderOpen,
  selectedFolderName,
  onFolderToggle,
  onFolderSelect,
  fileInputRef,
  dropRef,
  onFileSelect,
}: FormatSelectStepProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Template downloads — TC-07 */}
      <div className="rounded-lg border border-sy-border bg-sy-bg-2 px-4 py-3">
        <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wider text-sy-text-3">
          下载导入模板
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {Object.entries(TEMPLATE_LINKS).map(([fmt, { href, label, colorClass }]) => (
            <a
              key={fmt}
              href={href}
              download
              className="flex items-center gap-1.5 rounded-md border border-sy-border px-3 py-1.5 text-[12px] text-sy-text-2 transition-colors hover:border-sy-border-2 hover:text-sy-text"
            >
              <Download className={`h-3.5 w-3.5 ${colorClass}`} />
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Folder selector */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-sy-text-2">导入目标文件夹</span>
        <div className="relative">
          <button
            type="button"
            onClick={onFolderToggle}
            className="flex w-full items-center justify-between rounded-lg border border-sy-border bg-sy-bg-2 px-3 py-2 text-[12.5px] text-sy-text transition-colors hover:border-sy-border-2"
          >
            <span>{selectedFolderName}</span>
            <ChevronDown
              className={[
                'h-4 w-4 text-sy-text-3 transition-transform',
                folderOpen ? 'rotate-180' : '',
              ].join(' ')}
            />
          </button>
          {folderOpen && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-sy-border bg-sy-bg-1 py-1 shadow-xl">
              {folderList.length === 0 ? (
                <div className="px-3 py-2 text-[12px] text-sy-text-3">暂无文件夹</div>
              ) : (
                folderList.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => onFolderSelect(folder.id)}
                    className={[
                      'flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[12.5px] transition-colors hover:bg-sy-bg-2',
                      folderId === folder.id ? 'text-sy-accent' : 'text-sy-text-2',
                    ].join(' ')}
                    style={{ paddingLeft: `${12 + folder.level * 16}px` }}
                  >
                    {folderId === folder.id && <Check className="h-3 w-3 shrink-0" />}
                    <span>{folder.name}</span>
                    {folder.is_system && (
                      <span className="ml-1 rounded-full bg-sy-bg-3 px-1.5 py-0.5 font-mono text-[10px] text-sy-text-3">
                        默认
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Drop zone */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: file drop zone */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: file drop zone */}
      <div
        ref={dropRef}
        onClick={() => fileInputRef.current?.click()}
        className={[
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 transition-colors',
          file
            ? 'border-sy-accent/50 bg-sy-accent/5'
            : 'border-sy-border bg-sy-bg-2 hover:border-sy-border-2',
        ].join(' ')}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_EXTENSIONS}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileSelect(f);
          }}
        />
        {file ? (
          <>
            <FileSpreadsheet className="h-10 w-10 text-sy-accent" />
            <div className="text-center">
              <p className="text-[13px] font-medium text-sy-text">{file.name}</p>
              <p className="mt-0.5 font-mono text-[11px] text-sy-text-3">
                {formatFileSize(file.size)} · {format?.toUpperCase()}
              </p>
            </div>
            <p className="text-[11px] text-sy-text-3">点击重新选择</p>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-sy-text-3" />
            <div className="text-center">
              <p className="text-[13px] font-medium text-sy-text">拖放文件或点击选择</p>
              <p className="mt-0.5 text-[11px] text-sy-text-3">
                支持 .xlsx .csv .xmind .json 格式，最大 10 MB
              </p>
            </div>
          </>
        )}
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-[12.5px] text-sy-text-2">
          <Loader2 className="h-4 w-4 animate-spin text-sy-accent" />
          正在解析文件，请稍候…
        </div>
      )}
    </div>
  );
}
