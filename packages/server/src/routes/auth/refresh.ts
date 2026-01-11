/**
 * Trellis Server - Refresh Route
 *
 * Endpoint for refreshing access tokens using a refresh token.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  verifyRefreshToken,
  generateTokenPair,
  createAuthError,
} from '../../auth/index.js';

/**
 * Refresh request body schema.
 */
const refreshBodySchema = z.object({
  refresh_token: z.string().min(1, 'refresh_token is required'),
});

type RefreshBody = z.infer<typeof refreshBodySchema>;

/**
 * Register the refresh route.
 *
 * POST /auth/refresh
 *
 * Accepts a refresh token and returns a new token pair.
 */
export function registerRefreshRoute(fastify: FastifyInstance): void {
  fastify.post(
    '/auth/refresh',
    async (request: FastifyRequest<{ Body: RefreshBody }>, reply: FastifyReply) => {
      // Validate request body
      const parseResult = refreshBodySchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          code: 'VALIDATION_ERROR',
          message: 'Invalid refresh request',
          details: {
            errors: parseResult.error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      }

      const { refresh_token } = parseResult.data;

      // Verify the refresh token
      const result = verifyRefreshToken(refresh_token);

      if (!result.success) {
        const error = createAuthError(result.error);
        return reply.status(401).send(error);
      }

      // Generate new token pair
      // Note: In a real application, you might want to:
      // 1. Look up user roles/permissions from database
      // 2. Implement refresh token rotation
      // 3. Store refresh tokens for revocation capability
      const tokenPair = generateTokenPair({
        tenantId: result.payload.tenant_id,
        actorId: result.payload.sub,
        // In development, we don't persist roles/permissions in refresh token
        // A real implementation would fetch these from the database
        roles: [],
        permissions: [],
      });

      request.log.info(
        { tenant_id: result.payload.tenant_id, actor_id: result.payload.sub },
        'Token refresh successful'
      );

      return reply.status(200).send(tokenPair);
    }
  );
}
