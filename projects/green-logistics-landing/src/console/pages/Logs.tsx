/**
 * API Request Logs Page
 */

import { useState } from 'react';
import { Search, Download, Filter, RefreshCw, Play, Pause } from 'lucide-react';
import { useLogs } from '../hooks/useLogs';
import { mockAPILogs } from '../data/mockConsoleData';

export function Logs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Phase 3: Use useLogs hook - falls back to mock data if API unavailable
  const { logs, error, isStreamingEnabled, toggleRealTimeStream, exportLogs, fetchLogs } = useLogs();

  // Fallback to mock data if no logs loaded (API not available)
  const displayLogs = logs.length > 0 ? logs : mockAPILogs;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-emerald-100 text-emerald-700';
      case 'FAILED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusCodeColor = (code: number) => {
    if (code >= 200 && code < 300) return 'text-emerald-600';
    if (code >= 400 && code < 500) return 'text-orange-600';
    if (code >= 500) return 'text-red-600';
    return 'text-slate-600';
  };

  return (
    <div className="space-y-6">
      {/* Error Notice */}
      {error && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm text-orange-800">
            ⚠️ {error} - Using cached data. Please check your connection.
          </p>
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Request Logs</h1>
        <p className="text-slate-600 mt-2">Monitor and analyze your API requests in real-time</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by endpoint, API key, or error message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            <Filter size={18} />
            Filters
          </button>
          <button
            onClick={() => exportLogs()}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            <Download size={18} />
            Export
          </button>
          <button
            onClick={() => fetchLogs(1)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => toggleRealTimeStream(!isStreamingEnabled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
              isStreamingEnabled
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isStreamingEnabled ? <Pause size={18} /> : <Play size={18} />}
            {isStreamingEnabled ? 'Stop' : 'Live'}
          </button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All</option>
                <option value="success">Success (2xx)</option>
                <option value="client_error">Client Error (4xx)</option>
                <option value="server_error">Server Error (5xx)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">API Key</label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option>All Keys</option>
                <option>glec_prod_...</option>
                <option>glec_test_...</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  Timestamp
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  Method
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  Endpoint
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  Status Code
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  Duration
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  Size
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  API Key
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {displayLogs.map((log) => (
                <tr key={log.id} className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded">
                      {log.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-900">{log.endpoint}</td>
                  <td className={`px-6 py-4 text-sm font-semibold ${getStatusCodeColor(log.statusCode)}`}>
                    {log.statusCode}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{log.duration}ms</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {(log.requestSize + log.responseSize).toLocaleString()} B
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded font-mono">
                      {log.apiKeyId}...
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">Showing 1 to {displayLogs.length} of {displayLogs.length} requests</p>
        <div className="flex gap-2">
          <button className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium">
            Previous
          </button>
          <button className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium">
            1
          </button>
          <button className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium">
            2
          </button>
          <button className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
