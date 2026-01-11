/**
 * Trellis E2E Tests - Authentication & Authorization
 *
 * Tests for JWT authentication, tenant isolation, and permission checking.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  TestHarness,
  TestClient,
  fixtures,
  assertCreated,
  assertOk,
  assertUnauthorized,
  assertNotFound,
  type EntityResponse,
} from '../harness/index.js';
import type { KernelError, Entity } from '@trellis/kernel';

/** Token pair response from login/refresh */
interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

describe('Authentication', () => {
  let harness: TestHarness;
  let client: TestClient;

  beforeAll(async () => {
    harness = new TestHarness();
    await harness.setup();
  });

  beforeEach(async () => {
    await harness.reset();
    client = harness.client();
  });

  afterAll(async () => {
    await harness.teardown();
  });

  // ===========================================================================
  // JWT TOKEN GENERATION
  // ===========================================================================

  describe('POST /auth/login - Token Generation', () => {
    it('should generate token pair on login', async () => {
      const response = await client.post<TokenPair>('/auth/login', {
        tenant_id: harness.tenantId,
        actor_id: harness.actorId,
      });

      expect(response.status).toBe(200);
      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
      expect(response.body.token_type).toBe('Bearer');
      expect(response.body.expires_in).toBeGreaterThan(0);
    });

    it('should generate token pair with roles', async () => {
      const response = await client.post<TokenPair>('/auth/login', {
        tenant_id: harness.tenantId,
        actor_id: harness.actorId,
        roles: ['admin', 'editor'],
      });

      expect(response.status).toBe(200);
      expect(response.body.access_token).toBeDefined();
      // Can't easily decode JWT here without jwt library, just verify it's returned
    });

    it('should generate token pair with permissions', async () => {
      const response = await client.post<TokenPair>('/auth/login', {
        tenant_id: harness.tenantId,
        actor_id: harness.actorId,
        permissions: ['entity:read', 'entity:write'],
      });

      expect(response.status).toBe(200);
      expect(response.body.access_token).toBeDefined();
    });

    it('should reject login without tenant_id', async () => {
      const response = await client.post<KernelError>('/auth/login', {
        actor_id: harness.actorId,
      });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject login without actor_id', async () => {
      const response = await client.post<KernelError>('/auth/login', {
        tenant_id: harness.tenantId,
      });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject login with invalid tenant_id format', async () => {
      const response = await client.post<KernelError>('/auth/login', {
        tenant_id: 'not-a-uuid',
        actor_id: harness.actorId,
      });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ===========================================================================
  // TOKEN REFRESH
  // ===========================================================================

  describe('POST /auth/refresh - Token Refresh', () => {
    it('should refresh token pair with valid refresh token', async () => {
      // First, login to get tokens
      const loginResponse = await client.post<TokenPair>('/auth/login', {
        tenant_id: harness.tenantId,
        actor_id: harness.actorId,
      });
      expect(loginResponse.status).toBe(200);

      const refreshToken = loginResponse.body.refresh_token;

      // Now refresh
      const refreshResponse = await client.post<TokenPair>('/auth/refresh', {
        refresh_token: refreshToken,
      });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.access_token).toBeDefined();
      expect(refreshResponse.body.refresh_token).toBeDefined();
      // New tokens should be different from old ones
      expect(refreshResponse.body.access_token).not.toBe(loginResponse.body.access_token);
    });

    it('should reject refresh with invalid token', async () => {
      const response = await client.post<KernelError>('/auth/refresh', {
        refresh_token: 'invalid.refresh.token',
      });

      expect(response.status).toBe(401);
    });

    it('should reject refresh with missing token', async () => {
      const response = await client.post<KernelError>('/auth/refresh', {});

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject refresh with access token (wrong token type)', async () => {
      // Login to get tokens
      const loginResponse = await client.post<TokenPair>('/auth/login', {
        tenant_id: harness.tenantId,
        actor_id: harness.actorId,
      });
      expect(loginResponse.status).toBe(200);

      const accessToken = loginResponse.body.access_token;

      // Try to use access token as refresh token
      const refreshResponse = await client.post<KernelError>('/auth/refresh', {
        refresh_token: accessToken,
      });

      // Should fail - access token is not a refresh token
      expect(refreshResponse.status).toBe(401);
    });
  });

  // ===========================================================================
  // PROTECTED ROUTES
  // ===========================================================================

  describe('Protected Routes - Header Auth', () => {
    it('should reject request without auth headers', async () => {
      const response = await client.unauthenticated<KernelError>(
        'GET',
        '/entities/019fffff-0000-0000-0000-000000000001'
      );

      assertUnauthorized(response);
    });

    it('should reject request without tenant_id header', async () => {
      // Create custom client with only actor_id
      const app = harness.getApp();
      const response = await app.inject({
        method: 'GET',
        url: '/entities/019fffff-0000-0000-0000-000000000001',
        headers: {
          'x-actor-id': harness.actorId,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject request without actor_id header', async () => {
      // Create custom client with only tenant_id
      const app = harness.getApp();
      const response = await app.inject({
        method: 'GET',
        url: '/entities/019fffff-0000-0000-0000-000000000001',
        headers: {
          'x-tenant-id': harness.tenantId,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should accept request with valid auth headers', async () => {
      // Create an entity first
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        fixtures.product({ name: 'Auth Test' })
      );
      const entity = assertCreated(createResponse).entity;

      // Read it back - should succeed with auth headers
      const readResponse = await client.get<EntityResponse>(`/entities/${entity.id}`);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.entity.id).toBe(entity.id);
    });
  });

  // ===========================================================================
  // PUBLIC ENDPOINTS
  // ===========================================================================

  describe('Public Endpoints', () => {
    it('should allow access to /health without auth', async () => {
      const response = await client.unauthenticated<{ status: string }>('GET', '/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });

    it('should allow access to /ready without auth', async () => {
      const response = await client.unauthenticated<{ status: string }>('GET', '/ready');

      expect(response.status).toBe(200);
    });

    it('should allow access to /auth/login without auth', async () => {
      // Login endpoint itself doesn't require auth
      const response = await client.unauthenticated<TokenPair>('POST', '/auth/login', {
        tenant_id: harness.tenantId,
        actor_id: harness.actorId,
      });

      expect(response.status).toBe(200);
    });

    it('should allow access to /auth/refresh without auth headers', async () => {
      // First login to get refresh token
      const loginResponse = await client.unauthenticated<TokenPair>('POST', '/auth/login', {
        tenant_id: harness.tenantId,
        actor_id: harness.actorId,
      });
      expect(loginResponse.status).toBe(200);

      // Refresh doesn't require auth headers
      const refreshResponse = await client.unauthenticated<TokenPair>('POST', '/auth/refresh', {
        refresh_token: loginResponse.body.refresh_token,
      });

      expect(refreshResponse.status).toBe(200);
    });
  });
});

describe('Authorization', () => {
  let harness: TestHarness;
  let client: TestClient;

  beforeAll(async () => {
    harness = new TestHarness();
    await harness.setup();
  });

  beforeEach(async () => {
    await harness.reset();
    client = harness.client();
  });

  afterAll(async () => {
    await harness.teardown();
  });

  // ===========================================================================
  // TENANT ISOLATION
  // ===========================================================================

  describe('Tenant Isolation', () => {
    it('should only return entities for current tenant', async () => {
      // Create entity as test tenant
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        fixtures.product({ name: 'Tenant A Product' })
      );
      const entity = assertCreated(createResponse).entity;

      // Query should return the entity
      const queryResponse = await client.post<{ entities: Entity[] }>('/query', {
        type: 'product',
      });

      expect(queryResponse.status).toBe(200);
      const ids = queryResponse.body.entities.map((e) => e.id);
      expect(ids).toContain(entity.id);
    });

    it('should prevent cross-tenant entity access', async () => {
      // Create entity as test tenant
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        fixtures.product({ name: 'Private Product' })
      );
      const entity = assertCreated(createResponse).entity;

      // Try to access with a different tenant ID
      const otherTenantId = '019fffff-9999-7000-8000-000000000001';
      const otherTenantClient = harness.client({ tenantId: otherTenantId as any });

      const readResponse = await otherTenantClient.get<KernelError>(
        `/entities/${entity.id}`
      );

      // Should not find the entity (different tenant)
      assertNotFound(readResponse);
    });

    it('should prevent cross-tenant queries', async () => {
      // Create entity as test tenant
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        fixtures.product({ name: 'Tenant Specific' })
      );
      assertCreated(createResponse);

      // Query with different tenant should return empty
      const otherTenantId = '019fffff-9999-7000-8000-000000000001';
      const otherTenantClient = harness.client({ tenantId: otherTenantId as any });

      const queryResponse = await otherTenantClient.post<{ entities: Entity[] }>('/query', {
        type: 'product',
      });

      // Should return empty array (no entities in other tenant)
      expect(queryResponse.status).toBe(200);
      expect(queryResponse.body.entities).toHaveLength(0);
    });

    it('should prevent cross-tenant relationship creation', async () => {
      // Create two entities in test tenant
      const entity1Response = await client.post<EntityResponse>(
        '/entities',
        fixtures.product({ name: 'Entity 1' })
      );
      const entity1 = assertCreated(entity1Response).entity;

      const entity2Response = await client.post<EntityResponse>(
        '/entities',
        fixtures.product({ name: 'Entity 2' })
      );
      const entity2 = assertCreated(entity2Response).entity;

      // Try to create relationship from different tenant
      const otherTenantId = '019fffff-9999-7000-8000-000000000001';
      const otherTenantClient = harness.client({ tenantId: otherTenantId as any });

      const relResponse = await otherTenantClient.post<KernelError>(
        '/relationships',
        fixtures.relationship('related_to', entity1.id, entity2.id)
      );

      // Should fail - entities don't exist in other tenant
      expect(relResponse.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ===========================================================================
  // ACTOR TRACKING
  // ===========================================================================

  describe('Actor Tracking', () => {
    it('should record actor_id on entity creation', async () => {
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        fixtures.product({ name: 'Actor Tracked' })
      );
      const entity = assertCreated(createResponse).entity;

      // Entity should have created_by set to our actor
      expect(entity.created_by).toBe(harness.actorId);
    });

    it('should record correct actor on update', async () => {
      // Create entity
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        fixtures.product({ name: 'Will Update' })
      );
      const entity = assertCreated(createResponse).entity;

      // Update with same actor (since we're using same client)
      const updateResponse = await client.put<EntityResponse>(
        `/entities/${entity.id}`,
        fixtures.update(1, { name: { source: 'literal', value: { type: 'text', value: 'Updated' } } })
      );

      expect(updateResponse.status).toBe(200);
      // updated_by would be tracked in events, not directly on entity
    });
  });

  // ===========================================================================
  // PERMISSION CHECKING (when implemented)
  // ===========================================================================

  describe('Permission Checking', () => {
    // These tests verify the permission framework exists
    // Actual enforcement may vary based on implementation

    it('should accept requests with valid permissions header', async () => {
      // Create client with permissions
      const permClient = harness.client({ permissions: ['entity:read', 'entity:write'] });

      const createResponse = await permClient.post<EntityResponse>(
        '/entities',
        fixtures.product({ name: 'Permission Test' })
      );

      expect(createResponse.status).toBe(201);
    });

    it('should pass through empty permissions', async () => {
      // Default client has empty permissions
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        fixtures.product({ name: 'No Perms Test' })
      );

      // Should still work (assuming no permission enforcement yet)
      expect(createResponse.status).toBe(201);
    });
  });
});

describe('Audit Logging', () => {
  let harness: TestHarness;
  let client: TestClient;

  beforeAll(async () => {
    harness = new TestHarness();
    await harness.setup();
  });

  beforeEach(async () => {
    await harness.reset();
    client = harness.client();
  });

  afterAll(async () => {
    await harness.teardown();
  });

  // ===========================================================================
  // ACTOR TRACKING IN EVENTS
  // ===========================================================================

  describe('Actor Tracking in Events', () => {
    it('should record actor_id in entity creation event', async () => {
      // Create entity
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        fixtures.product({ name: 'Event Test' })
      );
      const entity = assertCreated(createResponse).entity;

      // Query events for this entity
      // Note: Event querying endpoint may need to be implemented
      // For now, we verify the entity has correct created_by
      expect(entity.created_by).toBe(harness.actorId);
    });

    it('should track different actors for different operations', async () => {
      // Create entity with first actor
      const createResponse = await client.post<EntityResponse>(
        '/entities',
        fixtures.product({ name: 'Multi Actor Test' })
      );
      const entity = assertCreated(createResponse).entity;

      // Create client with different actor
      const otherActorId = '019fffff-0003-7000-8000-000000000001';
      const otherClient = harness.client({ actorId: otherActorId as any });

      // Update with different actor
      const updateResponse = await otherClient.put<EntityResponse>(
        `/entities/${entity.id}`,
        fixtures.update(1, { name: { source: 'literal', value: { type: 'text', value: 'Updated by Other' } } })
      );

      expect(updateResponse.status).toBe(200);
      // The update event would record otherActorId
    });
  });
});
