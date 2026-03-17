'use client';

import {
  Check,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Map,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  currentFolderId?: string;
  selectedCaseIds?: string[];
  iterationId?: string;
}

type ExportFormat = 'xlsx' | 'csv' | 'xmind' | 'md';
type ExportScope = 'folder' | 'requirement' | 'iteration' | 'selected';

const FORMAT_OPTIONS: {
  value: ExportFormat;
  label: string;
  desc: string;
  icon: typeof FileSpreadsheet;
  recommended?: boolean;
}[] = [
  {
    value: 'xlsx',
    label: 'Excel (.xlsx)',
    desc: 'Excel表格，兼容主流测试管理工具',
    icon: FileSpreadsheet,
    recommended: true,
  },
  {
    value: 'csv',
    label: 'CSV (.csv)',
    desc: '纯文本，轻量便捷',
    icon: FileText,
  },
  {
    value: 'xmind',
    label: 'XMind (.xmind)',
    desc: '思维导图，适合评审展示',
    icon: Map,
  },
  {
    value: 'md',
    label: 'Markdown (.md)',
    desc: 'Markdown格式，便于文档集成',
    icon: FileDown,
  },
];

const ALL_FIELDS: { key: string; label: string; defaultOn: boolean }[] = [
  { key: 'title', label: '标题', defaultOn: true },
  { key: 'module_path', label: '模块路径', defaultOn: true },
  { key: 'precondition', label: '前置条件', defaultOn: true },
  { key: 'priority', label: '优先级', defaultOn: true },
  { key: 'case_type', label: '类型', defaultOn: true },
  { key: 'status', label: '状态', defaultOn: true },
  { key: 'steps', label: '步骤', defaultOn: true },
  { key: 'tags', label: '标签', defaultOn: false },
];

const DEFAULT_FIELDS = new Set(ALL_FIELDS.filter((f) => f.defaultOn).map((f) => f.key));

