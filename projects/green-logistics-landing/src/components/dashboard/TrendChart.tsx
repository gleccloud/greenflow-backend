import { TrendingUp } from 'lucide-react';

interface TrendChartProps {
  title: string;
  subtitle?: string;
  data?: Array<{ date: string; value: number }>;
}

export function TrendChart({ title, subtitle, data }: TrendChartProps) {
  // Calculate min/max for scaling
  const values = data?.map((d) => d.value) || [];
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  // Get current value for trend
  const currentValue = values[values.length - 1];
  const previousValue = values[values.length - 2] || values[0];
  const trendPercent =
    previousValue > 0
      ? (((currentValue - previousValue) / previousValue) * 100).toFixed(1)
      : '0';

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
        <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
          <TrendingUp className="h-4 w-4" />
          {trendPercent}%
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex flex-1 items-center justify-center">
        {data && data.length > 0 ? (
          <div className="w-full">
            {/* Mini Bar Chart */}
            <div className="flex h-32 items-end justify-between gap-1">
              {data.map((point, idx) => {
                const height =
                  ((point.value - minValue) / range) * 100 || 10;
                return (
                  <div
                    key={idx}
                    className="flex-1 rounded-t-lg bg-emerald-100 transition hover:bg-emerald-200"
                    style={{ height: `${Math.max(height, 10)}%` }}
                    title={`${point.date}: ${point.value}`}
                  />
                );
              })}
            </div>

            {/* Labels */}
            <div className="mt-3 flex justify-between text-xs text-slate-500">
              <span>{data[0]?.date}</span>
              <span>{data[data.length - 1]?.date}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <TrendingUp className="h-8 w-8" />
            <p className="text-sm font-medium">데이터 없음</p>
          </div>
        )}
      </div>

      {/* Footer Notice */}
      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        차트 시각화 - Phase 3에서 Recharts 추가 예정
      </p>
    </div>
  );
}
