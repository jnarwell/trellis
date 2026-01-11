/**
 * Trellis Server - Delete Entity Handler
 *
 * DELETE /entities/:id
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { EntityId } from '@trellis/kernel';
import { createEntityService } from '../../services/entity-service.js';
import {
  entityParamsSchema,
  deleteEntityQuerySchema,
  type EntityParams,
  type DeleteEntityQuery,
} from './schemas.js';

/**
 * DELETE /entities/:id handler.
 */
export async function deleteEntityHandler(
  request: FastifyRequest<{ Params: EntityParams; Querystring: DeleteEntityQuery }>,
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

  // Validate query params
  const queryResult = deleteEntityQuerySchema.safeParse(request.query);
  if (!queryResult.success) {
    return reply.status(400).send({
      code: 'VALIDATION_ERROR',
      message: 'Invalid query parameters',
      details: { errors: queryResult.error.errors },
    });
  }

  const { id } = paramsResult.data;
  const { hard_delete } = queryResult.data;
  const { tenantId, actorId } = request.auth;

  const service = createEntityService(request.server.pg, tenantId, actorId);

  await service.delete(id as EntityId, {
    hardDelete: hard_delete,
  });

  return reply.status(204).send();
}
