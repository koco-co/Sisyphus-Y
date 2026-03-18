'use client';

import { ArrowLeft, ArrowRight, Check, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { API_BASE, api } from '@/lib/api';
import { DuplicateStep } from './import/DuplicateStep';
import { FieldMappingStep } from './import/FieldMappingStep';
import { FormatSelectStep } from './import/FormatSelectStep';
import { PreviewStep } from './import/PreviewStep';
import { ResultStep } from './import/ResultStep';
import type {
  ColumnMapping,
  DuplicateInfo,
  DuplicateStrategyType,
  FileFormat,
  FlatFolder,
  FolderTreeNode,
  ImportResult,
  ParseResult,
  StepId,
} from './import/types';
import {
  buildSteps,
  detectFormat,
  flattenFolderTree,
  REQUIRED_FIELDS,
  STEP_LABELS,
} from './import/types';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ImportDialog({ open, onClose, onImportComplete }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<FileFormat>(null);
  const [uploading, setUploading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folderList, setFolderList] = useState<FlatFolder[]>([]);
  const [folderOpen, setFolderOpen] = useState(false);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [perCaseStrategies, setPerCaseStrategies] = useState<Record<number, DuplicateStrategyType>>(
    {},
  );
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const steps = useMemo<StepId[]>(
    () => (parseResult ? buildSteps(parseResult.is_standard) : buildSteps(false)),
    [parseResult],
  );
  const currentStep = steps[stepIndex];

  const mappedCases = useMemo(() => {
    if (!parseResult) return [];
    return parseResult.all_rows.map((row) => {
      const obj: Record<string, string> = {};
      mappings.forEach((m, i) => {
        if (m.target && row[i] !== undefined) obj[m.target] = row[i];
      });
      return obj;
    });
  }, [parseResult, mappings]);

  const canNext = useMemo(() => {
    if (currentStep === 'upload') return file !== null && format !== null && !uploading;
    if (currentStep === 'mapping')
      return REQUIRED_FIELDS.every((f) => mappings.some((m) => m.target === f));
    if (currentStep === 'duplicate')
      return duplicates.every((d) => perCaseStrategies[d.index] !== undefined);
    return false; // preview and result have inline actions
  }, [currentStep, file, format, uploading, mappings, duplicates, perCaseStrategies]);

  /* fetch folders on open */
  useEffect(() => {
    if (!open) return;
    api
      .get<FolderTreeNode[]>('/testcases/folders/tree')
      .then((tree) => {
        const flat = flattenFolderTree(tree);
        setFolderList(flat);
        const sys = flat.find((f) => f.is_system);
        if (sys) setFolderId(sys.id);
      })
      .catch(() => {});
  }, [open]);

  const handleClose = useCallback(() => {
    setFile(null);
    setFormat(null);
    setUploading(false);
    setParseResult(null);
    setFolderId(null);
    setFolderList([]);
    setFolderOpen(false);
    setMappings([]);
    setDuplicates([]);
    setPerCaseStrategies({});
    setCheckingDuplicates(false);
    setImporting(false);
    setImportResult(null);
    setStepIndex(0);
    onClose();
  }, [onClose]);

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    setFormat(detectFormat(f.name));
  }, []);

  /* drag & drop */
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer?.files[0];
      if (f) handleFileSelect(f);
    };
    el.addEventListener('dragover', prevent);
    el.addEventListener('drop', drop);
    return () => {
      el.removeEventListener('dragover', prevent);
      el.removeEventListener('drop', drop);
    };
  }, [handleFileSelect]);

  const handleUploadAndParse = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/testcases/import/parse-file`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const result: ParseResult = await res.json();
      setParseResult(result);
      setMappings(
        result.columns.map((col) => ({ source: col, target: result.auto_mapping[col] ?? null })),
      );
      setStepIndex(1);
    } catch {
      toast.error('文件解析失败，请检查文件格式');
    } finally {
      setUploading(false);
    }
  }, [file]);

  const doCheckDuplicates = useCallback(async () => {
    if (!parseResult) return;
    setCheckingDuplicates(true);
    try {
      const dups = await api.post<DuplicateInfo[]>('/testcases/import/check-duplicates', {
        cases: mappedCases.map((c) => ({ title: c.title ?? '' })),
        folder_id: folderId,
      });
      setDuplicates(dups);
      const init: Record<number, DuplicateStrategyType> = {};
      for (const d of dups) init[d.index] = 'skip';
      setPerCaseStrategies(init);
    } catch {
      toast.error('重复检测失败，请重试');
    } finally {
      setCheckingDuplicates(false);
    }
  }, [parseResult, mappedCases, folderId]);

  /* TC-09: PreviewStep onConfirm — parent triggers check-duplicates + step advance */
  const handleConfirmImport = useCallback(async () => {
    setStepIndex(steps.indexOf('duplicate'));
    await doCheckDuplicates();
  }, [steps, doCheckDuplicates]);

  const handleImport = useCallback(async () => {
    setImporting(true);
    try {
      const result = await api.post<ImportResult>('/testcases/import/batch', {
        cases: mappedCases,
        folder_id: folderId,
        per_case_strategies: Object.fromEntries(Object.entries(perCaseStrategies)),
      });
      setImportResult(result);
      onImportComplete();
      setStepIndex(steps.indexOf('result'));
    } catch {
      toast.error('导入失败，请重试');
    } finally {
      setImporting(false);
    }
  }, [mappedCases, folderId, perCaseStrategies, onImportComplete, steps]);

  const handleNext = useCallback(async () => {
    if (currentStep === 'upload') {
      await handleUploadAndParse();
      return;
    }
    if (currentStep === 'duplicate') {
      await handleImport();
      return;
    }
    setStepIndex((s) => s + 1);
  }, [currentStep, handleUploadAndParse, handleImport]);

  const handleBack = useCallback(() => setStepIndex((s) => Math.max(0, s - 1)), []);

  const handleBulkStrategy = useCallback(
    (strategy: DuplicateStrategyType) => {
      const updated: Record<number, DuplicateStrategyType> = {};
      for (const d of duplicates) updated[d.index] = strategy;
      setPerCaseStrategies(updated);
    },
    [duplicates],
  );

  const selectedFolderName = useMemo(
    () => (folderId ? (folderList.find((f) => f.id === folderId)?.name ?? '未选择') : '未选择'),
    [folderId, folderList],
  );

  if (!open) return null;

  const isLoading = uploading || checkingDuplicates || importing;
  const showFooter = currentStep !== 'preview' && currentStep !== 'result';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop overlay */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 flex h-[680px] w-[760px] flex-col rounded-xl border border-sy-border bg-sy-bg-1 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sy-border px-6 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-sy-text">导入用例</h2>
            <p className="mt-0.5 text-[11px] text-sy-text-3">支持 Excel、CSV、XMind、JSON 格式</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-sy-text-3 transition-colors hover:bg-sy-bg-2 hover:text-sy-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center border-b border-sy-border px-6 py-3">
          {steps.map((stepId, idx) => (
            <div key={stepId} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={[
                    'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-mono font-bold',
                    idx < stepIndex
                      ? 'bg-sy-accent text-sy-bg'
                      : idx === stepIndex
                        ? 'bg-sy-accent/20 text-sy-accent ring-1 ring-sy-accent'
                        : 'bg-sy-bg-3 text-sy-text-3',
                  ].join(' ')}
                >
                  {idx < stepIndex ? <Check className="h-2.5 w-2.5" /> : idx + 1}
                </div>
                <span
                  className={[
                    'text-[12px]',
                    idx === stepIndex ? 'font-medium text-sy-text' : 'text-sy-text-3',
                  ].join(' ')}
                >
                  {STEP_LABELS[stepId]}
                </span>
              </div>
              {idx < steps.length - 1 && <div className="mx-3 h-px w-8 bg-sy-border" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 'upload' && (
            <FormatSelectStep
              file={file}
              format={format}
              uploading={uploading}
              folderId={folderId}
              folderList={folderList}
              folderOpen={folderOpen}
              selectedFolderName={selectedFolderName}
              onFolderToggle={() => setFolderOpen((v) => !v)}
              onFolderSelect={(id) => {
                setFolderId(id);
                setFolderOpen(false);
              }}
              fileInputRef={fileInputRef}
              dropRef={dropRef}
              onFileSelect={handleFileSelect}
            />
          )}
          {currentStep === 'mapping' && parseResult && (
            <FieldMappingStep
              columns={parseResult.columns}
              mappings={mappings}
              onMappingChange={(idx, target) =>
                setMappings((prev) => prev.map((m, i) => (i === idx ? { ...m, target } : m)))
              }
            />
          )}
          {currentStep === 'preview' && parseResult && (
            <PreviewStep
              columns={parseResult.columns}
              previewRows={parseResult.preview_rows}
              mappings={mappings}
              totalRows={parseResult.total_rows}
              onConfirm={handleConfirmImport}
              onBack={handleBack}
              isImporting={importing || checkingDuplicates}
            />
          )}
          {currentStep === 'duplicate' && (
            <DuplicateStep
              checking={checkingDuplicates}
              duplicates={duplicates}
              perCaseStrategies={perCaseStrategies}
              onStrategyChange={(index, strategy) =>
                setPerCaseStrategies((prev) => ({ ...prev, [index]: strategy }))
              }
              onBulkStrategy={handleBulkStrategy}
            />
          )}
          {currentStep === 'result' && importResult && (
            <ResultStep result={importResult} onClose={handleClose} />
          )}
        </div>

        {/* Footer — hidden on preview/result (inline actions) */}
        {showFooter && (
          <div className="flex items-center justify-between border-t border-sy-border px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="text-[12.5px] text-sy-text-3 transition-colors hover:text-sy-text"
            >
              取消
            </button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && currentStep !== 'duplicate' && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-sy-border px-3 py-1.5 text-[12.5px] text-sy-text-2 transition-colors hover:border-sy-border-2 hover:text-sy-text disabled:opacity-40"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  上一步
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={!canNext || isLoading}
                className="flex items-center gap-1.5 rounded-lg bg-sy-accent px-4 py-1.5 text-[12.5px] font-medium text-sy-bg transition-colors hover:bg-sy-accent-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {currentStep === 'duplicate' ? '开始导入' : '下一步'}
                {!isLoading && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
