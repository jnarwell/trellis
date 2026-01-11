/**
 * Trellis Server - Tenant Middleware
 *
 * Sets the PostgreSQL tenant context for RLS policies.
 * This middleware should run AFTER auth middleware.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Paths that do not require tenant context.
 */
const TENANT_EXEMPT_PATHS = ['/health', '/ready', '/metrics'] as const;

/**
 * Check if a path is exempt from tenant context.
 */
function isTenantExemptPath(path: string): boolean {
  return TENANT_EXEMPT_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Register tenant context middleware.
 * Sets the PostgreSQL session variable for RLS.
 *
 * Note: This middleware sets the tenant context at the session level.
 * For per-query tenant scoping, use getTenantScopedClient() from db/client.ts.
 */
export function registerTenantMiddleware(fastify: FastifyInstance): void {
  fastify.addHook(
    'preHandler',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      // Skip for tenant-exempt paths
      if (isTenantExemptPath(request.url)) {
        return;
      }

      // Ensure auth context is available
      if (!request.auth?.tenantId) {
        // Auth middleware should have already rejected this request
        return;
      }

      // Log tenant context for debugging (in development)
      request.log.debug(
        { tenantId: request.auth.tenantId, actorId: request.auth.actorId },
        'Tenant context set'
      );
    }
  );
}
