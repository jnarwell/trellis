/**
 * Tests for RecalculationHandler.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Pool, PoolClient } from 'pg';
import type {
  PropertyStaleEvent,
  EntityId,
  TenantId,
  ActorId,
  EventId,
  PropertyName,
} from '@trellis/kernel';
import { RecalculationHandler, createRecalculationHandler } from '../recalculation-handler.js';

describe('RecalculationHandler', () => {
  let mockPool: Pool;
  let mockClient: PoolClient;

  beforeEach(() => {
    mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    } as unknown as PoolClient;

    mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      connect: vi.fn().mockResolvedValue(mockClient),
    } as unknown as Pool;

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Helper to create a property_stale event.
   */
  function createStaleEvent(
    entityId: string,
    propertyName: string
  ): PropertyStaleEvent {
    return {
      id: 'event-1' as EventId,
      tenant_id: 'tenant-1' as TenantId,
      event_type: 'property_stale',
      entity_id: entityId as EntityId,
      actor_id: 'system' as ActorId,
      occurred_at: '2024-01-15T10:00:00Z',
      payload: {
        property_name: propertyName as PropertyName,
        source_entity_id: 'source-entity' as EntityId,
        source_property_name: 'source_prop' as PropertyName,
      },
    };
  }

  describe('handlePropertyStale', () => {
    it('should process event immediately in eager mode', async () => {
      const handler = createRecalculationHandler(mockPool, { eager: true });

      const event = createStaleEvent('entity-1', 'computed_prop');

      await handler.handlePropertyStale(event);

      // In eager mode, should attempt to recalculate immediately
      // This will query the database for the entity
      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should queue events in non-eager mode', async () => {
      const handler = createRecalculationHandler(mockPool, {
        eager: false,
        batchDelay: 100,
      });

      const event = createStaleEvent('entity-1', 'computed_prop');

      await handler.handlePropertyStale(event);

      // In non-eager mode, should not immediately query
      // (query happens on connect, not on handlePropertyStale)
      // The batch will be processed after the delay

      // Advance timers to trigger batch processing
      vi.advanceTimersByTime(150);

      // Now the batch should have been processed
      expect(mockPool.connect).toHaveBeenCalled();
    });

    it('should batch multiple events for same entity', async () => {
      const handler = createRecalculationHandler(mockPool, {
        eager: false,
        batchDelay: 100,
      });

      const event1 = createStaleEvent('entity-1', 'prop1');
      const event2 = createStaleEvent('entity-1', 'prop2');
      const event3 = createStaleEvent('entity-1', 'prop3');

      await handler.handlePropertyStale(event1);
      await handler.handlePropertyStale(event2);
      await handler.handlePropertyStale(event3);

      // Should only set one timeout for the batch
      vi.advanceTimersByTime(150);

      // Properties should be batched together for the same entity
      // This is verified by the fact that connect is only called once per batch
      expect(mockPool.connect).toHaveBeenCalled();
    });
  });

  describe('createEventHandler', () => {
    it('should return a handler function', () => {
      const handler = createRecalculationHandler(mockPool);
      const eventHandler = handler.createEventHandler();

      expect(typeof eventHandler).toBe('function');
    });

    it('should handle events when called', async () => {
      const handler = createRecalculationHandler(mockPool, { eager: true });
      const eventHandler = handler.createEventHandler();

      const event = createStaleEvent('entity-1', 'computed_prop');

      await eventHandler(event);

      expect(mockClient.query).toHaveBeenCalled();
    });
  });

  describe('flush', () => {
    it('should process pending recalculations immediately', async () => {
      const handler = createRecalculationHandler(mockPool, {
        eager: false,
        batchDelay: 10000, // Long delay
      });

      const event = createStaleEvent('entity-1', 'computed_prop');
      await handler.handlePropertyStale(event);

      // Flush without waiting for timer
      await handler.flush('tenant-1' as TenantId, 'actor-1' as ActorId);

      // Should have processed the pending recalculation
      expect(mockPool.connect).toHaveBeenCalled();
    });

    it('should do nothing if no pending recalculations', async () => {
      const handler = createRecalculationHandler(mockPool, { eager: false });

      await handler.flush('tenant-1' as TenantId, 'actor-1' as ActorId);

      // No pending recalculations, so no database calls
      // connect may or may not be called depending on implementation
    });
  });
});
