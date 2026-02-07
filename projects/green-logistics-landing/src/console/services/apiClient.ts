/**
 * API Client for GreenFlow Console
 * Handles all HTTP requests to backend API
 */

// Backend API server — production-grade integration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v2';

// Demo API key for local development (32+ chars required by backend)
const DEMO_API_KEY = import.meta.env.VITE_API_KEY || '550e8400e29b41d4a716446655440000';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean>;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

class ApiClient {
  private getApiKey(): string {
    return localStorage.getItem('api_key') || DEMO_API_KEY;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    let url = `${API_BASE_URL}${endpoint}`;

    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        queryParams.append(key, String(value));
      });
      url += `?${queryParams.toString()}`;
    }

    return url;
  }

  async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body = null,
      params = {},
    } = options;

    const apiKey = this.getApiKey();
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      ...headers,
    };

    const url = this.buildUrl(endpoint, params);

    try {
      const response = await fetch(url, {
        method,
        headers: defaultHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP Error: ${response.status}`);
      }

      return {
        data,
        status: response.status,
        message: data.message,
      };
    } catch (error) {
      console.error(`API Request Failed: ${endpoint}`, error);
      throw error;
    }
  }

  get<T>(endpoint: string, params?: Record<string, string | number | boolean>) {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  post<T>(endpoint: string, body?: unknown, params?: Record<string, string | number | boolean>) {
    return this.request<T>(endpoint, { method: 'POST', body, params });
  }

  put<T>(endpoint: string, body?: unknown, params?: Record<string, string | number | boolean>) {
    return this.request<T>(endpoint, { method: 'PUT', body, params });
  }

  delete<T>(endpoint: string, params?: Record<string, string | number | boolean>) {
    return this.request<T>(endpoint, { method: 'DELETE', params });
  }

  patch<T>(endpoint: string, body?: unknown, params?: Record<string, string | number | boolean>) {
    return this.request<T>(endpoint, { method: 'PATCH', body, params });
  }
}

export const apiClient = new ApiClient();
