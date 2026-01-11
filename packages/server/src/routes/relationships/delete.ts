/**
 * Trellis Server - Delete Relationship Route
 *
 * DELETE /relationships/:id
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { deleteRelationship } from '../../services/relationship-service.js';
import {
  RelationshipIdParams,
  type RelationshipIdParamsType,
} from './schemas.js';

/**
 * Register the delete relationship route.
 */
export function registerDeleteRelationshipRoute(app: FastifyInstance): void {
  app.delete<{
    Params: RelationshipIdParamsType;
  }>(
    '/relationships/:id',
    {
      schema: {
        params: RelationshipIdParams,
        response: {
          204: { type: 'null' },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: RelationshipIdParamsType }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      await deleteRelationship(request.server.pg, request.auth, id);

      return reply.status(204).send();
    }
  );
}
