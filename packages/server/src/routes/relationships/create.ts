/**
 * Trellis Server - Create Relationship Route
 *
 * POST /relationships
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { EntityId, RelationshipType } from '@trellis/kernel';
import { createRelationship } from '../../services/relationship-service.js';
import {
  CreateRelationshipBody,
  type CreateRelationshipBodyType,
  RelationshipResponse,
} from './schemas.js';

/**
 * Register the create relationship route.
 */
export function registerCreateRelationshipRoute(app: FastifyInstance): void {
  app.post<{
    Body: CreateRelationshipBodyType;
  }>(
    '/relationships',
    {
      schema: {
        body: CreateRelationshipBody,
        response: {
          201: RelationshipResponse,
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: CreateRelationshipBodyType }>,
      reply: FastifyReply
    ) => {
      const { type, from_entity, to_entity, path, metadata } = request.body;

      const input: Parameters<typeof createRelationship>[2] = {
        type: type as RelationshipType,
        from_entity: from_entity as EntityId,
        to_entity: to_entity as EntityId,
      };

      if (path !== undefined) {
        (input as { path: string }).path = path;
      }
      if (metadata !== undefined) {
        (input as { metadata: typeof metadata }).metadata = metadata;
      }

      const relationship = await createRelationship(request.server.pg, request.auth, input);

      return reply.status(201).send(relationship);
    }
  );
}
