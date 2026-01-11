/**
 * Trellis Server - Entity Repository
 *
 * Database queries for entity operations.
 * Uses tenant-scoped client for RLS.
 */

import type { TenantScopedClient } from '../db/client.js';
import type {
  EntityId,
  ActorId,
  TypePath,
  Property,
  PropertyName,
} from '@trellis/kernel';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Entity row from database.
 */
export interface EntityRow {
  id: string;
  tenant_id: string;
  type_path: string;
  properties: Record<string, Property>;
  version: number;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  deleted_at: Date | null;
  deleted_by: string | null;
}

/**
 * Input for creating an entity in the database.
 */
export interface CreateEntityData {
  id: EntityId;
  type: TypePath;
  properties: Record<PropertyName, Property>;
  createdBy: ActorId;
}

/**
 * Input for updating an entity in the database.
 */
export interface UpdateEntityData {
  id: EntityId;
  properties: Record<PropertyName, Property>;
  expectedVersion: number;
}

// =============================================================================
// REPOSITORY
// =============================================================================

/**
 * Entity repository for database operations.
 */
export class EntityRepository {
  constructor(private readonly client: TenantScopedClient) {}

  /**
   * Create a new entity.
   */
  async create(data: CreateEntityData): Promise<EntityRow> {
    const result = await this.client.query<EntityRow>(
      `INSERT INTO entities (id, tenant_id, type_path, properties, created_at, updated_at, created_by, version)
       VALUES ($1, current_setting('app.current_tenant_id')::uuid, $2::ltree, $3, NOW(), NOW(), $4, 1)
       RETURNING id, tenant_id, type_path, properties, version, created_at, updated_at, created_by, deleted_at, deleted_by`,
      [data.id, data.type, JSON.stringify(data.properties), data.createdBy]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create entity: no row returned');
    }
    return row;
  }

  /**
   * Find entity by ID.
   * Returns null if not found or soft-deleted.
   */
  async findById(id: EntityId): Promise<EntityRow | null> {
    const result = await this.client.query<EntityRow>(
      `SELECT id, tenant_id, type_path, properties, version, created_at, updated_at, created_by, deleted_at, deleted_by
       FROM entities
       WHERE id = $1
         AND deleted_at IS NULL`,
      [id]
    );

    return result.rows[0] ?? null;
  }

  /**
   * Find entity by ID including soft-deleted.
   * Used for version conflict checks.
   */
  async findByIdIncludeDeleted(id: EntityId): Promise<EntityRow | null> {
    const result = await this.client.query<EntityRow>(
      `SELECT id, tenant_id, type_path, properties, version, created_at, updated_at, created_by, deleted_at, deleted_by
       FROM entities
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] ?? null;
  }

  /**
   * Update entity with optimistic locking.
   * Returns null if version mismatch or not found.
   */
  async update(data: UpdateEntityData): Promise<EntityRow | null> {
    const result = await this.client.query<EntityRow>(
      `UPDATE entities
       SET properties = $1,
           version = version + 1,
           updated_at = NOW()
       WHERE id = $2
         AND version = $3
         AND deleted_at IS NULL
       RETURNING id, tenant_id, type_path, properties, version, created_at, updated_at, created_by, deleted_at, deleted_by`,
      [JSON.stringify(data.properties), data.id, data.expectedVersion]
    );

    return result.rows[0] ?? null;
  }

  /**
   * Soft delete an entity.
   * Returns true if deleted, false if not found.
   */
  async softDelete(id: EntityId, deletedBy: ActorId): Promise<boolean> {
    const result = await this.client.query(
      `UPDATE entities
       SET deleted_at = NOW(),
           deleted_by = $2
       WHERE id = $1
         AND deleted_at IS NULL
       RETURNING id`,
      [id, deletedBy]
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Hard delete an entity.
   * Returns true if deleted, false if not found.
   */
  async hardDelete(id: EntityId): Promise<boolean> {
    const result = await this.client.query(
      `DELETE FROM entities
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    return (result.rowCount ?? 0) > 0;
  }
}
