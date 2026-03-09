'use client';

import { AlertCircle, CheckCircle2, Grid3x3, ShieldCheck, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface Product {
  id: string;
  name: string;
}

const rateColor = (rate: number) =>
  rate >= 80 ? 'var(--accent)' : rate >= 50 ? 'var(--amber)' : 'var(--red)';

const rateFillClass = (rate: number) => (rate >= 80 ? '' : rate >= 50 ? 'amber' : 'red');

export default function CoveragePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [coverageData, setCoverageData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/products/`)
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : data.items || []))
      .catch(console.error);
  }, []);

  const loadCoverage = async (productId: string) => {
    setSelectedProduct(productId);
    setLoading(true);
    try {
      const res = await fetch(`${API}/coverage/product/${productId}`);
      if (res.ok) setCoverageData(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const iterations: any[] = coverageData?.iterations || [];
  const avgRate =
    iterations.length > 0
      ? Math.round(
          iterations.reduce((s: number, it: any) => s + (it.coverage_rate || 0), 0) /
            iterations.length,
        )
      : 0;
  const totalReqs = iterations.reduce((s: number, it: any) => s + (it.requirement_count || 0), 0);
  const totalUncovered = iterations.reduce(
    (s: number, it: any) => s + (it.uncovered_count || 0),
    0,
  );

  return (
    <div>
      {/* Header */}
      <div className="topbar">
        <Grid3x3 size={20} style={{ color: 'var(--accent)' }} />
        <h1>需求覆盖度矩阵</h1>
        <span className="sub">Coverage Matrix</span>
        <div className="spacer" />
        <span className="page-watermark">M08 · COVERAGE</span>
      </div>

      {/* Product Selector */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginRight: 4,
          }}
        >
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
        {products.length === 0 && (
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>暂无产品数据</span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="card">
          <div className="empty-state" style={{ padding: 32 }}>
            <div
              style={{
                width: 32,
                height: 32,
                border: '3px solid var(--border)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p>加载覆盖度数据...</p>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {coverageData && !loading && (
        <>
          <div className="grid-3" style={{ marginBottom: 20 }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="stat-val" style={{ color: rateColor(avgRate) }}>
                {avgRate}%
              </div>
              <div className="stat-label">平均覆盖率</div>
              <div className="progress-bar" style={{ marginTop: 10, height: 4 }}>
                <div
                  className={`progress-fill ${rateFillClass(avgRate)}`}
                  style={{ width: `${avgRate}%` }}
                />
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="stat-val" style={{ color: 'var(--blue)' }}>
                {totalReqs}
              </div>
              <div className="stat-label">总需求数</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div
                className="stat-val"
                style={{
                  color: totalUncovered > 0 ? 'var(--red)' : 'var(--accent)',
                }}
              >
                {totalUncovered}
              </div>
              <div className="stat-label">未覆盖需求</div>
            </div>
          </div>

          {/* Iteration Coverage Cards */}
          <div style={{ display: 'grid', gap: 12 }}>
            {iterations.map((iter: any) => (
              <div key={iter.iteration_id} className="card card-hover">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {iter.coverage_rate >= 80 ? (
                      <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} />
                    ) : iter.coverage_rate >= 50 ? (
                      <AlertCircle size={16} style={{ color: 'var(--amber)' }} />
                    ) : (
                      <XCircle size={16} style={{ color: 'var(--red)' }} />
                    )}
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                      {iter.iteration_name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span className="pill pill-blue">需求 {iter.requirement_count}</span>
                    <span className="pill pill-purple">用例 {iter.testcase_count}</span>
                    {iter.uncovered_count > 0 && (
                      <span className="pill pill-red">未覆盖 {iter.uncovered_count}</span>
                    )}
                  </div>
                </div>
                <div className="progress-bar" style={{ height: 6 }}>
                  <div
                    className={`progress-fill ${rateFillClass(iter.coverage_rate)}`}
                    style={{ width: `${iter.coverage_rate}%` }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                  }}
                >
                  <span className="stat-label">覆盖率</span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: rateColor(iter.coverage_rate),
                    }}
                  >
                    {iter.coverage_rate}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {iterations.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <ShieldCheck size={40} />
                <p>该产品暂无覆盖度数据</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!coverageData && !loading && (
        <div className="card">
          <div className="empty-state">
            <Grid3x3 size={48} />
            <p style={{ fontWeight: 500 }}>选择产品查看覆盖度数据</p>
            <p>覆盖度矩阵展示需求与用例的映射关系</p>
          </div>
        </div>
      )}
    </div>
  );
}
