/**
 * Enhanced Trend Chart Component
 * Uses Recharts for professional visualizations
 * Falls back to simple chart if data unavailable
 */

import { TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TrendChartEnhancedProps {
  title: string;
  subtitle?: string;
  data?: Array<{ date: string; value: number }>;
  chartType?: 'line' | 'bar';
  color?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
}

export function TrendChartEnhanced({
  title,
  subtitle,
  data,
  chartType = 'line',
  color = '#10b981',
  showGrid = true,
  showTooltip = true,
}: TrendChartEnhancedProps) {
  // Calculate trend
  const values = data?.map((d) => d.value) || [];
  const currentValue = values[values.length - 1];
  const previousValue = values[values.length - 2] || values[0];
  const trendPercent =
    previousValue > 0
      ? (((currentValue - previousValue) / previousValue) * 100).toFixed(1)
      : '0';

  const isTrendUp = parseFloat(trendPercent) >= 0;
  const trendColor = isTrendUp ? 'text-emerald-600' : 'text-red-600';

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-slate-900">
            {title}
          </h3>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${trendColor}`}>
          <TrendingUp className="h-4 w-4" />
          {isTrendUp ? '+' : ''}{trendPercent}%
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            {chartType === 'line' ? (
              <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                {showTooltip && (
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value) =>
                      new Intl.NumberFormat('ko-KR').format(value as number)
                    }
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  dot={{ fill: color, r: 4 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={true}
                />
              </LineChart>
            ) : (
              <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                {showTooltip && (
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value) =>
                      new Intl.NumberFormat('ko-KR').format(value as number)
                    }
                  />
                )}
                <Bar
                  dataKey="value"
                  fill={color}
                  radius={[8, 8, 0, 0]}
                  isAnimationActive={true}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-400">
            <TrendingUp className="h-8 w-8" />
            <p className="text-sm font-medium">데이터 없음</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        {chartType === 'line' ? '추이 변화' : '누적 통계'}
        {data && data.length > 0 && ` • ${data[0]?.date} ~ ${data[data.length - 1]?.date}`}
      </p>
    </div>
  );
}

export default TrendChartEnhanced;
