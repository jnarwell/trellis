/**
 * Trellis Server - Create Entity Handler
 *
 * POST /entities
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { TypePath, PropertyInput } from '@trellis/kernel';
import { createEntityService } from '../../services/entity-service.js';
import { createEntityBodySchema, type CreateEntityBody } from './schemas.js';

/**
 * POST /entities handler.
 */
export async function createEntityHandler(
  request: FastifyRequest<{ Body: CreateEntityBody }>,
  reply: FastifyReply
): Promise<void> {
  // Validate request body
  const parseResult = createEntityBodySchema.safeParse(request.body);
  if (!parseResult.success) {
    return reply.status(400).send({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      details: { errors: parseResult.error.errors },
    });
  }

  const { type, properties } = parseResult.data;
  const { tenantId, actorId } = request.auth;

  const service = createEntityService(request.server.pg, tenantId, actorId);

  // Cast properties to PropertyInput - Zod validation ensures correct shape
  const entity = await service.create({
    type: type as TypePath,
    properties: properties as Record<string, PropertyInput>,
  });

  return reply.status(201).send({ entity });
}
