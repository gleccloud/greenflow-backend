/**
 * API Request Logs Page
 */

import { useState } from 'react';
import { Search, Download, Filter, RefreshCw, Play, Pause, FileText, X } from 'lucide-react';
import { useLogs } from '../hooks/useLogs';
import { useAPIKeys } from '../hooks/useAPIKeys';
import type { APILog } from '../types';

export function Logs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [apiKeyFilter, setApiKeyFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<APILog | null>(null);

  const {
    logs,
    total,
    page,
    pageSize,
    error,
    isStreamingEnabled,
    toggleRealTimeStream,
    exportLogs,
    fetchLogs,
    searchLogs,
    updateFilter,
    setPage,
  } = useLogs();

  const { keys: apiKeys } = useAPIKeys();

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

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchLogs(searchQuery);
    } else {
      fetchLogs(1);
    }
  };

  const applyFilters = (newStatus: string, newApiKey: string, from: string, to: string) => {
    const filter: Record<string, string> = {};
    if (newStatus !== 'all') filter.status = newStatus;
    if (newApiKey !== 'all') filter.apiKeyId = newApiKey;
    if (from) filter.startDate = new Date(from).toISOString();
    if (to) filter.endDate = new Date(to + 'T23:59:59').toISOString();
    updateFilter(filter);
    fetchLogs(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Error Notice */}
      {error && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm text-orange-800">
            {error}
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
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  applyFilters(e.target.value, apiKeyFilter, dateFrom, dateTo);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All</option>
                <option value="success">Success (2xx)</option>
                <option value="client_error">Client Error (4xx)</option>
                <option value="server_error">Server Error (5xx)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  applyFilters(statusFilter, apiKeyFilter, e.target.value, dateTo);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  applyFilters(statusFilter, apiKeyFilter, dateFrom, e.target.value);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">API Key</label>
              <select
                value={apiKeyFilter}
                onChange={(e) => {
                  setApiKeyFilter(e.target.value);
                  applyFilters(statusFilter, e.target.value, dateFrom, dateTo);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Keys</option>
                {apiKeys.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.name} ({key.keyPrefix}...)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {logs.length === 0 && !error && (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Logs Yet</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            API request logs will appear here once you start making API calls.
          </p>
        </div>
      )}

      {/* Logs Table */}
      {logs.length > 0 && (
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
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`border-b border-slate-200 hover:bg-slate-50 cursor-pointer ${
                      selectedLog?.id === log.id ? 'bg-emerald-50' : ''
                    }`}
                  >
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
                        {log.apiKeyId ? `${log.apiKeyId.slice(0, 8)}...` : '\u2014'}
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
      )}

      {/* Log Detail Panel */}
      {selectedLog && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Request Detail</h3>
            <button
              onClick={() => setSelectedLog(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium">Method</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{selectedLog.method}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium">Status Code</p>
                <p className={`text-sm font-semibold mt-0.5 ${getStatusCodeColor(selectedLog.statusCode)}`}>
                  {selectedLog.statusCode}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium">Duration</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{selectedLog.duration}ms</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium">Status</p>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedLog.status)}`}>
                  {selectedLog.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium">Endpoint</p>
                <code className="block text-sm text-slate-900 bg-slate-50 px-3 py-2 rounded mt-1 font-mono break-all">
                  {selectedLog.endpoint}
                </code>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium">Timestamp</p>
                <p className="text-sm text-slate-900 mt-1">
                  {new Date(selectedLog.timestamp).toLocaleString(undefined, {
                    dateStyle: 'full',
                    timeStyle: 'medium',
                  })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium">Request Size</p>
                <p className="text-sm text-slate-900 mt-0.5">{selectedLog.requestSize.toLocaleString()} B</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium">Response Size</p>
                <p className="text-sm text-slate-900 mt-0.5">{selectedLog.responseSize.toLocaleString()} B</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium">API Key</p>
                <code className="text-sm text-slate-600 bg-slate-50 px-2 py-0.5 rounded font-mono mt-0.5 inline-block">
                  {selectedLog.apiKeyId || '\u2014'}
                </code>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium">IP Address</p>
                <p className="text-sm text-slate-900 mt-0.5">{selectedLog.ipAddress || '\u2014'}</p>
              </div>
            </div>

            {selectedLog.userAgent && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 uppercase font-medium">User Agent</p>
                <p className="text-sm text-slate-700 mt-1 break-all">{selectedLog.userAgent}</p>
              </div>
            )}

            {selectedLog.errorMessage && (
              <div className="mb-4">
                <p className="text-xs text-red-500 uppercase font-medium">Error Message</p>
                <code className="block text-sm text-red-800 bg-red-50 px-3 py-2 rounded mt-1 font-mono break-all">
                  {selectedLog.errorMessage}
                </code>
              </div>
            )}

            {selectedLog.errorStackTrace && (
              <div>
                <p className="text-xs text-red-500 uppercase font-medium">Stack Trace</p>
                <pre className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded mt-1 overflow-x-auto max-h-40">
                  {selectedLog.errorStackTrace}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} requests
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setPage(page - 1);
                fetchLogs(page - 1);
              }}
              disabled={page <= 1}
              className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm text-slate-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => {
                setPage(page + 1);
                fetchLogs(page + 1);
              }}
              disabled={page >= totalPages}
              className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
