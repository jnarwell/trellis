/**
 * Trellis Query Engine - Pagination
 *
 * Handles offset and cursor-based pagination.
 */

import type { EntityId } from '@trellis/kernel';

/**
 * Cursor structure for cursor-based pagination.
 */
export interface Cursor {
  /** Values of sort columns at the cursor position */
  sortValues: unknown[];
  /** Entity ID at the cursor position (tiebreaker) */
  id: EntityId;
}

/**
 * Pagination result metadata.
 */
export interface PaginationResult {
  /** Offset used (0 for cursor-based) */
  offset: number;
  /** Limit used */
  limit: number;
  /** Whether there are more results */
  hasMore: boolean;
  /** Cursor for next page (if using cursor pagination) */
  nextCursor?: string;
}

/**
 * Encode a cursor to a URL-safe string.
 *
 * @param cursor - The cursor to encode
 * @returns Base64url-encoded cursor string
 */
export function encodeCursor(cursor: Cursor): string {
  const json = JSON.stringify(cursor);
  // Use base64url encoding (URL-safe)
  return Buffer.from(json, 'utf-8').toString('base64url');
}

/**
 * Decode a cursor from a URL-safe string.
 *
 * @param encoded - The encoded cursor string
 * @returns The decoded cursor
 * @throws Error if the cursor is invalid
 */
export function decodeCursor(encoded: string): Cursor {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf-8');
    const parsed = JSON.parse(json) as unknown;

    // Validate cursor structure
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray((parsed as Cursor).sortValues) ||
      typeof (parsed as Cursor).id !== 'string'
    ) {
      throw new Error('Invalid cursor structure');
    }

    return parsed as Cursor;
  } catch (err) {
    throw new Error(
      `Invalid cursor: ${err instanceof Error ? err.message : 'unknown error'}`
    );
  }
}

/**
 * Build cursor-based pagination WHERE clause.
 *
 * For pagination to work correctly with composite sort keys, we need to use
 * row comparison: (col1, col2, ...) < (val1, val2, ...)
 *
 * The comparison operator depends on sort direction:
 * - DESC: use < (get items before cursor)
 * - ASC: use > (get items after cursor)
 *
 * @param cursor - The decoded cursor
 * @param sortColumns - SQL expressions for sort columns
 * @param sortDirections - Direction for each sort column
 * @param paramOffset - Starting parameter index
 * @returns SQL fragment and parameters
 */
export function cursorToSQL(
  cursor: Cursor,
  sortColumns: string[],
  sortDirections: Array<'asc' | 'desc'>,
  paramOffset: number
): { sql: string; params: unknown[] } {
  // Combine sort values with id
  const allValues = [...cursor.sortValues, cursor.id];

  // Build column tuple
  const columnTuple = `(${sortColumns.join(', ')})`;

  // Build parameter tuple
  const paramIndices = allValues.map((_, i) => `$${paramOffset + i}`);
  const paramTuple = `(${paramIndices.join(', ')})`;

  // Determine comparison operator from first sort direction
  // (all directions should be consistent for proper cursor pagination)
  const firstDirection = sortDirections[0] || 'desc';
  const operator = firstDirection === 'desc' ? '<' : '>';

  return {
    sql: `${columnTuple} ${operator} ${paramTuple}`,
    params: allValues,
  };
}

/**
 * Extract cursor values from a result row.
 *
 * @param row - The result row
 * @param sortPaths - Original sort paths (not SQL expressions)
 * @returns Cursor for this row
 */
export function extractCursor(
  row: Record<string, unknown>,
  sortPaths: string[]
): Cursor {
  // For reserved columns, use direct access
  // For property paths, extract from the row (already selected)
  const sortValues = sortPaths.map((path) => {
    // The query should have selected these values with aliases
    // For simplicity, we use the path as-is for reserved columns
    const reserved = ['id', 'tenant_id', 'type_path', 'created_at', 'updated_at', 'created_by', 'version'];
    if (reserved.includes(path)) {
      return row[path];
    }
    // For property values, they should be extracted by the service
    // This is a placeholder - actual implementation depends on query structure
    return row[`sort_${path.replace(/\./g, '_')}`] ?? null;
  });

  return {
    sortValues,
    id: row['id'] as EntityId,
  };
}

/**
 * Build pagination SQL clauses.
 *
 * @param limit - Maximum number of results
 * @param offset - Number of results to skip (for offset-based)
 * @param cursor - Decoded cursor (for cursor-based)
 * @param sortColumns - SQL expressions for sort columns
 * @param sortDirections - Direction for each sort column
 * @param paramOffset - Starting parameter index
 * @returns SQL fragments and parameters
 */
export function buildPaginationSQL(
  limit: number,
  offset: number | undefined,
  cursor: Cursor | undefined,
  sortColumns: string[],
  sortDirections: Array<'asc' | 'desc'>,
  paramOffset: number
): { whereClause?: string; limitClause: string; params: unknown[] } {
  const params: unknown[] = [];
  let currentOffset = paramOffset;
  let whereClause: string | undefined;

  // Cursor-based pagination adds a WHERE clause
  if (cursor) {
    const cursorSQL = cursorToSQL(cursor, sortColumns, sortDirections, currentOffset);
    whereClause = cursorSQL.sql;
    params.push(...cursorSQL.params);
    currentOffset += cursorSQL.params.length;
  }

  // LIMIT clause - fetch one extra to detect hasMore
  const limitClause = `LIMIT $${currentOffset}`;
  params.push(limit + 1);
  currentOffset++;

  // OFFSET clause (only for offset-based pagination, not with cursor)
  let fullLimitClause = limitClause;
  if (offset !== undefined && offset > 0 && !cursor) {
    fullLimitClause += ` OFFSET $${currentOffset}`;
    params.push(offset);
  }

  // Build result - only include whereClause if defined
  const result: { whereClause?: string; limitClause: string; params: unknown[] } = {
    limitClause: fullLimitClause,
    params,
  };
  if (whereClause !== undefined) {
    result.whereClause = whereClause;
  }
  return result;
}
