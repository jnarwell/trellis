/**
 * Trellis Expression Engine - Staleness Propagation
 *
 * BFS algorithm for propagating staleness through the dependency graph.
 * See ADR-005 for the design decision.
 */

import type { EntityId, TenantId, PropertyName } from '../types/index.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Identifies a property on an entity.
 */
export interface PropertyKey {
  readonly entityId: EntityId;
  readonly propertyName: PropertyName;
}

/**
 * Event emitted when a property becomes stale.
 */
export interface PropertyStaleEvent {
  readonly id: string;
  readonly tenant_id: TenantId;
  readonly event_type: 'property_stale';
  readonly entity_id: EntityId;
  readonly actor_id: string;
  readonly occurred_at: string;
  readonly payload: {
    readonly property_name: PropertyName;
    readonly caused_by: {
      readonly entityId: EntityId;
      readonly propertyName: PropertyName;
    };
  };
}

/**
 * Database adapter interface for staleness propagation.
 */
export interface StalenessDatabase {
  /**
   * Find properties that depend on the given property.
   */
  getDependents(
    tenantId: TenantId,
    entityId: EntityId,
    propertyName: PropertyName
  ): Promise<readonly PropertyKey[]>;

  /**
   * Mark a property as stale.
   */
  markStale(
    tenantId: TenantId,
    entityId: EntityId,
    propertyName: PropertyName
  ): Promise<void>;
}

/**
 * Event emitter interface.
 */
export interface EventEmitter {
  emit(event: PropertyStaleEvent): Promise<void>;
}

// =============================================================================
// PROPAGATION
// =============================================================================

/**
 * Propagate staleness from a changed property to all dependents.
 * Uses BFS (Breadth-First Search) to traverse the dependency graph.
 *
 * @param tenantId - The tenant ID
 * @param entityId - The entity whose property changed
 * @param propertyName - The property that changed
 * @param db - Database adapter
 * @param emitter - Event emitter
 * @returns List of stale events generated
 */
export async function propagateStaleness(
  tenantId: TenantId,
  entityId: EntityId,
  propertyName: PropertyName,
  db: StalenessDatabase,
  emitter?: EventEmitter
): Promise<readonly PropertyStaleEvent[]> {
  const events: PropertyStaleEvent[] = [];
  const queue: PropertyKey[] = [];
  const processed = new Set<string>();

  // Initialize: find direct dependents of the changed property
  const directDependents = await db.getDependents(tenantId, entityId, propertyName);
  queue.push(...directDependents);

  // Track the cause for event payloads
  const causedBy: PropertyKey = { entityId, propertyName };

  // BFS through dependency graph
  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.entityId}.${current.propertyName}`;

    // Skip if already processed (prevents infinite loops)
    if (processed.has(key)) continue;
    processed.add(key);

    // Mark property as stale
    await db.markStale(tenantId, current.entityId, current.propertyName);

    // Create stale event
    const event: PropertyStaleEvent = {
      id: generateEventId(),
      tenant_id: tenantId,
      event_type: 'property_stale',
      entity_id: current.entityId,
      actor_id: 'system',
      occurred_at: new Date().toISOString(),
      payload: {
        property_name: current.propertyName,
        caused_by: causedBy,
      },
    };
    events.push(event);

    // Emit event if emitter provided
    if (emitter) {
      await emitter.emit(event);
    }

    // Find dependents of this now-stale property
    const nextDependents = await db.getDependents(
      tenantId,
      current.entityId,
      current.propertyName
    );
    queue.push(...nextDependents);
  }

  return events;
}

/**
 * Batch propagation for multiple property changes.
 * More efficient than calling propagateStaleness multiple times.
 */
export async function batchPropagateStaleness(
  tenantId: TenantId,
  changes: readonly PropertyKey[],
  db: StalenessDatabase,
  emitter?: EventEmitter
): Promise<readonly PropertyStaleEvent[]> {
  const allEvents: PropertyStaleEvent[] = [];
  const allProcessed = new Set<string>();

  for (const change of changes) {
    const events = await propagateWithState(
      tenantId,
      change,
      db,
      emitter,
      allProcessed
    );
    allEvents.push(...events);
  }

  return allEvents;
}

/**
 * Internal: Propagate staleness with shared processed state.
 */
async function propagateWithState(
  tenantId: TenantId,
  source: PropertyKey,
  db: StalenessDatabase,
  emitter: EventEmitter | undefined,
  globalProcessed: Set<string>
): Promise<readonly PropertyStaleEvent[]> {
  const events: PropertyStaleEvent[] = [];
  const queue: PropertyKey[] = [];

  // Initialize
  const directDependents = await db.getDependents(
    tenantId,
    source.entityId,
    source.propertyName
  );
  queue.push(...directDependents);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.entityId}.${current.propertyName}`;

    // Skip if already processed globally
    if (globalProcessed.has(key)) continue;
    globalProcessed.add(key);

    // Mark stale
    await db.markStale(tenantId, current.entityId, current.propertyName);

    // Create event
    const event: PropertyStaleEvent = {
      id: generateEventId(),
      tenant_id: tenantId,
      event_type: 'property_stale',
      entity_id: current.entityId,
      actor_id: 'system',
      occurred_at: new Date().toISOString(),
      payload: {
        property_name: current.propertyName,
        caused_by: source,
      },
    };
    events.push(event);

    if (emitter) {
      await emitter.emit(event);
    }

    // Find next dependents
    const nextDependents = await db.getDependents(
      tenantId,
      current.entityId,
      current.propertyName
    );
    queue.push(...nextDependents);
  }

  return events;
}

