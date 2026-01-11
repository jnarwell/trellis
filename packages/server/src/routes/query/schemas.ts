/**
 * Trellis Server - Query API Validation Schemas
 *
 * Zod schemas for validating query API requests.
 */

import { z } from 'zod';
import { QUERY_DEFAULTS } from '../../config/query.js';

// =============================================================================
// FILTER SCHEMAS
// =============================================================================

/**
 * Valid filter operators.
 */
export const filterOperatorSchema = z.enum([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'nin',
  'contains',
  'starts',
  'ends',
  'regex',
  'exists',
  'type_is',
]);

/**
 * A single filter condition.
 */
export const filterConditionSchema = z.object({
  path: z.string().min(1),
  operator: filterOperatorSchema,
  value: z.unknown(),
});

export type FilterConditionInput = z.infer<typeof filterConditionSchema>;

/**
 * Forward declaration for recursive filter group.
 */
export const filterGroupSchema: z.ZodType<{
  logic: 'and' | 'or';
  conditions: Array<FilterConditionInput | { logic: 'and' | 'or'; conditions: unknown[] }>;
}> = z.lazy(() =>
  z.object({
    logic: z.enum(['and', 'or']),
    conditions: z.array(z.union([filterConditionSchema, filterGroupSchema])),
  })
);

export type FilterGroupInput = z.infer<typeof filterGroupSchema>;

// =============================================================================
// SORT SCHEMAS
// =============================================================================

/**
 * Sort specification.
 */
export const sortSpecSchema = z.object({
  path: z.string().min(1),
  direction: z.enum(['asc', 'desc']),
  nulls: z.enum(['first', 'last']).optional(),
});

export type SortSpecInput = z.infer<typeof sortSpecSchema>;

// =============================================================================
// PAGINATION SCHEMAS
// =============================================================================

/**
 * Pagination options.
 */
export const paginationSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(QUERY_DEFAULTS.maxLimit)
    .optional()
    .default(QUERY_DEFAULTS.limit),
  offset: z.number().int().min(0).optional(),
  cursor: z.string().optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// =============================================================================
// QUERY REQUEST SCHEMA
// =============================================================================

/**
 * POST /query request body.
 */
export const queryRequestSchema = z.object({
  /** Entity type filter (supports "product.*" wildcard) */
  type: z.string().optional(),

  /** Filter conditions */
  filter: filterGroupSchema.optional(),

  /** Sort specifications */
  sort: z.array(sortSpecSchema).optional(),

  /** Pagination options */
  pagination: paginationSchema.optional(),

  /** Whether to include total count (expensive for large tables) */
  include_total: z.boolean().optional().default(false),
});

export type QueryRequest = z.infer<typeof queryRequestSchema>;

// =============================================================================
// QUERY RESPONSE SCHEMAS
// =============================================================================

/**
 * Pagination result in response.
 */
export const paginationResultSchema = z.object({
  offset: z.number(),
  limit: z.number(),
  has_more: z.boolean(),
  cursor: z.string().optional(),
});

/**
 * Query response structure.
 * Note: This is for documentation - actual validation happens on request, not response.
 */
export interface QueryResponse<T> {
  data: T[];
  total_count?: number;
  pagination: {
    offset: number;
    limit: number;
    has_more: boolean;
    cursor?: string;
  };
}
