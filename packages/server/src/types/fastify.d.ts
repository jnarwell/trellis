/**
 * Trellis Server - Fastify Type Extensions
 *
 * Extends Fastify types with Trellis-specific properties.
 */

import type { Pool } from 'pg';
import type { TenantId, ActorId } from '@trellis/kernel';

/**
 * Authentication context extracted from request headers.
 */
export interface AuthContext {
  /** Tenant ID for the current request */
  readonly tenantId: TenantId;

  /** Actor (user/system) making the request */
  readonly actorId: ActorId;

  /** Permissions granted to the actor */
  readonly permissions: readonly string[];
}

declare module 'fastify' {
  interface FastifyInstance {
    /** PostgreSQL connection pool */
    pg: Pool;
  }

  interface FastifyRequest {
    /** Authentication context for this request */
    auth: AuthContext;

    /** Request ID for tracing */
    requestId: string;
  }
}
