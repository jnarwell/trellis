/**
 * Trellis Product Loader - Seed Data Loader
 *
 * Loads initial entity data from seed configuration files.
 */

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { glob } from 'glob';
import * as yaml from 'js-yaml';
import type { TenantId, ActorId, EntityId } from '@trellis/kernel';
import type { EntityTypeConfig, PropertyConfig, PropertyTypeConfig } from '../config/types.js';
import type { SeedEntityConfig, SeedRelationshipConfig } from './types.js';

// =============================================================================
// SEED FILE TYPES
// =============================================================================

/**
 * Seed file configuration (parsed from YAML).
 */
export interface SeedFileConfig {
  /** Entities to create */
  readonly entities?: readonly SeedEntityConfig[];

  /** Relationships to create */
  readonly relationships?: readonly SeedRelationshipConfig[];
}

/**
 * Resolved entity with generated ID.
 */
export interface ResolvedSeedEntity {
  /** Generated or specified ID */
  readonly id: string;

  /** Entity type */
  readonly type: string;

  /** Property values in database format */
  readonly properties: Record<string, unknown>;

  /** Original reference ID (for relationship resolution) */
  readonly refId?: string;
}

/**
 * Resolved relationship ready for database.
 */
export interface ResolvedSeedRelationship {
  /** Relationship type */
  readonly type: string;

  /** From entity ID */
  readonly from_entity: string;

  /** To entity ID */
  readonly to_entity: string;

  /** Relationship metadata */
  readonly metadata: Record<string, unknown>;
}

// =============================================================================
// SEED FILE LOADER
// =============================================================================

/**
 * Load seed files from glob patterns.
 */
export async function loadSeedFiles(
  basePath: string,
  patterns: string | readonly string[]
): Promise<SeedFileConfig[]> {
  const patternList = typeof patterns === 'string' ? [patterns] : [...patterns];
  const files: string[] = [];

  for (const pattern of patternList) {
    const matches = await glob(pattern, {
      cwd: basePath,
      absolute: true,
    });
    files.push(...matches);
  }

  // Sort for consistent ordering
  files.sort();

  const configs: SeedFileConfig[] = [];

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const parsed = yaml.load(content) as SeedFileConfig;
    if (parsed) {
      configs.push(parsed);
    }
  }

  return configs;
}

/**
 * Merge multiple seed configs into one.
 */
export function mergeSeedConfigs(configs: readonly SeedFileConfig[]): SeedFileConfig {
  const entities: SeedEntityConfig[] = [];
  const relationships: SeedRelationshipConfig[] = [];

  for (const config of configs) {
    if (config.entities) {
      entities.push(...config.entities);
    }
    if (config.relationships) {
      relationships.push(...config.relationships);
    }
  }

  return { entities, relationships };
}

// =============================================================================
// ENTITY RESOLUTION
// =============================================================================

/**
 * Generate a UUID v7 (time-ordered) for an entity.
 * Uses crypto for randomness.
 */
export function generateEntityId(): string {
  const timestamp = Date.now();
  const timestampHex = timestamp.toString(16).padStart(12, '0');

  // Generate random bytes
  const randomBytes = new Uint8Array(10);
  crypto.getRandomValues(randomBytes);
  const randomHex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // UUID v7 format: tttttttt-tttt-7xxx-yxxx-xxxxxxxxxxxx
  // Where t is timestamp, 7 is version, y is variant (8-b)
  const uuid = [
    timestampHex.slice(0, 8),
    timestampHex.slice(8, 12),
    '7' + randomHex.slice(0, 3),
    ((parseInt(randomHex.slice(3, 4), 16) & 0x3) | 0x8).toString(16) + randomHex.slice(4, 7),
    randomHex.slice(7, 19),
  ].join('-');

  return uuid;
}

/**
 * Resolve seed entities to database-ready format.
 */
