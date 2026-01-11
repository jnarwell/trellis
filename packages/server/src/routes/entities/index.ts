/**
 * Trellis Server - Entity Routes
 *
 * Route registration for entity CRUD endpoints.
 */

import type { FastifyInstance } from 'fastify';
import { createEntityHandler } from './create.js';
import { getEntityHandler } from './read.js';
import { updateEntityHandler } from './update.js';
import { deleteEntityHandler } from './delete.js';

/**
 * Register entity routes.
 */
export async function entityRoutes(app: FastifyInstance): Promise<void> {
  // POST /entities - Create entity
  app.post('/entities', createEntityHandler);

  // GET /entities/:id - Get entity
  app.get('/entities/:id', getEntityHandler);

  // PUT /entities/:id - Update entity
  app.put('/entities/:id', updateEntityHandler);

  // DELETE /entities/:id - Delete entity
  app.delete('/entities/:id', deleteEntityHandler);
}
