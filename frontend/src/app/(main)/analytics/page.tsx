'use client';

import { BarChart3, Loader2, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { DashboardOverview } from './_components/DashboardOverview';
import { useAnalyticsData } from './_components/useAnalyticsData';

const TrendCharts = dynamic(() => import('./_components/TrendCharts').then((m) => m.TrendCharts), {
  loading: () => (
    <div className="h-[280px] flex items-center justify-center text-text3">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
  ),
});

const DistributionCharts = dynamic(
  () => import('./_components/DistributionCharts').then((m) => m.DistributionCharts),
  {
    loading: () => (
      <div className="h-[280px] flex items-center justify-center text-text3">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    ),
  },
);

export default function AnalyticsPage() {
  const { overview, priority, status, source, trends, totalCases, loading, refresh } =
    useAnalyticsData();

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-5 h-5 text-accent" />
        <h1 className="font-display text-[20px] font-bold text-text">质量分析看板</h1>
        <span className="text-[12px] text-text3">Quality Analytics</span>
        <div className="flex-1" />
        <button type="button" className="btn btn-sm btn-ghost" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
        <span className="font-mono text-[10px] text-text3 tracking-wider">M14 · ANALYTICS</span>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-16 text-text3">
            <Loader2 className="w-8 h-8 animate-spin text-accent mb-3" />
            <span className="text-[13px]">加载分析数据...</span>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {!loading && (
        <>
          <DashboardOverview overview={overview} />
          <TrendCharts trends={trends} />
          <DistributionCharts
            priority={priority}
            status={status}
            source={source}
            totalCases={totalCases}
          />
        </>
      )}
    </div>
  );
}
