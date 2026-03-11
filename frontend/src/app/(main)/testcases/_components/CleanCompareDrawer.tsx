'use client';

import { AlertCircle, CheckCircle2, ChevronRight, Sparkles, Star, X } from 'lucide-react';
import type { TestCaseDetail, TestCaseStep } from './types';

interface CleanCompareDrawerProps {
  open: boolean;
  testCase: TestCaseDetail | null;
  onClose: () => void;
}

const cleanStatusConfig: Record<
  string,
  { label: string; icon: React.ReactNode; className: string }
> = {
  high: {
    label: '优质',
    icon: <Star className="w-3 h-3" />,
    className: 'bg-sy-accent/10 border border-sy-accent/35 text-sy-accent',
  },
  review: {
    label: '待审核',
    icon: <AlertCircle className="w-3 h-3" />,
    className: 'bg-sy-warn/10 border border-sy-warn/35 text-sy-warn',
  },
  polished: {
    label: '已润色',
    icon: <Sparkles className="w-3 h-3" />,
    className: 'bg-sy-purple/10 border border-sy-purple/35 text-sy-purple',
  },
  raw: {
    label: '未清洗',
    icon: <CheckCircle2 className="w-3 h-3" />,
    className: 'bg-sy-bg-3 border border-sy-border-2 text-sy-text-3',
  },
};

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round((score / 5) * 100);
  const colorClass =
    score >= 4.5
      ? 'text-sy-accent'
      : score >= 3.5
        ? 'text-sy-warn'
        : score >= 2.0
          ? 'text-sy-info'
          : 'text-sy-danger';
  return (
    <span className={`font-mono text-[13px] font-semibold ${colorClass}`}>
      {score.toFixed(1)} / 5.0
      <span className="text-sy-text-3 text-[11px] ml-1">({pct}%)</span>
    </span>
  );
}

function RawPanel({ raw }: { raw: Record<string, string> | null | undefined }) {
  if (!raw || Object.keys(raw).length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sy-text-3 text-[13px]">
        暂无原始数据
      </div>
    );
  }

  const fieldOrder = ['用例标题', '前置条件', '步骤', '预期', '优先级', '所属模块', '所属产品'];
  const keys = [
    ...fieldOrder.filter((k) => k in raw),
    ...Object.keys(raw).filter((k) => !fieldOrder.includes(k)),
  ];

  return (
    <div className="space-y-3">
      {keys.map((key) => (
        <div key={key}>
          <div className="text-[11px] text-sy-text-3 font-mono mb-1">{key}</div>
          <div className="text-[13px] text-sy-text-2 bg-sy-bg-2 rounded-md px-3 py-2 whitespace-pre-wrap break-words">
            {raw[key] || <span className="text-sy-text-3 italic">（空）</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function CleanedPanel({ testCase }: { testCase: TestCaseDetail }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] text-sy-text-3 font-mono mb-1">用例标题</div>
        <div className="text-[13px] text-sy-text font-medium bg-sy-bg-2 rounded-md px-3 py-2">
          {testCase.title}
        </div>
      </div>

      {testCase.precondition && (
        <div>
          <div className="text-[11px] text-sy-text-3 font-mono mb-1">前置条件</div>
          <div className="text-[13px] text-sy-text-2 bg-sy-bg-2 rounded-md px-3 py-2 whitespace-pre-wrap">
            {testCase.precondition}
          </div>
        </div>
      )}

      <div>
        <div className="text-[11px] text-sy-text-3 font-mono mb-1">
          测试步骤（{testCase.steps.length} 步）
        </div>
        <div className="space-y-1.5">
          {testCase.steps.map((step: TestCaseStep, idx: number) => (
            <div key={`step-${step.no ?? idx}`} className="bg-sy-bg-2 rounded-md px-3 py-2">
              <div className="flex gap-2">
                <span className="text-[11px] text-sy-accent font-mono mt-0.5 shrink-0">
                  {step.no ?? idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-sy-text-2">{step.action}</div>
                  {step.expected_result && (
                    <div className="mt-1 text-[12px] text-sy-accent/80 pl-2 border-l border-sy-accent/25">
                      {step.expected_result}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CleanCompareDrawer({ open, testCase, onClose }: CleanCompareDrawerProps) {
  if (!open || !testCase) return null;

  const statusCfg = testCase.clean_status
    ? (cleanStatusConfig[testCase.clean_status] ?? cleanStatusConfig.raw)
    : null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 cursor-default"
        onClick={onClose}
        aria-label="关闭抽屉"
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 h-full w-[860px] max-w-[95vw] bg-sy-bg-1 border-l border-sy-border z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-sy-border shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-sy-text">清洗前后对比</span>
            {statusCfg && (
              <span
                className={`flex items-center gap-1 text-[11px] font-mono rounded-full px-2 py-0.5 ${statusCfg.className}`}
              >
                {statusCfg.icon}
                {statusCfg.label}
              </span>
            )}
            {testCase.quality_score != null && <ScoreBadge score={testCase.quality_score} />}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sy-text-3 hover:text-sy-text transition-colors p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Case ID row */}
        <div className="px-5 py-2 border-b border-sy-border/50 shrink-0 flex items-center gap-2">
          <span className="font-mono text-[11px] text-sy-text-3">{testCase.case_id}</span>
          <ChevronRight className="w-3 h-3 text-sy-text-3" />
          <span className="text-[13px] text-sy-text-2 truncate">{testCase.title}</span>
        </div>

        {/* Split view */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Original raw data */}
          <div className="w-1/2 border-r border-sy-border flex flex-col">
            <div className="px-4 py-2.5 bg-sy-bg-2/50 border-b border-sy-border shrink-0">
              <span className="text-[11px] text-sy-text-3 font-mono uppercase tracking-wider">
                原始数据（清洗前）
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <RawPanel raw={testCase.original_raw} />
            </div>
          </div>

          {/* Right: Cleaned data */}
          <div className="w-1/2 flex flex-col">
            <div className="px-4 py-2.5 bg-sy-accent/5 border-b border-sy-border shrink-0">
              <span className="text-[11px] text-sy-accent/70 font-mono uppercase tracking-wider">
                清洗后内容
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <CleanedPanel testCase={testCase} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
