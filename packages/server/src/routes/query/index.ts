/**
 * Trellis Server - Query Routes
 *
 * Route registration for entity query endpoints (RBAC-guarded per ADR-012).
 */

import type { FastifyInstance } from 'fastify';
import { Permissions } from '@trellis/kernel';
import { requirePermission } from '../../middleware/permissions.js';
import { queryHandler } from './query.js';

/**
 * Register query routes.
 */
export async function queryRoutes(app: FastifyInstance): Promise<void> {
  // POST /query - Query entities
  app.post<{ Body: unknown }>(
    '/query',
    { preHandler: requirePermission(Permissions.EntityRead) },
    queryHandler
  );
}
