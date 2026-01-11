/**
 * Trellis Kernel - Event Type Definitions
 *
 * Defines all event types for the Trellis event sourcing model.
 * Every mutation in Trellis emits an immutable event.
 * See specs/kernel/04-events.md for full documentation.
 */

import type {
  EntityId,
  TenantId,
  ActorId,
  TypePath,
  PropertyName,
  Property,
  PropertySchema,
  TypeSchema,
} from './entity.js';
import type { Value } from './value.js';
import type { RelationshipType } from './relationship.js';

// =============================================================================
// IDENTIFIERS
// =============================================================================

/** UUID v7 for event identifiers */
export type EventId = string & { readonly __brand: 'EventId' };

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * All event types in the Trellis kernel.
 */
export type EventType =
  | 'entity_created'
  | 'entity_updated'
  | 'entity_deleted'
  | 'property_changed'
  | 'property_stale'
  | 'relationship_created'
  | 'relationship_deleted'
  | 'type_schema_created'
  | 'type_schema_updated';

// =============================================================================
// BASE EVENT
// =============================================================================

/**
 * Base event structure shared by all events.
 */
export interface BaseEvent {
  /** Unique event identifier (UUID v7 - time-ordered) */
  readonly id: EventId;

  /** Tenant this event belongs to */
  readonly tenant_id: TenantId;

  /** Type of event */
  readonly event_type: EventType;

  /** Entity this event relates to (if applicable) */
  readonly entity_id?: EntityId;

  /** Who/what triggered this event */
  readonly actor_id: ActorId;

  /** When the event occurred (ISO 8601) */
  readonly occurred_at: string;

  /** Event-specific data */
  readonly payload: unknown;
}

// =============================================================================
// ENTITY EVENTS
// =============================================================================

/**
 * Emitted when a new entity is created.
 */
export interface EntityCreatedEvent extends BaseEvent {
  readonly event_type: 'entity_created';
  readonly entity_id: EntityId;
  readonly payload: {
    /** Entity type path */
    readonly type: TypePath;
    /** Initial properties */
    readonly properties: Readonly<Record<PropertyName, Property>>;
    /** Initial version (always 1) */
    readonly version: 1;
  };
}

/**
 * Emitted when an entity is modified.
 */
export interface EntityUpdatedEvent extends BaseEvent {
  readonly event_type: 'entity_updated';
  readonly entity_id: EntityId;
  readonly payload: {
    /** Version before update */
    readonly previous_version: number;
    /** Version after update */
    readonly new_version: number;
    /** Properties that were added or changed */
    readonly changed_properties: readonly PropertyName[];
    /** Properties that were removed */
    readonly removed_properties: readonly PropertyName[];
  };
}

/**
 * Emitted when an entity is deleted.
 */
export interface EntityDeletedEvent extends BaseEvent {
  readonly event_type: 'entity_deleted';
  readonly entity_id: EntityId;
  readonly payload: {
    /** Entity type at time of deletion */
    readonly type: TypePath;
    /** Final version */
    readonly final_version: number;
    /** Whether this was a hard delete */
    readonly hard_delete: boolean;
    /** Snapshot of properties at deletion (for recovery) */
    readonly final_properties: Readonly<Record<PropertyName, Property>>;
  };
}

// =============================================================================
// PROPERTY EVENTS
// =============================================================================

/**
 * Emitted for each property modification. Provides granular change tracking.
 */
export interface PropertyChangedEvent extends BaseEvent {
  readonly event_type: 'property_changed';
  readonly entity_id: EntityId;
  readonly payload: {
    /** Property name */
    readonly property_name: PropertyName;
    /** Change type */
    readonly change_type: 'added' | 'modified' | 'removed';
    /** Previous property (null if added) */
    readonly previous: Property | null;
    /** New property (null if removed) */
    readonly current: Property | null;
  };
}

/**
 * Emitted when a property is marked as stale due to dependency changes.
 */
export interface PropertyStaleEvent extends BaseEvent {
  readonly event_type: 'property_stale';
  readonly entity_id: EntityId;
  readonly payload: {
    /** Property name that became stale */
    readonly property_name: PropertyName;
    /** The source entity whose change triggered staleness */
    readonly source_entity_id: EntityId;
    /** The source property whose change triggered staleness */
    readonly source_property_name: PropertyName;
  };
}

// =============================================================================
// RELATIONSHIP EVENTS
// =============================================================================

/**
 * Emitted when a relationship is created.
 */
export interface RelationshipCreatedEvent extends BaseEvent {
  readonly event_type: 'relationship_created';
  readonly payload: {
    /** Relationship ID */
    readonly relationship_id: string;
    /** Relationship type */
    readonly type: RelationshipType;
    /** Source entity */
    readonly from_entity: EntityId;
    /** Target entity */
    readonly to_entity: EntityId;
    /** Relationship metadata */
    readonly metadata: Readonly<Record<string, Value>>;
  };
}

/**
 * Emitted when a relationship is removed.
 */
export interface RelationshipDeletedEvent extends BaseEvent {
  readonly event_type: 'relationship_deleted';
  readonly payload: {
    /** Relationship ID */
    readonly relationship_id: string;
    /** Relationship type */
    readonly type: RelationshipType;
    /** Source entity */
    readonly from_entity: EntityId;
    /** Target entity */
    readonly to_entity: EntityId;
  };
}

// =============================================================================
// SCHEMA EVENTS
// =============================================================================

/**
 * Emitted when a new type schema is defined.
 */
export interface TypeSchemaCreatedEvent extends BaseEvent {
  readonly event_type: 'type_schema_created';
  readonly payload: {
    /** Schema ID */
    readonly schema_id: string;
    /** Type path */
    readonly type: TypePath;
    /** Full schema definition */
    readonly schema: TypeSchema;
  };
}

/**
 * Emitted when a type schema is modified.
 */
export interface TypeSchemaUpdatedEvent extends BaseEvent {
  readonly event_type: 'type_schema_updated';
  readonly payload: {
    /** Schema ID */
    readonly schema_id: string;
    /** Type path */
    readonly type: TypePath;
    /** Changes made */
    readonly changes: {
      readonly properties_added?: readonly PropertySchema[];
      readonly properties_removed?: readonly PropertyName[];
      readonly properties_modified?: readonly PropertySchema[];
      readonly other_changes?: Readonly<
        Record<string, { readonly previous: unknown; readonly current: unknown }>
      >;
    };
  };
}

// =============================================================================
// EVENT UNION
// =============================================================================

/**
 * Union of all kernel event types.
 */
export type KernelEvent =
  | EntityCreatedEvent
  | EntityUpdatedEvent
  | EntityDeletedEvent
  | PropertyChangedEvent
  | PropertyStaleEvent
  | RelationshipCreatedEvent
  | RelationshipDeletedEvent
  | TypeSchemaCreatedEvent
  | TypeSchemaUpdatedEvent;
