/**
 * Trellis Server - Authentication Middleware
 *
 * Extracts authentication context from request headers.
 * For V1, uses simple header-based auth. JWT integration is Phase 3.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { TenantId, ActorId, KernelError } from '@trellis/kernel';
import type { AuthContext } from '../types/fastify.js';

/** Header names for auth context */
export const AUTH_HEADERS = {
  TENANT_ID: 'x-tenant-id',
  ACTOR_ID: 'x-actor-id',
  PERMISSIONS: 'x-permissions',
} as const;

/**
 * Paths that do not require authentication.
 */
const PUBLIC_PATHS = ['/health', '/ready', '/metrics'] as const;

/**
 * Check if a path is public (no auth required).
 */
function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Extract auth context from request headers.
 * Returns null if required headers are missing.
 */
export function extractAuthContext(request: FastifyRequest): AuthContext | null {
  const tenantId = request.headers[AUTH_HEADERS.TENANT_ID];
  const actorId = request.headers[AUTH_HEADERS.ACTOR_ID];
  const permissionsHeader = request.headers[AUTH_HEADERS.PERMISSIONS];

  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    return null;
  }

  if (typeof actorId !== 'string' || actorId.length === 0) {
    return null;
  }

  // Parse permissions from comma-separated string
  const permissions: string[] =
    typeof permissionsHeader === 'string' && permissionsHeader.length > 0
      ? permissionsHeader.split(',').map((p) => p.trim())
      : [];

  return {
    tenantId: tenantId as TenantId,
    actorId: actorId as ActorId,
    permissions,
  };
}

/**
 * Create an authentication error response.
 */
function createAuthError(message: string): KernelError {
  return {
    code: 'PERMISSION_DENIED',
    message,
  };
}

/**
 * Register authentication middleware.
 * Extracts auth context from headers and attaches to request.
 */
export function registerAuthMiddleware(fastify: FastifyInstance): void {
  fastify.addHook(
    'onRequest',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Skip auth for public paths
      if (isPublicPath(request.url)) {
        // Set a placeholder auth context for public paths
        request.auth = {
          tenantId: '' as TenantId,
          actorId: '' as ActorId,
          permissions: [],
        };
        return;
      }

      const authContext = extractAuthContext(request);

      if (!authContext) {
        const missingHeaders: string[] = [];
        if (!request.headers[AUTH_HEADERS.TENANT_ID]) {
          missingHeaders.push(AUTH_HEADERS.TENANT_ID);
        }
        if (!request.headers[AUTH_HEADERS.ACTOR_ID]) {
          missingHeaders.push(AUTH_HEADERS.ACTOR_ID);
        }

        const error = createAuthError(
          `Missing required authentication headers: ${missingHeaders.join(', ')}`
        );

        return reply.status(401).send(error);
      }

      request.auth = authContext;
    }
  );
}
