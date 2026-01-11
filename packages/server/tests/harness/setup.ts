/**
 * Trellis E2E Test Harness - Setup
 *
 * Database setup and teardown for E2E tests.
 */

import type { Pool, PoolClient } from 'pg';
import { createPool, closePool } from '../../src/db/index.js';
import type { TenantId, ActorId } from '@trellis/kernel';

// =============================================================================
// TYPES
// =============================================================================

export interface TestContext {
  readonly tenantId: TenantId;
  readonly actorId: ActorId;
  readonly tenantName: string;
}

// =============================================================================
// DATABASE SETUP
// =============================================================================

/**
 * Create a database pool for tests.
 * Uses DATABASE_URL environment variable.
 */
export function createTestPool(): Pool {
  const connectionUrl = process.env.DATABASE_URL;
  if (!connectionUrl) {
    throw new Error(
      'DATABASE_URL not set. Run tests with: pnpm test:integration'
    );
  }

  return createPool({
    url: connectionUrl,
    poolSize: 5,
    connectionTimeoutMs: 10000,
    idleTimeoutMs: 10000,
    ssl: false,
  });
}

/**
 * Create test tenant and actor in the database.
 * Returns the IDs for use in tests.
 */
export async function seedTestData(pool: Pool): Promise<TestContext> {
  const client = await pool.connect();

  try {
    // Generate deterministic test IDs
    const tenantId = '019fffff-0001-7000-8000-000000000001' as TenantId;
    const actorId = '019fffff-0002-7000-8000-000000000001' as ActorId;
    const tenantSlug = `test-tenant-${Date.now()}`;

    // Use a transaction for atomic setup
    await client.query('BEGIN');

    // Create test tenant (upsert to handle re-runs)
    await client.query(
      `INSERT INTO tenants (id, name, slug, settings)
       VALUES ($1, $2, $3, '{}')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [tenantId, 'E2E Test Tenant', tenantSlug]
    );

    // Create test actor (upsert to handle re-runs)
    await client.query(
      `INSERT INTO actors (id, tenant_id, name, email, actor_type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [actorId, tenantId, 'E2E Test Actor', 'test@trellis.dev', 'user']
    );

    // Create default relationship schemas for tests
    await seedRelationshipSchemas(client, tenantId);

    await client.query('COMMIT');

    return {
      tenantId,
      actorId,
      tenantName: 'E2E Test Tenant',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Seed default relationship schemas for testing.
 */
async function seedRelationshipSchemas(
  client: PoolClient,
  tenantId: TenantId
): Promise<void> {
  const schemas = [
    {
      type: 'belongs_to',
      name: 'Belongs To',
      cardinality: 'many_to_one',
      bidirectional: true,
      inverse_type: 'has_many',
    },
    {
      type: 'has_many',
      name: 'Has Many',
      cardinality: 'one_to_many',
      bidirectional: true,
      inverse_type: 'belongs_to',
    },
    {
      type: 'parent_of',
      name: 'Parent Of',
      cardinality: 'one_to_many',
      bidirectional: true,
      inverse_type: 'child_of',
    },
    {
      type: 'child_of',
      name: 'Child Of',
      cardinality: 'many_to_one',
      bidirectional: true,
      inverse_type: 'parent_of',
    },
    {
      type: 'related_to',
      name: 'Related To',
      cardinality: 'many_to_many',
      bidirectional: false,
      inverse_type: null,
    },
  ];

  for (const schema of schemas) {
    await client.query(
      `INSERT INTO relationship_schemas (tenant_id, type, name, cardinality, bidirectional, inverse_type)
       VALUES ($1, $2, $3, $4::cardinality, $5, $6)
       ON CONFLICT (tenant_id, type) DO NOTHING`,
      [
        tenantId,
        schema.type,
        schema.name,
        schema.cardinality,
        schema.bidirectional,
        schema.inverse_type,
      ]
    );
  }
}

/**
 * Reset test data between tests.
 * Truncates entity and relationship data, preserving tenant/actor/schemas.
 */
export async function resetTestData(
  pool: Pool,
  tenantId: TenantId
): Promise<void> {
  const client = await pool.connect();

  try {
    // Set tenant context for RLS
    await client.query('SET app.current_tenant_id = $1', [tenantId]);

    // Truncate data tables (order matters due to foreign keys)
    // Use DELETE instead of TRUNCATE to respect RLS
    await client.query('DELETE FROM events WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM computed_cache WHERE entity_id IN (SELECT id FROM entities WHERE tenant_id = $1)', [tenantId]);
    await client.query('DELETE FROM property_dependencies WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM relationships WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM entities WHERE tenant_id = $1', [tenantId]);

    // Reset tenant context
    await client.query('RESET app.current_tenant_id');
  } finally {
    client.release();
  }
}

/**
 * Cleanup all test data including tenant and actor.
 * Used for final cleanup after all tests.
 */
export async function cleanupTestData(
  pool: Pool,
  tenantId: TenantId
): Promise<void> {
  const client = await pool.connect();

  try {
    // Bypass RLS for cleanup
    await client.query('SET session_replication_role = replica');

    // Delete all test data
    await client.query('DELETE FROM events WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM computed_cache WHERE entity_id IN (SELECT id FROM entities WHERE tenant_id = $1)', [tenantId]);
    await client.query('DELETE FROM property_dependencies WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM relationships WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM entities WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM relationship_schemas WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM type_schemas WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM actors WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM tenants WHERE id = $1', [tenantId]);

    // Restore RLS
    await client.query('SET session_replication_role = DEFAULT');
  } finally {
    client.release();
  }
}

/**
 * Close database pool.
 */
export async function closeTestPool(pool: Pool): Promise<void> {
  await closePool(pool);
}
