/**
 * Trellis Server - Entity API Validation Schemas
 *
 * Zod schemas for validating entity API requests.
 */

import { z } from 'zod';

// =============================================================================
// VALUE SCHEMAS
// =============================================================================

const textValueSchema = z.object({
  type: z.literal('text'),
  value: z.string(),
});

const numberValueSchema = z.object({
  type: z.literal('number'),
  value: z.number(),
  dimension: z.string().optional(),
  unit: z.string().optional(),
});

const booleanValueSchema = z.object({
  type: z.literal('boolean'),
  value: z.boolean(),
});

const datetimeValueSchema = z.object({
  type: z.literal('datetime'),
  value: z.string(),
});

const durationValueSchema = z.object({
  type: z.literal('duration'),
  value: z.string(),
});

const referenceValueSchema = z.object({
  type: z.literal('reference'),
  entity_id: z.string().uuid(),
  expected_type: z.string().optional(),
});

// Forward declaration for recursive types
const valueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion('type', [
    textValueSchema,
    numberValueSchema,
    booleanValueSchema,
    datetimeValueSchema,
    durationValueSchema,
    referenceValueSchema,
    listValueSchema,
    recordValueSchema,
  ])
);

const listValueSchema = z.object({
  type: z.literal('list'),
  element_type: z.enum([
    'text',
    'number',
    'boolean',
    'datetime',
    'duration',
    'reference',
    'list',
    'record',
  ]),
  values: z.array(valueSchema),
});

const recordValueSchema = z.object({
  type: z.literal('record'),
  fields: z.record(z.string(), valueSchema),
});

// =============================================================================
// PROPERTY INPUT SCHEMAS
// =============================================================================

const literalPropertyInputSchema = z.object({
  source: z.literal('literal'),
  value: valueSchema,
});

const inheritedPropertyInputSchema = z.object({
  source: z.literal('inherited'),
  from_entity: z.string().uuid(),
  from_property: z.string().optional(),
  override: valueSchema.optional(),
});

const computedPropertyInputSchema = z.object({
  source: z.literal('computed'),
  expression: z.string().min(1),
});

const measuredPropertyInputSchema = z.object({
  source: z.literal('measured'),
  value: numberValueSchema,
  uncertainty: z.number().nonnegative().optional(),
  measured_at: z.string().optional(),
});

export const propertyInputSchema = z.discriminatedUnion('source', [
  literalPropertyInputSchema,
  inheritedPropertyInputSchema,
  computedPropertyInputSchema,
  measuredPropertyInputSchema,
]);

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

/**
 * POST /entities request body
 */
export const createEntityBodySchema = z.object({
  type: z.string().min(1),
  properties: z.record(z.string(), propertyInputSchema),
});

export type CreateEntityBody = z.infer<typeof createEntityBodySchema>;

/**
 * GET /entities/:id query params
 */
export const getEntityQuerySchema = z.object({
  resolve_inherited: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional()
    .default('false'),
  evaluate_computed: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional()
    .default('false'),
});

export type GetEntityQuery = z.infer<typeof getEntityQuerySchema>;

/**
 * GET/PUT/DELETE /entities/:id params
 */
export const entityParamsSchema = z.object({
  id: z.string().uuid(),
});

export type EntityParams = z.infer<typeof entityParamsSchema>;

/**
 * PUT /entities/:id request body
 */
export const updateEntityBodySchema = z.object({
  expected_version: z.number().int().positive(),
  set_properties: z.record(z.string(), propertyInputSchema).optional(),
  remove_properties: z.array(z.string()).optional(),
});

export type UpdateEntityBody = z.infer<typeof updateEntityBodySchema>;

/**
 * DELETE /entities/:id query params
 */
export const deleteEntityQuerySchema = z.object({
  hard_delete: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional()
    .default('false'),
});

export type DeleteEntityQuery = z.infer<typeof deleteEntityQuerySchema>;
