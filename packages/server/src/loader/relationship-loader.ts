/**
 * Trellis Product Loader - Relationship Schema Loader
 *
 * Converts YAML relationship configurations to database schema format.
 */

import type { PropertyConfig } from '../config/types.js';
import type {
  RelationshipSchemaRecord,
  PropertySchemaJson,
} from './types.js';
import { convertProperty } from './schema-generator.js';

// =============================================================================
// RELATIONSHIP CONFIG TYPES
// =============================================================================

/**
 * Relationship type configuration from YAML.
 * Note: This extends the product config spec for relationships.
 */
export interface RelationshipTypeConfig {
  /** Unique identifier */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Description */
  readonly description?: string;

  /** Entity types that can be the source */
  readonly from_types: readonly string[];

  /** Entity types that can be the target */
  readonly to_types: readonly string[];

  /** Relationship cardinality */
  readonly cardinality?:
    | 'one_to_one'
    | 'one_to_many'
    | 'many_to_one'
    | 'many_to_many';

  /** Whether this is bidirectional */
  readonly bidirectional?: boolean;

  /** Inverse relationship type (if bidirectional) */
  readonly inverse_type?: string;

  /** Metadata properties on the relationship */
  readonly metadata?: Readonly<Record<string, PropertyConfig>>;
}

// =============================================================================
// MAIN GENERATOR
// =============================================================================

/**
 * Generate a relationship_schemas record from a relationship type configuration.
 */
export function generateRelationshipSchema(
  config: RelationshipTypeConfig,
  tenantId: string | null
): RelationshipSchemaRecord {
  // Convert metadata properties to schema format
  const metadataSchema: Record<string, PropertySchemaJson> = {};

  if (config.metadata) {
    for (const [name, propConfig] of Object.entries(config.metadata)) {
      metadataSchema[name] = convertProperty({
        ...propConfig,
        name, // Ensure name matches the key
      });
    }
  }

  return {
    tenant_id: tenantId,
    type: config.id,
    name: config.name,
    description: config.description ?? null,
    from_types: [...config.from_types],
    to_types: [...config.to_types],
    cardinality: config.cardinality ?? 'many_to_many',
    bidirectional: config.bidirectional ?? false,
    inverse_type: config.inverse_type ?? null,
    metadata_schema: metadataSchema,
  };
}

/**
 * Generate the inverse relationship schema if bidirectional.
 */
