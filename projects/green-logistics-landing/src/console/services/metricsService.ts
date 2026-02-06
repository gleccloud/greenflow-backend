/**
 * Metrics Service
 * Handles API metrics, usage statistics, and performance data
 */

import { apiClient } from './apiClient';
import type { MetricsSummary, EndpointMetrics, QuotaInfo, BillingMetrics } from '../types';

export const metricsService = {
  /**
   * Get metrics summary for a time period
   */
  async getMetricsSummary(period: 'DAY' | 'WEEK' | 'MONTH' = 'DAY') {
    const response = await apiClient.get<MetricsSummary>('/console/metrics/summary', {
      period,
    });
    return response.data;
  },

  /**
   * Get endpoint metrics and performance data
   */
  async getEndpointMetrics() {
    const response = await apiClient.get<EndpointMetrics[]>('/console/metrics/endpoints');
    return response.data;
  },

  /**
   * Get API quota information
   */
  async getQuotaInfo() {
    const response = await apiClient.get<QuotaInfo>('/console/metrics/quota');
    return response.data;
  },

  /**
   * Get billing metrics
   */
  async getBillingMetrics() {
    const response = await apiClient.get<BillingMetrics>('/console/metrics/billing');
    return response.data;
  },

  /**
   * Subscribe to real-time metrics via Server-Sent Events
   */
  subscribeToMetrics(onMetrics: (metrics: MetricsSummary) => void, onError?: (error: Error) => void) {
    const token = localStorage.getItem('auth_token');
    const eventSource = new EventSource(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v2'}/console/metrics/stream?token=${token}`
    );

    eventSource.onmessage = (event) => {
      try {
        const metrics = JSON.parse(event.data);
        onMetrics(metrics);
      } catch (error) {
        console.error('Failed to parse metrics event:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      if (onError) {
        onError(new Error('Metrics stream disconnected'));
      }
    };

    // Return unsubscribe function
    return () => {
      eventSource.close();
    };
  },
};
