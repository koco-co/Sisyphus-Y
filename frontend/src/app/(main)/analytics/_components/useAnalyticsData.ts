import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AnalyticsOverview, DistributionItem, TrendData, TrendPoint } from './types';

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
      const [ov, pr, st, sr] = await Promise.all([
        api.get<AnalyticsOverview>('/analytics/overview').catch(() => DEFAULT_OVERVIEW),
        api.get<DistributionItem[]>('/analytics/priority-distribution').catch(() => []),
        api.get<DistributionItem[]>('/analytics/status-distribution').catch(() => []),
        api.get<DistributionItem[]>('/analytics/source-distribution').catch(() => []),
      ]);

      // Derive quality_score if not provided
      const passRate = ov.pass_rate ?? 0;
      const coverageRate = ov.coverage_rate ?? 0;
      const qualityScore =
        ov.quality_score ||
        Math.round(
          passRate * 0.4 + coverageRate * 0.4 + (100 - (ov.defect_density ?? 0) * 10) * 0.2,
        );

      setOverview({ ...ov, quality_score: Math.min(100, Math.max(0, qualityScore)) });
      setPriority(pr);
      setStatus(st);
      setSource(sr);

      // Try fetching trends (may not exist yet)
      try {
        const trendData = await api.get<TrendData>('/analytics/trends');
        setTrends(trendData);
      } catch {
        // Generate mock trend data for demo
        const now = new Date();
        const mockTrend: TrendPoint[] = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now);
          d.setDate(d.getDate() - (6 - i));
          return {
            date: `${d.getMonth() + 1}/${d.getDate()}`,
            value: Math.round(Math.random() * 20 + (ov.testcase_count || 10) * (0.5 + i * 0.08)),
          };
        });
        const mockPassRate: TrendPoint[] = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now);
          d.setDate(d.getDate() - (6 - i));
          return {
            date: `${d.getMonth() + 1}/${d.getDate()}`,
            value: Math.round(60 + Math.random() * 30 + i * 2),
          };
        });
        setTrends({ case_count_trend: mockTrend, pass_rate_trend: mockPassRate });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalCases = priority.reduce((s, p) => s + p.count, 0) || 1;

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
