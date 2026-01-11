/**
 * Trellis Server - Query Configuration
 *
 * Default settings for the query engine.
 */

/**
 * Query configuration defaults.
 * These can be overridden via environment variables.
 */
export interface QueryConfig {
  /** Default number of results per page */
  readonly defaultLimit: number;

  /** Maximum allowed results per page */
  readonly maxLimit: number;

  /** Default sort direction when none specified */
  readonly defaultSortDirection: 'asc' | 'desc';
}

/**
 * Load query configuration from environment.
 */
export function loadQueryConfig(): QueryConfig {
  return {
    defaultLimit: parseInt(process.env['QUERY_DEFAULT_LIMIT'] ?? '50', 10),
    maxLimit: parseInt(process.env['QUERY_MAX_LIMIT'] ?? '1000', 10),
    defaultSortDirection: 'desc',
  };
}

/**
 * Static query defaults for use in schemas and validation.
 */
export const QUERY_DEFAULTS = {
  limit: 50,
  maxLimit: 1000,
} as const;
