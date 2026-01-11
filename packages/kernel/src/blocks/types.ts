/**
 * Trellis Block System - Type Definitions
 *
 * Defines BlockSpec, PropSpec, and related types for the block system.
 * Based on specs/blocks/block-system-design.md
 */

import type { TypePath, PropertyName, TenantId } from '../types/entity.js';

// =============================================================================
// BRANDED TYPES
// =============================================================================

/** Block type identifier (e.g., "trellis.data-table", "acme.custom-chart") */
export type BlockType = string & { readonly __brand: 'BlockType' };

/** Block instance identifier in a product config */
export type BlockInstanceId = string & { readonly __brand: 'BlockInstanceId' };

// =============================================================================
// BLOCK CATEGORIES
// =============================================================================

/** Block categories for organization */
export type BlockCategory =
  | 'data'           // DataTable, DataGrid, RecordView
  | 'visualization'  // Chart, Graph, Dashboard
  | 'input'          // Form, Filter, Search
  | 'layout'         // Container, Tabs, Split
  | 'navigation'     // Breadcrumb, Menu, TreeView
  | 'action'         // Button, Toolbar, ContextMenu
  | 'content';       // Text, Media, Document

// =============================================================================
// PROP TYPES
// =============================================================================

/**
 * Prop types - extending kernel ValueTypes with block-specific types.
 */
export type PropType =
  // Primitive types (from kernel)
  | { readonly kind: 'text'; readonly maxLength?: number; readonly pattern?: RegExp }
  | { readonly kind: 'number'; readonly min?: number; readonly max?: number; readonly integer?: boolean }
  | { readonly kind: 'boolean' }
  | { readonly kind: 'datetime' }

  // Reference types (validated against context)
  | { readonly kind: 'entityType' }                                       // Must be valid TypePath
  | { readonly kind: 'entityProperty'; readonly ofType: 'self' | TypePath }  // Property on entity type
  | { readonly kind: 'entityReference'; readonly ofType?: TypePath }      // Reference to specific entity
  | { readonly kind: 'blockReference'; readonly ofType?: BlockType }      // Reference to another block

  // Composite types
  | { readonly kind: 'enum'; readonly values: readonly string[] }
  | { readonly kind: 'list'; readonly element: PropType; readonly minLength?: number; readonly maxLength?: number }
  | { readonly kind: 'record'; readonly fields: Readonly<Record<string, PropSpec>> }
  | { readonly kind: 'union'; readonly variants: readonly PropType[] }

  // Special types
  | { readonly kind: 'expression' }    // Trellis expression (validated for syntax)
  | { readonly kind: 'template' }      // String template with {{property}} interpolation
  | { readonly kind: 'style' }         // CSS-like style object
  | { readonly kind: 'icon' }          // Icon identifier
  | { readonly kind: 'color' };        // Color value

/**
 * Runtime value for a prop (what's in YAML config).
 */
export type PropValue =
  | string
  | number
  | boolean
  | null
  | PropValue[]
  | { [key: string]: PropValue };

// =============================================================================
// PROP SPEC
// =============================================================================

/**
 * Specification for a single prop on a block.
 */
export interface PropSpec {
  /** The value type */
  readonly type: PropType;

  /** Whether this prop is required */
  readonly required: boolean;

  /** Default value (must match type) */
  readonly default?: PropValue;

  /** Human-readable description */
  readonly description: string;

  /** Validation rules applied in order */
  readonly validators?: readonly PropValidator[];

  /** UI hints for configuration editors */
  readonly ui?: PropUIHints;
}

/**
 * UI hints for configuration editors.
 */
export interface PropUIHints {
  /** Display label (defaults to prop name) */
  readonly label?: string;
  /** Placeholder text for input */
  readonly placeholder?: string;
  /** Group this prop belongs to */
  readonly group?: string;
  /** Order within group */
  readonly order?: number;
  /** Show advanced/collapsed by default */
  readonly advanced?: boolean;
  /** Conditional visibility */
  readonly showWhen?: { readonly prop: string; readonly equals: PropValue };
}

// =============================================================================
// VALIDATORS
// =============================================================================

/**
 * Result of validation - either success or failure with details.
 */
export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly details?: Record<string, unknown> };

/**
 * A validator that runs against a prop value.
 */
export interface PropValidator {
  /** Unique identifier for this validator */
  readonly id: string;

  /** Human-readable description of what this validates */
  readonly description: string;

  /**
   * The validation function.
   * Has access to the value, full config, and validation context.
   */
  readonly validate: (
    value: PropValue,
    context: ValidationContext
  ) => ValidationResult;

