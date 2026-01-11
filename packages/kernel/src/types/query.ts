/**
 * Trellis Kernel - Query Type Definitions
 *
 * Defines filter, sort, and query types for the Trellis data model.
 */

import type { TenantId, TypePath } from './entity.js';
import type { RelationshipType } from './relationship.js';

// =============================================================================
// FILTER OPERATORS
// =============================================================================

/**
 * Filter operators for querying.
 */
export type FilterOperator =
  | 'eq'        // equals
  | 'neq'       // not equals
  | 'gt'        // greater than
  | 'gte'       // greater than or equal
  | 'lt'        // less than
  | 'lte'       // less than or equal
  | 'in'        // in array
  | 'nin'       // not in array
  | 'contains'  // text contains
  | 'starts'    // text starts with
  | 'ends'      // text ends with
  | 'regex'     // regex match
  | 'exists'    // property exists
  | 'type_is';  // type matches (with hierarchy)

// =============================================================================
// FILTER CONDITIONS
// =============================================================================

/**
 * A single filter condition.
 */
export interface FilterCondition {
  /** Property path (e.g., "name", "metadata.category") */
  readonly path: string;
  /** Operator */
  readonly operator: FilterOperator;
  /** Value to compare against */
  readonly value: unknown;
}

/**
 * Combined filter with AND/OR logic.
 */
export interface FilterGroup {
  /** Logical operator */
  readonly logic: 'and' | 'or';
  /** Conditions in this group */
  readonly conditions: readonly (FilterCondition | FilterGroup)[];
}

// =============================================================================
// SORT SPECIFICATION
// =============================================================================

/**
 * Sort specification.
 */
export interface SortSpec {
  /** Property path to sort by */
  readonly path: string;
  /** Sort direction */
  readonly direction: 'asc' | 'desc';
  /** How to handle nulls */
  readonly nulls?: 'first' | 'last';
}

// =============================================================================
// ENTITY QUERY
// =============================================================================

/**
 * Query specification for entities.
 */
export interface EntityQuery {
  /** Tenant to query within */
  readonly tenant_id: TenantId;

  /** Filter by entity type (supports hierarchy with "*") */
  readonly type?: TypePath | `${string}.*`;

  /** Property filters */
  readonly filter?: FilterGroup;

  /** Sort order */
  readonly sort?: readonly SortSpec[];

  /** Pagination: skip N results */
  readonly offset?: number;

  /** Pagination: return at most N results */
  readonly limit?: number;

  /** Include related entities (by relationship type) */
  readonly include?: readonly RelationshipType[];
}

// =============================================================================
// QUERY RESULT
// =============================================================================

/**
 * Result wrapper with metadata.
 */
export interface QueryResult<T> {
  /** The data */
  readonly data: readonly T[];

  /** Total count (if requested) */
  readonly total_count?: number;

  /** Pagination info */
  readonly pagination: {
    readonly offset: number;
    readonly limit: number;
    readonly has_more: boolean;
  };
}
