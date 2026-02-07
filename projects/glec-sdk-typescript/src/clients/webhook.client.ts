import { HttpClient } from '../utils/http';
import type {
  Webhook,
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookCreateResult,
  WebhookDeliveriesResponse,
  WebhookEventType,
} from '../types/webhook';

/**
 * Webhook Management Client
 * 웹훅 CRUD, 시크릿 로테이션, 딜리버리 이력 조회
 */
export class WebhookClient {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all webhooks
   */
  async list(): Promise<Webhook[]> {
    return this.http.get<Webhook[]>('/webhooks');
  }

  /**
   * Get a specific webhook by ID
   */
  async get(webhookId: string): Promise<Webhook> {
    return this.http.get<Webhook>(`/webhooks/${webhookId}`);
  }

  /**
   * Create a new webhook
   */
  async create(input: CreateWebhookInput): Promise<WebhookCreateResult> {
    return this.http.post<WebhookCreateResult>('/webhooks', input);
  }

  /**
   * Update a webhook (name, url, events)
   */
  async update(webhookId: string, input: UpdateWebhookInput): Promise<Webhook> {
    return this.http.patch<Webhook>(`/webhooks/${webhookId}`, input);
  }

  /**
   * Delete a webhook
   */
  async delete(webhookId: string): Promise<void> {
    return this.http.delete(`/webhooks/${webhookId}`);
  }

  /**
   * Rotate webhook secret (invalidates old secret)
   */
  async rotateSecret(webhookId: string): Promise<{ secret: string }> {
    return this.http.post<{ secret: string }>(`/webhooks/${webhookId}/rotate-secret`);
  }

  /**
   * Get delivery history for a webhook
   */
  async getDeliveries(webhookId: string, page = 1, limit = 20): Promise<WebhookDeliveriesResponse> {
    return this.http.get<WebhookDeliveriesResponse>(`/webhooks/${webhookId}/deliveries`, { page, limit });
  }

  /**
   * Get available event types from backend
   */
  async getEventTypes(): Promise<WebhookEventType[]> {
    return this.http.get<WebhookEventType[]>('/webhooks/meta/event-types');
  }
}
