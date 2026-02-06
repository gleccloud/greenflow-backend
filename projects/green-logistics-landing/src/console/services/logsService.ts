/**
 * Logs Service
 * Handles API request logs, filtering, and real-time streaming
 */

import { apiClient } from './apiClient';
import type { APILog, LogFilter, LogsResponse, LogStats } from '../types';

export const logsService = {
  /**
   * Get API request logs with filtering
   */
  async getLogs(filter: Partial<LogFilter> & { page?: number; pageSize?: number }) {
    const params: Record<string, string | number | boolean> = {
      page: filter.page || 1,
      pageSize: filter.pageSize || 50,
    };

    if (filter.startDate) params.startDate = filter.startDate;
    if (filter.endDate) params.endDate = filter.endDate;
    if (filter.status) params.status = filter.status;
    if (filter.statusCode) params.statusCode = filter.statusCode;
    if (filter.endpoint) params.endpoint = filter.endpoint;
    if (filter.apiKeyId) params.apiKeyId = filter.apiKeyId;
    if (filter.minDuration) params.minDuration = filter.minDuration;
    if (filter.maxDuration) params.maxDuration = filter.maxDuration;
    if (filter.searchTerm) params.search = filter.searchTerm;

    const response = await apiClient.get<LogsResponse>('/console/logs', params);
    return response.data;
  },

  /**
   * Get a specific log entry by ID
   */
  async getLog(id: string) {
    const response = await apiClient.get<APILog>(`/console/logs/${id}`);
    return response.data;
  },

  /**
   * Get log statistics for a time period
   */
  async getLogStats(startDate: string, endDate: string) {
    const response = await apiClient.get<LogStats>('/console/logs/stats', {
      startDate,
      endDate,
    });
    return response.data;
  },

  /**
   * Export logs as CSV
   */
  async exportLogs(filter: Partial<LogFilter>) {
    const params: Record<string, string | number | boolean> = {
      format: 'csv',
    };

    if (filter.startDate) params.startDate = filter.startDate;
    if (filter.endDate) params.endDate = filter.endDate;
    if (filter.status) params.status = filter.status;
    if (filter.statusCode) params.statusCode = filter.statusCode;

    const url = new URL(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v2'}/console/logs/export`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });

    return response.blob();
  },

  /**
   * Subscribe to real-time logs via Server-Sent Events
   */
  subscribeToLogs(onLog: (log: APILog) => void, onError?: (error: Error) => void) {
    const token = localStorage.getItem('auth_token');
    const eventSource = new EventSource(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v2'}/console/logs/stream?token=${token}`
    );

    eventSource.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data);
        onLog(log);
      } catch (error) {
        console.error('Failed to parse log event:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      if (onError) {
        onError(new Error('Log stream disconnected'));
      }
    };

    // Return unsubscribe function
    return () => {
      eventSource.close();
    };
  },

  /**
   * Search logs by text query
   */
  async searchLogs(query: string, page = 1, pageSize = 50) {
    const response = await apiClient.get<LogsResponse>('/console/logs/search', {
      q: query,
      page,
      pageSize,
    });
    return response.data;
  },

  /**
   * Get logs for a specific endpoint
   */
  async getEndpointLogs(endpoint: string, page = 1, pageSize = 50) {
    const response = await apiClient.get<LogsResponse>('/console/logs', {
      endpoint,
      page,
      pageSize,
    });
    return response.data;
  },
};
