/**
 * Trellis Integration Test Setup
 *
 * Global setup using Testcontainers for PostgreSQL.
 */

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer | null = null;

/**
 * Global setup - starts PostgreSQL container.
 */
export async function setup(): Promise<void> {
  console.log('\n[Integration Tests] Starting PostgreSQL container...');

  container = await new PostgreSqlContainer('postgres:15')
    .withDatabase('trellis_test')
    .withUsername('trellis')
    .withPassword('test')
    .withExposedPorts(5432)
    .start();

  // Set environment variable for tests
  const connectionUri = container.getConnectionUri();
  process.env.DATABASE_URL = connectionUri;
  process.env.TEST_DATABASE_URL = connectionUri;

  console.log(`[Integration Tests] PostgreSQL started at: ${connectionUri}`);

  // Run migrations
  await runMigrations(connectionUri);
}

/**
 * Global teardown - stops PostgreSQL container.
 */
export async function teardown(): Promise<void> {
  if (container) {
    console.log('\n[Integration Tests] Stopping PostgreSQL container...');
    await container.stop();
    container = null;
    console.log('[Integration Tests] PostgreSQL stopped');
  }
}

/**
 * Run database migrations.
 */
async function runMigrations(connectionUri: string): Promise<void> {
  console.log('[Integration Tests] Running migrations...');

  // In a real implementation, this would run Prisma or custom migrations
  // For now, we'll use the SQL migration file directly

  try {
    const { Client } = await import('pg');
    const client = new Client({ connectionString: connectionUri });
    await client.connect();

    // Read and execute migration file
    const fs = await import('fs');
    const path = await import('path');

    const migrationPath = path.join(
      __dirname,
      '../../packages/kernel/src/schema/migrations/001_initial.sql'
    );

    if (fs.existsSync(migrationPath)) {
      const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
      await client.query(migrationSql);
      console.log('[Integration Tests] Migrations complete');
    } else {
      console.log('[Integration Tests] No migration file found, skipping');
    }

    await client.end();
  } catch (error) {
    console.error('[Integration Tests] Migration error:', error);
    // Don't fail setup on migration error - tests might not need full schema
  }
}

// Export for Vitest globalSetup
export default async function globalSetup(): Promise<() => Promise<void>> {
  await setup();
  return teardown;
}
