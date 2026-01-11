/**
 * Trellis E2E Test Harness - HTTP Client
 *
 * A wrapper around Fastify's inject method for making test requests.
 */

import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify';
import type { TenantId, ActorId } from '@trellis/kernel';

// =============================================================================
// TYPES
// =============================================================================

export interface TestClientOptions {
  tenantId: TenantId;
  actorId: ActorId;
  permissions?: string[];
}

export interface RequestOptions {
  /** Override tenant ID for this request */
  tenantId?: string;
  /** Override actor ID for this request */
  actorId?: string;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Query string parameters */
  query?: Record<string, string | number | boolean>;
}

export interface TestResponse<T = unknown> {
  status: number;
  headers: Record<string, string | string[] | number | undefined>;
  body: T;
  raw: LightMyRequestResponse;
}

// =============================================================================
// TEST CLIENT
// =============================================================================

/**
 * HTTP test client for making requests to the Fastify app.
 * Automatically injects authentication headers.
 */
export class TestClient {
  constructor(
    private readonly app: FastifyInstance,
    private readonly options: TestClientOptions
  ) {}

  /**
   * Make a GET request.
   */
  async get<T = unknown>(
    path: string,
    options?: RequestOptions
  ): Promise<TestResponse<T>> {
    return this.request<T>('GET', path, undefined, options);
  }

  /**
   * Make a POST request.
   */
  async post<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<TestResponse<T>> {
    return this.request<T>('POST', path, body, options);
  }

  /**
   * Make a PUT request.
   */
  async put<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<TestResponse<T>> {
    return this.request<T>('PUT', path, body, options);
  }

  /**
   * Make a PATCH request.
   */
  async patch<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<TestResponse<T>> {
    return this.request<T>('PATCH', path, body, options);
  }

  /**
   * Make a DELETE request.
   */
  async delete<T = unknown>(
    path: string,
    options?: RequestOptions
  ): Promise<TestResponse<T>> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  /**
   * Make a request without authentication headers.
   * Useful for testing auth error handling.
   */
  async unauthenticated<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<TestResponse<T>> {
    const injectOptions: InjectOptions = {
      method,
      url: path,
      headers: {
        'content-type': 'application/json',
      },
    };

    if (body !== undefined) {
      injectOptions.payload = JSON.stringify(body);
    }

    const response = await this.app.inject(injectOptions);
    return this.parseResponse<T>(response);
  }

  /**
   * Internal request method.
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<TestResponse<T>> {
    // Build URL with query string
    let url = path;
    if (options?.query) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.query)) {
        searchParams.set(key, String(value));
      }
      url = `${path}?${searchParams.toString()}`;
    }

    // Build headers
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-tenant-id': options?.tenantId ?? this.options.tenantId,
      'x-actor-id': options?.actorId ?? this.options.actorId,
      ...options?.headers,
    };

    // Add permissions header if set
    if (this.options.permissions && this.options.permissions.length > 0) {
      headers['x-permissions'] = this.options.permissions.join(',');
    }

    const injectOptions: InjectOptions = {
      method,
      url,
      headers,
    };

    if (body !== undefined) {
      injectOptions.payload = JSON.stringify(body);
    }

    const response = await this.app.inject(injectOptions);
    return this.parseResponse<T>(response);
  }

  /**
   * Parse the response into a structured format.
   */
  private parseResponse<T>(response: LightMyRequestResponse): TestResponse<T> {
    let body: T;

    try {
      body = JSON.parse(response.body) as T;
    } catch {
      // If body is not JSON, return it as-is
      body = response.body as unknown as T;
    }

    return {
      status: response.statusCode,
      headers: response.headers,
      body,
      raw: response,
    };
  }
}

/**
 * Create a test client for a specific tenant/actor.
 */
export function createTestClient(
  app: FastifyInstance,
  options: TestClientOptions
): TestClient {
  return new TestClient(app, options);
}