  /**
   * Template for error message.
   * Placeholders: {{value}}, {{prop}}, {{expected}}, {{suggestion}}
   */
  readonly errorTemplate: string;
}

/**
 * Block-level validator (cross-prop validation).
 */
export interface BlockValidator {
  readonly id: string;
  readonly description: string;
  readonly validate: (
    config: BlockConfig,
    context: ValidationContext
  ) => ValidationResult;
  readonly errorTemplate: string;
}

/**
 * Context available during validation.
 */
export interface ValidationContext {
  /** The full block configuration being validated */
  readonly config: BlockConfig;

  /** The block spec being validated against */
  readonly spec: BlockSpec;

  /** Path to current prop being validated */
  readonly path: readonly string[];

  /** Entity schema registry - look up entity types and properties */
  readonly entities: EntitySchemaRegistry;

  /** Block registry - look up other block specs */
  readonly blocks: BlockRegistry;

  /** Tenant context */
  readonly tenantId: TenantId;

  /** Helper: find similar strings (for suggestions) */
  readonly findSimilar: (needle: string, haystack: readonly string[]) => string[];

  /** Helper: format type for error messages */
  readonly formatType: (type: PropType) => string;
}

// =============================================================================
// REGISTRIES
// =============================================================================

/**
 * Schema for looking up property information.
 */
export interface PropertySchemaInfo {
  readonly name: PropertyName;
  readonly valueType: string;
  readonly required: boolean;
  readonly description?: string;
}

/**
 * Schema for looking up type information.
 */
export interface TypeSchemaInfo {
  readonly type: TypePath;
  readonly name: string;
  readonly description?: string;
  readonly properties: readonly PropertySchemaInfo[];
}

/**
 * Registry for looking up entity type schemas.
 */
export interface EntitySchemaRegistry {
  /** Check if entity type exists */
  hasType(type: TypePath): boolean;

  /** Get schema for entity type */
  getType(type: TypePath): TypeSchemaInfo | undefined;

  /** Get all entity types matching pattern */
  getTypes(pattern: string): readonly TypeSchemaInfo[];

  /** Get property names for entity type (including inherited) */
  getProperties(type: TypePath): readonly PropertySchemaInfo[];

  /** Check if property exists on type */
  hasProperty(type: TypePath, property: PropertyName): boolean;

  /** Get property schema */
  getProperty(type: TypePath, property: PropertyName): PropertySchemaInfo | undefined;
}

/**
 * Registry for looking up block specs.
 */
export interface BlockRegistry {
  hasBlock(type: BlockType): boolean;
  getBlock(type: BlockType): BlockSpec | undefined;
  getBlocks(category?: BlockCategory): readonly BlockSpec[];
  registerBlock(spec: BlockSpec): void;
}

// =============================================================================
// EVENT SYSTEM
// =============================================================================

/**
 * Payload type definition (for validation and documentation).
 */
export type PayloadType =
  | { readonly kind: 'void' }  // No payload
  | { readonly kind: 'primitive'; readonly type: 'string' | 'number' | 'boolean' }
  | { readonly kind: 'entity'; readonly type?: TypePath }  // Full entity object
  | { readonly kind: 'entityId'; readonly type?: TypePath }  // Just the ID
  | { readonly kind: 'record'; readonly fields: Readonly<Record<string, PayloadFieldType>> }
  | { readonly kind: 'array'; readonly element: PayloadType }
  | { readonly kind: 'union'; readonly variants: readonly PayloadType[] };

export interface PayloadFieldType {
  readonly type: PayloadType;
  readonly required: boolean;
  readonly description?: string;
}

/**
 * Specification for an event a block can emit.
 */
export interface EventSpec {
  /** Human-readable description */
  readonly description: string;

  /** TypeScript-style payload type definition */
  readonly payload: PayloadType;

  /** When this event is typically emitted */
  readonly emittedWhen: string;

  /** Example payload for documentation/testing */
  readonly example?: Record<string, unknown>;
}

/**
 * Specification for events a block can receive.
 */
export interface ReceiverSpec {
  /** Human-readable description */
  readonly description: string;

  /** Expected payload type */
  readonly payload: PayloadType;

  /** What happens when this event is received */
  readonly behavior: string;

  /** Required payload fields (others are optional) */
  readonly requiredFields?: readonly string[];
}

// =============================================================================
// SLOTS
// =============================================================================

/**
 * Specification for a named slot where other blocks can be nested.
 */
