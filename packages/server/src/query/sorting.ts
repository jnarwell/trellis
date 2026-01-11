/**
 * Trellis Query Engine - Sort Translation
 *
 * Translates SortSpec to SQL ORDER BY clauses.
 */

import type { SortSpec } from '@trellis/kernel';
import { propertyPathToSQL, validatePropertyPath } from './property-path.js';

/**
 * Reserved column names that don't need JSONB translation.
 */
const RESERVED_COLUMNS = new Set([
  'id',
  'tenant_id',
  'type_path',
  'created_at',
  'updated_at',
  'created_by',
  'version',
  'deleted_at',
]);

/**
 * Translate a single sort spec to SQL.
 *
 * @param spec - The sort specification
 * @returns SQL ORDER BY fragment (without ORDER BY keyword)
 */
export function sortSpecToSQL(spec: SortSpec): string {
  const { path, direction, nulls } = spec;

  // Check if this is a reserved column (not a property)
  let sqlPath: string;
  if (RESERVED_COLUMNS.has(path)) {
    sqlPath = path;
  } else {
    // Validate and translate property path
    if (!validatePropertyPath(path)) {
      throw new Error(`Invalid sort path: ${path}`);
    }
    // Use text type for sorting - numbers will still sort correctly as text
    // in most cases, but for numeric sorting, the caller should use proper types
    sqlPath = propertyPathToSQL(path, 'text');
  }

  // Build ORDER BY fragment
  const dir = direction.toUpperCase();
  let sql = `${sqlPath} ${dir}`;

  // Add NULLS handling if specified
  if (nulls) {
    sql += ` NULLS ${nulls.toUpperCase()}`;
  }

  return sql;
}

/**
 * Translate an array of sort specs to SQL ORDER BY clause.
 *
 * @param specs - Array of sort specifications
 * @returns Full ORDER BY clause content (without ORDER BY keyword)
 */
export function sortToSQL(specs: SortSpec[]): string {
  if (specs.length === 0) {
    // Default sort: newest first, with id as tiebreaker
    return 'created_at DESC, id DESC';
  }

  const parts = specs.map(sortSpecToSQL);

  // Always add id as final tiebreaker for stable sorting
  // unless id is already in the sort specs
  const hasId = specs.some((s) => s.path === 'id');
  if (!hasId) {
    parts.push('id DESC');
  }

  return parts.join(', ');
}

/**
 * Extract sort columns for cursor-based pagination.
 * Returns the column expressions used in sorting.
 *
 * @param specs - Array of sort specifications
 * @returns Array of column expressions in order
 */
export function getSortColumns(specs: SortSpec[]): string[] {
  if (specs.length === 0) {
    return ['created_at', 'id'];
  }

  const columns = specs.map((spec) => {
    if (RESERVED_COLUMNS.has(spec.path)) {
      return spec.path;
    }
    return propertyPathToSQL(spec.path, 'text');
  });

  // Add id if not present
  const hasId = specs.some((s) => s.path === 'id');
  if (!hasId) {
    columns.push('id');
  }

  return columns;
}

/**
 * Get sort directions for cursor comparison.
 *
 * @param specs - Array of sort specifications
 * @returns Array of 'asc' or 'desc' for each column
 */
export function getSortDirections(specs: SortSpec[]): Array<'asc' | 'desc'> {
  if (specs.length === 0) {
    return ['desc', 'desc']; // Default: created_at DESC, id DESC
  }

  const directions = specs.map((spec) => spec.direction);

  // Add id direction (same as last column) if not present
  const hasId = specs.some((s) => s.path === 'id');
  if (!hasId) {
    directions.push('desc');
  }

  return directions;
}
