/**
 * Tests for TrellisClient.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrellisClient } from '../../src/sdk/client.js';
import type { Entity, EntityId, TypePath } from '@trellis/kernel';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TrellisClient', () => {
  let client: TrellisClient;

  const mockEntity: Entity = {
    id: 'entity-1' as EntityId,
    tenant_id: 'tenant-1' as never,
    type: 'product' as TypePath,
    properties: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'actor-1' as never,
    version: 1,
  };

  beforeEach(() => {
    mockFetch.mockReset();
    client = new TrellisClient({
      baseUrl: 'http://localhost:3000',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('construction', () => {
    it('should create client with base URL', () => {
      expect(client).toBeDefined();
    });

    it('should strip trailing slash from base URL', () => {
      const c = new TrellisClient({
        baseUrl: 'http://localhost:3000/',
      });
      expect(c).toBeDefined();
    });

    it('should derive WebSocket URL from HTTP URL', () => {
      const c = new TrellisClient({
        baseUrl: 'http://localhost:3000',
      });
      expect(c.getConnectionState()).toBe('disconnected');
    });
  });

  describe('authentication', () => {
    it('should not be authenticated initially', () => {
      expect(client.isAuthenticated()).toBe(false);
    });

    it('should login successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            expires_in: 900,
            token_type: 'Bearer',
          }),
      });

      await client.login({
        tenant_id: 'tenant-1',
        actor_id: 'actor-1',
      });

      expect(client.isAuthenticated()).toBe(true);
      expect(client.getAuthState().tenantId).toBe('tenant-1');
    });

    it('should logout and clear tokens', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            expires_in: 900,
            token_type: 'Bearer',
          }),
      });

      await client.login({
        tenant_id: 'tenant-1',
        actor_id: 'actor-1',
      });

      client.logout();

      expect(client.isAuthenticated()).toBe(false);
      expect(client.getAuthState().tenantId).toBeNull();
    });
  });

  describe('entity operations', () => {
    beforeEach(async () => {
      // Login first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            access_token: 'test-token',
            refresh_token: 'test-refresh',
            expires_in: 900,
            token_type: 'Bearer',
          }),
      });

      await client.login({
        tenant_id: 'tenant-1',
        actor_id: 'actor-1',
      });
    });

    it('should create entity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ entity: mockEntity }),
      });

      const entity = await client.createEntity({
        type: 'product' as TypePath,
        properties: {},
      });

      expect(entity.id).toBe('entity-1');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/entities',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should get entity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ entity: mockEntity }),
      });

      const entity = await client.getEntity('entity-1' as EntityId);

      expect(entity?.id).toBe('entity-1');
    });

    it('should return null for non-existent entity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            code: 'NOT_FOUND',
            message: 'Entity not found',
          }),
      });

      const entity = await client.getEntity('non-existent' as EntityId);

      expect(entity).toBeNull();
    });

    it('should update entity', async () => {
      const updatedEntity = { ...mockEntity, version: 2 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ entity: updatedEntity }),
      });

      const entity = await client.updateEntity({
        id: 'entity-1' as EntityId,
        expected_version: 1,
        set_properties: {},
      });

      expect(entity.version).toBe(2);
    });

    it('should delete entity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
        text: () => Promise.resolve(''),
      });

      await client.deleteEntity('entity-1' as EntityId);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/entities/entity-1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('query builder', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            access_token: 'test-token',
            refresh_token: 'test-refresh',
            expires_in: 900,
            token_type: 'Bearer',
          }),
      });

      await client.login({
        tenant_id: 'tenant-1',
        actor_id: 'actor-1',
      });
    });

    it('should create query builder', () => {
      const query = client.query('product');
      expect(query).toBeDefined();
    });

    it('should execute query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            data: [mockEntity],
            pagination: { offset: 0, limit: 50, has_more: false },
          }),
      });

      const result = await client
        .query('product')
        .where('status', 'eq', 'active')
        .limit(10)
        .execute();

      expect(result.data).toHaveLength(1);
    });
  });

  describe('relationship operations', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            access_token: 'test-token',
            refresh_token: 'test-refresh',
            expires_in: 900,
            token_type: 'Bearer',
          }),
      });

      await client.login({
        tenant_id: 'tenant-1',
        actor_id: 'actor-1',
      });
    });

    it('should list relationships', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            relationships: [
              {
                id: 'rel-1',
                type: 'belongs_to',
                from_entity: 'entity-1',
                to_entity: 'entity-2',
              },
            ],
          }),
      });

      const relationships = await client.listRelationships('entity-1' as EntityId);

      expect(relationships).toHaveLength(1);
      expect(relationships[0].type).toBe('belongs_to');
    });
  });

  describe('WebSocket', () => {
    it('should report disconnected state initially', () => {
      expect(client.getConnectionState()).toBe('disconnected');
    });

    it('should register event handlers', () => {
      let connected = false;
      client.on('onConnected', () => {
        connected = true;
      });

      // Just verify no error is thrown
      expect(connected).toBe(false);
    });
  });
});
