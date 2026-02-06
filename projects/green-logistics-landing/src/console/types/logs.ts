/**
 * API Logs Types for GreenFlow API Console
 */

export type LogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
export type LogStatus = 'SUCCESS' | 'FAILED' | 'PENDING';

export interface APILog {
  id: string;
  timestamp: string; // ISO 8601
  apiKeyId: string;
  method: string; // GET, POST, etc.
  endpoint: string; // /api/v2/bids
  status: LogStatus;
  statusCode: number; // 200, 404, 500, etc.
  duration: number; // milliseconds
  requestSize: number; // bytes
  responseSize: number; // bytes
  userAgent: string;
  ipAddress: string;
  errorMessage?: string;
  errorStackTrace?: string;
  metadata?: Record<string, unknown>;
}

export interface LogFilter {
  startDate: string;
  endDate: string;
  status?: LogStatus;
  statusCode?: number;
  endpoint?: string;
  apiKeyId?: string;
  minDuration?: number; // milliseconds
  maxDuration?: number;
  searchTerm?: string;
}

export interface LogsResponse {
  logs: APILog[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface LogStats {
  totalRequests: number;
  successRate: number; // 0-100
  averageDuration: number; // milliseconds
  p95Duration: number;
  p99Duration: number;
  topEndpoints: EndpointStat[];
  topErrors: ErrorStat[];
}

export interface EndpointStat {
  endpoint: string;
  method: string;
  requestCount: number;
  averageDuration: number;
  successRate: number;
}

export interface ErrorStat {
  statusCode: number;
  message: string;
  count: number;
  lastOccurrence: string;
}
