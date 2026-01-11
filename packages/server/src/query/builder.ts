/**
 * Trellis Query Engine - SQL Query Builder
 *
 * Assembles complete SELECT queries from query options.
 */

import type { FilterGroup, SortSpec, TenantId } from '@trellis/kernel';
import { filterGroupToSQL } from './filters.js';
import { sortToSQL, getSortColumns, getSortDirections } from './sorting.js';
import { decodeCursor, buildPaginationSQL, type Cursor } from './pagination.js';

/**
 * Options for building a query.
 */
export interface BuildQueryOptions {
  /** Tenant ID (required for RLS) */
  tenantId: TenantId;

  /** Entity type filter (supports "product.*" wildcard) */
  type?: string;

  /** Filter conditions */
  filter?: FilterGroup;

  /** Sort specifications */
  sort?: SortSpec[];

  /** Maximum results to return */
  limit: number;

  /** Offset for offset-based pagination */
  offset?: number;

  /** Cursor for cursor-based pagination */
  cursor?: string;

  /** Whether to include total count */
  includeTotal?: boolean;
}

/**
 * Result of building a query.
 */
export interface BuiltQuery {
  /** Main SELECT query */
  selectSQL: string;

  /** Count query (if includeTotal is true) */
  countSQL?: string;

  /** All parameters for the query */
  params: unknown[];

  /** Number of parameters used by count query */
  countParamCount?: number;

  /** Decoded cursor (if cursor-based pagination) */
  decodedCursor?: Cursor;

  /** Sort columns for cursor extraction */
  sortColumns: string[];

  /** Sort directions for cursor */
  sortDirections: Array<'asc' | 'desc'>;

  /** Sort paths (original, for cursor extraction) */
  sortPaths: string[];
}

/**
 * Build a complete SELECT query from options.
 *
 * @param options - Query options
 * @returns Built query with SQL and parameters
 */
export function buildSelectQuery(options: BuildQueryOptions): BuiltQuery {
  const {
    tenantId,
    type,
    filter,
    sort = [],
    limit,
    offset,
    cursor,
    includeTotal = false,
  } = options;

  const params: unknown[] = [];
  let paramIndex = 1;

  // Base WHERE clause - tenant_id and not deleted
  // Note: RLS is set at connection level, but we still filter for clarity
  let whereClause = `tenant_id = $${paramIndex} AND deleted_at IS NULL`;
  params.push(tenantId);
  paramIndex++;

  // Type filter
  if (type) {
    if (type.endsWith('.*')) {
      // Wildcard: match type and all subtypes
      const baseType = type.slice(0, -2);
      whereClause += ` AND type_path <@ $${paramIndex}::ltree`;
      params.push(baseType);
    } else {
      // Exact match
      whereClause += ` AND type_path = $${paramIndex}::ltree`;
      params.push(type);
    }
    paramIndex++;
  }

  // Filter conditions
  if (filter && filter.conditions.length > 0) {
    const filterSQL = filterGroupToSQL(filter, paramIndex);
    whereClause += ` AND (${filterSQL.sql})`;
    params.push(...filterSQL.params);
    paramIndex += filterSQL.params.length;
  }

  // Count query (before pagination is applied)
  const countParamCount = params.length;
  let countSQL: string | undefined;
  if (includeTotal) {
    countSQL = `SELECT COUNT(*) as total FROM entities WHERE ${whereClause}`;
  }

  // Cursor decoding
  let decodedCursor: Cursor | undefined;
  if (cursor) {
    decodedCursor = decodeCursor(cursor);
  }

  // Get sort information
  const sortColumns = getSortColumns(sort);
  const sortDirections = getSortDirections(sort);
  const sortPaths = sort.length > 0 ? sort.map((s) => s.path) : ['created_at'];

  // Pagination
  const pagination = buildPaginationSQL(
    limit,
    offset,
    decodedCursor,
    sortColumns,
    sortDirections,
    paramIndex
  );

  // Add cursor WHERE clause if present
  if (pagination.whereClause) {
    whereClause += ` AND ${pagination.whereClause}`;
  }
  params.push(...pagination.params);

  // ORDER BY
  const orderBy = sortToSQL(sort);

  // Build final SELECT
  const selectSQL = `
SELECT *
FROM entities
WHERE ${whereClause}
ORDER BY ${orderBy}
${pagination.limitClause}
  `.trim();

  // Build result - only include optional properties if defined
  const result: BuiltQuery = {
    selectSQL,
    params,
    sortColumns,
    sortDirections,
    sortPaths,
  };

  if (countSQL !== undefined) {
    result.countSQL = countSQL;
    result.countParamCount = countParamCount;
  }

  if (decodedCursor !== undefined) {
    result.decodedCursor = decodedCursor;
  }

  return result;
}

/**
 * Build query for a single entity by ID.
 *
 * @param tenantId - Tenant ID
 * @param entityId - Entity ID to fetch
 * @returns Query SQL and parameters
 */
export function buildGetByIdQuery(
  tenantId: TenantId,
  entityId: string
): { sql: string; params: unknown[] } {
  return {
    sql: `
SELECT *
FROM entities
WHERE tenant_id = $1
  AND id = $2
  AND deleted_at IS NULL
    `.trim(),
    params: [tenantId, entityId],
  };
}
