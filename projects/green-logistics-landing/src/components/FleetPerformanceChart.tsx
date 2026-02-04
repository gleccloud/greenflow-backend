/**
 * Fleet Performance Chart Component
 * Shows EI trend and performance metrics for a fleet
 */

import { useMemo } from 'react';
import { TrendingDown, Calendar, Activity } from 'lucide-react';
import { type FleetEIResponse } from '../services/api';

interface FleetPerformanceChartProps {
  fleet: FleetEIResponse;
  onClose?: () => void;
}

export function FleetPerformanceChart({
  fleet,
  onClose,
}: FleetPerformanceChartProps) {
  // Calculate trend direction
  const trendDirection = useMemo(() => {
    if (!fleet.trend || fleet.trend.length < 2) return 'neutral';
    const recent = fleet.trend[fleet.trend.length - 1].ei;
    const previous = fleet.trend[0].ei;
    return recent < previous ? 'improving' : recent > previous ? 'worsening' : 'neutral';
  }, [fleet.trend]);

  // Get max EI for chart scaling
  const maxEI = useMemo(() => {
    if (!fleet.trend) return 200;
    return Math.max(...fleet.trend.map((t) => t.ei), 200);
  }, [fleet.trend]);

  // Normalize EI values for bar chart
  const normalizedTrend = useMemo(() => {
    if (!fleet.trend) return [];
    return fleet.trend.map((t) => ({
      date: new Date(t.date).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
      }),
      ei: t.ei,
      percentage: (t.ei / maxEI) * 100,
      grade: t.grade,
    }));
  }, [fleet.trend, maxEI]);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'GRADE_1':
        return 'bg-emerald-500';
      case 'GRADE_2':
        return 'bg-blue-500';
      case 'GRADE_3':
        return 'bg-amber-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getTrendBadge = () => {
    switch (trendDirection) {
      case 'improving':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
            <TrendingDown className="h-3 w-3" />
            개선 중
          </span>
        );
      case 'worsening':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
            <TrendingDown className="h-3 w-3 rotate-180" />
            악화 중
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            <Activity className="h-3 w-3" />
            안정적
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-6 p-6 bg-white rounded-lg border border-slate-200">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">{fleet.fleetName}</h3>
          <p className="text-sm text-slate-600 mt-1">{fleet.carrierName}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            ✕
          </button>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-xs text-slate-600">현재 EI</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {fleet.eiCurrent}
          </p>
          <p className="text-xs text-slate-600 mt-1">gCO₂e/t·km</p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <p className="text-xs text-emerald-700">등급</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {fleet.eiGrade}
          </p>
          <p className="text-xs text-emerald-700 mt-1">ISO-14083</p>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-xs text-blue-700">30일 평균</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {fleet.ei30DayAverage}
          </p>
          <p className="text-xs text-blue-700 mt-1">gCO₂e/t·km</p>
        </div>
        <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
          <p className="text-xs text-purple-700">신뢰도</p>
          <p className="text-2xl font-bold text-purple-600 mt-2">
            {(fleet.eiConfidence * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-purple-700 mt-1">{fleet.confidence.basis}</p>
        </div>
      </div>

      {/* Trend Status */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
        <div>
          <p className="text-sm font-medium text-slate-700">트렌드 상태</p>
          <p className="text-xs text-slate-600 mt-1">
            {fleet.trend && fleet.trend.length > 0
              ? `${fleet.trend.length}일 데이터 포함`
              : 'No trend data'}
          </p>
        </div>
        {getTrendBadge()}
      </div>

      {/* EI Trend Chart */}
      {normalizedTrend.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-600" />
            <h4 className="font-semibold text-slate-900">EI 추이</h4>
          </div>

          <div className="space-y-2">
            {normalizedTrend.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">
                    {item.date}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      item.grade === 'GRADE_1'
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.grade === 'GRADE_2'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.grade}
                    </span>
                    <span className="text-xs font-semibold text-slate-900">
                      {item.ei}
                    </span>
                  </div>
                </div>
                <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${getGradeColor(item.grade)}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emissions Breakdown */}
      <div className="space-y-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
        <h4 className="font-semibold text-slate-900">배출 구성</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">WTT (생산)</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${(fleet.emissions.wtt / (fleet.emissions.wtt + fleet.emissions.ttw)) * 100}%`,
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-slate-900 w-16 text-right">
                {fleet.emissions.wtt}g
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">TTW (연소)</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500"
                  style={{
                    width: `${(fleet.emissions.ttw / (fleet.emissions.wtt + fleet.emissions.ttw)) * 100}%`,
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-slate-900 w-16 text-right">
                {fleet.emissions.ttw}g
              </span>
            </div>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">합계</span>
            <span className="text-sm font-bold text-emerald-600">
              {fleet.emissions.total}g CO₂e
            </span>
          </div>
        </div>
      </div>

      {/* Data Quality */}
      <div className="space-y-2 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <h4 className="font-semibold text-blue-900 text-sm">데이터 품질</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-blue-700">측정 수</p>
            <p className="font-semibold text-blue-900">{fleet.measurements}</p>
          </div>
          <div>
            <p className="text-blue-700">데이터 소스</p>
            <p className="font-semibold text-blue-900">{fleet.dataSource}</p>
          </div>
          <div>
            <p className="text-blue-700">커버리지</p>
            <p className="font-semibold text-blue-900">
              {fleet.confidence.coverage}
            </p>
          </div>
          <div>
            <p className="text-blue-700">신뢰 점수</p>
            <p className="font-semibold text-blue-900">
              {(fleet.confidence.score * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-xs text-slate-500 text-center">
        마지막 업데이트:{' '}
        {new Date(fleet.lastUpdatedAt).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}

export default FleetPerformanceChart;
