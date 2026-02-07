/**
 * GLEC SDK — Common Types
 */

export interface GlecClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;       // default: 30000ms
  retries?: number;       // default: 3
  headers?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, any>;
}

export class GlecApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = 'GlecApiError';
  }
}
