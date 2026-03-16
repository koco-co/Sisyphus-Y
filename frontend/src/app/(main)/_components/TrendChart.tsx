'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
export interface TrendDataPoint {
  iteration_name: string;
  testcase_count: number;
  p0_count: number;
  coverage_rate: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  loading?: boolean;
}

export default function TrendChart({ data, loading = false }: TrendChartProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-2">
        {[75, 100, 83].map((w) => (
          <div
            key={w}
            className="h-4 rounded animate-pulse"
            style={{ width: `${w}%`, background: 'var(--bg2)' }}
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <p className="text-sm text-center" style={{ color: 'var(--text3)' }}>
          暂无迭代数据
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="iteration_name"
          tick={{ fill: 'var(--text2)', fontSize: 11 }}
        />
        <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: 'var(--bg1)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <Legend />
        <Line
          dataKey="testcase_count"
          name="用例总量"
          stroke="var(--accent)"
          dot={false}
          strokeWidth={2}
        />
        <Line
          dataKey="p0_count"
          name="P0 数量"
          stroke="var(--red)"
          dot={false}
          strokeWidth={2}
        />
        <Line
          dataKey="coverage_rate"
          name="覆盖率%"
          stroke="var(--blue)"
          dot={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
