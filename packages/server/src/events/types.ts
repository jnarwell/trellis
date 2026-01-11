/**
 * Trellis Server - Event Types
 *
 * Server-specific event types and handler interfaces.
 */

import type {
  KernelEvent,
  EventType,
  TenantId,
  ActorId,
  EntityId,
} from '@trellis/kernel';

// =============================================================================
// HANDLER TYPES
// =============================================================================

/**
 * Event handler function type.
 * Receives an event and processes it asynchronously.
 */
export type EventHandler<T extends KernelEvent = KernelEvent> = (
  event: T
) => Promise<void>;

/**
 * Unsubscribe function returned when registering a handler.
 */
export type Unsubscribe = () => void;

/**
 * Options for emitting events.
 */
export interface EmitOptions {
  /** Skip persisting to database (for replay scenarios) */
  skipPersist?: boolean;
  /** Skip notifying handlers (for bulk operations) */
  skipHandlers?: boolean;
}

// =============================================================================
// EVENT CREATION HELPERS
// =============================================================================

/**
 * Base context for creating events.
 */
export interface EventContext {
  tenantId: TenantId;
  actorId: ActorId;
}

/**
 * Input for creating an entity_created event.
 */
export interface EntityCreatedInput {
  entityId: EntityId;
  type: string;
  properties: Record<string, unknown>;
}

/**
 * Input for creating an entity_updated event.
 */
export interface EntityUpdatedInput {
  entityId: EntityId;
  previousVersion: number;
  newVersion: number;
  changedProperties: string[];
  removedProperties: string[];
}

/**
 * Input for creating an entity_deleted event.
 */
export interface EntityDeletedInput {
  entityId: EntityId;
  type: string;
  finalVersion: number;
  hardDelete: boolean;
  finalProperties: Record<string, unknown>;
}

/**
 * Input for creating a property_changed event.
 */
export interface PropertyChangedInput {
  entityId: EntityId;
  propertyName: string;
  changeType: 'added' | 'modified' | 'removed';
  previous: unknown;
  current: unknown;
}

/**
 * Input for creating a relationship_created event.
 */
export interface RelationshipCreatedInput {
  relationshipId: string;
  type: string;
  fromEntity: EntityId;
  toEntity: EntityId;
  metadata: Record<string, unknown>;
}

/**
 * Input for creating a relationship_deleted event.
 */
export interface RelationshipDeletedInput {
  relationshipId: string;
  type: string;
  fromEntity: EntityId;
  toEntity: EntityId;
}

// =============================================================================
// EVENT EMITTER INTERFACE
// =============================================================================

/**
 * Interface for the event emitter service.
 */
export interface IEventEmitter {
  /**
   * Emit an event to all registered handlers.
   * Persists event to database by default.
   */
  emit(event: KernelEvent, options?: EmitOptions): Promise<void>;

  /**
   * Register a handler for a specific event type.
   * Returns unsubscribe function.
   */
  on<T extends EventType>(
    eventType: T,
    handler: EventHandler<Extract<KernelEvent, { event_type: T }>>
  ): Unsubscribe;

  /**
   * Register a handler for all events.
   * Returns unsubscribe function.
   */
  onAll(handler: EventHandler): Unsubscribe;
}

// =============================================================================
// EVENT STORE INTERFACE
// =============================================================================

/**
 * Query options for fetching events.
 */
export interface EventQueryOptions {
  tenantId: TenantId;
  eventTypes?: EventType[];
  entityId?: EntityId;
  actorId?: ActorId;
  after?: string;
  before?: string;
  limit?: number;
  offset?: number;
}

/**
 * Interface for event persistence.
 */
export interface IEventStore {
  /**
   * Save an event to the database.
   */
  save(event: KernelEvent): Promise<void>;

  /**
   * Query events with filters.
   */
  query(options: EventQueryOptions): Promise<readonly KernelEvent[]>;

  /**
   * Get events for a specific entity.
   */
  getByEntityId(
    tenantId: TenantId,
    entityId: EntityId,
    limit?: number
  ): Promise<readonly KernelEvent[]>;

  /**
   * Get events since a specific timestamp.
   */
  getSince(
    tenantId: TenantId,
    since: string,
    limit?: number
  ): Promise<readonly KernelEvent[]>;
}
