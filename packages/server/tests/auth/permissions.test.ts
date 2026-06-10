/**
 * Permission Enforcement Tests (ADR-012)
 *
 * Verifies requirePermission guards combined with the auth middleware:
 * JWT-carried permissions, legacy header roles, and dev defaults.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { Permissions, expandRoles } from '@trellis/kernel';
import { registerAuthMiddleware } from '../../src/middleware/auth.js';
import { requirePermission } from '../../src/middleware/permissions.js';
import { generateAccessToken } from '../../src/auth/index.js';
import { resetAuthConfig as resetConfig } from '../../src/config/auth.js';

const TENANT = '223e4567-e89b-12d3-a456-426614174000';
const ACTOR = '123e4567-e89b-12d3-a456-426614174000';

describe('Permission Enforcement', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    resetConfig();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('JWT_SECRET', 'test-secret-key');
    vi.stubEnv('JWT_ISSUER', 'trellis-test');
    vi.stubEnv('JWT_AUDIENCE', 'trellis-api-test');

    app = Fastify({ logger: false });
    registerAuthMiddleware(app);

    // Guarded routes mirroring the real route guards
    app.post(
      '/guarded/create',
      { preHandler: requirePermission(Permissions.EntityCreate) },
      async () => ({ ok: true })
    );
    app.get(
      '/guarded/read',
      { preHandler: requirePermission(Permissions.EntityRead) },
      async () => ({ ok: true })
    );
    app.delete(
      '/guarded/delete',
      { preHandler: requirePermission(Permissions.EntityDelete) },
      async () => ({ ok: true })
    );

    await app.ready();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    resetConfig();
    await app.close();
  });

  function tokenWithRoles(roles: string[]): string {
    return generateAccessToken({
      actorId: ACTOR,
      tenantId: TENANT,
      roles,
      permissions: expandRoles(roles),
    });
  }

  describe('JWT permissions', () => {
    it('viewer can read but not create or delete', async () => {
      const token = tokenWithRoles(['viewer']);
      const headers = { authorization: `Bearer ${token}` };

      const read = await app.inject({ method: 'GET', url: '/guarded/read', headers });
      expect(read.statusCode).toBe(200);

      const create = await app.inject({ method: 'POST', url: '/guarded/create', headers });
      expect(create.statusCode).toBe(403);
      expect(JSON.parse(create.body).code).toBe('FORBIDDEN');
      expect(JSON.parse(create.body).details.required_permission).toBe(
        Permissions.EntityCreate
      );

      const del = await app.inject({ method: 'DELETE', url: '/guarded/delete', headers });
      expect(del.statusCode).toBe(403);
    });

    it('editor can create, read, and delete', async () => {
      const token = tokenWithRoles(['editor']);
      const headers = { authorization: `Bearer ${token}` };

      for (const [method, url] of [
        ['POST', '/guarded/create'],
        ['GET', '/guarded/read'],
        ['DELETE', '/guarded/delete'],
      ] as const) {
        const response = await app.inject({ method, url, headers });
        expect(response.statusCode).toBe(200);
      }
    });

    it('admin wildcard grants everything', async () => {
      const token = tokenWithRoles(['admin']);
      const headers = { authorization: `Bearer ${token}` };

      const create = await app.inject({ method: 'POST', url: '/guarded/create', headers });
      expect(create.statusCode).toBe(200);
    });

    it('explicit permission list is enforced as-is', async () => {
      const token = generateAccessToken({
        actorId: ACTOR,
        tenantId: TENANT,
        permissions: [Permissions.EntityCreate],
      });
      const headers = { authorization: `Bearer ${token}` };

      const create = await app.inject({ method: 'POST', url: '/guarded/create', headers });
      expect(create.statusCode).toBe(200);

      const read = await app.inject({ method: 'GET', url: '/guarded/read', headers });
      expect(read.statusCode).toBe(403);
    });
  });

  describe('Legacy header auth (development)', () => {
    it('role names in x-permissions expand and are enforced', async () => {
      const headers = {
        'x-tenant-id': TENANT,
        'x-actor-id': ACTOR,
        'x-permissions': 'viewer',
      };

      const read = await app.inject({ method: 'GET', url: '/guarded/read', headers });
      expect(read.statusCode).toBe(200);

      const create = await app.inject({ method: 'POST', url: '/guarded/create', headers });
      expect(create.statusCode).toBe(403);
    });

    it('missing x-permissions defaults to full access in dev', async () => {
      const headers = {
        'x-tenant-id': TENANT,
        'x-actor-id': ACTOR,
      };

      const create = await app.inject({ method: 'POST', url: '/guarded/create', headers });
      expect(create.statusCode).toBe(200);

      const del = await app.inject({ method: 'DELETE', url: '/guarded/delete', headers });
      expect(del.statusCode).toBe(200);
    });
  });
});
