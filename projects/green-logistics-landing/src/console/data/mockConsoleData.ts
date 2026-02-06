/**
 * Mock Data for GreenFlow API Console
 * Phase 2에서 실제 API 호출로 교체될 예정
 */

import type {
  APIKey,
  APILog,
  MetricsSummary,
  EndpointMetrics,
} from '../types';

// ============================================================================
// MOCK API KEYS
// ============================================================================

export const mockAPIKeys: APIKey[] = [
  {
    id: '1',
    name: 'Production API Key',
    keyPrefix: 'glec_prod_a1b2c3d4e5f6g7h8',
    createdAt: '2025-01-15T10:00:00Z',
    expiresAt: '2026-01-15T10:00:00Z',
    lastUsedAt: '2026-02-04T14:32:15Z',
    status: 'ACTIVE',
    scopes: [
      {
        id: 'scope_1',
        name: 'bids.read',
        description: 'Read bid information',
        methods: ['GET'],
        resources: ['/bids', '/bids/:id'],
        granted: true,
      },
      {
        id: 'scope_2',
        name: 'proposals.write',
        description: 'Create and update proposals',
        methods: ['POST', 'PUT'],
        resources: ['/proposals'],
        granted: true,
      },
      {
        id: 'scope_3',
        name: 'fleets.read',
        description: 'Read fleet information',
        methods: ['GET'],
        resources: ['/fleets'],
        granted: true,
      },
    ],
    rateLimit: {
      requestsPerSecond: 100,
      requestsPerDay: 1000000,
      burstsAllowed: 200,
    },
    ipWhitelist: ['203.0.113.42'],
    notes: 'Main production key',
  },
  {
    id: '2',
    name: 'Testing Environment',
    keyPrefix: 'glec_test_x9y8z7w6v5u4t3s2',
    createdAt: '2025-01-10T14:30:00Z',
    expiresAt: '2026-01-10T14:30:00Z',
    lastUsedAt: '2026-02-04T12:15:30Z',
    status: 'ACTIVE',
    scopes: [
      {
        id: 'scope_1',
        name: 'bids.read',
        description: 'Read bid information',
        methods: ['GET'],
        resources: ['/bids', '/bids/:id'],
        granted: true,
      },
      {
        id: 'scope_2',
        name: 'proposals.read',
        description: 'Read proposal information',
        methods: ['GET'],
        resources: ['/proposals'],
        granted: true,
      },
    ],
    rateLimit: {
      requestsPerSecond: 10,
      requestsPerDay: 10000,
      burstsAllowed: 20,
    },
    ipWhitelist: [],
    notes: 'Development testing key',
  },
  {
    id: '3',
    name: 'Legacy Webhook Key',
    keyPrefix: 'glec_hook_p1o2n3m4l5k6j7i8h',
    createdAt: '2024-12-01T08:00:00Z',
    expiresAt: '2025-06-01T08:00:00Z',
    lastUsedAt: null,
    status: 'REVOKED',
    scopes: [
      {
        id: 'scope_1',
        name: 'webhooks.manage',
        description: 'Manage webhooks',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        resources: ['/webhooks'],
        granted: true,
      },
    ],
    rateLimit: {
      requestsPerSecond: 50,
      requestsPerDay: 500000,
      burstsAllowed: 100,
    },
    ipWhitelist: [],
    notes: 'Old webhook key - revoked due to security policy',
  },
  {
    id: '4',
    name: 'Partner Integration',
    keyPrefix: 'glec_partner_r6q5p4o3n2m1l0k9',
    createdAt: '2025-01-20T16:45:00Z',
    expiresAt: '2027-01-20T16:45:00Z',
    lastUsedAt: '2026-02-03T09:20:00Z',
    status: 'ACTIVE',
    scopes: [
      {
        id: 'scope_1',
        name: 'bids.read',
        description: 'Read bid information',
        methods: ['GET'],
        resources: ['/bids'],
        granted: true,
      },
      {
        id: 'scope_2',
        name: 'proposals.read',
        description: 'Read proposal information',
        methods: ['GET'],
        resources: ['/proposals'],
        granted: true,
      },
    ],
    rateLimit: {
      requestsPerSecond: 50,
      requestsPerDay: 100000,
      burstsAllowed: 100,
    },
    ipWhitelist: ['198.51.100.50', '198.51.100.51'],
    notes: 'Partner API integration',
  },
];

// ============================================================================
// MOCK LOGS
// ============================================================================

