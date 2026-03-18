'use client';

import { Hash, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TrendData } from './types';

interface TrendChartsProps {
  trends: TrendData;
}

function ChartCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof TrendingUp;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-3.5 h-3.5 text-sy-accent" />
        <span className="sec-title text-[13px]">{title}</span>
      </div>
      <div className="h-[220px]">{children}</div>
    </div>
  );
}

export function TrendCharts({ trends }: TrendChartsProps) {
  const hasCaseData = trends.case_count_trend.length > 0;
  const hasPassData = trends.pass_rate_trend.length > 0;

  return (
    <div className="grid-2 mb-5">
      <ChartCard title="用例数量趋势" icon={Hash}>
        {hasCaseData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends.case_count_trend}>
              <defs>
                <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--text3)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text3)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg1)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--text)',
                }}
                labelStyle={{ color: 'var(--text3)', fontSize: 11 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#colorCases)"
                name="用例数"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-[12px] text-text3">
            暂无趋势数据
          </div>
        )}
      </ChartCard>

      <ChartCard title="通过率趋势" icon={TrendingUp}>
        {hasPassData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends.pass_rate_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--text3)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text3)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
                width={40}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg1)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--text)',
                }}
                labelStyle={{ color: 'var(--text3)', fontSize: 11 }}
                formatter={(value) => [`${value}%`, '通过率']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--blue)"
                strokeWidth={2}
                dot={{ fill: 'var(--blue)', r: 3 }}
                activeDot={{ r: 5, fill: 'var(--blue)' }}
                name="通过率"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-[12px] text-text3">
            暂无趋势数据
          </div>
        )}
      </ChartCard>
    </div>
  );
}