export function resolveSeedEntities(
  config: SeedFileConfig,
  entitySchemas: Readonly<Record<string, EntityTypeConfig>>,
  idGenerator: () => string = generateEntityId
): ResolvedSeedEntity[] {
  const resolved: ResolvedSeedEntity[] = [];

  if (!config.entities) {
    return resolved;
  }

  for (const entity of config.entities) {
    const schema = entitySchemas[entity.type];
    if (!schema) {
      throw new Error(`Unknown entity type in seed data: '${entity.type}'`);
    }

    // Generate ID if not provided
    const id = entity.id ?? idGenerator();

    // Convert properties to database format
    const properties = convertPropertiesToDbFormat(entity.data, schema);

    resolved.push({
      id,
      type: entity.type,
      properties,
      ...(entity.id ? { refId: entity.id } : {}),
    });
  }

  return resolved;
}

/**
 * Convert property values to database JSONB format.
 */
export function convertPropertiesToDbFormat(
  data: Readonly<Record<string, unknown>>,
  schema: EntityTypeConfig
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const propConfig of schema.properties) {
    const value = data[propConfig.name];

    if (value !== undefined) {
      result[propConfig.name] = convertPropertyValue(value, propConfig);
    } else if (propConfig.default !== undefined) {
      result[propConfig.name] = convertPropertyValue(propConfig.default, propConfig);
    }
  }

  return result;
}

/**
 * Convert a single property value to database format.
 * Wraps the value in the property source structure.
 */
function convertPropertyValue(
  value: unknown,
  propConfig: PropertyConfig
): unknown {
  const valueType = getValueType(propConfig.type);

  // Wrap in literal property source format
  return {
    source: 'literal',
    value: {
      type: valueType,
      value: normalizeValue(value, propConfig.type),
    },
  };
}

/**
 * Get the value type string from property type config.
 */
function getValueType(type: PropertyTypeConfig): string {
  if (typeof type === 'string') {
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
 * Normalize a value based on its type.
 */
function normalizeValue(value: unknown, type: PropertyTypeConfig): unknown {
  const valueType = getValueType(type);

  switch (valueType) {
    case 'number':
    case 'integer':
      return typeof value === 'string' ? parseFloat(value) : value;

    case 'boolean':
      return typeof value === 'string'
        ? value.toLowerCase() === 'true'
        : Boolean(value);

    case 'datetime':
    case 'date':
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'string') {
        return new Date(value).toISOString();
      }
      return value;

    case 'list':
      if (!Array.isArray(value)) {
        return [value];
      }
      return value;

    default:
      return value;
  }
}

// =============================================================================
// RELATIONSHIP RESOLUTION
// =============================================================================

/**
 * Resolve seed relationships using entity reference IDs.
 */
export function resolveSeedRelationships(
  config: SeedFileConfig,
  entities: readonly ResolvedSeedEntity[]
): ResolvedSeedRelationship[] {
  if (!config.relationships) {
    return [];
  }

  // Build lookup from ref ID to actual ID
  const refToId = new Map<string, string>();
  for (const entity of entities) {
    if (entity.refId) {
      refToId.set(entity.refId, entity.id);
    }
    // Also allow lookup by actual ID
    refToId.set(entity.id, entity.id);
  }

  const resolved: ResolvedSeedRelationship[] = [];

  for (const rel of config.relationships) {
    const fromId = refToId.get(rel.from);
    const toId = refToId.get(rel.to);

    if (!fromId) {
      throw new Error(
        `Relationship references unknown 'from' entity: '${rel.from}'`
      );
    }

    if (!toId) {
      throw new Error(
        `Relationship references unknown 'to' entity: '${rel.to}'`
      );
    }

    resolved.push({
      type: rel.type,
      from_entity: fromId,
      to_entity: toId,
      metadata: rel.metadata ?? {},
    });
  }

  return resolved;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate seed data configuration.
 */
export function validateSeedData(
  config: SeedFileConfig,
  entitySchemas: Readonly<Record<string, EntityTypeConfig>>
): string[] {
  const errors: string[] = [];

  if (config.entities) {
    const seenIds = new Set<string>();

    for (let i = 0; i < config.entities.length; i++) {
      const entity = config.entities[i];
      if (!entity) continue;

      // Check entity type exists
      if (!entitySchemas[entity.type]) {
        errors.push(
          `Seed entity [${i}] references unknown type: '${entity.type}'`
        );
        continue;
      }

      // Check for duplicate IDs
      if (entity.id) {
        if (seenIds.has(entity.id)) {
          errors.push(`Duplicate seed entity ID: '${entity.id}'`);
        }
        seenIds.add(entity.id);
      }

      // Validate required properties
      const schema = entitySchemas[entity.type];
      if (schema) {
        for (const prop of schema.properties) {
          if (
            prop.required &&
            entity.data[prop.name] === undefined &&
            prop.default === undefined
          ) {
            errors.push(
              `Seed entity [${i}] (${entity.type}) missing required property: '${prop.name}'`
            );
          }
        }
      }
    }
  }

  if (config.relationships) {
    const entityIds = new Set<string>();

    // Collect all entity IDs/refs
    if (config.entities) {
      for (const entity of config.entities) {
        if (entity.id) {
          entityIds.add(entity.id);
        }
      }
    }

    for (let i = 0; i < config.relationships.length; i++) {
      const rel = config.relationships[i];
      if (!rel) continue;

      // Check from/to references exist (if using refs)
      if (rel.from && !entityIds.has(rel.from) && !isUUID(rel.from)) {
        errors.push(
          `Seed relationship [${i}] references unknown 'from' entity: '${rel.from}'`
        );
      }

      if (rel.to && !entityIds.has(rel.to) && !isUUID(rel.to)) {
        errors.push(
          `Seed relationship [${i}] references unknown 'to' entity: '${rel.to}'`
        );
      }
    }
  }

  return errors;
}

/**
 * Check if a string is a valid UUID format.
 */
function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str
  );
}

