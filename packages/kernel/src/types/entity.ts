/**
 * Trellis Kernel - Entity Type Definitions
 *
 * Defines Entity, Property, and Schema types for the Trellis data model.
 */

import type {
  Value,
  NumberValue,
  ValueType,
  DimensionType,
} from './value.js';

// =============================================================================
// IDENTIFIERS (Branded Types)
// =============================================================================

/** UUID v7 (time-ordered) for all entity identifiers */
export type EntityId = string & { readonly __brand: 'EntityId' };

/** UUID v7 for tenant identifiers */
export type TenantId = string & { readonly __brand: 'TenantId' };

/** UUID v7 for actor (user/system) identifiers */
export type ActorId = string & { readonly __brand: 'ActorId' };

/**
 * Type path using dot notation (maps to ltree in PostgreSQL)
 * Examples: "product", "product.variant", "test.result.measurement"
 */
export type TypePath = string & { readonly __brand: 'TypePath' };

/**
 * Property name - alphanumeric with underscores, no dots
 * Examples: "name", "unit_price", "created_by"
 */
export type PropertyName = string & { readonly __brand: 'PropertyName' };

// =============================================================================
// PROPERTY SOURCES
// =============================================================================

/**
 * How a property's value is determined.
 */
export type PropertySource =
  | 'literal'     // Directly set value
  | 'inherited'   // Inherited from parent/template
  | 'computed'    // Calculated from expression
  | 'measured';   // From measurement with uncertainty

/**
 * Computation status for computed and inherited properties.
 * See ADR-005 for staleness propagation algorithm.
 */
export type ComputationStatus =
  | 'pending'   // Never calculated
  | 'valid'     // Calculated and up-to-date
  | 'stale'     // Dependencies changed, needs recalculation
  | 'error'     // Last calculation failed
  | 'circular'; // Circular dependency detected

/** Literal property - value directly set */
export interface LiteralProperty {
  readonly source: 'literal';
  readonly name: PropertyName;
  readonly value: Value;
}

/**
 * Inherited property - value from parent or template.
 * Can become stale if the source property changes.
 */
export interface InheritedProperty {
  readonly source: 'inherited';
  readonly name: PropertyName;
  /** Entity to inherit from */
  readonly from_entity: EntityId;
  /** Property name on source entity (if different) */
  readonly from_property?: PropertyName;
  /** Override value (if set, takes precedence) */
  readonly override?: Value;
  /** Resolved value (computed at read time) */
  readonly resolved_value?: Value;
  /** Status of the resolved value */
  readonly computation_status: ComputationStatus;
  /** Error message if status is 'error' */
  readonly computation_error?: string;
}

/**
 * Computed property - value from expression.
 * See ADR-005 for expression syntax and staleness propagation.
 */
export interface ComputedProperty {
  readonly source: 'computed';
  readonly name: PropertyName;
  /** Expression in Trellis Expression Language */
  readonly expression: string;
  /** Dependencies (property paths this expression references) */
  readonly dependencies: readonly string[];
  /** Cached computed value (null if pending/error/circular) */
  readonly cached_value?: Value;
  /** When the cached value was computed */
  readonly cached_at?: string;
  /** Status of the computed value */
  readonly computation_status: ComputationStatus;
  /** Error message if status is 'error' or 'circular' */
  readonly computation_error?: string;
}

/** Measured property - value with uncertainty from measurement */
export interface MeasuredProperty {
  readonly source: 'measured';
  readonly name: PropertyName;
  /** The measured value */
  readonly value: NumberValue;
  /** Measurement uncertainty (± value in same units) */
  readonly uncertainty?: number;
  /** Reference to measurement record entity */
  readonly measurement_record?: EntityId;
  /** When the measurement was taken */
  readonly measured_at?: string;
}

/** Union of all property types */
export type Property =
  | LiteralProperty
  | InheritedProperty
  | ComputedProperty
  | MeasuredProperty;

// =============================================================================
// ENTITY
// =============================================================================

/**
 * The universal container for all data in Trellis.
 * Every piece of business data is an Entity.
 */
