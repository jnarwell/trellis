/**
 * Trellis Server - Event Store
 *
 * Persists events to the database for audit trail and replay.
 * Events are immutable once stored (per ADR-006).
 */

import type { Pool, PoolClient } from 'pg';
import type {
  KernelEvent,
  EventType,
  TenantId,
  EntityId,
  ActorId,
} from '@trellis/kernel';
import type { IEventStore, EventQueryOptions } from './types.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Event row from database.
 */
interface EventRow {
  id: string;
  tenant_id: string;
  event_type: string;
  entity_id: string | null;
  actor_id: string;
  occurred_at: Date;
  payload: Record<string, unknown>;
  created_at: Date;
}

// =============================================================================
// EVENT STORE
// =============================================================================

/**
 * PostgreSQL event store implementation.
 */
export class EventStore implements IEventStore {
  constructor(private readonly pool: Pool) {}

  /**
   * Save an event to the database.
   * Events are immutable once stored.
   */
  async save(event: KernelEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO events (id, tenant_id, event_type, entity_id, actor_id, occurred_at, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        event.id,
        event.tenant_id,
        event.event_type,
        event.entity_id ?? null,
        event.actor_id,
        event.occurred_at,
        JSON.stringify(event.payload),
      ]
    );
  }

  /**
   * Save multiple events in a transaction.
   */
  async saveMany(events: readonly KernelEvent[]): Promise<void> {
    if (events.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const event of events) {
        await client.query(
          `INSERT INTO events (id, tenant_id, event_type, entity_id, actor_id, occurred_at, payload, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            event.id,
            event.tenant_id,
            event.event_type,
            event.entity_id ?? null,
            event.actor_id,
            event.occurred_at,
            JSON.stringify(event.payload),
          ]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Query events with filters.
   */
  async query(options: EventQueryOptions): Promise<readonly KernelEvent[]> {
    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [options.tenantId];
    let paramIndex = 2;

    if (options.eventTypes && options.eventTypes.length > 0) {
      conditions.push(`event_type = ANY($${paramIndex})`);
      params.push(options.eventTypes);
      paramIndex++;
    }

    if (options.entityId) {
      conditions.push(`entity_id = $${paramIndex}`);
      params.push(options.entityId);
      paramIndex++;
    }

    if (options.actorId) {
      conditions.push(`actor_id = $${paramIndex}`);
      params.push(options.actorId);
      paramIndex++;
    }

    if (options.after) {
      conditions.push(`occurred_at > $${paramIndex}`);
      params.push(options.after);
      paramIndex++;
    }

    if (options.before) {
      conditions.push(`occurred_at < $${paramIndex}`);
      params.push(options.before);
      paramIndex++;
    }

    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;

    const sql = `
      SELECT id, tenant_id, event_type, entity_id, actor_id, occurred_at, payload, created_at
      FROM events
      WHERE ${conditions.join(' AND ')}
      ORDER BY occurred_at ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await this.pool.query<EventRow>(sql, params);
    return result.rows.map(rowToEvent);
  }

  /**
   * Get events for a specific entity.
   */
  async getByEntityId(
    tenantId: TenantId,
    entityId: EntityId,
    limit = 100
  ): Promise<readonly KernelEvent[]> {
    const result = await this.pool.query<EventRow>(
      `SELECT id, tenant_id, event_type, entity_id, actor_id, occurred_at, payload, created_at
       FROM events
       WHERE tenant_id = $1 AND entity_id = $2
       ORDER BY occurred_at DESC
       LIMIT $3`,
      [tenantId, entityId, limit]
    );

    return result.rows.map(rowToEvent);
  }

  /**
   * Get events since a specific timestamp.
   */
  async getSince(
    tenantId: TenantId,
    since: string,
    limit = 100
  ): Promise<readonly KernelEvent[]> {
    const result = await this.pool.query<EventRow>(
      `SELECT id, tenant_id, event_type, entity_id, actor_id, occurred_at, payload, created_at
       FROM events
       WHERE tenant_id = $1 AND occurred_at > $2
       ORDER BY occurred_at ASC
       LIMIT $3`,
      [tenantId, since, limit]
    );

    return result.rows.map(rowToEvent);
  }

  /**
   * Get the latest events for polling.
   */
  async getLatest(
    tenantId: TenantId,
    limit = 50
  ): Promise<readonly KernelEvent[]> {
    const result = await this.pool.query<EventRow>(
      `SELECT id, tenant_id, event_type, entity_id, actor_id, occurred_at, payload, created_at
       FROM events
       WHERE tenant_id = $1
       ORDER BY occurred_at DESC
       LIMIT $2`,
      [tenantId, limit]
    );

    return result.rows.map(rowToEvent);
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Convert database row to KernelEvent.
 */
function rowToEvent(row: EventRow): KernelEvent {
  const base = {
    id: row.id,
    tenant_id: row.tenant_id,
    event_type: row.event_type as EventType,
    entity_id: row.entity_id ?? undefined,
    actor_id: row.actor_id,
    occurred_at: row.occurred_at.toISOString(),
    payload: row.payload,
  };

  // The type assertion is safe because we're reconstructing from the database
  return base as KernelEvent;
}

/**
 * Create an EventStore instance.
 */
export function createEventStore(pool: Pool): EventStore {
  return new EventStore(pool);
}
