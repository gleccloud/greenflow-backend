/**
 * useLogs Hook
 * Manages API logs state and operations
 */

import { useState, useCallback, useEffect } from 'react';
import { logsService } from '../services/logsService';
import { useConsole } from '../context/ConsoleContext';
import type { APILog, LogFilter } from '../types';

export function useLogs() {
  const { showNotification, setIsLoading } = useConsole();
  const [logs, setLogs] = useState<APILog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filter, setFilter] = useState<Partial<LogFilter>>({});
  const [error, setError] = useState<string | null>(null);
  const [isStreamingEnabled, setIsStreamingEnabled] = useState(false);

  // Fetch logs
  const fetchLogs = useCallback(async (pageNum = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await logsService.getLogs({
        ...filter,
        page: pageNum,
        pageSize,
      });
      setLogs(result.logs);
      setTotal(result.total);
      setPage(result.page);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch logs';
      setError(message);
      showNotification('error', message);
    } finally {
      setIsLoading(false);
    }
  }, [filter, pageSize, setIsLoading, showNotification]);

  // Update filter
  const updateFilter = useCallback((newFilter: Partial<LogFilter>) => {
    setFilter(newFilter);
    setPage(1); // Reset to first page when filter changes
  }, []);

  // Search logs
  const searchLogs = useCallback(async (query: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await logsService.searchLogs(query, 1, pageSize);
      setLogs(result.logs);
      setTotal(result.total);
      setPage(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search logs';
      setError(message);
      showNotification('error', message);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, setIsLoading, showNotification]);

  // Export logs
  const exportLogs = useCallback(async () => {
    try {
      const blob = await logsService.exportLogs(filter);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showNotification('success', 'Logs exported successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export logs';
      setError(message);
      showNotification('error', message);
    }
  }, [filter, showNotification]);

  // Subscribe to real-time logs
  const toggleRealTimeStream = useCallback((enable: boolean) => {
    if (enable) {
      try {
        const unsubscribe = logsService.subscribeToLogs(
          (log) => {
            setLogs((prevLogs) => [log, ...prevLogs].slice(0, pageSize));
          },
          (error) => {
            console.error('Log stream error:', error);
            setIsStreamingEnabled(false);
          }
        );
        setIsStreamingEnabled(true);
        return unsubscribe;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to subscribe to logs';
        showNotification('error', message);
      }
    } else {
      setIsStreamingEnabled(false);
    }
  }, [pageSize, showNotification]);

  // Initial fetch
  useEffect(() => {
    fetchLogs(1);
  }, []);

  // Auto-refresh logs every 30 seconds if streaming is disabled
  useEffect(() => {
    if (!isStreamingEnabled) {
      const interval = setInterval(() => {
        fetchLogs(page);
      }, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [isStreamingEnabled, page, fetchLogs]);

  return {
    logs,
    total,
    page,
    pageSize,
    filter,
    error,
    isStreamingEnabled,
    fetchLogs,
    updateFilter,
    searchLogs,
    exportLogs,
    toggleRealTimeStream,
    setPageSize,
    setPage,
  };
}