export default function ExportDialog({
  open,
  onClose,
  currentFolderId,
  selectedCaseIds = [],
  iterationId,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [scope, setScope] = useState<ExportScope>(() => {
    if (selectedCaseIds && selectedCaseIds.length > 0) return 'selected';
    if (currentFolderId) return 'folder';
    if (iterationId) return 'iteration';
    return 'folder';
  });
  const [fields, setFields] = useState<Set<string>>(new Set(DEFAULT_FIELDS));
  const [reqScopeValue, setReqScopeValue] = useState('');
  const [iterScopeValue, setIterScopeValue] = useState(iterationId ?? '');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setFormat('xlsx');
      setScope(
        selectedCaseIds.length > 0
          ? 'selected'
          : currentFolderId
            ? 'folder'
            : iterationId
              ? 'iteration'
              : 'folder',
      );
      setFields(new Set(DEFAULT_FIELDS));
      setReqScopeValue('');
      setIterScopeValue(iterationId ?? '');
      setExporting(false);
      setError(null);
    }
  }, [open, currentFolderId, selectedCaseIds.length, iterationId]);

  const allSelected = fields.size === ALL_FIELDS.length;
  const isXmind = format === 'xmind';

  const toggleAllFields = useCallback(() => {
    setFields(allSelected ? new Set<string>() : new Set(ALL_FIELDS.map((f) => f.key)));
  }, [allSelected]);

  const toggleField = useCallback((key: string) => {
    setFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const getScopeValue = useCallback((): string | null => {
    if (scope === 'folder') return currentFolderId ?? null;
    if (scope === 'requirement') return reqScopeValue || null;
    if (scope === 'iteration') return iterScopeValue || null;
    return null;
  }, [scope, currentFolderId, reqScopeValue, iterScopeValue]);

  const handleExport = useCallback(async () => {
    if (!isXmind && fields.size === 0) return;
    setExporting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        format,
        scope,
        scope_value: getScopeValue(),
        case_ids: scope === 'selected' ? selectedCaseIds : null,
        // XMind 格式固定全字段，不传 fields
        fields: isXmind ? null : Array.from(fields),
      };

      // POST /export — 创建导出任务
      const res = await fetch(`${API_BASE}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`导出请求失败 (${res.status}): ${detail.slice(0, 120)}`);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败，请重试');
    } finally {
      setExporting(false);
    }
  }, [format, scope, fields, selectedCaseIds, getScopeValue, isXmind, onClose]);

  if (!open) return null;

  const scopeOptions: {
    value: ExportScope;
    label: string;
    disabled?: boolean;
    badge?: string;
  }[] = [
    ...(currentFolderId
      ? [{ value: 'folder' as ExportScope, label: '当前目录' }]
      : [{ value: 'folder' as ExportScope, label: '按目录', disabled: !currentFolderId }]),
    { value: 'requirement', label: '按需求' },
    { value: 'iteration', label: '按迭代' },
    ...(selectedCaseIds.length > 0
      ? [
          {
            value: 'selected' as ExportScope,
            label: '已勾选用例',
            badge: `${selectedCaseIds.length}`,
          },
        ]
      : [{ value: 'selected' as ExportScope, label: '自由勾选', disabled: true }]),
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
        onClick={exporting ? undefined : onClose}
        aria-label="关闭对话框"
        tabIndex={-1}
      />

      {/* Panel */}
      <div className="relative bg-sy-bg-1 border border-sy-border rounded-xl shadow-lg w-full max-w-md max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sy-border">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-sy-accent" />
            <h2 className="text-[14px] font-semibold text-sy-text">导出用例</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={exporting}
            className="p-1 rounded-md text-sy-text-3 hover:text-sy-text hover:bg-sy-bg-2 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Format Selection */}
          <section>
            <h3 className="text-[12px] font-medium text-sy-text-2 uppercase tracking-wider mb-2.5">
              导出格式
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {FORMAT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = format === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormat(opt.value)}
                    className={`relative flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${
                      active
                        ? 'border-sy-accent bg-sy-accent/5'
                        : 'border-sy-border hover:border-sy-border-2 bg-sy-bg-2/50'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-sy-accent' : 'text-sy-text-3'}`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[12.5px] font-medium ${active ? 'text-sy-accent' : 'text-sy-text'}`}
                        >
                          {opt.label}
                        </span>
                        {opt.recommended && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sy-accent/10 text-sy-accent font-medium">
                            推荐
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-sy-text-3 mt-0.5 leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>
                    {active && (
                      <Check className="absolute top-2 right-2 w-3.5 h-3.5 text-sy-accent" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Export Scope */}
          <section>
            <h3 className="text-[12px] font-medium text-sy-text-2 uppercase tracking-wider mb-2.5">
              导出范围
            </h3>
            <div className="space-y-1.5">
              {scopeOptions.map((opt) => {
                const active = scope === opt.value;
                return (
                  <div key={opt.value}>
                    <button
                      type="button"
                      onClick={() => !opt.disabled && setScope(opt.value)}
                      disabled={opt.disabled}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                        active
                          ? 'border-sy-accent bg-sy-accent/5'
                          : 'border-transparent hover:bg-sy-bg-2'
                      } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          active ? 'border-sy-accent' : 'border-sy-border-2'
                        }`}
                      >
                        {active && <div className="w-1.5 h-1.5 rounded-full bg-sy-accent" />}
                      </div>
                      <span
                        className={`text-[12.5px] ${active ? 'text-sy-text' : 'text-sy-text-2'}`}
                      >
                        {opt.label}
                      </span>
                      {opt.badge && (
                        <span className="ml-auto text-[11px] font-mono px-1.5 py-0.5 rounded bg-sy-accent/10 text-sy-accent">
                          {opt.badge}
                        </span>
                      )}
                    </button>

                    {/* 按需求：输入需求 ID */}
                    {active && opt.value === 'requirement' && (
                      <div className="mt-1.5 mx-3">
                        <input
                          type="text"
                          value={reqScopeValue}
                          onChange={(e) => setReqScopeValue(e.target.value)}
                          placeholder="输入需求 ID（UUID）"
                          className="w-full bg-sy-bg-2 border border-sy-border rounded-md px-3 py-1.5 text-[12px] text-sy-text placeholder:text-sy-text-3 outline-none focus:border-sy-accent transition-colors"
                        />
                      </div>
                    )}

                    {/* 按迭代：输入或展示当前迭代 */}
                    {active && opt.value === 'iteration' && (
                      <div className="mt-1.5 mx-3">
                        <input
                          type="text"
                          value={iterScopeValue}
                          onChange={(e) => setIterScopeValue(e.target.value)}
                          placeholder="输入迭代 ID（UUID）"
                          className="w-full bg-sy-bg-2 border border-sy-border rounded-md px-3 py-1.5 text-[12px] text-sy-text placeholder:text-sy-text-3 outline-none focus:border-sy-accent transition-colors"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Field Selection */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-[12px] font-medium text-sy-text-2 uppercase tracking-wider">
                导出字段
              </h3>
              {isXmind ? (
                <span className="text-[11px] text-sy-text-3">XMind 格式导出全部字段</span>
              ) : (
                <button
                  type="button"
                  onClick={toggleAllFields}
                  className="text-[11px] text-sy-accent hover:text-sy-accent-2 transition-colors"
                >
                  {allSelected ? '取消全选' : '全选'}
                </button>
              )}
            </div>
            {isXmind ? (
              <p className="text-[11.5px] text-sy-text-3 px-1">
                XMind 格式固定导出所有字段，无需手动选择。
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {ALL_FIELDS.map((f) => {
                  const checked = fields.has(f.key);
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => toggleField(f.key)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-left transition-all ${
                        checked
                          ? 'border-sy-accent/30 bg-sy-accent/5'
                          : 'border-sy-border hover:border-sy-border-2 bg-sy-bg-2/40'
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors ${
                          checked ? 'bg-sy-accent border-sy-accent' : 'border-sy-border-2'
                        }`}
                      >
                        {checked && <Check className="w-2 h-2 text-white dark:text-black" />}
                      </div>
                      <span
                        className={`text-[11.5px] truncate ${checked ? 'text-sy-text' : 'text-sy-text-3'}`}
                      >
                        {f.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Error message */}
          {error && (
            <p className="text-[11.5px] text-sy-danger bg-sy-danger/10 border border-sy-danger/30 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-sy-border">
          <span className="text-[11px] text-sy-text-3">
            {isXmind ? '全字段导出' : `已选 ${fields.size}/${ALL_FIELDS.length} 个字段`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={exporting}
              className="bg-sy-bg-2 text-sy-text-2 hover:text-sy-text hover:bg-sy-bg-3 rounded-md px-4 py-2 text-[12.5px] transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || (!isXmind && fields.size === 0)}
              className="bg-sy-accent text-white dark:text-black hover:bg-sy-accent-2 rounded-md px-4 py-2 text-[12.5px] font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  导出
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
