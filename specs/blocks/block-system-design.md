# Trellis Block System Design

> **Status:** Design Specification
> **Author:** Block System Designer
> **Version:** 0.1.0

## Overview

The Trellis Block System provides reusable UI components with typed specifications that can be configured and wired together without custom code. Blocks have "specs" that are executable contracts:

- **Props**: Typed configuration inputs with validation rules and error messages
- **Events (emits)**: Typed outputs the block can send
- **Receivers**: Typed inputs the block can receive from other blocks
- **Slots**: Customization points for nested content

**Key insight:** Validation happens at configuration load time, not runtime. When a product YAML is loaded, every block config is validated against its spec. Errors are precise and actionable.

---

## Table of Contents

1. [BlockSpec Interface](#1-blockspec-interface)
2. [PropSpec - Property Definitions](#2-propspec---property-definitions)
3. [Validation System](#3-validation-system)
4. [Event System & Wiring](#4-event-system--wiring)
5. [ValidationError Type & Examples](#5-validationerror-type--examples)
6. [Test Generation from Specs](#6-test-generation-from-specs)
7. [Open Questions & Tradeoffs](#7-open-questions--tradeoffs)

---

## 1. BlockSpec Interface

The `BlockSpec` is the executable contract that defines what a block can do, what it needs, and what it provides.

```typescript
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
  readonly validators?: BlockValidator[];

  /** Dependencies on other systems (e.g., requires entity types) */
  readonly requires?: BlockRequirements;
}

/** Branded type for block identifiers */
export type BlockType = string & { readonly __brand: 'BlockType' };

/** Block categories */
export type BlockCategory =
  | 'data'           // DataTable, DataGrid, RecordView
  | 'visualization'  // Chart, Graph, Dashboard
  | 'input'          // Form, Filter, Search
  | 'layout'         // Container, Tabs, Split
  | 'navigation'     // Breadcrumb, Menu, TreeView
  | 'action'         // Button, Toolbar, ContextMenu
  | 'content';       // Text, Media, Document

/** Requirements for block to function */
export interface BlockRequirements {
  /** Entity types that must exist */
  entityTypes?: TypePath[];
  /** Other blocks that must be available */
  blocks?: BlockType[];
  /** Feature flags that must be enabled */
  features?: string[];
}
```

---

## 2. PropSpec - Property Definitions

```typescript
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
  readonly validators?: PropValidator[];

  /** UI hints for configuration editors */
  readonly ui?: PropUIHints;
}

/**
 * Prop types - extending kernel ValueTypes with block-specific types.
 */
export type PropType =
  // Primitive types (from kernel)
  | { kind: 'text'; maxLength?: number; pattern?: RegExp }
  | { kind: 'number'; min?: number; max?: number; integer?: boolean }
  | { kind: 'boolean' }
  | { kind: 'datetime' }

  // Reference types (validated against context)
  | { kind: 'entityType' }                           // Must be valid TypePath
  | { kind: 'entityProperty'; ofType: 'self' | TypePath }  // Property on entity type
  | { kind: 'entityReference'; ofType?: TypePath }   // Reference to specific entity
  | { kind: 'blockReference'; ofType?: BlockType }   // Reference to another block

  // Composite types
  | { kind: 'enum'; values: readonly string[] }
  | { kind: 'list'; element: PropType; minLength?: number; maxLength?: number }
  | { kind: 'record'; fields: Record<string, PropSpec> }
  | { kind: 'union'; variants: PropType[] }

  // Special types
  | { kind: 'expression' }    // Trellis expression (validated for syntax)
  | { kind: 'template' }      // String template with {{property}} interpolation
  | { kind: 'style' }         // CSS-like style object
  | { kind: 'icon' }          // Icon identifier
  | { kind: 'color' };        // Color value

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

/**
 * UI hints for configuration editors.
 */
export interface PropUIHints {
  /** Display label (defaults to prop name) */
  label?: string;
  /** Placeholder text for input */
  placeholder?: string;
  /** Group this prop belongs to */
  group?: string;
  /** Order within group */
  order?: number;
  /** Show advanced/collapsed by default */
  advanced?: boolean;
  /** Conditional visibility */
  showWhen?: { prop: string; equals: PropValue };
}
```

---

## 3. Validation System

### 3.1 Validator Types

```typescript
/**
 * A validator that runs against a prop value.
 * Returns ValidationResult (success or failure with message).
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
 * This is how validators access external information.
 */
export interface ValidationContext {
  /** The full block configuration being validated */
  readonly config: BlockConfig;

  /** The block spec being validated against */
  readonly spec: BlockSpec;

  /** Path to current prop being validated */
  readonly path: string[];

  /** Entity schema registry - look up entity types and properties */
  readonly entities: EntitySchemaRegistry;

  /** Block registry - look up other block specs */
  readonly blocks: BlockRegistry;

  /** Tenant context */
  readonly tenantId: TenantId;

  /** Helper: find similar strings (for suggestions) */
  readonly findSimilar: (needle: string, haystack: string[]) => string[];

  /** Helper: format type for error messages */
  readonly formatType: (type: PropType) => string;
}

/**
 * Registry for looking up entity type schemas.
 */
export interface EntitySchemaRegistry {
  /** Check if entity type exists */
  hasType(type: TypePath): boolean;

  /** Get schema for entity type */
  getType(type: TypePath): TypeSchema | undefined;

  /** Get all entity types matching pattern */
  getTypes(pattern: string): TypeSchema[];

  /** Get property names for entity type (including inherited) */
  getProperties(type: TypePath): PropertySchema[];

  /** Check if property exists on type */
  hasProperty(type: TypePath, property: PropertyName): boolean;

  /** Get property schema */
  getProperty(type: TypePath, property: PropertyName): PropertySchema | undefined;
}

/**
 * Registry for looking up block specs.
 */
export interface BlockRegistry {
  hasBlock(type: BlockType): boolean;
  getBlock(type: BlockType): BlockSpec | undefined;
  getBlocks(category?: BlockCategory): BlockSpec[];
}
```

### 3.2 Built-in Validators

```typescript
/**
 * Factory functions for creating common validators.
 */
export const Validators = {
  /**
   * Validates that value is a valid entity type.
   */
  entityTypeExists(): PropValidator {
    return {
      id: 'entity-type-exists',
      description: 'Entity type must exist in schema registry',
      errorTemplate:
        `Entity type '{{value}}' not found. ` +
        `Available types: {{available}}. ` +
        `{{#suggestion}}Did you mean '{{suggestion}}'?{{/suggestion}}`,
      validate: (value, ctx) => {
        if (typeof value !== 'string') {
          return failure('Expected entity type path string');
        }
        if (ctx.entities.hasType(value as TypePath)) {
          return success();
        }
        const allTypes = ctx.entities.getTypes('*').map(t => t.type);
        const similar = ctx.findSimilar(value, allTypes);
        return failure({
          available: allTypes.slice(0, 5).join(', '),
          suggestion: similar[0]
        });
      }
    };
  },

  /**
   * Validates that value is a property on the specified entity type.
   */
  propertyExistsOnType(typeSource: 'self' | string): PropValidator {
    return {
      id: 'property-exists-on-type',
      description: `Property must exist on entity type`,
      errorTemplate:
        `Property '{{value}}' not found on entity type '{{entityType}}'. ` +
        `Available properties: {{available}}. ` +
        `{{#suggestion}}Did you mean '{{suggestion}}'?{{/suggestion}}`,
      validate: (value, ctx) => {
        if (typeof value !== 'string') {
          return failure('Expected property name string');
        }

        // Resolve the entity type
        const entityType = typeSource === 'self'
          ? ctx.config.props.entityType as string  // Reference config's entityType prop
          : typeSource;

        if (!entityType) {
          return failure({ message: 'Cannot validate property - entityType not set' });
        }

        if (ctx.entities.hasProperty(entityType as TypePath, value as PropertyName)) {
          return success();
        }

        const props = ctx.entities.getProperties(entityType as TypePath);
        const propNames = props.map(p => p.name);
        const similar = ctx.findSimilar(value, propNames);

        return failure({
          entityType,
          available: propNames.slice(0, 10).join(', '),
          suggestion: similar[0]
        });
      }
    };
  },

  /**
   * Validates expression syntax.
   */
  validExpression(): PropValidator {
    return {
      id: 'valid-expression',
      description: 'Must be a valid Trellis expression',
      errorTemplate:
        `Invalid expression: {{error}} at position {{position}}. ` +
        `Expression: '{{value}}'`,
      validate: (value, ctx) => {
        if (typeof value !== 'string') {
          return failure('Expected expression string');
        }
        const result = parseExpression(value); // Assumed expression parser
        if (result.success) return success();
        return failure({
          error: result.error,
          position: result.position
        });
      }
    };
  },

  /**
   * Validates string matches pattern.
   */
  matches(pattern: RegExp, description: string): PropValidator {
    return {
      id: `matches-${pattern.source}`,
      description,
      errorTemplate: `Value '{{value}}' does not match required pattern. ${description}`,
      validate: (value) => {
        if (typeof value !== 'string') return failure('Expected string');
        return pattern.test(value) ? success() : failure({});
      }
    };
  },

  /**
   * Validates number is in range.
   */
  range(min?: number, max?: number): PropValidator {
    return {
      id: `range-${min ?? '*'}-${max ?? '*'}`,
      description: `Number must be ${min !== undefined ? `>= ${min}` : ''} ${max !== undefined ? `<= ${max}` : ''}`.trim(),
      errorTemplate: `Value {{value}} is out of range. Expected {{range}}.`,
      validate: (value) => {
        if (typeof value !== 'number') return failure('Expected number');
        if (min !== undefined && value < min) {
          return failure({ range: `>= ${min}` });
        }
        if (max !== undefined && value > max) {
          return failure({ range: `<= ${max}` });
        }
        return success();
      }
    };
  },

  /**
   * Validates all items in list.
   */
  listItems(itemValidator: PropValidator): PropValidator {
    return {
      id: `list-items-${itemValidator.id}`,
      description: `Each item: ${itemValidator.description}`,
      errorTemplate: `Item at index {{index}}: ${itemValidator.errorTemplate}`,
      validate: (value, ctx) => {
        if (!Array.isArray(value)) return failure('Expected array');
        for (let i = 0; i < value.length; i++) {
          const result = itemValidator.validate(value[i], {
            ...ctx,
            path: [...ctx.path, String(i)]
          });
          if (!result.valid) {
            return failure({ index: i, ...result.details });
          }
        }
        return success();
      }
    };
  },

  /**
   * Custom validator with inline function.
   */
  custom(
    id: string,
    description: string,
    errorTemplate: string,
    validate: (value: PropValue, ctx: ValidationContext) => ValidationResult
  ): PropValidator {
    return { id, description, errorTemplate, validate };
  }
};
```

---

## 4. Event System & Wiring

### 4.1 Event and Receiver Specs

```typescript
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
  readonly requiredFields?: string[];
}

/**
 * Payload type definition (for validation and documentation).
 */
export type PayloadType =
  | { kind: 'void' }  // No payload
  | { kind: 'primitive'; type: 'string' | 'number' | 'boolean' }
  | { kind: 'entity'; type?: TypePath }  // Full entity object
  | { kind: 'entityId'; type?: TypePath }  // Just the ID
  | { kind: 'record'; fields: Record<string, PayloadFieldType> }
  | { kind: 'array'; element: PayloadType }
  | { kind: 'union'; variants: PayloadType[] };

export interface PayloadFieldType {
  type: PayloadType;
  required: boolean;
  description?: string;
}
```

### 4.2 Slot Specifications

```typescript
/**
 * Specification for a named slot where other blocks can be nested.
 */
export interface SlotSpec {
  /** Human-readable description */
  readonly description: string;

  /** How many blocks can be in this slot */
  readonly cardinality: 'one' | 'many';

  /** Which block types are allowed (empty = any) */
  readonly accepts?: BlockType[];

  /** Which block types are NOT allowed */
  readonly rejects?: BlockType[];

  /** Default content if slot is empty */
  readonly default?: BlockConfig[];
}
```

### 4.3 Wiring Definition (How Blocks Connect)

```typescript
/**
 * A wiring connects an emitter to a receiver.
 * Defined in product YAML, validated at load time.
 */
export interface WiringSpec {
  /** Source block instance ID */
  readonly from: BlockInstanceId;

  /** Event name on source block */
  readonly event: string;

  /** Target block instance ID */
  readonly to: BlockInstanceId;

  /** Receiver name on target block */
  readonly receiver: string;

  /** Optional payload transformation */
  readonly transform?: PayloadTransform;

  /** Conditional: only fire if condition is true */
  readonly when?: WiringCondition;
}

/** Block instance identifier in a product config */
export type BlockInstanceId = string & { readonly __brand: 'BlockInstanceId' };

/**
 * Transform payload from emitter format to receiver format.
 */
export type PayloadTransform =
  | { kind: 'identity' }  // Pass through unchanged
  | { kind: 'pick'; fields: string[] }  // Pick specific fields
  | { kind: 'rename'; mapping: Record<string, string> }  // Rename fields
  | { kind: 'expression'; expr: string };  // Trellis expression

/**
 * Condition for conditional wiring.
 */
export interface WiringCondition {
  /** Expression that returns boolean */
  readonly expr: string;
  /** Description for documentation */
  readonly description?: string;
}
```

### 4.4 YAML Syntax Examples

```yaml
# Product YAML showing block configuration and wiring

product:
  name: "Part Management"
  version: "1.0.0"

blocks:
  # Block instance with ID "parts-table"
  parts-table:
    type: trellis.data-table
    props:
      entityType: part
      columns:
        - property: part_number
          label: "Part #"
          width: 120
        - property: name
          label: "Name"
        - property: status
          label: "Status"
      selectable: true
      pageSize: 25

  # Block instance with ID "part-detail"
  part-detail:
    type: trellis.record-view
    props:
      entityType: part
      sections:
        - name: "Basic Info"
          properties: [part_number, name, description]
        - name: "Specifications"
          properties: [material, weight, dimensions]

  # Block instance with ID "status-filter"
  status-filter:
    type: trellis.filter-bar
    props:
      filters:
        - property: status
          type: enum
          label: "Status"
        - property: material
          type: reference
          label: "Material"

# Wiring - how blocks communicate
wiring:
  # When a row is selected in parts-table, show it in part-detail
  - from: parts-table
    event: rowSelected
    to: part-detail
    receiver: loadEntity
    # payload: { entityId: "..." } -> receiver expects { entityId: "..." }

  # When filter changes, reload the table
  - from: status-filter
    event: filterChanged
    to: parts-table
    receiver: setFilter
    # payload: { filters: [...] } -> receiver expects { filter: FilterGroup }
    transform:
      kind: expression
      expr: "{ filter: payload.filters }"

  # Conditional wiring - only for admin users
  - from: parts-table
    event: rowDoubleClicked
    to: part-detail
    receiver: openEditMode
    when:
      expr: "context.user.role == 'admin'"
      description: "Only admins can edit via double-click"
```

### 4.5 Wiring Validation

```typescript
/**
 * Validates wiring between blocks at configuration load time.
 */
export interface WiringValidation {
  /**
   * Validate a single wiring definition.
   */
  validateWiring(
    wiring: WiringSpec,
    blocks: Map<BlockInstanceId, BlockConfig>,
    specs: BlockRegistry
  ): ValidationResult;

  /**
   * Validate payload compatibility between emitter and receiver.
   */
  validatePayloadCompatibility(
    emitterPayload: PayloadType,
    receiverPayload: PayloadType,
    transform?: PayloadTransform
  ): ValidationResult;
}

/**
 * Wiring validation errors.
 */
export type WiringValidationError =
  | {
      kind: 'block-not-found';
      blockId: BlockInstanceId;
      location: 'from' | 'to';
    }
  | {
      kind: 'event-not-found';
      blockType: BlockType;
      eventName: string;
      availableEvents: string[];
    }
  | {
      kind: 'receiver-not-found';
      blockType: BlockType;
      receiverName: string;
      availableReceivers: string[];
    }
  | {
      kind: 'payload-incompatible';
      emitterPayload: PayloadType;
      receiverPayload: PayloadType;
      mismatch: string;
    }
  | {
      kind: 'transform-invalid';
      transform: PayloadTransform;
      error: string;
    };
```

---

## 5. ValidationError Type & Examples

### 5.1 Error Type Definition

```typescript
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
  readonly path: string[];

  /** The invalid value that caused the error */
  readonly value: unknown;

  /** Expected type/value description */
  readonly expected: string;

  /** Suggestions for fixing (sorted by likelihood) */
  readonly suggestions: string[];

  /** Source location in YAML (if available) */
  readonly location?: {
    file: string;
    line: number;
    column: number;
  };

  /** Related documentation link */
  readonly docsUrl?: string;

  /** Nested errors (for composite types) */
  readonly children?: ValidationError[];
}

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
 * Aggregated result of validating a full block config.
 */
export interface BlockValidationResult {
  readonly valid: boolean;
  readonly blockId: BlockInstanceId;
  readonly blockType: BlockType;
  readonly errors: ValidationError[];
  readonly warnings: ValidationWarning[];
}

/**
 * Warnings don't prevent loading but indicate potential issues.
 */
export interface ValidationWarning {
  readonly code: string;
  readonly message: string;
  readonly path: string[];
  readonly suggestion?: string;
}

/**
 * Full product validation result.
 */
export interface ProductValidationResult {
  readonly valid: boolean;
  readonly productName: string;
  readonly blockResults: BlockValidationResult[];
  readonly wiringErrors: ValidationError[];
  /** Total error count across all blocks */
  readonly errorCount: number;
  /** Total warning count */
  readonly warningCount: number;
}
```

### 5.2 Example Error Messages

These are designed so Claude Code (or any AI assistant) can immediately understand and fix the issue:

#### Example 1: Property doesn't exist on entity type

```typescript
const error1: ValidationError = {
  category: 'reference-invalid',
  code: 'PROPERTY_NOT_FOUND',
  message: "Property 'status' not found on entity type 'part'. " +
           "Available properties: part_number, name, description, material, weight, dimensions, state. " +
           "Did you mean 'state'?",
  path: ['blocks', 'parts-table', 'props', 'columns', '2', 'property'],
  value: 'status',
  expected: "Property name that exists on entity type 'part'",
  suggestions: ['state', 'material', 'name'],
  location: { file: 'products/parts.yaml', line: 18, column: 14 }
};
```

#### Example 2: Entity type doesn't exist

```typescript
const error2: ValidationError = {
  category: 'reference-invalid',
  code: 'ENTITY_TYPE_NOT_FOUND',
  message: "Entity type 'parts' not found. " +
           "Available types: part, product, material, supplier, test_result. " +
           "Did you mean 'part'?",
  path: ['blocks', 'parts-table', 'props', 'entityType'],
  value: 'parts',
  expected: 'Valid entity type path',
  suggestions: ['part', 'product'],
  location: { file: 'products/parts.yaml', line: 8, column: 18 }
};
```

#### Example 3: Type mismatch

```typescript
const error3: ValidationError = {
  category: 'type-mismatch',
  code: 'TYPE_MISMATCH',
  message: "Expected number for 'pageSize', got string '25'. " +
           "Remove quotes to use as number.",
  path: ['blocks', 'parts-table', 'props', 'pageSize'],
  value: '25',
  expected: 'number',
  suggestions: ['Change "25" to 25 (remove quotes)'],
  location: { file: 'products/parts.yaml', line: 22, column: 16 }
};
```

#### Example 4: Missing required prop

```typescript
const error4: ValidationError = {
  category: 'missing-required',
  code: 'REQUIRED_PROP_MISSING',
  message: "Required prop 'entityType' is missing from block 'part-detail'. " +
           "This block displays entity data and must know which entity type to expect.",
  path: ['blocks', 'part-detail', 'props'],
  value: undefined,
  expected: "entityType: <valid entity type>",
  suggestions: ['Add entityType: part', 'Add entityType: product'],
  location: { file: 'products/parts.yaml', line: 25, column: 4 },
  docsUrl: 'https://trellis.dev/docs/blocks/record-view#entityType'
};
```

#### Example 5: Wiring event not found

```typescript
const error5: ValidationError = {
  category: 'wiring-invalid',
  code: 'EVENT_NOT_FOUND',
  message: "Event 'onRowSelect' not found on block type 'trellis.data-table'. " +
           "Available events: rowSelected, rowDoubleClicked, selectionChanged, pageChanged. " +
           "Did you mean 'rowSelected'?",
  path: ['wiring', '0', 'event'],
  value: 'onRowSelect',
  expected: 'Valid event name from block spec',
  suggestions: ['rowSelected', 'selectionChanged'],
  location: { file: 'products/parts.yaml', line: 45, column: 12 }
};
```

#### Example 6: Payload incompatibility

```typescript
const error6: ValidationError = {
  category: 'wiring-invalid',
  code: 'PAYLOAD_INCOMPATIBLE',
  message: "Payload mismatch in wiring from 'status-filter.filterChanged' to 'parts-table.setFilter'. " +
           "Emitter sends: { filters: FilterSpec[] }. " +
           "Receiver expects: { filter: FilterGroup }. " +
           "Add a transform to convert between formats.",
  path: ['wiring', '1'],
  value: { from: 'status-filter', event: 'filterChanged', to: 'parts-table', receiver: 'setFilter' },
  expected: 'Compatible payload types or explicit transform',
  suggestions: [
    "Add transform: { kind: 'expression', expr: '{ filter: toFilterGroup(payload.filters) }' }",
    "Add transform: { kind: 'rename', mapping: { filters: 'filter' } }"
  ],
  location: { file: 'products/parts.yaml', line: 48, column: 4 }
};
```

#### Example 7: Invalid expression

```typescript
const error7: ValidationError = {
  category: 'syntax-error',
  code: 'EXPRESSION_SYNTAX_ERROR',
  message: "Invalid expression: Unexpected token 'AND' at position 15. " +
           "Use '&&' for logical AND in Trellis expressions. " +
           "Expression: 'status == \"active\" AND visible'",
  path: ['blocks', 'parts-table', 'props', 'rowFilter'],
  value: 'status == "active" AND visible',
  expected: 'Valid Trellis expression',
  suggestions: ['status == "active" && visible'],
  location: { file: 'products/parts.yaml', line: 15, column: 16 }
};
```

#### Example 8: Unknown prop (with did-you-mean)

```typescript
const error8: ValidationError = {
  category: 'unknown-prop',
  code: 'UNKNOWN_PROP',
  message: "Unknown prop 'pagesize' on block type 'trellis.data-table'. " +
           "Did you mean 'pageSize'? (Props are case-sensitive)",
  path: ['blocks', 'parts-table', 'props', 'pagesize'],
  value: 25,
  expected: 'Known prop from block spec',
  suggestions: ['pageSize', 'pageSizeOptions'],
  location: { file: 'products/parts.yaml', line: 22, column: 6 }
};
```

---

## 6. Test Generation from Specs

### 6.1 Philosophy

Every rule in a BlockSpec is a test waiting to be generated. Since specs are declarative, we can automatically generate:

1. **Prop validation tests** - valid/invalid values for each prop
2. **Event emission tests** - block emits expected events with correct payloads
3. **Receiver tests** - block responds correctly to received events
4. **Wiring tests** - connected blocks communicate correctly
5. **Slot tests** - nested blocks work as expected

### 6.2 Test Generation Types

```typescript
/**
 * Generated test metadata.
 */
export interface GeneratedTest {
  /** Unique test ID (deterministic from spec + rule) */
  readonly id: string;

  /** Human-readable test name */
  readonly name: string;

  /** Test category */
  readonly category: GeneratedTestCategory;

  /** What this test verifies */
  readonly description: string;

  /** The block spec this was generated from */
  readonly sourceSpec: BlockType;

  /** The specific rule/validator this tests */
  readonly sourceRule: string;

  /** Test input data */
  readonly input: TestInput;

  /** Expected outcome */
  readonly expected: TestExpectation;
}

export type GeneratedTestCategory =
  | 'prop-valid'      // Valid prop value accepted
  | 'prop-invalid'    // Invalid prop value rejected with correct error
  | 'prop-default'    // Default value applied when prop omitted
  | 'event-emit'      // Event emitted with correct payload
  | 'event-receive'   // Block responds to received event
  | 'slot-accepts'    // Valid block accepted in slot
  | 'slot-rejects'    // Invalid block rejected from slot
  | 'cross-prop'      // Cross-prop validation works
  | 'wiring';         // Wiring validation works

export type TestInput =
  | { kind: 'config'; config: Partial<BlockConfig> }
  | { kind: 'event'; event: string; payload: unknown }
  | { kind: 'action'; action: string; params: unknown };

export type TestExpectation =
  | { kind: 'valid' }
  | { kind: 'invalid'; errorCode: string; errorMessageContains?: string }
  | { kind: 'emits'; event: string; payloadMatches: unknown }
  | { kind: 'state'; stateMatches: unknown };
```

### 6.3 Test Generator

```typescript
/**
 * Generates tests from a BlockSpec.
 */
export interface TestGenerator {
  /**
   * Generate all tests for a block spec.
   */
  generateTests(spec: BlockSpec): GeneratedTest[];

  /**
   * Generate tests for a specific prop.
   */
  generatePropTests(spec: BlockSpec, propName: string): GeneratedTest[];

  /**
   * Generate tests for a specific event.
   */
  generateEventTests(spec: BlockSpec, eventName: string): GeneratedTest[];

  /**
   * Generate tests for wiring between two blocks.
   */
  generateWiringTests(
    emitterSpec: BlockSpec,
    receiverSpec: BlockSpec,
    event: string,
    receiver: string
  ): GeneratedTest[];
}

/**
 * Example: Generate tests for a prop with validators.
 */
function generatePropTests(
  spec: BlockSpec,
  propName: string,
  propSpec: PropSpec
): GeneratedTest[] {
  const tests: GeneratedTest[] = [];
  const basePath = `${spec.type}.props.${propName}`;

  // Test 1: Required prop missing (if required)
  if (propSpec.required) {
    tests.push({
      id: `${basePath}.required`,
      name: `${propName} is required`,
      category: 'prop-invalid',
      description: `Validates that omitting required prop '${propName}' produces an error`,
      sourceSpec: spec.type,
      sourceRule: 'required',
      input: {
        kind: 'config',
        config: { props: { /* propName intentionally omitted */ } }
      },
      expected: {
        kind: 'invalid',
        errorCode: 'REQUIRED_PROP_MISSING',
        errorMessageContains: propName
      }
    });
  }

  // Test 2: Default applied (if has default)
  if (propSpec.default !== undefined) {
    tests.push({
      id: `${basePath}.default`,
      name: `${propName} has default value`,
      category: 'prop-default',
      description: `Validates that default value is applied when '${propName}' is omitted`,
      sourceSpec: spec.type,
      sourceRule: 'default',
      input: {
        kind: 'config',
        config: { props: {} }
      },
      expected: {
        kind: 'state',
        stateMatches: { props: { [propName]: propSpec.default } }
      }
    });
  }

  // Test 3: Type validation - generate valid and invalid examples
  const typeTests = generateTypeTests(propSpec.type, basePath, propName);
  tests.push(...typeTests);

  // Test 4: Each validator becomes a test
  for (const validator of propSpec.validators ?? []) {
    tests.push(...generateValidatorTests(validator, basePath, propName, propSpec.type));
  }

  return tests;
}

/**
 * Generate type-specific tests.
 */
function generateTypeTests(
  type: PropType,
  basePath: string,
  propName: string
): GeneratedTest[] {
  const tests: GeneratedTest[] = [];

  switch (type.kind) {
    case 'number':
      // Valid: number
      tests.push({
        id: `${basePath}.type.valid-number`,
        name: `${propName} accepts number`,
        category: 'prop-valid',
        description: `Number value is accepted`,
        sourceSpec: basePath.split('.')[0] as BlockType,
        sourceRule: 'type:number',
        input: { kind: 'config', config: { props: { [propName]: 42 } } },
        expected: { kind: 'valid' }
      });

      // Invalid: string
      tests.push({
        id: `${basePath}.type.invalid-string`,
        name: `${propName} rejects string`,
        category: 'prop-invalid',
        description: `String value is rejected when number expected`,
        sourceSpec: basePath.split('.')[0] as BlockType,
        sourceRule: 'type:number',
        input: { kind: 'config', config: { props: { [propName]: "42" } } },
        expected: {
          kind: 'invalid',
          errorCode: 'TYPE_MISMATCH',
          errorMessageContains: 'number'
        }
      });

      // Range tests
      if (type.min !== undefined) {
        tests.push({
          id: `${basePath}.type.below-min`,
          name: `${propName} rejects below min`,
          category: 'prop-invalid',
          description: `Value below minimum ${type.min} is rejected`,
          sourceSpec: basePath.split('.')[0] as BlockType,
          sourceRule: `type:number.min:${type.min}`,
          input: { kind: 'config', config: { props: { [propName]: type.min - 1 } } },
          expected: { kind: 'invalid', errorCode: 'CONSTRAINT_FAILED' }
        });
      }
      break;

    case 'entityType':
      // Valid: existing type
      tests.push({
        id: `${basePath}.type.valid-entity-type`,
        name: `${propName} accepts valid entity type`,
        category: 'prop-valid',
        description: `Existing entity type is accepted`,
        sourceSpec: basePath.split('.')[0] as BlockType,
        sourceRule: 'type:entityType',
        input: { kind: 'config', config: { props: { [propName]: '{{VALID_ENTITY_TYPE}}' } } },
        expected: { kind: 'valid' }
      });

      // Invalid: non-existent type
      tests.push({
        id: `${basePath}.type.invalid-entity-type`,
        name: `${propName} rejects invalid entity type`,
        category: 'prop-invalid',
        description: `Non-existent entity type is rejected with suggestion`,
        sourceSpec: basePath.split('.')[0] as BlockType,
        sourceRule: 'type:entityType',
        input: { kind: 'config', config: { props: { [propName]: 'nonexistent_type_xyz' } } },
        expected: {
          kind: 'invalid',
          errorCode: 'ENTITY_TYPE_NOT_FOUND',
          errorMessageContains: 'not found'
        }
      });
      break;

    case 'enum':
      // Valid: each enum value
      for (const value of type.values) {
        tests.push({
          id: `${basePath}.type.valid-enum-${value}`,
          name: `${propName} accepts '${value}'`,
          category: 'prop-valid',
          description: `Enum value '${value}' is accepted`,
          sourceSpec: basePath.split('.')[0] as BlockType,
          sourceRule: `type:enum.${value}`,
          input: { kind: 'config', config: { props: { [propName]: value } } },
          expected: { kind: 'valid' }
        });
      }

      // Invalid: not in enum
      tests.push({
        id: `${basePath}.type.invalid-enum`,
        name: `${propName} rejects invalid enum`,
        category: 'prop-invalid',
        description: `Invalid enum value is rejected with valid options`,
        sourceSpec: basePath.split('.')[0] as BlockType,
        sourceRule: 'type:enum',
        input: { kind: 'config', config: { props: { [propName]: 'INVALID_VALUE' } } },
        expected: {
          kind: 'invalid',
          errorCode: 'INVALID_ENUM_VALUE',
          errorMessageContains: type.values[0]  // Should list valid values
        }
      });
      break;

    // ... more type cases
  }

  return tests;
}
```

### 6.4 Test Output Format

Generated tests output in a standard format for test runners:

```typescript
/**
 * Output format for test runners (Jest, Vitest, etc.)
 */
export interface TestSuite {
  readonly blockType: BlockType;
  readonly specVersion: string;
  readonly generatedAt: string;
  readonly tests: TestCase[];
}

export interface TestCase {
  readonly id: string;
  readonly name: string;
  readonly category: string;

  /** Setup fixture */
  readonly setup: () => Promise<TestFixture>;

  /** The actual test */
  readonly execute: (fixture: TestFixture) => Promise<void>;

  /** Cleanup */
  readonly teardown: (fixture: TestFixture) => Promise<void>;
}
```

**Example generated Jest test file:**

```typescript
// Auto-generated from trellis.data-table spec v1.0.0
// DO NOT EDIT - regenerate with: trellis gen-tests

describe('trellis.data-table', () => {
  describe('props.entityType', () => {
    it('is required', async () => {
      const result = await validateBlockConfig({
        type: 'trellis.data-table',
        props: { columns: [] }  // entityType missing
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('REQUIRED_PROP_MISSING');
      expect(result.errors[0].message).toContain('entityType');
    });

    it('accepts valid entity type', async () => {
      const result = await validateBlockConfig({
        type: 'trellis.data-table',
        props: { entityType: 'part', columns: [] }
      });
      expect(result.valid).toBe(true);
    });

    it('rejects invalid entity type with suggestion', async () => {
      const result = await validateBlockConfig({
        type: 'trellis.data-table',
        props: { entityType: 'parts', columns: [] }  // typo
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('ENTITY_TYPE_NOT_FOUND');
      expect(result.errors[0].suggestions).toContain('part');
    });
  });

  describe('events.rowSelected', () => {
    it('emits with entity payload on row click', async () => {
      const block = await mountBlock({
        type: 'trellis.data-table',
        props: { entityType: 'part', columns: [...] }
      });

      const eventPromise = block.waitForEvent('rowSelected');
      await block.clickRow(0);

      const event = await eventPromise;
      expect(event.payload).toHaveProperty('entityId');
      expect(event.payload).toHaveProperty('entity');
    });
  });
});
```

---

## 7. Open Questions & Tradeoffs

### 7.1 Resolved Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Spec location** | Colocated with block implementation | Spec and implementation change together; single source of truth |
| **Validation timing** | Load time only (dev); no runtime overhead (prod) | Enterprise apps need predictable performance; load-time validation catches all errors before users see them |
| **Error format** | Rich object with suggestions | AI agents (Claude Code) can fix issues immediately; humans get actionable messages |
| **Event system** | Typed payload contracts | Enables compile-time wiring validation; documents expected data flow |
| **Test generation** | Declarative from spec | Ensures 100% coverage of validation rules; tests update automatically with spec |

### 7.2 Open Questions

#### Q1: How should we handle spec versioning and migration?

**Options:**
- **A) Strict semver with breaking change detection** - Automatically detect breaking prop/event changes and require major version bump
- **B) Parallel spec versions** - Allow multiple spec versions to coexist; products declare which version they target
- **C) Automatic migration** - Generate codemods when specs change

**Recommendation:** Start with **A**, add **C** later. Breaking changes should be explicit. Migration tooling can be added when we have real-world migration needs.

---

#### Q2: Should props support reactivity (re-validation on external changes)?

**Scenario:** A prop references entity type `part`. At load time, `part` exists. Later, `part` is deleted. What happens?

**Options:**
- **A) Load-time only** - No re-validation; runtime errors if references break
- **B) Reactive validation** - Watch for schema changes, re-validate affected blocks
- **C) Soft dependencies** - Mark references as "stable" vs "dynamic"; only dynamic re-validates

**Recommendation:** **A** for v1, with clear runtime error messages. Reactive validation adds significant complexity. Schema changes should be rare in production.

---

#### Q3: How do we handle async validators (e.g., check entity exists in DB)?

**Options:**
- **A) Sync only** - All validators must be synchronous; async checks are runtime responsibility
- **B) Async validators** - Validators return `Promise<ValidationResult>`; validation is async
- **C) Two-phase** - Sync validation first (type/structure), async second (existence checks)

**Recommendation:** **C** - Two-phase validation. Sync phase catches 95% of errors instantly. Async phase handles existence checks. Clear separation of concerns.

```typescript
interface ValidationPhases {
  /** Sync: Type checking, pattern matching, structure */
  structural(config: BlockConfig): ValidationResult;

  /** Async: Entity existence, permission checks */
  semantic(config: BlockConfig): Promise<ValidationResult>;
}
```

---

#### Q4: Should blocks declare their CSS/styling contract?

**Problem:** Blocks need styling. But styling shouldn't break when products use custom themes.

**Options:**
- **A) CSS-in-JS with theme tokens** - Blocks use semantic tokens (`--trellis-primary`, etc.)
- **B) Style props** - Explicit style props in spec (colors, spacing, etc.)
- **C) CSS parts** - Expose named CSS parts for external styling

**Recommendation:** **A + B** - Theme tokens for consistency, style props for explicit customization. Style props are typed and validated like any other prop.

---

#### Q5: How granular should event payloads be typed?

**Example:** `rowSelected` event - should payload include:
- Just `entityId`?
- Full `entity` object?
- Both, with entity optional?
- User-configurable via props?

**Options:**
- **A) Minimal payloads** - Just IDs; receivers fetch data if needed
- **B) Rich payloads** - Include full objects; optimize for common cases
- **C) Configurable** - Props control payload richness

**Recommendation:** **B** with lazy loading option. Most receivers need the data anyway; network roundtrips are expensive. Add `include` prop for heavy entities.

---

#### Q6: How do we handle internationalization in specs?

**Problem:** Error messages, descriptions, labels - should specs be i18n-aware?

**Options:**
- **A) English only in specs** - i18n at render layer only
- **B) Message keys** - Specs use keys (`errors.prop.required`); runtime looks up translations
- **C) Inline templates** - Specs include interpolated messages; translation extracts strings

**Recommendation:** **B** - Message keys. Enables translation without changing specs. Error template interpolation happens after i18n lookup.

---

### 7.3 Key Tradeoffs

| Tradeoff | We Chose | We Accept |
|----------|----------|-----------|
| **Validation thoroughness vs. performance** | Thorough at load time | Slower initial load (acceptable for enterprise apps) |
| **Type safety vs. flexibility** | Strong typing | More verbose specs; harder to do "one-off" dynamic blocks |
| **Helpful errors vs. code size** | Rich error objects with suggestions | Larger validation code; more memory for error strings (stripped in prod) |
| **Spec expressiveness vs. complexity** | Full validator system | Learning curve for block authors; more concepts to understand |
| **Test coverage vs. test speed** | Generated tests for every rule | Large test suites; need parallel execution |

---

### 7.4 Example Complete BlockSpec

To tie it all together, here's what a real block spec looks like:

```typescript
export const DataTableSpec: BlockSpec = {
  type: 'trellis.data-table' as BlockType,
  version: '1.0.0',
  name: 'Data Table',
  description: 'Displays entities in a sortable, filterable table with row selection',
  category: 'data',

  props: {
    entityType: {
      type: { kind: 'entityType' },
      required: true,
      description: 'The entity type to display',
      validators: [Validators.entityTypeExists()],
      ui: { group: 'Data', order: 1 }
    },

    columns: {
      type: {
        kind: 'list',
        element: {
          kind: 'record',
          fields: {
            property: {
              type: { kind: 'entityProperty', ofType: 'self' },
              required: true,
              description: 'Property to display in this column',
              validators: [Validators.propertyExistsOnType('self')]
            },
            label: {
              type: { kind: 'text' },
              required: false,
              description: 'Column header (defaults to property name)'
            },
            width: {
              type: { kind: 'number', min: 50 },
              required: false,
              description: 'Column width in pixels'
            },
            sortable: {
              type: { kind: 'boolean' },
              required: false,
              default: true,
              description: 'Whether column is sortable'
            }
          }
        },
        minLength: 1
      },
      required: true,
      description: 'Columns to display',
      ui: { group: 'Columns', order: 2 }
    },

    selectable: {
      type: { kind: 'boolean' },
      required: false,
      default: false,
      description: 'Enable row selection',
      ui: { group: 'Behavior', order: 1 }
    },

    pageSize: {
      type: { kind: 'number', min: 1, max: 1000, integer: true },
      required: false,
      default: 25,
      description: 'Rows per page',
      ui: { group: 'Pagination', order: 1, showWhen: { prop: 'paginated', equals: true } }
    },

    rowFilter: {
      type: { kind: 'expression' },
      required: false,
      description: 'Expression to filter rows (e.g., status == "active")',
      validators: [Validators.validExpression()],
      ui: { group: 'Data', order: 3, advanced: true }
    }
  },

  emits: {
    rowSelected: {
      description: 'Emitted when a row is clicked',
      payload: {
        kind: 'record',
        fields: {
          entityId: { type: { kind: 'entityId' }, required: true },
          entity: { type: { kind: 'entity' }, required: true },
          rowIndex: { type: { kind: 'primitive', type: 'number' }, required: true }
        }
      },
      emittedWhen: 'User clicks on a table row',
      example: { entityId: 'ent_abc123', entity: { id: 'ent_abc123', type: 'part', properties: {} }, rowIndex: 0 }
    },

    selectionChanged: {
      description: 'Emitted when selection changes (multi-select mode)',
      payload: {
        kind: 'record',
        fields: {
          selectedIds: { type: { kind: 'array', element: { kind: 'entityId' } }, required: true },
          count: { type: { kind: 'primitive', type: 'number' }, required: true }
        }
      },
      emittedWhen: 'User checks/unchecks rows or uses select-all'
    },

    pageChanged: {
      description: 'Emitted when page changes',
      payload: {
        kind: 'record',
        fields: {
          page: { type: { kind: 'primitive', type: 'number' }, required: true },
          pageSize: { type: { kind: 'primitive', type: 'number' }, required: true }
        }
      },
      emittedWhen: 'User navigates to different page'
    }
  },

  receives: {
    loadEntity: {
      description: 'Scroll to and highlight a specific entity',
      payload: {
        kind: 'record',
        fields: {
          entityId: { type: { kind: 'entityId' }, required: true }
        }
      },
      behavior: 'Scrolls table to row containing entity, highlights it',
      requiredFields: ['entityId']
    },

    setFilter: {
      description: 'Apply a filter to the table',
      payload: {
        kind: 'record',
        fields: {
          filter: { type: { kind: 'record', fields: {} }, required: true }  // FilterGroup
        }
      },
      behavior: 'Applies filter, reloads data, resets to page 1'
    },

    refresh: {
      description: 'Reload table data',
      payload: { kind: 'void' },
      behavior: 'Reloads data from server, maintains current page/selection'
    }
  },

  slots: {
    toolbar: {
      description: 'Toolbar rendered above the table',
      cardinality: 'many',
      accepts: ['trellis.filter-bar', 'trellis.search', 'trellis.button', 'trellis.toolbar'],
      default: []
    },
    emptyState: {
      description: 'Content shown when table has no data',
      cardinality: 'one',
      default: [{ type: 'trellis.empty-state', props: { message: 'No data found' } }]
    }
  },

  validators: [
    {
      id: 'columns-reference-valid-properties',
      description: 'All column properties must exist on entity type',
      errorTemplate: 'Column references invalid property. See individual column errors.',
      validate: (config, ctx) => {
        // Cross-validated by individual column validators
        return success();
      }
    }
  ],

  requires: {
    entityTypes: [],  // Validated dynamically based on entityType prop
    blocks: [],
    features: []
  }
};
```

---

## Summary

This design delivers a complete Block system with:

| Component | Purpose |
|-----------|---------|
| **BlockSpec** | Typed contract defining props, events, receivers, slots |
| **PropSpec** | Rich prop definitions with types, validators, defaults, UI hints |
| **Validators** | Composable validation rules with context-aware checks (entity types exist, properties valid) |
| **Event System** | Typed emits/receives with payload compatibility checking |
| **Wiring** | YAML syntax for connecting blocks, validated at load time |
| **ValidationError** | Rich errors with suggestions, enabling AI-assisted fixes |
| **Test Generation** | Automatic tests from every rule in a spec |

**Key design principles:**

1. **Validation at load time, not runtime** - catch all errors before users see them
2. **Errors that suggest fixes** - Claude Code can immediately resolve issues
3. **Specs are executable contracts** - not documentation, but enforceable rules
4. **Context-aware validation** - validators know about entity types, other blocks, tenant context
5. **Tests generated from specs** - 100% coverage of validation rules, automatically

This system enables parallel block development because the contract is clear, enforceable, and testable before integration.
