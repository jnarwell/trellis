/**
 * Auth Middleware Tests
 *
 * Tests for the authentication middleware.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { registerAuthMiddleware } from '../../src/middleware/auth.js';
import { generateAccessToken, resetAuthConfig } from '../../src/auth/index.js';
import { resetAuthConfig as resetConfig } from '../../src/config/auth.js';

describe('Auth Middleware', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    // Reset config
    resetConfig();

    // Set up test environment
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('JWT_SECRET', 'test-secret-key');
    vi.stubEnv('JWT_ISSUER', 'trellis-test');
    vi.stubEnv('JWT_AUDIENCE', 'trellis-api-test');

    // Create Fastify instance
    app = Fastify({ logger: false });

    // Register auth middleware
    registerAuthMiddleware(app);

    // Add test routes (must be added before app.ready())
    app.get('/test', async (request) => {
      return {
        tenantId: request.auth.tenantId,
        actorId: request.auth.actorId,
        permissions: request.auth.permissions,
      };
    });

    // Add public path routes for testing
    app.get('/health', async () => ({ status: 'ok' }));
    app.get('/ready', async () => ({ status: 'ready' }));
    app.get('/metrics', async () => 'metrics data');
    app.post('/auth/login', async () => ({ token: 'test' }));

    await app.ready();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    resetConfig();
    await app.close();
  });

  describe('JWT Authentication', () => {
    it('accepts valid Bearer token', async () => {
      const token = generateAccessToken({
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '223e4567-e89b-12d3-a456-426614174000',
        permissions: ['read:entities'],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.tenantId).toBe('223e4567-e89b-12d3-a456-426614174000');
      expect(body.actorId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(body.permissions).toEqual(['read:entities']);
    });

    it('rejects invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('rejects expired token', async () => {
      // Create an expired token
      const jwt = await import('jsonwebtoken');
      const token = jwt.default.sign(
        {
          sub: '123e4567-e89b-12d3-a456-426614174000',
          tenant_id: '223e4567-e89b-12d3-a456-426614174000',
          roles: [],
          permissions: [],
        },
        'test-secret-key',
        {
          expiresIn: '-1s',
          issuer: 'trellis-test',
          audience: 'trellis-api-test',
        }
      );

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('UNAUTHORIZED');
      expect(body.message).toContain('expired');
    });
  });

  describe('Legacy Header Authentication (Development)', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    it('accepts legacy headers in development mode', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-tenant-id': '223e4567-e89b-12d3-a456-426614174000',
          'x-actor-id': '123e4567-e89b-12d3-a456-426614174000',
          'x-permissions': 'read:entities,write:entities',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.tenantId).toBe('223e4567-e89b-12d3-a456-426614174000');
      expect(body.actorId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(body.permissions).toEqual(['read:entities', 'write:entities']);
    });

    it('prefers JWT over legacy headers', async () => {
      const token = generateAccessToken({
        actorId: 'jwt-actor-id',
        tenantId: 'jwt-tenant-id',
        permissions: ['jwt-permission'],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          authorization: `Bearer ${token}`,
          'x-tenant-id': 'header-tenant-id',
          'x-actor-id': 'header-actor-id',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.tenantId).toBe('jwt-tenant-id');
      expect(body.actorId).toBe('jwt-actor-id');
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
    });

    it('rejects legacy headers in production mode', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-tenant-id': '223e4567-e89b-12d3-a456-426614174000',
          'x-actor-id': '123e4567-e89b-12d3-a456-426614174000',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('UNAUTHORIZED');
      expect(body.message).toContain('Bearer token');
    });
  });

  describe('Public Paths', () => {
    it('allows /health without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
    });

    it('allows /ready without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(200);
    });

    it('allows /metrics without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/metrics',
      });

      expect(response.statusCode).toBe(200);
    });

    it('allows /auth paths without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {},
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
