/**
 * Trellis Server - Relationship Service
 *
 * Business logic for relationship operations.
 */

import type { Pool } from 'pg';
import type { TenantScopedClient } from '../db/client.js';
import { withTenantTransaction } from '../db/client.js';
import type {
  EntityId,
  RelationshipType,
  Relationship,
  RelationshipSchema,
  Value,
  KernelError,
} from '@trellis/kernel';
import type { AuthContext } from '../types/fastify.js';
import {
  insertRelationship,
  findRelationshipById,
  deleteRelationship as deleteRelationshipRow,
  findRelationshipsByEntity,
  countRelationshipsByEntityAndType,
  findInverseRelationship,
  entityExists,
  getEntityTypePath,
  type RelationshipQueryOptions,
} from '../repositories/relationship-repository.js';
import {
  findRelationshipSchemaByType,
  typeMatchesAllowed,
} from '../repositories/relationship-schema-repository.js';

/**
 * Input for creating a relationship.
 */
export interface CreateRelationshipInput {
  readonly type: RelationshipType;
  readonly from_entity: EntityId;
  readonly to_entity: EntityId;
  readonly path?: string;
  readonly metadata?: Record<string, Value>;
}

/**
 * Create a KernelError.
 */
function kernelError(
  code: KernelError['code'],
  message: string,
  details?: Record<string, unknown>
): KernelError {
  if (details !== undefined) {
    return { code, message, details } as KernelError;
  }
  return { code, message } as KernelError;
}

/**
 * Validate that both entities exist.
 */
async function validateEntitiesExist(
  client: TenantScopedClient,
  fromEntity: EntityId,
  toEntity: EntityId
): Promise<void> {
  const [fromExists, toExists] = await Promise.all([
    entityExists(client, fromEntity),
    entityExists(client, toEntity),
  ]);

  if (!fromExists) {
    throw kernelError('NOT_FOUND', 'Source entity not found', {
      entity_id: fromEntity,
      field: 'from_entity',
    });
  }

  if (!toExists) {
    throw kernelError('NOT_FOUND', 'Target entity not found', {
      entity_id: toEntity,
      field: 'to_entity',
    });
  }
}

/**
 * Validate entity types match the relationship schema constraints.
 */
async function validateEntityTypes(
  client: TenantScopedClient,
  fromEntity: EntityId,
  toEntity: EntityId,
  schema: RelationshipSchema
): Promise<void> {
  // Skip validation if no type constraints
  if (schema.from_types.length === 0 && schema.to_types.length === 0) {
    return;
  }

  const [fromTypePath, toTypePath] = await Promise.all([
    getEntityTypePath(client, fromEntity),
    getEntityTypePath(client, toEntity),
  ]);

  // These should not be null since we already validated existence
  if (fromTypePath === null || toTypePath === null) {
    throw kernelError('NOT_FOUND', 'Entity not found during type validation');
  }

  if (schema.from_types.length > 0) {
    const fromMatches = await typeMatchesAllowed(client, fromTypePath, schema.from_types);
    if (!fromMatches) {
      throw kernelError('VALIDATION_ERROR', 'Source entity type not allowed for this relationship', {
        entity_type: fromTypePath,
        allowed_types: schema.from_types,
        field: 'from_entity',
      });
    }
  }

  if (schema.to_types.length > 0) {
    const toMatches = await typeMatchesAllowed(client, toTypePath, schema.to_types);
    if (!toMatches) {
      throw kernelError('VALIDATION_ERROR', 'Target entity type not allowed for this relationship', {
        entity_type: toTypePath,
        allowed_types: schema.to_types,
        field: 'to_entity',
      });
    }
  }
}

/**
 * Check cardinality constraints before creating a relationship.
 */
async function checkCardinality(
  client: TenantScopedClient,
  input: CreateRelationshipInput,
  schema: RelationshipSchema
): Promise<void> {
  switch (schema.cardinality) {
    case 'one_to_one': {
      // Neither from nor to can have another relationship of this type
      const [outgoingCount, incomingCount] = await Promise.all([
        countRelationshipsByEntityAndType(client, input.from_entity, input.type, 'outgoing'),
        countRelationshipsByEntityAndType(client, input.to_entity, input.type, 'incoming'),
      ]);

      if (outgoingCount > 0) {
        throw kernelError('VALIDATION_ERROR', 'Cardinality constraint violated: source entity already has this relationship type', {
          cardinality: 'one_to_one',
          entity_id: input.from_entity,
          relationship_type: input.type,
        });
      }

      if (incomingCount > 0) {
        throw kernelError('VALIDATION_ERROR', 'Cardinality constraint violated: target entity already has this relationship type', {
          cardinality: 'one_to_one',
          entity_id: input.to_entity,
          relationship_type: input.type,
        });
      }
      break;
    }

    case 'one_to_many': {
      // to_entity can only have one incoming relationship of this type
      const incomingCount = await countRelationshipsByEntityAndType(
        client,
        input.to_entity,
        input.type,
        'incoming'
      );

      if (incomingCount > 0) {
        throw kernelError('VALIDATION_ERROR', 'Cardinality constraint violated: target entity already has this relationship type', {
          cardinality: 'one_to_many',
          entity_id: input.to_entity,
          relationship_type: input.type,
        });
      }
      break;
    }

    case 'many_to_one': {
      // from_entity can only have one outgoing relationship of this type
      const outgoingCount = await countRelationshipsByEntityAndType(
        client,
        input.from_entity,
        input.type,
        'outgoing'
      );

      if (outgoingCount > 0) {
        throw kernelError('VALIDATION_ERROR', 'Cardinality constraint violated: source entity already has this relationship type', {
          cardinality: 'many_to_one',
          entity_id: input.from_entity,
          relationship_type: input.type,
        });
      }
      break;
    }

    case 'many_to_many':
      // No additional constraints - unique constraint handles duplicates
      break;
  }
}

