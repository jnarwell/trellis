/**
 * Tests for EventStore.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventStore } from '../store.js';
import type { Pool, PoolClient, QueryResult } from 'pg';
import type {
  EntityCreatedEvent,
  TenantId,
  EntityId,
  ActorId,
} from '@trellis/kernel';

describe('EventStore', () => {
  let store: EventStore;
  let mockPool: Pool;
  let mockClient: PoolClient;

  beforeEach(() => {
    mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: vi.fn(),
    } as unknown as PoolClient;

    mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      connect: vi.fn().mockResolvedValue(mockClient),
    } as unknown as Pool;

    store = new EventStore(mockPool);
  });

  describe('save', () => {
    it('should insert event into database', async () => {
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

      await store.save(event);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO events'),
        [
          event.id,
          event.tenant_id,
          event.event_type,
          event.entity_id,
          event.actor_id,
          event.occurred_at,
          JSON.stringify(event.payload),
        ]
      );
    });

    it('should handle events without entity_id', async () => {
      const event = {
        id: 'event-1' as any,
        tenant_id: 'tenant-1' as TenantId,
        event_type: 'relationship_created' as const,
        actor_id: 'actor-1' as ActorId,
        occurred_at: '2024-01-15T10:00:00Z',
        payload: {
          relationship_id: 'rel-1',
          type: 'belongs_to' as any,
          from_entity: 'entity-1' as EntityId,
          to_entity: 'entity-2' as EntityId,
          metadata: {},
        },
      };

      await store.save(event);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO events'),
        expect.arrayContaining([null]) // entity_id should be null
      );
    });
  });

  describe('saveMany', () => {
    it('should save multiple events in a transaction', async () => {
      const events: EntityCreatedEvent[] = [
        {
          id: 'event-1' as any,
          tenant_id: 'tenant-1' as TenantId,
          event_type: 'entity_created',
          entity_id: 'entity-1' as EntityId,
          actor_id: 'actor-1' as ActorId,
          occurred_at: '2024-01-15T10:00:00Z',
          payload: { type: 'product' as any, properties: {}, version: 1 },
        },
        {
          id: 'event-2' as any,
          tenant_id: 'tenant-1' as TenantId,
          event_type: 'entity_created',
          entity_id: 'entity-2' as EntityId,
          actor_id: 'actor-1' as ActorId,
          occurred_at: '2024-01-15T10:01:00Z',
          payload: { type: 'product' as any, properties: {}, version: 1 },
        },
      ];

      await store.saveMany(events);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      (mockClient.query as any).mockRejectedValueOnce(new Error('DB error'));

      const events: EntityCreatedEvent[] = [
        {
          id: 'event-1' as any,
          tenant_id: 'tenant-1' as TenantId,
          event_type: 'entity_created',
          entity_id: 'entity-1' as EntityId,
          actor_id: 'actor-1' as ActorId,
          occurred_at: '2024-01-15T10:00:00Z',
          payload: { type: 'product' as any, properties: {}, version: 1 },
        },
      ];

      // Reset mock to track new calls
      (mockClient.query as any).mockReset();
      (mockClient.query as any)
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('DB error')) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(store.saveMany(events)).rejects.toThrow('DB error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle empty array', async () => {
      await store.saveMany([]);

      expect(mockPool.connect).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should query events with filters', async () => {
      const mockRows = [
        {
          id: 'event-1',
          tenant_id: 'tenant-1',
          event_type: 'entity_created',
          entity_id: 'entity-1',
          actor_id: 'actor-1',
          occurred_at: new Date('2024-01-15T10:00:00Z'),
          payload: { type: 'product', properties: {}, version: 1 },
          created_at: new Date(),
        },
      ];

      (mockPool.query as any).mockResolvedValueOnce({ rows: mockRows });

      const result = await store.query({
        tenantId: 'tenant-1' as TenantId,
        eventTypes: ['entity_created'],
        entityId: 'entity-1' as EntityId,
        limit: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.event_type).toBe('entity_created');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining(['tenant-1', ['entity_created'], 'entity-1'])
      );
    });

    it('should use default limit', async () => {
      (mockPool.query as any).mockResolvedValueOnce({ rows: [] });

      await store.query({ tenantId: 'tenant-1' as TenantId });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([100, 0]) // Default limit and offset
      );
    });
  });

  describe('getByEntityId', () => {
    it('should fetch events for entity', async () => {
      const mockRows = [
        {
          id: 'event-1',
          tenant_id: 'tenant-1',
          event_type: 'entity_created',
          entity_id: 'entity-1',
          actor_id: 'actor-1',
          occurred_at: new Date('2024-01-15T10:00:00Z'),
          payload: { type: 'product', properties: {}, version: 1 },
          created_at: new Date(),
        },
      ];

      (mockPool.query as any).mockResolvedValueOnce({ rows: mockRows });

      const result = await store.getByEntityId(
        'tenant-1' as TenantId,
        'entity-1' as EntityId,
        50
      );

      expect(result).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY occurred_at DESC'),
        ['tenant-1', 'entity-1', 50]
      );
    });
  });

  describe('getSince', () => {
    it('should fetch events since timestamp', async () => {
      (mockPool.query as any).mockResolvedValueOnce({ rows: [] });

      await store.getSince(
        'tenant-1' as TenantId,
        '2024-01-15T10:00:00Z',
        25
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('occurred_at >'),
        ['tenant-1', '2024-01-15T10:00:00Z', 25]
      );
    });
  });
});
