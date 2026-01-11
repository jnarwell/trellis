/**
 * Trellis Server - Database Connection Pool
 *
 * Creates and manages the PostgreSQL connection pool.
 */

import { Pool, type PoolConfig } from 'pg';
import type { DatabaseConfig } from '../config/database.js';

/**
 * Create a PostgreSQL connection pool from configuration.
 */
export function createPool(config: DatabaseConfig): Pool {
  const poolConfig: PoolConfig = {
    connectionString: config.url,
    max: config.poolSize,
    connectionTimeoutMillis: config.connectionTimeoutMs,
    idleTimeoutMillis: config.idleTimeoutMs,
  };

  if (config.ssl) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  return new Pool(poolConfig);
}

/**
 * Close a connection pool gracefully.
 */
export async function closePool(pool: Pool): Promise<void> {
  await pool.end();
}

// Re-export types from pg that consumers need
export type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
