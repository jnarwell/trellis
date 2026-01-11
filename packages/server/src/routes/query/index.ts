/**
 * Trellis Server - Query Routes
 *
 * Route registration for entity query endpoints.
 */

import type { FastifyInstance } from 'fastify';
import { queryHandler } from './query.js';

/**
 * Register query routes.
 */
export async function queryRoutes(app: FastifyInstance): Promise<void> {
  // POST /query - Query entities
  app.post('/query', queryHandler);
}