export const mockAPILogs: APILog[] = [
  {
    id: 'log_001',
    timestamp: '2026-02-04T14:32:15.123Z',
    apiKeyId: '1',
    method: 'GET',
    endpoint: '/api/v2/bids',
    status: 'SUCCESS',
    statusCode: 200,
    duration: 145,
    requestSize: 256,
    responseSize: 4521,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    ipAddress: '203.0.113.42',
  },
  {
    id: 'log_002',
    timestamp: '2026-02-04T14:31:42.456Z',
    apiKeyId: '2',
    method: 'POST',
    endpoint: '/api/v2/proposals',
    status: 'SUCCESS',
    statusCode: 201,
    duration: 312,
    requestSize: 1024,
    responseSize: 512,
    userAgent: 'GreenFlow-SDK/1.2.3',
    ipAddress: '192.0.2.100',
  },
  {
    id: 'log_003',
    timestamp: '2026-02-04T14:30:08.789Z',
    apiKeyId: '1',
    method: 'GET',
    endpoint: '/api/v2/fleets/123',
    status: 'FAILED',
    statusCode: 404,
    duration: 89,
    requestSize: 128,
    responseSize: 256,
    userAgent: 'Postman/11.0',
    ipAddress: '203.0.113.42',
    errorMessage: 'Fleet with ID 123 not found',
  },
  {
    id: 'log_004',
    timestamp: '2026-02-04T14:29:33.012Z',
    apiKeyId: '4',
    method: 'PUT',
    endpoint: '/api/v2/bids/456',
    status: 'SUCCESS',
    statusCode: 200,
    duration: 267,
    requestSize: 512,
    responseSize: 768,
    userAgent: 'curl/7.68.0',
    ipAddress: '198.51.100.50',
  },
  {
    id: 'log_005',
    timestamp: '2026-02-04T14:28:15.345Z',
    apiKeyId: '1',
    method: 'GET',
    endpoint: '/api/v2/proposals?bid_id=456',
    status: 'SUCCESS',
    statusCode: 200,
    duration: 198,
    requestSize: 384,
    responseSize: 2048,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    ipAddress: '203.0.113.42',
  },
  {
    id: 'log_006',
    timestamp: '2026-02-04T14:27:00.678Z',
    apiKeyId: '2',
    method: 'GET',
    endpoint: '/api/v2/bids',
    status: 'SUCCESS',
    statusCode: 200,
    duration: 156,
    requestSize: 256,
    responseSize: 3892,
    userAgent: 'GreenFlow-Mobile/2.1.0',
    ipAddress: '192.0.2.100',
  },
  {
    id: 'log_007',
    timestamp: '2026-02-04T14:25:45.901Z',
    apiKeyId: '1',
    method: 'DELETE',
    endpoint: '/api/v2/proposals/789',
    status: 'FAILED',
    statusCode: 403,
    duration: 45,
    requestSize: 64,
    responseSize: 128,
    userAgent: 'curl/7.68.0',
    ipAddress: '203.0.113.42',
    errorMessage: 'Insufficient permissions to delete this proposal',
  },
  {
    id: 'log_008',
    timestamp: '2026-02-04T14:24:20.234Z',
    apiKeyId: '4',
    method: 'GET',
    endpoint: '/api/v2/fleets',
    status: 'SUCCESS',
    statusCode: 200,
    duration: 234,
    requestSize: 512,
    responseSize: 5120,
    userAgent: 'Partner-API-Client/3.0.0',
    ipAddress: '198.51.100.51',
  },
];

// ============================================================================
// MOCK METRICS
// ============================================================================

export const mockMetricsSummary: MetricsSummary = {
  period: 'DAY',
  startDate: '2026-02-04T00:00:00Z',
  endDate: '2026-02-04T23:59:59Z',
  totalRequests: 12453,
  successRate: 99.8,
  totalErrorCount: 25,
  averageResponseTime: 142,
  p95ResponseTime: 523,
  p99ResponseTime: 1204,
  peakRequestsPerSecond: 45.3,
  uniqueApiKeys: 4,
  uniqueEndpoints: 12,
};

