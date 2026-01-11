/**
 * Trellis Product Loader - Schema Generator
 *
 * Converts YAML entity type configurations to database schema format.
 */

import type {
  EntityTypeConfig,
  PropertyConfig,
  PropertyTypeConfig,
  ComputedPropertyConfig,
  LifecycleConfig,
} from '../config/types.js';
import type {
  TypeSchemaRecord,
  PropertySchemaJson,
  OptionSchemaJson,
  LifecycleSchemaJson,
  LifecycleStateJson,
  LifecycleTransitionJson,
} from './types.js';

/** Mutable version for building */
type MutablePropertySchema = {
  -readonly [K in keyof PropertySchemaJson]: PropertySchemaJson[K];
};

// =============================================================================
// MAIN GENERATOR
// =============================================================================

/**
 * Generate a type_schemas record from an entity type configuration.
 */
export function generateTypeSchema(
  entityId: string,
  config: EntityTypeConfig,
  tenantId: string | null
): TypeSchemaRecord {
  // Convert properties
  const properties: PropertySchemaJson[] = config.properties.map((p) =>
    convertProperty(p)
  );

  // Add computed properties
  if (config.computed) {
    for (const cp of config.computed) {
      properties.push(convertComputedProperty(cp));
    }
  }

  // Add lifecycle state property if lifecycle is defined
  if (config.lifecycle) {
    const stateProperty = config.lifecycle.stateProperty ?? 'status';
    // Check if status property already exists
    const existingIdx = properties.findIndex((p) => p.name === stateProperty);
    if (existingIdx === -1) {
      properties.push(generateLifecycleStateProperty(config.lifecycle));
    }
  }

  return {
    tenant_id: tenantId,
    type_path: entityId,
    name: config.name,
    description: config.description ?? null,
    extends_type: config.extends ?? null,
    properties,
    abstract: config.abstract ?? false,
  };
}

/**
 * Generate lifecycle schema from config.
 */
export function generateLifecycleSchema(
  config: LifecycleConfig
): LifecycleSchemaJson {
  return {
    state_property: config.stateProperty ?? 'status',
    initial_state: config.initialState,
    states: config.states.map((s): LifecycleStateJson => ({
      value: s.value,
      label: s.label,
      ...(s.color ? { color: s.color } : {}),
      ...(s.icon ? { icon: s.icon } : {}),
      ...(s.editable !== undefined ? { editable: s.editable } : {}),
      ...(s.deletable !== undefined ? { deletable: s.deletable } : {}),
    })),
    transitions: config.transitions.map((t): LifecycleTransitionJson => ({
      from: t.from,
      to: t.to,
      action: t.action,
      ...(t.label ? { label: t.label } : {}),
      ...(t.permission ? { permission: t.permission } : {}),
      ...(t.when ? { when: t.when } : {}),
    })),
  };
}

// =============================================================================
// PROPERTY CONVERTERS
// =============================================================================

/**
 * Convert a property config to JSON schema format.
 */
export function convertProperty(prop: PropertyConfig): PropertySchemaJson {
  const valueType = getValueType(prop.type);

  const result: PropertySchemaJson = {
    name: prop.name,
    value_type: valueType,
    required: prop.required ?? false,
  };

  // Add optional fields only if present
  const extras = buildPropertyExtras(prop);
  return { ...result, ...extras };
}

/**
 * Convert a computed property to JSON schema format.
 */
export function convertComputedProperty(
  prop: ComputedPropertyConfig
): PropertySchemaJson {
  const result: MutablePropertySchema = {
    name: prop.name,
    value_type: 'computed',
    required: false,
    expression: prop.expression,
  };

  if (prop.dimension) result.dimension = prop.dimension;
  if (prop.unit) result.unit = prop.unit;
  if (prop.dependencies && prop.dependencies.length > 0) {
    result.dependencies = [...prop.dependencies];
  }

  return result;
}

/**
 * Generate a property for lifecycle state.
 */
