/**
 * Trellis Kernel - Relationship Type Definitions
 *
 * Defines Relationship and RelationshipSchema types for the Trellis data model.
 */

import type { EntityId, TenantId, ActorId, TypePath } from './entity.js';
import type { Value, ValueType } from './value.js';

// =============================================================================
// IDENTIFIERS
// =============================================================================

/**
 * Relationship type - describes the nature of the connection
 * Examples: "parent_of", "depends_on", "measured_by"
 */
export type RelationshipType = string & { readonly __brand: 'RelationshipType' };

// =============================================================================
// CARDINALITY
// =============================================================================

/**
 * Cardinality constraints for relationships.
 */
export type Cardinality =
  | 'one_to_one'
  | 'one_to_many'
  | 'many_to_one'
  | 'many_to_many';

// =============================================================================
// RELATIONSHIP
// =============================================================================

/**
 * A typed connection between two entities.
 * See ADR-003 for ltree path usage in hierarchical relationships.
 */
export interface Relationship {
  /** Unique identifier for this relationship instance */
  readonly id: string;

  /** Tenant this relationship belongs to */
  readonly tenant_id: TenantId;

  /** Type of relationship (e.g., "parent_of", "depends_on") */
  readonly type: RelationshipType;

  /** Source entity */
  readonly from_entity: EntityId;

  /** Target entity */
  readonly to_entity: EntityId;

  /**
   * Materialized path for hierarchical relationships (null for flat relationships).
   * Format: "root_id.parent_id.child_id" - enables efficient tree queries via ltree.
   * See ADR-003 for path convention and query patterns.
   */
  readonly path?: string;

  /** Optional metadata on the relationship */
  readonly metadata?: Readonly<Record<string, Value>>;

  /** When the relationship was created */
  readonly created_at: string;

  /** Who/what created this relationship */
  readonly created_by: ActorId;
}

/**
 * Schema definition for a relationship type.
 * Defines what entity types can be connected and how.
 */
export interface RelationshipSchema {
  /** The relationship type this schema defines */
  readonly type: RelationshipType;

  /** Display name */
  readonly name: string;

  /** Description of what this relationship means */
  readonly description?: string;

  /** Allowed source entity types (empty = any) */
  readonly from_types: readonly TypePath[];

  /** Allowed target entity types (empty = any) */
  readonly to_types: readonly TypePath[];

  /** Cardinality constraint */
  readonly cardinality: Cardinality;

  /** Whether the inverse relationship should be auto-created */
  readonly bidirectional: boolean;

  /** Name of the inverse relationship (if bidirectional) */
  readonly inverse_type?: RelationshipType;

  /** Metadata schema for relationship properties */
  readonly metadata_schema?: Readonly<Record<string, ValueType>>;
}

// =============================================================================
// API INPUT TYPES
// =============================================================================

/**
 * Input for creating a relationship.
 */
export interface CreateRelationshipInput {
  readonly type: RelationshipType;
  readonly from_entity: EntityId;
  readonly to_entity: EntityId;
  /** Optional path for hierarchical relationships (see ADR-003) */
  readonly path?: string;
  readonly metadata?: Readonly<Record<string, Value>>;
}
