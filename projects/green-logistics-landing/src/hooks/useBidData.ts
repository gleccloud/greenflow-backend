/**
 * useBidData Hook
 * Manages bid data fetching with fallback to mock data
 * Supports both sync and async evaluation
 */

import { useState, useEffect, useCallback } from 'react';
import { bidAPI, realtimeAPI } from '../services/api';
import { shipperDashboardData } from '../data/mockDashboard';

export interface UseBidDataOptions {
  bidId?: string;
  useMockData?: boolean;
  autoSubscribe?: boolean;
}

export interface UseBidDataState {
  bids: any[];
  loading: boolean;
  error: Error | null;
  evaluating: boolean;
  evaluationId: string | null;
  refresh: () => Promise<void>;
  evaluateBid: (bidId: string) => Promise<void>;
  subscribeToUpdates: (bidId: string) => void;
  unsubscribe: () => void;
}

export function useBidData(options: UseBidDataOptions = {}): UseBidDataState {
  const {
    bidId,
    useMockData = import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
    autoSubscribe = true,
  } = options;

  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // Fetch bid data
  const fetchBidData = useCallback(async () => {
    if (useMockData) {
      // Use mock data
      setBids(shipperDashboardData.bids);
      setLoading(false);
      return;
    }

    if (!bidId) {
      // No bid ID provided, use mock data as fallback
      setBids(shipperDashboardData.bids);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await bidAPI.getEvaluation(bidId);
      // Convert result to bid format
      setBids([
        {
          id: result.bidId,
          status: 'EVALUATED',
          evaluationId: result.evaluationId,
          evaluatedAt: result.evaluatedAt,
          ranked: result.ranked,
          statistics: result.statistics,
        },
      ]);
    } catch (err) {
      console.error('Failed to fetch bid data, falling back to mock data:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      // Fallback to mock data
      setBids(shipperDashboardData.bids);
    } finally {
      setLoading(false);
    }
  }, [bidId, useMockData]);

  // Evaluate bid asynchronously
  const evaluateBid = useCallback(
    async (targetBidId: string) => {
      if (useMockData) {
        console.log('Mock evaluation for bid:', targetBidId);
        setEvaluationId('mock-evaluation-id');
        return;
      }

      try {
        setEvaluating(true);
        setError(null);

        // Submit async evaluation
        const result = await bidAPI.submitAsyncEvaluation(targetBidId, {
          alpha: 0.4,
          beta: 0.3,
          gamma: 0.3,
        });

        setEvaluationId(result.evaluationId);

        // Optionally subscribe to updates
        if (autoSubscribe) {
          const source = realtimeAPI.subscribeToEvaluationStatus(
            result.evaluationId
          );
          setEventSource(source);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Evaluation failed');
        setError(error);
        console.error('Bid evaluation error:', error);
      } finally {
        setEvaluating(false);
      }
    },
    [useMockData, autoSubscribe]
  );

  // Subscribe to real-time updates
  const subscribeToUpdates = useCallback((targetBidId: string) => {
    if (useMockData) {
      console.log('Mock subscription for bid:', targetBidId);
      return;
    }

    try {
      const source = realtimeAPI.subscribeToBidUpdates(targetBidId);

      source.addEventListener('bid-update', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Bid update received:', data);
          // Update bid status if needed
        } catch (err) {
          console.error('Failed to parse bid update:', err);
        }
      });

      source.addEventListener('error', () => {
        console.warn('SSE connection failed, falling back to polling');
        source.close();
        // Could implement polling fallback here
      });

      setEventSource(source);
    } catch (err) {
      console.error('Failed to subscribe to updates:', err);
    }
  }, [useMockData]);

  // Unsubscribe from real-time updates
  const unsubscribe = useCallback(() => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
  }, [eventSource]);

  // Refresh data
  const refresh = useCallback(async () => {
    await fetchBidData();
  }, [fetchBidData]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchBidData();
  }, [fetchBidData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    bids,
    loading,
    error,
    evaluating,
    evaluationId,
    refresh,
    evaluateBid,
    subscribeToUpdates,
    unsubscribe,
  };
}

export default useBidData;
