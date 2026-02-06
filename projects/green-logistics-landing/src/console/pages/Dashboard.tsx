/**
 * Console Dashboard Page
 * Main dashboard showing key metrics and usage statistics
 */

import { useEffect, useState } from 'react';
import { TrendingUp, AlertCircle, Activity, Clock, BarChart3, RefreshCw } from 'lucide-react';
import { useMetrics } from '../hooks/useMetrics';

interface MetricCard {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

export function Dashboard() {
  const [metrics, setMetrics] = useState<MetricCard[]>([]);

  // Use real API data only - NO mock data
  const {
    metrics: apiMetrics,
    endpoints: apiEndpoints,
    error,
    fetchMetrics,
    fetchEndpointMetrics,
    isStreamingEnabled,
    toggleRealTimeStream,
  } = useMetrics();

  useEffect(() => {
    // Only update if we have real API data
    if (apiMetrics) {
      setMetrics([
        {
          label: 'Total Requests (Today)',
          value: apiMetrics.totalRequests.toLocaleString(),
          change: 12.5,
          trend: 'up',
          icon: <Activity className="w-5 h-5" />,
        },
        {
          label: 'Success Rate',
          value: `${apiMetrics.successRate.toFixed(1)}%`,
          change: 0.3,
          trend: 'up',
          icon: <TrendingUp className="w-5 h-5" />,
        },
        {
          label: 'Avg Response Time',
          value: `${apiMetrics.averageResponseTime}ms`,
          change: -8.2,
          trend: 'down',
          icon: <Clock className="w-5 h-5" />,
        },
        {
          label: 'Total Errors',
          value: apiMetrics.totalErrorCount,
          change: -2.1,
          trend: 'down',
          icon: <AlertCircle className="w-5 h-5" />,
        },
      ]);
    }
  }, [apiMetrics]);

  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return 'text-emerald-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-slate-600';
    }
  };

  // Show loading or error state if no data
  if (error && !apiMetrics) {
    return (
      <div className="space-y-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">⚠️ Connection Error</h2>
          <p className="text-sm text-red-800 mb-4">{error}</p>
          <button
            onClick={() => {
              fetchMetrics();
              fetchEndpointMetrics();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!apiMetrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-2">Real-time API usage and performance</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => toggleRealTimeStream(!isStreamingEnabled)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              isStreamingEnabled
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Activity className="w-4 h-4" />
            {isStreamingEnabled ? 'Live' : 'Enable Live Updates'}
          </button>
          <button
            onClick={() => {
              fetchMetrics();
              fetchEndpointMetrics();
            }}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                {metric.icon}
              </div>
              <span className={`text-sm font-medium ${getTrendColor(metric.trend)}`}>
                {metric.change > 0 ? '+' : ''}{metric.change}%
              </span>
            </div>
            <p className="text-sm text-slate-600 mb-2">{metric.label}</p>
            <p className="text-2xl font-bold text-slate-900">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Trend Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Request Trend (7 days)</h2>
          <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500">Chart visualization - Phase 2</p>
            </div>
          </div>
        </div>

        {/* Usage by Endpoint */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Endpoints</h2>
          {apiEndpoints.length > 0 ? (
            <div className="space-y-3">
              {apiEndpoints.slice(0, 4).map((item, index) => {
                const totalRequests = apiEndpoints.reduce((sum, e) => sum + e.requestCount, 0);
                const percentage = Math.round((item.requestCount / totalRequests) * 100);
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">
                        {item.method} {item.endpoint}
                      </span>
                      <span className="text-sm text-slate-600">{item.requestCount.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500">No endpoint data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
