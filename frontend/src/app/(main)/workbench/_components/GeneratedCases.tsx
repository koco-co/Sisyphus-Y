'use client';

import { ClipboardList } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { CaseCard } from '@/components/workspace/CaseCard';
import { testcasesApi } from '@/lib/api';
import type { WorkbenchTestCase } from '@/stores/workspace-store';
import { CaseFilters } from './CaseFilters';
import { CaseSkeleton } from './CaseSkeleton';
import { ExportButtons } from './ExportButtons';

interface GeneratedCasesProps {
  testCases: WorkbenchTestCase[];
  isStreaming: boolean;
  selectedReqId: string | null;
  priorityFilter: string | null;
  typeFilter: string | null;
  onPriorityChange: (v: string | null) => void;
  onTypeChange: (v: string | null) => void;
  onExport: (format: 'excel' | 'json') => void;
}

export function GeneratedCases({
  testCases,
  isStreaming,
  selectedReqId,
  priorityFilter,
  typeFilter,
  onPriorityChange,
  onTypeChange,
  onExport,
}: GeneratedCasesProps) {
  const [feedbacks, setFeedbacks] = useState<Record<string, 'up' | 'down'>>({});

  // CaseCard passes display case_id (e.g. "IMP-xxx"); look up UUID for API call
  const handleFeedback = useCallback(async (displayCaseId: string, value: 'up' | 'down') => {
    const tc = testCases.find((t) => t.case_id === displayCaseId);
    if (!tc) return;
    setFeedbacks((prev) => ({ ...prev, [displayCaseId]: value }));
    try {
      if (value === 'up') {
        await testcasesApi.adoptCase(tc.id);
      } else {
        await testcasesApi.rejectCase(tc.id);
      }
    } catch {
      setFeedbacks((prev) => {
        const next = { ...prev };
        delete next[displayCaseId];
        return next;
      });
    }
  }, [testCases]);

  const filtered = useMemo(() => {
    let result = testCases;
    if (priorityFilter) {
      result = result.filter((tc) => tc.priority === priorityFilter);
    }
    if (typeFilter) {
      result = result.filter((tc) => tc.case_type === typeFilter);
    }
    return result;
  }, [testCases, priorityFilter, typeFilter]);

  const stats = useMemo(() => {
    const aiCount = testCases.filter((t) => t.source === 'ai').length;
    return { total: testCases.length, ai: aiCount, manual: testCases.length - aiCount };
  }, [testCases]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 border-b border-border flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-text2" />
        <h4 className="text-[13px] font-semibold text-text flex-1">已生成用例</h4>
        <span className="text-[11px] font-mono text-sy-accent font-semibold">
          {testCases.length}
        </span>
      </div>

      {/* Filters */}
      {testCases.length > 0 && (
        <CaseFilters
          priorityFilter={priorityFilter}
          typeFilter={typeFilter}
          onPriorityChange={onPriorityChange}
          onTypeChange={onTypeChange}
        />
      )}

      {/* Case list */}
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length > 0 ? (
          filtered.map((tc) => (
            <CaseCard
              key={tc.id}
              caseId={tc.case_id}
              title={tc.title}
              priority={tc.priority}
              type={tc.case_type}
              status={tc.status}
              precondition={tc.precondition}
              steps={tc.steps}
              aiScore={tc.ai_score}
              feedback={feedbacks[tc.case_id]}
              onFeedback={handleFeedback}
            />
          ))
        ) : isStreaming ? (
          <CaseSkeleton count={3} />
        ) : (
          <EmptyState
            title={selectedReqId ? '暂无测试用例' : '选择需求查看用例'}
            description={selectedReqId ? '通过对话生成测试用例' : undefined}
          />
        )}

        {/* Skeleton at bottom during streaming if we already have some cases */}
        {isStreaming && filtered.length > 0 && <CaseSkeleton count={1} />}
      </div>

      {/* Stats */}
      {testCases.length > 0 && (
        <div className="px-3 py-2 border-t border-border grid grid-cols-3 text-center">
          <div>
            <div className="text-[14px] font-bold font-mono text-sy-accent">{stats.total}</div>
            <div className="text-[10px] text-text3">总计</div>
          </div>
          <div>
            <div className="text-[14px] font-bold font-mono text-sy-accent">{stats.ai}</div>
            <div className="text-[10px] text-text3">AI 生成</div>
          </div>
          <div>
            <div className="text-[14px] font-bold font-mono text-sy-warn">{stats.manual}</div>
            <div className="text-[10px] text-text3">手动</div>
          </div>
        </div>
      )}

      {/* Export */}
      <ExportButtons onExport={onExport} disabled={testCases.length === 0} />
    </div>
  );
}