// =============================================================================
// DATABASE INSERT HELPERS
// =============================================================================

/**
 * Build INSERT SQL for entities (for raw SQL execution).
 */
export function buildEntityInsertSql(
  entities: readonly ResolvedSeedEntity[],
  tenantId: string,
  actorId: string
): { sql: string; values: unknown[] } {
  if (entities.length === 0) {
    return { sql: '', values: [] };
  }

  const values: unknown[] = [];
  const valuePlaceholders: string[] = [];

  for (const entity of entities) {
    const baseIdx = values.length;
    values.push(
      entity.id,
      tenantId,
      entity.type,
      JSON.stringify(entity.properties),
      1, // version
      actorId
    );

    valuePlaceholders.push(
      `($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5}, $${baseIdx + 6})`
    );
  }

  const sql = `
    INSERT INTO entities (id, tenant_id, type_path, properties, version, created_by)
    VALUES ${valuePlaceholders.join(', ')}
    RETURNING id
  `;

  return { sql: sql.trim(), values };
}

/**
 * Build INSERT SQL for relationships.
 */
export function buildRelationshipInsertSql(
  relationships: readonly ResolvedSeedRelationship[],
  tenantId: string,
  actorId: string
): { sql: string; values: unknown[] } {
  if (relationships.length === 0) {
    return { sql: '', values: [] };
  }

  const values: unknown[] = [];
  const valuePlaceholders: string[] = [];

  for (const rel of relationships) {
    const baseIdx = values.length;
    values.push(
      tenantId,
      rel.type,
      rel.from_entity,
      rel.to_entity,
      JSON.stringify(rel.metadata),
      actorId
    );

    valuePlaceholders.push(
      `(uuid_generate_v7(), $${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5}, $${baseIdx + 6})`
    );
  }

  const sql = `
    INSERT INTO relationships (id, tenant_id, type, from_entity, to_entity, metadata, created_by)
    VALUES ${valuePlaceholders.join(', ')}
    RETURNING id
  `;

  return { sql: sql.trim(), values };
}
