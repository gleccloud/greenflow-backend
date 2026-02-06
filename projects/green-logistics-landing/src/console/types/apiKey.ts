/**
 * API Key Types for GreenFlow API Console
 */

export type APIKeyStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface APIKey {
  id: string;
  name: string;
  keyPrefix: string; // e.g., "glec_test_..."
  createdAt: string; // ISO 8601
  expiresAt: string | null; // null = never expires
  lastUsedAt: string | null;
  status: APIKeyStatus;
  scopes: APIScope[];
  rateLimit: RateLimit;
  ipWhitelist: string[];
  notes?: string;
}

export interface APIScope {
  id: string;
  name: string;
  description: string;
  methods: HTTPMethod[];
  resources: string[];
  granted: boolean;
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RateLimit {
  requestsPerSecond: number;
  requestsPerDay: number;
  burstsAllowed: number;
}

export interface CreateAPIKeyRequest {
  name: string;
  expiresAt?: string;
  scopes: string[];
  rateLimit?: Partial<RateLimit>;
  ipWhitelist?: string[];
  notes?: string;
}

export interface APIKeyResponse {
  key: string; // Full key, shown only once
  apiKey: APIKey;
}
