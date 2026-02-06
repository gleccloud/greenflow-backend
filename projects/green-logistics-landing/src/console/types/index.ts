/**
 * Central export for all console types
 */

export * from './apiKey';
export * from './logs';
export * from './webhook';
export * from './metrics';

/**
 * Common types for console
 */

export interface ConsoleUser {
  id: string;
  email: string;
  name: string;
  organization: string;
  role: 'ADMIN' | 'DEVELOPER' | 'VIEWER';
  createdAt: string;
  lastLoginAt: string;
}

export interface ConsoleSettings {
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  dateFormat: string;
  notificationsEnabled: boolean;
  emailDigestFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'NONE';
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  traceId?: string;
}
