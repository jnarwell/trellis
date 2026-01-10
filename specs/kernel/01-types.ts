/**
 * Trellis Kernel - Core Type Definitions
 *
 * This file defines the foundational types for the Trellis data model.
 * Implementation code MUST conform to these types.
 */

// =============================================================================
// IDENTIFIERS
// =============================================================================

/** UUID v7 (time-ordered) for all entity identifiers */
export type EntityId = string & { readonly __brand: 'EntityId' };

/** UUID v7 for tenant identifiers */
export type TenantId = string & { readonly __brand: 'TenantId' };

/** UUID v7 for event identifiers */
export type EventId = string & { readonly __brand: 'EventId' };

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

/**
 * Relationship type - describes the nature of the connection
 * Examples: "parent_of", "depends_on", "measured_by"
 */
export type RelationshipType = string & { readonly __brand: 'RelationshipType' };

// =============================================================================
// VALUE TYPES
// =============================================================================

/**
 * The fundamental value types supported by Trellis.
 * These map to PostgreSQL types and JSON representations.
 */
export type ValueType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'duration'
  | 'reference'
  | 'list'
  | 'record';

/** Text value - UTF-8 string */
export interface TextValue {
  type: 'text';
  value: string;
}

/**
 * Number value - with optional dimension and unit
 * Stored as numeric in PostgreSQL for precision
 */
export interface NumberValue {
  type: 'number';
  value: number;
  /** SI dimension (e.g., "length", "mass", "time") */
  dimension?: DimensionType;
  /** Display unit (e.g., "mm", "kg", "s") */
  unit?: string;
}

/** Boolean value */
export interface BooleanValue {
  type: 'boolean';
  value: boolean;
}

/** DateTime value - ISO 8601 with timezone */
export interface DateTimeValue {
  type: 'datetime';
  /** ISO 8601 timestamp (e.g., "2024-01-15T10:30:00Z") */
  value: string;
}

/** Duration value - ISO 8601 duration */
export interface DurationValue {
  type: 'duration';
  /** ISO 8601 duration (e.g., "P1D", "PT2H30M") */
  value: string;
}

/** Reference value - pointer to another entity */
export interface ReferenceValue {
  type: 'reference';
  /** The referenced entity's ID */
  entity_id: EntityId;
  /** Optional: expected type of referenced entity */
  expected_type?: TypePath;
}

/** List value - ordered collection of same-typed values */
export interface ListValue {
  type: 'list';
  /** Type of elements in the list */
  element_type: ValueType;
  /** The values in the list */
  values: Value[];
}

/** Record value - named collection of typed fields */
export interface RecordValue {
  type: 'record';
  /** Field definitions and values */
  fields: Record<string, Value>;
}

/** Union of all value types */
export type Value =
  | TextValue
  | NumberValue
  | BooleanValue
  | DateTimeValue
  | DurationValue
  | ReferenceValue
  | ListValue
  | RecordValue;

// =============================================================================
// DIMENSIONS
// =============================================================================

/**
 * SI Base Dimensions for dimensional analysis.
 * Used to validate unit compatibility and conversions.
 */
export type BaseDimension =
  | 'length'        // L - meters
  | 'mass'          // M - kilograms
  | 'time'          // T - seconds
  | 'current'       // I - amperes
  | 'temperature'   // Θ - kelvin
  | 'amount'        // N - moles
  | 'luminosity';   // J - candela

/**
 * Common derived dimensions.
 * Expressed as combinations of base dimensions.
 */
export type DerivedDimension =
  | 'area'          // L²
  | 'volume'        // L³
  | 'velocity'      // L/T
  | 'acceleration'  // L/T²
  | 'force'         // M·L/T²
  | 'energy'        // M·L²/T²
  | 'power'         // M·L²/T³
  | 'pressure'      // M/(L·T²)
  | 'frequency'     // 1/T
  | 'voltage'       // M·L²/(T³·I)
  | 'resistance';   // M·L²/(T³·I²)

export type DimensionType = BaseDimension | DerivedDimension | 'dimensionless';

/**
 * Dimension specification for numeric values.
 * Enables unit conversion and compatibility checking.
 */
export interface Dimension {
  type: DimensionType;
  /** Exponents for each base dimension (for derived dimensions) */
  exponents?: {
    length?: number;
    mass?: number;
    time?: number;
    current?: number;
    temperature?: number;
    amount?: number;
    luminosity?: number;
  };
}

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