function generateLifecycleStateProperty(
  lifecycle: LifecycleConfig
): PropertySchemaJson {
  const stateProperty = lifecycle.stateProperty ?? 'status';

  return {
    name: stateProperty,
    value_type: 'option',
    required: true,
    default: lifecycle.initialState,
    options: lifecycle.states.map((s): OptionSchemaJson => ({
      value: s.value,
      label: s.label,
      ...(s.color ? { color: s.color } : {}),
      ...(s.icon ? { icon: s.icon } : {}),
    })),
  };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extract the base value type from a property type config.
 */
function getValueType(type: PropertyTypeConfig): string {
  if (typeof type === 'string') {
    // Normalize string types
    switch (type) {
      case 'string':
        return 'text';
      case 'integer':
        return 'number';
      case 'date':
        return 'datetime';
      default:
        return type;
    }
  }
  return type.type;
}

/**
 * Build extra fields for a property based on its type.
 */
function buildPropertyExtras(prop: PropertyConfig): Partial<MutablePropertySchema> {
  const extras: Partial<MutablePropertySchema> = {};

  // Add unique constraint
  if (prop.unique) extras.unique = true;

  // Add default value
  if (prop.default !== undefined) extras.default = prop.default;

  // Add validation rules
  if (prop.validation) extras.validation = prop.validation;

  // Handle complex types
  if (typeof prop.type === 'object') {
    const complexExtras = buildComplexTypeExtras(prop.type);
    Object.assign(extras, complexExtras);
  }

  return extras;
}

/**
 * Build extra fields for complex property types.
 */
function buildComplexTypeExtras(
  type: Exclude<PropertyTypeConfig, string>
): Partial<MutablePropertySchema> {
  const extras: Partial<MutablePropertySchema> = {};

  switch (type.type) {
    case 'text':
      // maxLength is handled in validation
      break;

    case 'number':
    case 'integer':
      if (type.type === 'number') {
        if (type.dimension) extras.dimension = type.dimension;
        if (type.unit) extras.unit = type.unit;
      }
      break;

    case 'reference':
      extras.reference_type = type.entityType;
      if (type.displayProperty) extras.reference_display = type.displayProperty;
      break;

    case 'option':
      extras.options = type.options.map((o): OptionSchemaJson => ({
        value: o.value,
        label: o.label,
        ...(o.color ? { color: o.color } : {}),
        ...(o.icon ? { icon: o.icon } : {}),
        ...(o.description ? { description: o.description } : {}),
      }));
      break;

    case 'list':
      // Recursively convert element type
      extras.element_type = convertPropertyType(type.element);
      break;

    case 'record':
      // Convert all fields
      extras.fields = Object.fromEntries(
        Object.entries(type.fields).map(([name, fieldConfig]) => [
          name,
          convertProperty(fieldConfig),
        ])
      );
      break;

    case 'expression':
      extras.expression = type.expression;
      if (type.dimension) extras.dimension = type.dimension;
      if (type.unit) extras.unit = type.unit;
      break;

    // file, image, datetime, date, duration, boolean - no extra fields needed
  }

  return extras;
}

/**
 * Convert a property type config to a minimal property schema.
 * Used for nested types like list elements.
 */
function convertPropertyType(type: PropertyTypeConfig): PropertySchemaJson {
  const valueType = getValueType(type);

  const base: PropertySchemaJson = {
    name: '_element',
    value_type: valueType,
    required: false,
  };

  if (typeof type === 'object') {
    const extras = buildComplexTypeExtras(type);
    return { ...base, ...extras };
  }

  return base;
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Generate all type schemas from a product config's entities.
 */
export function generateAllTypeSchemas(
  entities: Readonly<Record<string, EntityTypeConfig>>,
  tenantId: string | null
): TypeSchemaRecord[] {
  const schemas: TypeSchemaRecord[] = [];

  // Sort by extends to ensure parent types are created first
  const sortedEntities = sortByInheritance(entities);

  for (const [id, config] of sortedEntities) {
    schemas.push(generateTypeSchema(id, config, tenantId));
  }

  return schemas;
}

/**
 * Sort entities by inheritance order (parents before children).
 */
function sortByInheritance(
  entities: Readonly<Record<string, EntityTypeConfig>>
): Array<[string, EntityTypeConfig]> {
  const entries = Object.entries(entities);
  const sorted: Array<[string, EntityTypeConfig]> = [];
  const pending = new Map(entries);
  const resolved = new Set<string>();

  // Keep resolving until all are sorted
  let iterations = 0;
  const maxIterations = entries.length * 2;

  while (pending.size > 0 && iterations < maxIterations) {
    iterations++;

    for (const [id, config] of pending) {
      // If no extends, or extends is already resolved, add to sorted
      if (!config.extends || resolved.has(config.extends)) {
        sorted.push([id, config]);
        resolved.add(id);
        pending.delete(id);
      }
    }
  }

  // If there are still pending items, there's a circular reference
  // Add them anyway (validation should catch this)
  for (const [id, config] of pending) {
    sorted.push([id, config]);
  }

  return sorted;
}

/**
 * Validate that all extends references are valid.
 */
export function validateInheritance(
  entities: Readonly<Record<string, EntityTypeConfig>>
): string[] {
  const errors: string[] = [];
  const entityIds = new Set(Object.keys(entities));

  for (const [id, config] of Object.entries(entities)) {
    if (config.extends) {
      // Check if extends a known entity or a system type
      if (!entityIds.has(config.extends) && !config.extends.startsWith('trellis.')) {
        errors.push(`Entity '${id}' extends unknown type '${config.extends}'`);
      }
    }
  }

  // Check for circular inheritance
  const circularErrors = detectCircularInheritance(entities);
  errors.push(...circularErrors);

  return errors;
}

/**
 * Detect circular inheritance chains.
 */
function detectCircularInheritance(
  entities: Readonly<Record<string, EntityTypeConfig>>
): string[] {
  const errors: string[] = [];

  for (const startId of Object.keys(entities)) {
    const visited = new Set<string>();
    let current = startId;

    while (current) {
      if (visited.has(current)) {
        const chain = [...visited, current].join(' -> ');
        errors.push(`Circular inheritance detected: ${chain}`);
        break;
      }

      visited.add(current);
      const config = entities[current];
      current = config?.extends ?? '';

      // Stop if extends is a system type
      if (current.startsWith('trellis.')) {
        break;
      }
    }
  }

  return errors;
}
