/**
 * Trellis Client SDK - HTTP Client
 *
 * Fetch wrapper with authentication, error handling, and retries.
 */

import type { KernelError } from '@trellis/kernel';
import type { RequestOptions, ApiResponse, TokenStorage } from './types.js';
import { TrellisError } from './types.js';

/**
 * HTTP client configuration.
 */
export interface HttpClientConfig {
  readonly baseUrl: string;
  readonly timeout: number;
  readonly tokenStorage: TokenStorage;
  readonly onTokenExpired: () => Promise<boolean>;
}

/**
 * HTTP client for Trellis API.
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly tokenStorage: TokenStorage;
  private readonly onTokenExpired: () => Promise<boolean>;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeout = config.timeout;
    this.tokenStorage = config.tokenStorage;
    this.onTokenExpired = config.onTokenExpired;
  }

  /**
   * Make an authenticated request.
   */
  async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    const url = this.buildUrl(options.path, options.params);
    const headers = this.buildHeaders(options);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const fetchOptions: RequestInit = {
        method: options.method,
        headers,
        signal: controller.signal,
      };
      if (options.body !== undefined) {
        fetchOptions.body = JSON.stringify(options.body);
      }
      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      // Handle 401 - token expired
      if (response.status === 401 && !options.skipAuth) {
        const refreshed = await this.handleTokenExpired();
        if (refreshed) {
          // Retry with new token
          return this.request(options);
        }
        throw new TrellisError('Authentication required', 'AUTH_REQUIRED');
      }

      // Parse response
      const data = await this.parseResponse<T>(response);

      if (!response.ok) {
        throw this.createError(response.status, data);
      }

      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof TrellisError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TrellisError('Request timeout', 'TIMEOUT');
        }
        throw new TrellisError(error.message, 'NETWORK_ERROR');
      }

      throw new TrellisError('Unknown error', 'UNKNOWN');
    }
  }

  /**
   * GET request.
   */
  async get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const options: RequestOptions = { method: 'GET', path };
    if (params !== undefined) {
      (options as { params: typeof params }).params = params;
    }
    const response = await this.request<T>(options);
    return response.data;
  }

  /**
   * POST request.
   */
  async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await this.request<T>({ method: 'POST', path, body });
    return response.data;
  }

  /**
   * PUT request.
   */
  async put<T>(path: string, body?: unknown): Promise<T> {
    const response = await this.request<T>({ method: 'PUT', path, body });
    return response.data;
  }

  /**
   * DELETE request.
   */
  async delete<T = void>(path: string): Promise<T> {
    const response = await this.request<T>({ method: 'DELETE', path });
    return response.data;
  }

  /**
   * POST request without authentication (for login).
   */
  async postUnauthenticated<T>(path: string, body?: unknown): Promise<T> {
    const response = await this.request<T>({
      method: 'POST',
      path,
      body,
      skipAuth: true,
    });
    return response.data;
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    // Handle relative baseUrl (e.g., '/api') by using window.location.origin
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

    // Join baseUrl and path properly (both may have leading/trailing slashes)
    const basePath = this.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    const requestPath = path.startsWith('/') ? path : '/' + path;
    const fullPath = basePath + requestPath;

    const url = new URL(fullPath, origin);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  private buildHeaders(options: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options.headers,
    };

    // Only set Content-Type if there's a body (avoid empty body errors on DELETE)
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (!options.skipAuth) {
      const token = this.tokenStorage.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    // Return empty object for 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    // Try to parse as JSON anyway
    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  private createError(status: number, data: unknown): TrellisError {
    // Check if it's a KernelError
    if (isKernelError(data)) {
      return TrellisError.fromKernelError(data);
    }

    // Create generic error based on status
    const statusMessages: Record<number, string> = {
      400: 'Bad request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not found',
      409: 'Conflict',
      422: 'Validation error',
      429: 'Too many requests',
      500: 'Internal server error',
      502: 'Bad gateway',
      503: 'Service unavailable',
    };

    const message = statusMessages[status] || `HTTP error ${status}`;
    return new TrellisError(message, `HTTP_${status}`, { status, data });
  }

  private async handleTokenExpired(): Promise<boolean> {
    // Deduplicate concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.onTokenExpired();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }
}

/**
 * Type guard for KernelError.
 */
function isKernelError(value: unknown): value is KernelError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as KernelError).code === 'string' &&
    typeof (value as KernelError).message === 'string'
  );
}
