'use client';

import { Grid3x3, Loader2, ShieldCheck } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { CoverageMatrix } from './_components/CoverageMatrix';
import { CoverageStats } from './_components/CoverageStats';
import { UncoveredList } from './_components/UncoveredList';
import { useCoverageData } from './_components/useCoverageData';

export default function CoveragePage() {
  const { products, selectedProduct, iterations, loading, error, summary, loadCoverage } =
    useCoverageData();

  const hasData = iterations.length > 0;

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <Grid3x3 className="w-5 h-5 text-accent" />
        <h1 className="font-display text-[20px] font-bold text-text">需求覆盖度矩阵</h1>
        <span className="text-[12px] text-text3">Coverage Matrix</span>
        <div className="flex-1" />
        <span className="font-mono text-[10px] text-text3 tracking-wider">M08 · COVERAGE</span>
      </div>

      {/* ── Product Selector ── */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="text-[11px] font-semibold text-text3 uppercase tracking-wider mr-1">
          产品:
        </span>
        {products.map((p) => (
          <button
            type="button"
            key={p.id}
            className={`btn btn-sm ${selectedProduct === p.id ? 'btn-primary' : ''}`}
            onClick={() => loadCoverage(p.id)}
          >
            {p.name}
          </button>
        ))}
        {products.length === 0 && <span className="text-[12px] text-text3">暂无产品数据</span>}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-12 text-text3">
            <Loader2 className="w-8 h-8 animate-spin text-accent mb-3" />
            <span className="text-[13px]">加载覆盖度数据...</span>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="alert-banner">
          <span>{error}</span>
        </div>
      )}

      {/* ── Content ── */}
      {hasData && !loading && (
        <>
          <CoverageStats summary={summary} />
          <CoverageMatrix iterations={iterations} />
          <UncoveredList iterations={iterations} />
        </>
      )}

      {/* ── Empty (product selected but no data) ── */}
      {selectedProduct && !hasData && !loading && !error && (
        <div className="card">
          <EmptyState
            icon={<ShieldCheck className="w-12 h-12" />}
            title="该产品暂无覆盖度数据"
            description="请先创建迭代和需求，完成用例生成后覆盖率数据会自动计算"
          />
        </div>
      )}

      {/* ── Empty (no product selected) ── */}
      {!selectedProduct && !loading && (
        <div className="card">
          <EmptyState
            icon={<Grid3x3 className="w-12 h-12" />}
            title="选择产品查看覆盖度数据"
            description="覆盖度矩阵展示需求与用例的映射关系，帮助识别测试空白区域"
          />
        </div>
      )}
    </div>
  );
}