/** Literal property - value directly set */
export interface LiteralProperty {
  source: 'literal';
  name: PropertyName;
  value: Value;
}

/** Inherited property - value from parent or template */
export interface InheritedProperty {
  source: 'inherited';
  name: PropertyName;
  /** Entity to inherit from */
  from_entity: EntityId;
  /** Property name on source entity (if different) */
  from_property?: PropertyName;
  /** Override value (if set, takes precedence) */
  override?: Value;
  /** Resolved value (computed at read time) */
  resolved_value?: Value;
}

/** Computed property - value from expression */
export interface ComputedProperty {
  source: 'computed';
  name: PropertyName;
  /** Expression in Trellis Expression Language */
  expression: string;
  /** Dependencies (property paths this expression references) */
  dependencies: string[];
  /** Cached computed value */
  cached_value?: Value;
  /** When the cached value was computed */
  cached_at?: string;
}

/** Measured property - value with uncertainty from measurement */
export interface MeasuredProperty {
  source: 'measured';
  name: PropertyName;
  /** The measured value */
  value: NumberValue;
  /** Measurement uncertainty (± value in same units) */
  uncertainty?: number;
  /** Reference to measurement record entity */
  measurement_record?: EntityId;
  /** When the measurement was taken */
  measured_at?: string;
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
  id: EntityId;

  /** Tenant this entity belongs to */
  tenant_id: TenantId;

  /**
   * Type path defining what kind of entity this is
   * Hierarchical (e.g., "product.variant.sku")
   */
  type: TypePath;

  /** Properties attached to this entity */
  properties: Record<PropertyName, Property>;

  /** When the entity was created */
  created_at: string;

  /** When the entity was last updated */
  updated_at: string;

  /** Who/what created this entity */
  created_by: ActorId;

  /** Current version (optimistic concurrency) */
  version: number;
}

// =============================================================================
// RELATIONSHIP
// =============================================================================

/**
 * Cardinality constraints for relationships.
 */
export type Cardinality =
  | 'one_to_one'
  | 'one_to_many'
  | 'many_to_one'
  | 'many_to_many';

/**
 * A typed connection between two entities.
 */
export interface Relationship {
  /** Unique identifier for this relationship instance */
  id: string;

  /** Tenant this relationship belongs to */
  tenant_id: TenantId;

  /** Type of relationship (e.g., "parent_of", "depends_on") */
  type: RelationshipType;

  /** Source entity */
  from_entity: EntityId;

  /** Target entity */
  to_entity: EntityId;

  /** Optional metadata on the relationship */
  metadata?: Record<string, Value>;

  /** When the relationship was created */
  created_at: string;

  /** Who/what created this relationship */
  created_by: ActorId;
}

/**
 * Schema definition for a relationship type.
 * Defines what entity types can be connected and how.
 */
export interface RelationshipSchema {
  /** The relationship type this schema defines */
  type: RelationshipType;

  /** Display name */
  name: string;

  /** Description of what this relationship means */
  description?: string;

  /** Allowed source entity types (empty = any) */
  from_types: TypePath[];

  /** Allowed target entity types (empty = any) */
  to_types: TypePath[];

  /** Cardinality constraint */
  cardinality: Cardinality;

  /** Whether the inverse relationship should be auto-created */
  bidirectional: boolean;

  /** Name of the inverse relationship (if bidirectional) */
  inverse_type?: RelationshipType;

  /** Metadata schema for relationship properties */
  metadata_schema?: Record<string, ValueType>;
}

// =============================================================================
// TYPE SCHEMA
// =============================================================================

/**
 * Property definition within a type schema.
 */
export interface PropertySchema {
  /** Property name */
  name: PropertyName;

  /** Expected value type */
  value_type: ValueType;

  /** Whether this property is required */
  required: boolean;

  /** Default value (for literal properties) */
  default_value?: Value;

  /** For numbers: dimension constraint */
  dimension?: DimensionType;

  /** For text: regex pattern constraint */
  pattern?: string;

  /** For text: max length */
  max_length?: number;

  /** For numbers: min value */
  min_value?: number;

  /** For numbers: max value */
  max_value?: number;

  /** For lists: min items */
  min_items?: number;

  /** For lists: max items */
  max_items?: number;

  /** For references: expected entity type */
  reference_type?: TypePath;

