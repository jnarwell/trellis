/**
 * Trellis Server - Login Route
 *
 * Development-only endpoint for generating JWT tokens.
 * In production, tokens would come from an external identity provider.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { expandRoles } from '@trellis/kernel';
import { generateTokenPair, createAuthError } from '../../auth/index.js';

/**
 * Login request body schema. tenant_id/actor_id may be omitted: the dev
 * server resolves the loaded product's tenant and system actor (demo login).
 */
const loginBodySchema = z.object({
  tenant_id: z.string().uuid('tenant_id must be a valid UUID').optional(),
  actor_id: z.string().uuid('actor_id must be a valid UUID').optional(),
  roles: z.array(z.string()).optional().default([]),
  permissions: z.array(z.string()).optional().default([]),
});

type LoginBody = z.infer<typeof loginBodySchema>;

/**
 * Resolve the default identity: the first tenant and its system actor,
 * i.e. whatever product this server loaded.
 */
async function resolveDefaultIdentity(
  fastify: FastifyInstance
): Promise<{ tenant_id: string; actor_id: string } | null> {
  try {
    const result = await fastify.pg.query<{ tenant_id: string; actor_id: string }>(
      `SELECT t.id AS tenant_id, a.id AS actor_id
       FROM tenants t
       JOIN actors a ON a.tenant_id = t.id
       ORDER BY t.created_at ASC
       LIMIT 1`
    );
    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}

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

      const { roles, permissions } = parseResult.data;
      let { tenant_id, actor_id } = parseResult.data;

      // Demo login: resolve the loaded product's identity when omitted
      if (!tenant_id || !actor_id) {
        const identity = await resolveDefaultIdentity(fastify);
        if (!identity) {
          return reply.status(503).send({
            code: 'NO_TENANT',
            message:
              'No tenant exists yet - load a product first (trellis serve <product>)',
          });
        }
        tenant_id = tenant_id ?? identity.tenant_id;
        actor_id = actor_id ?? identity.actor_id;
      }

      // Expand roles to permission strings at issuance (ADR-012):
      // enforcement only ever checks permissions, never role names.
      const effectivePermissions = [
        ...new Set([...expandRoles(roles), ...permissions]),
      ];

      // Generate token pair
      const tokenPair = generateTokenPair({
        tenantId: tenant_id,
        actorId: actor_id,
        roles,
        permissions: effectivePermissions,
      });

      request.log.info(
        { tenant_id, actor_id, roles },
        'Development login: generated token pair'
      );

      // Echo the resolved identity so clients that omitted it can store it
      return reply.status(200).send({
        ...tokenPair,
        tenant_id,
        actor_id,
      });
    }
  );
}
