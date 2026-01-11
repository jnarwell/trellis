/**
 * Trellis Server - Audit Handler
 *
 * Logs events for audit trail and debugging.
 * Can be extended to send to external audit systems.
 */

import type { KernelEvent } from '@trellis/kernel';
import type { EventHandler } from '../types.js';
import type { EventEmitter } from '../emitter.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Audit log entry.
 */
export interface AuditEntry {
  timestamp: string;
  eventId: string;
  eventType: string;
  tenantId: string;
  actorId: string;
  entityId: string | undefined;
  summary: string;
}

/**
 * Audit logger interface.
 */
export interface AuditLogger {
  log(entry: AuditEntry): void;
}

// =============================================================================
// DEFAULT LOGGER
// =============================================================================

/**
 * Default audit logger that writes to console.
 * In production, replace with your audit system (e.g., Splunk, DataDog).
 */
export const consoleAuditLogger: AuditLogger = {
  log(entry: AuditEntry): void {
    console.log(
      `[AUDIT] ${entry.timestamp} | ${entry.eventType} | tenant:${entry.tenantId} | actor:${entry.actorId}${entry.entityId ? ` | entity:${entry.entityId}` : ''} | ${entry.summary}`
    );
  },
};

// =============================================================================
// HANDLER
// =============================================================================

/**
 * Creates an audit handler that logs all events.
 */
export function createAuditHandler(
  logger: AuditLogger = consoleAuditLogger
): EventHandler {
  return async (event: KernelEvent): Promise<void> => {
    const entry: AuditEntry = {
      timestamp: event.occurred_at,
      eventId: event.id,
      eventType: event.event_type,
      tenantId: event.tenant_id,
      actorId: event.actor_id,
      entityId: event.entity_id,
      summary: generateSummary(event),
    };

    logger.log(entry);
  };
}

/**
 * Generate a human-readable summary of the event.
 */
function generateSummary(event: KernelEvent): string {
  switch (event.event_type) {
    case 'entity_created':
      return `Created entity of type "${event.payload.type}"`;

    case 'entity_updated':
      return `Updated entity: ${event.payload.changed_properties.length} changed, ${event.payload.removed_properties.length} removed (v${event.payload.previous_version} → v${event.payload.new_version})`;

    case 'entity_deleted':
      return `Deleted entity of type "${event.payload.type}" (${event.payload.hard_delete ? 'hard' : 'soft'} delete)`;

    case 'property_changed':
      return `Property "${event.payload.property_name}" ${event.payload.change_type}`;

    case 'property_stale':
      return `Property "${event.payload.property_name}" marked stale`;

    case 'relationship_created':
      return `Created ${event.payload.type} relationship: ${event.payload.from_entity} → ${event.payload.to_entity}`;

    case 'relationship_deleted':
      return `Deleted ${event.payload.type} relationship: ${event.payload.from_entity} → ${event.payload.to_entity}`;

    case 'type_schema_created':
      return `Created schema for type "${event.payload.type}"`;

    case 'type_schema_updated':
      return `Updated schema for type "${event.payload.type}"`;

    default:
      return 'Unknown event';
  }
}

/**
 * Registers the audit handler with the event emitter.
 */
export function registerAuditHandler(
  emitter: EventEmitter,
  logger: AuditLogger = consoleAuditLogger
): () => void {
  const handler = createAuditHandler(logger);
  return emitter.onAll(handler);
}
