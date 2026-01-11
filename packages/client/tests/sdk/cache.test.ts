/**
 * Tests for EntityCache.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EntityCache } from '../../src/state/cache.js';
import type { Entity, EntityId, KernelEvent, TypePath } from '@trellis/kernel';

describe('EntityCache', () => {
  let cache: EntityCache;

  const createEntity = (id: string, type = 'product'): Entity => ({
    id: id as EntityId,
    tenant_id: 'tenant-1' as never,
    type: type as TypePath,
    properties: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'actor-1' as never,
    version: 1,
  });

  beforeEach(() => {
    cache = new EntityCache({
      defaultTtl: 60000,
      maxEntries: 10,
      enabled: true,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('entity caching', () => {
    it('should cache and retrieve an entity', () => {
      const entity = createEntity('entity-1');
      cache.setEntity(entity);

      const cached = cache.getEntity('entity-1' as EntityId);
      expect(cached).toEqual(entity);
    });

    it('should return null for non-existent entity', () => {
      const cached = cache.getEntity('non-existent' as EntityId);
      expect(cached).toBeNull();
    });

    it('should expire entries after TTL', () => {
      const entity = createEntity('entity-1');
      cache.setEntity(entity, 1000); // 1 second TTL

      expect(cache.getEntity('entity-1' as EntityId)).toEqual(entity);

      vi.advanceTimersByTime(1001);

      expect(cache.getEntity('entity-1' as EntityId)).toBeNull();
    });

    it('should invalidate an entity', () => {
      const entity = createEntity('entity-1');
      cache.setEntity(entity);

      cache.invalidateEntity('entity-1' as EntityId);

      expect(cache.getEntity('entity-1' as EntityId)).toBeNull();
    });

    it('should check if entity exists', () => {
      const entity = createEntity('entity-1');
      cache.setEntity(entity);

      expect(cache.hasEntity('entity-1' as EntityId)).toBe(true);
      expect(cache.hasEntity('entity-2' as EntityId)).toBe(false);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entries when max is reached', () => {
      // Add 10 entities (max)
      for (let i = 0; i < 10; i++) {
        cache.setEntity(createEntity(`entity-${i}`));
      }

      // Add one more - this should trigger eviction
      cache.setEntity(createEntity('entity-10'));

      // We should have 10 entries total (oldest evicted)
      const stats = cache.getStats();
      expect(stats.entityCount).toBe(10);

      // Newest should be cached
      expect(cache.getEntity('entity-10' as EntityId)).toBeDefined();
    });

    it('should update access order on get', () => {
      for (let i = 0; i < 10; i++) {
        cache.setEntity(createEntity(`entity-${i}`));
      }

      // Access entity-0, making it most recently used
      cache.getEntity('entity-0' as EntityId);

      // Add new entity
      cache.setEntity(createEntity('entity-10'));

      // entity-1 should be evicted (oldest not recently accessed)
      expect(cache.getEntity('entity-0' as EntityId)).toBeDefined();
      expect(cache.getEntity('entity-1' as EntityId)).toBeNull();
    });
  });

  describe('query caching', () => {
    it('should cache and retrieve query results', () => {
      const result = {
        data: [createEntity('entity-1')],
        pagination: { offset: 0, limit: 50, hasMore: false },
      };

      cache.setQuery('product', { status: 'active' }, result);

      const cached = cache.getQuery('product', { status: 'active' });
      expect(cached).toEqual(result);
    });

    it('should return null for non-existent query', () => {
      const cached = cache.getQuery('product', { status: 'unknown' });
      expect(cached).toBeNull();
    });

    it('should also cache entities from query results', () => {
      const entity = createEntity('entity-1');
      const result = {
        data: [entity],
        pagination: { offset: 0, limit: 50, hasMore: false },
      };

      cache.setQuery('product', {}, result);

      expect(cache.getEntity('entity-1' as EntityId)).toEqual(entity);
    });

    it('should invalidate queries for a type', () => {
      cache.setQuery('product', { status: 'active' }, {
        data: [],
        pagination: { offset: 0, limit: 50, hasMore: false },
      });
      cache.setQuery('product', { status: 'inactive' }, {
        data: [],
        pagination: { offset: 0, limit: 50, hasMore: false },
      });
      cache.setQuery('order', { status: 'pending' }, {
        data: [],
        pagination: { offset: 0, limit: 50, hasMore: false },
      });

      cache.invalidateQueriesForType('product');

      expect(cache.getQuery('product', { status: 'active' })).toBeNull();
      expect(cache.getQuery('product', { status: 'inactive' })).toBeNull();
      expect(cache.getQuery('order', { status: 'pending' })).toBeDefined();
    });
  });

  describe('event handling', () => {
    it('should invalidate entity on entity_updated event', () => {
      const entity = createEntity('entity-1');
      cache.setEntity(entity);

      cache.handleEvent({
        id: 'event-1' as never,
        tenant_id: 'tenant-1' as never,
        event_type: 'entity_updated',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as never,
        occurred_at: '2024-01-01T00:00:00Z',
        payload: {
          previous_version: 1,
          new_version: 2,
          changed_properties: ['name'],
          removed_properties: [],
        },
      } as KernelEvent);

      expect(cache.getEntity('entity-1' as EntityId)).toBeNull();
    });

    it('should invalidate queries on entity_created event', () => {
      cache.setQuery('product', {}, {
        data: [],
        pagination: { offset: 0, limit: 50, hasMore: false },
      });

      cache.handleEvent({
        id: 'event-1' as never,
        tenant_id: 'tenant-1' as never,
        event_type: 'entity_created',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as never,
        occurred_at: '2024-01-01T00:00:00Z',
        payload: {
          type: 'product' as TypePath,
          properties: {},
          version: 1,
        },
      } as KernelEvent);

      expect(cache.getQuery('product', {})).toBeNull();
    });

    it('should invalidate on entity_deleted event', () => {
      const entity = createEntity('entity-1');
      cache.setEntity(entity);
      cache.setQuery('product', {}, {
        data: [entity],
        pagination: { offset: 0, limit: 50, hasMore: false },
      });

      cache.handleEvent({
        id: 'event-1' as never,
        tenant_id: 'tenant-1' as never,
        event_type: 'entity_deleted',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as never,
        occurred_at: '2024-01-01T00:00:00Z',
        payload: {
          type: 'product' as TypePath,
          final_version: 1,
          hard_delete: false,
          final_properties: {},
        },
      } as KernelEvent);

      expect(cache.getEntity('entity-1' as EntityId)).toBeNull();
      expect(cache.getQuery('product', {})).toBeNull();
    });

    it('should invalidate on property_changed event', () => {
      const entity = createEntity('entity-1');
      cache.setEntity(entity);

      cache.handleEvent({
        id: 'event-1' as never,
        tenant_id: 'tenant-1' as never,
        event_type: 'property_changed',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as never,
        occurred_at: '2024-01-01T00:00:00Z',
        payload: {
          property_name: 'name' as never,
          change_type: 'modified',
          previous: null,
          current: null,
        },
      } as KernelEvent);

      expect(cache.getEntity('entity-1' as EntityId)).toBeNull();
    });
  });

  describe('cache management', () => {
    it('should clear all cache', () => {
      cache.setEntity(createEntity('entity-1'));
      cache.setQuery('product', {}, {
        data: [],
        pagination: { offset: 0, limit: 50, hasMore: false },
      });

      cache.clear();

      expect(cache.getEntity('entity-1' as EntityId)).toBeNull();
      expect(cache.getQuery('product', {})).toBeNull();
    });

    it('should return cache stats', () => {
      cache.setEntity(createEntity('entity-1'));
      cache.setEntity(createEntity('entity-2'));
      cache.setQuery('product', {}, {
        data: [],
        pagination: { offset: 0, limit: 50, hasMore: false },
      });

      const stats = cache.getStats();

      expect(stats.entityCount).toBe(2);
      expect(stats.queryCount).toBe(1);
      expect(stats.maxEntries).toBe(10);
    });
  });

  describe('disabled cache', () => {
    it('should not cache when disabled', () => {
      const disabledCache = new EntityCache({ enabled: false });
      const entity = createEntity('entity-1');

      disabledCache.setEntity(entity);

      expect(disabledCache.getEntity('entity-1' as EntityId)).toBeNull();
      expect(disabledCache.isEnabled()).toBe(false);
    });
  });
});
