/**
 * Trellis Server - Auth Routes
 *
 * Route registration for authentication endpoints.
 */

import type { FastifyInstance } from 'fastify';
import { registerLoginRoute } from './login.js';
import { registerRefreshRoute } from './refresh.js';

/**
 * Register all authentication routes.
 *
 * Routes:
 * - POST /auth/login   - Generate tokens (development only)
 * - POST /auth/refresh - Refresh access token
 */
export function registerAuthRoutes(fastify: FastifyInstance): void {
  registerLoginRoute(fastify);
  registerRefreshRoute(fastify);
}
