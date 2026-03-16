'use client';

import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

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
  { key: 'ai_generated' as const, name: 'AI 生成', color: 'var(--accent)' },
  { key: 'imported' as const, name: '历史导入', color: 'var(--blue)' },
  { key: 'manual' as const, name: '手动创建', color: 'var(--purple)' },
];

export default function SourcePieChart({ data, loading = false }: SourcePieChartProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Skeleton className="w-40 h-40 rounded-full" />
      </div>
    );
  }

  const isEmpty =
    !data || (data.ai_generated === 0 && data.imported === 0 && data.manual === 0);

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-[220px]">
        <p className="text-sm text-center" style={{ color: 'var(--text3)' }}>
          暂无数据
        </p>
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
        <Pie
          data={pieData}
          innerRadius={55}
          outerRadius={85}
          dataKey="value"
          paddingAngle={2}
        >
          {pieData.map((entry, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable index for pie cells
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`${value} 条`, '']}
          contentStyle={{
            background: 'var(--bg1)',
            border: '1px solid var(--border)',
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
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{total}</span>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>总用例</span>
      </div>
    </div>
  );
}
