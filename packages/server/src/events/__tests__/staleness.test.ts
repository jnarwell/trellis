/**
 * Tests for staleness propagation handler.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStalenessHandler, registerStalenessHandler } from '../handlers/staleness.js';
import { EventEmitter } from '../emitter.js';
import type { StalenessAdapter } from '../staleness-adapter.js';
import type { PropertyChangedEvent, TenantId, EntityId, ActorId, PropertyName } from '@trellis/kernel';

describe('Staleness Handler', () => {
  let emitter: EventEmitter;
  let mockAdapter: StalenessAdapter;

  beforeEach(() => {
    emitter = new EventEmitter();

    mockAdapter = {
      getDependents: vi.fn().mockResolvedValue([]),
      markStale: vi.fn().mockResolvedValue(undefined),
      markStaleMany: vi.fn().mockResolvedValue(undefined),
      getStaleProperties: vi.fn().mockResolvedValue([]),
    } as unknown as StalenessAdapter;
  });

  describe('createStalenessHandler', () => {
    it('should not propagate for removed properties', async () => {
      const handler = createStalenessHandler(mockAdapter, emitter);

      const event: PropertyChangedEvent = {
        id: 'event-1' as any,
        tenant_id: 'tenant-1' as TenantId,
        event_type: 'property_changed',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as ActorId,
        occurred_at: '2024-01-15T10:00:00Z',
        payload: {
          property_name: 'name' as PropertyName,
          change_type: 'removed',
          previous: { source: 'literal', name: 'name' as PropertyName, value: { type: 'text', value: 'Old' } },
          current: null,
        },
      };

      await handler(event);

      expect(mockAdapter.getDependents).not.toHaveBeenCalled();
    });

    it('should propagate staleness for modified properties', async () => {
      // Setup: property B depends on property A
      (mockAdapter.getDependents as any).mockResolvedValueOnce([
        { entityId: 'entity-2' as EntityId, propertyName: 'computed_b' as PropertyName },
      ]).mockResolvedValue([]);

      const handler = createStalenessHandler(mockAdapter, emitter);

      const event: PropertyChangedEvent = {
        id: 'event-1' as any,
        tenant_id: 'tenant-1' as TenantId,
        event_type: 'property_changed',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as ActorId,
        occurred_at: '2024-01-15T10:00:00Z',
        payload: {
          property_name: 'price' as PropertyName,
          change_type: 'modified',
          previous: { source: 'literal', name: 'price' as PropertyName, value: { type: 'number', value: 99.99 } },
          current: { source: 'literal', name: 'price' as PropertyName, value: { type: 'number', value: 109.99 } },
        },
      };

      await handler(event);

      expect(mockAdapter.getDependents).toHaveBeenCalledWith(
        'tenant-1',
        'entity-1',
        'price'
      );
      expect(mockAdapter.markStale).toHaveBeenCalledWith(
        'tenant-1',
        'entity-2',
        'computed_b'
      );
    });

    it('should propagate staleness for added properties', async () => {
      (mockAdapter.getDependents as any).mockResolvedValue([]);

      const handler = createStalenessHandler(mockAdapter, emitter);

      const event: PropertyChangedEvent = {
        id: 'event-1' as any,
        tenant_id: 'tenant-1' as TenantId,
        event_type: 'property_changed',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as ActorId,
        occurred_at: '2024-01-15T10:00:00Z',
        payload: {
          property_name: 'name' as PropertyName,
          change_type: 'added',
          previous: null,
          current: { source: 'literal', name: 'name' as PropertyName, value: { type: 'text', value: 'New' } },
        },
      };

      await handler(event);

      expect(mockAdapter.getDependents).toHaveBeenCalled();
    });

    it('should propagate through multiple levels', async () => {
      // A -> B -> C (chain of dependencies)
      (mockAdapter.getDependents as any)
        .mockResolvedValueOnce([
          { entityId: 'entity-2' as EntityId, propertyName: 'b' as PropertyName },
        ])
        .mockResolvedValueOnce([
          { entityId: 'entity-3' as EntityId, propertyName: 'c' as PropertyName },
        ])
        .mockResolvedValue([]);

      const handler = createStalenessHandler(mockAdapter, emitter);

      const event: PropertyChangedEvent = {
        id: 'event-1' as any,
        tenant_id: 'tenant-1' as TenantId,
        event_type: 'property_changed',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as ActorId,
        occurred_at: '2024-01-15T10:00:00Z',
        payload: {
          property_name: 'a' as PropertyName,
          change_type: 'modified',
          previous: null,
          current: null,
        },
      };

      await handler(event);

      expect(mockAdapter.markStale).toHaveBeenCalledWith('tenant-1', 'entity-2', 'b');
      expect(mockAdapter.markStale).toHaveBeenCalledWith('tenant-1', 'entity-3', 'c');
    });
  });

  describe('registerStalenessHandler', () => {
    it('should register handler and return unsubscribe function', () => {
      const unsubscribe = registerStalenessHandler(emitter, mockAdapter);

      expect(typeof unsubscribe).toBe('function');

      // Should be able to call unsubscribe without error
      unsubscribe();
    });
  });
});
