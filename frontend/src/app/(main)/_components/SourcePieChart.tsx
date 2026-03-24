'use client';

import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts';
export interface SourceData {
  ai_generated: number;
  imported: number;
  manual: number;
}

interface SourcePieChartProps {
  data: SourceData | null;
  loading?: boolean;
}

const PIE_DATA_CONFIG = [
  { key: 'ai_generated' as const, name: 'AI 生成', color: '#00d9a3' },
  { key: 'imported' as const, name: '历史导入', color: '#3b82f6' },
  { key: 'manual' as const, name: '手动创建', color: '#a855f7' },
];

export default function SourcePieChart({ data, loading = false }: SourcePieChartProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-40 h-40 rounded-full animate-pulse" style={{ background: '#1a1e24' }} />
      </div>
    );
  }

  const isEmpty = !data || (data.ai_generated === 0 && data.imported === 0 && data.manual === 0);

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-[220px]">
        <p className="text-sm text-center text-sy-text-3">暂无数据</p>
      </div>
    );
  }

  const pieData = PIE_DATA_CONFIG.map((cfg) => ({
    name: cfg.name,
    value: data[cfg.key],
    color: cfg.color,
  }));

  const total = pieData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="relative flex items-center justify-center">
      <PieChart width={220} height={220}>
        <Pie data={pieData} innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
          {pieData.map((entry, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable index for pie cells
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${value} 条`, '']}
          contentStyle={{
            background: '#131619',
            border: '1px solid #2a313d',
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <Legend />
      </PieChart>
      {/* 中心总数 */}
      <div
        className="absolute flex flex-col items-center pointer-events-none"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -68%)' }}
      >
        <span style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>{total}</span>
        <span style={{ fontSize: 10, color: '#566577' }}>总用例</span>
      </div>
    </div>
  );
}
