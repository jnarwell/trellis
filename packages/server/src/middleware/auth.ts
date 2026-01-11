/**
 * Trellis Server - Authentication Middleware
 *
 * Extracts authentication context from JWT tokens.
 * Falls back to header-based auth in development mode.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { TenantId, ActorId } from '@trellis/kernel';
import type { AuthContext } from '../types/fastify.js';
import { verifyAccessToken, createAuthError } from '../auth/index.js';

/** Header names for legacy auth context (development only) */
export const AUTH_HEADERS = {
  TENANT_ID: 'x-tenant-id',
  ACTOR_ID: 'x-actor-id',
  PERMISSIONS: 'x-permissions',
} as const;

/**
 * Paths that do not require authentication.
 */
const PUBLIC_PATHS = ['/health', '/ready', '/metrics', '/auth'] as const;

/**
 * Check if a path is public (no auth required).
 */
function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Extract Bearer token from Authorization header.
 *
 * @param authHeader - The Authorization header value
 * @returns The token or null if not present/invalid format
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7).trim();
}

/**
 * Extract auth context from JWT token.
 *
 * @param request - The Fastify request
 * @returns Auth context or null if no valid token
 */
function extractJWTAuthContext(request: FastifyRequest): AuthContext | null {
  const authHeader = request.headers.authorization;
  const token = extractBearerToken(authHeader);

  if (!token) {
    return null;
  }

  const result = verifyAccessToken(token);

  if (!result.success) {
    // Store error for later use in error response
    (request as FastifyRequest & { authError?: string }).authError = result.error;
    return null;
  }

  return {
    tenantId: result.payload.tenant_id as TenantId,
    actorId: result.payload.sub as ActorId,
    permissions: [...result.payload.permissions],
  };
}

/**
 * Extract auth context from legacy headers (development only).
 *
 * @param request - The Fastify request
 * @returns Auth context or null if headers missing
 */
function extractLegacyAuthContext(request: FastifyRequest): AuthContext | null {
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
 * Check if we're in development mode.
 */
function isDevelopmentMode(): boolean {
  return process.env['NODE_ENV'] !== 'production';
}

/**
 * Register authentication middleware.
 *
 * In production: Requires JWT Bearer token in Authorization header.
 * In development: Falls back to legacy header auth if no JWT present.
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

      // Try JWT authentication first
      const jwtAuthContext = extractJWTAuthContext(request);

      if (jwtAuthContext) {
        request.auth = jwtAuthContext;
        return;
      }

      // Check if there was a JWT error (malformed/expired token)
      const authError = (request as FastifyRequest & { authError?: string }).authError;
      const hasAuthHeader = request.headers.authorization !== undefined;

      if (hasAuthHeader && authError) {
        // User provided a token but it was invalid
        const error = createAuthError(authError);
        return reply.status(401).send(error);
      }

      // In development mode, fall back to legacy header auth
      if (isDevelopmentMode()) {
        const legacyAuthContext = extractLegacyAuthContext(request);

        if (legacyAuthContext) {
          // Log warning about using legacy auth
          request.log.warn(
            'Using legacy header authentication. This is only allowed in development mode.'
          );
          request.auth = legacyAuthContext;
          return;
        }
      }

      // No valid authentication found
      const error = createAuthError(
        isDevelopmentMode()
          ? 'Missing authentication. Provide Bearer token or X-Tenant-Id/X-Actor-Id headers.'
          : 'Missing or invalid Bearer token in Authorization header'
      );

      return reply.status(401).send(error);
    }
  );
}

// Re-export for backward compatibility
export { extractLegacyAuthContext as extractAuthContext };
