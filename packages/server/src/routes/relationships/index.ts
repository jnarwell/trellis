/**
 * Trellis Server - Relationship Routes
 *
 * Registers all relationship-related routes.
 */

import type { FastifyInstance } from 'fastify';
import { registerCreateRelationshipRoute } from './create.js';
import { registerDeleteRelationshipRoute } from './delete.js';
import { registerListRelationshipsRoute } from './list.js';

/**
 * Register all relationship routes.
 */
export async function relationshipRoutes(app: FastifyInstance): Promise<void> {
  registerCreateRelationshipRoute(app);
  registerDeleteRelationshipRoute(app);
  registerListRelationshipsRoute(app);
}
