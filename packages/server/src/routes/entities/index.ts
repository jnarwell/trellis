/**
 * Trellis Server - Entity Routes
 *
 * Route registration for entity CRUD endpoints (RBAC-guarded per ADR-012).
 */

import type { FastifyInstance } from 'fastify';
import { Permissions } from '@trellis/kernel';
import { requirePermission } from '../../middleware/permissions.js';
import { createEntityHandler } from './create.js';
import { getEntityHandler } from './read.js';
import { updateEntityHandler } from './update.js';
import { deleteEntityHandler } from './delete.js';
import type {
  CreateEntityBody,
  EntityParams,
  GetEntityQuery,
  UpdateEntityBody,
  DeleteEntityQuery,
} from './schemas.js';

/**
 * Register entity routes.
 */
export async function entityRoutes(app: FastifyInstance): Promise<void> {
  // POST /entities - Create entity
  app.post<{ Body: CreateEntityBody }>(
    '/entities',
    { preHandler: requirePermission(Permissions.EntityCreate) },
    createEntityHandler
  );

  // GET /entities/:id - Get entity
  app.get<{ Params: EntityParams; Querystring: GetEntityQuery }>(
    '/entities/:id',
    { preHandler: requirePermission(Permissions.EntityRead) },
    getEntityHandler
  );

  // PUT /entities/:id - Update entity
  app.put<{ Params: EntityParams; Body: UpdateEntityBody }>(
    '/entities/:id',
    { preHandler: requirePermission(Permissions.EntityUpdate) },
    updateEntityHandler
  );

  // DELETE /entities/:id - Delete entity
  app.delete<{ Params: EntityParams; Querystring: DeleteEntityQuery }>(
    '/entities/:id',
    { preHandler: requirePermission(Permissions.EntityDelete) },
    deleteEntityHandler
  );
}
