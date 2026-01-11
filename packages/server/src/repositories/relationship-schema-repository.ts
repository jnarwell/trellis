/**
 * Trellis Server - Relationship Schema Repository
 *
 * Database access layer for relationship schemas (type definitions).
 */

import type { TenantScopedClient } from '../db/client.js';
import type {
  RelationshipType,
  RelationshipSchema,
  Cardinality,
  TypePath,
  ValueType,
} from '@trellis/kernel';

/**
 * Row shape from the relationship_schemas table.
 */
interface RelationshipSchemaRow {
  id: string;
  tenant_id: string | null;
  type: string;
  name: string;
  description: string | null;
  from_types: string[];
  to_types: string[];
  cardinality: Cardinality;
  bidirectional: boolean;
  inverse_type: string | null;
  metadata_schema: Record<string, ValueType>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Map a database row to a RelationshipSchema object.
 */
function mapRowToSchema(row: RelationshipSchemaRow): RelationshipSchema {
  const base = {
    type: row.type as RelationshipType,
    name: row.name,
    from_types: row.from_types as TypePath[],
    to_types: row.to_types as TypePath[],
    cardinality: row.cardinality,
    bidirectional: row.bidirectional,
    metadata_schema: row.metadata_schema,
  };

  // Build optional properties conditionally
  if (row.description !== null && row.inverse_type !== null) {
    return {
      ...base,
      description: row.description,
      inverse_type: row.inverse_type as RelationshipType,
    } as RelationshipSchema;
  } else if (row.description !== null) {
    return { ...base, description: row.description } as RelationshipSchema;
  } else if (row.inverse_type !== null) {
    return { ...base, inverse_type: row.inverse_type as RelationshipType } as RelationshipSchema;
  }

  return base as RelationshipSchema;
}

/**
 * Find a relationship schema by type.
 * Checks tenant-specific schemas first, then system-wide schemas.
 */
export async function findRelationshipSchemaByType(
  client: TenantScopedClient,
  type: RelationshipType
): Promise<RelationshipSchema | null> {
  // Query returns tenant-specific first (if exists), then system-wide
  // ORDER BY tenant_id NULLS LAST ensures tenant-specific takes priority
  const result = await client.query<RelationshipSchemaRow>(
    `SELECT * FROM relationship_schemas
     WHERE type = $1
       AND (tenant_id = $2 OR tenant_id IS NULL)
     ORDER BY tenant_id NULLS LAST
     LIMIT 1`,
    [type, client.tenantId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return mapRowToSchema(row);
}

/**
 * Check if an entity type matches the allowed types in a relationship schema.
 * Uses ltree hierarchy matching: 'product.variant' matches 'product.*'
 */
export async function typeMatchesAllowed(
  client: TenantScopedClient,
  entityTypePath: string,
  allowedTypes: readonly TypePath[]
): Promise<boolean> {
  // Empty array means any type is allowed
  if (allowedTypes.length === 0) {
    return true;
  }

  // Use ltree operators to check if entity type matches any allowed type
  // @> is the "contains" operator: 'product' @> 'product.variant' is true
  const result = await client.query<{ matches: boolean }>(
    `SELECT EXISTS(
      SELECT 1 FROM unnest($1::ltree[]) as allowed_type
      WHERE $2::ltree <@ allowed_type OR $2::ltree = allowed_type
    ) as matches`,
    [allowedTypes, entityTypePath]
  );

  const row = result.rows[0];
  return row?.matches ?? false;
}

/**
 * List all relationship schemas visible to the current tenant.
 */
export async function listRelationshipSchemas(
  client: TenantScopedClient
): Promise<RelationshipSchema[]> {
  const result = await client.query<RelationshipSchemaRow>(
    `SELECT * FROM relationship_schemas
     WHERE tenant_id = $1 OR tenant_id IS NULL
     ORDER BY type`,
    [client.tenantId]
  );

  return result.rows.map(mapRowToSchema);
}
