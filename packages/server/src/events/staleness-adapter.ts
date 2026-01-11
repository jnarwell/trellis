/**
 * Trellis Server - Staleness Database Adapter
 *
 * Implements the StalenessDatabase interface from @trellis/kernel
 * to connect staleness propagation with the PostgreSQL database.
 */

import type { Pool } from 'pg';
import type {
  TenantId,
  EntityId,
  PropertyName,
  StalenessDatabase,
  PropertyKey,
} from '@trellis/kernel';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Row returned from dependency query.
 */
interface DependentRow {
  entity_id: string;
  property_name: string;
}

// =============================================================================
// ADAPTER
// =============================================================================

/**
 * PostgreSQL adapter for staleness propagation.
 *
 * Queries the entities table to find computed properties that depend
 * on a given property, then marks them as stale.
 */
export class StalenessAdapter implements StalenessDatabase {
  constructor(private readonly pool: Pool) {}

  /**
   * Find properties that depend on the given property.
   *
   * Searches for computed properties whose dependencies array contains
   * a reference to the changed property.
   */
  async getDependents(
    tenantId: TenantId,
    entityId: EntityId,
    propertyName: PropertyName
  ): Promise<readonly PropertyKey[]> {
    // Build the dependency path to search for
    // Dependencies are stored as paths like "entityId.propertyName" or "@self.propertyName"
    const selfPath = `@self.${propertyName}`;
    const entityPath = `${entityId}.${propertyName}`;

    // Query for computed properties that reference this property
    // Uses JSONB path queries to search within the dependencies array
    const result = await this.pool.query<DependentRow>(
      `SELECT
        e.id as entity_id,
        prop.key as property_name
       FROM entities e,
       LATERAL jsonb_each(e.properties) AS prop(key, value)
       WHERE e.tenant_id = $1
         AND e.deleted_at IS NULL
         AND prop.value->>'source' = 'computed'
         AND (
           -- Check if dependencies array contains a path referencing this property
           prop.value->'dependencies' @> $2::jsonb
           OR prop.value->'dependencies' @> $3::jsonb
           -- Also check for inherited properties from this entity
           OR (
             prop.value->>'source' = 'inherited'
             AND prop.value->>'from_entity' = $4
             AND (
               prop.value->>'from_property' = $5
               OR (prop.value->>'from_property' IS NULL AND prop.key = $5)
             )
           )
         )`,
      [
        tenantId,
        JSON.stringify([selfPath]),
        JSON.stringify([entityPath]),
        entityId,
        propertyName,
      ]
    );

    return result.rows.map((row) => ({
      entityId: row.entity_id as EntityId,
      propertyName: row.property_name as PropertyName,
    }));
  }

  /**
   * Mark a property as stale in the database.
   *
   * Updates the computation_status to 'stale' for the specified property.
   */
  async markStale(
    tenantId: TenantId,
    entityId: EntityId,
    propertyName: PropertyName
  ): Promise<void> {
    await this.pool.query(
      `UPDATE entities
       SET properties = jsonb_set(
         properties,
         ARRAY[$3::text, 'computation_status'],
         '"stale"'::jsonb
       ),
       updated_at = NOW()
       WHERE tenant_id = $1
         AND id = $2
         AND deleted_at IS NULL
         AND properties ? $3`,
      [tenantId, entityId, propertyName]
    );
  }

  /**
   * Batch mark multiple properties as stale.
   * More efficient than calling markStale multiple times.
   */
  async markStaleMany(
    tenantId: TenantId,
    properties: readonly PropertyKey[]
  ): Promise<void> {
    if (properties.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const prop of properties) {
        await client.query(
          `UPDATE entities
           SET properties = jsonb_set(
             properties,
             ARRAY[$3::text, 'computation_status'],
             '"stale"'::jsonb
           ),
           updated_at = NOW()
           WHERE tenant_id = $1
             AND id = $2
             AND deleted_at IS NULL
             AND properties ? $3`,
          [tenantId, prop.entityId, prop.propertyName]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get all stale properties for a tenant.
   * Useful for bulk recomputation.
   */
  async getStaleProperties(tenantId: TenantId): Promise<readonly PropertyKey[]> {
    const result = await this.pool.query<DependentRow>(
      `SELECT
        e.id as entity_id,
        prop.key as property_name
       FROM entities e,
       LATERAL jsonb_each(e.properties) AS prop(key, value)
       WHERE e.tenant_id = $1
         AND e.deleted_at IS NULL
         AND prop.value->>'computation_status' = 'stale'`,
      [tenantId]
    );

    return result.rows.map((row) => ({
      entityId: row.entity_id as EntityId,
      propertyName: row.property_name as PropertyName,
    }));
  }
}

/**
 * Create a StalenessAdapter instance.
 */
export function createStalenessAdapter(pool: Pool): StalenessAdapter {
  return new StalenessAdapter(pool);
}
