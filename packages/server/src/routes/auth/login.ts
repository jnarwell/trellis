/**
 * Trellis Server - Login Route
 *
 * Development-only endpoint for generating JWT tokens.
 * In production, tokens would come from an external identity provider.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { generateTokenPair, createAuthError } from '../../auth/index.js';

/**
 * Login request body schema.
 */
const loginBodySchema = z.object({
  tenant_id: z.string().uuid('tenant_id must be a valid UUID'),
  actor_id: z.string().uuid('actor_id must be a valid UUID'),
  roles: z.array(z.string()).optional().default([]),
  permissions: z.array(z.string()).optional().default([]),
});

type LoginBody = z.infer<typeof loginBodySchema>;

/**
 * Register the login route.
 *
 * POST /auth/login
 *
 * This endpoint is only available in development mode.
 * In production, authentication should go through an external identity provider.
 */
export function registerLoginRoute(fastify: FastifyInstance): void {
  fastify.post(
    '/auth/login',
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      // Only allow in development mode
      if (process.env['NODE_ENV'] === 'production') {
        const error = createAuthError(
          'Login endpoint is not available in production. Use your identity provider.'
        );
        return reply.status(403).send(error);
      }

      // Validate request body
      const parseResult = loginBodySchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          code: 'VALIDATION_ERROR',
          message: 'Invalid login request',
          details: {
            errors: parseResult.error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      }

      const { tenant_id, actor_id, roles, permissions } = parseResult.data;

      // Generate token pair
      const tokenPair = generateTokenPair({
        tenantId: tenant_id,
        actorId: actor_id,
        roles,
        permissions,
      });

      request.log.info(
        { tenant_id, actor_id },
        'Development login: generated token pair'
      );

      return reply.status(200).send(tokenPair);
    }
  );
}
