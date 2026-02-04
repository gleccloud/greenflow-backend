/**
 * Analytics Insights Component
 * Shows key insights and trends with visualizations
 */

import { TrendingUp, AlertCircle, Zap, Target } from 'lucide-react';

export interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'opportunity';
  title: string;
  description: string;
  metric?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface AnalyticsInsightsProps {
  insights: Insight[];
  loading?: boolean;
}

const typeConfig = {
  success: {
    icon: Zap,
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    iconColor: 'text-emerald-600',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    iconColor: 'text-red-600',
  },
  info: {
    icon: Target,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-600',
  },
  opportunity: {
    icon: TrendingUp,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    iconColor: 'text-purple-600',
  },
};

export function AnalyticsInsights({
  insights,
  loading = false,
}: AnalyticsInsightsProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-lg bg-slate-100 border border-slate-200 animate-pulse h-24"
          />
        ))}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="p-8 rounded-lg border border-slate-200 bg-slate-50 text-center">
        <Target className="h-8 w-8 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-600 font-medium">분석 데이터가 없습니다</p>
        <p className="text-sm text-slate-500 mt-1">
          더 많은 데이터가 수집되면 인사이트가 표시됩니다
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight) => {
        const config = typeConfig[insight.type];
        const Icon = config.icon;

        return (
          <div
            key={insight.id}
            className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}
          >
            <div className="flex gap-3">
              <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
              <div className="flex-1 min-w-0">
                <h4 className={`font-semibold ${config.textColor}`}>
                  {insight.title}
                </h4>
                <p className={`text-sm ${config.textColor} opacity-90 mt-1`}>
                  {insight.description}
                </p>
                {insight.metric && (
                  <div className={`text-xs font-semibold ${config.textColor} opacity-75 mt-2`}>
                    {insight.metric}
                  </div>
                )}
                {insight.action && (
                  <button
                    onClick={insight.action.onClick}
                    className={`mt-3 px-3 py-1 rounded text-xs font-semibold transition ${
                      insight.type === 'success'
                        ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                        : insight.type === 'warning'
                          ? 'bg-red-100 hover:bg-red-200 text-red-700'
                          : insight.type === 'info'
                            ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                            : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                    }`}
                  >
                    {insight.action.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AnalyticsInsights;
