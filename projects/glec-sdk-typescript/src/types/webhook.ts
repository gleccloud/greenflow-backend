/**
 * GLEC SDK — Webhook Types
 */

export type WebhookEventType =
  | 'bid.created' | 'bid.published' | 'bid.closed' | 'bid.awarded' | 'bid.cancelled' | 'bid.expired'
  | 'proposal.submitted' | 'proposal.updated' | 'proposal.withdrawn' | 'proposal.accepted' | 'proposal.rejected'
  | 'order.created' | 'order.status_changed' | 'order.confirmed' | 'order.in_transit' | 'order.delivered' | 'order.cancelled' | 'order.failed'
  | 'fleet.ei_updated'
  | 'carbon_record.created'
  | 'evaluation.completed';

export type WebhookStatus = 'ACTIVE' | 'INACTIVE' | 'DISABLED';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEventType[];
  status: WebhookStatus;
  secret?: string;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
}

export interface CreateWebhookInput {
  name: string;
  url: string;
  events: WebhookEventType[];
  metadata?: Record<string, unknown>;
}

export interface UpdateWebhookInput {
  name?: string;
  url?: string;
  events?: WebhookEventType[];
}

export interface WebhookCreateResult {
  webhook: Webhook;
  secret: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: WebhookEventType;
  status: 'DELIVERED' | 'FAILED' | 'RETRYING';
  statusCode?: number;
  responseTime: number;
  attempt: number;
  maxAttempts: number;
  timestamp: string;
}

export interface WebhookDeliveriesResponse {
  deliveries: WebhookDelivery[];
  total: number;
  page: number;
}
