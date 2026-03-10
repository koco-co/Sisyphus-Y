import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AnalyticsOverview, DistributionItem, TrendData } from './types';

const DEFAULT_OVERVIEW: AnalyticsOverview = {
  product_count: 0,
  iteration_count: 0,
  requirement_count: 0,
  testcase_count: 0,
  pass_rate: 0,
  coverage_rate: 0,
  defect_density: 0,
  automation_rate: 0,
  quality_score: 0,
};

function normalizeSourceDistributions(items: DistributionItem[]): DistributionItem[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    const raw = String(item.source ?? '');
    const normalized =
      raw === 'ai' || raw === 'ai_generated'
        ? 'ai_generated'
        : raw === 'user_added'
          ? 'manual'
          : raw;
    counts.set(normalized, (counts.get(normalized) ?? 0) + Number(item.count ?? 0));
  }

  return Array.from(counts.entries()).map(([source, count]) => ({ source, count }));
}

export function useAnalyticsData() {
  const [overview, setOverview] = useState<AnalyticsOverview>(DEFAULT_OVERVIEW);
  const [priority, setPriority] = useState<DistributionItem[]>([]);
  const [status, setStatus] = useState<DistributionItem[]>([]);
  const [source, setSource] = useState<DistributionItem[]>([]);
  const [trends, setTrends] = useState<TrendData>({
    case_count_trend: [],
    pass_rate_trend: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, pr, st, sr, trendData] = await Promise.all([
        api.get<AnalyticsOverview>('/analytics/overview').catch(() => DEFAULT_OVERVIEW),
        api.get<DistributionItem[]>('/analytics/priority-distribution').catch(() => []),
        api.get<DistributionItem[]>('/analytics/status-distribution').catch(() => []),
        api.get<DistributionItem[]>('/analytics/source-distribution').catch(() => []),
        api
          .get<TrendData>('/analytics/trends')
          .catch(() => ({ case_count_trend: [], pass_rate_trend: [] })),
      ]);

      const passRate = ov.pass_rate ?? 0;
      const coverageRate = ov.coverage_rate ?? 0;
      const qualityScore =
        ov.quality_score ??
        Math.round(
          passRate * 0.4 + coverageRate * 0.4 + (100 - (ov.defect_density ?? 0) * 10) * 0.2,
        );

      setOverview({ ...ov, quality_score: Math.min(100, Math.max(0, qualityScore)) });
      setPriority(pr);
      setStatus(st);
      setSource(normalizeSourceDistributions(sr));
      setTrends(trendData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalCases = overview.testcase_count || priority.reduce((s, p) => s + p.count, 0);

  return {
    overview,
    priority,
    status,
    source,
    trends,
    totalCases,
    loading,
    refresh: fetchData,
  };
}
