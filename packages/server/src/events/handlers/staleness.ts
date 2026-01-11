/**
 * Trellis Server - Staleness Handler
 *
 * Handles property_changed events by propagating staleness
 * to all dependent computed properties.
 */

import { uuidv7 } from 'uuidv7';
import {
  propagateStaleness,
  type PropertyChangedEvent,
  type PropertyStaleEvent,
  type EventId,
  type TenantId,
  type EntityId,
  type PropertyName,
  type ExprPropertyStaleEvent,
} from '@trellis/kernel';
import type { StalenessAdapter } from '../staleness-adapter.js';
import type { EventEmitter } from '../emitter.js';
import type { EventHandler } from '../types.js';

// =============================================================================
// HANDLER
// =============================================================================

/**
 * Creates a handler that propagates staleness when properties change.
 *
 * When a property_changed event is received, this handler:
 * 1. Uses the kernel's propagateStaleness to find all dependent properties
 * 2. Marks them as stale in the database
 * 3. Emits property_stale events for each
 *
 * The kernel handles the BFS traversal and cycle detection.
 */
export function createStalenessHandler(
  adapter: StalenessAdapter,
  emitter: EventEmitter
): EventHandler<PropertyChangedEvent> {
  return async (event: PropertyChangedEvent): Promise<void> => {
    // Only propagate staleness for modifications and additions
    // Removals don't need staleness propagation (dependents will error on next eval)
    if (event.payload.change_type === 'removed') {
      return;
    }

    // Create a wrapper that converts kernel stale events to server format
    const staleEmitter = {
      async emit(kernelEvent: ExprPropertyStaleEvent): Promise<void> {
        // Convert kernel's PropertyStaleEvent to the types/event.ts format
        const serverEvent: PropertyStaleEvent = {
          id: uuidv7() as EventId,
          tenant_id: kernelEvent.tenant_id as TenantId,
          event_type: 'property_stale',
          entity_id: kernelEvent.entity_id as EntityId,
          actor_id: kernelEvent.actor_id as string as import('@trellis/kernel').ActorId,
          occurred_at: kernelEvent.occurred_at,
          payload: {
            property_name: kernelEvent.payload.property_name,
            source_entity_id: kernelEvent.payload.caused_by.entityId,
            source_property_name: kernelEvent.payload.caused_by.propertyName,
          },
        };
        await emitter.emit(serverEvent, { skipPersist: false });
      },
    };

    // Use kernel's staleness propagation algorithm
    await propagateStaleness(
      event.tenant_id as TenantId,
      event.entity_id as EntityId,
      event.payload.property_name as PropertyName,
      adapter,
      staleEmitter
    );
  };
}

/**
 * Registers the staleness handler with the event emitter.
 */
export function registerStalenessHandler(
  emitter: EventEmitter,
  adapter: StalenessAdapter
): () => void {
  const handler = createStalenessHandler(adapter, emitter);
  return emitter.on('property_changed', handler);
}
