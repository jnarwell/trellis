/**
 * Trellis Server - Recalculation Handler
 *
 * Handles property_stale events by recalculating computed properties.
 * Implements a hybrid strategy: immediate for small batches, queued for large.
 */

import type { Pool } from 'pg';
import {
  type PropertyStaleEvent,
  type EntityId,
  type TenantId,
  type ActorId,
  type PropertyName,
} from '@trellis/kernel';
import type { EventHandler, IEventEmitter } from '../events/types.js';
import { ComputationService } from './computation-service.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for recalculation behavior.
 */
export interface RecalculationConfig {
  /** Maximum events to process immediately (beyond this, defer to batch) */
  immediateThreshold: number;
  /** Whether to process events immediately or defer all to batch */
  eager: boolean;
  /** Delay before batch processing (ms) */
  batchDelay: number;
}

/**
 * Default configuration.
 */
const DEFAULT_CONFIG: RecalculationConfig = {
  immediateThreshold: 10,
  eager: true,
  batchDelay: 100,
};

// =============================================================================
// HANDLER
// =============================================================================

/**
 * Recalculation handler for property_stale events.
 *
 * When a property becomes stale (due to dependency change), this handler
 * recalculates the computed value and updates the entity.
 *
 * Strategies:
 * - Eager: Recalculate immediately on each event (default)
 * - Lazy: Defer recalculation until read (not implemented here)
 * - Batched: Accumulate events and process in batch (for bulk operations)
 */
export class RecalculationHandler {
  private pendingRecalculations = new Map<
    string, // entityId
    Set<PropertyName>
  >();
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly pool: Pool,
    private readonly config: RecalculationConfig = DEFAULT_CONFIG
  ) {}

  /**
   * Handle a property_stale event.
   */
  async handlePropertyStale(event: PropertyStaleEvent): Promise<void> {
    const entityId = event.entity_id as EntityId;
    const propertyName = event.payload.property_name as PropertyName;
    const tenantId = event.tenant_id as TenantId;
    const actorId = event.actor_id as ActorId;

    if (this.config.eager) {
      // Immediate recalculation
      await this.recalculateNow(tenantId, actorId, entityId, propertyName);
    } else {
      // Defer to batch
      this.queueRecalculation(tenantId, actorId, entityId, propertyName);
    }
  }

  /**
   * Recalculate a property immediately.
   */
  private async recalculateNow(
    tenantId: TenantId,
    actorId: ActorId,
    entityId: EntityId,
    propertyName: PropertyName
  ): Promise<void> {
    const service = new ComputationService(this.pool, tenantId, actorId);

    try {
      const result = await service.recalculateProperty(entityId, propertyName);

      if (!result.success) {
        console.warn(
          `Recalculation failed for ${entityId}.${propertyName}: ${result.error}`
        );
      }
    } catch (error) {
      console.error(
        `Error recalculating ${entityId}.${propertyName}:`,
        error
      );
    }
  }

  /**
   * Queue a recalculation for batch processing.
   */
  private queueRecalculation(
    tenantId: TenantId,
    actorId: ActorId,
    entityId: EntityId,
    propertyName: PropertyName
  ): void {
    // Group by entity
    const key = `${tenantId}:${entityId}`;
    let properties = this.pendingRecalculations.get(key);
    if (!properties) {
      properties = new Set();
      this.pendingRecalculations.set(key, properties);
    }
    properties.add(propertyName);

    // Schedule batch processing
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.processBatch(tenantId, actorId);
      }, this.config.batchDelay);
    }
  }

  /**
   * Process all pending recalculations.
   */
  private async processBatch(
    tenantId: TenantId,
    actorId: ActorId
  ): Promise<void> {
    this.batchTimeout = null;

    const entries = [...this.pendingRecalculations.entries()];
    this.pendingRecalculations.clear();

    const service = new ComputationService(this.pool, tenantId, actorId);

    for (const [key, properties] of entries) {
      // Extract entityId from key (format: tenantId:entityId)
      const entityId = key.split(':')[1] as EntityId;

      try {
        await service.recalculateProperties(entityId, [...properties]);
      } catch (error) {
        console.error(`Batch recalculation failed for ${entityId}:`, error);
      }
    }
  }

  /**
   * Create an event handler function for use with EventEmitter.
   */
  createEventHandler(): EventHandler<PropertyStaleEvent> {
    return (event: PropertyStaleEvent) => this.handlePropertyStale(event);
  }

  /**
   * Flush any pending recalculations immediately.
   * Useful for testing or graceful shutdown.
   */
  async flush(tenantId: TenantId, actorId: ActorId): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.pendingRecalculations.size > 0) {
      await this.processBatch(tenantId, actorId);
    }
  }
}

/**
 * Create a RecalculationHandler instance.
 */
export function createRecalculationHandler(
  pool: Pool,
  config?: Partial<RecalculationConfig>
): RecalculationHandler {
  return new RecalculationHandler(pool, { ...DEFAULT_CONFIG, ...config });
}

/**
 * Register the recalculation handler with an event emitter.
 */
export function registerRecalculationHandler(
  emitter: IEventEmitter,
  pool: Pool,
  config?: Partial<RecalculationConfig>
): RecalculationHandler {
  const handler = createRecalculationHandler(pool, config);
  emitter.on('property_stale', handler.createEventHandler());
  return handler;
}
