/**
 * Trellis Server - Database Configuration
 *
 * Configuration types and loader for PostgreSQL connection.
 */

/**
 * Database configuration.
 */
export interface DatabaseConfig {
  /** PostgreSQL connection string */
  readonly url: string;

  /** Maximum number of connections in pool */
  readonly poolSize: number;

  /** Connection timeout in milliseconds */
  readonly connectionTimeoutMs: number;

  /** Idle timeout in milliseconds */
  readonly idleTimeoutMs: number;

  /** Whether to use SSL */
  readonly ssl: boolean;
}

/**
 * Load database configuration from environment variables.
 */
export function loadDatabaseConfig(): DatabaseConfig {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return {
    url,
    poolSize: parseInt(process.env['DATABASE_POOL_SIZE'] ?? '10', 10),
    connectionTimeoutMs: parseInt(process.env['DATABASE_CONNECTION_TIMEOUT_MS'] ?? '10000', 10),
    idleTimeoutMs: parseInt(process.env['DATABASE_IDLE_TIMEOUT_MS'] ?? '30000', 10),
    ssl: process.env['DATABASE_SSL'] === 'true',
  };
}
