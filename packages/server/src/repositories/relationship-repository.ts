/**
 * Trellis Server - Relationship Repository
 *
 * Database access layer for relationships.
 */

import type { TenantScopedClient } from '../db/client.js';
import type {
  EntityId,
  RelationshipType,
  Relationship,
  Value,
  ActorId,
} from '@trellis/kernel';

/**
 * Input for inserting a new relationship.
 */
export interface InsertRelationshipInput {
  readonly type: RelationshipType;
  readonly from_entity: EntityId;
  readonly to_entity: EntityId;
  readonly path?: string;
  readonly metadata?: Record<string, Value>;
  readonly created_by: ActorId;
}

/**
 * Options for querying relationships.
 */
export interface RelationshipQueryOptions {
  readonly type?: RelationshipType;
  readonly direction?: 'outgoing' | 'incoming' | 'both';
}

/**
 * Row shape from the relationships table.
 */
interface RelationshipRow {
  id: string;
  tenant_id: string;
  type: string;
  from_entity: string;
  to_entity: string;
  metadata: Record<string, Value>;
  path: string | null;
  created_at: Date;
  created_by: string;
}

/**
 * Map a database row to a Relationship object.
 */
function mapRowToRelationship(row: RelationshipRow): Relationship {
  const base = {
    id: row.id,
    tenant_id: row.tenant_id as Relationship['tenant_id'],
    type: row.type as RelationshipType,
    from_entity: row.from_entity as EntityId,
    to_entity: row.to_entity as EntityId,
    metadata: row.metadata,
    created_at: row.created_at.toISOString(),
    created_by: row.created_by as ActorId,
  };

  if (row.path !== null) {
    return { ...base, path: row.path } as Relationship;
  }

  return base as Relationship;
}

/**
 * Insert a new relationship.
 */
export async function insertRelationship(
  client: TenantScopedClient,
  input: InsertRelationshipInput
): Promise<Relationship> {
  const result = await client.query<RelationshipRow>(
    `INSERT INTO relationships (type, from_entity, to_entity, path, metadata, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.type,
      input.from_entity,
      input.to_entity,
      input.path ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.created_by,
    ]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('Insert did not return a row');
  }
  return mapRowToRelationship(row);
}

/**
 * Find a relationship by ID.
 */
export async function findRelationshipById(
  client: TenantScopedClient,
  id: string
): Promise<Relationship | null> {
  const result = await client.query<RelationshipRow>(
    `SELECT * FROM relationships WHERE id = $1`,
    [id]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return mapRowToRelationship(row);
}

/**
 * Delete a relationship by ID.
 * Returns true if a row was deleted, false if not found.
 */
export async function deleteRelationship(
  client: TenantScopedClient,
  id: string
): Promise<boolean> {
  const result = await client.query(
    `DELETE FROM relationships WHERE id = $1`,
    [id]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Find relationships for an entity with optional filters.
 */
export async function findRelationshipsByEntity(
  client: TenantScopedClient,
  entityId: EntityId,
  options: RelationshipQueryOptions = {}
): Promise<Relationship[]> {
  const { type, direction = 'both' } = options;
  const params: unknown[] = [];
  let paramIndex = 1;

  let whereClause: string;

  if (direction === 'outgoing') {
    whereClause = `from_entity = $${paramIndex++}`;
    params.push(entityId);
  } else if (direction === 'incoming') {
    whereClause = `to_entity = $${paramIndex++}`;
    params.push(entityId);
  } else {
    whereClause = `(from_entity = $${paramIndex++} OR to_entity = $${paramIndex++})`;
    params.push(entityId, entityId);
  }

  if (type !== undefined) {
    whereClause += ` AND type = $${paramIndex++}`;
    params.push(type);
  }

  const result = await client.query<RelationshipRow>(
    `SELECT * FROM relationships WHERE ${whereClause} ORDER BY created_at DESC`,
    params
  );

  return result.rows.map(mapRowToRelationship);
}

/**
 * Count relationships for an entity by type and direction.
 * Used for cardinality enforcement.
 */
export async function countRelationshipsByEntityAndType(
  client: TenantScopedClient,
  entityId: EntityId,
  type: RelationshipType,
  direction: 'outgoing' | 'incoming'
): Promise<number> {
  const column = direction === 'outgoing' ? 'from_entity' : 'to_entity';

  const result = await client.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM relationships WHERE ${column} = $1 AND type = $2`,
    [entityId, type]
  );

  const row = result.rows[0];
  return row ? parseInt(row.count, 10) : 0;
}

/**
 * Find the inverse relationship (for bidirectional deletion).
 */
export async function findInverseRelationship(
  client: TenantScopedClient,
  fromEntity: EntityId,
  toEntity: EntityId,
  inverseType: RelationshipType
): Promise<Relationship | null> {
  const result = await client.query<RelationshipRow>(
    `SELECT * FROM relationships
     WHERE from_entity = $1 AND to_entity = $2 AND type = $3`,
    [toEntity, fromEntity, inverseType]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return mapRowToRelationship(row);
}

/**
 * Check if an entity exists (for validation before creating relationship).
 */
export async function entityExists(
  client: TenantScopedClient,
  entityId: EntityId
): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM entities WHERE id = $1 AND deleted_at IS NULL) as exists`,
    [entityId]
  );

  const row = result.rows[0];
  return row?.exists ?? false;
}

/**
 * Get entity type path (for schema validation).
 */
export async function getEntityTypePath(
  client: TenantScopedClient,
  entityId: EntityId
): Promise<string | null> {
  const result = await client.query<{ type_path: string }>(
    `SELECT type_path::text FROM entities WHERE id = $1 AND deleted_at IS NULL`,
    [entityId]
  );

  const row = result.rows[0];
  return row?.type_path ?? null;
}
