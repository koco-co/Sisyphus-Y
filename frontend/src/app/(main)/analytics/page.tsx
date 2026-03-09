'use client';

import { useState } from 'react';
import { TrendingUp } from 'lucide-react';

/* ── static demo data ── */
const ranges = ['7天', '30天', '季度'] as const;

const stats = [
  { label: '用例总数', value: '1,596', delta: '' },
  { label: '本月新增', value: '247', delta: '18%' },
  { label: 'AI 生成率', value: '78.3%', delta: '' },
  { label: '平均生成耗时', value: '4.2s', delta: '' },
];

const coverageProducts = [
  { name: '数据集成平台', fn: 92, perf: 78, sec: 65, compat: 88 },
  { name: '数据开发工作台', fn: 87, perf: 82, sec: 71, compat: 63 },
  { name: '数据资产中心', fn: 95, perf: 60, sec: 80, compat: 75 },
  { name: '数据治理引擎', fn: 80, perf: 73, sec: 90, compat: 58 },
  { name: '数据服务网关', fn: 88, perf: 91, sec: 55, compat: 82 },
];
const coverageDims = ['功能', '性能', '安全', '兼容'] as const;

const qualityBars = [
  { range: '90–100', pct: 45, color: 'var(--accent)' },
  { range: '80–89', pct: 30, color: 'var(--blue)' },
  { range: '70–79', pct: 15, color: 'var(--amber)' },
  { range: '60–69', pct: 7, color: 'var(--purple)' },
  { range: '<60', pct: 3, color: 'var(--red)' },
];

const activities = [
  { user: '王磊', action: '标记 TC-1024 为通过', time: '10 分钟前' },
  { user: '李婷', action: '反馈 TC-0987 步骤 3 不可复现', time: '25 分钟前' },
  { user: '张明', action: '批量执行「登录模块」42 条用例', time: '1 小时前' },
  { user: '赵云', action: '提交 TC-1102 缺陷关联', time: '2 小时前' },
  { user: '陈芳', action: '更新 TC-0854 优先级为 P0', time: '3 小时前' },
];

/* ── helpers ── */
function cellColor(v: number) {
  if (v >= 85) return 'var(--accent)';
  if (v >= 70) return 'var(--blue)';
  if (v >= 55) return 'var(--amber)';
  return 'var(--red)';
}

function dimKey(product: (typeof coverageProducts)[0], dim: string) {
  const map: Record<string, keyof typeof product> = {
    功能: 'fn',
    性能: 'perf',
    安全: 'sec',
    兼容: 'compat',
  };
  return product[map[dim] ?? 'fn'] as number;
}

/* ── page ── */
export default function AnalyticsPage() {
  const [range, setRange] = useState<string>('30天');

  return (
    <div className="no-sidebar">
      <div className="page-watermark">P8 · QUALITY DASHBOARD</div>

      {/* Topbar */}
      <div className="topbar">
        <h1>质量看板</h1>
        <span className="sub">全局质量数据总览</span>
        <div className="spacer" />
        {ranges.map((r) => (
          <button
            type="button"
            key={r}
            className={`btn btn-sm${r === range ? ' btn-primary' : ''}`}
            onClick={() => setRange(r)}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Stat row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {stats.map((s) => (
          <div className="card" key={s.label}>
            <div className="stat-val">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            {s.delta && <div className="stat-delta" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><TrendingUp size={12} /> {s.delta}</div>}
          </div>
        ))}
      </div>

      {/* Coverage matrix */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="sec-header">
          <span className="sec-title">需求覆盖度矩阵</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>产品</th>
              {coverageDims.map((d) => (
                <th key={d} style={{ textAlign: 'center' }}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coverageProducts.map((p) => (
              <tr key={p.name}>
                <td style={{ fontWeight: 500, color: 'var(--text)' }}>{p.name}</td>
                {coverageDims.map((d) => {
                  const v = dimKey(p, d);
                  return (
                    <td key={d} style={{ textAlign: 'center' }}>
                      <span
                        className="mono"
                        style={{
                          color: cellColor(v),
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        {v}%
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 2-column: quality bars + activity feed */}
      <div className="grid-2">
        {/* Quality score distribution */}
        <div className="card">
          <div className="sec-header">
            <span className="sec-title">质量分数分布</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {qualityBars.map((b) => (
              <div key={b.range} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  className="mono"
                  style={{
                    width: 56,
                    textAlign: 'right',
                    fontSize: 12,
                    color: 'var(--text2)',
                  }}
                >
                  {b.range}
                </span>
                <div className="progress-bar" style={{ flex: 1, height: 8 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${b.pct}%`,
                      background: b.color,
                      height: '100%',
                    }}
                  />
                </div>
                <span className="mono" style={{ width: 36, fontSize: 12, color: 'var(--text3)' }}>
                  {b.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="card">
          <div className="sec-header">
            <span className="sec-title">执行反馈活动</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activities.map((a) => (
              <div
                key={a.user + a.action}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text2)',
                    flexShrink: 0,
                  }}
                >
                  {a.user[0]}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text)' }}>
                    <strong>{a.user}</strong>{' '}
                    <span style={{ color: 'var(--text2)' }}>{a.action}</span>
                  </div>
                </div>
                <span
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}
                >
                  {a.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
