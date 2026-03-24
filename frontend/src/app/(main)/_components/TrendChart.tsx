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
            style={{ width: `${w}%`, background: '#1a1e24' }}
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <p className="text-sm text-center text-sy-text-3">暂无迭代数据</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a313d" />
        <XAxis dataKey="iteration_name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: '#131619',
            border: '1px solid #2a313d',
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <Legend />
        <Line
          dataKey="testcase_count"
          name="用例总量"
          stroke="#00d9a3"
          dot={false}
          strokeWidth={2}
        />
        <Line dataKey="p0_count" name="P0 数量" stroke="#f43f5e" dot={false} strokeWidth={2} />
        <Line dataKey="coverage_rate" name="覆盖率%" stroke="#3b82f6" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
