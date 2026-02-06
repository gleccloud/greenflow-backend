/**
 * useMetrics Hook
 * Manages metrics state and operations
 */

import { useState, useCallback, useEffect } from 'react';
import { metricsService } from '../services/metricsService';
import { useConsole } from '../context/ConsoleContext';
import type { MetricsSummary, EndpointMetrics, QuotaInfo, BillingMetrics } from '../types';

export function useMetrics() {
  const { showNotification, setIsLoading } = useConsole();
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [endpoints, setEndpoints] = useState<EndpointMetrics[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [billing, setBilling] = useState<BillingMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreamingEnabled, setIsStreamingEnabled] = useState(false);
  const [period, setPeriod] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');

  // Fetch metrics summary
  const fetchMetrics = useCallback(
    async (selectedPeriod: 'DAY' | 'WEEK' | 'MONTH' = 'DAY') => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await metricsService.getMetricsSummary(selectedPeriod);
        setMetrics(result);
        setPeriod(selectedPeriod);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch metrics';
        setError(message);
        showNotification('error', message);
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading, showNotification]
  );

  // Fetch endpoint metrics
  const fetchEndpointMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await metricsService.getEndpointMetrics();
      setEndpoints(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch endpoint metrics';
      setError(message);
      showNotification('error', message);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, showNotification]);

  // Fetch quota info
  const fetchQuota = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await metricsService.getQuotaInfo();
      setQuota(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch quota info';
      setError(message);
      showNotification('error', message);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, showNotification]);

  // Fetch billing metrics
  const fetchBilling = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await metricsService.getBillingMetrics();
      setBilling(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch billing metrics';
      setError(message);
      showNotification('error', message);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, showNotification]);

  // Subscribe to real-time metrics
  const toggleRealTimeStream = useCallback((enable: boolean) => {
    if (enable) {
      try {
        const unsubscribe = metricsService.subscribeToMetrics(
          (updatedMetrics) => {
            setMetrics(updatedMetrics);
          },
          (error) => {
            console.error('Metrics stream error:', error);
            setIsStreamingEnabled(false);
          }
        );
        setIsStreamingEnabled(true);
        return unsubscribe;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to subscribe to metrics';
        showNotification('error', message);
      }
    } else {
      setIsStreamingEnabled(false);
    }
  }, [showNotification]);

  // Initial fetch
  useEffect(() => {
    fetchMetrics('DAY');
    fetchEndpointMetrics();
    fetchQuota();
  }, []);

  return {
    metrics,
    endpoints,
    quota,
    billing,
    error,
    period,
    isStreamingEnabled,
    fetchMetrics,
    fetchEndpointMetrics,
    fetchQuota,
    fetchBilling,
    toggleRealTimeStream,
  };
}