export interface SlotSpec {
  /** Human-readable description */
  readonly description: string;

  /** How many blocks can be in this slot */
  readonly cardinality: 'one' | 'many';

  /** Which block types are allowed (empty = any) */
  readonly accepts?: readonly BlockType[];

  /** Which block types are NOT allowed */
  readonly rejects?: readonly BlockType[];

  /** Default content if slot is empty */
  readonly default?: readonly BlockConfig[];
}

// =============================================================================
// BLOCK SPEC
// =============================================================================

/** Requirements for block to function */
export interface BlockRequirements {
  /** Entity types that must exist */
  readonly entityTypes?: readonly TypePath[];
  /** Other blocks that must be available */
  readonly blocks?: readonly BlockType[];
  /** Feature flags that must be enabled */
  readonly features?: readonly string[];
}

/**
 * Block configuration (instance in product YAML).
 */
export interface BlockConfig {
  /** Block type */
  readonly type: BlockType;
  /** Instance ID */
  readonly id?: BlockInstanceId;
  /** Props */
  readonly props: Readonly<Record<string, PropValue>>;
  /** Slots */
  readonly slots?: Readonly<Record<string, readonly BlockConfig[]>>;
}

/**
 * The complete specification for a Trellis Block.
 * This is the "executable contract" - configuration is validated against this.
 */
export interface BlockSpec<
  TProps extends Record<string, PropSpec> = Record<string, PropSpec>,
  TEmits extends Record<string, EventSpec> = Record<string, EventSpec>,
  TReceives extends Record<string, ReceiverSpec> = Record<string, ReceiverSpec>,
  TSlots extends Record<string, SlotSpec> = Record<string, SlotSpec>
> {
  /** Unique block type identifier (e.g., "trellis.data-table", "acme.custom-chart") */
  readonly type: BlockType;

  /** Semantic version of this block spec */
  readonly version: `${number}.${number}.${number}`;

  /** Human-readable name */
  readonly name: string;

  /** Description of what this block does */
  readonly description: string;

  /** Category for organization (e.g., "data", "layout", "visualization") */
  readonly category: BlockCategory;

  /** Props this block accepts */
  readonly props: TProps;

  /** Events this block can emit */
  readonly emits: TEmits;

  /** Events this block can receive from other blocks */
  readonly receives: TReceives;

  /** Named slots for nested content */
  readonly slots: TSlots;

  /** Block-level validators (cross-prop validation) */
  readonly validators?: readonly BlockValidator[];

  /** Dependencies on other systems (e.g., requires entity types) */
  readonly requires?: BlockRequirements;
}

// =============================================================================
// VALIDATION ERRORS
// =============================================================================

/**
 * Validation error category.
 */
export type ValidationErrorCategory =
  | 'type-mismatch'      // Wrong type
  | 'missing-required'   // Required prop not provided
  | 'unknown-prop'       // Prop not in spec
  | 'invalid-value'      // Value fails validation
  | 'reference-invalid'  // Referenced entity/type/property doesn't exist
  | 'wiring-invalid'     // Event wiring problem
  | 'constraint-failed'  // Cross-prop constraint failed
  | 'syntax-error';      // Expression/template syntax error

/**
 * A validation error with all context needed for helpful messages.
 * Designed so Claude Code can immediately fix the issue.
 */
export interface ValidationError {
  /** Error category */
  readonly category: ValidationErrorCategory;

  /** Error code for programmatic handling */
  readonly code: string;

  /** Human-readable error message (already interpolated) */
  readonly message: string;

  /** Path to the problematic value */
  readonly path: readonly string[];

  /** The invalid value that caused the error */
  readonly value: unknown;

  /** Expected type/value description */
  readonly expected: string;

  /** Suggestions for fixing (sorted by likelihood) */
  readonly suggestions: readonly string[];

  /** Source location in YAML (if available) */
  readonly location?: {
    readonly file: string;
    readonly line: number;
    readonly column: number;
  };

  /** Related documentation link */
  readonly docsUrl?: string;

  /** Nested errors (for composite types) */
  readonly children?: readonly ValidationError[];
}

/**
 * Warnings don't prevent loading but indicate potential issues.
 */
export interface ValidationWarning {
  readonly code: string;
  readonly message: string;
  readonly path: readonly string[];
  readonly suggestion?: string;
}

/**
 * Aggregated result of validating a full block config.
 */
export interface BlockValidationResult {
  readonly valid: boolean;
  readonly blockId: BlockInstanceId | undefined;
  readonly blockType: BlockType;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
}