export interface Entity {
  /** Unique identifier (UUID v7) */
  readonly id: EntityId;

  /** Tenant this entity belongs to */
  readonly tenant_id: TenantId;

  /**
   * Type path defining what kind of entity this is
   * Hierarchical (e.g., "product.variant.sku")
   */
  readonly type: TypePath;

  /** Properties attached to this entity */
  readonly properties: Readonly<Record<PropertyName, Property>>;

  /** When the entity was created */
  readonly created_at: string;

  /** When the entity was last updated */
  readonly updated_at: string;

  /** Who/what created this entity */
  readonly created_by: ActorId;

  /** Current version (optimistic concurrency) */
  readonly version: number;
}

// =============================================================================
// TYPE SCHEMA
// =============================================================================

/**
 * Property definition within a type schema.
 */
export interface PropertySchema {
  /** Property name */
  readonly name: PropertyName;

  /** Expected value type */
  readonly value_type: ValueType;

  /** Whether this property is required */
  readonly required: boolean;

  /** Default value (for literal properties) */
  readonly default_value?: Value;

  /** For numbers: dimension constraint */
  readonly dimension?: DimensionType;

  /** For text: regex pattern constraint */
  readonly pattern?: string;

  /** For text: max length */
  readonly max_length?: number;

  /** For numbers: min value */
  readonly min_value?: number;

  /** For numbers: max value */
  readonly max_value?: number;

  /** For lists: min items */
  readonly min_items?: number;

  /** For lists: max items */
  readonly max_items?: number;

  /** For references: expected entity type */
  readonly reference_type?: TypePath;

  /** Human-readable description */
  readonly description?: string;
}

/**
 * Schema defining an entity type.
 * Used for validation and documentation.
 */
export interface TypeSchema {
  /** The type path this schema defines */
  readonly type: TypePath;

  /** Display name */
  readonly name: string;

  /** Description */
  readonly description?: string;

  /** Parent type (for inheritance) */
  readonly extends?: TypePath;

  /** Property definitions */
  readonly properties: readonly PropertySchema[];

  /** Whether entities of this type can be created directly */
  readonly abstract: boolean;

  /** Tenant that owns this schema (null = system-wide) */
  readonly tenant_id: TenantId | null;
}

// =============================================================================
// API INPUT TYPES
// =============================================================================

/**
 * Input for setting a property. Name comes from the key in the Record.
 * The API transforms this to a full Property by adding:
 * - name: from the Record key
 * - computation_status: 'pending' (for computed/inherited)
 * - dependencies: parsed from expression (for computed)
 */
export type PropertyInput =
  | { readonly source: 'literal'; readonly value: Value }
  | {
      readonly source: 'inherited';
      readonly from_entity: EntityId;
      readonly from_property?: PropertyName;
      readonly override?: Value;
    }
  | { readonly source: 'computed'; readonly expression: string }
  | {
      readonly source: 'measured';
      readonly value: NumberValue;
      readonly uncertainty?: number;
      readonly measured_at?: string;
    };

/**
 * Input for creating an entity.
 */
export interface CreateEntityInput {
  /** Entity type */
  readonly type: TypePath;

  /** Initial properties (name comes from key, transformed to full Property) */
  readonly properties: Readonly<Record<PropertyName, PropertyInput>>;

  /** Initial relationships to create */
  readonly relationships?: ReadonlyArray<{
    readonly type: RelationshipType;
    readonly to_entity: EntityId;
    readonly metadata?: Readonly<Record<string, Value>>;
  }>;
}

/**
 * Input for updating an entity.
 */
export interface UpdateEntityInput {
  /** Entity ID to update */
  readonly id: EntityId;

  /** Expected version (optimistic concurrency) */
  readonly expected_version: number;

  /** Properties to set (merge with existing) */
  readonly set_properties?: Readonly<Record<PropertyName, PropertyInput>>;

  /** Properties to remove */
  readonly remove_properties?: readonly PropertyName[];
}

// Import RelationshipType for CreateEntityInput
import type { RelationshipType } from './relationship.js';
