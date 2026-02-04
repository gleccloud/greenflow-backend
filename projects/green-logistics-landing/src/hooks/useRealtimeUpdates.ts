/**
 * useRealtimeUpdates Hook
 * Manages Server-Sent Events (SSE) subscriptions with auto-reconnection,
 * fallback polling, and connection health monitoring
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { realtimeAPI, type EvaluationStatusResponse } from '../services/api';

// ============================================================================
// TYPES
// ============================================================================

export interface UseSSEOptions {
  onMessage?: (data: unknown) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  fallbackToPoll?: boolean;
  pollInterval?: number;
}

export interface RealtimeConnection {
  isConnected: boolean;
  isSSE: boolean; // true if using SSE, false if using polling fallback
  error: Error | null;
  reconnectAttempts: number;
  lastMessageAt: Date | null;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to subscribe to bid updates via SSE with auto-reconnection
 */
export function useBidUpdates(
  bidId: string,
  options: UseSSEOptions = {}
): RealtimeConnection {
  const [connection, setConnection] = useState<RealtimeConnection>({
    isConnected: false,
    isSSE: true,
    error: null,
    reconnectAttempts: 0,
    lastMessageAt: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const reconnectDelay = options.reconnectDelay || 3000;
  const reconnectAttempts = options.reconnectAttempts ?? 5;
  const fallbackToPoll = options.fallbackToPoll ?? true;
  const pollInterval = options.pollInterval || 5000;

  const attemptReconnect = useCallback(
    (attempt: number) => {
      if (attempt >= reconnectAttempts) {
        if (fallbackToPoll) {
          // Fallback to polling
          setConnection((prev) => ({
            ...prev,
            isSSE: false,
          }));
        } else {
          setConnection((prev) => ({
            ...prev,
            isConnected: false,
            error: new Error('Max reconnection attempts reached'),
          }));
        }
        return;
      }

      const delay = reconnectDelay * Math.pow(2, attempt); // Exponential backoff
      reconnectTimeoutRef.current = setTimeout(() => {
        subscribe();
      }, delay);
    },
    [reconnectDelay, reconnectAttempts, fallbackToPoll]
  );

  const subscribe = useCallback(() => {
    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = realtimeAPI.subscribeToBidUpdates(bidId);

      es.onopen = () => {
        setConnection((prev) => ({
          ...prev,
          isConnected: true,
          isSSE: true,
          error: null,
          reconnectAttempts: 0,
        }));
        options.onOpen?.();
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setConnection((prev) => ({
            ...prev,
            lastMessageAt: new Date(),
          }));
          options.onMessage?.(data);
        } catch (err) {
          console.error('Failed to parse SSE message:', err);
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;

        setConnection((prev) => ({
          ...prev,
          isConnected: false,
          reconnectAttempts: prev.reconnectAttempts + 1,
        }));

        attemptReconnect(connection.reconnectAttempts);
        options.onError?.(new Error('SSE connection error'));
      };

      eventSourceRef.current = es;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setConnection((prev) => ({
        ...prev,
        isConnected: false,
        error,
      }));
      options.onError?.(error);
    }
  }, [bidId, options, connection.reconnectAttempts, attemptReconnect]);

  // Polling fallback
  useEffect(() => {
    if (!connection.isSSE && fallbackToPoll) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const status = await realtimeAPI.pollBidStatus(bidId);
          setConnection((prev) => ({
            ...prev,
            isConnected: true,
            lastMessageAt: new Date(),
          }));
          options.onMessage?.(status);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          setConnection((prev) => ({
            ...prev,
            error,
          }));
          options.onError?.(error);
        }
      }, pollInterval);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [connection.isSSE, bidId, fallbackToPoll, pollInterval, options]);

  // Initial subscription
  useEffect(() => {
    subscribe();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [subscribe]);

  return connection;
}

/**
 * Hook to subscribe to proposal ranking updates via SSE
 */