export function generateInverseRelationshipSchema(
  config: RelationshipTypeConfig,
  tenantId: string | null
): RelationshipSchemaRecord | null {
  if (!config.bidirectional || !config.inverse_type) {
    return null;
  }

  // Swap from/to types and invert cardinality
  const inverseCardinality = invertCardinality(config.cardinality ?? 'many_to_many');

  return {
    tenant_id: tenantId,
    type: config.inverse_type,
    name: `Inverse of ${config.name}`,
    description: config.description
      ? `Inverse relationship: ${config.description}`
      : null,
    from_types: [...config.to_types],
    to_types: [...config.from_types],
    cardinality: inverseCardinality,
    bidirectional: true,
    inverse_type: config.id,
    metadata_schema: {}, // Inverse typically doesn't have metadata
  };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Invert a cardinality (swap one/many for from/to sides).
 */
function invertCardinality(
  cardinality: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many'
): 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many' {
  switch (cardinality) {
    case 'one_to_many':
      return 'many_to_one';
    case 'many_to_one':
      return 'one_to_many';
    default:
      return cardinality; // one_to_one and many_to_many are symmetric
  }
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Generate all relationship schemas from a list of relationship configs.
 */
export function generateAllRelationshipSchemas(
  relationships: readonly RelationshipTypeConfig[],
  tenantId: string | null
): RelationshipSchemaRecord[] {
  const schemas: RelationshipSchemaRecord[] = [];

  for (const config of relationships) {
    // Generate primary relationship
    schemas.push(generateRelationshipSchema(config, tenantId));

    // Generate inverse if bidirectional
    const inverse = generateInverseRelationshipSchema(config, tenantId);
    if (inverse) {
      schemas.push(inverse);
    }
  }

  return schemas;
}

/**
 * Validate relationship configurations.
 */
export function validateRelationshipConfigs(
  relationships: readonly RelationshipTypeConfig[],
  entityIds: ReadonlySet<string>
): string[] {
  const errors: string[] = [];
  const seenTypes = new Set<string>();

  for (const config of relationships) {
    // Check for duplicate type IDs
    if (seenTypes.has(config.id)) {
      errors.push(`Duplicate relationship type ID: '${config.id}'`);
    }
    seenTypes.add(config.id);

    // Check inverse type doesn't conflict
    if (config.inverse_type) {
      if (seenTypes.has(config.inverse_type)) {
        errors.push(
          `Inverse type '${config.inverse_type}' conflicts with existing relationship`
        );
      }
      seenTypes.add(config.inverse_type);
    }

    // Validate from_types reference valid entities
    for (const fromType of config.from_types) {
      if (!entityIds.has(fromType) && !fromType.startsWith('trellis.')) {
        errors.push(
          `Relationship '${config.id}' references unknown from_type: '${fromType}'`
        );
      }
    }

    // Validate to_types reference valid entities
    for (const toType of config.to_types) {
      if (!entityIds.has(toType) && !toType.startsWith('trellis.')) {
        errors.push(
          `Relationship '${config.id}' references unknown to_type: '${toType}'`
        );
      }
    }

    // Bidirectional relationships must have inverse_type
    if (config.bidirectional && !config.inverse_type) {
      errors.push(
        `Bidirectional relationship '${config.id}' must specify inverse_type`
      );
    }
  }

  return errors;
}

// =============================================================================
// STANDARD RELATIONSHIPS
// =============================================================================

/**
 * Standard relationship types that can be auto-generated.
 */
export const StandardRelationships = {
  /**
   * Bill of Materials relationship (parent assembly contains child parts).
   */
  BOM_CONTAINS: (tenantId: string | null): RelationshipSchemaRecord => ({
    tenant_id: tenantId,
    type: 'bom_contains',
    name: 'BOM Contains',
    description: 'Parent assembly contains child parts or sub-assemblies',
    from_types: ['assembly'],
    to_types: ['part', 'assembly'],
    cardinality: 'one_to_many',
    bidirectional: true,
    inverse_type: 'contained_in',
    metadata_schema: {
      quantity: {
        name: 'quantity',
        value_type: 'number',
        required: true,
        default: 1,
      },
      reference_designator: {
        name: 'reference_designator',
        value_type: 'text',
        required: false,
      },
      find_number: {
        name: 'find_number',
        value_type: 'number',
        required: false,
      },
    },
  }),

  /**
   * Document attachment relationship.
   */
  HAS_DOCUMENT: (tenantId: string | null): RelationshipSchemaRecord => ({
    tenant_id: tenantId,
    type: 'has_document',
    name: 'Has Document',
    description: 'Entity has an attached document',
    from_types: ['*'], // Any entity type
    to_types: ['document'],
    cardinality: 'many_to_many',
    bidirectional: true,
    inverse_type: 'attached_to',
    metadata_schema: {
      attachment_type: {
        name: 'attachment_type',
        value_type: 'option',
        required: false,
        options: [
          { value: 'specification', label: 'Specification' },
          { value: 'drawing', label: 'Drawing' },
          { value: 'manual', label: 'Manual' },
          { value: 'other', label: 'Other' },
        ],
      },
    },
  }),

  /**
   * Generic parent-child hierarchy.
   */
  PARENT_OF: (tenantId: string | null): RelationshipSchemaRecord => ({
    tenant_id: tenantId,
    type: 'parent_of',
    name: 'Parent Of',
    description: 'Generic parent-child relationship',
    from_types: ['*'],
    to_types: ['*'],
    cardinality: 'one_to_many',
    bidirectional: true,
    inverse_type: 'child_of',
    metadata_schema: {},
  }),
};
