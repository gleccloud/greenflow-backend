/**
 * Webhook Service
 * Connects to backend webhook endpoints (/webhooks)
 * Transforms backend response shapes to frontend Webhook types
 */

import { apiClient } from './apiClient';
import type {
  Webhook,
  CreateWebhookRequest,
  WebhookDelivery,
} from '../types/webhook';

/**
 * Transform backend webhook response to frontend Webhook shape
 */
function toFrontendWebhook(backend: any): Webhook {
  return {
    id: backend.id,
    name: backend.label || 'Unnamed Webhook',
    url: backend.url,
    events: backend.events || [],
    status: backend.isActive ? 'ACTIVE' : 'INACTIVE',
    createdAt: backend.createdAt,
    updatedAt: backend.updatedAt,
    lastTriggeredAt: backend.lastSuccessAt || undefined,
    version: 1,
    secret: '', // Only returned on creation
    retryPolicy: {
      maxRetries: backend.maxRetries || 5,
      initialDelaySeconds: 30,
      maxDelaySeconds: 7200,
      backoffMultiplier: 4,
    },
    metadata: backend.metadata,
  };
}

/**
 * Transform backend delivery response to frontend WebhookDelivery shape
 */
function toFrontendDelivery(backend: any): WebhookDelivery {
  const statusMap: Record<string, 'DELIVERED' | 'FAILED' | 'RETRYING'> = {
    SUCCESS: 'DELIVERED',
    FAILED: 'FAILED',
    RETRYING: 'RETRYING',
    PENDING: 'RETRYING',
  };

  return {
    id: backend.id,
    webhookId: backend.webhookId,
    eventType: backend.eventType,
    status: statusMap[backend.status] || 'FAILED',
    statusCode: backend.httpStatus,
    responseTime: backend.durationMs || 0,
    attempt: backend.attemptCount || 1,
    maxAttempts: 5,
    nextRetryAt: backend.nextRetryAt || undefined,
    error: backend.errorMessage || undefined,
    timestamp: backend.createdAt,
  };
}

export const webhookService = {
  /**
   * List all webhooks
   */
  async listWebhooks(): Promise<Webhook[]> {
    const response = await apiClient.get<any[]>('/webhooks');
    return (response.data || []).map(toFrontendWebhook);
  },

  /**
   * Get single webhook
   */
  async getWebhook(id: string): Promise<Webhook> {
    const response = await apiClient.get<any>(`/webhooks/${id}`);
    return toFrontendWebhook(response.data);
  },

  /**
   * Create webhook
   */
  async createWebhook(
    request: CreateWebhookRequest,
  ): Promise<{ webhook: Webhook; secret: string }> {
    const response = await apiClient.post<any>('/webhooks', {
      url: request.url,
      events: request.events,
      label: request.name,
      metadata: request.metadata,
    });

    const data = response.data;
    return {
      webhook: toFrontendWebhook(data.webhook || data),
      secret: data.secret || '',
    };
  },

  /**
   * Update webhook
   */
  async updateWebhook(
    id: string,
    updates: Partial<CreateWebhookRequest>,
  ): Promise<Webhook> {
    const body: any = {};
    if (updates.name !== undefined) body.label = updates.name;
    if (updates.url !== undefined) body.url = updates.url;
    if (updates.events !== undefined) body.events = updates.events;
    if (updates.metadata !== undefined) body.metadata = updates.metadata;

    const response = await apiClient.put<any>(`/webhooks/${id}`, body);
    return toFrontendWebhook(response.data);
  },

  /**
   * Delete webhook
   */
  async deleteWebhook(id: string): Promise<void> {
    await apiClient.delete(`/webhooks/${id}`);
  },

  /**
   * Rotate webhook secret
   */
  async rotateSecret(id: string): Promise<string> {
    const response = await apiClient.post<any>(
      `/webhooks/${id}/rotate-secret`,
    );
    return response.data.secret || '';
  },

  /**
   * Get delivery history
   */
  async getDeliveries(
    webhookId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ deliveries: WebhookDelivery[]; total: number }> {
    const response = await apiClient.get<any>(
      `/webhooks/${webhookId}/deliveries`,
      { page, limit },
    );

    const data = response.data;
    return {
      deliveries: (data.deliveries || data.items || []).map(
        toFrontendDelivery,
      ),
      total: data.total || 0,
    };
  },

  /**
   * Get supported event types
   */
  async getEventTypes(): Promise<string[]> {
    const response = await apiClient.get<any>('/webhooks/meta/event-types');
    const raw = response.data.eventTypes || response.data || [];
    // Backend returns [{eventType, resource, action}] — extract strings
    if (raw.length > 0 && typeof raw[0] === 'object' && raw[0].eventType) {
      return raw.map((item: any) => item.eventType);
    }
    return raw;
  },
};
