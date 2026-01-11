/**
 * Tests for EventEmitter service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter, EventFactory } from '../emitter.js';
import type {
  EntityCreatedEvent,
  PropertyChangedEvent,
  EntityId,
  TenantId,
  ActorId,
} from '@trellis/kernel';
import type { IEventStore } from '../types.js';

describe('EventEmitter', () => {
  let emitter: EventEmitter;
  let mockStore: IEventStore;

  beforeEach(() => {
    mockStore = {
      save: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([]),
      getByEntityId: vi.fn().mockResolvedValue([]),
      getSince: vi.fn().mockResolvedValue([]),
    };
    emitter = new EventEmitter(mockStore);
  });

  describe('emit', () => {
    it('should persist event to store', async () => {
      const event: EntityCreatedEvent = {
        id: 'event-1' as any,
        tenant_id: 'tenant-1' as TenantId,
        event_type: 'entity_created',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as ActorId,
        occurred_at: '2024-01-15T10:00:00Z',
        payload: {
          type: 'product' as any,
          properties: {},
          version: 1,
        },
      };

      await emitter.emit(event);

      expect(mockStore.save).toHaveBeenCalledWith(event);
    });

    it('should notify type-specific handlers', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      emitter.on('entity_created', handler);

      const event: EntityCreatedEvent = {
        id: 'event-1' as any,
        tenant_id: 'tenant-1' as TenantId,
        event_type: 'entity_created',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as ActorId,
        occurred_at: '2024-01-15T10:00:00Z',
        payload: {
          type: 'product' as any,
          properties: {},
          version: 1,
        },
      };

      await emitter.emit(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should notify global handlers', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      emitter.onAll(handler);

      const event: EntityCreatedEvent = {
        id: 'event-1' as any,
        tenant_id: 'tenant-1' as TenantId,
        event_type: 'entity_created',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as ActorId,
        occurred_at: '2024-01-15T10:00:00Z',
        payload: {
          type: 'product' as any,
          properties: {},
          version: 1,
        },
      };

      await emitter.emit(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should skip persistence when skipPersist is true', async () => {
      const event: EntityCreatedEvent = {
        id: 'event-1' as any,
        tenant_id: 'tenant-1' as TenantId,
        event_type: 'entity_created',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as ActorId,
        occurred_at: '2024-01-15T10:00:00Z',
        payload: {
          type: 'product' as any,
          properties: {},
          version: 1,
        },
      };

      await emitter.emit(event, { skipPersist: true });

      expect(mockStore.save).not.toHaveBeenCalled();
    });

    it('should skip handlers when skipHandlers is true', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      emitter.on('entity_created', handler);

      const event: EntityCreatedEvent = {
        id: 'event-1' as any,
        tenant_id: 'tenant-1' as TenantId,
        event_type: 'entity_created',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as ActorId,
        occurred_at: '2024-01-15T10:00:00Z',
        payload: {
          type: 'product' as any,
          properties: {},
          version: 1,
        },
      };

      await emitter.emit(event, { skipHandlers: true });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle handler errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
      emitter.on('entity_created', errorHandler);

      const event: EntityCreatedEvent = {
        id: 'event-1' as any,
        tenant_id: 'tenant-1' as TenantId,
        event_type: 'entity_created',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as ActorId,
        occurred_at: '2024-01-15T10:00:00Z',
        payload: {
          type: 'product' as any,
          properties: {},
          version: 1,
        },
      };

      // Should not throw
      await emitter.emit(event);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('on', () => {
    it('should return unsubscribe function', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const unsubscribe = emitter.on('entity_created', handler);

      const event: EntityCreatedEvent = {
        id: 'event-1' as any,
        tenant_id: 'tenant-1' as TenantId,
        event_type: 'entity_created',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as ActorId,
        occurred_at: '2024-01-15T10:00:00Z',
        payload: {
          type: 'product' as any,
          properties: {},
          version: 1,
        },
      };

      await emitter.emit(event);
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      await emitter.emit(event);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not call handlers for different event types', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      emitter.on('entity_created', handler);

      const event: PropertyChangedEvent = {
        id: 'event-1' as any,
        tenant_id: 'tenant-1' as TenantId,
        event_type: 'property_changed',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as ActorId,
        occurred_at: '2024-01-15T10:00:00Z',
        payload: {
          property_name: 'name' as any,
          change_type: 'modified',
          previous: null,
          current: null,
        },
      };

      await emitter.emit(event);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('onAll', () => {
    it('should receive all event types', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      emitter.onAll(handler);

      const createdEvent: EntityCreatedEvent = {
        id: 'event-1' as any,
        tenant_id: 'tenant-1' as TenantId,
        event_type: 'entity_created',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as ActorId,
        occurred_at: '2024-01-15T10:00:00Z',
        payload: {
          type: 'product' as any,
          properties: {},
          version: 1,
        },
      };

      const changedEvent: PropertyChangedEvent = {
        id: 'event-2' as any,
        tenant_id: 'tenant-1' as TenantId,
        event_type: 'property_changed',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as ActorId,
        occurred_at: '2024-01-15T10:00:00Z',
        payload: {
          property_name: 'name' as any,
          change_type: 'modified',
          previous: null,
          current: null,
        },
      };

      await emitter.emit(createdEvent);
      await emitter.emit(changedEvent);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith(createdEvent);
      expect(handler).toHaveBeenCalledWith(changedEvent);
    });
  });
});

describe('EventFactory', () => {
  const context = {
    tenantId: 'tenant-1' as TenantId,
    actorId: 'actor-1' as ActorId,
  };
  const factory = new EventFactory(context);

  describe('entityCreated', () => {
    it('should create entity_created event with correct structure', () => {
      const event = factory.entityCreated({
        entityId: 'entity-1' as EntityId,
        type: 'product',
        properties: { name: { source: 'literal', name: 'name', value: { type: 'text', value: 'Test' } } },
      });

      expect(event.event_type).toBe('entity_created');
      expect(event.tenant_id).toBe(context.tenantId);
      expect(event.actor_id).toBe(context.actorId);
      expect(event.entity_id).toBe('entity-1');
      expect(event.payload.type).toBe('product');
      expect(event.payload.version).toBe(1);
      expect(event.id).toBeDefined();
      expect(event.occurred_at).toBeDefined();
    });
  });

  describe('entityUpdated', () => {
    it('should create entity_updated event with correct structure', () => {
      const event = factory.entityUpdated({
        entityId: 'entity-1' as EntityId,
        previousVersion: 1,
        newVersion: 2,
        changedProperties: ['name', 'price'],
        removedProperties: ['description'],
      });

      expect(event.event_type).toBe('entity_updated');
      expect(event.payload.previous_version).toBe(1);
      expect(event.payload.new_version).toBe(2);
      expect(event.payload.changed_properties).toEqual(['name', 'price']);
      expect(event.payload.removed_properties).toEqual(['description']);
    });
  });

  describe('propertyChanged', () => {
    it('should create property_changed event for addition', () => {
      const event = factory.propertyChanged({
        entityId: 'entity-1' as EntityId,
        propertyName: 'name',
        changeType: 'added',
        previous: null,
        current: { source: 'literal', name: 'name', value: { type: 'text', value: 'Test' } },
      });

      expect(event.event_type).toBe('property_changed');
      expect(event.payload.property_name).toBe('name');
      expect(event.payload.change_type).toBe('added');
      expect(event.payload.previous).toBeNull();
      expect(event.payload.current).toBeDefined();
    });

    it('should create property_changed event for modification', () => {
      const event = factory.propertyChanged({
        entityId: 'entity-1' as EntityId,
        propertyName: 'price',
        changeType: 'modified',
        previous: { source: 'literal', name: 'price', value: { type: 'number', value: 99.99 } },
        current: { source: 'literal', name: 'price', value: { type: 'number', value: 109.99 } },
      });

      expect(event.payload.change_type).toBe('modified');
      expect(event.payload.previous).toBeDefined();
      expect(event.payload.current).toBeDefined();
    });

    it('should create property_changed event for removal', () => {
      const event = factory.propertyChanged({
        entityId: 'entity-1' as EntityId,
        propertyName: 'description',
        changeType: 'removed',
        previous: { source: 'literal', name: 'description', value: { type: 'text', value: 'Old' } },
        current: null,
      });

      expect(event.payload.change_type).toBe('removed');
      expect(event.payload.previous).toBeDefined();
      expect(event.payload.current).toBeNull();
    });
  });
});
