'use client';

import {
  ArrowRight,
  Clock,
  Edit3,
  FileText,
  GitBranch,
  SplitSquareHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { TestCaseDetail } from './types';
import { priorityVariant, sourceLabel, statusLabel, statusVariant, typeLabel } from './types';

interface CaseDetailDrawerProps {
  testCase: TestCaseDetail | null;
  open: boolean;
  onClose: () => void;
  onEdit: (tc: TestCaseDetail) => void;
  onDelete: (id: string) => void;
  onCompare?: (tc: TestCaseDetail) => void;
}

export function CaseDetailDrawer({
  testCase,
  open,
  onClose,
  onEdit,
  onDelete,
  onCompare,
}: CaseDetailDrawerProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !testCase) return null;

  const formattedDate = new Date(testCase.updated_at).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      {/* Overlay */}
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-label="关闭用例详情"
      />

      {/* Drawer Panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-[520px] max-w-[90vw] bg-bg1 border-l border-border shadow-[var(--shadow-lg)] flex flex-col animate-[slideIn_0.2s_ease]">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[12px] text-accent font-semibold">
              {testCase.case_id}
            </span>
            <h2 className="text-[15px] font-semibold text-text mt-0.5 truncate">
              {testCase.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onEdit(testCase)}
            className="p-1.5 rounded-md text-text3 hover:text-accent hover:bg-accent/10 transition-colors"
            title="编辑"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          {onCompare && testCase.original_raw && (
            <button
              type="button"
              onClick={() => onCompare(testCase)}
              className="p-1.5 rounded-md text-text3 hover:text-sy-info hover:bg-sy-info/10 transition-colors"
              title="清洗前后对比"
            >
              <SplitSquareHorizontal className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(testCase.id)}
            className="p-1.5 rounded-md text-text3 hover:text-red hover:bg-red/10 transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-text3 hover:text-text hover:bg-bg2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <StatusBadge variant={priorityVariant[testCase.priority] ?? 'gray'}>
              {testCase.priority}
            </StatusBadge>
            <StatusBadge variant={statusVariant[testCase.status] ?? 'gray'}>
              {statusLabel[testCase.status] ?? testCase.status}
            </StatusBadge>
            <StatusBadge variant="gray">
              {typeLabel[testCase.case_type] ?? testCase.case_type}
            </StatusBadge>
            <StatusBadge
              variant={
                testCase.source === 'ai_generated' || testCase.source === 'ai'
                  ? 'info'
                  : testCase.source === 'imported'
                    ? 'purple'
                    : 'gray'
              }
            >
              {sourceLabel[testCase.source] ?? testCase.source}
            </StatusBadge>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 text-[11.5px] text-text3">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formattedDate}
            </span>
            <span className="font-mono">v{testCase.version}</span>
            {testCase.ai_score !== null && (
              <span>
                AI 评分:{' '}
                <span className="font-mono text-accent font-semibold">{testCase.ai_score}</span>
              </span>
            )}
          </div>

          {/* Precondition */}
          {testCase.precondition && (
            <section>
              <h3 className="text-[12px] font-semibold text-text3 uppercase tracking-wider mb-2">
                前置条件
              </h3>
              <div className="p-3 rounded-lg bg-bg2 border border-border text-[12.5px] text-text2 leading-relaxed">
                {testCase.precondition}
              </div>
            </section>
          )}

          {/* Related requirement */}
          {testCase.requirement_title && (
            <section>
              <h3 className="text-[12px] font-semibold text-text3 uppercase tracking-wider mb-2">
                关联需求
              </h3>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg2 border border-border text-[12.5px]">
                <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="text-text2 truncate">{testCase.requirement_title}</span>
              </div>
            </section>
          )}

          {/* Related test point */}
          {testCase.test_point_title && (
            <section>
              <h3 className="text-[12px] font-semibold text-text3 uppercase tracking-wider mb-2">
                关联测试点
              </h3>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg2 border border-border text-[12.5px]">
                <GitBranch className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="text-text2 truncate">{testCase.test_point_title}</span>
              </div>
            </section>
          )}

          {/* Steps */}
          <section>
            <h3 className="text-[12px] font-semibold text-text3 uppercase tracking-wider mb-2">
              测试步骤 ({testCase.steps.length})
            </h3>
            {testCase.steps.length > 0 ? (
              <div className="space-y-2">
                {testCase.steps.map((step) => (
                  <div
                    key={step.no}
                    className="flex gap-2.5 p-3 rounded-lg bg-bg2 border border-border/60 text-[12.5px]"
                  >
                    <span className="font-mono text-text3 shrink-0 w-5 text-right">{step.no}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-text2 leading-relaxed">{step.action}</p>
                      <p className="flex items-start gap-1 mt-1 text-[11.5px] text-accent/80">
                        <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{step.expected_result}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-text3 italic">暂无测试步骤</p>
            )}
          </section>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