/**
 * Emit a relationship event.
 */
async function emitEvent(
  client: TenantScopedClient,
  eventType: 'relationship_created' | 'relationship_deleted',
  relationship: Relationship,
  actorId: string
): Promise<void> {
  await client.query(
    `INSERT INTO events (tenant_id, event_type, entity_id, actor_id, payload)
     VALUES ($1, $2, NULL, $3, $4)`,
    [
      client.tenantId,
      eventType,
      actorId,
      JSON.stringify({
        relationship_id: relationship.id,
        type: relationship.type,
        from_entity: relationship.from_entity,
        to_entity: relationship.to_entity,
      }),
    ]
  );
}

/**
 * Create a new relationship.
 */
export async function createRelationship(
  pool: Pool,
  auth: AuthContext,
  input: CreateRelationshipInput
): Promise<Relationship> {
  return withTenantTransaction(pool, auth.tenantId, async (client) => {
    // 1. Validate relationship type exists
    const schema = await findRelationshipSchemaByType(client, input.type);
    if (schema === null) {
      throw kernelError('NOT_FOUND', 'Relationship type not found', {
        relationship_type: input.type,
      });
    }

    // 2. Validate both entities exist
    await validateEntitiesExist(client, input.from_entity, input.to_entity);

    // 3. Validate entity types match schema constraints
    await validateEntityTypes(client, input.from_entity, input.to_entity, schema);

    // 4. Check cardinality constraints
    await checkCardinality(client, input, schema);

    // 5. Create the relationship
    const baseInput = {
      type: input.type,
      from_entity: input.from_entity,
      to_entity: input.to_entity,
      created_by: auth.actorId,
    };
    const optionalInputProps: { path?: string; metadata?: Record<string, Value> } = {};
    if (input.path !== undefined) {
      optionalInputProps.path = input.path;
    }
    if (input.metadata !== undefined) {
      optionalInputProps.metadata = input.metadata;
    }

    const relationship = await insertRelationship(client, { ...baseInput, ...optionalInputProps });

    // 6. If bidirectional, create the inverse relationship
    if (schema.bidirectional && schema.inverse_type) {
      const inverseBaseInput = {
        type: schema.inverse_type,
        from_entity: input.to_entity,
        to_entity: input.from_entity,
        created_by: auth.actorId,
      };

      await insertRelationship(client, { ...inverseBaseInput, ...optionalInputProps });
    }

    // 7. Emit event
    await emitEvent(client, 'relationship_created', relationship, auth.actorId);

    return relationship;
  });
}

/**
 * Delete a relationship by ID.
 */
export async function deleteRelationship(
  pool: Pool,
  auth: AuthContext,
  id: string
): Promise<void> {
  await withTenantTransaction(pool, auth.tenantId, async (client) => {
    // 1. Find the relationship
    const relationship = await findRelationshipById(client, id);
    if (relationship === null) {
      throw kernelError('NOT_FOUND', 'Relationship not found', {
        relationship_id: id,
      });
    }

    // 2. Get schema to check for bidirectional
    const schema = await findRelationshipSchemaByType(client, relationship.type);

    // 3. Delete the relationship
    await deleteRelationshipRow(client, id);

    // 4. If bidirectional, delete the inverse
    if (schema?.bidirectional && schema.inverse_type) {
      const inverse = await findInverseRelationship(
        client,
        relationship.from_entity,
        relationship.to_entity,
        schema.inverse_type
      );

      if (inverse !== null) {
        await deleteRelationshipRow(client, inverse.id);
      }
    }

    // 5. Emit event
    await emitEvent(client, 'relationship_deleted', relationship, auth.actorId);
  });
}

/**
 * List relationships for an entity.
 */
export async function listRelationships(
  pool: Pool,
  auth: AuthContext,
  entityId: EntityId,
  options: RelationshipQueryOptions = {}
): Promise<Relationship[]> {
  return withTenantTransaction(pool, auth.tenantId, async (client) => {
    // Verify entity exists
    const exists = await entityExists(client, entityId);
    if (!exists) {
      throw kernelError('NOT_FOUND', 'Entity not found', {
        entity_id: entityId,
      });
    }

    return findRelationshipsByEntity(client, entityId, options);
  });
}
