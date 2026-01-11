/**
 * Trellis Server - Migration Runner
 *
 * Runs database migrations from SQL files.
 * Usage: pnpm migrate
 */

import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Pool } from 'pg';
import { loadDatabaseConfig } from '../config/database.js';

/**
 * Migration record stored in the database.
 */
interface MigrationRecord {
  id: number;
  name: string;
  applied_at: Date;
}

/**
 * Ensure the migrations table exists.
 */
async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

/**
 * Get list of applied migrations.
 */
async function getAppliedMigrations(pool: Pool): Promise<Set<string>> {
  const result = await pool.query<MigrationRecord>('SELECT name FROM _migrations ORDER BY id');
  return new Set(result.rows.map((row) => row.name));
}

/**
 * Get list of migration files from the migrations directory.
 */
async function getMigrationFiles(migrationsDir: string): Promise<string[]> {
  try {
    const files = await readdir(migrationsDir);
    return files
      .filter((f) => f.endsWith('.sql'))
      .sort(); // Sort alphabetically (001_, 002_, etc.)
  } catch (err) {
    if ((err as { code?: string }).code === 'ENOENT') {
      console.log(`Migrations directory not found: ${migrationsDir}`);
      return [];
    }
    throw err;
  }
}

/**
 * Run a single migration.
 */
async function runMigration(pool: Pool, name: string, sql: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Run the migration SQL
    await client.query(sql);

    // Record the migration
    await client.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);

    await client.query('COMMIT');
    console.log(`  ✓ Applied: ${name}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations.
 */
export async function runMigrations(migrationsDir: string): Promise<void> {
  const config = loadDatabaseConfig();
  const pool = new Pool({ connectionString: config.url });

  try {
    console.log('Running migrations...');

    // Ensure migrations table exists
    await ensureMigrationsTable(pool);

    // Get applied migrations
    const applied = await getAppliedMigrations(pool);
    console.log(`  Found ${applied.size} applied migrations`);

    // Get migration files
    const files = await getMigrationFiles(migrationsDir);
    console.log(`  Found ${files.length} migration files`);

    // Run pending migrations
    let pendingCount = 0;
    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }

      const filePath = join(migrationsDir, file);
      const sql = await readFile(filePath, 'utf-8');
      await runMigration(pool, file, sql);
      pendingCount++;
    }

    if (pendingCount === 0) {
      console.log('  No pending migrations');
    } else {
      console.log(`  Applied ${pendingCount} migrations`);
    }

    console.log('Migrations complete!');
  } finally {
    await pool.end();
  }
}

/**
 * CLI entry point.
 */
async function main(): Promise<void> {
  // Default migrations directory is packages/kernel/src/schema/migrations
  const migrationsDir =
    process.argv[2] ??
    resolve(import.meta.dirname, '../../../kernel/src/schema/migrations');

  try {
    await runMigrations(migrationsDir);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

// Run if executed directly
main();
