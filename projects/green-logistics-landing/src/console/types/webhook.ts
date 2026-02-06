/**
 * Webhook Types for GreenFlow API Console
 */

export type WebhookEvent =
  | 'bid.created'
  | 'bid.updated'
  | 'bid.closed'
  | 'proposal.created'
  | 'proposal.updated'
  | 'proposal.awarded'
  | 'order.created'
  | 'order.shipped'
  | 'order.delivered'
  | 'fleet.updated'
  | 'api_key.rotated';

export type WebhookStatus = 'ACTIVE' | 'INACTIVE' | 'DISABLED';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  status: WebhookStatus;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
  version: number; // API version for payload format
  secret: string; // For HMAC verification
  retryPolicy: RetryPolicy;
  metadata?: Record<string, unknown>;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelaySeconds: number;
  maxDelaySeconds: number;
  backoffMultiplier: number;
}

export interface CreateWebhookRequest {
  name: string;
  url: string;
  events: WebhookEvent[];
  version?: number;
  retryPolicy?: Partial<RetryPolicy>;
  metadata?: Record<string, unknown>;
}

export interface WebhookPayload<T = Record<string, unknown>> {
  id: string;
  timestamp: string; // ISO 8601
  event: WebhookEvent;
  version: number;
  data: T;
  userId: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: WebhookEvent;
  status: 'DELIVERED' | 'FAILED' | 'RETRYING';
  statusCode?: number;
  responseTime: number; // milliseconds
  attempt: number;
  maxAttempts: number;
  nextRetryAt?: string;
  error?: string;
  timestamp: string;
}

export interface WebhookDeliveryStats {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number; // 0-100
  averageResponseTime: number;
  lastDelivery?: WebhookDelivery;
}
