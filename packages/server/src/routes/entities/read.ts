/**
 * Trellis Server - Get Entity Handler
 *
 * GET /entities/:id
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { EntityId } from '@trellis/kernel';
import { createEntityService } from '../../services/entity-service.js';
import {
  entityParamsSchema,
  getEntityQuerySchema,
  type EntityParams,
  type GetEntityQuery,
} from './schemas.js';

/**
 * GET /entities/:id handler.
 */
export async function getEntityHandler(
  request: FastifyRequest<{ Params: EntityParams; Querystring: GetEntityQuery }>,
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
  const queryResult = getEntityQuerySchema.safeParse(request.query);
  if (!queryResult.success) {
    return reply.status(400).send({
      code: 'VALIDATION_ERROR',
      message: 'Invalid query parameters',
      details: { errors: queryResult.error.errors },
    });
  }

  const { id } = paramsResult.data;
  const { resolve_inherited, evaluate_computed } = queryResult.data;
  const { tenantId, actorId } = request.auth;

  const service = createEntityService(request.server.pg, tenantId, actorId);

  const entity = await service.get(id as EntityId, {
    resolveInherited: resolve_inherited,
    evaluateComputed: evaluate_computed,
  });

  return reply.status(200).send({ entity });
}
