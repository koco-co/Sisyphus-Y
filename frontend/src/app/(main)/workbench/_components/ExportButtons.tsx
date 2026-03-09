'use client';

import { Download, FileJson, FileSpreadsheet } from 'lucide-react';

interface ExportButtonsProps {
  onExport: (format: 'excel' | 'json') => void;
  disabled?: boolean;
}

export function ExportButtons({ onExport, disabled }: ExportButtonsProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
      <Download className="w-3.5 h-3.5 text-text3" />
      <span className="text-[11px] text-text3 mr-auto">导出</span>
      <button
        type="button"
        onClick={() => onExport('excel')}
        disabled={disabled}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-bg2 border border-border text-text2 hover:border-accent hover:text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FileSpreadsheet className="w-3 h-3" />
        Excel
      </button>
      <button
        type="button"
        onClick={() => onExport('json')}
        disabled={disabled}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-bg2 border border-border text-text2 hover:border-accent hover:text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FileJson className="w-3 h-3" />
        JSON
      </button>
    </div>
  );
}
