/**
 * Trellis Product Loader - Type Definitions
 *
 * Types specific to the product loading process.
 */

import type { TenantId, ActorId } from '@trellis/kernel';
import type {
  ProductConfig,
  ProductValidationError,
  ProductValidationWarning,
  PropertyConfig,
  PropertyValidation,
  DimensionType,
} from '../config/types.js';

// =============================================================================
// LOADER OPTIONS
// =============================================================================

/**
 * Options for the product loader.
 */
export interface ProductLoaderOptions {
  /** Force overwrite existing schemas (default: false) */
  readonly force?: boolean;

  /** Skip loading seed data (default: false) */
  readonly skipSeed?: boolean;

  /** Dry run - validate only, don't write to database (default: false) */
  readonly dryRun?: boolean;

  /** Tenant ID to load into (default: create from product ID) */
  readonly tenantId?: TenantId;

  /** Actor ID for created_by fields (default: system actor) */
  readonly actorId?: ActorId;
}

// =============================================================================
// LOAD RESULT
// =============================================================================

/**
 * Result of loading a product.
 */
export interface LoadResult {
  /** Whether the load succeeded */
  readonly success: boolean;

  /** Product ID that was loaded */
  readonly productId: string;

  /** Tenant ID used */
  readonly tenantId: TenantId;

  /** Number of entity types created */
  readonly entityTypesCreated: number;

  /** Number of relationship types created */
  readonly relationshipTypesCreated: number;

  /** Number of entities seeded */
  readonly entitiesSeeded: number;

  /** Validation errors (if any) */
  readonly errors: readonly ProductValidationError[];

  /** Validation warnings */
  readonly warnings: readonly ProductValidationWarning[];

  /** Duration in milliseconds */
  readonly durationMs: number;
}

// =============================================================================
// DATABASE SCHEMA RECORDS
// =============================================================================

/**
 * Record format for type_schemas table.
 */
export interface TypeSchemaRecord {
  /** Tenant ID (null for system-wide types) */
  readonly tenant_id: string | null;

  /** Type path (ltree format) */
  readonly type_path: string;

  /** Human-readable name */
  readonly name: string;

  /** Description */
  readonly description: string | null;

  /** Parent type for inheritance */
  readonly extends_type: string | null;

  /** Property schemas as JSONB array */
  readonly properties: readonly PropertySchemaJson[];

  /** Whether this type is abstract */
  readonly abstract: boolean;
}

/**
 * Property schema in JSONB format for type_schemas.properties.
 */
export interface PropertySchemaJson {
  /** Property name */
  readonly name: string;

  /** Value type (text, number, boolean, etc.) */
  readonly value_type: string;

  /** Whether this property is required */
  readonly required: boolean;

  /** Whether this property must be unique */
  readonly unique?: boolean;

  /** Default value */
  readonly default?: unknown;

  /** Validation rules */
  readonly validation?: PropertyValidation;

  /** Dimension for numeric properties */
  readonly dimension?: DimensionType;

  /** Unit for numeric properties */
  readonly unit?: string;

  /** Referenced entity type (for reference properties) */
  readonly reference_type?: string;

  /** Display property for references */
  readonly reference_display?: string;

  /** Options for option type */
  readonly options?: readonly OptionSchemaJson[];

  /** Element type for list properties */
  readonly element_type?: PropertySchemaJson;

  /** Fields for record type */
  readonly fields?: Readonly<Record<string, PropertySchemaJson>>;

  /** Expression for computed properties */
  readonly expression?: string;

  /** Dependencies for computed properties */
  readonly dependencies?: readonly string[];
}

/**
 * Option schema in JSONB format.
 */
export interface OptionSchemaJson {
  readonly value: string;
  readonly label: string;
  readonly color?: string;
  readonly icon?: string;
  readonly description?: string;
}

/**
 * Record format for relationship_schemas table.
 */
export interface RelationshipSchemaRecord {
  /** Tenant ID (null for system-wide) */
  readonly tenant_id: string | null;

  /** Relationship type identifier */
  readonly type: string;

  /** Human-readable name */
  readonly name: string;

  /** Description */
  readonly description: string | null;

  /** Entity types that can be the source */
  readonly from_types: readonly string[];

  /** Entity types that can be the target */
  readonly to_types: readonly string[];

  /** Relationship cardinality */
  readonly cardinality: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';

  /** Whether this is bidirectional */
  readonly bidirectional: boolean;

  /** Inverse relationship type (if bidirectional) */
  readonly inverse_type: string | null;

  /** Schema for relationship metadata */
  readonly metadata_schema: Readonly<Record<string, PropertySchemaJson>>;
}

// =============================================================================
// SEED DATA
// =============================================================================

/**
 * Seed data configuration.
 */
export interface SeedDataConfig {
  /** Entities to create */
  readonly entities?: readonly SeedEntityConfig[];
}

/**
 * Seed entity configuration.
 */
export interface SeedEntityConfig {
  /** Entity type */
  readonly type: string;

  /** Property values */
  readonly data: Readonly<Record<string, unknown>>;

  /** Optional ID (for referencing in relationships) */
  readonly id?: string;
}

/**
 * Seed relationship configuration.
 */
export interface SeedRelationshipConfig {
  /** Relationship type */
  readonly type: string;

  /** Source entity ID (reference) */
  readonly from: string;

  /** Target entity ID (reference) */
  readonly to: string;

  /** Relationship metadata */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// =============================================================================
// LIFECYCLE
// =============================================================================

/**
 * Lifecycle schema in JSONB format.
 */
export interface LifecycleSchemaJson {
  /** Property holding state */
  readonly state_property: string;

  /** Initial state */
  readonly initial_state: string;

  /** Available states */
  readonly states: readonly LifecycleStateJson[];

  /** Allowed transitions */
  readonly transitions: readonly LifecycleTransitionJson[];
}

/**
 * Lifecycle state in JSONB format.
 */
export interface LifecycleStateJson {
  readonly value: string;
  readonly label: string;
  readonly color?: string;
  readonly icon?: string;
  readonly editable?: boolean;
  readonly deletable?: boolean;
}

/**
 * Lifecycle transition in JSONB format.
 */
export interface LifecycleTransitionJson {
  readonly from: string | readonly string[];
  readonly to: string;
  readonly action: string;
  readonly label?: string;
  readonly permission?: string;
  readonly when?: string;
}

// =============================================================================
// EVENTS
// =============================================================================

/**
 * Events emitted during product loading.
 */
export type LoaderEvent =
  | { readonly type: 'load_started'; readonly productId: string }
  | { readonly type: 'validation_complete'; readonly valid: boolean; readonly errorCount: number }
  | { readonly type: 'entity_type_created'; readonly typeId: string; readonly name: string }
  | { readonly type: 'entity_type_updated'; readonly typeId: string; readonly name: string }
  | { readonly type: 'relationship_type_created'; readonly relType: string; readonly name: string }
  | { readonly type: 'entity_seeded'; readonly entityType: string; readonly id: string }
  | { readonly type: 'load_complete'; readonly success: boolean; readonly durationMs: number }
  | { readonly type: 'load_error'; readonly error: string };

/**
 * Event handler for loader events.
 */
export type LoaderEventHandler = (event: LoaderEvent) => void;