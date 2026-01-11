/**
 * Trellis Integration Test Helpers
 *
 * Utilities for integration testing with database access.
 */

import { Client, Pool } from 'pg';

// =============================================================================
// DATABASE HELPERS
// =============================================================================

/**
 * Get a database client for tests.
 */
export async function getTestClient(): Promise<Client> {
  const connectionUri = process.env.DATABASE_URL;
  if (!connectionUri) {
    throw new Error('DATABASE_URL not set. Run tests with integration setup.');
  }

  const client = new Client({ connectionString: connectionUri });
  await client.connect();
  return client;
}

/**
 * Get a database pool for tests.
 */
export function getTestPool(): Pool {
  const connectionUri = process.env.DATABASE_URL;
  if (!connectionUri) {
    throw new Error('DATABASE_URL not set. Run tests with integration setup.');
  }

  return new Pool({ connectionString: connectionUri });
}

/**
 * Clear all data from test database (preserves schema).
 */
export async function clearTestData(client: Client): Promise<void> {
  // Disable foreign key checks temporarily
  await client.query('SET session_replication_role = replica');

  // Truncate all tables
  const tables = ['events', 'relationships', 'entities'];
  for (const table of tables) {
    await client.query(`TRUNCATE TABLE ${table} CASCADE`);
  }

  // Re-enable foreign key checks
  await client.query('SET session_replication_role = DEFAULT');
}

// =============================================================================
// TEST TENANT HELPERS
// =============================================================================

const TEST_TENANT_ID = 'test-tenant-001';

/**
 * Get the test tenant ID.
 */
export function getTestTenantId(): string {
  return TEST_TENANT_ID;
}

/**
 * Create a test entity directly in database.
 */
export async function createTestEntity(
  client: Client,
  entity: {
    id: string;
    type: string;
    properties: Record<string, unknown>;
    version?: number;
  }
): Promise<void> {
  await client.query(
    `INSERT INTO entities (id, tenant_id, type_path, properties, version, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
    [entity.id, TEST_TENANT_ID, entity.type, JSON.stringify(entity.properties), entity.version ?? 1]
  );
}

/**
 * Create a test relationship directly in database.
 */
export async function createTestRelationship(
  client: Client,
  relationship: {
    id: string;
    type: string;
    sourceId: string;
    targetId: string;
  }
): Promise<void> {
  await client.query(
    `INSERT INTO relationships (id, tenant_id, relationship_type, source_entity_id, target_entity_id, path, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [
      relationship.id,
      TEST_TENANT_ID,
      relationship.type,
      relationship.sourceId,
      relationship.targetId,
      `${relationship.sourceId}.${relationship.targetId}`,
    ]
  );
}

/**
 * Get an entity by ID from test database.
 */
export async function getTestEntity(client: Client, id: string): Promise<unknown | null> {
  const result = await client.query('SELECT * FROM entities WHERE id = $1 AND tenant_id = $2', [
    id,
    TEST_TENANT_ID,
  ]);
  return result.rows[0] ?? null;
}

// =============================================================================
// TRANSACTION HELPERS
// =============================================================================

/**
 * Run a test within a transaction that gets rolled back.
 * Useful for tests that modify data but should not persist changes.
 */
export async function withTransaction<T>(
  client: Client,
  fn: (client: Client) => Promise<T>
): Promise<T> {
  await client.query('BEGIN');
  try {
    const result = await fn(client);
    return result;
  } finally {
    await client.query('ROLLBACK');
  }
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Assert that an entity exists in the database.
 */
export async function assertEntityExists(client: Client, id: string): Promise<void> {
  const result = await client.query('SELECT COUNT(*) FROM entities WHERE id = $1', [id]);
  const count = parseInt(result.rows[0].count, 10);
  if (count === 0) {
    throw new Error(`Expected entity ${id} to exist`);
  }
}

/**
 * Assert that an entity does not exist in the database.
 */
export async function assertEntityNotExists(client: Client, id: string): Promise<void> {
  const result = await client.query('SELECT COUNT(*) FROM entities WHERE id = $1', [id]);
  const count = parseInt(result.rows[0].count, 10);
  if (count !== 0) {
    throw new Error(`Expected entity ${id} to not exist`);
  }
}

/**
 * Assert entity has specific property value.
 */
export async function assertEntityProperty(
  client: Client,
  id: string,
  propertyPath: string,
  expectedValue: unknown
): Promise<void> {
  const result = await client.query(
    `SELECT properties->'${propertyPath}'->'value'->>'value' as value FROM entities WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error(`Entity ${id} not found`);
  }

  const actualValue = result.rows[0].value;
  if (actualValue !== String(expectedValue)) {
    throw new Error(
      `Expected property ${propertyPath} to be ${expectedValue}, got ${actualValue}`
    );
  }
}

// =============================================================================
// SEED HELPERS
// =============================================================================

/**
 * Seed a minimal test dataset.
 */
export async function seedMinimalData(client: Client): Promise<{
  partId: string;
  assemblyId: string;
}> {
  const partId = '019aaaaa-bbbb-7000-8000-000000000001';
  const assemblyId = '019aaaaa-bbbb-7000-8000-000000000002';

  await createTestEntity(client, {
    id: partId,
    type: 'part',
    properties: {
      part_number: { value: 'TEST-001', source: 'literal' },
      name: { value: 'Test Part', source: 'literal' },
      unit_cost: { value: 10.0, source: 'literal' },
      quantity: { value: 5, source: 'literal' },
    },
  });

  await createTestEntity(client, {
    id: assemblyId,
    type: 'assembly',
    properties: {
      assembly_number: { value: 'ASSY-TEST-001', source: 'literal' },
      name: { value: 'Test Assembly', source: 'literal' },
    },
  });

  await createTestRelationship(client, {
    id: '019aaaaa-bbbb-7000-8000-000000000003',
    type: 'children',
    sourceId: assemblyId,
    targetId: partId,
  });

  return { partId, assemblyId };
}
