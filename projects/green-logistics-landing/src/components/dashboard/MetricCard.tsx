import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { Metric } from '../../types/dashboard';

interface MetricCardProps extends Metric {}

export function MetricCard({
  label,
  value,
  change,
  trend,
  unit,
}: MetricCardProps) {
  const trendColor = {
    up: 'text-emerald-600',
    down: 'text-emerald-600',
    neutral: 'text-slate-400',
  }[trend];

  const trendIcon = {
    up: <ArrowUp className="h-4 w-4" />,
    down: <ArrowDown className="h-4 w-4" />,
    neutral: <Minus className="h-4 w-4" />,
  }[trend];

  const bgColor =
    trend === 'up'
      ? 'bg-emerald-50'
      : trend === 'down'
        ? 'bg-emerald-50'
        : 'bg-slate-50';

  return (
    <div
      className={`rounded-2xl ${bgColor} border border-slate-200 p-6 shadow-soft transition hover:shadow-md`}
    >
      {/* Label */}
      <p className="text-sm font-medium text-slate-600">{label}</p>

      {/* Value */}
      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-2xl font-extrabold tracking-tight text-slate-900">
          {value}
        </p>
        {unit && <p className="text-xs text-slate-500">{unit}</p>}
      </div>

      {/* Trend Indicator */}
      <div className={`mt-3 flex items-center gap-1 ${trendColor}`}>
        {trendIcon}
        <span className="text-xs font-semibold">
          {change > 0 ? '+' : ''}{change}%
        </span>
      </div>
    </div>
  );
}

/**
 * Metric Card Grid - renders multiple metric cards in a responsive grid
 */
interface MetricGridProps {
  metrics: Metric[];
}

export function MetricGrid({ metrics }: MetricGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, idx) => (
        <MetricCard key={idx} {...metric} />
      ))}
    </div>
  );
}
