/**
 * Trellis Server - List Relationships Route
 *
 * GET /entities/:id/relationships
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { EntityId, RelationshipType } from '@trellis/kernel';
import { listRelationships } from '../../services/relationship-service.js';
import {
  EntityIdParams,
  type EntityIdParamsType,
  ListRelationshipsQuery,
  type ListRelationshipsQueryType,
  ListRelationshipsResponse,
} from './schemas.js';

/**
 * Register the list relationships route.
 */
export function registerListRelationshipsRoute(app: FastifyInstance): void {
  app.get<{
    Params: EntityIdParamsType;
    Querystring: ListRelationshipsQueryType;
  }>(
    '/entities/:id/relationships',
    {
      schema: {
        params: EntityIdParams,
        querystring: ListRelationshipsQuery,
        response: {
          200: ListRelationshipsResponse,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: EntityIdParamsType;
        Querystring: ListRelationshipsQueryType;
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const { type, direction } = request.query;

      const options: Parameters<typeof listRelationships>[3] = {};
      if (type !== undefined) {
        (options as { type: RelationshipType }).type = type as RelationshipType;
      }
      if (direction !== undefined) {
        (options as { direction: typeof direction }).direction = direction;
      }

      const relationships = await listRelationships(
        request.server.pg,
        request.auth,
        id as EntityId,
        options
      );

      return reply.send({ relationships });
    }
  );
}
