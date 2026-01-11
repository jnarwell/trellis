/**
 * Integration tests for the event system.
 *
 * Tests the full flow: Entity CRUD -> Events emitted
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter, EventFactory } from '../emitter.js';
import type {
  KernelEvent,
  EntityCreatedEvent,
  EntityUpdatedEvent,
  EntityDeletedEvent,
  PropertyChangedEvent,
  TenantId,
  EntityId,
  ActorId,
  PropertyName,
} from '@trellis/kernel';

describe('Event System Integration', () => {
  let emitter: EventEmitter;
  let collectedEvents: KernelEvent[];
  let factory: EventFactory;

  const context = {
    tenantId: 'tenant-1' as TenantId,
    actorId: 'actor-1' as ActorId,
  };

  beforeEach(() => {
    collectedEvents = [];
    emitter = new EventEmitter();
    factory = new EventFactory(context);

    // Collect all events for verification
    emitter.onAll(async (event) => {
      collectedEvents.push(event);
    });
  });

  describe('Entity Create Flow', () => {
    it('should emit entity_created and property_changed events', async () => {
      // Simulate entity creation
      const entityId = 'entity-1' as EntityId;
      const properties = {
        name: {
          source: 'literal' as const,
          name: 'name' as PropertyName,
          value: { type: 'text' as const, value: 'Widget Pro' },
        },
        price: {
          source: 'literal' as const,
          name: 'price' as PropertyName,
          value: { type: 'number' as const, value: 99.99 },
        },
      };

      // Emit entity_created
      const createdEvent = factory.entityCreated({
        entityId,
        type: 'product',
        properties,
      });
      await emitter.emit(createdEvent);

      // Emit property_changed for each property
      for (const [name, prop] of Object.entries(properties)) {
        const propEvent = factory.propertyChanged({
          entityId,
          propertyName: name,
          changeType: 'added',
          previous: null,
          current: prop,
        });
        await emitter.emit(propEvent);
      }

      // Verify: 1 entity_created + 2 property_changed
      expect(collectedEvents).toHaveLength(3);

      const entityCreatedEvents = collectedEvents.filter(
        (e) => e.event_type === 'entity_created'
      ) as EntityCreatedEvent[];
      expect(entityCreatedEvents).toHaveLength(1);
      expect(entityCreatedEvents[0]!.entity_id).toBe(entityId);
      expect(entityCreatedEvents[0]!.payload.type).toBe('product');

      const propertyChangedEvents = collectedEvents.filter(
        (e) => e.event_type === 'property_changed'
      ) as PropertyChangedEvent[];
      expect(propertyChangedEvents).toHaveLength(2);
      expect(propertyChangedEvents.every((e) => e.payload.change_type === 'added')).toBe(true);
    });
  });

  describe('Entity Update Flow', () => {
    it('should emit entity_updated and property_changed events', async () => {
      const entityId = 'entity-1' as EntityId;

      // Emit entity_updated
      const updatedEvent = factory.entityUpdated({
        entityId,
        previousVersion: 1,
        newVersion: 2,
        changedProperties: ['price'],
        removedProperties: [],
      });
      await emitter.emit(updatedEvent);

      // Emit property_changed for modified price
      const propEvent = factory.propertyChanged({
        entityId,
        propertyName: 'price',
        changeType: 'modified',
        previous: { source: 'literal', name: 'price' as PropertyName, value: { type: 'number', value: 99.99 } },
        current: { source: 'literal', name: 'price' as PropertyName, value: { type: 'number', value: 109.99 } },
      });
      await emitter.emit(propEvent);

      // Verify
      expect(collectedEvents).toHaveLength(2);

      const entityUpdatedEvent = collectedEvents.find(
        (e) => e.event_type === 'entity_updated'
      ) as EntityUpdatedEvent;
      expect(entityUpdatedEvent.payload.previous_version).toBe(1);
      expect(entityUpdatedEvent.payload.new_version).toBe(2);

      const propertyChangedEvent = collectedEvents.find(
        (e) => e.event_type === 'property_changed'
      ) as PropertyChangedEvent;
      expect(propertyChangedEvent.payload.change_type).toBe('modified');
    });

    it('should emit property_changed for removed properties', async () => {
      const entityId = 'entity-1' as EntityId;

      const updatedEvent = factory.entityUpdated({
        entityId,
        previousVersion: 1,
        newVersion: 2,
        changedProperties: [],
        removedProperties: ['description'],
      });
      await emitter.emit(updatedEvent);

      const propEvent = factory.propertyChanged({
        entityId,
        propertyName: 'description',
        changeType: 'removed',
        previous: { source: 'literal', name: 'description' as PropertyName, value: { type: 'text', value: 'Old desc' } },
        current: null,
      });
      await emitter.emit(propEvent);

      const propertyChangedEvent = collectedEvents.find(
        (e) => e.event_type === 'property_changed'
      ) as PropertyChangedEvent;
      expect(propertyChangedEvent.payload.change_type).toBe('removed');
      expect(propertyChangedEvent.payload.current).toBeNull();
    });
  });

  describe('Entity Delete Flow', () => {
    it('should emit entity_deleted event with final state', async () => {
      const entityId = 'entity-1' as EntityId;
      const finalProperties = {
        name: { source: 'literal' as const, name: 'name' as PropertyName, value: { type: 'text' as const, value: 'Widget Pro' } },
      };

      const deletedEvent = factory.entityDeleted({
        entityId,
        type: 'product',
        finalVersion: 5,
        hardDelete: false,
        finalProperties,
      });
      await emitter.emit(deletedEvent);

      expect(collectedEvents).toHaveLength(1);

      const event = collectedEvents[0] as EntityDeletedEvent;
      expect(event.event_type).toBe('entity_deleted');
      expect(event.payload.type).toBe('product');
      expect(event.payload.final_version).toBe(5);
      expect(event.payload.hard_delete).toBe(false);
      expect(event.payload.final_properties).toEqual(finalProperties);
    });

    it('should indicate hard delete', async () => {
      const deletedEvent = factory.entityDeleted({
        entityId: 'entity-1' as EntityId,
        type: 'product',
        finalVersion: 3,
        hardDelete: true,
        finalProperties: {},
      });
      await emitter.emit(deletedEvent);

      const event = collectedEvents[0] as EntityDeletedEvent;
      expect(event.payload.hard_delete).toBe(true);
    });
  });

  describe('Event Handler Chaining', () => {
    it('should allow handlers to emit additional events', async () => {
      // Register a handler that emits a follow-up event
      emitter.on('entity_created', async (event) => {
        // Simulate audit handler that emits a custom event
        // In real code, this would be the staleness propagation
        const followUp = factory.propertyChanged({
          entityId: event.entity_id,
          propertyName: 'audit_created',
          changeType: 'added',
          previous: null,
          current: { source: 'literal', name: 'audit_created' as PropertyName, value: { type: 'boolean', value: true } },
        });
        await emitter.emit(followUp, { skipPersist: true });
      });

      const createdEvent = factory.entityCreated({
        entityId: 'entity-1' as EntityId,
        type: 'product',
        properties: {},
      });
      await emitter.emit(createdEvent);

      // Original event + follow-up from handler (order may vary due to async processing)
      expect(collectedEvents).toHaveLength(2);
      const eventTypes = collectedEvents.map((e) => e.event_type);
      expect(eventTypes).toContain('entity_created');
      expect(eventTypes).toContain('property_changed');
    });
  });

  describe('Multiple Subscribers', () => {
    it('should notify all subscribers', async () => {
      const subscriber1 = vi.fn().mockResolvedValue(undefined);
      const subscriber2 = vi.fn().mockResolvedValue(undefined);
      const subscriber3 = vi.fn().mockResolvedValue(undefined);

      emitter.on('entity_created', subscriber1);
      emitter.on('entity_created', subscriber2);
      emitter.onAll(subscriber3);

      const event = factory.entityCreated({
        entityId: 'entity-1' as EntityId,
        type: 'product',
        properties: {},
      });
      await emitter.emit(event);

      expect(subscriber1).toHaveBeenCalledWith(event);
      expect(subscriber2).toHaveBeenCalledWith(event);
      expect(subscriber3).toHaveBeenCalledWith(event);
    });
  });
});
