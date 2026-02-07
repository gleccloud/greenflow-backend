/**
 * useWebhooks Hook
 * Manages webhook CRUD state for the Console Webhooks page
 */

import { useState, useEffect, useCallback } from 'react';
import { webhookService } from '../services/webhookService';
import type {
  Webhook,
  CreateWebhookRequest,
  WebhookDelivery,
} from '../types/webhook';

interface UseWebhooksState {
  webhooks: Webhook[];
  selectedWebhook: Webhook | null;
  deliveries: WebhookDelivery[];
  eventTypes: string[];
  error: string | null;
  isLoading: boolean;
}

export function useWebhooks() {
  const [state, setState] = useState<UseWebhooksState>({
    webhooks: [],
    selectedWebhook: null,
    deliveries: [],
    eventTypes: [],
    error: null,
    isLoading: false,
  });

  const setError = (error: string | null) =>
    setState((s) => ({ ...s, error }));

  const setLoading = (isLoading: boolean) =>
    setState((s) => ({ ...s, isLoading }));

  /**
   * Fetch all webhooks
   */
  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const webhooks = await webhookService.listWebhooks();
      setState((s) => ({ ...s, webhooks, isLoading: false }));
    } catch (err: any) {
      setError(err.message || 'Failed to load webhooks');
      setLoading(false);
    }
  }, []);

  /**
   * Create webhook
   */
  const createWebhook = useCallback(
    async (request: CreateWebhookRequest): Promise<string | null> => {
      setError(null);
      try {
        const result = await webhookService.createWebhook(request);
        setState((s) => ({
          ...s,
          webhooks: [result.webhook, ...s.webhooks],
        }));
        return result.secret;
      } catch (err: any) {
        setError(err.message || 'Failed to create webhook');
        return null;
      }
    },
    [],
  );

  /**
   * Update webhook
   */
  const updateWebhook = useCallback(
    async (id: string, updates: Partial<CreateWebhookRequest>) => {
      setError(null);
      try {
        const updated = await webhookService.updateWebhook(id, updates);
        setState((s) => ({
          ...s,
          webhooks: s.webhooks.map((w) => (w.id === id ? updated : w)),
          selectedWebhook:
            s.selectedWebhook?.id === id ? updated : s.selectedWebhook,
        }));
      } catch (err: any) {
        setError(err.message || 'Failed to update webhook');
      }
    },
    [],
  );

  /**
   * Delete webhook
   */
  const deleteWebhook = useCallback(async (id: string) => {
    setError(null);
    try {
      await webhookService.deleteWebhook(id);
      setState((s) => ({
        ...s,
        webhooks: s.webhooks.filter((w) => w.id !== id),
        selectedWebhook:
          s.selectedWebhook?.id === id ? null : s.selectedWebhook,
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to delete webhook');
    }
  }, []);

  /**
   * Rotate webhook secret
   */
  const rotateSecret = useCallback(async (id: string): Promise<string | null> => {
    setError(null);
    try {
      const secret = await webhookService.rotateSecret(id);
      return secret;
    } catch (err: any) {
      setError(err.message || 'Failed to rotate secret');
      return null;
    }
  }, []);

  /**
   * Fetch delivery history for a webhook
   */
  const fetchDeliveries = useCallback(
    async (webhookId: string, page: number = 1) => {
      setError(null);
      try {
        const result = await webhookService.getDeliveries(webhookId, page);
        setState((s) => ({ ...s, deliveries: result.deliveries }));
      } catch (err: any) {
        setError(err.message || 'Failed to load deliveries');
      }
    },
    [],
  );

  /**
   * Select a webhook for detail view
   */
  const selectWebhook = useCallback((webhook: Webhook | null) => {
    setState((s) => ({ ...s, selectedWebhook: webhook, deliveries: [] }));
  }, []);

  /**
   * Fetch event types
   */
  const fetchEventTypes = useCallback(async () => {
    try {
      const types = await webhookService.getEventTypes();
      setState((s) => ({ ...s, eventTypes: types }));
    } catch {
      // Non-critical — use defaults
    }
  }, []);

  // Load webhooks and event types on mount
  useEffect(() => {
    fetchWebhooks();
    fetchEventTypes();
  }, [fetchWebhooks, fetchEventTypes]);

  return {
    ...state,
    fetchWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    rotateSecret,
    fetchDeliveries,
    selectWebhook,
  };
}
