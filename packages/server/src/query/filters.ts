/**
 * Trellis Query Engine - Filter Translation
 *
 * Translates FilterCondition and FilterGroup to SQL WHERE clauses.
 */

import type { FilterCondition, FilterGroup, FilterOperator } from '@trellis/kernel';
import {
  propertyPathToSQL,
  propertyExistsSQL,
  inferSQLValueType,
  validatePropertyPath,
  type SQLValueType,
} from './property-path.js';

/**
 * SQL fragment with parameterized values.
 */
export interface SQLFragment {
  /** SQL string with $N parameter placeholders */
  sql: string;
  /** Parameter values in order */
  params: unknown[];
}

/**
 * Translate a single filter condition to SQL.
 *
 * @param condition - The filter condition
 * @param paramOffset - Starting parameter index (1-based)
 * @returns SQL fragment with parameters
 */
export function filterConditionToSQL(
  condition: FilterCondition,
  paramOffset: number
): SQLFragment {
  const { path, operator, value } = condition;

  // Validate path for non-special operators
  if (operator !== 'type_is' && !validatePropertyPath(path)) {
    throw new Error(`Invalid property path: ${path}`);
  }

  // Handle special operators first
  switch (operator) {
    case 'exists':
      // Check if property key exists in JSONB
      return {
        sql: propertyExistsSQL(path),
        params: [],
      };

    case 'type_is':
      // Match entity type using ltree descendant operator
      return {
        sql: `type_path <@ $${paramOffset}::ltree`,
        params: [value],
      };
  }

  // For regular operators, build the property accessor
  const valueType = inferSQLValueType(value);
  const sqlPath = propertyPathToSQL(path, valueType);

  return translateOperator(operator, sqlPath, value, paramOffset, valueType);
}

/**
 * Translate a filter operator to SQL.
 */
function translateOperator(
  operator: FilterOperator,
  sqlPath: string,
  value: unknown,
  paramOffset: number,
  valueType: SQLValueType
): SQLFragment {
  switch (operator) {
    case 'eq':
      return {
        sql: `${sqlPath} = $${paramOffset}`,
        params: [value],
      };

    case 'neq':
      return {
        sql: `${sqlPath} != $${paramOffset}`,
        params: [value],
      };

    case 'gt':
      return {
        sql: `${sqlPath} > $${paramOffset}`,
        params: [value],
      };

    case 'gte':
      return {
        sql: `${sqlPath} >= $${paramOffset}`,
        params: [value],
      };

    case 'lt':
      return {
        sql: `${sqlPath} < $${paramOffset}`,
        params: [value],
      };

    case 'lte':
      return {
        sql: `${sqlPath} <= $${paramOffset}`,
        params: [value],
      };

    case 'in':
      // Value should be an array
      if (!Array.isArray(value)) {
        throw new Error('IN operator requires an array value');
      }
      return {
        sql: `${sqlPath} = ANY($${paramOffset})`,
        params: [value],
      };

    case 'nin':
      // Value should be an array
      if (!Array.isArray(value)) {
        throw new Error('NIN operator requires an array value');
      }
      return {
        sql: `${sqlPath} != ALL($${paramOffset})`,
        params: [value],
      };

    case 'contains':
      // Case-insensitive substring match
      return {
        sql: `${sqlPath} ILIKE $${paramOffset}`,
        params: [`%${value}%`],
      };

    case 'starts':
      // Case-insensitive prefix match
      return {
        sql: `${sqlPath} ILIKE $${paramOffset}`,
        params: [`${value}%`],
      };

    case 'ends':
      // Case-insensitive suffix match
      return {
        sql: `${sqlPath} ILIKE $${paramOffset}`,
        params: [`%${value}`],
      };

    case 'regex':
      // PostgreSQL regex match (case-sensitive)
      return {
        sql: `${sqlPath} ~ $${paramOffset}`,
        params: [value],
      };

    default:
      throw new Error(`Unknown filter operator: ${operator}`);
  }
}

/**
 * Check if a condition is a FilterGroup (has 'logic' property).
 */
function isFilterGroup(
  condition: FilterCondition | FilterGroup
): condition is FilterGroup {
  return 'logic' in condition;
}

/**
 * Translate a filter group (AND/OR) to SQL.
 *
 * @param group - The filter group
 * @param paramOffset - Starting parameter index (1-based)
 * @returns SQL fragment with parameters
 */
export function filterGroupToSQL(
  group: FilterGroup,
  paramOffset: number
): SQLFragment {
  if (group.conditions.length === 0) {
    // Empty group matches everything
    return { sql: 'TRUE', params: [] };
  }

  const fragments: SQLFragment[] = [];
  let currentOffset = paramOffset;

  for (const condition of group.conditions) {
    let fragment: SQLFragment;

    if (isFilterGroup(condition)) {
      // Recursive case: nested group
      fragment = filterGroupToSQL(condition, currentOffset);
      // Wrap nested groups in parentheses
      fragment = { sql: `(${fragment.sql})`, params: fragment.params };
    } else {
      // Base case: single condition
      fragment = filterConditionToSQL(condition, currentOffset);
    }

    fragments.push(fragment);
    currentOffset += fragment.params.length;
  }

  // Join with AND or OR
  const joiner = group.logic === 'and' ? ' AND ' : ' OR ';
  const sql = fragments.map((f) => f.sql).join(joiner);
  const params = fragments.flatMap((f) => f.params);

  return { sql, params };
}
