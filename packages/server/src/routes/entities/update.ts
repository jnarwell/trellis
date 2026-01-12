/**
 * Trellis Server - Update Entity Handler
 *
 * PUT /entities/:id
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { EntityId, PropertyInput } from '@trellis/kernel';
import { createEntityService } from '../../services/entity-service.js';
import {
  entityParamsSchema,
  updateEntityBodySchema,
  type EntityParams,
  type UpdateEntityBody,
} from './schemas.js';

/**
 * PUT /entities/:id handler.
 */
export async function updateEntityHandler(
  request: FastifyRequest<{ Params: EntityParams; Body: UpdateEntityBody }>,
  reply: FastifyReply
): Promise<void> {
  // Validate params
  const paramsResult = entityParamsSchema.safeParse(request.params);
  if (!paramsResult.success) {
    return reply.status(400).send({
      code: 'VALIDATION_ERROR',
      message: 'Invalid entity ID',
      details: { errors: paramsResult.error.errors },
    });
  }

  // Validate body
  const bodyResult = updateEntityBodySchema.safeParse(request.body);
  if (!bodyResult.success) {
    return reply.status(400).send({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      details: { errors: bodyResult.error.errors },
    });
  }

  const { id } = paramsResult.data;
  const { expected_version, set_properties, remove_properties } = bodyResult.data;
  const { tenantId, actorId } = request.auth;

  const service = createEntityService(request.server.pg, tenantId, actorId);

  // Build update input, only including defined properties
  const updateInput: Parameters<typeof service.update>[0] = {
    id: id as EntityId,
    version: expected_version,
  };
  if (set_properties !== undefined) {
    updateInput.setProperties = set_properties as Record<string, PropertyInput>;
  }
  if (remove_properties !== undefined) {
    updateInput.removeProperties = remove_properties;
  }

  const entity = await service.update(updateInput);

  return reply.status(200).send({ entity });
}