export const mockEndpointMetrics: EndpointMetrics[] = [
  {
    endpoint: '/api/v2/bids',
    method: 'GET',
    requestCount: 4250,
    successCount: 4248,
    errorCount: 2,
    averageResponseTime: 145,
    p95ResponseTime: 450,
    p99ResponseTime: 890,
    averageRequestSize: 256,
    averageResponseSize: 4521,
    lastRequest: '2026-02-04T14:32:15Z',
  },
  {
    endpoint: '/api/v2/proposals',
    method: 'POST',
    requestCount: 2100,
    successCount: 2098,
    errorCount: 2,
    averageResponseTime: 312,
    p95ResponseTime: 650,
    p99ResponseTime: 1200,
    averageRequestSize: 1024,
    averageResponseSize: 512,
    lastRequest: '2026-02-04T14:31:42Z',
  },
  {
    endpoint: '/api/v2/fleets',
    method: 'GET',
    requestCount: 1890,
    successCount: 1888,
    errorCount: 2,
    averageResponseTime: 234,
    p95ResponseTime: 523,
    p99ResponseTime: 1045,
    averageRequestSize: 512,
    averageResponseSize: 5120,
    lastRequest: '2026-02-04T14:24:20Z',
  },
  {
    endpoint: '/api/v2/bids/:id',
    method: 'PUT',
    requestCount: 950,
    successCount: 949,
    errorCount: 1,
    averageResponseTime: 267,
    p95ResponseTime: 580,
    p99ResponseTime: 1100,
    averageRequestSize: 512,
    averageResponseSize: 768,
    lastRequest: '2026-02-04T14:29:33Z',
  },
  {
    endpoint: '/api/v2/proposals/:id',
    method: 'DELETE',
    requestCount: 263,
    successCount: 262,
    errorCount: 1,
    averageResponseTime: 189,
    p95ResponseTime: 420,
    p99ResponseTime: 800,
    averageRequestSize: 64,
    averageResponseSize: 128,
    lastRequest: '2026-02-04T14:25:45Z',
  },
];

// ============================================================================
// MOCK USAGE TRENDS (7일 데이터)
// ============================================================================

export const mockRequestTrend = [
  { date: '2026-01-29', requests: 8234, errors: 15, avgTime: 156 },
  { date: '2026-01-30', requests: 9102, errors: 18, avgTime: 148 },
  { date: '2026-01-31', requests: 10456, errors: 22, avgTime: 151 },
  { date: '2026-02-01', requests: 11234, errors: 20, avgTime: 144 },
  { date: '2026-02-02', requests: 10892, errors: 25, avgTime: 147 },
  { date: '2026-02-03', requests: 12120, errors: 19, avgTime: 143 },
  { date: '2026-02-04', requests: 12453, errors: 25, avgTime: 142 },
];

// ============================================================================
// MOCK RECENT ACTIVITIES
// ============================================================================

export const mockRecentActivities = [
  {
    event: 'API Key Created',
    description: 'Key "glec_prod_a1b2c3d4..." was created',
    time: '2 hours ago',
    icon: '🔑',
    severity: 'info' as const,
  },
  {
    event: 'High Error Rate Alert',
    description: 'Error rate exceeded 5% threshold on /api/v2/bids',
    time: '4 hours ago',
    icon: '⚠️',
    severity: 'warning' as const,
  },
  {
    event: 'API Key Rotated',
    description: 'Key "glec_test_x9y8z7w6..." was rotated successfully',
    time: '1 day ago',
    icon: '🔄',
    severity: 'info' as const,
  },
  {
    event: 'New Integration',
    description: 'Partner integration key activated',
    time: '3 days ago',
    icon: '🔗',
    severity: 'success' as const,
  },
  {
    event: 'Rate Limit Exceeded',
    description: 'API key temporarily rate-limited due to quota',
    time: '5 days ago',
    icon: '🚫',
    severity: 'error' as const,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function generateRandomMetric(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomChange(): {
  value: number;
  trend: 'up' | 'down' | 'neutral';
} {
  const change = (Math.random() * 20 - 10).toFixed(1);
  const value = parseFloat(change);
  let trend: 'up' | 'down' | 'neutral' = 'neutral';

  if (value > 1) trend = 'up';
  else if (value < -1) trend = 'down';

  return { value, trend };
}

/**
 * Simulate real-time metrics update
 * 실제 API에서는 이 함수를 제거하고 API 호출로 교체
 */
export function simulateMetricsUpdate(
  currentMetrics: typeof mockMetricsSummary
) {
  return {
    ...currentMetrics,
    totalRequests: currentMetrics.totalRequests + generateRandomMetric(1, 50),
    totalErrorCount: currentMetrics.totalErrorCount + generateRandomMetric(0, 3),
    averageResponseTime:
      currentMetrics.averageResponseTime + generateRandomMetric(-10, 20),
  };
}
