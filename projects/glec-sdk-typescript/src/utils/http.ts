import { GlecClientConfig, GlecApiError } from '../types/common';

/**
 * Internal HTTP client with retry logic
 */
export class HttpClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private maxRetries: number;
  private headers: Record<string, string>;

  constructor(config: GlecClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000;
    this.maxRetries = config.retries ?? 3;
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...config.headers,
    };
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = this.buildUrl(path, params);
    return this.request<T>('GET', url);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>('POST', url, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>('PUT', url, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>('PATCH', url, body);
  }

  async delete<T>(path: string): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>('DELETE', url);
  }

  /**
   * GET request returning raw text (for CSV downloads)
   */
  async getText(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<string> {
    const url = this.buildUrl(path, params);
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method: 'GET',
          headers: this.headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new GlecApiError(response.status, errorBody);
        }

        return await response.text();
      } catch (e) {
        lastError = e as Error;
        if (e instanceof GlecApiError && e.statusCode < 500) throw e;
        if (attempt < this.maxRetries) {
          await this.delay(Math.pow(2, attempt) * 500);
        }
      }
    }

    throw lastError ?? new Error('Request failed');
  }

  private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        // Fastify rejects empty body when Content-Type: application/json is set
        const requestHeaders = body !== undefined
          ? this.headers
          : Object.fromEntries(
              Object.entries(this.headers).filter(([k]) => k.toLowerCase() !== 'content-type'),
            );

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new GlecApiError(
            response.status,
            errorBody.message ?? `HTTP ${response.status}`,
            errorBody,
          );
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return (await response.json()) as T;
        }
        return (await response.text()) as unknown as T;
      } catch (e) {
        lastError = e as Error;
        // Don't retry 4xx errors
        if (e instanceof GlecApiError && e.statusCode < 500) throw e;
        if (attempt < this.maxRetries) {
          await this.delay(Math.pow(2, attempt) * 500);
        }
      }
    }

    throw lastError ?? new Error('Request failed after retries');
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}/api/v2${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
