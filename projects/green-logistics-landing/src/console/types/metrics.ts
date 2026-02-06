/**
 * Metrics and Usage Types for GreenFlow API Console
 */

export interface UsageMetrics {
  apiKeyId: string;
  date: string; // YYYY-MM-DD
  requestCount: number;
  successCount: number;
  errorCount: number;
  totalDuration: number; // milliseconds
  totalRequestSize: number; // bytes
  totalResponseSize: number; // bytes
  uniqueEndpoints: number;
  topEndpoint: string;
}

export interface TimeSeriesData {
  timestamp: string; // ISO 8601
  value: number;
  label?: string;
}

export interface MetricsSummary {
  period: 'DAY' | 'WEEK' | 'MONTH';
  startDate: string;
  endDate: string;
  totalRequests: number;
  successRate: number; // 0-100
  totalErrorCount: number;
  averageResponseTime: number; // milliseconds
  p95ResponseTime: number;
  p99ResponseTime: number;
  peakRequestsPerSecond: number;
  uniqueApiKeys: number;
  uniqueEndpoints: number;
}

export interface EndpointMetrics {
  endpoint: string;
  method: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  averageRequestSize: number;
  averageResponseSize: number;
  lastRequest?: string; // ISO 8601
}

export interface QuotaInfo {
  limit: number;
  used: number;
  remaining: number;
  resetDate: string;
  percentUsed: number; // 0-100
  warningThreshold: number; // percentage
}

export interface BillingMetrics {
  billingPeriodStart: string;
  billingPeriodEnd: string;
  requestCount: number;
  costPerRequest: number;
  totalCost: number;
  overageCharges: number;
  discountApplied: number;
  estimatedNextBill: number;
}
