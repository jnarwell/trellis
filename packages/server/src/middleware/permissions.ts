/**
 * Trellis Server - Permission Enforcement
 *
 * Route-level RBAC guards (ADR-012). Permissions are dot-separated
 * `resource.action` strings carried on `request.auth.permissions`;
 * roles were already expanded to permissions at token issuance.
 */

import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { hasPermission } from '@trellis/kernel';

/**
 * Build the standard 403 error body for a missing permission.
 */
function permissionError(required: string): {
  code: 'FORBIDDEN';
  message: string;
  details: { required_permission: string };
} {
  return {
    code: 'FORBIDDEN',
    message: `Missing required permission: ${required}`,
    details: { required_permission: required },
  };
}

/**
 * Create a Fastify preHandler that rejects requests lacking a permission.
 *
 * @example
 * ```typescript
 * app.post('/entities', { preHandler: requirePermission(Permissions.EntityCreate) }, handler);
 * ```
 */
export function requirePermission(required: string): preHandlerHookHandler {
  return async function permissionGuard(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    if (!hasPermission(request.auth.permissions, required)) {
      request.log.warn(
        { required, actorId: request.auth.actorId },
        'Permission denied'
      );
      await reply.status(403).send(permissionError(required));
    }
  };
}