  /** Human-readable description */
  description?: string;
}

/**
 * Schema defining an entity type.
 * Used for validation and documentation.
 */
export interface TypeSchema {
  /** The type path this schema defines */
  type: TypePath;

  /** Display name */
  name: string;

  /** Description */
  description?: string;

  /** Parent type (for inheritance) */
  extends?: TypePath;

  /** Property definitions */
  properties: PropertySchema[];

  /** Whether entities of this type can be created directly */
  abstract: boolean;

  /** Tenant that owns this schema (null = system-wide) */
  tenant_id: TenantId | null;
}

// =============================================================================
// QUERY TYPES
// =============================================================================

/**
 * Filter operators for querying.
 */
export type FilterOperator =
  | 'eq'        // equals
  | 'neq'       // not equals
  | 'gt'        // greater than
  | 'gte'       // greater than or equal
  | 'lt'        // less than
  | 'lte'       // less than or equal
  | 'in'        // in array
  | 'nin'       // not in array
  | 'contains'  // text contains
  | 'starts'    // text starts with
  | 'ends'      // text ends with
  | 'regex'     // regex match
  | 'exists'    // property exists
  | 'type_is';  // type matches (with hierarchy)

/**
 * A single filter condition.
 */
export interface FilterCondition {
  /** Property path (e.g., "name", "metadata.category") */
  path: string;
  /** Operator */
  operator: FilterOperator;
  /** Value to compare against */
  value: unknown;
}

/**
 * Combined filter with AND/OR logic.
 */
export interface FilterGroup {
  /** Logical operator */
  logic: 'and' | 'or';
  /** Conditions in this group */
  conditions: (FilterCondition | FilterGroup)[];
}

/**
 * Sort specification.
 */
export interface SortSpec {
  /** Property path to sort by */
  path: string;
  /** Sort direction */
  direction: 'asc' | 'desc';
  /** How to handle nulls */
  nulls?: 'first' | 'last';
}

/**
 * Query specification for entities.
 */
export interface EntityQuery {
  /** Tenant to query within */
  tenant_id: TenantId;

  /** Filter by entity type (supports hierarchy with "*") */
  type?: TypePath | `${string}.*`;

  /** Property filters */
  filter?: FilterGroup;

  /** Sort order */
  sort?: SortSpec[];

  /** Pagination: skip N results */
  offset?: number;

  /** Pagination: return at most N results */
  limit?: number;

  /** Include related entities (by relationship type) */
  include?: RelationshipType[];
}

// =============================================================================
// API TYPES
// =============================================================================

/**
 * Input for creating an entity.
 */
export interface CreateEntityInput {
  /** Entity type */
  type: TypePath;

  /** Initial properties */
  properties: Record<PropertyName, Omit<Property, 'name'>>;

  /** Initial relationships to create */
  relationships?: Array<{
    type: RelationshipType;
    to_entity: EntityId;
    metadata?: Record<string, Value>;
  }>;
}

/**
 * Input for updating an entity.
 */
export interface UpdateEntityInput {
  /** Entity ID to update */
  id: EntityId;

  /** Expected version (optimistic concurrency) */
  expected_version: number;

  /** Properties to set (merge with existing) */
  set_properties?: Record<PropertyName, Omit<Property, 'name'>>;

  /** Properties to remove */
  remove_properties?: PropertyName[];
}

/**
 * Input for creating a relationship.
 */
export interface CreateRelationshipInput {
  type: RelationshipType;
  from_entity: EntityId;
  to_entity: EntityId;
  metadata?: Record<string, Value>;
}

/**
 * Result wrapper with metadata.
 */
export interface QueryResult<T> {
  /** The data */
  data: T[];

  /** Total count (if requested) */
  total_count?: number;

  /** Pagination info */
  pagination: {
    offset: number;
    limit: number;
    has_more: boolean;
  };
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export type KernelErrorCode =
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'VERSION_CONFLICT'
  | 'VALIDATION_ERROR'
  | 'TYPE_MISMATCH'
  | 'PERMISSION_DENIED'
  | 'TENANT_MISMATCH'
  | 'CIRCULAR_DEPENDENCY'
  | 'INVALID_EXPRESSION'
  | 'REFERENCE_BROKEN';

export interface KernelError {
  code: KernelErrorCode;
  message: string;
  details?: Record<string, unknown>;
}