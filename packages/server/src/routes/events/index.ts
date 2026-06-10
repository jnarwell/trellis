/**
 * Trellis Server - Event Routes
 *
 * Read access to the immutable event store (audit log).
 * Guarded by `event.read` (ADR-012).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { EntityId, TenantId, EventType, ActorId } from '@trellis/kernel';
import { Permissions } from '@trellis/kernel';
import { requirePermission } from '../../middleware/permissions.js';
import { createEventStore } from '../../events/store.js';

interface ListEventsQuery {
  entity_id?: string;
  event_type?: string;
  actor_id?: string;
  after?: string;
  before?: string;
  limit?: number;
  offset?: number;
}

const listEventsQuerySchema = {
  type: 'object',
  properties: {
    entity_id: { type: 'string' },
    event_type: { type: 'string' },
    actor_id: { type: 'string' },
    after: { type: 'string' },
    before: { type: 'string' },
    limit: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
    offset: { type: 'integer', minimum: 0, default: 0 },
  },
  additionalProperties: false,
} as const;

/**
 * Register event routes.
 */
export async function eventRoutes(app: FastifyInstance): Promise<void> {
  const store = createEventStore(app.pg);

  // GET /events - List events (tenant-scoped audit log)
  app.get<{ Querystring: ListEventsQuery }>(
    '/events',
    {
      preHandler: requirePermission(Permissions.EventRead),
      schema: { querystring: listEventsQuerySchema },
    },
    async (
      request: FastifyRequest<{ Querystring: ListEventsQuery }>,
      reply: FastifyReply
    ) => {
      const { entity_id, event_type, actor_id, after, before, limit, offset } =
        request.query;

      const options: Parameters<typeof store.query>[0] = {
        tenantId: request.auth.tenantId as TenantId,
        limit: limit ?? 100,
        offset: offset ?? 0,
      };
      if (entity_id !== undefined) options.entityId = entity_id as EntityId;
      if (event_type !== undefined) {
        options.eventTypes = [event_type as EventType];
      }
      if (actor_id !== undefined) options.actorId = actor_id as ActorId;
      if (after !== undefined) options.after = after;
      if (before !== undefined) options.before = before;

      const events = await store.query(options);

      return reply.status(200).send({
        data: events,
        pagination: {
          offset: options.offset,
          limit: options.limit,
          has_more: events.length === options.limit,
        },
      });
    }
  );
}