// =============================================================================
// TOPOLOGICAL SORT
// =============================================================================

/**
 * Topologically sort properties for recomputation order.
 * Returns properties in dependency order (dependencies first).
 */
export function topologicalSort(
  properties: readonly PropertyKey[],
  dependencies: Map<string, readonly string[]>
): readonly PropertyKey[] {
  const result: PropertyKey[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>(); // For cycle detection

  function visit(key: string): void {
    if (visited.has(key)) return;

    if (temp.has(key)) {
      // Cycle detected - skip to avoid infinite loop
      // The property will be marked as 'circular' status during evaluation
      return;
    }

    temp.add(key);

    // Visit dependencies first
    const deps = dependencies.get(key) ?? [];
    for (const dep of deps) {
      visit(dep);
    }

    temp.delete(key);
    visited.add(key);

    // Parse key back to PropertyKey
    const dotIndex = key.indexOf('.');
    if (dotIndex > 0) {
      result.push({
        entityId: key.substring(0, dotIndex) as EntityId,
        propertyName: key.substring(dotIndex + 1) as PropertyName,
      });
    }
  }

  // Visit all properties
  for (const prop of properties) {
    visit(`${prop.entityId}.${prop.propertyName}`);
  }

  return result;
}

// =============================================================================
// DEFERRED STALENESS
// =============================================================================

/**
 * Context for deferring staleness propagation during bulk operations.
 */
export interface StalenessContext {
  readonly deferred: boolean;
  readonly changedProperties: PropertyKey[];
}

/**
 * Create a new staleness context.
 */
export function createStalenessContext(): StalenessContext {
  return {
    deferred: true,
    changedProperties: [],
  };
}

/**
 * Execute a function with deferred staleness propagation.
 * All property changes are collected and propagated once at the end.
 */
export async function withDeferredStaleness<T>(
  tenantId: TenantId,
  db: StalenessDatabase,
  emitter: EventEmitter | undefined,
  fn: (ctx: StalenessContext) => Promise<T>
): Promise<{ result: T; events: readonly PropertyStaleEvent[] }> {
  const ctx = createStalenessContext();

  try {
    const result = await fn(ctx);

    // Propagate all at once
    const events = await batchPropagateStaleness(
      tenantId,
      ctx.changedProperties,
      db,
      emitter
    );

    return { result, events };
  } finally {
    // Clear the context
    ctx.changedProperties.length = 0;
  }
}

/**
 * Record a property change in a deferred context.
 */
export function recordPropertyChange(
  ctx: StalenessContext,
  entityId: EntityId,
  propertyName: PropertyName
): void {
  ctx.changedProperties.push({ entityId, propertyName });
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Generate a UUID v7-like event ID.
 */
function generateEventId(): string {
  // Simple implementation - in production use a proper UUID v7 library
  const timestamp = Date.now().toString(16).padStart(12, '0');
  const random = Math.random().toString(16).substring(2, 14).padStart(12, '0');
  return `${timestamp.slice(0, 8)}-${timestamp.slice(8)}-7${random.slice(0, 3)}-${random.slice(3, 7)}-${random.slice(7)}000000`.substring(0, 36);
}

/**
 * Create a mock database adapter for testing.
 */
export function createMockDatabase(
  dependencyGraph: Map<string, readonly string[]>
): StalenessDatabase {
  const staleProperties = new Set<string>();

  return {
    async getDependents(
      tenantId: TenantId,
      entityId: EntityId,
      propertyName: PropertyName
    ): Promise<readonly PropertyKey[]> {
      const key = `${entityId}.${propertyName}`;
      const deps = dependencyGraph.get(key) ?? [];
      return deps.map((d) => {
        const [eid, pname] = d.split('.');
        return {
          entityId: eid as EntityId,
          propertyName: pname as PropertyName,
        };
      });
    },

    async markStale(
      tenantId: TenantId,
      entityId: EntityId,
      propertyName: PropertyName
    ): Promise<void> {
      staleProperties.add(`${entityId}.${propertyName}`);
    },
  };
}

/**
 * Create a collecting event emitter for testing.
 */
export function createCollectingEmitter(): {
  emitter: EventEmitter;
  events: PropertyStaleEvent[];
} {
  const events: PropertyStaleEvent[] = [];

  return {
    emitter: {
      async emit(event: PropertyStaleEvent): Promise<void> {
        events.push(event);
      },
    },
    events,
  };
}
