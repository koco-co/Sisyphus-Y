'use client';

import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface TestCaseStep {
  no: number;
  action: string;
  expected_result: string;
}

interface CaseCardProps {
  caseId: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  type?: string;
  status?: string;
  precondition?: string;
  steps: TestCaseStep[];
  aiScore?: number;
  feedback?: string | null;
  onFeedback?: (caseId: string, feedback: 'up' | 'down') => void;
  className?: string;
}

const priorityVariant: Record<string, 'danger' | 'warning' | 'info' | 'gray'> = {
  P0: 'danger',
  P1: 'warning',
  P2: 'info',
  P3: 'gray',
};

export function CaseCard({
  caseId,
  title,
  priority,
  type,
  status,
  precondition,
  steps,
  aiScore,
  feedback,
  onFeedback,
  className = '',
}: CaseCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleFeedback = useCallback(
    (value: 'up' | 'down') => {
      onFeedback?.(caseId, value);
    },
    [caseId, onFeedback],
  );

  return (
    <div
      className={`bg-sy-bg-2 border border-sy-border rounded-lg p-3 mb-2 transition-all hover:border-sy-border-2 hover:-translate-y-px ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-[11px] text-sy-accent font-semibold">{caseId}</span>
        <StatusBadge variant={priorityVariant[priority] ?? 'gray'}>{priority}</StatusBadge>
        {type && <StatusBadge variant="gray">{type}</StatusBadge>}
        {status && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-sy-text-3">
            {status === 'passed' ? (
              <CheckCircle className="w-3 h-3 text-sy-accent" />
            ) : status === 'failed' ? (
              <AlertTriangle className="w-3 h-3 text-sy-danger" />
            ) : null}
            {status}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-[12.5px] text-sy-text font-medium mb-2">{title}</p>

      {/* Precondition */}
      {precondition && (
        <p className="text-[11px] text-sy-text-3 mb-2 pl-2 border-l-2 border-sy-border">
          前置条件：{precondition}
        </p>
      )}

      {/* AI Score + Feedback */}
      <div className="flex items-center gap-3 mb-2">
        {aiScore !== undefined && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-sy-text-3">AI 评分</span>
            <span className="font-mono text-[11px] text-sy-accent font-semibold">{aiScore}</span>
          </div>
        )}
        {onFeedback && (
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => handleFeedback('up')}
              className={`p-1 rounded transition-colors ${
                feedback === 'up'
                  ? 'text-sy-accent bg-sy-accent/10'
                  : 'text-sy-text-3 hover:text-sy-accent hover:bg-sy-accent/5'
              }`}
              title="有用"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleFeedback('down')}
              className={`p-1 rounded transition-colors ${
                feedback === 'down'
                  ? 'text-sy-danger bg-sy-danger/10'
                  : 'text-sy-text-3 hover:text-sy-danger hover:bg-sy-danger/5'
              }`}
              title="需改进"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Steps toggle */}
      {steps.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-sy-text-3 hover:text-sy-text-2 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {steps.length} 个步骤
          </button>

          {expanded && (
            <div className="mt-2 space-y-1.5">
              {steps.map((step) => (
                <div
                  key={step.no}
                  className="flex gap-2 text-[12px] p-2 rounded bg-sy-bg-3/50 border border-sy-border/50"
                >
                  <span className="font-mono text-sy-text-3 shrink-0 w-5">{step.no}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sy-text-2">{step.action}</p>
                    <p className="text-sy-accent/80 mt-0.5 text-[11px]">→ {step.expected_result}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