export function useRankingUpdates(
  bidId: string,
  options: UseSSEOptions = {}
): RealtimeConnection {
  const [connection, setConnection] = useState<RealtimeConnection>({
    isConnected: false,
    isSSE: true,
    error: null,
    reconnectAttempts: 0,
    lastMessageAt: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const reconnectDelay = options.reconnectDelay || 3000;
  const reconnectAttempts = options.reconnectAttempts ?? 5;

  const attemptReconnect = useCallback(
    (attempt: number) => {
      if (attempt >= reconnectAttempts) {
        setConnection((prev) => ({
          ...prev,
          isConnected: false,
          error: new Error('Max reconnection attempts reached'),
        }));
        return;
      }

      const delay = reconnectDelay * Math.pow(2, attempt);
      reconnectTimeoutRef.current = setTimeout(() => {
        subscribe();
      }, delay);
    },
    [reconnectDelay, reconnectAttempts]
  );

  const subscribe = useCallback(() => {
    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = realtimeAPI.subscribeToRankingUpdates(bidId);

      es.onopen = () => {
        setConnection((prev) => ({
          ...prev,
          isConnected: true,
          error: null,
          reconnectAttempts: 0,
        }));
        options.onOpen?.();
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setConnection((prev) => ({
            ...prev,
            lastMessageAt: new Date(),
          }));
          options.onMessage?.(data);
        } catch (err) {
          console.error('Failed to parse ranking update:', err);
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;

        setConnection((prev) => ({
          ...prev,
          isConnected: false,
          reconnectAttempts: prev.reconnectAttempts + 1,
        }));

        attemptReconnect(connection.reconnectAttempts);
        options.onError?.(new Error('Ranking SSE connection error'));
      };

      eventSourceRef.current = es;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setConnection((prev) => ({
        ...prev,
        isConnected: false,
        error,
      }));
      options.onError?.(error);
    }
  }, [bidId, options, connection.reconnectAttempts, attemptReconnect]);

  useEffect(() => {
    subscribe();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [subscribe]);

  return connection;
}

/**
 * Hook to subscribe to evaluation status updates via SSE
 */
export function useEvaluationStatus(
  evaluationId: string,
  options: UseSSEOptions = {}
): RealtimeConnection {
  const [connection, setConnection] = useState<RealtimeConnection>({
    isConnected: false,
    isSSE: true,
    error: null,
    reconnectAttempts: 0,
    lastMessageAt: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const reconnectDelay = options.reconnectDelay || 3000;
  const reconnectAttempts = options.reconnectAttempts ?? 5;

  const attemptReconnect = useCallback(
    (attempt: number) => {
      if (attempt >= reconnectAttempts) {
        setConnection((prev) => ({
          ...prev,
          isConnected: false,
          error: new Error('Max reconnection attempts reached'),
        }));
        return;
      }

      const delay = reconnectDelay * Math.pow(2, attempt);
      reconnectTimeoutRef.current = setTimeout(() => {
        subscribe();
      }, delay);
    },
    [reconnectDelay, reconnectAttempts]
  );

  const subscribe = useCallback(() => {
    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = realtimeAPI.subscribeToEvaluationStatus(evaluationId);

      es.onopen = () => {
        setConnection((prev) => ({
          ...prev,
          isConnected: true,
          error: null,
          reconnectAttempts: 0,
        }));
        options.onOpen?.();
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as EvaluationStatusResponse;
          setConnection((prev) => ({
            ...prev,
            lastMessageAt: new Date(),
          }));
          options.onMessage?.(data);
        } catch (err) {
          console.error('Failed to parse evaluation status:', err);
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;

        setConnection((prev) => ({
          ...prev,
          isConnected: false,
          reconnectAttempts: prev.reconnectAttempts + 1,
        }));

        attemptReconnect(connection.reconnectAttempts);
        options.onError?.(new Error('Evaluation status SSE connection error'));
      };

      eventSourceRef.current = es;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setConnection((prev) => ({
        ...prev,
        isConnected: false,
        error,
      }));
      options.onError?.(error);
    }
  }, [evaluationId, options, connection.reconnectAttempts, attemptReconnect]);

  useEffect(() => {
    subscribe();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [subscribe]);

  return connection;
}

export default {
  useBidUpdates,
  useRankingUpdates,
  useEvaluationStatus,
};
