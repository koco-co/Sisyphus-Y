'use client';

import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
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
  className = '',
}: CaseCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`bg-bg2 border border-border rounded-lg p-3 mb-2 transition-all hover:border-border2 hover:-translate-y-px ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-[11px] text-accent font-semibold">{caseId}</span>
        <StatusBadge variant={priorityVariant[priority] ?? 'gray'}>{priority}</StatusBadge>
        {type && <StatusBadge variant="gray">{type}</StatusBadge>}
        {status && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-text3">
            {status === 'passed' ? (
              <CheckCircle className="w-3 h-3 text-accent" />
            ) : status === 'failed' ? (
              <AlertTriangle className="w-3 h-3 text-red" />
            ) : null}
            {status}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-[12.5px] text-text font-medium mb-2">{title}</p>

      {/* Precondition */}
      {precondition && (
        <p className="text-[11px] text-text3 mb-2 pl-2 border-l-2 border-border">
          前置条件：{precondition}
        </p>
      )}

      {/* AI Score */}
      {aiScore !== undefined && (
        <div className="flex items-center gap-1 mb-2">
          <span className="text-[10px] text-text3">AI 评分</span>
          <span className="font-mono text-[11px] text-accent font-semibold">{aiScore}</span>
        </div>
      )}

      {/* Steps toggle */}
      {steps.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-text3 hover:text-text2 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {steps.length} 个步骤
          </button>

          {expanded && (
            <div className="mt-2 space-y-1.5">
              {steps.map((step) => (
                <div
                  key={step.no}
                  className="flex gap-2 text-[12px] p-2 rounded bg-bg3/50 border border-border/50"
                >
                  <span className="font-mono text-text3 shrink-0 w-5">{step.no}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-text2">{step.action}</p>
                    <p className="text-accent/80 mt-0.5 text-[11px]">→ {step.expected_result}</p>
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
