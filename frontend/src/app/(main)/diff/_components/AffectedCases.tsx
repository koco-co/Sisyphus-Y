'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  SendHorizonal,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { AffectedTestCase } from '@/stores/diff-store';

interface AffectedCasesProps {
  cases: AffectedTestCase[];
  requirementId?: string | null;
  totalTestPoints?: number;
  className?: string;
}

// Badge config for change_impact (canonical backend field)
const changeImpactBadge: Record<
  string,
  { variant: 'danger' | 'warning' | 'success' | 'gray'; label: string }
> = {
  needs_rewrite: { variant: 'danger', label: '需重写' },
  needs_review: { variant: 'warning', label: '需复核' },
  not_affected: { variant: 'success', label: '不受影响' },
};

// Fallback badge for legacy impact_type field
const impactTypeBadge: Record<
  string,
  { variant: 'danger' | 'warning' | 'success' | 'gray'; label: string }
> = {
  rewrite: { variant: 'danger', label: '需重写' },
  review: { variant: 'warning', label: '需审核' },
  none: { variant: 'success', label: '不受影响' },
};

function getImpactBadge(c: AffectedTestCase) {
  if (c.change_impact != null) {
    return changeImpactBadge[c.change_impact] ?? { variant: 'gray' as const, label: '未分析' };
  }
  return impactTypeBadge[c.impact_type] ?? impactTypeBadge.none;
}

function getImpactIcon(c: AffectedTestCase) {
  const key =
    c.change_impact ??
    (c.impact_type === 'rewrite'
      ? 'needs_rewrite'
      : c.impact_type === 'review'
        ? 'needs_review'
        : 'not_affected');
  if (key === 'needs_rewrite') return <RefreshCw className="w-3.5 h-3.5 text-sy-danger" />;
  if (key === 'needs_review') return <Eye className="w-3.5 h-3.5 text-sy-warn" />;
  return <CheckCircle2 className="w-3.5 h-3.5 text-sy-accent" />;
}

export function AffectedCases({
  cases,
  requirementId,
  totalTestPoints = 0,
  className = '',
}: AffectedCasesProps) {
  const [search, setSearch] = useState('');
  const [pushing, setPushing] = useState(false);

  const stats = useMemo(() => {
    const rewrite = cases.filter(
      (c) =>
        c.change_impact === 'needs_rewrite' || (!c.change_impact && c.impact_type === 'rewrite'),
    ).length;
    const review = cases.filter(
      (c) => c.change_impact === 'needs_review' || (!c.change_impact && c.impact_type === 'review'),
    ).length;
    const notAffected = cases.filter(
      (c) => c.change_impact === 'not_affected' || (!c.change_impact && c.impact_type === 'none'),
    ).length;
    return { rewrite, review, notAffected };
  }, [cases]);

  const filtered = useMemo(() => {
    if (!search) return cases;
    const q = search.toLowerCase();
    return cases.filter(
      (c) => c.title.toLowerCase().includes(q) || c.case_id.toLowerCase().includes(q),
    );
  }, [cases, search]);

  const handlePushToWorkbench = async () => {
    if (!requirementId) return;
    setPushing(true);
    try {
      const res = await fetch(`/api/diff/${requirementId}/push-to-workbench`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? '推送失败');
      }
      const data = (await res.json()) as { pushed_count: number };
      toast.success(`已推送 ${data.pushed_count} 条用例到工作台`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '推送失败，请重试');
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className={className}>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-sy-danger/6 border border-sy-danger/20 rounded-lg p-2.5 text-center">
          <div className="font-mono text-[18px] font-semibold text-sy-danger leading-none">
            {stats.rewrite}
          </div>
          <div className="text-[10px] text-sy-text-3 mt-1">需重写</div>
        </div>
        <div className="bg-sy-warn/6 border border-sy-warn/20 rounded-lg p-2.5 text-center">
          <div className="font-mono text-[18px] font-semibold text-sy-warn leading-none">
            {stats.review}
          </div>
          <div className="text-[10px] text-sy-text-3 mt-1">需复核</div>
        </div>
        <div className="bg-sy-accent/6 border border-sy-accent/20 rounded-lg p-2.5 text-center">
          <div className="font-mono text-[18px] font-semibold text-sy-accent leading-none">
            {stats.notAffected}
          </div>
          <div className="text-[10px] text-sy-text-3 mt-1">不受影响</div>
        </div>
      </div>

      {totalTestPoints > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-sy-text-3 mb-3 px-1">
          <AlertTriangle className="w-3 h-3 text-sy-warn" />
          涉及 {totalTestPoints} 个测试点
        </div>
      )}

      {/* Push to workbench button */}
      {stats.rewrite > 0 && requirementId && (
        <button
          type="button"
          onClick={handlePushToWorkbench}
          disabled={pushing}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 mb-3 rounded-lg text-[12px] font-semibold bg-sy-danger/10 border border-sy-danger/30 text-sy-danger hover:bg-sy-danger/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pushing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              推送中...
            </>
          ) : (
            <>
              <SendHorizonal className="w-3.5 h-3.5" />
              一键推送到工作台（{stats.rewrite} 条需重写）
            </>
          )}
        </button>
      )}

      <SearchInput value={search} onChange={setSearch} placeholder="搜索用例..." className="mb-3" />

      {/* Case list */}
      <div className="space-y-1.5 max-h-[calc(100vh-420px)] overflow-y-auto">
        {filtered.map((c) => {
          const badge = getImpactBadge(c);
          return (
            <div
              key={c.id}
              className="flex items-start gap-2 p-2.5 bg-sy-bg-2 border border-sy-border rounded-lg hover:border-sy-border-2 transition-colors cursor-pointer"
            >
              <div className="shrink-0 mt-0.5">{getImpactIcon(c)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-sy-accent font-semibold">
                    {c.case_id}
                  </span>
                  <StatusBadge variant={badge.variant} className="text-[9px]">
                    {badge.label}
                  </StatusBadge>
                </div>
                <p className="text-[12px] text-sy-text-2 mt-0.5 truncate">{c.title}</p>
                {c.priority && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-sy-text-3">{c.priority}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-8 text-sy-text-3">
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
