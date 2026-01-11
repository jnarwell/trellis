/**
 * Trellis Server - Relationship Route Schemas
 *
 * TypeBox schemas for request/response validation.
 */

import { Type, type Static } from '@sinclair/typebox';

/**
 * UUID format pattern.
 */
const UuidString = Type.String({ format: 'uuid' });

/**
 * Value schema (simplified - accepts any JSON value).
 */
const ValueSchema = Type.Any();

/**
 * Create relationship request body.
 */
export const CreateRelationshipBody = Type.Object({
  type: Type.String({ minLength: 1 }),
  from_entity: UuidString,
  to_entity: UuidString,
  path: Type.Optional(Type.String()),
  metadata: Type.Optional(Type.Record(Type.String(), ValueSchema)),
});

export type CreateRelationshipBodyType = Static<typeof CreateRelationshipBody>;

/**
 * Relationship ID parameter.
 */
export const RelationshipIdParams = Type.Object({
  id: UuidString,
});

export type RelationshipIdParamsType = Static<typeof RelationshipIdParams>;

/**
 * Entity ID parameter for listing relationships.
 */
export const EntityIdParams = Type.Object({
  id: UuidString,
});

export type EntityIdParamsType = Static<typeof EntityIdParams>;

/**
 * Query parameters for listing relationships.
 */
export const ListRelationshipsQuery = Type.Object({
  type: Type.Optional(Type.String()),
  direction: Type.Optional(
    Type.Union([
      Type.Literal('outgoing'),
      Type.Literal('incoming'),
      Type.Literal('both'),
    ])
  ),
  include_entities: Type.Optional(Type.Boolean()),
});

export type ListRelationshipsQueryType = Static<typeof ListRelationshipsQuery>;

/**
 * Relationship response schema.
 */
export const RelationshipResponse = Type.Object({
  id: Type.String(),
  tenant_id: Type.String(),
  type: Type.String(),
  from_entity: Type.String(),
  to_entity: Type.String(),
  metadata: Type.Optional(Type.Record(Type.String(), ValueSchema)),
  path: Type.Optional(Type.String()),
  created_at: Type.String(),
  created_by: Type.String(),
});

export type RelationshipResponseType = Static<typeof RelationshipResponse>;

/**
 * List relationships response schema.
 */
export const ListRelationshipsResponse = Type.Object({
  relationships: Type.Array(RelationshipResponse),
});

export type ListRelationshipsResponseType = Static<typeof ListRelationshipsResponse>;
