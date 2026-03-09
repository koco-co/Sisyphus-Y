'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SearchInput } from '@/components/ui/SearchInput';
import type { AffectedTestCase } from '@/stores/diff-store';

interface AffectedCasesProps {
  cases: AffectedTestCase[];
  totalTestPoints?: number;
  className?: string;
}

const impactBadge: Record<string, { variant: 'danger' | 'warning' | 'success'; label: string }> = {
  rewrite: { variant: 'danger', label: '需重写' },
  review: { variant: 'warning', label: '需审核' },
  none: { variant: 'success', label: '不受影响' },
};

export function AffectedCases({
  cases,
  totalTestPoints = 0,
  className = '',
}: AffectedCasesProps) {
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const rewrite = cases.filter((c) => c.impact_type === 'rewrite').length;
    const review = cases.filter((c) => c.impact_type === 'review').length;
    const none = cases.filter((c) => c.impact_type === 'none').length;
    return { rewrite, review, none };
  }, [cases]);

  const filtered = useMemo(() => {
    if (!search) return cases;
    const q = search.toLowerCase();
    return cases.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.case_id.toLowerCase().includes(q),
    );
  }, [cases, search]);

  return (
    <div className={className}>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-red/6 border border-red/20 rounded-lg p-2.5 text-center">
          <div className="font-mono text-[18px] font-semibold text-red leading-none">
            {stats.rewrite}
          </div>
          <div className="text-[10px] text-text3 mt-1">需重写</div>
        </div>
        <div className="bg-amber/6 border border-amber/20 rounded-lg p-2.5 text-center">
          <div className="font-mono text-[18px] font-semibold text-amber leading-none">
            {stats.review}
          </div>
          <div className="text-[10px] text-text3 mt-1">需审核</div>
        </div>
        <div className="bg-accent/6 border border-accent/20 rounded-lg p-2.5 text-center">
          <div className="font-mono text-[18px] font-semibold text-accent leading-none">
            {stats.none}
          </div>
          <div className="text-[10px] text-text3 mt-1">不受影响</div>
        </div>
      </div>

      {totalTestPoints > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-text3 mb-3 px-1">
          <AlertTriangle className="w-3 h-3 text-amber" />
          涉及 {totalTestPoints} 个测试点
        </div>
      )}

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="搜索用例..."
        className="mb-3"
      />

      {/* Case list */}
      <div className="space-y-1.5 max-h-[calc(100vh-380px)] overflow-y-auto">
        {filtered.map((c) => {
          const badge = impactBadge[c.impact_type] ?? impactBadge.none;
          return (
            <div
              key={c.id}
              className="flex items-start gap-2 p-2.5 bg-bg2 border border-border rounded-lg hover:border-border2 transition-colors cursor-pointer"
            >
              <div className="shrink-0 mt-0.5">
                {c.impact_type === 'rewrite' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-red" />
                ) : c.impact_type === 'review' ? (
                  <Eye className="w-3.5 h-3.5 text-amber" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-accent font-semibold">
                    {c.case_id}
                  </span>
                  <StatusBadge variant={badge.variant} className="text-[9px]">
                    {badge.label}
                  </StatusBadge>
                </div>
                <p className="text-[12px] text-text2 mt-0.5 truncate">
                  {c.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-text3">
                    {c.priority}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-8 text-text3">
            <FileText className="w-8 h-8 opacity-30 mb-2" />
            <span className="text-[12px]">
              {cases.length === 0 ? '暂无受影响用例' : '无匹配结果'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
